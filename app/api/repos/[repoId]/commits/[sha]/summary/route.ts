import { NextResponse } from 'next/server'
import { db } from '@/db/index'
import {
  commitSummaries,
  commits,
  githubInstallations,
  installationRepos,
  userAiSettings,
} from '@/db/schema'
import {
  AiProviderError,
  buildCommitSummaryPrompt,
  isSupportedAiProvider,
  summarizeWithProvider,
} from '@/lib/ai'
import {
  consumeDailyUsageSlot,
  getUtcDayString,
  getUtcResetIso,
  refundDailyUsageSlot,
} from '@/lib/ai/usage'
import { requireUser } from '@/lib/auth'
import { ensureCommitFiles, StoredCommitFile } from '@/lib/commit-files'
import { decryptApiKey } from '@/lib/crypto'
import { env, getDefaultProviderKey } from '@/lib/env'
import { GitHubApiError } from '@/lib/github'
import { and, eq, or, sql } from 'drizzle-orm'

export const runtime = 'nodejs'

export async function POST(
  req: Request,
  { params }: { params: { repoId: string; sha: string } },
): Promise<Response> {
  const user = await requireUser(req.headers.get('cookie') ?? '')
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  if (!/^\d+$/.test(params.repoId)) {
    return NextResponse.json({ error: 'Repository not found' }, { status: 404 })
  }

  const targetId = parseInt(params.repoId, 10)
  if (Number.isNaN(targetId) || targetId <= 0 || targetId > 2147483647) {
    return NextResponse.json({ error: 'Repository not found' }, { status: 404 })
  }

  const sha = (params.sha ?? '').trim()
  if (!sha) {
    return NextResponse.json({ error: 'Commit not found' }, { status: 404 })
  }

  const [repoRecord] = await db
    .select({
      id: installationRepos.id,
      repoId: installationRepos.repoId,
      fullName: installationRepos.fullName,
      installationId: githubInstallations.installationId,
    })
    .from(installationRepos)
    .innerJoin(githubInstallations, eq(installationRepos.installationId, githubInstallations.id))
    .where(
      and(
        eq(githubInstallations.userId, user.user.id),
        or(eq(installationRepos.repoId, targetId), eq(installationRepos.id, targetId)),
      ),
    )

  if (!repoRecord) {
    return NextResponse.json({ error: 'Repository not found' }, { status: 404 })
  }

  const [commitRecord] = await db
    .select({
      id: commits.id,
      repoId: commits.repoId,
      sha: commits.sha,
      message: commits.message,
      authorName: commits.authorName,
      authorEmail: commits.authorEmail,
      authorLogin: commits.authorLogin,
    })
    .from(commits)
    .where(and(eq(commits.repoId, repoRecord.id), eq(commits.sha, sha)))

  if (!commitRecord) {
    return NextResponse.json({ error: 'Commit not found' }, { status: 404 })
  }

  let files: StoredCommitFile[]
  try {
    files = await ensureCommitFiles({
      commitId: commitRecord.id,
      sha: commitRecord.sha,
      repoFullName: repoRecord.fullName,
      installationId: repoRecord.installationId,
    })
  } catch (err) {
    if (err instanceof GitHubApiError) {
      const status = err.status >= 400 && err.status < 500 ? err.status : 502
      return NextResponse.json({ error: err.message }, { status })
    }
    return NextResponse.json({ error: 'Failed to load commit files from GitHub' }, { status: 502 })
  }

  if (files.length === 0) {
    return NextResponse.json({ error: 'Commit has no changed files' }, { status: 404 })
  }

  const [settingsRow] = await db
    .select({
      provider: userAiSettings.provider,
      model: userAiSettings.model,
      apiKeyEncrypted: userAiSettings.apiKeyEncrypted,
    })
    .from(userAiSettings)
    .where(eq(userAiSettings.userId, user.user.id))

  let usedDefaultKey = true
  let providerName: string
  let model: string
  let apiKey: string

  if (settingsRow) {
    usedDefaultKey = false
    providerName = settingsRow.provider.trim().toLowerCase()
    if (!isSupportedAiProvider(providerName)) {
      return NextResponse.json({ error: 'Unsupported saved AI provider' }, { status: 400 })
    }
    model = settingsRow.model
    if (model.trim().toLowerCase() === 'penguin') {
      model = env.DEFAULT_AI_MODEL
    }
    try {
      apiKey = decryptApiKey(settingsRow.apiKeyEncrypted)
    } catch {
      return NextResponse.json(
        { error: 'Saved API key could not be decrypted. Please re-save your AI settings.' },
        { status: 400 },
      )
    }
  } else {
    usedDefaultKey = true
    const defaultProvider = env.DEFAULT_PROVIDER
    providerName = defaultProvider
    model = env.DEFAULT_AI_MODEL
    const envKey = getDefaultProviderKey(defaultProvider)
    if (!envKey) {
      return NextResponse.json(
        { error: 'Default AI provider is not configured. Add an API key in AI Settings.' },
        { status: 503 },
      )
    }
    apiKey = envKey
  }

  const builtPrompt = buildCommitSummaryPrompt(commitRecord, files)

  const [cachedSummary] = await db
    .select({
      text: commitSummaries.text,
      provider: commitSummaries.provider,
      model: commitSummaries.model,
    })
    .from(commitSummaries)
    .where(
      and(
        eq(commitSummaries.commitId, commitRecord.id),
        eq(commitSummaries.provider, providerName),
        eq(commitSummaries.model, model),
      ),
    )

  if (cachedSummary) {
    return NextResponse.json({
      text: cachedSummary.text,
      provider: cachedSummary.provider,
      model: cachedSummary.model,
      cached: true,
      truncated: builtPrompt.truncated,
      usedDefaultKey,
    })
  }

  const now = new Date()
  const day = getUtcDayString(now)
  const resetsAt = getUtcResetIso(now)

  if (usedDefaultKey) {
    const newCount = await consumeDailyUsageSlot(user.user.id, day, env.AI_DEFAULT_DAILY_LIMIT)
    if (newCount === null) {
      return NextResponse.json(
        {
          error: 'daily_limit_reached',
          resetsAt,
        },
        { status: 429 },
      )
    }
  }

  let summaryText: string
  try {
    const aiResult = await summarizeWithProvider(providerName, {
      system: builtPrompt.system,
      prompt: builtPrompt.prompt,
      model,
      apiKey,
    })
    summaryText = aiResult.text
  } catch (err) {
    if (usedDefaultKey) {
      await refundDailyUsageSlot(user.user.id, day).catch(() => {})
    }
    if (err instanceof AiProviderError) {
      return NextResponse.json({ error: err.message }, { status: err.httpStatus })
    }
    return NextResponse.json(
      { error: 'AI provider failed. Please retry.' },
      { status: 502 },
    )
  }

  await db
    .insert(commitSummaries)
    .values({
      commitId: commitRecord.id,
      provider: providerName,
      model,
      text: summaryText,
    })
    .onConflictDoUpdate({
      target: [commitSummaries.commitId, commitSummaries.provider, commitSummaries.model],
      set: {
        text: sql`excluded.text`,
      },
    })

  return NextResponse.json({
    text: summaryText,
    provider: providerName,
    model,
    cached: false,
    truncated: builtPrompt.truncated,
    usedDefaultKey,
  })
}


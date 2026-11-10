import { NextResponse } from 'next/server'
import { env } from '@/lib/env'
import { db } from '@/db/index'
import { githubInstallations, installationRepos, commits } from '@/db/schema'
import { eq, inArray } from 'drizzle-orm'
import { requireUser } from '@/lib/auth'
import { getInstallationAccessToken, listInstallationRepos } from '@/lib/github'

export const runtime = 'nodejs'

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const { searchParams } = url
  const installationIdRaw = searchParams.get('installation_id')
  const state = searchParams.get('state')
  const cookieHeader = req.headers.get('cookie') ?? ''
  const installStateMatch = cookieHeader.match(/(?:^|;\s*)gh_install_state=([^;]+)/)
  const storedInstallState = installStateMatch ? installStateMatch[1] : null

  const user = await requireUser(cookieHeader)
  if (!user) {
    return NextResponse.redirect(`${env.APP_URL}/`)
  }

  if (!installationIdRaw) {
    return NextResponse.redirect(`${env.APP_URL}/settings?error=no_installation`)
  }

  if (!state || !storedInstallState || storedInstallState !== state) {
    return NextResponse.redirect(`${env.APP_URL}/settings?error=invalid_state`)
  }

  const installationId = parseInt(installationIdRaw, 10)
  if (Number.isNaN(installationId)) {
    return NextResponse.redirect(`${env.APP_URL}/settings?error=invalid_installation`)
  }

  try {
    const [existing] = await db
      .select()
      .from(githubInstallations)
      .where(eq(githubInstallations.installationId, installationId))

    let installation
    if (existing) {
      installation = existing
      await db
        .update(githubInstallations)
        .set({ userId: user.user.id })
        .where(eq(githubInstallations.id, existing.id))
    } else {
      const [created] = await db
        .insert(githubInstallations)
        .values({
          userId: user.user.id,
          installationId,
          accountLogin: searchParams.get('account_login') ?? 'unknown',
          accountType: searchParams.get('account_type') ?? 'User',
        })
        .returning()
      installation = created
    }

    const installationToken = await getInstallationAccessToken(installationId)
    const repos = await listInstallationRepos(installationToken)

    const existingRows = await db
      .select({ id: installationRepos.id, repoId: installationRepos.repoId })
      .from(installationRepos)
      .where(eq(installationRepos.installationId, installation.id))

    const newRepoIds = new Set(repos.map((r) => r.repoId))
    const removedIds = existingRows
      .filter((row) => !newRepoIds.has(row.repoId))
      .map((row) => row.id)

    if (removedIds.length > 0) {
      await db.delete(commits).where(inArray(commits.repoId, removedIds))
      await db.delete(installationRepos).where(inArray(installationRepos.id, removedIds))
    }

    for (const repo of repos) {
      await db
        .insert(installationRepos)
        .values({
          installationId: installation.id,
          repoId: repo.repoId,
          fullName: repo.fullName,
          isPrivate: repo.isPrivate,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: installationRepos.repoId,
          set: {
            installationId: installation.id,
            fullName: repo.fullName,
            isPrivate: repo.isPrivate,
            updatedAt: new Date(),
          },
        })
    }

    const res = NextResponse.redirect(`${env.APP_URL}/settings`)
    res.cookies.set('gh_install_state', '', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })
    return res
  } catch (err) {
    console.error('[install/callback] error:', err)
    return NextResponse.redirect(`${env.APP_URL}/settings?error=install_failed`)
  }
}

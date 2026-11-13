import { NextResponse } from 'next/server'
import { db } from '@/db/index'
import { userAiSettings } from '@/db/schema'
import { getDefaultModelForProvider, isSupportedAiProvider, SUPPORTED_AI_PROVIDER_IDS } from '@/lib/ai'
import { requireUser } from '@/lib/auth'
import { encryptApiKey, getKeyLast4 } from '@/lib/crypto'
import { eq, sql } from 'drizzle-orm'

export const runtime = 'nodejs'

export async function GET(req: Request): Promise<Response> {
  const user = await requireUser(req.headers.get('cookie') ?? '')
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const [row] = await db
    .select({
      provider: userAiSettings.provider,
      model: userAiSettings.model,
      apiKeyLast4: userAiSettings.apiKeyLast4,
    })
    .from(userAiSettings)
    .where(eq(userAiSettings.userId, user.user.id))

  if (!row) {
    return NextResponse.json({
      configured: false,
      provider: null,
      model: null,
      last4: null,
    })
  }

  return NextResponse.json({
    configured: true,
    provider: row.provider,
    model: row.model,
    last4: row.apiKeyLast4,
  })
}

export async function PUT(req: Request): Promise<Response> {
  const user = await requireUser(req.headers.get('cookie') ?? '')
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: { provider?: unknown; model?: unknown; apiKey?: unknown } | null = null
  try {
    body = await req.json()
  } catch {
    body = null
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 })
  }

  const rawProvider = typeof body.provider === 'string' ? body.provider.trim().toLowerCase() : ''
  if (!rawProvider || !isSupportedAiProvider(rawProvider)) {
    return NextResponse.json(
      {
        error: `Unknown AI provider. Supported providers: ${SUPPORTED_AI_PROVIDER_IDS.join(', ')}.`,
      },
      { status: 400 },
    )
  }

  const rawApiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : ''
  if (!rawApiKey) {
    return NextResponse.json({ error: 'API key is required' }, { status: 400 })
  }

  const rawModel = typeof body.model === 'string' ? body.model.trim() : ''
  const resolvedModel =
    !rawModel || rawModel.toLowerCase() === 'penguin'
      ? getDefaultModelForProvider(rawProvider)
      : rawModel

  let encryptedKey: string
  try {
    encryptedKey = encryptApiKey(rawApiKey)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Encryption configuration error'
    return NextResponse.json({ error: message }, { status: 503 })
  }

  const last4 = getKeyLast4(rawApiKey)

  await db
    .insert(userAiSettings)
    .values({
      userId: user.user.id,
      provider: rawProvider,
      model: resolvedModel,
      apiKeyEncrypted: encryptedKey,
      apiKeyLast4: last4,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: userAiSettings.userId,
      set: {
        provider: sql`excluded.provider`,
        model: sql`excluded.model`,
        apiKeyEncrypted: sql`excluded.api_key_encrypted`,
        apiKeyLast4: sql`excluded.api_key_last4`,
        updatedAt: sql`excluded.updated_at`,
      },
    })

  return NextResponse.json({
    provider: rawProvider,
    model: resolvedModel,
    last4,
  })
}

export async function DELETE(req: Request): Promise<Response> {
  const user = await requireUser(req.headers.get('cookie') ?? '')
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  await db.delete(userAiSettings).where(eq(userAiSettings.userId, user.user.id))

  return NextResponse.json({
    deleted: true,
    provider: null,
    model: null,
    last4: null,
  })
}


import { AI_PROVIDERS, AiProviderId, SUPPORTED_AI_PROVIDER_IDS } from '@/lib/ai/providers'

const REQUIRED = [
  'DATABASE_URL',
  'GITHUB_APP_ID',
  'GITHUB_APP_SLUG',
  'GITHUB_CLIENT_ID',
  'GITHUB_CLIENT_SECRET',
  'GITHUB_PRIVATE_KEY',
  'APP_URL',
  'SESSION_SECRET',
] as const

export function parseEncryptionKeyBase64(raw: string): Buffer {
  const trimmed = raw.trim()
  if (!/^[A-Za-z0-9+/=]+$/.test(trimmed)) {
    throw new Error('Invalid ENCRYPTION_KEY: must be a valid base64-encoded 32-byte key.')
  }
  const buf = Buffer.from(trimmed, 'base64')
  if (buf.length !== 32) {
    throw new Error(
      `Invalid ENCRYPTION_KEY: expected 32 decoded bytes, got ${buf.length}.`,
    )
  }
  return buf
}

export function validateEnv(source: Record<string, string | undefined> = process.env): void {
  const missing = REQUIRED.filter((key) => !source[key])
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(', ')}. ` +
        'Copy .env.example to .env and fill in all values before starting.',
    )
  }

  const rawDefaultProvider = source.DEFAULT_PROVIDER?.trim().toLowerCase() ?? ''
  if (rawDefaultProvider.length > 0) {
    if (!Object.prototype.hasOwnProperty.call(AI_PROVIDERS, rawDefaultProvider)) {
      throw new Error(
        `Invalid DEFAULT_PROVIDER "${source.DEFAULT_PROVIDER}". Supported providers: ${SUPPORTED_AI_PROVIDER_IDS.join(', ')}.`,
      )
    }
    const providerDef = AI_PROVIDERS[rawDefaultProvider as AiProviderId]
    const providerKey = source[providerDef.envKeyName]?.trim() ?? ''
    if (!providerKey) {
      throw new Error(
        `DEFAULT_PROVIDER is set to "${providerDef.id}", but ${providerDef.envKeyName} is missing.`,
      )
    }
  }

  const rawDailyLimit = source.AI_DEFAULT_DAILY_LIMIT?.trim() ?? ''
  if (rawDailyLimit.length > 0) {
    if (!/^\d+$/.test(rawDailyLimit)) {
      throw new Error('Invalid AI_DEFAULT_DAILY_LIMIT: must be a positive integer.')
    }
    const parsed = parseInt(rawDailyLimit, 10)
    if (!Number.isFinite(parsed) || parsed < 1) {
      throw new Error('Invalid AI_DEFAULT_DAILY_LIMIT: must be at least 1.')
    }
  }

  const rawEncryptionKey = source.ENCRYPTION_KEY?.trim() ?? ''
  if (rawEncryptionKey.length > 0) {
    parseEncryptionKeyBase64(rawEncryptionKey)
  }
}

validateEnv()

export const env = {
  DATABASE_URL: process.env.DATABASE_URL!,
  GITHUB_APP_ID: process.env.GITHUB_APP_ID!,
  GITHUB_APP_SLUG: process.env.GITHUB_APP_SLUG!,
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID!,
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET!,
  GITHUB_PRIVATE_KEY: process.env.GITHUB_PRIVATE_KEY!,
  APP_URL: process.env.APP_URL!,
  SESSION_SECRET: process.env.SESSION_SECRET!,
  get DEFAULT_PROVIDER(): AiProviderId {
    const raw = process.env.DEFAULT_PROVIDER?.trim().toLowerCase()
    if (raw && Object.prototype.hasOwnProperty.call(AI_PROVIDERS, raw)) {
      return raw as AiProviderId
    }
    return 'groq'
  },
  get DEFAULT_AI_MODEL(): string {
    const override = process.env.DEFAULT_AI_MODEL?.trim()
    if (override) return override
    return AI_PROVIDERS[this.DEFAULT_PROVIDER].defaultModel
  },
  get AI_DEFAULT_DAILY_LIMIT(): number {
    const raw = process.env.AI_DEFAULT_DAILY_LIMIT?.trim()
    if (!raw || !/^\d+$/.test(raw)) return 10
    const parsed = parseInt(raw, 10)
    return parsed >= 1 ? parsed : 10
  },
}

export function getDefaultProviderKey(providerId: AiProviderId): string | null {
  const def = AI_PROVIDERS[providerId]
  const value = process.env[def.envKeyName]?.trim()
  return value && value.length > 0 ? value : null
}

export function isLocalhost(): boolean {
  return env.APP_URL.startsWith('http://localhost') || env.APP_URL.startsWith('http://127.0.0.1')
}

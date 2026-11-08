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

export function validateEnv(): void {
  const missing = REQUIRED.filter((key) => !process.env[key])
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(', ')}. ` +
        'Copy .env.example to .env and fill in all values before starting.',
    )
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
}

export function isLocalhost(): boolean {
  return env.APP_URL.startsWith('http://localhost') || env.APP_URL.startsWith('http://127.0.0.1')
}
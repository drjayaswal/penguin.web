import crypto from 'crypto'
import { env } from '@/lib/env'

export function getPrivateKeyPem(): string {
  const raw = env.GITHUB_PRIVATE_KEY
  if (raw.includes('BEGIN')) {
    return raw.replace(/\\n/g, '\n')
  }
  return Buffer.from(raw, 'base64').toString('utf8')
}

export function generateAppJwt(): string {
  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(
    JSON.stringify({
      iat: now,
      exp: now + 600,
      iss: env.GITHUB_APP_ID,
    }),
  ).toString('base64url')
  const signingInput = `${header}.${payload}`
  const signature = crypto
    .createSign('RSA-SHA256')
    .update(signingInput)
    .sign(getPrivateKeyPem(), 'base64url')
  return `${signingInput}.${signature}`
}

export async function getInstallationAccessToken(installationId: number): Promise<string> {
  const jwt = generateAppJwt()
  const res = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'penguin',
      },
    },
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to get installation access token: ${res.status} ${text}`)
  }
  const data = await res.json()
  return data.token as string
}

export interface InstallationRepo {
  repoId: number
  fullName: string
  isPrivate: boolean
}

export async function listInstallationRepos(
  installationToken: string,
): Promise<InstallationRepo[]> {
  const res = await fetch('https://api.github.com/installation/repositories', {
    headers: {
      Authorization: `token ${installationToken}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'penguin',
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to list installation repos: ${res.status} ${text}`)
  }
  const data = await res.json()
  return (data.repositories ?? []).map((repo: any) => ({
    repoId: repo.id,
    fullName: repo.full_name,
    isPrivate: !!repo.private,
  })) as InstallationRepo[]
}
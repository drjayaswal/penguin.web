import crypto from 'crypto'
import { env } from '@/lib/env'

export class GitHubApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'GitHubApiError'
  }
}

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
      cache: 'no-store',
    },
  )
  if (!res.ok) {
    if (res.status === 403) {
      throw new GitHubApiError(403, 'GitHub rate limit exceeded or access denied')
    }
    if (res.status === 404) {
      throw new GitHubApiError(404, 'Installation not found on GitHub')
    }
    const text = await res.text()
    throw new GitHubApiError(res.status, `Failed to get installation access token: ${res.status} ${text}`)
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
  let page = 1
  const allRepos: InstallationRepo[] = []

  while (true) {
    const res = await fetch(
      `https://api.github.com/installation/repositories?per_page=100&page=${page}`,
      {
        headers: {
          Authorization: `token ${installationToken}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'penguin',
        },
        cache: 'no-store',
      },
    )
    if (!res.ok) {
      if (res.status === 403) {
        throw new GitHubApiError(403, 'GitHub rate limit exceeded or access denied')
      }
      if (res.status === 404) {
        throw new GitHubApiError(404, 'Repositories not found on GitHub')
      }
      const text = await res.text()
      throw new GitHubApiError(res.status, `Failed to list installation repos: ${res.status} ${text}`)
    }
    const data = await res.json()
    const batch = (data.repositories ?? []).map((repo: any) => ({
      repoId: repo.id,
      fullName: repo.full_name,
      isPrivate: !!repo.private,
    })) as InstallationRepo[]

    if (batch.length === 0) {
      break
    }
    allRepos.push(...batch)
    if (batch.length < 100 || (typeof data.total_count === 'number' && allRepos.length >= data.total_count)) {
      break
    }
    page++
  }

  return allRepos
}

export interface GitHubCommitItem {
  sha: string
  commit: {
    message: string
    author?: {
      name?: string
      email?: string
      date?: string
    } | null
    committer?: {
      name?: string
      email?: string
      date?: string
    } | null
  }
  author?: {
    login?: string
  } | null
  parents?: Array<{
    sha: string
  }>
}

export async function fetchRepoCommitsPage(
  fullName: string,
  token: string,
  page: number,
): Promise<GitHubCommitItem[]> {
  const url = `https://api.github.com/repos/${fullName}/commits?per_page=100&page=${page}`
  const res = await fetch(url, {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'penguin',
    },
    cache: 'no-store',
  })

  if (res.status === 409) {
    return []
  }

  if (res.status === 403) {
    throw new GitHubApiError(403, 'GitHub rate limit exceeded or insufficient permissions')
  }

  if (res.status === 404) {
    throw new GitHubApiError(404, 'Repository not found on GitHub')
  }

  if (!res.ok) {
    const text = await res.text()
    throw new GitHubApiError(res.status, `GitHub API error: ${res.status} ${text}`)
  }

  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export async function fetchAllRepoCommits(
  fullName: string,
  token: string,
): Promise<GitHubCommitItem[]> {
  let page = 1
  const allCommits: GitHubCommitItem[] = []

  while (true) {
    const pageCommits = await fetchRepoCommitsPage(fullName, token, page)
    if (!pageCommits || pageCommits.length === 0) {
      break
    }
    allCommits.push(...pageCommits)
    if (pageCommits.length < 100) {
      break
    }
    page++
  }

  return allCommits
}

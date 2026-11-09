import { NextResponse } from 'next/server'
import { env } from '@/lib/env'
import { db } from '@/db/index'
import { users, githubInstallations, installationRepos } from '@/db/schema'
import { eq, and, gt } from 'drizzle-orm'
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

    await db.delete(installationRepos).where(eq(installationRepos.installationId, installation.id))
    if (repos.length > 0) {
      await db.insert(installationRepos).values(
        repos.map((repo) => ({
          installationId: installation.id,
          repoId: repo.repoId,
          fullName: repo.fullName,
          isPrivate: repo.isPrivate,
        })),
      )
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
    return NextResponse.redirect(`${env.APP_URL}/settings?error=install_failed`)
  }
}
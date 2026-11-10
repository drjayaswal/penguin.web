import { NextResponse } from 'next/server'
import { db } from '@/db/index'
import { requireUser } from '@/lib/auth'
import { githubInstallations, installationRepos } from '@/db/schema'
import { asc, eq } from 'drizzle-orm'

export const runtime = 'nodejs'

export async function GET(req: Request): Promise<Response> {
  const user = await requireUser(req.headers.get('cookie') ?? '')
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const repos = await db
    .select({
      id: installationRepos.id,
      repoId: installationRepos.repoId,
      fullName: installationRepos.fullName,
      isPrivate: installationRepos.isPrivate,
      updatedAt: installationRepos.updatedAt,
    })
    .from(installationRepos)
    .innerJoin(githubInstallations, eq(installationRepos.installationId, githubInstallations.id))
    .where(eq(githubInstallations.userId, user.user.id))
    .orderBy(asc(installationRepos.fullName))

  return NextResponse.json({ repos })
}

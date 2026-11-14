import { NextResponse } from 'next/server'
import { db } from '@/db/index'
import { requireUser } from '@/lib/auth'
import { workflows, workflowNodes, workflowEdges } from '@/db/schema'
import { and, desc, eq, sql } from 'drizzle-orm'
import { generateAvatarSeed, pickPalette } from '@/lib/workflows'

export const runtime = 'nodejs'

export async function GET(req: Request): Promise<Response> {
  const user = await requireUser(req.headers.get('cookie') ?? '')
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const userWorkflows = await db
    .select({
      id: workflows.id,
      name: workflows.name,
      createdAt: workflows.createdAt,
      updatedAt: workflows.updatedAt,
      nodeCount: sql<number>`count(${workflowNodes.id})::int`,
    })
    .from(workflows)
    .leftJoin(workflowNodes, eq(workflowNodes.workflowId, workflows.id))
    .where(eq(workflows.userId, user.user.id))
    .groupBy(workflows.id)
    .orderBy(desc(workflows.updatedAt))

  return NextResponse.json({ workflows: userWorkflows })
}

export async function POST(req: Request): Promise<Response> {
  const user = await requireUser(req.headers.get('cookie') ?? '')
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const name = typeof body?.name === 'string' && body.name.trim() ? body.name.trim() : 'Untitled Workflow'

  const [workflow] = await db
    .insert(workflows)
    .values({
      userId: user.user.id,
      name,
    })
    .returning()

  const startPalette = pickPalette([])
  const [startNode] = await db
    .insert(workflowNodes)
    .values({
      workflowId: workflow.id,
      kind: 'start',
      title: 'Start',
      subtitle: 'Workflow trigger',
      phaseLabel: 'Trigger',
      positionX: 100,
      positionY: 200,
      avatarSeed: generateAvatarSeed(),
      avatarPalette: startPalette,
      status: 'done',
    })
    .returning()

  return NextResponse.json({ workflow, initialNode: startNode }, { status: 201 })
}

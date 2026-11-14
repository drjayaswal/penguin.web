import { NextResponse } from 'next/server'
import { db } from '@/db/index'
import { requireUser } from '@/lib/auth'
import { workflows, workflowNodes, workflowEdges } from '@/db/schema'
import { and, asc, eq } from 'drizzle-orm'

export const runtime = 'nodejs'

export async function GET(
  req: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  const user = await requireUser(req.headers.get('cookie') ?? '')
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const [workflow] = await db
    .select()
    .from(workflows)
    .where(and(eq(workflows.id, params.id), eq(workflows.userId, user.user.id)))

  if (!workflow) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
  }

  const nodes = await db
    .select()
    .from(workflowNodes)
    .where(eq(workflowNodes.workflowId, workflow.id))
    .orderBy(asc(workflowNodes.createdAt))

  const edges = await db
    .select()
    .from(workflowEdges)
    .where(eq(workflowEdges.workflowId, workflow.id))

  return NextResponse.json({ workflow, nodes, edges })
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  const user = await requireUser(req.headers.get('cookie') ?? '')
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const [existing] = await db
    .select()
    .from(workflows)
    .where(and(eq(workflows.id, params.id), eq(workflows.userId, user.user.id)))

  if (!existing) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
  }

  const body = await req.json().catch(() => ({}))
  if (typeof body?.name !== 'string' || !body.name.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const [updated] = await db
    .update(workflows)
    .set({
      name: body.name.trim(),
      updatedAt: new Date(),
    })
    .where(eq(workflows.id, params.id))
    .returning()

  return NextResponse.json({ workflow: updated })
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  const user = await requireUser(req.headers.get('cookie') ?? '')
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const [existing] = await db
    .select()
    .from(workflows)
    .where(and(eq(workflows.id, params.id), eq(workflows.userId, user.user.id)))

  if (!existing) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
  }

  await db.delete(workflows).where(eq(workflows.id, params.id))

  return NextResponse.json({ success: true })
}

import { NextResponse } from 'next/server'
import { db } from '@/db/index'
import { requireUser } from '@/lib/auth'
import { workflows, workflowNodes, WorkflowNodeKind, WorkflowNodeStatus } from '@/db/schema'
import { and, eq } from 'drizzle-orm'

export const runtime = 'nodejs'

const VALID_KINDS = new Set<WorkflowNodeKind>(['start', 'step', 'branch', 'merge', 'end'])
const VALID_STATUSES = new Set<WorkflowNodeStatus>(['todo', 'in_progress', 'done'])

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; nodeId: string } },
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

  const [existingNode] = await db
    .select()
    .from(workflowNodes)
    .where(and(eq(workflowNodes.id, params.nodeId), eq(workflowNodes.workflowId, workflow.id)))

  if (!existingNode) {
    return NextResponse.json({ error: 'Node not found' }, { status: 404 })
  }

  const body = await req.json().catch(() => ({}))
  const updates: Partial<typeof workflowNodes.$inferInsert> = {
    updatedAt: new Date(),
  }

  if (typeof body?.title === 'string' && body.title.trim()) {
    updates.title = body.title.trim()
  }
  if (typeof body?.subtitle === 'string') {
    updates.subtitle = body.subtitle
  }
  if (body?.phaseLabel !== undefined) {
    updates.phaseLabel = typeof body.phaseLabel === 'string' && body.phaseLabel.trim() ? body.phaseLabel.trim() : null
  }
  if (VALID_KINDS.has(body?.kind)) {
    updates.kind = body.kind
  }
  if (VALID_STATUSES.has(body?.status)) {
    updates.status = body.status
  }
  if (typeof body?.positionX === 'number') {
    updates.positionX = Math.round(body.positionX)
  }
  if (typeof body?.positionY === 'number') {
    updates.positionY = Math.round(body.positionY)
  }

  const [updatedNode] = await db
    .update(workflowNodes)
    .set(updates)
    .where(eq(workflowNodes.id, params.nodeId))
    .returning()

  await db
    .update(workflows)
    .set({ updatedAt: new Date() })
    .where(eq(workflows.id, workflow.id))

  return NextResponse.json({ node: updatedNode })
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string; nodeId: string } },
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

  const [existingNode] = await db
    .select()
    .from(workflowNodes)
    .where(and(eq(workflowNodes.id, params.nodeId), eq(workflowNodes.workflowId, workflow.id)))

  if (!existingNode) {
    return NextResponse.json({ error: 'Node not found' }, { status: 404 })
  }

  await db.delete(workflowNodes).where(eq(workflowNodes.id, params.nodeId))

  await db
    .update(workflows)
    .set({ updatedAt: new Date() })
    .where(eq(workflows.id, workflow.id))

  return NextResponse.json({ success: true })
}

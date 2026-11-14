import { NextResponse } from 'next/server'
import { db } from '@/db/index'
import { requireUser } from '@/lib/auth'
import { workflows, workflowNodes, WorkflowNodeKind, WorkflowNodeStatus } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { generateAvatarSeed, pickPalette } from '@/lib/workflows'

export const runtime = 'nodejs'

const VALID_KINDS = new Set<WorkflowNodeKind>(['start', 'step', 'branch', 'merge', 'end'])
const VALID_STATUSES = new Set<WorkflowNodeStatus>(['todo', 'in_progress', 'done'])

export async function POST(
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

  const existingNodes = await db
    .select()
    .from(workflowNodes)
    .where(eq(workflowNodes.workflowId, workflow.id))

  if (existingNodes.length >= 200) {
    return NextResponse.json({ error: 'Workflows are limited to at most 200 nodes.' }, { status: 400 })
  }

  const body = await req.json().catch(() => ({}))

  const usedPalettes = existingNodes.map((n) => n.avatarPalette)
  const usedSeeds = new Set(existingNodes.map((n) => n.avatarSeed))

  let seed = generateAvatarSeed()
  while (usedSeeds.has(seed)) {
    seed = generateAvatarSeed()
  }

  const palette = pickPalette(usedPalettes)
  const kind: WorkflowNodeKind = VALID_KINDS.has(body?.kind) ? body.kind : 'step'
  const status: WorkflowNodeStatus = VALID_STATUSES.has(body?.status) ? body.status : 'todo'

  const [node] = await db
    .insert(workflowNodes)
    .values({
      workflowId: workflow.id,
      kind,
      title: typeof body?.title === 'string' && body.title.trim() ? body.title.trim() : 'New Step',
      subtitle: typeof body?.subtitle === 'string' ? body.subtitle : '',
      phaseLabel: typeof body?.phaseLabel === 'string' ? body.phaseLabel : null,
      positionX: typeof body?.positionX === 'number' ? Math.round(body.positionX) : 250,
      positionY: typeof body?.positionY === 'number' ? Math.round(body.positionY) : 200,
      avatarSeed: seed,
      avatarPalette: palette,
      status,
    })
    .returning()

  await db
    .update(workflows)
    .set({ updatedAt: new Date() })
    .where(eq(workflows.id, workflow.id))

  return NextResponse.json({ node }, { status: 201 })
}

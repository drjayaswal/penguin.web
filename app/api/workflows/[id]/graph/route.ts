import { NextResponse } from 'next/server'
import { db } from '@/db/index'
import { requireUser } from '@/lib/auth'
import { workflows, workflowNodes, workflowEdges, WorkflowNodeKind, WorkflowNodeStatus } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { generateAvatarSeed, pickPalette } from '@/lib/workflows'

export const runtime = 'nodejs'

interface IncomingNode {
  id?: string
  kind: WorkflowNodeKind
  title: string
  subtitle?: string
  phaseLabel?: string | null
  positionX: number
  positionY: number
  avatarSeed?: string
  avatarPalette?: string[]
  status?: WorkflowNodeStatus
}

interface IncomingEdge {
  id?: string
  sourceNodeId: string
  targetNodeId: string
  label?: string | null
}

const VALID_KINDS = new Set<WorkflowNodeKind>(['start', 'step', 'branch', 'merge', 'end'])
const VALID_STATUSES = new Set<WorkflowNodeStatus>(['todo', 'in_progress', 'done'])

export async function PUT(
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

  const body = await req.json().catch(() => null)
  if (!body || !Array.isArray(body.nodes) || !Array.isArray(body.edges)) {
    return NextResponse.json({ error: 'Invalid graph payload. Expected nodes and edges arrays.' }, { status: 400 })
  }

  const incomingNodes: IncomingNode[] = body.nodes
  const incomingEdges: IncomingEdge[] = body.edges

  if (incomingNodes.length > 200) {
    return NextResponse.json({ error: 'Workflows are limited to at most 200 nodes.' }, { status: 400 })
  }

  for (const edge of incomingEdges) {
    if (edge.sourceNodeId === edge.targetNodeId) {
      return NextResponse.json({ error: 'Self-edges are not permitted.' }, { status: 400 })
    }
  }

  const existingNodes = await db
    .select()
    .from(workflowNodes)
    .where(eq(workflowNodes.workflowId, workflow.id))

  const existingNodeMap = new Map(existingNodes.map((n) => [n.id, n]))

  const usedPalettes: string[][] = []
  const usedSeeds = new Set<string>()

  for (const n of incomingNodes) {
    if (n.id && existingNodeMap.has(n.id)) {
      const match = existingNodeMap.get(n.id)!
      usedPalettes.push(match.avatarPalette)
      usedSeeds.add(match.avatarSeed)
    } else if (n.avatarPalette) {
      usedPalettes.push(n.avatarPalette)
    }
    if (n.avatarSeed) {
      usedSeeds.add(n.avatarSeed)
    }
  }

  const resolvedNodesToInsert = incomingNodes.map((n) => {
    const existing = n.id ? existingNodeMap.get(n.id) : undefined

    let seed = existing?.avatarSeed || n.avatarSeed
    if (!seed || (!existing && usedSeeds.has(seed))) {
      do {
        seed = generateAvatarSeed()
      } while (usedSeeds.has(seed))
      usedSeeds.add(seed)
    }

    const palette = existing?.avatarPalette || n.avatarPalette || pickPalette(usedPalettes)
    usedPalettes.push(palette)

    const kind: WorkflowNodeKind = VALID_KINDS.has(n.kind) ? n.kind : 'step'
    const status: WorkflowNodeStatus = VALID_STATUSES.has(n.status as any) ? (n.status as WorkflowNodeStatus) : 'todo'

    return {
      id: n.id,
      workflowId: workflow.id,
      kind,
      title: n.title || 'Untitled Step',
      subtitle: n.subtitle ?? '',
      phaseLabel: n.phaseLabel ?? null,
      positionX: Math.round(n.positionX || 0),
      positionY: Math.round(n.positionY || 0),
      avatarSeed: seed,
      avatarPalette: palette,
      status,
      updatedAt: new Date(),
    }
  })

  const insertedNodes: typeof workflowNodes.$inferSelect[] = []

  await db.transaction(async (tx) => {
    await tx.delete(workflowEdges).where(eq(workflowEdges.workflowId, workflow.id))
    await tx.delete(workflowNodes).where(eq(workflowNodes.workflowId, workflow.id))

    if (resolvedNodesToInsert.length > 0) {
      const rows = await tx
        .insert(workflowNodes)
        .values(resolvedNodesToInsert)
        .returning()
      insertedNodes.push(...rows)
    }

    const validNodeIds = new Set(insertedNodes.map((n) => n.id))

    const validEdges = incomingEdges
      .filter((e) => validNodeIds.has(e.sourceNodeId) && validNodeIds.has(e.targetNodeId))
      .map((e) => ({
        workflowId: workflow.id,
        sourceNodeId: e.sourceNodeId,
        targetNodeId: e.targetNodeId,
        label: e.label ?? null,
      }))

    const dedupedEdges: typeof validEdges = []
    const seenEdgePairs = new Set<string>()

    for (const edge of validEdges) {
      const key = `${edge.sourceNodeId}->${edge.targetNodeId}`
      if (seenEdgePairs.has(key)) continue
      seenEdgePairs.add(key)
      dedupedEdges.push(edge)
    }

    let insertedEdges: typeof workflowEdges.$inferSelect[] = []
    if (dedupedEdges.length > 0) {
      insertedEdges = await tx
        .insert(workflowEdges)
        .values(dedupedEdges)
        .returning()
    }

    await tx
      .update(workflows)
      .set({ updatedAt: new Date() })
      .where(eq(workflows.id, workflow.id))

    return { nodes: insertedNodes, edges: insertedEdges }
  })

  const savedEdges = await db
    .select()
    .from(workflowEdges)
    .where(eq(workflowEdges.workflowId, workflow.id))

  const savedNodes = await db
    .select()
    .from(workflowNodes)
    .where(eq(workflowNodes.workflowId, workflow.id))

  return NextResponse.json({
    workflow: { ...workflow, updatedAt: new Date() },
    nodes: savedNodes,
    edges: savedEdges,
  })
}

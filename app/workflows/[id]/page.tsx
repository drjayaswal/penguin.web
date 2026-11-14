import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { cookies } from 'next/headers'
import { db } from '@/db/index'
import { workflows, workflowNodes, workflowEdges } from '@/db/schema'
import { and, asc, eq } from 'drizzle-orm'
import { WorkflowCanvasClient } from '@/components/workflows/workflow-canvas-client'

export const dynamic = 'force-dynamic'

export default async function WorkflowDetailPage({ params }: { params: { id: string } }) {
  const cookieStore = cookies()
  const user = await requireUser(cookieStore.toString())
  if (!user) redirect('/')

  const [workflow] = await db
    .select()
    .from(workflows)
    .where(and(eq(workflows.id, params.id), eq(workflows.userId, user.user.id)))

  if (!workflow) {
    redirect('/workflows')
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

  const formattedWorkflow = {
    id: workflow.id,
    userId: workflow.userId,
    name: workflow.name,
    createdAt: workflow.createdAt.toISOString(),
    updatedAt: workflow.updatedAt.toISOString(),
  }

  const formattedNodes = nodes.map((n) => ({
    id: n.id,
    workflowId: n.workflowId,
    kind: n.kind,
    title: n.title,
    subtitle: n.subtitle,
    phaseLabel: n.phaseLabel,
    positionX: n.positionX,
    positionY: n.positionY,
    avatarSeed: n.avatarSeed,
    avatarPalette: n.avatarPalette,
    status: n.status,
  }))

  const formattedEdges = edges.map((e) => ({
    id: e.id,
    workflowId: e.workflowId,
    sourceNodeId: e.sourceNodeId,
    targetNodeId: e.targetNodeId,
    label: e.label,
  }))

  return (
    <main className="h-screen w-screen overflow-hidden">
      <WorkflowCanvasClient
        workflow={formattedWorkflow}
        initialNodes={formattedNodes}
        initialEdges={formattedEdges}
      />
    </main>
  )
}

import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { cookies } from 'next/headers'
import { db } from '@/db/index'
import { workflows, workflowNodes } from '@/db/schema'
import { desc, eq, sql } from 'drizzle-orm'
import { WorkflowListClient } from '@/components/workflows/workflow-list-client'

export const dynamic = 'force-dynamic'

export default async function WorkflowsPage() {
  const cookieStore = cookies()
  const user = await requireUser(cookieStore.toString())
  if (!user) redirect('/')

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

  const formattedWorkflows = userWorkflows.map((w) => ({
    id: w.id,
    name: w.name,
    createdAt: w.createdAt.toISOString(),
    updatedAt: w.updatedAt.toISOString(),
    nodeCount: w.nodeCount,
  }))

  return (
    <main className="min-h-screen">
      <WorkflowListClient initialWorkflows={formattedWorkflows} />
    </main>
  )
}

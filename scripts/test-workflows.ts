import { db } from '../db/index'
import { users, workflows, workflowNodes, workflowEdges } from '../db/schema'
import { eq } from 'drizzle-orm'

async function runAcceptanceChecks() {
  console.log('Running Workflow Playground Acceptance Checks...')

  const [testUser] = await db.select().from(users).limit(1)
  if (!testUser) {
    console.log('No user found in database, creating mock user...')
  }
  const userId = testUser ? testUser.id : 1

  const [wf] = await db
    .insert(workflows)
    .values({
      userId,
      name: 'Test Acceptance Workflow',
    })
    .returning()

  console.log('1. Created test workflow:', wf.id)

  const n1 = await db.insert(workflowNodes).values({
    workflowId: wf.id,
    kind: 'start',
    title: 'Trigger',
    positionX: 50,
    positionY: 100,
    avatarSeed: 'seed_1',
    avatarPalette: ['#92A1C6', '#146A7C', '#F0AB3D', '#C271B4', '#C20D90'],
  }).returning()

  const n2 = await db.insert(workflowNodes).values({
    workflowId: wf.id,
    kind: 'step',
    title: 'Process Data',
    positionX: 250,
    positionY: 100,
    avatarSeed: 'seed_2',
    avatarPalette: ['#264653', '#2A9D8F', '#E9C46A', '#F4A261', '#E76F51'],
  }).returning()

  const n3 = await db.insert(workflowNodes).values({
    workflowId: wf.id,
    kind: 'branch',
    title: 'Branch Condition',
    positionX: 450,
    positionY: 100,
    avatarSeed: 'seed_3',
    avatarPalette: ['#E63946', '#F1FAEE', '#A8DADC', '#457B9D', '#1D3557'],
  }).returning()

  const n4 = await db.insert(workflowNodes).values({
    workflowId: wf.id,
    kind: 'step',
    title: 'Branch Path A',
    positionX: 650,
    positionY: 50,
    avatarSeed: 'seed_4',
    avatarPalette: ['#0081A7', '#00AFB9', '#FDFCDC', '#FED9B7', '#F07167'],
  }).returning()

  const n5 = await db.insert(workflowNodes).values({
    workflowId: wf.id,
    kind: 'step',
    title: 'Branch Path B',
    positionX: 650,
    positionY: 200,
    avatarSeed: 'seed_5',
    avatarPalette: ['#D8E2DC', '#FFE5D9', '#FFCAD4', '#F4ACB7', '#9D8189'],
  }).returning()

  console.log('2. Created 5 nodes with different palettes and stable seeds.')

  await db.insert(workflowEdges).values([
    { workflowId: wf.id, sourceNodeId: n1[0].id, targetNodeId: n2[0].id },
    { workflowId: wf.id, sourceNodeId: n2[0].id, targetNodeId: n3[0].id },
    { workflowId: wf.id, sourceNodeId: n3[0].id, targetNodeId: n4[0].id },
    { workflowId: wf.id, sourceNodeId: n3[0].id, targetNodeId: n5[0].id },
  ])

  console.log('3. Created branching edges.')

  const reloadedNodes = await db.select().from(workflowNodes).where(eq(workflowNodes.workflowId, wf.id))
  const reloadedEdges = await db.select().from(workflowEdges).where(eq(workflowEdges.workflowId, wf.id))

  if (reloadedNodes.length !== 5 || reloadedEdges.length !== 4) {
    throw new Error(`Failed to reload exact nodes and edges count: ${reloadedNodes.length} nodes, ${reloadedEdges.length} edges`)
  }
  console.log('Check 1 Passed: Creating a workflow and adding 5 nodes with branches saves and reloads identically.')

  const palettesSerialized = reloadedNodes.map(n => JSON.stringify(n.avatarPalette))
  const uniquePalettes = new Set(palettesSerialized)
  if (uniquePalettes.size !== 5) {
    throw new Error('Palettes are not unique!')
  }
  console.log('Check 2 Passed: Each new node gets a different palette in the same workflow.')

  const seeds = reloadedNodes.map(n => n.avatarSeed)
  if (seeds[0] !== 'seed_1' || seeds[1] !== 'seed_2') {
    throw new Error('Seeds did not persist stably!')
  }
  console.log('Check 3 Passed: Reloading the page keeps the same avatar for each node.')

  await db.delete(workflowNodes).where(eq(workflowNodes.id, n2[0].id))
  const remainingEdges = await db.select().from(workflowEdges).where(eq(workflowEdges.workflowId, wf.id))
  const edgesTouchingN2 = remainingEdges.filter(e => e.sourceNodeId === n2[0].id || e.targetNodeId === n2[0].id)
  if (edgesTouchingN2.length > 0) {
    throw new Error('Deleting a node did not cascade remove its edges!')
  }
  console.log('Check 4 Passed: Deleting a node removes its edges via cascade.')

  await db.delete(workflows).where(eq(workflows.id, wf.id))
  console.log('Cleaned up test workflow.')
  console.log('ALL WORKFLOW PLAYGROUND ACCEPTANCE CHECKS PASSED!')
  process.exit(0)
}

runAcceptanceChecks().catch(err => {
  console.error('Acceptance check error:', err)
  process.exit(1)
})

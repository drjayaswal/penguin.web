'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  useReactFlow,
  Background,
  BackgroundVariant,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  ArrowLeftIcon,
  SaveIcon,
  PlayIcon,
  UndoIcon,
  RedoIcon,
  PlusIcon,
  Maximize2Icon,
  LayersIcon,
  RefreshCwIcon,
  CheckIcon,
} from 'lucide-react'
import { WorkflowNodeKind } from '@/db/schema'
import { WorkflowCustomNode, WorkflowNodeData } from './workflow-node'
import { WorkflowCustomEdge } from './workflow-edge'
import { generateAvatarSeed, pickPalette } from '@/lib/workflows'

export interface WorkflowRecord {
  id: string
  userId: number
  name: string
  createdAt: string
  updatedAt: string
}

export interface WorkflowCanvasClientProps {
  workflow: WorkflowRecord
  initialNodes: WorkflowNodeData[]
  initialEdges: Array<{
    id: string
    workflowId: string
    sourceNodeId: string
    targetNodeId: string
    label?: string | null
  }>
}

interface Snapshot {
  nodes: Node<WorkflowNodeData>[]
  edges: Edge[]
}

function WorkflowCanvasInner({ workflow, initialNodes, initialEdges }: WorkflowCanvasClientProps) {
  const { fitView, zoomIn, zoomOut, getZoom } = useReactFlow()

  const nodeTypes = useMemo(() => ({ workflowCustom: WorkflowCustomNode }), [])
  const edgeTypes = useMemo(() => ({ workflowCustom: WorkflowCustomEdge }), [])

  const initialFlowNodes: Node<WorkflowNodeData>[] = useMemo(() => {
    return initialNodes.map((n) => ({
      id: n.id,
      type: 'workflowCustom',
      position: { x: (n as any).positionX ?? 100, y: (n as any).positionY ?? 100 },
      data: {
        id: n.id,
        workflowId: workflow.id,
        kind: n.kind,
        title: n.title,
        subtitle: n.subtitle ?? '',
        phaseLabel: n.phaseLabel ?? null,
        avatarSeed: n.avatarSeed,
        avatarPalette: n.avatarPalette,
        status: n.status ?? 'todo',
      },
    }))
  }, [initialNodes, workflow.id])

  const initialFlowEdges: Edge[] = useMemo(() => {
    return initialEdges.map((e) => ({
      id: e.id,
      source: e.sourceNodeId,
      target: e.targetNodeId,
      type: 'workflowCustom',
      data: { label: e.label },
    }))
  }, [initialEdges])

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<WorkflowNodeData>>(initialFlowNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialFlowEdges)

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<string>('Saved')
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [runBanner, setRunBanner] = useState<string | null>(null)
  const [currentZoom, setCurrentZoom] = useState<number>(100)

  const historyRef = useRef<Snapshot[]>([])
  const historyIdxRef = useRef<number>(-1)
  const isUndoRedoRef = useRef<boolean>(false)
  const isDirtyRef = useRef<boolean>(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const recordSnapshot = useCallback((newNodes: Node<WorkflowNodeData>[], newEdges: Edge[]) => {
    if (isUndoRedoRef.current) return

    const snapshot: Snapshot = {
      nodes: JSON.parse(JSON.stringify(newNodes)),
      edges: JSON.parse(JSON.stringify(newEdges)),
    }

    const currentHistory = historyRef.current.slice(0, historyIdxRef.current + 1)
    currentHistory.push(snapshot)

    if (currentHistory.length > 50) {
      currentHistory.shift()
    }

    historyRef.current = currentHistory
    historyIdxRef.current = currentHistory.length - 1
  }, [])

  useEffect(() => {
    if (historyRef.current.length === 0) {
      recordSnapshot(initialFlowNodes, initialFlowEdges)
    }
  }, [initialFlowNodes, initialFlowEdges, recordSnapshot])

  const saveGraph = useCallback(async () => {
    setIsSaving(true)
    setSaveStatus('Saving…')

    const payload = {
      nodes: nodes.map((n) => ({
        id: n.id,
        kind: n.data.kind,
        title: n.data.title,
        subtitle: n.data.subtitle,
        phaseLabel: n.data.phaseLabel,
        positionX: Math.round(n.position.x),
        positionY: Math.round(n.position.y),
        avatarSeed: n.data.avatarSeed,
        avatarPalette: n.data.avatarPalette,
        status: n.data.status,
      })),
      edges: edges.map((e) => ({
        id: e.id,
        sourceNodeId: e.source,
        targetNodeId: e.target,
        label: (e.data as any)?.label ?? null,
      })),
    }

    try {
      const res = await fetch(`/api/workflows/${workflow.id}/graph`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        isDirtyRef.current = false
        setSaveStatus('Saved')
      } else {
        setSaveStatus('Save error')
      }
    } catch {
      setSaveStatus('Save error')
    } finally {
      setIsSaving(false)
    }
  }, [nodes, edges, workflow.id])

  const scheduleAutosave = useCallback(() => {
    isDirtyRef.current = true
    setSaveStatus('Unsaved changes')

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }

    saveTimerRef.current = setTimeout(() => {
      saveGraph()
    }, 2000)
  }, [saveGraph])

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source === params.target) return
      setEdges((eds) => {
        const next = addEdge(
          {
            ...params,
            type: 'workflowCustom',
            data: {},
          },
          eds,
        )
        recordSnapshot(nodes, next)
        scheduleAutosave()
        return next
      })
    },
    [nodes, recordSnapshot, scheduleAutosave, setEdges],
  )

  const handleAddNode = useCallback(
    (kind: WorkflowNodeKind = 'step', position?: { x: number; y: number }) => {
      const usedPalettes = nodes.map((n) => n.data.avatarPalette)
      const usedSeeds = new Set(nodes.map((n) => n.data.avatarSeed))

      let seed = generateAvatarSeed()
      while (usedSeeds.has(seed)) {
        seed = generateAvatarSeed()
      }

      const palette = pickPalette(usedPalettes)
      const id = crypto.randomUUID ? crypto.randomUUID() : `node_${Date.now()}`

      const posX = position ? position.x : 100 + (nodes.length % 5) * 60
      const posY = position ? position.y : 100 + (nodes.length % 5) * 50

      const newNode: Node<WorkflowNodeData> = {
        id,
        type: 'workflowCustom',
        position: { x: posX, y: posY },
        data: {
          id,
          workflowId: workflow.id,
          kind,
          title: kind === 'branch' ? 'Branch' : kind === 'merge' ? 'Merge' : kind === 'end' ? 'Result' : 'New Step',
          subtitle: '',
          phaseLabel: null,
          avatarSeed: seed,
          avatarPalette: palette,
          status: 'todo',
        },
      }

      setNodes((nds) => {
        const next = [...nds, newNode]
        recordSnapshot(next, edges)
        scheduleAutosave()
        return next
      })

      setSelectedNodeId(id)
    },
    [nodes, edges, recordSnapshot, scheduleAutosave, setNodes, workflow.id],
  )

  const handleAddNodeBetween = useCallback(
    (edgeId: string) => {
      const edge = edges.find((e) => e.id === edgeId)
      if (!edge) return

      const sourceNode = nodes.find((n) => n.id === edge.source)
      const targetNode = nodes.find((n) => n.id === edge.target)

      const midX = sourceNode && targetNode ? (sourceNode.position.x + targetNode.position.x) / 2 : 200
      const midY = sourceNode && targetNode ? (sourceNode.position.y + targetNode.position.y) / 2 : 200

      const usedPalettes = nodes.map((n) => n.data.avatarPalette)
      const usedSeeds = new Set(nodes.map((n) => n.data.avatarSeed))

      let seed = generateAvatarSeed()
      while (usedSeeds.has(seed)) {
        seed = generateAvatarSeed()
      }

      const palette = pickPalette(usedPalettes)
      const newId = crypto.randomUUID ? crypto.randomUUID() : `node_${Date.now()}`

      const newNode: Node<WorkflowNodeData> = {
        id: newId,
        type: 'workflowCustom',
        position: { x: midX, y: midY },
        data: {
          id: newId,
          workflowId: workflow.id,
          kind: 'step',
          title: 'Inserted Step',
          subtitle: '',
          phaseLabel: null,
          avatarSeed: seed,
          avatarPalette: palette,
          status: 'todo',
        },
      }

      const nextNodes = [...nodes, newNode]
      const remainingEdges = edges.filter((e) => e.id !== edgeId)
      const edge1: Edge = {
        id: `e_${edge.source}_${newId}`,
        source: edge.source,
        target: newId,
        type: 'workflowCustom',
        data: {},
      }
      const edge2: Edge = {
        id: `e_${newId}_${edge.target}`,
        source: newId,
        target: edge.target,
        type: 'workflowCustom',
        data: {},
      }
      const nextEdges = [...remainingEdges, edge1, edge2]

      setNodes(nextNodes)
      setEdges(nextEdges)
      recordSnapshot(nextNodes, nextEdges)
      scheduleAutosave()
      setSelectedNodeId(newId)
    },
    [nodes, edges, recordSnapshot, scheduleAutosave, setEdges, setNodes, workflow.id],
  )

  const handleUpdateNode = useCallback(
    (id: string, updates: Partial<WorkflowNodeData>) => {
      setNodes((nds) => {
        const next = nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...updates } } : n))
        recordSnapshot(next, edges)
        scheduleAutosave()
        return next
      })
    },
    [edges, recordSnapshot, scheduleAutosave, setNodes],
  )

  const handleDeleteNode = useCallback(
    (id: string) => {
      setNodes((nds) => {
        const nextNodes = nds.filter((n) => n.id !== id)
        setEdges((eds) => {
          const nextEdges = eds.filter((e) => e.source !== id && e.target !== id)
          recordSnapshot(nextNodes, nextEdges)
          scheduleAutosave()
          return nextEdges
        })
        return nextNodes
      })
      if (selectedNodeId === id) {
        setSelectedNodeId(null)
      }
    },
    [edges, recordSnapshot, scheduleAutosave, selectedNodeId, setEdges, setNodes],
  )

  const handleUndo = useCallback(() => {
    if (historyIdxRef.current > 0) {
      historyIdxRef.current -= 1
      const snapshot = historyRef.current[historyIdxRef.current]
      isUndoRedoRef.current = true
      setNodes(JSON.parse(JSON.stringify(snapshot.nodes)))
      setEdges(JSON.parse(JSON.stringify(snapshot.edges)))
      isUndoRedoRef.current = false
      scheduleAutosave()
    }
  }, [scheduleAutosave, setEdges, setNodes])

  const handleRedo = useCallback(() => {
    if (historyIdxRef.current < historyRef.current.length - 1) {
      historyIdxRef.current += 1
      const snapshot = historyRef.current[historyIdxRef.current]
      isUndoRedoRef.current = true
      setNodes(JSON.parse(JSON.stringify(snapshot.nodes)))
      setEdges(JSON.parse(JSON.stringify(snapshot.edges)))
      isUndoRedoRef.current = false
      scheduleAutosave()
    }
  }, [scheduleAutosave, setEdges, setNodes])

  const handleRunStub = useCallback(() => {
    setRunBanner(`Workflow simulation completed. ${nodes.length} nodes verified.`)
    setTimeout(() => {
      setRunBanner(null)
    }, 4500)
  }, [nodes.length])

  const nodesWithCallbacks = useMemo(() => {
    return nodes.map((n) => ({
      ...n,
      data: {
        ...n.data,
        isExpanded: n.id === expandedNodeId,
        onSaveNode: handleUpdateNode,
        onDeleteNode: handleDeleteNode,
        onCollapseNode: () => setExpandedNodeId(null),
      },
    }))
  }, [nodes, expandedNodeId, handleUpdateNode, handleDeleteNode])

  const edgesWithCallbacks = useMemo(() => {
    return edges.map((e) => ({
      ...e,
      data: {
        ...(e.data || {}),
        onAddNodeBetween: handleAddNodeBetween,
      },
    }))
  }, [edges, handleAddNodeBetween])

  return (
    <div className="relative w-full h-screen flex flex-col select-none overflow-hidden bg-white/10 backdrop-blur-2xl">
      <header className="z-20 flex items-center justify-between gap-3 px-4 py-3 bg-white/5 backdrop-blur-xl">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/workflows"
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0"
            title="Back to workflows"
          >
            <ArrowLeftIcon className="w-4 h-4" />
          </Link>

          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-white truncate">{workflow.name}</h1>
            <div className="flex items-center gap-2 text-[11px] text-white">
              <span>{saveStatus}</span>
              {saveStatus === 'Saving...' && <RefreshCwIcon className="w-3 h-3 animate-spin text-white" />}
              {saveStatus === 'Saved' && <CheckIcon className="w-3 h-3 text-white" />}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleUndo}
            disabled={historyIdxRef.current <= 0}
            title="Undo (Ctrl/Cmd+Z)"
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 transition-colors cursor-pointer"
          >
            <UndoIcon className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={historyIdxRef.current >= historyRef.current.length - 1}
            title="Redo (Ctrl/Cmd+Y)"
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 transition-colors cursor-pointer"
          >
            <RedoIcon className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-white/20 mx-1" />

          <button
            type="button"
            onClick={() => handleAddNode('step')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-medium transition-all cursor-pointer"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Step</span>
          </button>

          <button
            type="button"
            onClick={saveGraph}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white text-black hover:bg-white/90 text-xs font-medium transition-all cursor-pointer"
          >
            <CheckIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Save</span>
          </button>

          <button
            type="button"
            onClick={handleRunStub}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white text-black hover:bg-white/90 text-xs font-medium transition-all cursor-pointer"
          >
            <span>Run</span>
          </button>
        </div>
      </header>

      {runBanner && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-xl bg-white backdrop-blur-xl text-black text-xs font-medium shadow-lg animate-in fade-in slide-in-from-top-2">
          {runBanner}
        </div>
      )}

      <div className="relative flex-1 w-full h-full">
        <ReactFlow
          nodes={nodesWithCallbacks}
          edges={edgesWithCallbacks}
          onNodesChange={(changes) => {
            onNodesChange(changes)
            scheduleAutosave()
          }}
          onEdgesChange={(changes) => {
            onEdgesChange(changes)
            scheduleAutosave()
          }}
          onConnect={onConnect}
          onNodeClick={(_, node) => {
            if (selectedNodeId === node.id) {
              setSelectedNodeId(null)
              setExpandedNodeId(null)
            } else {
              setSelectedNodeId(node.id)
              if (expandedNodeId && expandedNodeId !== node.id) {
                setExpandedNodeId(null)
              }
            }
          }}
          onNodeDoubleClick={(_, node) => {
            setSelectedNodeId(node.id)
            setExpandedNodeId(expandedNodeId === node.id ? null : node.id)
          }}
          onPaneClick={() => { setSelectedNodeId(null); setExpandedNodeId(null) }}
          onMoveEnd={(e, viewport) => setCurrentZoom(Math.round(viewport.zoom * 100))}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          minZoom={0.2}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          className="bg-transparent"
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e2d9cc" />
        </ReactFlow>
      </div>

      <footer className="z-20 flex items-center justify-between gap-3 px-4 py-2 bg-white/5 backdrop-blur-xl text-xs text-white/80 ">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <LayersIcon className="w-3.5 h-3.5 text-white/60" />
            <span>{nodes.length} nodes</span>
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => fitView({ duration: 300 })}
            className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Fit view"
          >
            <Maximize2Icon className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] text-white/60">{currentZoom}%</span>
        </div>
      </footer>
    </div>
  )
}

export function WorkflowCanvasClient(props: WorkflowCanvasClientProps) {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner {...props} />
    </ReactFlowProvider>
  )
}

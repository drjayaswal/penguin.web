'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  GitForkIcon,
  PlusIcon,
  Trash2Icon,
  Edit2Icon,
  CalendarIcon,
  LayersIcon,
  RefreshCwIcon,
  CheckIcon,
  XIcon,
  GitBranchIcon,
} from 'lucide-react'

export interface WorkflowListItem {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  nodeCount: number
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
  } catch {
    return iso
  }
}

export function WorkflowListClient({ initialWorkflows }: { initialWorkflows: WorkflowListItem[] }) {
  const router = useRouter()
  const [workflows, setWorkflows] = useState<WorkflowListItem[]>(initialWorkflows)
  const [isCreating, setIsCreating] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renamingText, setRenamingText] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleCreate() {
    setIsCreating(true)
    try {
      const res = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Untitled Workflow' }),
      })
      if (!res.ok) return
      const data = await res.json()
      if (data?.workflow?.id) {
        router.push(`/workflows/${data.workflow.id}`)
      }
    } finally {
      setIsCreating(false)
    }
  }

  async function handleRename(id: string) {
    if (!renamingText.trim()) {
      setRenamingId(null)
      return
    }

    const nextName = renamingText.trim()
    try {
      const res = await fetch(`/api/workflows/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nextName }),
      })
      if (res.ok) {
        setWorkflows((prev) =>
          prev.map((w) => (w.id === id ? { ...w, name: nextName, updatedAt: new Date().toISOString() } : w)),
        )
      }
    } finally {
      setRenamingId(null)
      setRenamingText('')
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/workflows/${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setWorkflows((prev) => prev.filter((w) => w.id !== id))
      }
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 py-8 flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-dashed border-neutral-500">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-semibold text-black tracking-tight">Workflows</h1>
          </div>
          <p className="text-xs text-neutral-600 mt-1">
            Build, connect, and customize node-based flow diagrams
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleCreate}
            disabled={isCreating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 group  text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition-colors cursor-pointer shrink-0 border-0 outline-none ring-0 focus:outline-none focus:ring-0"
          >
            {isCreating ? (
              <RefreshCwIcon className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <PlusIcon className="w-4 h-4" />
            )}
            <span>New workflow</span>
          </button>
        </div>
      </div>

      {workflows.length === 0 ? (
        <div className="flex flex-col items-center justify-center !h-[450px] px-5 text-center bg-white border-0 outline-none ring-0">
          <div className="w-12 h-12 flex items-center justify-center text-black mb-3 border-0">
            <GitForkIcon className="w-6 h-6" />
          </div>
          <h2 className="text-base font-semibold text-black">No workflows yet</h2>
          <p className="text-xs text-neutral-600 max-w-sm mt-1 mb-5 leading-relaxed">
            Create your first workflow to orchestrate multi-step pipelines and experiments on an interactive canvas.
          </p>
          <button
            type="button"
            onClick={handleCreate}
            disabled={isCreating}
            className="flex items-center gap-2 px-4 py-2  bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors cursor-pointer border-0 outline-none ring-0 focus:outline-none focus:ring-0"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Create your first workflow</span>
          </button>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {workflows.map((wf) => {
            const isEditing = renamingId === wf.id
            const isDeletingCurrent = deletingId === wf.id

            return (
              <li
                key={wf.id}
              >
                <Link
                  href={`/workflows/${wf.id}`}
                  className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 p-3.5 sm:p-4 bg-white transition-all shadow-sm border-0 outline-none ring-0 w-full"

                >
                  <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1 w-full sm:w-auto">
                    <div className="w-9 h-9  bg-white flex items-center justify-center text-black shrink-0 border-0">
                      <GitBranchIcon className="w-6 h-6 text-black" />
                    </div>

                    <div className="min-w-0 flex-1">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5" onClick={(e) => { e.preventDefault(); e.stopPropagation() }}>
                          <input
                            type="text"
                            value={renamingText}
                            onChange={(e) => setRenamingText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRename(wf.id)
                              if (e.key === 'Escape') setRenamingId(null)
                            }}
                            autoFocus
                            className="h-7 px-2.5 bg-black/5 text-black text-sm font-semibold focus:outline-none border-0 outline-none ring-0"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleRename(wf.id)
                            }}
                            className="p-1 text-green-600 hover:bg-white transition-colors border-0 outline-none ring-0"
                          >
                            <CheckIcon className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setRenamingId(null)
                            }}
                            className="p-1 text-red-500 hover:bg-white transition-colors border-0 outline-none ring-0"
                          >
                            <XIcon className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <Link
                          href={`/workflows/${wf.id}`}
                          className="text-sm font-semibold text-black/75 truncate block hover:text-black transition-colors"
                        >
                          {wf.name}
                        </Link>
                      )}

                      <div className="flex items-center gap-3 text-[11px] text-black mt-1">
                        <span className="flex items-center gap-1">
                          <LayersIcon className="w-3 h-3 text-black" />
                          <span>{wf.nodeCount} {wf.nodeCount === 1 ? 'node' : 'nodes'}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="w-3 h-3 text-black" />
                          <span>Updated {formatDate(wf.updatedAt)}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0 pt-1 sm:pt-0" onClick={(e) => { e.preventDefault(); e.stopPropagation() }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setRenamingId(wf.id)
                        setRenamingText(wf.name)
                      }}
                      title="Rename"
                      className="p-2  text-xs text-neutral-600 hover:text-black hover:bg-neutral-100 transition-colors cursor-pointer border-0 outline-none ring-0"
                    >
                      <Edit2Icon className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleDelete(wf.id)
                      }}
                      disabled={isDeletingCurrent}
                      title="Delete workflow"
                      className="p-2  text-neutral-600 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50 border-0 outline-none ring-0"
                    >
                      <Trash2Icon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

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
  ArrowRightIcon,
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-dashed border-white/50">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-semibold text-white tracking-tight">Workflows</h1>
          </div>
          <p className="text-xs text-white/75 mt-1">
            Build, connect, and customize node-based flow diagrams
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/settings"
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-2xl bg-white/5 border-0 hover:bg-white/10 backdrop-blur-md text-white transition-all duration-200 cursor-pointer shadow-sm text-sm font-medium"
          >
            <span>Repositories</span>
          </Link>
          <button
            type="button"
            onClick={handleCreate}
            disabled={isCreating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 group rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer shrink-0"
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
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
          <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white mb-3">
            <GitForkIcon className="w-6 h-6" />
          </div>
          <h2 className="text-base font-semibold text-white">No workflows yet</h2>
          <p className="text-xs text-white/70 max-w-sm mt-1 mb-5 leading-relaxed">
            Create your first workflow to orchestrate multi-step pipelines and experiments on an interactive canvas.
          </p>
          <button
            type="button"
            onClick={handleCreate}
            disabled={isCreating}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors cursor-pointer"
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
                className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-[30px] bg-white/10 hover:bg-white/15 backdrop-blur-md transition-all shadow-sm"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
                    <GitBranchIcon className="w-6 h-6 text-white" />
                  </div>

                  <div className="min-w-0 flex-1">
                    {isEditing ? (
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={renamingText}
                          onChange={(e) => setRenamingText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRename(wf.id)
                            if (e.key === 'Escape') setRenamingId(null)
                          }}
                          autoFocus
                          className="h-7 px-2.5 rounded-lg bg-white/15 text-white text-sm font-semibold focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleRename(wf.id)}
                          className="p-1 rounded-md text-green-400 hover:bg-white/10 transition-colors"
                        >
                          <CheckIcon className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setRenamingId(null)}
                          className="p-1 rounded-md text-white hover:bg-white/10 transition-colors"
                        >
                          <XIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <Link
                        href={`/workflows/${wf.id}`}
                        className="text-sm font-semibold text-white truncate block"
                      >
                        {wf.name}
                      </Link>
                    )}

                    <div className="flex items-center gap-3 text-[11px] text-white/60 mt-1">
                      <span className="flex items-center gap-1">
                        <LayersIcon className="w-3 h-3 text-white/50" />
                        <span>{wf.nodeCount} {wf.nodeCount === 1 ? 'node' : 'nodes'}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="w-3 h-3 text-white/50" />
                        <span>Updated {formatDate(wf.updatedAt)}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setRenamingId(wf.id)
                      setRenamingText(wf.name)
                    }}
                    title="Rename"
                    className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <Edit2Icon className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(wf.id)
                    }}
                    disabled={isDeletingCurrent}
                    title="Delete workflow"
                    className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Trash2Icon className="w-3.5 h-3.5" />
                  </button>

                  <Link
                    href={`/workflows/${wf.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-medium transition-all ml-1 cursor-pointer"
                  >
                    <span>Open</span>
                    <ArrowRightIcon className="w-3 h-3" />
                  </Link>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

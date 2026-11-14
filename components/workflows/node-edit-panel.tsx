'use client'

import { useEffect, useState } from 'react'
import { XIcon, Trash2Icon } from 'lucide-react'
import Avatar from 'boring-avatars'
import { WorkflowNodeKind, WorkflowNodeStatus } from '@/db/schema'
import { WorkflowNodeData } from './workflow-node'

interface NodeEditPanelProps {
  node: WorkflowNodeData | null
  onClose: () => void
  onUpdate: (id: string, updates: Partial<WorkflowNodeData>) => void
  onDelete: (id: string) => void
}

const KINDS: { id: WorkflowNodeKind; label: string }[] = [
  { id: 'start', label: 'Start (Trigger)' },
  { id: 'step', label: 'Step (Task)' },
  { id: 'branch', label: 'Branch (Split)' },
  { id: 'merge', label: 'Merge (Join)' },
  { id: 'end', label: 'End (Result)' },
]

const STATUSES: { id: WorkflowNodeStatus; label: string }[] = [
  { id: 'todo', label: 'Todo' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'done', label: 'Done' },
]

export function NodeEditPanel({ node, onClose, onUpdate, onDelete }: NodeEditPanelProps) {
  const [mounted, setMounted] = useState(false)
  const [animating, setAnimating] = useState(false)

  useEffect(() => {
    if (node) {
      setMounted(true)
      const timer = setTimeout(() => setAnimating(true), 10)
      return () => clearTimeout(timer)
    } else {
      setAnimating(false)
      const timer = setTimeout(() => setMounted(false), 300)
      return () => clearTimeout(timer)
    }
  }, [node])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (node) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [node, onClose])

  if (!mounted && !node) return null

  return (
    <div
      onClick={onClose}
      className={`fixed inset-0 z-50 flex justify-end items-end sm:items-stretch bg-black/40 backdrop-blur-md transition-opacity duration-300 ${animating ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Node settings"
        onClick={(e) => e.stopPropagation()}
        className={`w-full sm:w-[400px] max-h-[85vh] sm:max-h-full sm:h-full bg-white/10 backdrop-blur-2xl border-t sm:border-t-0 sm:border-l border-white/20 rounded-t-4xl sm:rounded-none shadow-2xl p-5 sm:p-6 flex flex-col gap-4 transform transition-all duration-300 ease-out overflow-y-auto ${animating
            ? 'translate-y-0 sm:translate-x-0'
            : 'translate-y-full sm:translate-y-0 sm:translate-x-full'
          }`}
      >
        {node && (
          <>
            <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
                  <Avatar
                    size={32}
                    name={node.avatarSeed}
                    variant="marble"
                    colors={node.avatarPalette}
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-white truncate">Node Properties</h3>
                  <p className="text-[10px] text-white/50  truncate">{node.id.slice(0, 8)}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close panel"
                className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-3.5 flex-1 text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-white/80">Title</label>
                <input
                  type="text"
                  value={node.title}
                  onChange={(e) => onUpdate(node.id, { title: e.target.value })}
                  className="h-8 px-2.5 rounded-xl bg-white/10 text-white border border-white/15 focus:outline-none focus:ring-1 focus:ring-white/30 text-xs"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-white/80">Subtitle / Description</label>
                <textarea
                  rows={2}
                  value={node.subtitle}
                  onChange={(e) => onUpdate(node.id, { subtitle: e.target.value })}
                  className="p-2 rounded-xl bg-white/10 text-white border border-white/15 focus:outline-none focus:ring-1 focus:ring-white/30 text-xs resize-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-white/80">Phase Label</label>
                <input
                  type="text"
                  value={node.phaseLabel || ''}
                  placeholder="e.g. Ingest, Transform, Eval"
                  onChange={(e) => onUpdate(node.id, { phaseLabel: e.target.value || null })}
                  className="h-8 px-2.5 rounded-xl bg-white/10 text-white placeholder:text-white/30 border border-white/15 focus:outline-none focus:ring-1 focus:ring-white/30 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-white/80">Node Kind</label>
                  <select
                    value={node.kind}
                    onChange={(e) => onUpdate(node.id, { kind: e.target.value as WorkflowNodeKind })}
                    className="h-8 px-2 rounded-xl bg-white/10 text-white border border-white/15 focus:outline-none focus:ring-1 focus:ring-white/30 text-xs cursor-pointer"
                  >
                    {KINDS.map((k) => (
                      <option key={k.id} value={k.id} className="bg-neutral-900 text-white">
                        {k.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-white/80">Status</label>
                  <select
                    value={node.status}
                    onChange={(e) => onUpdate(node.id, { status: e.target.value as WorkflowNodeStatus })}
                    className="h-8 px-2 rounded-xl bg-white/10 text-white border border-white/15 focus:outline-none focus:ring-1 focus:ring-white/30 text-xs cursor-pointer"
                  >
                    {STATUSES.map((s) => (
                      <option key={s.id} value={s.id} className="bg-neutral-900 text-white">
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 shrink-0">
              <button
                type="button"
                onClick={() => onDelete(node.id)}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-xs font-medium transition-colors cursor-pointer"
              >
                <Trash2Icon className="w-3.5 h-3.5" />
                <span>Delete Node</span>
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  )
}

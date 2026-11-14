'use client'

import { memo, useState, useEffect } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import Avatar from 'boring-avatars'
import { CheckIcon, Trash2Icon, XIcon } from 'lucide-react'
import { WorkflowNodeKind, WorkflowNodeStatus } from '@/db/schema'

export interface WorkflowNodeData extends Record<string, unknown> {
  id: string
  workflowId: string
  kind: WorkflowNodeKind
  title: string
  subtitle: string
  phaseLabel?: string | null
  avatarSeed: string
  avatarPalette: string[]
  status: WorkflowNodeStatus
  onSaveNode?: (id: string, updates: Partial<WorkflowNodeData>) => void
  onDeleteNode?: (id: string) => void
  onCollapseNode?: () => void
  isExpanded?: boolean
}

const KIND_ACCENTS: Record<WorkflowNodeKind, { tag: string }> = {
  start: { tag: 'START' },
  step: { tag: 'STEP' },
  branch: { tag: 'BRANCH' },
  merge: { tag: 'MERGE' },
  end: { tag: 'END' },
}

const KINDS: { id: WorkflowNodeKind; label: string }[] = [
  { id: 'start', label: 'Start' },
  { id: 'step', label: 'Step' },
  { id: 'branch', label: 'Branch' },
  { id: 'merge', label: 'Merge' },
  { id: 'end', label: 'End' },
]

const STATUSES: { id: WorkflowNodeStatus; label: string }[] = [
  { id: 'todo', label: 'Todo' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'done', label: 'Done' },
]

export const WorkflowCustomNode = memo(function WorkflowCustomNode({
  data,
  selected,
}: NodeProps & { data: WorkflowNodeData }) {
  const [formTitle, setFormTitle] = useState(data.title)
  const [formSubtitle, setFormSubtitle] = useState(data.subtitle)
  const [formKind, setFormKind] = useState<WorkflowNodeKind>(data.kind)
  const [formStatus, setFormStatus] = useState<WorkflowNodeStatus>(data.status)

  const expanded = !!data.isExpanded

  useEffect(() => {
    setFormTitle(data.title)
    setFormSubtitle(data.subtitle)
    setFormKind(data.kind)
    setFormStatus(data.status)
  }, [data.title, data.subtitle, data.kind, data.status])

  const kindInfo = KIND_ACCENTS[data.kind] || KIND_ACCENTS.step

  const stopAll = (e: React.SyntheticEvent) => {
    e.stopPropagation()
  }

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (data.onSaveNode) {
      data.onSaveNode(data.id, {
        title: formTitle.trim() || 'Untitled',
        subtitle: formSubtitle,
        kind: formKind,
        status: formStatus,
      })
    }
    if (data.onCollapseNode) {
      data.onCollapseNode()
    }
  }

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation()
    setFormTitle(data.title)
    setFormSubtitle(data.subtitle)
    setFormKind(data.kind)
    setFormStatus(data.status)
    if (data.onCollapseNode) {
      data.onCollapseNode()
    }
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (data.onDeleteNode) {
      data.onDeleteNode(data.id)
    }
  }

  return (
    <div
      className={`group relative rounded-2xl bg-white/20 backdrop-blur-2xl p-3.5 select-none transition-[width,box-shadow] duration-300 ease-out ${
        selected ? 'w-[320px] shadow-2xl' : 'w-[240px] sm:w-[260px] shadow-none'
      }`}
    >
      {data.kind !== 'start' && (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-1.5 !h-1.5 !-left-0 !bg-white !border-0"
        />
      )}

      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
            <Avatar
              size={32}
              name={data.avatarSeed || 'node'}
              variant="marble"
              colors={data.avatarPalette && data.avatarPalette.length > 0 ? data.avatarPalette : undefined}
            />
          </div>

          <div className="min-w-0">
            <span className="text-[10px] tracking-wider uppercase text-white/50 block truncate leading-tight font-medium">
              {kindInfo.tag}
            </span>
            <h3 className="text-xs font-semibold text-white truncate leading-snug">
              {data.title || 'Untitled'}
            </h3>
          </div>
        </div>

        <div
          className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1`}
          title={data.status}
        />
      </div>

      {!expanded && data.subtitle && (
        <p className="mt-2 text-[11px] text-white/70 line-clamp-2 leading-relaxed">
          {data.subtitle}
        </p>
      )}

      <div
        onClick={stopAll}
        onDoubleClick={stopAll}
        onMouseDown={stopAll}
        onPointerDown={stopAll}
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
          expanded
            ? 'grid-rows-[1fr] opacity-100 mt-3.5 pt-3'
            : 'grid-rows-[0fr] opacity-0 pointer-events-none'
        }`}
      >
        <div className="overflow-hidden nodrag nopan">
          <div className="flex flex-col gap-2.5 text-xs">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-medium text-white/70 uppercase tracking-wider">
                Name
              </label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                className="h-7 px-2 rounded-lg bg-white/10 text-white placeholder:text-white/30 border-0 outline-none ring-0 focus:outline-none focus:ring-0 text-xs shadow-none"
                placeholder="Step title"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-medium text-white/70 uppercase tracking-wider">
                Description
              </label>
              <textarea
                rows={2}
                value={formSubtitle}
                onChange={(e) => setFormSubtitle(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                className="p-1.5 rounded-lg bg-white/10 text-white placeholder:text-white/30 border-0 outline-none ring-0 focus:outline-none focus:ring-0 text-xs resize-none shadow-none"
                placeholder="Description"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-medium text-white/70 uppercase tracking-wider">
                  Kind
                </label>
                <select
                  value={formKind}
                  onChange={(e) => setFormKind(e.target.value as WorkflowNodeKind)}
                  className="h-7 px-1.5 rounded-lg bg-white/10 text-white border-0 outline-none ring-0 focus:outline-none focus:ring-0 text-[11px] cursor-pointer shadow-none"
                >
                  {KINDS.map((k) => (
                    <option key={k.id} value={k.id} className="bg-neutral-900 text-white">
                      {k.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-medium text-white/70 uppercase tracking-wider">
                  Status
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as WorkflowNodeStatus)}
                  className="h-7 px-1.5 rounded-lg bg-white/10 text-white border-0 outline-none ring-0 focus:outline-none focus:ring-0 text-[11px] cursor-pointer shadow-none"
                >
                  {STATUSES.map((s) => (
                    <option key={s.id} value={s.id} className="bg-neutral-900 text-white">
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between gap-1.5 pt-2">
              <button
                type="button"
                onClick={handleDelete}
                className="p-1.5 rounded-lg bg-white/10 text-white border-0 outline-none ring-0 focus:outline-none focus:ring-0 cursor-pointer"
                title="Delete node"
              >
                <Trash2Icon className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 text-[11px] font-medium border-0 outline-none ring-0 focus:outline-none focus:ring-0 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <XIcon className="w-3 h-3" />
                  <span>Cancel</span>
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-2.5 py-1 rounded-lg bg-white text-black hover:bg-white/90 text-[11px] font-semibold border-0 outline-none ring-0 focus:outline-none focus:ring-0 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <CheckIcon className="w-3 h-3" />
                  <span>Save</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {data.kind !== 'end' && (
        <Handle
          type="source"
          position={Position.Right}
          className="!w-1.5 !h-1.5 !-right-0 !bg-white !border-0"
        />
      )}
    </div>
  )
})

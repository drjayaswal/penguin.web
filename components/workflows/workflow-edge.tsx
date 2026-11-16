'use client'

import { memo } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
} from '@xyflow/react'
import { PlusIcon } from 'lucide-react'

export interface WorkflowEdgeData {
  label?: string | null
  onAddNodeBetween?: (edgeId: string) => void
}

export const WorkflowCustomEdge = memo(function WorkflowCustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
  selected,
}: EdgeProps & { data?: WorkflowEdgeData }) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: selected ? '#2563EB' : '#A3A3A3',
          strokeWidth: selected ? 2.5 : 1.75,
        }}
      />

      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan flex items-center gap-1 group/edge"
        >
          {data?.label && (
            <span className="px-2 py-0.5 bg-white text-[10px] text-neutral-800 shadow-sm border-0">
              {data.label}
            </span>
          )}

          {data?.onAddNodeBetween && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                data.onAddNodeBetween?.(id)
              }}
              title="Add step between nodes"
              aria-label="Add step"
              className="w-5 h-5 bg-white hover:bg-blue-600 text-black hover:text-white flex items-center justify-center transition-all opacity-0 group-hover/edge:opacity-100 hover:scale-110 shadow-md cursor-pointer border-0 outline-none ring-0"
            >
              <PlusIcon className="w-3 h-3" />
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  )
})

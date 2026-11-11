'use client'

import { useEffect, useState } from 'react'
import {
  ChevronDownIcon,
  FileTextIcon,
  RefreshCwIcon,
  XIcon,
} from 'lucide-react'

export interface CommitDetailMetadata {
  id: number
  sha: string
  message: string
  authorName: string | null
  authorEmail: string | null
  authorLogin: string | null
  committedAt: string | Date
}

export interface CommitFileItem {
  id?: number
  filename: string
  status: string
  additions: number
  deletions: number
  patch: string | null
  previousFilename?: string | null
}

export interface AuthorColorStyle {
  bg: string
  text: string
  dot: string
}

interface CommitDetailPanelProps {
  commit: CommitDetailMetadata
  repoFullName: string
  files: CommitFileItem[]
  isLoading: boolean
  error: string | null
  isCached: boolean
  onClose: () => void
  getAuthorColor: (author: string) => AuthorColorStyle
}

function formatDateUtc(dateVal: string | Date) {
  const d = new Date(dateVal)
  if (Number.isNaN(d.getTime())) return ''
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`
}

export function CommitDetailPanel({
  commit,
  repoFullName,
  files,
  isLoading,
  error,
  isCached,
  onClose,
  getAuthorColor,
}: CommitDetailPanelProps) {
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set())

  useEffect(() => {
    setExpandedFiles(new Set())
  }, [commit.sha])

  const lines = (commit.message || '').split('\n')
  const title = lines[0] || '(no commit message)'
  const body = lines.slice(1).join('\n').trim()
  const author = commit.authorLogin
    ? `@${commit.authorLogin}`
    : commit.authorName || commit.authorEmail || 'Unknown'
  const authorColor = getAuthorColor(author)

  const totalAdditions = files.reduce((sum, f) => sum + (f.additions || 0), 0)
  const totalDeletions = files.reduce((sum, f) => sum + (f.deletions || 0), 0)

  function toggleFile(filename: string) {
    setExpandedFiles((prev) => {
      const next = new Set(prev)
      if (next.has(filename)) {
        next.delete(filename)
      } else {
        next.add(filename)
      }
      return next
    })
  }

  return (
    <div className="flex flex-col rounded-2xl bg-white border border-gray-200/75 shadow-sm overflow-hidden lg:max-h-[calc(100vh-7.5rem)]">
      <div className="p-3.5 px-4 bg-white border-b border-neutral-100 shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono text-[11px] bg-blue-600/10 text-blue-600 font-medium px-1.5 py-0.5 rounded shrink-0">
              {commit.sha.slice(0, 7)}
            </span>
            <span className="text-xs font-medium text-neutral-500 truncate">
              {repoFullName}
            </span>
            {!isLoading && isCached && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 shrink-0">
                cached
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close commit details"
            className="text-neutral-400 hover:text-black p-1 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer shrink-0"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        <h2 className="text-sm font-semibold text-black leading-snug break-words mt-2 select-text">
          {title}
        </h2>

        {body && (
          <p className="text-xs text-neutral-600 whitespace-pre-wrap mt-1.5 leading-relaxed break-words select-text max-h-24 overflow-y-auto overscroll-contain">
            {body}
          </p>
        )}

        <div className="flex items-center flex-wrap gap-2 mt-2.5 text-[11px] text-neutral-500">
          <span
            className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-md ${authorColor.bg} ${authorColor.text} shrink-0`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${authorColor.dot} shrink-0`} />
            <span>{author}</span>
          </span>
          <span>•</span>
          <span suppressHydrationWarning>{formatDateUtc(commit.committedAt)}</span>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col bg-neutral-50/50 shadow-inner p-4">
        <div className="flex items-center justify-between gap-2 pb-2 mb-3 border-b border-neutral-200/70 shrink-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-600">
            <FileTextIcon className="w-3.5 h-3.5" />
            <span>
              {isLoading
                ? 'Loading...'
                : `Changed Files (${files.length})`}
            </span>
          </div>
          {!isLoading && !error && (
            <div className="flex items-center gap-2 font-mono text-xs font-medium shrink-0">
              <span className="text-green-600">+{totalAdditions}</span>
              <span className="text-red-600">-{totalDeletions}</span>
            </div>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1">
          {isLoading ? (
            <div className="py-12 flex items-center justify-center gap-2 text-xs text-neutral-600">
              <RefreshCwIcon className="w-4 h-4 animate-spin text-neutral-700" />
              <span>Fetching commit details...</span>
            </div>
          ) : error ? (
            <div className="border border-dashed border-black/25 bg-white rounded-xl p-4 text-xs text-neutral-800">
              {error}
            </div>
          ) : files.length === 0 ? (
            <p className="text-xs text-neutral-500 py-8 text-center">
              No changed files found for this commit.
            </p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {files.map((file) => {
                const isExpanded = expandedFiles.has(file.filename)
                const displayFilename =
                  file.status === 'renamed' && file.previousFilename
                    ? `${file.previousFilename} → ${file.filename}`
                    : file.filename

                let statusBadgeClass = 'bg-neutral-100 text-neutral-600'
                if (file.status === 'added') {
                  statusBadgeClass = 'bg-green-600/10 text-green-600'
                } else if (file.status === 'removed') {
                  statusBadgeClass = 'bg-red-600/10 text-red-600'
                }

                return (
                  <li
                    key={file.filename}
                    className="rounded-xl bg-white border border-gray-200/75 shadow-sm overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => toggleFile(file.filename)}
                      aria-expanded={isExpanded}
                      className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left text-xs transition-colors hover:bg-neutral-50/70 cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <ChevronDownIcon
                          className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-300 motion-reduce:transition-none shrink-0 ${
                            isExpanded ? 'rotate-180 text-neutral-700' : ''
                          }`}
                        />
                        <FileTextIcon className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                        <span
                          className="font-mono text-xs text-neutral-900 font-medium truncate"
                          title={displayFilename}
                        >
                          {displayFilename}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${statusBadgeClass}`}
                        >
                          {file.status}
                        </span>
                        <div className="flex items-center gap-1.5 font-mono text-[11px] font-medium">
                          <span className="text-green-600">+{file.additions}</span>
                          <span className="text-red-600">-{file.deletions}</span>
                        </div>
                      </div>
                    </button>

                    <div
                      aria-hidden={!isExpanded}
                      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out motion-reduce:transition-none ${
                        isExpanded
                          ? 'grid-rows-[1fr] opacity-100'
                          : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                      }`}
                    >
                      <div className="min-h-0 overflow-hidden">
                        <div className="border-t border-neutral-100 bg-neutral-50/70 p-2.5">
                          {file.patch === null || file.patch === undefined ? (
                            <p className="text-xs text-neutral-500 font-mono py-2 px-1">
                              Binary file or patch not available.
                            </p>
                          ) : (
                            <pre
                              tabIndex={isExpanded ? 0 : -1}
                              className="p-2 bg-white border border-neutral-200/75 rounded-lg overflow-auto max-h-[340px] overscroll-contain text-[11px] leading-relaxed font-mono select-text"
                            >
                              {file.patch.split('\n').map((line, idx) => {
                                let lineClass = 'text-neutral-800'
                                if (line.startsWith('+') && !line.startsWith('+++')) {
                                  lineClass = 'bg-green-600/10 text-green-600'
                                } else if (line.startsWith('-') && !line.startsWith('---')) {
                                  lineClass = 'bg-red-600/10 text-red-600'
                                } else if (line.startsWith('@@')) {
                                  lineClass = 'bg-neutral-100 text-neutral-500'
                                }
                                return (
                                  <div key={idx} className={`px-2 whitespace-pre ${lineClass}`}>
                                    {line || ' '}
                                  </div>
                                )
                              })}
                            </pre>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

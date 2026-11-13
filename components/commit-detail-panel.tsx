'use client'

import { ReactNode, useEffect, useState } from 'react'
import {
  ChevronDownIcon,
  FileTextIcon,
  RefreshCwIcon,
  SparklesIcon,
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

export interface CommitSummaryData {
  text: string
  provider: string
  model: string
  cached: boolean
  truncated: boolean
  usedDefaultKey: boolean
}

export interface CommitSummaryError {
  message: string
  isRateLimit?: boolean
  resetsAt?: string
}

interface CommitDetailPanelProps {
  commit: CommitDetailMetadata
  repoFullName: string
  files: CommitFileItem[]
  isLoading: boolean
  error: string | null
  isCached: boolean
  summary: CommitSummaryData | null
  isSummarizing: boolean
  summaryError: CommitSummaryError | null
  onSummarize: () => void
  onClose: () => void
  getAuthorColor: (author: string) => AuthorColorStyle
}

function formatDateUtc(dateVal: string | Date) {
  const d = new Date(dateVal)
  if (Number.isNaN(d.getTime())) return ''
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`
}

function renderInlineMarkdown(text: string, keyPrefix: string): ReactNode[] {
  const elements: ReactNode[] = []
  const tokenRegex = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      elements.push(text.slice(lastIndex, match.index))
    }
    const token = match[0]
    if (token.startsWith('**') && token.endsWith('**')) {
      const inner = token.slice(2, -2)
      elements.push(
        <strong key={`${keyPrefix}-bold-${match.index}`} className="font-semibold text-white">
          {inner}
        </strong>,
      )
    } else if (token.startsWith('`') && token.endsWith('`')) {
      const inner = token.slice(1, -1)
      elements.push(
        <code
          key={`${keyPrefix}-code-${match.index}`}
          className="font-mono text-[11px] bg-white/20 text-white border border-white/20 px-1.5 py-0.5 rounded"
        >
          {inner}
        </code>,
      )
    } else if (token.startsWith('*') && token.endsWith('*')) {
      const inner = token.slice(1, -1)
      elements.push(
        <em key={`${keyPrefix}-italic-${match.index}`} className="italic text-white/80">
          {inner}
        </em>,
      )
    } else if (token.startsWith('[')) {
      const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token)
      if (linkMatch) {
        elements.push(
          <a
            key={`${keyPrefix}-link-${match.index}`}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline"
          >
            {linkMatch[1]}
          </a>,
        )
      } else {
        elements.push(token)
      }
    }
    lastIndex = tokenRegex.lastIndex
  }

  if (lastIndex < text.length) {
    elements.push(text.slice(lastIndex))
  }

  return elements.length > 0 ? elements : [text]
}

function parseTableRow(line: string): string[] {
  let trimmed = line.trim()
  if (trimmed.startsWith('|')) trimmed = trimmed.slice(1)
  if (trimmed.endsWith('|')) trimmed = trimmed.slice(0, -1)
  return trimmed.split('|').map((col) => col.trim())
}

function isTableDelimiter(line: string): boolean {
  const trimmed = line.trim()
  return /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)+\|?\s*$/.test(trimmed)
}

function MarkdownViewer({ content }: { content: string }) {
  const lines = content.split('\n')
  const blocks: ReactNode[] = []
  let inCodeBlock = false
  let codeBuffer: string[] = []
  let listBuffer: { type: 'ul' | 'ol'; items: { text: string; num?: string }[] } | null = null

  function flushList(key: number) {
    if (!listBuffer) return
    const current = listBuffer
    listBuffer = null
    if (current.type === 'ul') {
      blocks.push(
        <ul key={`ul-${key}`} className="my-1.5 space-y-1 pl-0.5">
          {current.items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-xs text-white/90 leading-relaxed">
              <span className="w-1.5 h-1.5 rounded-full bg-white/60 mt-1.5 shrink-0" />
              <div className="flex-1 min-w-0">{renderInlineMarkdown(item.text, `ul-${key}-${idx}`)}</div>
            </li>
          ))}
        </ul>,
      )
    } else {
      blocks.push(
        <ol key={`ol-${key}`} className="my-1.5 space-y-1 pl-0.5">
          {current.items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-1.5 text-xs text-white/90 leading-relaxed">
              <span className="font-mono text-[10px] text-white/60 shrink-0 mt-0.5 font-medium">
                {item.num || `${idx + 1}`}.
              </span>
              <div className="flex-1 min-w-0">{renderInlineMarkdown(item.text, `ol-${key}-${idx}`)}</div>
            </li>
          ))}
        </ol>,
      )
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]
    const trimmed = rawLine.trim()

    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        blocks.push(
          <div key={`codeblock-${i}`} className="my-2 rounded-xl bg-black/40 backdrop-blur-sm border border-white/10 text-white/90 p-2.5 font-mono text-[11px] overflow-x-auto leading-relaxed">
            <pre className="whitespace-pre">{codeBuffer.join('\n')}</pre>
          </div>,
        )
        codeBuffer = []
        inCodeBlock = false
      } else {
        flushList(i)
        inCodeBlock = true
        codeBuffer = []
      }
      continue
    }

    if (inCodeBlock) {
      codeBuffer.push(rawLine)
      continue
    }

    if (!trimmed) {
      flushList(i)
      continue
    }

    if (trimmed.includes('|') && i + 1 < lines.length && isTableDelimiter(lines[i + 1])) {
      flushList(i)
      const headers = parseTableRow(trimmed)
      i += 1
      const rows: string[][] = []
      while (i + 1 < lines.length && lines[i + 1].trim().includes('|') && !isTableDelimiter(lines[i + 1])) {
        i += 1
        rows.push(parseTableRow(lines[i]))
      }

      blocks.push(
        <div key={`table-${i}`} className="my-2.5 overflow-x-auto rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-white/20 bg-white/15">
                {headers.map((h, colIdx) => (
                  <th
                    key={colIdx}
                    className="px-3 py-2 font-semibold text-white text-[11px]"
                  >
                    {renderInlineMarkdown(h, `th-${i}-${colIdx}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {rows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-white/10 transition-colors">
                  {headers.map((_, colIdx) => (
                    <td key={colIdx} className="px-3 py-2 text-white/90 text-xs">
                      {renderInlineMarkdown(row[colIdx] || '', `td-${i}-${rIdx}-${colIdx}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      )
      continue
    }

    if (trimmed.startsWith('### ')) {
      flushList(i)
      blocks.push(
        <h4 key={`h3-${i}`} className="text-xs font-semibold text-white/80 mt-2 mb-1 flex items-center gap-1.5">
          <span className="min-w-0">{renderInlineMarkdown(trimmed.slice(4), `h3-${i}`)}</span>
        </h4>,
      )
      continue
    }

    if (trimmed.startsWith('## ')) {
      flushList(i)
      blocks.push(
        <h3 key={`h2-${i}`} className="text-xs font-semibold text-white mt-2.5 mb-1 pb-1 border-b border-white/20 flex items-center gap-1.5">
          <span className="min-w-0">{renderInlineMarkdown(trimmed.slice(3), `h2-${i}`)}</span>
        </h3>,
      )
      continue
    }

    if (trimmed.startsWith('# ')) {
      flushList(i)
      blocks.push(
        <h2 key={`h1-${i}`} className="text-sm font-semibold text-white mt-3 mb-1.5 pb-1 border-b border-white/20 flex items-center gap-1.5">
          <span className="min-w-0">{renderInlineMarkdown(trimmed.slice(2), `h1-${i}`)}</span>
        </h2>,
      )
      continue
    }

    const ulMatch = /^[-*]\s+(.*)$/.exec(trimmed)
    if (ulMatch) {
      if (listBuffer && listBuffer.type !== 'ul') {
        flushList(i)
      }
      if (!listBuffer) {
        listBuffer = { type: 'ul', items: [] }
      }
      listBuffer.items.push({ text: ulMatch[1] })
      continue
    }

    const olMatch = /^(\d+)\.\s+(.*)$/.exec(trimmed)
    if (olMatch) {
      if (listBuffer && listBuffer.type !== 'ol') {
        flushList(i)
      }
      if (!listBuffer) {
        listBuffer = { type: 'ol', items: [] }
      }
      listBuffer.items.push({ text: olMatch[2], num: olMatch[1] })
      continue
    }

    if (trimmed.startsWith('> ')) {
      flushList(i)
      blocks.push(
        <blockquote key={`quote-${i}`} className="my-1.5 pl-2.5 border-l-2 border-white/40 text-xs italic text-white/70">
          {renderInlineMarkdown(trimmed.slice(2), `quote-${i}`)}
        </blockquote>,
      )
      continue
    }

    flushList(i)
    blocks.push(
      <p key={`p-${i}`} className="text-xs text-white/90 leading-relaxed my-1">
        {renderInlineMarkdown(trimmed, `p-${i}`)}
      </p>,
    )
  }

  flushList(lines.length)

  if (inCodeBlock && codeBuffer.length > 0) {
    blocks.push(
      <div key="trailing-code" className="my-2 rounded-xl bg-black/40 backdrop-blur-sm border border-white/10 text-white/90 p-2.5 font-mono text-[11px] overflow-x-auto leading-relaxed">
        <pre className="whitespace-pre">{codeBuffer.join('\n')}</pre>
      </div>,
    )
  }

  return <div className="space-y-1">{blocks}</div>
}

export function CommitDetailPanel({
  commit,
  repoFullName,
  files,
  isLoading,
  error,
  isCached,
  summary,
  isSummarizing,
  summaryError,
  onSummarize,
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
    <div className="flex flex-col rounded-2xl backdrop-blur-md shadow-xl overflow-hidden lg:max-h-[calc(100vh-7.5rem)]">
      <div className="p-3.5 px-4 bg-white/10 backdrop-blur-sm border-b border-white/20 shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono text-[11px] bg-white/20 text-white font-medium px-1.5 py-0.5 rounded shrink-0">
              {commit.sha.slice(0, 7)}
            </span>
            <span className="text-xs font-medium text-white/70 truncate">
              {repoFullName}
            </span>
            {!isLoading && isCached && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-white/20 text-white shrink-0">
                cached
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close commit details"
            className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        <h2 className="text-sm font-semibold text-white leading-snug break-words mt-2 select-text">
          {title}
        </h2>

        {body && (
          <p className="text-xs text-white/80 whitespace-pre-wrap mt-1.5 leading-relaxed break-words select-text max-h-24 overflow-y-auto overscroll-contain">
            {body}
          </p>
        )}

        <div className="flex items-center justify-between gap-2 mt-2.5">
          <div className="flex items-center flex-wrap gap-2 text-[11px] text-white/70">
            <span
              className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-md bg-white/20 text-white shrink-0`}
            >
              <span>{author}</span>
            </span>
            <span>•</span>
            <span suppressHydrationWarning>{formatDateUtc(commit.committedAt)}</span>
          </div>

          <button
            type="button"
            onClick={onSummarize}
            disabled={isSummarizing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 group rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer shrink-0"
          >
            {isSummarizing ? (
              <RefreshCwIcon className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <SparklesIcon className="w-5 h-5 text-blue-600 fill-white group-hover:text-blue-700 transition-all duration-200 group-active:animate-ping" />
            )}
            <span>{isSummarizing ? 'Summarizing...' : 'Summarize'}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col p-4">
        <div className="flex items-center justify-between gap-2 pb-2 p-2 mb-3 shrink-0">
          <div className="flex items-center gap-1.5 text-sm font-medium text-white">
            <FileTextIcon className="w-3.5 h-3.5" />
            <span>
              {isLoading
                ? 'Loading...'
                : `Changed Files (${files.length})`}
            </span>
          </div>
          {!isLoading && !error && (
            <div className="flex items-center gap-2 font-mono text-xs font-medium shrink-0">
              <span className="bg-green-600 text-white px-2 py-0.5 rounded-md">+{totalAdditions}</span>
              <span className="bg-red-600 text-white px-2 py-0.5 rounded-md">-{totalDeletions}</span>
            </div>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1">
          {summaryError && (
            <div
              role="alert"
              className={`mb-3 rounded-xl p-3 text-xs bg-white/10 backdrop-blur-sm text-white ${summaryError.isRateLimit
                ? 'border border-red-400/50 text-white shadow-sm'
                : 'border border-dashed border-white/20 text-white/90'
                }`}
            >
              {summaryError.isRateLimit && (
                <p className="font-semibold text-red-300 mb-0.5">Daily limit reached</p>
              )}
              <p className="leading-relaxed">{summaryError.message}</p>
            </div>
          )}

          {summary && (
            <div className="mb-3 rounded-xl bg-white/10 backdrop-blur-sm p-3.5 shadow-sm text-white">
              <div className="flex items-center justify-between gap-2 pb-2 mb-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                  <SparklesIcon className="w-5 h-5 text-white fill-blue-600 shrink-0" />
                  <span>AI Summary</span>
                </div>
                <div className="flex items-center flex-wrap gap-1.5 shrink-0">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/20 text-white">
                    {summary.provider} · {summary.model === 'llama-3.3-70b-versatile' || summary.model.toLowerCase() === 'penguin' ? 'Penguin' : summary.model}
                  </span>
                  {summary.cached && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-white/20 text-white/90">
                      cached
                    </span>
                  )}
                  {summary.truncated && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200">
                      truncated
                    </span>
                  )}
                </div>
              </div>
              <div className="select-text text-white">
                <MarkdownViewer content={summary.text} />
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="py-12 flex items-center justify-center gap-2 text-xs text-white/70">
              <RefreshCwIcon className="w-4 h-4 animate-spin text-white/80" />
              <span>Fetching commit details...</span>
            </div>
          ) : error ? (
            <div className="border border-dashed border-white/20 bg-white/10 backdrop-blur-sm rounded-xl p-4 text-xs text-white">
              {error}
            </div>
          ) : files.length === 0 ? (
            <p className="text-xs text-white/60 py-8 text-center">
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

                let statusBadgeClass = 'bg-white/10 text-white'
                if (file.status === 'added') {
                  statusBadgeClass = 'bg-green-600/10 text-green-600'
                } else if (file.status === 'removed') {
                  statusBadgeClass = 'bg-red-600/10 text-red-600'
                }

                return (
                  <li
                    key={file.filename}
                    className="rounded-xl shadow-xs overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => toggleFile(file.filename)}
                      aria-expanded={isExpanded}
                      className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left text-xs transition-colors bg-white/10 backdrop-blur-sm cursor-pointer hover:bg-white/20"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <ChevronDownIcon
                          className={`w-3.5 h-3.5 text-white/70 transition-transform duration-300 motion-reduce:transition-none shrink-0 ${isExpanded ? 'rotate-180 text-white' : ''
                            }`}
                        />
                        <FileTextIcon className="w-3.5 h-3.5  text-white/70 shrink-0" />
                        <span
                          className="font-mono text-xs text-white font-medium truncate"
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
                      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out motion-reduce:transition-none ${isExpanded
                        ? 'grid-rows-[1fr] opacity-100'
                        : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                        }`}
                    >
                      <div className="min-h-0 overflow-hidden">
                        <div className="bg-white/10 backdrop-blur-sm p-2.5">
                          {file.patch === null || file.patch === undefined ? (
                            <p className="text-xs text-white/60 font-mono py-2 px-1">
                              Binary file or patch not available.
                            </p>
                          ) : (
                            <pre
                              tabIndex={isExpanded ? 0 : -1}
                              className="p-2 bg-white/10 backdrop-blur-md rounded-b-[10px] overflow-auto max-h-[340px] overscroll-contain text-[11px] leading-relaxed font-mono select-text text-white/90 border border-white/10"
                            >
                              {file.patch.split('\n').map((line, idx) => {
                                let lineClass = 'text-white'
                                if (line.startsWith('+') && !line.startsWith('+++')) {
                                  lineClass = 'bg-green-600/50 text-white'
                                } else if (line.startsWith('-') && !line.startsWith('---')) {
                                  lineClass = 'bg-red-600/50 text-white'
                                } else if (line.startsWith('@@')) {
                                  lineClass = 'bg-blue-600/50 text-white'
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

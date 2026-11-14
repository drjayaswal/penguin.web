'use client'

import { ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import {
  CheckIcon,
  ChevronDownIcon,
  GitBranchIcon,
  GlobeIcon,
  LockIcon,
  RefreshCwIcon,
} from 'lucide-react'
import Link from 'next/link'
import { AiProviderId } from '@/lib/ai/providers'
import { AiSettingsSheet, AiSettingsState, AiUsageState } from './ai-settings-card'
import {
  AuthorColorStyle,
  CommitDetailPanel,
  CommitFileItem,
  CommitSummaryData,
  CommitSummaryError,
} from './commit-detail-panel'

export interface CommitItem {
  id: number
  sha: string
  message: string
  authorName: string | null
  authorEmail: string | null
  authorLogin: string | null
  committedAt: string | Date
}

export interface RepoCommitsCardProps {
  repo: {
    id: number
    repoId: number
    fullName: string
    isPrivate: boolean
  }
  initialCommits?: CommitItem[]
  isOpen?: boolean
  onToggle?: () => void
  selectedCommitKey?: string | null
  onSelectCommit?: (commit: CommitItem, repo: { repoId: number; fullName: string }) => void
}

const AUTHOR_PALETTES: AuthorColorStyle[] = [
  { bg: 'bg-blue-500/20', text: 'text-blue-300', dot: 'bg-blue-400' },
  { bg: 'bg-purple-500/20', text: 'text-purple-300', dot: 'bg-purple-400' },
  { bg: 'bg-emerald-500/20', text: 'text-emerald-300', dot: 'bg-emerald-400' },
  { bg: 'bg-amber-500/20', text: 'text-amber-300', dot: 'bg-amber-400' },
  { bg: 'bg-rose-500/20', text: 'text-rose-300', dot: 'bg-rose-400' },
  { bg: 'bg-indigo-500/20', text: 'text-indigo-300', dot: 'bg-indigo-400' },
  { bg: 'bg-teal-500/20', text: 'text-teal-300', dot: 'bg-teal-400' },
  { bg: 'bg-cyan-500/20', text: 'text-cyan-300', dot: 'bg-cyan-400' },
  { bg: 'bg-orange-500/20', text: 'text-orange-300', dot: 'bg-orange-400' },
  { bg: 'bg-fuchsia-500/20', text: 'text-fuchsia-300', dot: 'bg-fuchsia-400' },
  { bg: 'bg-lime-500/20', text: 'text-lime-300', dot: 'bg-lime-400' },
  { bg: 'bg-sky-500/20', text: 'text-sky-300', dot: 'bg-sky-400' },
]

export function getAuthorColor(author: string): AuthorColorStyle {
  let hash = 0
  for (let i = 0; i < author.length; i++) {
    hash = (hash << 5) - hash + author.charCodeAt(i)
    hash |= 0
  }
  const index = Math.abs(hash) % AUTHOR_PALETTES.length
  return AUTHOR_PALETTES[index]
}

function AuthorSelect({
  authors,
  commitsList,
  selectedAuthor,
  onSelect,
}: {
  authors: string[]
  commitsList: CommitItem[]
  selectedAuthor: string
  onSelect: (author: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    function handlePointerDown(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKey)
    }
  }, [isOpen])

  const selectedCount =
    selectedAuthor === 'all'
      ? commitsList.length
      : commitsList.filter((c) => {
        const a = c.authorLogin ? `@${c.authorLogin}` : c.authorName || c.authorEmail || 'Unknown'
        return a === selectedAuthor
      }).length

  const selectedLabel = selectedAuthor === 'all' ? 'All' : selectedAuthor

  return (
    <div className="relative" ref={dropdownRef} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-between gap-2 px-2.5 py-1 text-xs font-medium rounded-lg bg-white/10 backdrop-blur-md text-white shadow-xs transition-all cursor-pointer"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="truncate max-w-[130px] sm:max-w-[160px]">{selectedLabel}</span>
        <span className="text-[11px] text-white/60">({selectedCount})</span>
        <ChevronDownIcon
          className={`w-3.5 h-3.5 text-white/70 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-white' : ''
            }`}
        />
      </button>

      {isOpen && (
        <ul
          role="listbox"
          className="absolute right-0 top-full z-[100] mt-1 overflow-hidden rounded-xl bg-white shadow-2xl py-1 min-w-[150px] max-w-[calc(100vw-3rem)] sm:max-w-[260px] max-h-56 overflow-y-auto"
        >
          {selectedAuthor !== 'all' && (
            <li role="option" aria-selected={false}>
              <button
                type="button"
                onClick={() => {
                  onSelect('all')
                  setIsOpen(false)
                }}
                className="w-full flex items-center justify-between px-3 py-2 text-xs text-left cursor-pointer transition-colors text-black/90 hover:bg-blue-600/15 hover:text-blue-600"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="truncate">All</span>
                  <span className="text-[11px] shrink-0 text-neutral-500">
                    ({commitsList.length})
                  </span>
                </div>
              </button>
            </li>
          )}

          {authors
            .filter((author) => author !== selectedAuthor)
            .map((author) => {
              const count = commitsList.filter((c) => {
                const a = c.authorLogin ? `@${c.authorLogin}` : c.authorName || c.authorEmail || 'Unknown'
                return a === author
              }).length

              return (
                <li key={author} role="option" aria-selected={false}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(author)
                      setIsOpen(false)
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs text-left cursor-pointer transition-colors text-black/90 hover:bg-blue-600/15 hover:text-blue-600"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="truncate">{author}</span>
                      <span className="text-[11px] shrink-0 text-neutral-500">
                        ({count})
                      </span>
                    </div>
                  </button>
                </li>
              )
            })}
        </ul>
      )}
    </div>
  )
}

export function RepoCommitsCard({
  repo,
  initialCommits = [],
  isOpen: controlledIsOpen,
  onToggle: controlledOnToggle,
  selectedCommitKey,
  onSelectCommit,
}: RepoCommitsCardProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen

  function toggleOpen() {
    if (controlledOnToggle) {
      controlledOnToggle()
    } else {
      setInternalIsOpen(!internalIsOpen)
    }
  }

  const [commitsList, setCommitsList] = useState<CommitItem[]>(initialCommits)
  const [isSyncing, setIsSyncing] = useState(false)
  const [selectedAuthor, setSelectedAuthor] = useState<string>('all')

  async function handleSync(e: React.MouseEvent) {
    e.stopPropagation()
    setIsSyncing(true)

    try {
      const syncRes = await fetch(`/api/repos/${repo.repoId}/sync`, {
        method: 'POST',
      })

      if (syncRes.ok) {
        const commitsRes = await fetch(`/api/repos/${repo.repoId}/commits?limit=50`)
        if (commitsRes.ok) {
          const commitsData = await commitsRes.json()
          setCommitsList(commitsData.commits ?? [])
        }
      }
    } catch {
    } finally {
      setIsSyncing(false)
    }
  }

  function formatCommitDate(dateVal: string | Date) {
    const d = new Date(dateVal)
    if (Number.isNaN(d.getTime())) return ''
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`
  }

  const authors = Array.from(
    new Set(
      commitsList.map((c) =>
        c.authorLogin ? `@${c.authorLogin}` : c.authorName || c.authorEmail || 'Unknown'
      )
    )
  ).sort()

  const filteredCommits =
    selectedAuthor !== 'all'
      ? commitsList.filter((c) => {
        const a = c.authorLogin ? `@${c.authorLogin}` : c.authorName || c.authorEmail || 'Unknown'
        return a === selectedAuthor
      })
      : commitsList

  return (
    <div className="flex flex-col rounded-2xl backdrop-blur-md shadow-lg overflow-hidden transition-all duration-200">
      <div
        onClick={toggleOpen}
        className="flex items-center justify-between gap-3 p-3 px-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm cursor-pointer select-none transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <ChevronDownIcon
            className={`w-4 h-4 text-white/70 transition-transform duration-300 motion-reduce:transition-none shrink-0 ${isOpen ? 'rotate-180 text-white' : ''
              }`}
          />
          {repo.isPrivate ? (
            <LockIcon className="h-4 w-4 shrink-0 text-white/70" aria-label="Private repository" />
          ) : (
            <GlobeIcon className="h-4 w-4 shrink-0 text-white/70" aria-label="Public repository" />
          )}
          <Link
            href={`https://github.com/${repo.fullName}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-sm font-semibold truncate text-white hover:text-blue-400 transition-colors"
          >
            {repo.fullName.split('/')[1] || repo.fullName}
          </Link>
        </div>

        <button
          type="button"
          onClick={handleSync}
          disabled={isSyncing}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 transition-colors cursor-pointer shrink-0"
        >
          <RefreshCwIcon className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing...' : 'Sync'}
        </button>
      </div>

      <div
        className={`transition-all duration-300 ease-in-out motion-reduce:transition-none overflow-hidden ${isOpen ? 'max-h-[460px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
          }`}
      >
        <div className="h-[360px] flex flex-col bg-white/10 backdrop-blur-sm p-4">
          <div className="flex sm:items-center justify-between gap-2 pb-2 mb-2 border-b border-white/20 shrink-0">
            <div className="flex items-center gap-1.5 text-xs font-medium text-white/80">
              <GitBranchIcon className="w-3.5 h-3.5" />
              <span>Commits</span>
              <span className="text-[11px] text-white/60">
                {filteredCommits.length}
              </span>
            </div>

            {authors.length > 0 && (
              <div className="flex items-center gap-1.5">
                <AuthorSelect
                  authors={authors}
                  commitsList={commitsList}
                  selectedAuthor={selectedAuthor}
                  onSelect={setSelectedAuthor}
                />
              </div>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1">
            {commitsList.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-xs text-white/60 py-3 text-center">
                  No commits synced yet. Click &quot;Sync&quot; to import commit history.
                </p>
              </div>
            ) : filteredCommits.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-xs text-white/60 py-3 text-center">
                  No commits found for the selected author.
                </p>
              </div>
            ) : (
              <ul className="flex flex-col divide-y divide-white/10">
                {filteredCommits.map((commit) => {
                  const firstLine = (commit.message || '').split('\n')[0]
                  const author =
                    commit.authorLogin ? `@${commit.authorLogin}` : commit.authorName || commit.authorEmail || 'Unknown'
                  const isSelected = selectedCommitKey === `${repo.repoId}:${commit.sha}`

                  return (
                    <li key={commit.sha}>
                      <button
                        type="button"
                        onClick={() =>
                          onSelectCommit?.(commit, { repoId: repo.repoId, fullName: repo.fullName })
                        }
                        className={`w-full py-2.5 px-2 flex items-baseline justify-between gap-3 text-xs text-left transition-colors cursor-pointer ${isSelected ? 'bg-white/30' : 'hover:bg-white/10'
                          }`}
                      >
                        <div className="flex items-baseline gap-2 min-w-0">
                          <span className="text-[11px] text-white bg-white/20 font-bold px-1.5 py-0.5 rounded shrink-0">
                            {commit.sha.slice(0, 7)}
                          </span>
                          <span className="text-white font-medium truncate" title={commit.message}>
                            {firstLine}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 text-white/70 text-[11px]">
                          <span className="truncate max-w-[90px] sm:max-w-[120px] text-white bg-white/20 px-2 py-0.5 rounded-md">{author}</span>
                          <span suppressHydrationWarning>{formatCommitDate(commit.committedAt)}</span>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

interface SelectedCommitEntry {
  commit: CommitItem
  repoId: number
  repoFullName: string
}

export function RepoCommitsList({
  repos,
  title = 'Repositories',
  description = 'Connected repositories and GitHub access',
  error,
  connectAction,
  aiConfig,
}: {
  repos: Array<{
    id: number
    repoId: number
    fullName: string
    isPrivate: boolean
    initialCommits: CommitItem[]
  }>
  title?: string
  description?: string
  error?: string | null
  connectAction?: ReactNode
  aiConfig: {
    initialSettings: AiSettingsState
    initialUsage: AiUsageState
    defaultProviderId: AiProviderId
    defaultProviderLabel: string
    defaultModel: string
  }
}) {
  const [openRepoId, setOpenRepoId] = useState<number | null>(null)
  const [selectedEntry, setSelectedEntry] = useState<SelectedCommitEntry | null>(null)
  const [shouldMountPanel, setShouldMountPanel] = useState(false)
  const [isPanelExpanded, setIsPanelExpanded] = useState(false)
  const [detailFiles, setDetailFiles] = useState<CommitFileItem[]>([])
  const [isLoadingFiles, setIsLoadingFiles] = useState(false)
  const [filesError, setFilesError] = useState<string | null>(null)
  const [isDetailCached, setIsDetailCached] = useState(false)

  const [usage, setUsage] = useState<AiUsageState>(aiConfig.initialUsage)
  const [summary, setSummary] = useState<CommitSummaryData | null>(null)
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [summaryError, setSummaryError] = useState<CommitSummaryError | null>(null)

  const activeCommitKeyRef = useRef<string | null>(null)
  const activeSummaryKeyRef = useRef<string | null>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const openFrameRef = useRef<number | null>(null)
  const panelRef = useRef<HTMLElement>(null)

  function clearPendingTimers() {
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    if (openFrameRef.current !== null) {
      cancelAnimationFrame(openFrameRef.current)
      openFrameRef.current = null
    }
  }

  useEffect(() => {
    return () => clearPendingTimers()
  }, [])

  const handleCloseCommit = useCallback(() => {
    clearPendingTimers()
    activeCommitKeyRef.current = null
    activeSummaryKeyRef.current = null
    setIsSummarizing(false)
    setSummary(null)
    setSummaryError(null)
    setIsPanelExpanded(false)
    closeTimerRef.current = setTimeout(() => {
      setShouldMountPanel(false)
      setSelectedEntry(null)
      closeTimerRef.current = null
    }, 300)
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        handleCloseCommit()
      }
    }
    if (shouldMountPanel) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shouldMountPanel, handleCloseCommit])

  function handleToggle(repoId: number) {
    setOpenRepoId((current) => (current === repoId ? null : repoId))
  }

  async function handleSelectCommit(
    commit: CommitItem,
    repo: { repoId: number; fullName: string },
  ) {
    const commitKey = `${repo.repoId}:${commit.sha}`
    if (activeCommitKeyRef.current === commitKey && isPanelExpanded) {
      handleCloseCommit()
      return
    }

    clearPendingTimers()
    activeCommitKeyRef.current = commitKey
    activeSummaryKeyRef.current = null
    setSelectedEntry({ commit, repoId: repo.repoId, repoFullName: repo.fullName })
    setDetailFiles([])
    setFilesError(null)
    setIsDetailCached(false)
    setIsLoadingFiles(true)
    setSummary(null)
    setSummaryError(null)
    setIsSummarizing(false)

    if (!shouldMountPanel) {
      setShouldMountPanel(true)
      openFrameRef.current = requestAnimationFrame(() => {
        openFrameRef.current = requestAnimationFrame(() => {
          setIsPanelExpanded(true)
          openFrameRef.current = null
          if (typeof window !== 'undefined' && window.innerWidth < 1024) {
            panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
          }
        })
      })
    } else {
      setIsPanelExpanded(true)
      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
        panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }

    try {
      const res = await fetch(
        `/api/repos/${repo.repoId}/commits/${encodeURIComponent(commit.sha)}/fetch`,
        { method: 'POST' },
      )
      const data = await res.json().catch(() => null)

      if (activeCommitKeyRef.current !== commitKey) return

      if (!res.ok) {
        setFilesError(data?.error || 'Failed to load commit details')
        return
      }

      setDetailFiles(Array.isArray(data?.files) ? data.files : [])
      setIsDetailCached(Boolean(data?.cached))
    } catch {
      if (activeCommitKeyRef.current !== commitKey) return
      setFilesError('Network error while loading commit details')
    } finally {
      if (activeCommitKeyRef.current === commitKey) {
        setIsLoadingFiles(false)
      }
    }
  }

  async function refreshUsage() {
    try {
      const res = await fetch('/api/me/ai-usage')
      if (!res.ok) return
      const data = await res.json().catch(() => null)
      if (data && typeof data.used === 'number' && typeof data.limit === 'number') {
        setUsage({
          used: data.used,
          limit: data.limit,
          resetsAt: data.resetsAt || '',
        })
      }
    } catch {
    }
  }

  async function handleSummarize() {
    if (!selectedEntry) return
    const targetKey = `${selectedEntry.repoId}:${selectedEntry.commit.sha}`
    activeSummaryKeyRef.current = targetKey
    setIsSummarizing(true)
    setSummaryError(null)

    try {
      const res = await fetch(
        `/api/repos/${selectedEntry.repoId}/commits/${encodeURIComponent(selectedEntry.commit.sha)}/summary`,
        { method: 'POST' },
      )
      const data = await res.json().catch(() => null)

      if (activeCommitKeyRef.current !== targetKey || activeSummaryKeyRef.current !== targetKey) {
        return
      }

      if (res.status === 429) {
        const resetsAt = typeof data?.resetsAt === 'string' ? data.resetsAt : ''
        const formattedReset = resetsAt ? new Date(resetsAt).toUTCString() : 'tomorrow UTC'
        setSummaryError({
          isRateLimit: true,
          resetsAt,
          message: `You have used all ${usage.limit} default summaries for today. Limit resets at ${formattedReset}. Add your own API key in AI Summaries settings to summarize without limits.`,
        })
        await refreshUsage()
        return
      }

      if (!res.ok) {
        setSummaryError({
          message: data?.error || 'Failed to summarize commit.',
        })
        return
      }

      setSummary({
        text: data.text,
        provider: data.provider,
        model: data.model,
        cached: Boolean(data.cached),
        truncated: Boolean(data.truncated),
        usedDefaultKey: Boolean(data.usedDefaultKey),
      })

      if (!data.cached && data.usedDefaultKey) {
        setUsage((prev) => ({ ...prev, used: prev.used + 1 }))
        void refreshUsage()
      }
    } catch {
      if (activeCommitKeyRef.current !== targetKey || activeSummaryKeyRef.current !== targetKey) {
        return
      }
      setSummaryError({
        message: 'Network error while generating AI summary.',
      })
    } finally {
      if (activeSummaryKeyRef.current === targetKey) {
        setIsSummarizing(false)
      }
    }
  }

  const aiSettingsAction = (
    <AiSettingsSheet
      initialSettings={aiConfig.initialSettings}
      usage={usage}
      defaultProviderId={aiConfig.defaultProviderId}
      defaultProviderLabel={aiConfig.defaultProviderLabel}
      defaultModel={aiConfig.defaultModel}
      onSettingsChange={() => {
        setSummaryError(null)
        void refreshUsage()
      }}
    />
  )

  return (
    <div
      className={`mx-auto w-full px-3 sm:px-6 py-6 pt-6 pb-28 flex flex-col gap-8 transition-[max-width] duration-300 ease-in-out motion-reduce:transition-none ${isPanelExpanded ? 'max-w-2xl lg:max-w-5xl 2xl:max-w-6xl' : 'max-w-2xl'
        }`}
    >
      <div className="flex flex-col gap-4">
        {error && (
          <div className="p-3 border border-red-700 bg-red-50 text-red-700 text-sm rounded">
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-dashed border-white/50">
          <div>
            <h1 className="text-3xl font-semibold text-white tracking-tight">{title}</h1>
            <p className="text-xs text-white/75">{description}</p>
          </div>
          <div className="flex items-center gap-2.5">
            {aiSettingsAction}
            {connectAction}
          </div>
        </div>
      </div>

      <div
        className={`grid grid-cols-1 items-start transition-[grid-template-columns,gap] duration-300 ease-in-out motion-reduce:transition-none ${isPanelExpanded
            ? 'gap-6 lg:grid-cols-[0.78fr_1fr]'
            : 'gap-0 lg:grid-cols-[1fr_0fr]'
          }`}
      >
        <section className="min-w-0 flex flex-col gap-4">
          {repos.length === 0 ? (
            <p className="text-sm text-white/70 py-4">
              No repositories connected yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {repos.map((item) => (
                <li key={item.repoId}>
                  <RepoCommitsCard
                    repo={item}
                    initialCommits={item.initialCommits}
                    isOpen={openRepoId === item.repoId}
                    onToggle={() => handleToggle(item.repoId)}
                    selectedCommitKey={
                      selectedEntry && isPanelExpanded
                        ? `${selectedEntry.repoId}:${selectedEntry.commit.sha}`
                        : null
                    }
                    onSelectCommit={handleSelectCommit}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        {shouldMountPanel && selectedEntry && (
          <aside
            ref={panelRef}
            aria-label="Selected commit details"
            className={`min-w-0 lg:sticky lg:top-6 ${isPanelExpanded
                ? 'overflow-x-clip p-0.5 -m-0.5'
                : 'overflow-hidden pointer-events-none'
              }`}
          >
            <div
              className={`w-full lg:min-w-[460px] transition-all duration-300 ease-in-out motion-reduce:transition-none ${isPanelExpanded
                  ? 'opacity-100 translate-x-0'
                  : 'opacity-0 translate-x-6'
                }`}
            >
              <CommitDetailPanel
                commit={selectedEntry.commit}
                repoFullName={selectedEntry.repoFullName}
                files={detailFiles}
                isLoading={isLoadingFiles}
                error={filesError}
                isCached={isDetailCached}
                summary={summary}
                isSummarizing={isSummarizing}
                summaryError={summaryError}
                onSummarize={handleSummarize}
                onClose={handleCloseCommit}
                getAuthorColor={getAuthorColor}
              />
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}

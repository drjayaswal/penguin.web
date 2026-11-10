'use client'

import { useEffect, useRef, useState } from 'react'
import {
  ChevronDownIcon,
  GitBranchIcon,
  GlobeIcon,
  LockIcon,
  RefreshCwIcon,
} from 'lucide-react'
import Link from 'next/link'

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
}

const AUTHOR_PALETTES = [
  { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
  { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  { bg: 'bg-amber-50', text: 'text-amber-800', dot: 'bg-amber-500' },
  { bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500' },
  { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  { bg: 'bg-teal-50', text: 'text-teal-700', dot: 'bg-teal-500' },
  { bg: 'bg-cyan-50', text: 'text-cyan-800', dot: 'bg-cyan-500' },
  { bg: 'bg-orange-50', text: 'text-orange-800', dot: 'bg-orange-500' },
  { bg: 'bg-fuchsia-50', text: 'text-fuchsia-700', dot: 'bg-fuchsia-500' },
  { bg: 'bg-lime-50', text: 'text-lime-800', dot: 'bg-lime-500' },
  { bg: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-sky-500' },
]

function getAuthorColor(author: string) {
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
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
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
        className="inline-flex items-center justify-between gap-2 px-2.5 py-1 text-xs font-medium rounded-xl bg-white text-black transition-all cursor-pointer"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="truncate max-w-[130px] sm:max-w-[160px]">{selectedLabel}</span>
        <span className="text-[11px] text-neutral-400">({selectedCount})</span>
        <ChevronDownIcon
          className={`w-3.5 h-3.5 text-neutral-500 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 z-30 min-w-[200px] max-w-[260px] bg-white border border-neutral-200 rounded-xl shadow-lg py-1 max-h-56 overflow-y-auto">
          <button
            type="button"
            onClick={() => {
              onSelect('all')
              setIsOpen(false)
            }}
            className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 text-xs text-left transition-colors cursor-pointer ${
              selectedAuthor === 'all'
                ? 'bg-neutral-100 font-semibold text-black'
                : 'text-neutral-700 hover:bg-neutral-50'
            }`}
          >
            <span className="truncate">All</span>
            <span className="text-[11px] text-neutral-500 shrink-0">({commitsList.length})</span>
          </button>

          {authors.map((author) => {
            const count = commitsList.filter((c) => {
              const a = c.authorLogin ? `@${c.authorLogin}` : c.authorName || c.authorEmail || 'Unknown'
              return a === author
            }).length

            const isSelected = selectedAuthor === author

            return (
              <button
                key={author}
                type="button"
                onClick={() => {
                  onSelect(author)
                  setIsOpen(false)
                }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 text-xs text-left transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-neutral-100 font-semibold text-black'
                    : 'text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                <span className="truncate">{author}</span>
                <span className="text-[11px] text-neutral-500 shrink-0">({count})</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function RepoCommitsCard({
  repo,
  initialCommits = [],
  isOpen: controlledIsOpen,
  onToggle: controlledOnToggle,
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
    <div className="flex flex-col rounded-2xl bg-white border border-gray-200/75 shadow-sm overflow-hidden">
      <div
        onClick={toggleOpen}
        className="flex items-center justify-between gap-3 p-3 px-4 bg-white cursor-pointer select-none hover:bg-neutral-50/70 transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <ChevronDownIcon
            className={`w-4 h-4 text-neutral-400 transition-transform duration-300 shrink-0 ${
              isOpen ? 'rotate-180 text-neutral-700' : ''
            }`}
          />
          {repo.isPrivate ? (
            <LockIcon className="h-4 w-4 shrink-0 text-neutral-500" aria-label="Private repository" />
          ) : (
            <GlobeIcon className="h-4 w-4 shrink-0 text-neutral-500" aria-label="Public repository" />
          )}
          <Link
            href={`https://github.com/${repo.fullName}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-sm font-semibold truncate hover:text-blue-600 transition-colors"
          >
            {repo.fullName.split('/')[1] || repo.fullName}
          </Link>
        </div>

        <button
          type="button"
          onClick={handleSync}
          disabled={isSyncing}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white text-black hover:bg-neutral-50 disabled:opacity-50 transition-colors cursor-pointer shrink-0"
        >
          <RefreshCwIcon className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing...' : 'Sync'}
        </button>
      </div>

      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isOpen ? 'max-h-[460px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
        }`}
      >
        <div className="h-[360px] flex flex-col border-t border-neutral-100 bg-neutral-50/50 shadow-inner p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 mb-2 border-b border-neutral-200/70 shrink-0">
            <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-600">
              <GitBranchIcon className="w-3.5 h-3.5" />
              <span>Latest Commits</span>
              <span className="text-[11px] text-neutral-400">
                ({filteredCommits.length}{filteredCommits.length !== commitsList.length ? ` of ${commitsList.length}` : ''})
              </span>
            </div>

            {authors.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-neutral-500 font-medium">Author:</span>
                <AuthorSelect
                  authors={authors}
                  commitsList={commitsList}
                  selectedAuthor={selectedAuthor}
                  onSelect={setSelectedAuthor}
                />
              </div>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            {commitsList.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-xs text-neutral-500 py-3 text-center">
                  No commits synced yet. Click "Sync" to import commit history.
                </p>
              </div>
            ) : filteredCommits.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-xs text-neutral-500 py-3 text-center">
                  No commits found for the selected author.
                </p>
              </div>
            ) : (
              <ul className="flex flex-col divide-y divide-neutral-200/60">
                {filteredCommits.map((commit) => {
                  const firstLine = (commit.message || '').split('\n')[0]
                  const author =
                    commit.authorLogin ? `@${commit.authorLogin}` : commit.authorName || commit.authorEmail || 'Unknown'
                  const authorColor = getAuthorColor(author)

                    return (
                      <li key={commit.sha} className="py-2.5 flex items-baseline justify-between gap-3 text-xs">
                        <div className="flex items-baseline gap-2 min-w-0">
                          <span className="font-mono text-[11px] bg-blue-600/10 text-blue-600 font-medium px-1.5 py-0.5 rounded shrink-0">
                            {commit.sha.slice(0, 7)}
                          </span>
                          <span className="text-neutral-900 font-medium truncate" title={commit.message}>
                            {firstLine}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 text-neutral-500 text-[11px]">
                          <span
                            className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-md ${authorColor.bg} ${authorColor.text} shrink-0`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${authorColor.dot} shrink-0`} />
                            <span className="truncate max-w-[90px] sm:max-w-[120px]">{author}</span>
                          </span>
                          <span>•</span>
                          <span suppressHydrationWarning>{formatCommitDate(commit.committedAt)}</span>
                        </div>
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

export function RepoCommitsList({
  repos,
}: {
  repos: Array<{
    id: number
    repoId: number
    fullName: string
    isPrivate: boolean
    initialCommits: CommitItem[]
  }>
}) {
  const [openRepoId, setOpenRepoId] = useState<number | null>(null)

  function handleToggle(repoId: number) {
    setOpenRepoId((current) => (current === repoId ? null : repoId))
  }

  return (
    <ul className="flex flex-col gap-4">
      {repos.map((item) => (
        <li key={item.repoId}>
          <RepoCommitsCard
            repo={item}
            initialCommits={item.initialCommits}
            isOpen={openRepoId === item.repoId}
            onToggle={() => handleToggle(item.repoId)}
          />
        </li>
      ))}
    </ul>
  )
}

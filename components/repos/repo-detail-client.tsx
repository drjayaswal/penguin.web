'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ChevronDownIcon,
  GitBranchIcon,
  GlobeIcon,
  LockIcon,
  RefreshCwIcon,
  UsersIcon,
  GitGraphIcon,
  BarChart2Icon,
  ArrowLeftIcon,
  CheckIcon,
} from 'lucide-react'
import Link from 'next/link'
import { CommitItem, getAuthorColor } from '@/components/repo-commits-card'

interface Branch {
  name: string
  sha: string
  isDefault: boolean
}

interface StatEntry {
  date: string
  author: string
  count: number
}

interface RepoDetailClientProps {
  repo: {
    id: number
    repoId: number
    fullName: string
    isPrivate: boolean
  }
  initialCommits: CommitItem[]
  needsSync: boolean
}

function formatDate(val: string | Date) {
  const d = new Date(val)
  if (Number.isNaN(d.getTime())) return ''
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`
}

function SmoothDropdown({
  label,
  icon: Icon,
  items,
  selected,
  onSelect,
  renderItem,
}: {
  label: string
  icon: React.ElementType
  items: string[]
  selected: string
  onSelect: (val: string) => void
  renderItem?: (item: string) => React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleOut(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleOut)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleOut)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-neutral-100 text-black transition-all cursor-pointer border-0 outline-none ring-0 focus:outline-none focus:ring-0 hover:bg-neutral-200"
      >
        <Icon className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
        <span className="max-w-[120px] truncate">{selected === 'all' ? label : selected}</span>
        <ChevronDownIcon
          className={`w-3 h-3 text-neutral-500 transition-transform duration-200 shrink-0 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <div
        className={`absolute left-0 top-full z-50 mt-1 bg-white min-w-[180px] max-w-[280px] overflow-hidden transition-all duration-200 ${open ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-1 pointer-events-none'}`}
      >
        <ul className="max-h-56 overflow-y-auto py-1">
          {selected !== 'all' && (
            <li>
              <button
                type="button"
                onClick={() => { onSelect('all'); setOpen(false) }}
                className="w-full flex items-center justify-between px-3 py-2 text-xs text-left cursor-pointer transition-colors text-black/90 hover:bg-blue-600/10 hover:text-blue-600"
              >
                <span>All</span>
              </button>
            </li>
          )}
          {items.filter((i) => i !== selected).map((item) => (
            <li key={item}>
              <button
                type="button"
                onClick={() => { onSelect(item); setOpen(false) }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left cursor-pointer transition-colors text-black/90 hover:bg-blue-600/10 hover:text-blue-600"
              >
                {renderItem ? renderItem(item) : <span className="truncate">{item}</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function HeatmapView({
  repoId,
  initialAuthors,
}: {
  repoId: number
  initialAuthors: string[]
}) {
  const [entries, setEntries] = useState<StatEntry[]>([])
  const [authors, setAuthors] = useState<string[]>(initialAuthors)
  const [selectedAuthor, setSelectedAuthor] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/repos/${repoId}/stats`)
      .then((r) => r.json())
      .then((data) => {
        setEntries(data.entries ?? [])
        setAuthors(data.authors ?? [])
      })
      .catch(() => { })
      .finally(() => setLoading(false))
  }, [repoId])

  const now = new Date()
  const years = [now.getUTCFullYear() - 2, now.getUTCFullYear() - 1, now.getUTCFullYear()]

  const countByDate: Record<string, number> = {}
  for (const e of entries) {
    if (selectedAuthor !== 'all' && e.author !== selectedAuthor) continue
    countByDate[e.date] = (countByDate[e.date] ?? 0) + e.count
  }

  const maxCount = Math.max(1, ...Object.values(countByDate))

  function colorForCount(n: number) {
    if (n === 0) return 'bg-neutral-100'
    const ratio = n / maxCount
    if (ratio < 0.15) return 'bg-blue-100'
    if (ratio < 0.35) return 'bg-blue-200'
    if (ratio < 0.6) return 'bg-blue-400'
    if (ratio < 0.85) return 'bg-blue-600'
    return 'bg-blue-800'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-xs text-neutral-500">Loading contribution data…</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 py-4">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-medium text-neutral-700">Author</span>
        <SmoothDropdown
          label="All authors"
          icon={UsersIcon}
          items={authors}
          selected={selectedAuthor}
          onSelect={setSelectedAuthor}
        />
      </div>

      <div className="flex flex-col gap-6 overflow-x-auto pb-2">
        {years.map((year) => {
          const jan1 = new Date(Date.UTC(year, 0, 1))
          const startOffset = jan1.getUTCDay()
          const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
          const daysInYear = isLeap ? 366 : 365
          const weeks: (string | null)[][] = []
          let col: (string | null)[] = Array(startOffset).fill(null)

          for (let d = 0; d < daysInYear; d++) {
            const date = new Date(Date.UTC(year, 0, d + 1))
            const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
            col.push(key)
            if (col.length === 7) {
              weeks.push(col)
              col = []
            }
          }
          if (col.length > 0) {
            while (col.length < 7) col.push(null)
            weeks.push(col)
          }

          return (
            <div key={year} className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-neutral-500 mb-1">{year}</span>
              <div className="flex gap-0.5">
                {weeks.map((week, wi) => (
                  <div key={wi} className="flex flex-col gap-0.5">
                    {week.map((dateKey, di) => {
                      if (!dateKey) return <div key={di} className="w-2.5 h-2.5" />
                      const count = countByDate[dateKey] ?? 0
                      return (
                        <div
                          key={dateKey}
                          title={`${dateKey}: ${count} commit${count !== 1 ? 's' : ''}`}
                          className={`w-2.5 h-2.5 ${colorForCount(count)}`}
                        />
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-1.5 text-[11px] text-neutral-500">
        <span>Less</span>
        {['bg-neutral-100', 'bg-blue-100', 'bg-blue-200', 'bg-blue-400', 'bg-blue-600', 'bg-blue-800'].map((c) => (
          <div key={c} className={`w-2.5 h-2.5 ${c}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  )
}

function FlowView({ commits }: { commits: CommitItem[] }) {
  if (commits.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-xs text-neutral-500">No commits to visualize.</span>
      </div>
    )
  }

  const shaToIndex = new Map<string, number>()
  commits.forEach((c, i) => shaToIndex.set(c.sha, i))

  const LANE_H = 32
  const DOT_R = 5
  const X_OFFSET = 20
  const X_STEP = 16
  const svgH = commits.length * LANE_H + 20

  const laneMap = new Map<string, number>()
  let nextLane = 0

  function getLane(sha: string) {
    if (!laneMap.has(sha)) {
      laneMap.set(sha, nextLane % 6)
      nextLane++
    }
    return laneMap.get(sha)!
  }

  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4']

  const lines: React.ReactNode[] = []
  const dots: React.ReactNode[] = []

  commits.forEach((commit, i) => {
    const lane = getLane(commit.sha)
    const cx = X_OFFSET + lane * X_STEP
    const cy = i * LANE_H + LANE_H / 2 + 10
    const color = COLORS[lane % COLORS.length]

    const parents = (commit as any).parentShas ?? []
    for (const pSha of parents) {
      const pi = shaToIndex.get(pSha)
      if (pi !== undefined) {
        const pLane = getLane(pSha)
        const px = X_OFFSET + pLane * X_STEP
        const py = pi * LANE_H + LANE_H / 2 + 10
        lines.push(
          <path
            key={`${commit.sha}-${pSha}`}
            d={`M${cx},${cy} C${cx},${(cy + py) / 2} ${px},${(cy + py) / 2} ${px},${py}`}
            fill="none"
            stroke={color}
            strokeWidth={1.5}
            opacity={0.4}
          />
        )
      }
    }

    dots.push(
      <circle key={commit.sha} cx={cx} cy={cy} r={DOT_R} fill={color} />,
      <text
        key={`t-${commit.sha}`}
        x={X_OFFSET + 6 * X_STEP + 8}
        y={cy}
        dominantBaseline="middle"
        fontSize={10}
        fill="#374151"
      >
        {commit.sha.slice(0, 7)}{' '}
        {(commit.message || '').split('\n')[0].slice(0, 60)}
      </text>
    )
  })

  const svgW = Math.max(500, X_OFFSET + 6 * X_STEP + 420)

  return (
    <div className="overflow-auto py-4">
      <svg width={svgW} height={svgH} className="font-sans">
        {lines}
        {dots}
      </svg>
    </div>
  )
}

export function RepoDetailClient({
  repo,
  initialCommits,
  needsSync,
}: RepoDetailClientProps) {
  const [commits, setCommits] = useState<CommitItem[]>(initialCommits)
  const [isSyncing, setIsSyncing] = useState(false)
  const [view, setView] = useState<'commits' | 'flow' | 'data'>('commits')
  const [branches, setBranches] = useState<Branch[]>([])
  const [branchesLoading, setBranchesLoading] = useState(false)
  const [selectedBranch, setSelectedBranch] = useState('all')
  const [selectedAuthor, setSelectedAuthor] = useState('all')
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [autoSynced, setAutoSynced] = useState(false)

  useEffect(() => {
    if (needsSync && !autoSynced) {
      setAutoSynced(true)
      setIsSyncing(true)
      fetch(`/api/repos/${repo.repoId}/sync`, { method: 'POST' })
        .then((r) => r.ok ? fetch(`/api/repos/${repo.repoId}/commits?limit=50`) : null)
        .then((r) => r?.json())
        .then((data) => {
          if (data?.commits) {
            setCommits(data.commits)
            setNextCursor(data.nextCursor ?? null)
          }
        })
        .catch(() => { })
        .finally(() => setIsSyncing(false))
    }
  }, [needsSync, autoSynced, repo.repoId])

  useEffect(() => {
    setBranchesLoading(true)
    fetch(`/api/repos/${repo.repoId}/branches`)
      .then((r) => r.json())
      .then((data) => setBranches(data.branches ?? []))
      .catch(() => { })
      .finally(() => setBranchesLoading(false))
  }, [repo.repoId])

  async function handleSync() {
    setIsSyncing(true)
    try {
      const sr = await fetch(`/api/repos/${repo.repoId}/sync`, { method: 'POST' })
      if (sr.ok) {
        const cr = await fetch(`/api/repos/${repo.repoId}/commits?limit=50`)
        if (cr.ok) {
          const data = await cr.json()
          setCommits(data.commits ?? [])
          setNextCursor(data.nextCursor ?? null)
        }
      }
    } catch { }
    finally { setIsSyncing(false) }
  }

  async function handleLoadMore() {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    try {
      const r = await fetch(`/api/repos/${repo.repoId}/commits?limit=50&cursor=${encodeURIComponent(nextCursor)}`)
      if (r.ok) {
        const data = await r.json()
        setCommits((prev) => [...prev, ...(data.commits ?? [])])
        setNextCursor(data.nextCursor ?? null)
      }
    } catch { }
    finally { setLoadingMore(false) }
  }

  const authors = Array.from(
    new Set(commits.map((c) => c.authorLogin ? `@${c.authorLogin}` : c.authorName || c.authorEmail || 'Unknown'))
  ).sort()

  const branchNames = branches.map((b) => b.isDefault ? `${b.name} (default)` : b.name)

  const filteredCommits = commits.filter((c) => {
    if (selectedAuthor === 'all') return true
    const a = c.authorLogin ? `@${c.authorLogin}` : c.authorName || c.authorEmail || 'Unknown'
    return a === selectedAuthor
  })

  const repoName = repo.fullName.split('/')[1] || repo.fullName

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="sticky top-0 z-40 bg-white border-b border-neutral-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <Link
              href="/settings"
              className="flex items-center gap-1 text-xs text-neutral-500 hover:text-black transition-colors border-0 outline-none ring-0"
            >
              <ArrowLeftIcon className="w-3.5 h-3.5" />
              <span>Repositories</span>
            </Link>
            <span className="text-neutral-300 text-xs">/</span>
            <div className="flex items-center gap-1.5">
              {repo.isPrivate ? (
                <LockIcon className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
              ) : (
                <GlobeIcon className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
              )}
              <Link
                href={`https://github.com/${repo.fullName}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-black hover:text-blue-600 transition-colors"
              >
                {repoName}
              </Link>
              <span className="text-[11px] text-neutral-400 font-normal ml-0.5">
                {repo.fullName.split('/')[0]}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <SmoothDropdown
              label={branchesLoading ? 'Loading…' : 'Branches'}
              icon={GitBranchIcon}
              items={branchNames}
              selected={selectedBranch}
              onSelect={setSelectedBranch}
              renderItem={(item) => (
                <span className="flex items-center gap-1.5 min-w-0">
                  <GitBranchIcon className="w-3 h-3 shrink-0 text-neutral-400" />
                  <span className="truncate">{item}</span>
                  {item.endsWith('(default)') && (
                    <span className="text-[10px] text-blue-500 shrink-0">✓</span>
                  )}
                </span>
              )}
            />

            <SmoothDropdown
              label="Authors"
              icon={UsersIcon}
              items={authors}
              selected={selectedAuthor}
              onSelect={setSelectedAuthor}
            />

            <div className="flex items-center gap-1 ml-auto">
              <button
                type="button"
                onClick={() => setView('commits')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors border-0 outline-none ring-0 focus:outline-none focus:ring-0 cursor-pointer ${view === 'commits' ? 'bg-black text-white' : 'bg-neutral-100 text-black hover:bg-neutral-200'}`}
              >
                Commits
              </button>
              <button
                type="button"
                onClick={() => setView('flow')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors border-0 outline-none ring-0 focus:outline-none focus:ring-0 cursor-pointer ${view === 'flow' ? 'bg-black text-white' : 'bg-neutral-100 text-black hover:bg-neutral-200'}`}
              >
                Flow
              </button>
              <button
                type="button"
                onClick={() => setView('data')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors border-0 outline-none ring-0 focus:outline-none focus:ring-0 cursor-pointer ${view === 'data' ? 'bg-black text-white' : 'bg-neutral-100 text-black hover:bg-neutral-200'}`}
              >
                Data
              </button>
              <button
                type="button"
                onClick={handleSync}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-black hover:text-blue-600 disabled:opacity-50 transition-colors cursor-pointer border-0 outline-none ring-0 focus:outline-none focus:ring-0 bg-neutral-100 hover:bg-neutral-200"
              >
                <RefreshCwIcon className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing…' : 'Sync'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 pb-16 flex-1">
        {view === 'commits' && (
          <div className="mt-4">
            {isSyncing && commits.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <span className="text-xs text-neutral-500">Syncing commits…</span>
              </div>
            ) : filteredCommits.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <p className="text-xs text-neutral-500">
                  {commits.length === 0
                    ? 'No commits synced yet. Click "Sync" to import commit history.'
                    : 'No commits match the selected filter.'}
                </p>
              </div>
            ) : (
              <ul className="flex flex-col divide-y divide-neutral-100">
                {filteredCommits.map((commit) => {
                  const firstLine = (commit.message || '').split('\n')[0]
                  const author = commit.authorLogin
                    ? `@${commit.authorLogin}`
                    : commit.authorName || commit.authorEmail || 'Unknown'
                  const style = getAuthorColor(author)

                  return (
                    <li key={commit.sha}>
                      <div className="py-3 px-2 flex items-baseline justify-between gap-3 text-xs">
                        <div className="flex items-baseline gap-2 min-w-0">
                          <span className="text-[11px] font-bold px-1.5 py-0.5 shrink-0 text-blue-600 bg-blue-600/10">
                            {commit.sha.slice(0, 7)}
                          </span>
                          <span className="font-medium text-black truncate" title={commit.message}>
                            {firstLine}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 text-[11px] text-neutral-500">
                          <span className={`truncate max-w-[90px] sm:max-w-[140px] font-medium px-2 py-0.5 ${style.bg} ${style.text}`}>
                            {author}
                          </span>
                          <span suppressHydrationWarning>{formatDate(commit.committedAt)}</span>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}

            {nextCursor && (
              <div className="flex justify-center pt-4">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-4 py-2 text-xs font-medium bg-neutral-100 text-black hover:bg-neutral-200 disabled:opacity-50 transition-colors border-0 outline-none ring-0 cursor-pointer"
                >
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </div>
        )}

        {view === 'flow' && (
          <FlowView commits={commits} />
        )}

        {view === 'data' && (
          <HeatmapView repoId={repo.repoId} initialAuthors={authors} />
        )}
      </div>
    </div>
  )
}

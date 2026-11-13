export const MAX_PATCH_CHARS = 4000
export const MAX_TOTAL_PROMPT_CHARS = 30000

export const COMMIT_SUMMARY_SYSTEM_PROMPT =
  'You are a precise software engineering assistant. Summarize the provided git commit clearly and concisely in plain English. Cover the main intent, key changes across modified files, and any notable edge cases or side effects. Rely strictly on the commit message, file list, and diffs provided.'

export interface PromptCommitInput {
  sha: string
  message: string
  authorLogin?: string | null
  authorName?: string | null
  authorEmail?: string | null
}

export interface PromptFileInput {
  filename: string
  status: string
  additions: number
  deletions: number
  patch: string | null
  previousFilename?: string | null
}

export interface BuiltCommitPrompt {
  system: string
  prompt: string
  truncated: boolean
}

export function buildCommitSummaryPrompt(
  commit: PromptCommitInput,
  files: PromptFileInput[],
  options?: { maxPatchChars?: number; maxTotalChars?: number },
): BuiltCommitPrompt {
  const maxPatchChars = options?.maxPatchChars ?? MAX_PATCH_CHARS
  const maxTotalChars = options?.maxTotalChars ?? MAX_TOTAL_PROMPT_CHARS
  let truncated = false

  const author = commit.authorLogin
    ? `@${commit.authorLogin}`
    : commit.authorName || commit.authorEmail || 'Unknown'

  const headerLines = [
    `Commit SHA: ${commit.sha}`,
    `Author: ${author}`,
    'Commit Message:',
    commit.message || '(no message)',
    '',
    `Changed Files (${files.length}):`,
  ]

  for (const file of files) {
    const renameInfo =
      file.previousFilename && file.previousFilename !== file.filename
        ? `${file.previousFilename} -> ${file.filename}`
        : file.filename
    headerLines.push(`- [${file.status}] ${renameInfo} (+${file.additions}/-${file.deletions})`)
  }

  headerLines.push('', 'Patches:')

  let prompt = headerLines.join('\n')

  if (prompt.length > maxTotalChars) {
    const notice = '\n... [truncated due to total length limit]'
    const sliceLen = Math.max(0, maxTotalChars - notice.length)
    prompt = prompt.slice(0, sliceLen) + notice
    return {
      system: COMMIT_SUMMARY_SYSTEM_PROMPT,
      prompt: prompt.slice(0, maxTotalChars),
      truncated: true,
    }
  }

  for (const file of files) {
    const header = `\n\nFile: ${file.filename} (${file.status}, +${file.additions}/-${file.deletions})\n`
    let patchBody: string
    if (file.patch === null || file.patch === undefined) {
      patchBody = '[binary file or patch unavailable]'
    } else if (file.patch.length > maxPatchChars) {
      truncated = true
      const suffix = '\n... [patch truncated]'
      patchBody = file.patch.slice(0, Math.max(0, maxPatchChars - suffix.length)) + suffix
    } else {
      patchBody = file.patch
    }

    const section = `${header}${patchBody}`
    if (prompt.length + section.length <= maxTotalChars) {
      prompt += section
      continue
    }

    truncated = true
    const omissionNotice = '\n... [remaining diffs truncated due to total length limit]'
    const remaining = maxTotalChars - prompt.length - omissionNotice.length
    if (remaining > header.length + 32) {
      prompt += section.slice(0, remaining) + omissionNotice
    } else {
      const fallbackNotice = '\n... [truncated]'
      const safeRemaining = maxTotalChars - prompt.length - fallbackNotice.length
      if (safeRemaining > 0) {
        prompt += omissionNotice.slice(0, safeRemaining)
      }
    }
    break
  }

  if (prompt.length > maxTotalChars) {
    truncated = true
    prompt = prompt.slice(0, maxTotalChars)
  }

  return {
    system: COMMIT_SUMMARY_SYSTEM_PROMPT,
    prompt,
    truncated,
  }
}


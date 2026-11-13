# Penguin — Phase 1

GitHub sign-in plus repository access grant. Built with **Next.js (App Router, TypeScript)**, **PostgreSQL + Drizzle ORM**, and **session cookies** (httpOnly, secure, sameSite=lax). No third-party auth library. Uses a **GitHub App** (not an OAuth App).

## Stack

- Next.js 14 (App Router), TypeScript
- PostgreSQL + Drizzle ORM (`drizzle-orm`, `pg`, `drizzle-kit`)
- Native `crypto` for session tokens, state nonces, and GitHub App JWTs (RS256)
- Tailwind CSS — black & white base colors, light theme only
- Logo: `public/Penguin.png` (white logo, shown black via CSS `invert(1)` class)

## Files created

```
.env.example
.gitignore
next-env.d.ts
next.config.js
package.json
tailwind.config.ts
postcss.config.js
drizzle.config.ts
tsconfig.json

db/schema.ts          # Drizzle schema: users, sessions, github_installations, installation_repos
db/index.ts           # Drizzle client (pg Pool)

lib/env.ts            # Startup validation of all required env vars
lib/auth.ts           # Session token hashing, create/delete session, requireUser()
lib/github.ts         # GitHub App private key PEM resolver, App JWT, installation access token, list repos

middleware.ts         # Redirects /settings -> / when no session cookie

app/layout.tsx        # Root layout: Penguin logo (light theme only)
app/globals.css       # Tailwind + black/white light theme variables
app/page.tsx          # / — "Sign in with GitHub" button
app/settings/page.tsx# /settings — user info, Connect repositories, repo list, sign out

app/api/auth/github/route.ts                      # GET — start GitHub OAuth (state + httpOnly cookie)
app/api/auth/github/callback/route.ts             # GET — verify state, exchange code, upsert user, session
app/api/auth/logout/route.ts                      # POST — delete session, clear cookie
app/api/github/install/route.ts                   # GET — redirect to GitHub App install page (state)
app/api/github/install/callback/route.ts          # GET — verify user, save installation_id + repos
app/api/me/route.ts                               # GET — current user (401 if signed out)
app/api/repos/route.ts                            # GET — current user's repos (401 if signed out)

public/Penguin.png                                # App logo (white, shown black via CSS invert)
README.md
```

## Setup

### 1. Install dependencies

Node.js and npm are required. Then:

```bash
cd /Users/dhruvratanjayaswal/Desktop/personal/penguin.web
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env` and fill in every value. All are validated at startup — the app fails with a clear message if any is missing.

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/penguin
GITHUB_APP_ID=123456
GITHUB_APP_SLUG=penguin
GITHUB_CLIENT_ID=Iv1....
GITHUB_CLIENT_SECRET=....
GITHUB_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----
APP_URL=http://localhost:3000
SESSION_SECRET=a-long-random-secret
```

`GITHUB_PRIVATE_KEY` may be supplied either as a PEM with `\n` escaped newlines or as a base64-encoded PEM.

### 3. Database

Create a PostgreSQL database (e.g. `penguin`), then generate and apply the Drizzle migration:

```bash
npm run db:generate   # creates the SQL migration under ./drizzle
npm run db:migrate    # applies it to DATABASE_URL
```

### 4. Run

```bash
npm run dev
# open http://localhost:3000
```

### 4. GitHub App setup (required before "Connect repositories" works)

The "Connect repositories" button redirects to `https://github.com/apps/penguin/installations/new`. You will get a **404** until you actually create the GitHub App on GitHub.

Create a **GitHub App** at GitHub → Settings → Developer settings → GitHub Apps → New GitHub App, named **penguin**:

| Setting | Value |
|---|---|
| GitHub App name | `penguin` |
| Homepage URL | `{APP_URL}` (e.g. `http://localhost:3000`) |
| **Callback URL** | `{APP_URL}/api/auth/github/callback` |
| **Setup URL** (Post-installation setup URL) | `{APP_URL}/api/github/install/callback` |
| **Redirect on update** | `{APP_URL}/settings` |
| Webhook URL | (optional, not required for Phase 1) |

**Repository permissions** — read-only only (do NOT enable write):
- **Metadata** — Read-only
- **Contents** — Read-only

After saving, generate a private key, download the `.pem`, base64-encode it (or escape newlines as `\n`), and set it as `GITHUB_PRIVATE_KEY`. Note the **App ID**, **Client ID**, generate a **Client Secret**, and copy the **App slug** into `.env`.

#### How repo access works (step by step)

1. User signs in with GitHub (`/api/auth/github` → callback → `/settings`).
2. User clicks **"Connect repositories"** on `/settings`.
3. App redirects to `https://github.com/apps/penguin/installations/new?state=...`.
4. User chooses their GitHub account/organization and selects which repos to grant.
5. GitHub redirects back to `/api/github/install/callback?installation_id=123456&state=...`.
6. App verifies the signed-in user + state, generates an installation access token from the App JWT + private key, fetches `GET /installation/repositories`, and stores each repo under that user.
7. Repos appear on `/settings` under "Connected repositories" and via `GET /api/repos` (filtered by the signed-in user's id).

#### Where repos are listed

- **UI:** `/settings` → "Connected repositories" section (only that user's repos).
- **API:** `GET /api/repos` → returns only repos belonging to the signed-in user (401 if signed out).
- **DB:** `github_installations` (one row per installation) + `installation_repos` (one row per repo).

## Routes

| Route | Method | Description |
|---|---|---|
| `/` | GET | Sign-in page with "Sign in with GitHub" button |
| `/settings` | GET | Protected. User info, Connect repositories button, repo list |
| `/api/auth/github` | GET | Start GitHub OAuth (sets `gh_state` httpOnly cookie, redirects) |
| `/api/auth/github/callback` | GET | Verify state, exchange code, upsert user, create session, redirect `/settings` |
| `/api/auth/logout` | POST | Delete session, clear cookie |
| `/api/github/install` | GET | Redirect to GitHub App install page (sets `gh_install_state` cookie) |
| `/api/github/install/callback` | GET | Verify user + state, save `installation_id`, fetch & store repos |
| `/api/me` | GET | Current user (401 if signed out) |
| `/api/repos` | GET | Current user's repos, filtered by user id (401 if signed out) |

## Security

- Session tokens are SHA-256 hashed before storage (`sessions.token_hash`).
- The `state` nonce is stored in an httpOnly cookie and verified on both callbacks; a tampered/mismatched state is rejected.
- `GITHUB_CLIENT_SECRET` and `GITHUB_PRIVATE_KEY` never leave the server.
- Every repo query filters by the signed-in user's id (`github_installations.userId`).
- `requireUser()` is used by all protected API routes; `/settings` is also guarded by middleware.
- Session cookie: `httpOnly`, `secure` (off on `localhost`), `sameSite=lax`, 7-day TTL.

## Acceptance checks

Run these against a running instance (`npm run dev`) with a configured GitHub App.

### 1. Sign-in creates one user row; re-sign-in does not duplicate

Before signing in, confirm `users` is empty (`SELECT count(*) FROM users;` → 0). Sign in with GitHub, then sign in again. After each, query:

```sql
SELECT github_id, login, count(*) FROM users GROUP BY github_id, login;
```

Expect exactly 1 row with `count = 1` after both sign-ins.

### 2. Installing on one repo → only that repo shows in /settings

Install the GitHub App on a test account and grant access to exactly ONE repo. After the install callback redirects to `/settings`:

```bash
curl -s -b "penguin_session=<session-cookie>" http://localhost:3000/api/repos
```

Expect `repos` length 1 containing only that repo. The dashboard should list only that repo.

### 3. Logging out redirects /settings to /

```bash
curl -s -X POST -b "penguin_session=<session-cookie>" http://localhost:3000/api/auth/logout
curl -s -D - http://localhost:3000/settings   # no session cookie
```

Expect HTTP 302 redirect to `http://localhost:3000/`.

### 4. /api/repos while signed out returns 401

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/repos
```

Expect `401`.

### 5. Tampered state cookie is rejected

```bash
curl -s -D - "http://localhost:3000/api/auth/github/callback?code=abc&state=tampered" \
  -H "Cookie: gh_state=realshouldnotmatch"
```

Expect redirect to `/?error=invalid_state` (not a successful sign-in).

## Notes / limitations

- This repo was authored in an environment without Node.js or PostgreSQL available, so `npm install`, `db:generate`, `db:migrate`, and the acceptance checks above could **not** be executed here. Run them locally after installing Node and PostgreSQL.
- Session `secure` cookie is disabled on `localhost` so local development works over HTTP; it is enforced in production (`https`).
- Phase 1 deliberately omits commit history, AI features, and billing.

---

## End-to-End Testing — Connect Repositories Flow

### Prerequisites
1. A GitHub App named **penguin** exists at GitHub → Settings → Developer settings → GitHub Apps
2. Callback URL: `http://localhost:3000/api/auth/github/callback`
3. Setup URL: `http://localhost:3000/api/github/install/callback`
4. Redirect on update: `http://localhost:3000/settings`
5. Repository permissions: Metadata (read), Contents (read) — no write
6. `.env` is filled with `GITHUB_APP_ID`, `GITHUB_APP_SLUG`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_PRIVATE_KEY`, `DATABASE_URL`, `APP_URL`, `SESSION_SECRET`
7. Database migration has been applied (`npm run db:generate && npm run db:migrate`)

### Test Steps

1. **Start the dev server:** `npm run dev`, open `http://localhost:3000`
2. **Sign in:** Click "Sign in with GitHub", complete GitHub OAuth, you land on `/settings`
3. **Connect repositories:** Click "Connect repositories" on `/settings`
   - You are redirected to `https://github.com/apps/penguin/installations/new?state=<nonce>`
   - Select your GitHub account/organization and choose which repos to grant
   - GitHub redirects back to `/api/github/install/callback?installation_id=<id>&state=<nonce>`
4. **Verify repos appear:** You are redirected back to `/settings` and the granted repos are listed under "Connected repositories"
5. **Verify API:** `GET /api/repos` with your session cookie returns only those repos
6. **Verify user isolation:** Sign in with a different GitHub account — they see only their own installations/repos
7. **Verify logout:** Click "Sign out", then `/settings` redirects to `/`
8. **Verify error handling:** Tamper with the `state` parameter in the callback URL — you get redirected to `/settings?error=invalid_state` with an error banner

### Debug Logs
The install and callback routes log to the server console:
- `[install] setting gh_install_state cookie=...`
- `[install/callback] url=... query=... cookie gh_install_state present=...`
- `[install/callback] installation saved=...`
- `[install/callback] repos fetched=... repos saved=...`

### Files Changed in Debug Session
| File | Change |
|------|--------|
| `app/api/github/install/callback/route.ts` | Added console logging at top; reordered checks (installation_id before state); missing `installation_id` → `?error=no_installation`; missing/mismatched `state` → `?error=invalid_state` with both values logged; added success logs for installation and repo saves |
| `app/api/github/install/route.ts` | Added console log confirming `gh_install_state` cookie is set with `path="/"`, `httpOnly`, `sameSite: "lax"`, `maxAge: 600` |
| `app/settings/page.tsx` | Accepts `searchParams` to read `?error=`; shows error banner with `errorMessage()` mapping for `no_installation`, `invalid_state`, `invalid_installation`, `install_failed` |
| `README.md` | Added End-to-End Testing section with prerequisites, test steps, debug logs, and files changed table |

---

## Phase 2 — Commit History Sync & Acceptance Checks

### Features Implemented
1. **Drizzle schema (`commits` table)**:
   - `id`: serial primary key
   - `repo_id`: integer foreign key referencing `installation_repos.id`
   - `sha`: text unique per repo (`UNIQUE("repo_id", "sha")`)
   - `message`: commit message text
   - `author_name`, `author_email`, `author_login`: author metadata
   - `committed_at`: timestamp with time zone
   - `parent_shas`: text array
   - `created_at`: timestamp with time zone default now()
2. **`POST /api/repos/:repoId/sync`**:
   - Protected by `requireUser` (returns 401 if unauthenticated)
   - Verifies repo ownership through `github_installations.user_id` (returns 404 otherwise)
   - Obtains installation access token via `getInstallationAccessToken`
   - Calls `GET /repos/{full_name}/commits` with `per_page=100`, paginating with `page` parameter until empty
   - Upserts commits by `(repo_id, sha)` avoiding duplicates on re-sync
   - Returns `{ fetched, inserted }`
   - Handles GitHub 403 (rate limit/permissions) and 404 (repo gone) with clear JSON errors, never 500
3. **`GET /api/repos/:repoId/commits`**:
   - Protected by `requireUser` (returns 401 if unauthenticated)
   - Same repo ownership verification (returns 404 otherwise)
   - Cursor pagination by `committed_at desc` (limit max 100, default 50)
4. **UI on `/settings`**:
   - "Sync" button per repository with dynamic loading state and feedback
   - Lists latest 50 commits displaying short SHA, first line of message, author, and date

### Acceptance Checks
Run the automated test suite:
```bash
npm run test:phase2
```

- **Sync twice on the same repo**: Row count unchanged the second time (`inserted: 0`).
- **User isolation (Ownership check)**: A user cannot sync or read another user's repo (expect 404) by changing `repoId` in the URL.
- **Syncing a repo with > 100 commits**: Paginates and stores all commits.
- **Signed-out requests**: Both endpoints return 401 when called without a valid session cookie.

---

## Phase 3 — Commit Changed Files & Diffs

### Features Implemented
1. **Drizzle schema (`commit_files` table)**:
   - `id`: serial primary key
   - `commit_id`: integer foreign key referencing `commits.id` (`ON DELETE CASCADE`)
   - `filename`: text not null
   - `status`: `'A' | 'M' | 'D' | 'E'`
   - `additions`, `deletions`: integer counts (default 0)
   - `patch`: nullable text (stored as `null` for binary/patchless files)
   - `previous_filename`: nullable text (populated for renames)
   - `created_at`: timestamp with time zone default now()
   - Unique constraint on `(commit_id, filename)`
2. **`POST /api/repos/:repoId/commits/:sha/fetch`**:
   - Protected by `requireUser` (returns `401` if unauthenticated)
   - Verifies repo ownership via `github_installations.user_id` and confirms commit belongs to the repo (returns `404` otherwise)
   - Cache check: if `commit_files` already exist for the commit, returns cached files without calling GitHub (`cached: true`)
   - Otherwise calls GitHub `GET /repos/{full_name}/commits/{sha}` with pagination (`per_page=100`, `page`, `Link` header)
   - Upserts into `commit_files` by `(commit_id, filename)` and stores binary files with `patch = null`
   - Returns `{ fetched, inserted, cached, files }`
   - Handles GitHub `403`, `404`, and `422` errors cleanly as JSON (never `500`)
3. **`GET /api/repos/:repoId/commits/:sha`**:
   - Protected by `requireUser` (returns `401` if unauthenticated)
   - Verifies repo ownership and returns commit metadata plus its stored `commit_files` (`filename`, `status`, `additions`, `deletions`, `patch`, `previousFilename`)
4. **UI on `/settings`**:
   - Clicking a commit opens a black-and-white light-theme detail panel displaying commit metadata and changed files with `+/-` counts
   - Clicking a changed file displays its patch in a `<pre>` block with added lines (`+`) and removed lines (`-`) colored

### Acceptance Checks
Run the automated Phase 3 test suite:
```bash
npm run test:phase3
```

Checks verified:
- **Fetching the same commit twice**: Second response returns `cached: true` and makes zero GitHub API calls (logged on server as `[commit/fetch] cache hit ...`).
- **User isolation (Ownership check)**: Changing `repoId` or `sha` in the URL to access another user's commit returns `404` on both endpoints.
- **Binary files**: Commits modifying binary files without a `patch` store the row with `patch = null` and do not crash.
- **Renamed files**: Commits with renamed files store `status = 'renamed'` and populate `previous_filename`.
- **Signed-out requests**: Both `POST .../fetch` and `GET .../:sha` return `401` when called without a valid session cookie.
- **GitHub error mapping**: `403`, `404`, and `422` responses from GitHub return clean JSON errors with matching status codes (never `500`).

---

## Phase 5 — AI Commit Summaries, Providers & Daily Limits

### Environment Variables
Add these variables to `.env` (see `.env.example`):
- `DEFAULT_PROVIDER=groq` (`groq` | `openai` | `openrouter` | `anthropic`)
- `GROQ_API_KEY=...` (or matching key env var for your chosen `DEFAULT_PROVIDER`)
- `DEFAULT_AI_MODEL=llama-3.3-70b-versatile`
- `AI_DEFAULT_DAILY_LIMIT=10`
- `ENCRYPTION_KEY=...` (32-byte base64 key, e.g. generated with `openssl rand -base64 32`)

Startup fails cleanly in `lib/env.ts` if `DEFAULT_PROVIDER` is set without its matching API key env var.

### Features Implemented
1. **Provider Layer (`lib/ai/`)**:
   - Unified `summarize({ system, prompt, model, apiKey })` returning `{ text, inputTokens, outputTokens }`
   - `openai-compatible` adapter supporting `groq` (`https://api.groq.com/openai/v1`), `openai`, and `openrouter`
   - `anthropic` adapter (`POST https://api.anthropic.com/v1/messages`)
   - Provider registry mapping provider names to adapters, base URLs, and overridable default models
   - Prompt builder truncating per-file patches and total prompt text to 30,000 chars (`truncated: true` when cut)
2. **Database Schema & Encryption (`db/schema.ts`, `lib/crypto.ts`)**:
   - `user_ai_settings`, `commit_summaries`, and `ai_usage` tables
   - AES-256-GCM encryption with `ENCRYPTION_KEY` and a random 12-byte IV (`iv:tag:ciphertext`)
3. **API Routes (`requireUser` on all)**:
   - `PUT /api/me/ai-settings`, `GET /api/me/ai-settings`, `DELETE /api/me/ai-settings`
   - `GET /api/me/ai-usage` returning `{ used, limit, resetsAt }`
   - `POST /api/repos/:repoId/commits/:sha/summary` with ownership checks, Phase 3 file fallback, summary caching, atomic daily limit enforcement + automatic refund on failure, and provider error mapping (`"AI provider rejected the key"` on 401/403; `502` retry message on 429/5xx)
4. **UI on `/settings`**:
   - AI Settings card for selecting provider/model, saving a write-only API key (showing only `last4`), removing a key, and displaying `"Using default (Groq): X of 10 summaries used today"`
   - `"Summarize"` button in commit details showing cached badge, summary text, and clear `429` limit messaging

### Acceptance Checks
Run the automated Phase 5 test suite:
```bash
npm run test:phase5
```

Checks verified:
- **Caching & no double counting**: Summarizing the same commit twice returns `cached: true` on the second call without increasing `ai_usage`.
- **Daily limit enforcement**: Without a saved key, the 11th uncached summary on the same UTC day returns `429` with `{ error: "daily_limit_reached", resetsAt }`.
- **Bring-your-own-key bypass**: With a saved API key, summaries beyond 10 succeed and do not increment `ai_usage`.
- **Failure refund**: A failed AI provider call refunds the consumed `ai_usage` slot.
- **No key leakage**: Plaintext API keys never appear in responses, console logs, or `user_ai_settings` database rows.
- **User isolation & auth**: Accessing another user's commit returns `404`; signed-out requests return `401`.






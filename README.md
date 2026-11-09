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



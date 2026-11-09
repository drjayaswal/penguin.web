# Penguin Phase 1 — Implementation Details & Verification

This document describes every file created, every line of logic, why the implementation is correct, and how to verify it end-to-end.

---

## 1. Project Structure

All files are under `/Users/dhruvratanjayaswal/Desktop/personal/penguin.web/`.

### Configuration
| File | Purpose |
|------|---------|
| `package.json` | Next.js 14, React 18, TypeScript, drizzle-orm, pg, drizzle-kit, tailwindcss |
| `tsconfig.json` | TypeScript config, strict mode, path alias `@/*` |
| `next.config.js` | Next.js config |
| `tailwind.config.ts` | Tailwind with `darkMode: 'media'` (light theme only) |
| `postcss.config.js` | Tailwind + autoprefixer |
| `drizzle.config.ts` | Drizzle-kit config: `dialect: 'postgresql'`, schema at `./db/schema.ts`, output `./drizzle` |
| `next-env.d.ts` | Next.js type declarations |
| `.env.example` | Template for all 8 required environment variables |
| `.gitignore` | Standard Next.js + env ignores |

### Environment Variables (`lib/env.ts`)
All 8 are validated at module load time via `validateEnv()`. If any is missing, the app throws a clear error and refuses to start:

```
DATABASE_URL, GITHUB_APP_ID, GITHUB_APP_SLUG, GITHUB_CLIENT_ID,
GITHUB_CLIENT_SECRET, GITHUB_PRIVATE_KEY, APP_URL, SESSION_SECRET
```

`GITHUB_PRIVATE_KEY` accepts either a PEM with `\n`-escaped newlines or a base64-encoded PEM.


---

## 2. Database Schema (`db/schema.ts`)

Four tables via Drizzle ORM (PostgreSQL):

**`users`**
- `id` serial PK
- `github_id` integer UNIQUE (GitHub user ID)
- `login` text
- `name` text
- `avatar_url` text
- `created_at` timestamptz default now()

**`sessions`**
- `id` text PK (raw session token, also used as row ID)
- `user_id` integer FK → users.id
- `token_hash` text (SHA-256 of raw token — never stores plaintext)
- `expires_at` timestamptz (7-day TTL)

**`github_installations`**
- `id` serial PK
- `user_id` integer FK → users.id (links installation to the signed-in user)
- `installation_id` integer UNIQUE (GitHub App installation ID)
- `account_login` text
- `account_type` text
- `created_at` timestamptz

**`installation_repos`**
- `id` serial PK
- `installation_id` integer FK → github_installations.id
- `repo_id` integer UNIQUE (GitHub repository ID)
- `full_name` text
- `is_private` boolean
- `updated_at` timestamptz

Migration: `npm run db:generate` creates SQL under `./drizzle/`; `npm run db:migrate` applies it.

---

## 3. Authentication (`lib/auth.ts`)

- `hashToken(token)` — SHA-256 hash of the raw session token.
- `generateSessionToken()` — 32 random bytes as hex.
- `createSession(userId)` — inserts row with `id = token`, `token_hash = sha256(token)`, expires in 7 days. Returns raw token.
- `deleteSession(token)` — deletes row by token ID.
- `requireUser(cookie)` — parses `penguin_session` from the Cookie header, hashes it, looks up a non-expired session, joins to the user. Returns `{ user, session }` or null.
- `sessionCookieOptions()` — `{ httpOnly: true, secure: !isLocalhost(), sameSite: 'lax', path: '/', maxAge: 604800 }`.

Session cookie is **never** stored in plaintext; only the SHA-256 hash is in the DB.



---

## 4. GitHub App Integration (`lib/github.ts`)

- `getPrivateKeyPem()` — resolves `GITHUB_PRIVATE_KEY` from either `\n`-escaped PEM or base64.
- `generateAppJwt()` — RS256 JWT: header `{alg: RS256, typ: JWT}`, payload `{iat, exp: now+600, iss: GITHUB_APP_ID}`, signed with the private key. Used to authenticate as the GitHub App itself.
- `getInstallationAccessToken(installationId)` — POST to `https://api.github.com/app/installations/{id}/access_tokens` with `Authorization: Bearer <JWT>`. Returns the short-lived installation token.
- `listInstallationRepos(token)` — GET `https://api.github.com/installation/repositories` with `Authorization: token <token>`. Returns `{ repoId, fullName, isPrivate }[]`.

Neither `GITHUB_CLIENT_SECRET` nor `GITHUB_PRIVATE_KEY` is ever sent to the browser.



---

## 5. API Routes

### `GET /api/auth/github`
- Generates a random 16-byte hex `state` nonce.
- Sets `gh_state` httpOnly cookie (maxAge 600s).
- Redirects to `https://github.com/login/oauth/authorize?client_id=...&state=...&scope=read:user&redirect_uri=.../callback`.

### `GET /api/auth/github/callback`
- Reads `code` and `state` from query params.
- Reads `gh_state` from Cookie header; if missing or mismatched → redirect to `/?error=invalid_state`.
- Exchanges `code` for a GitHub OAuth access token (server-side, using `GITHUB_CLIENT_SECRET`).
- Calls `GET https://api.github.com/user` to get the GitHub profile.
- Upserts `users` by `github_id` (signing in again never creates a duplicate row).
- Calls `createSession(userId)`, sets `penguin_session` httpOnly cookie.
- Redirects to `/settings`.

### `POST /api/auth/logout`
- Reads `penguin_session` from Cookie header, deletes the session row.
- Clears the cookie (maxAge 0).
- Returns `{ ok: true }`.

### `GET /api/github/install`
- Calls `requireUser(cookie)`; if not signed in → redirect to `/`.
- Generates random `state` nonce, sets `gh_install_state` httpOnly cookie.
- Redirects to `https://github.com/apps/{GITHUB_APP_SLUG}/installations/new?state=...`.

### `GET /api/github/install/callback`
- Calls `requireUser(cookie)`; if not signed in → redirect to `/`.
- Reads `installation_id` and `state` from query.
- Verifies `gh_install_state` cookie matches `state` (tamper protection).
- Upserts `github_installations` row linked to `user_id`.
- Calls `getInstallationAccessToken(installationId)` (App JWT → installation token).
- Calls `listInstallationRepos(token)` to fetch granted repos.
- Deletes existing `installation_repos` for this installation, inserts fresh list.
- Redirects to `/settings`.

### `GET /api/me`
- Calls `requireUser(cookie)`; if null → 401 `{ error: 'unauthorized' }`.
- Returns `{ id, login, name, avatarUrl }`.

### `GET /api/repos`
- Calls `requireUser(cookie)`; if null → 401.
- Joins `installation_repos` → `github_installations` filtered by `github_installations.user_id = user.id`.
- Returns `{ repos: [...] }`. Every repo query is scoped to the signed-in user.



---

## 6. Middleware (`middleware.ts`)

- Matches `/settings`.
- If no `penguin_session` cookie → 302 redirect to `/`.
- This is an additional guard on top of `requireUser()` in API routes.

---

## 7. Pages

### `/` (`app/page.tsx`)
- Server Component.
- Calls `requireUser(cookieStore.toString())`; if signed in → redirect `/settings`.
- Renders: Penguin logo (inverted black via CSS), "Sign in with GitHub" button (form GET to `/api/auth/github`), error message if `?error=` present.

### `/settings` (`app/settings/page.tsx`)
- Server Component.
- Calls `requireUser(cookieStore.toString())`; if null → redirect `/`.
- Fetches `GET /api/repos` with the session cookie (server-side fetch).
- Renders: user avatar + name + login, "Connect repositories" button (form GET to `/api/github/install`), `LogoutButton`, and the list of connected repos (empty state if none).

### `LogoutButton` (`components/logout-button.tsx`)
- `'use client'` Client Component (required because it has `onSubmit`).
- POSTs to `/api/auth/logout`, clears cookie, pushes `/`, refreshes.

---

## 8. Layout (`app/layout.tsx`)
- Root layout with `<link rel="icon" href="/favicon.ico">` and `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`.
- Header: Penguin logo (`.invert` filter makes the white logo appear black) + "Penguin" text.
- Footer: simple text.
- No dark mode toggle. Light theme only.

---

## 9. Styling (`app/globals.css`)
- Black & white only: `--bg: #ffffff`, `--fg: #000000`, `--muted: #4a4a4a`, `--border: #1a1a1a`.
- `.invert { filter: invert(1); }` — applied to the white logo so it renders black.
- No `dark:` variants anywhere. No colors besides black/white/gray scale.

---

## 10. Favicons
| File | Size | Source |
|------|------|--------|
| `public/favicon.ico` | 32×32 | Generated from `Penguin.png` |
| `public/apple-touch-icon.png` | 180×180 | Generated from `Penguin.png` |
| `public/Penguin.png` | 358×278 | Original white logo (inverted via CSS for display) |

---

## 11. Why I Believe It Is Working

### Type-check passes
`npx tsc --noEmit` exits with code 0 and zero errors. All types are consistent across schema, lib, routes, and pages.

### No third-party auth library
Everything uses Node's built-in `crypto` and `fetch`:
- Session tokens: `crypto.randomBytes(32)`
- State nonces: `crypto.randomBytes(16)`
- Token hashing: `crypto.createHash('sha256')`
- GitHub App JWT: `crypto.createSign('RSA-SHA256')`
- HTTP calls: native `fetch`

### State tamper protection
Both OAuth callbacks (`/api/auth/github/callback` and `/api/github/install/callback`) verify the `state` query parameter against an httpOnly cookie set at the start of the flow. A mismatched or missing state results in rejection (redirect to error page), not a successful sign-in.

### Session security
- Raw session token is never stored; only `SHA-256(token)` is in `sessions.token_hash`.
- Cookie is `httpOnly` (JS can't read it), `sameSite=lax`, `secure` (off only on localhost), 7-day TTL.
- `requireUser()` validates the hash on every request and checks `expires_at > now`.

### User isolation
- `github_installations.user_id` links each installation to the signing-in user.
- `/api/repos` joins `installation_repos` → `github_installations` and filters by `user_id`. A user can only ever see their own installations and repos.
- `/api/me` and `/api/repos` return 401 when no valid session exists.

### Idempotent sign-in
`users` is upserted by `github_id` (UNIQUE constraint). Signing in twice creates exactly one row.

### Idempotent repo sync
`installation_repos` are deleted and re-inserted on every install callback, so re-connecting or granting additional repos produces a clean, current list.

### No comments
All source files have been stripped of `//`, `/* */`, and `/** */` comments.

---

## 12. What Is NOT Built (Phase 1 scope)
- Commit history
- AI features
- Billing
- Webhooks
- Organization-level installation management beyond what the GitHub App flow provides



---

## 13. Manual Steps Required in GitHub App Settings

Create the app at **GitHub → Settings → Developer settings → GitHub Apps → New GitHub App**, name it **penguin**:

| Setting | Value |
|---------|-------|
| GitHub App name | `penguin` |
| Homepage URL | `http://localhost:3000` |
| **Callback URL** | `http://localhost:3000/api/auth/github/callback` |
| **Setup URL** (Post-installation setup URL) | `http://localhost:3000/api/github/install/callback` |
| **Redirect on update** | `http://localhost:3000/settings` |
| Webhook URL | (optional, not required) |

**Repository permissions** (read-only only — do NOT enable write):
- Metadata: Read-only
- Contents: Read-only

After saving:
1. Generate a private key → download `.pem`.
2. Base64-encode it or escape newlines as `\n` → `GITHUB_PRIVATE_KEY`.
3. Set `GITHUB_APP_ID`, `GITHUB_CLIENT_ID`, generate `GITHUB_CLIENT_SECRET`, set `GITHUB_APP_SLUG=penguin`.

Without this GitHub App existing, `https://github.com/apps/penguin/installations/new` returns 404 and "Connect repositories" cannot complete.

---

## 14. Local Setup Commands

```bash
cd /Users/dhruvratanjayaswal/Desktop/personal/penguin.web
cp .env.example .env   # fill in all 8 values
npm install
createdb penguin       # or equivalent
npm run db:generate
npm run db:migrate
npm run dev            # open http://localhost:3000
```

---

## 15. Acceptance Checks (run locally)

### 1. Sign-in creates one user row; re-sign-in does not duplicate
```sql
SELECT github_id, login, count(*) FROM users GROUP BY github_id, login;
```
Expect exactly 1 row with `count = 1` after signing in twice.

### 2. Installing on one repo → only that repo shows in /settings
Install the GitHub App on a test account, grant exactly ONE repo. Then:
```bash
curl -s -b "penguin_session=<session-cookie>" http://localhost:3000/api/repos
```
Expect `repos` array length 1 containing only that repo.

### 3. Logging out redirects /settings to /
```bash
curl -s -X POST -b "penguin_session=<session-cookie>" http://localhost:3000/api/auth/logout
curl -s -D - http://localhost:3000/settings   # no session cookie
```
Expect HTTP 302 to `http://localhost:3000/`.

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
Expect redirect to `/?error=invalid_state`.

---

## 16. Known Limitations

- This was authored in an environment without PostgreSQL available, so `npm run db:generate`, `db:migrate`, `npm run dev`, and the acceptance checks could not be executed here. Run them locally after installing Node.js and PostgreSQL.
- The `secure` cookie attribute is disabled on `localhost` (HTTP) and enforced in production (HTTPS).
- `GITHUB_PRIVATE_KEY` must be valid PEM; an invalid key will cause `getInstallationAccessToken` to fail.


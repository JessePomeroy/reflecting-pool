# Admin Auth — Setup & Handoff Guide

Better Auth (via Convex) with Google OAuth. An email is allowed to reach
`/admin/*` only if it appears in the `adminEmails` array on the site's
`platformClients` row in Convex. No passwords, no shared tokens, no
user-management surface.

> **History:** this site originally used Auth.js; it was migrated to
> Better Auth + Convex during the audit sweep (see `AUDIT.md`). The old
> Auth.js flow, `ADMIN_EMAIL` env-var allowlist, and `AUTH_TRUST_HOST`
> pattern are all gone — don't re-create them.

---

## How it works

1. User visits any `/admin/*` page.
2. Two layers of auth run in parallel:
   - **Server-side** (`src/routes/admin/+layout.server.ts` →
     `src/lib/server/adminAuth.ts`): reads the Better Auth session
     cookie, validates it by calling `api.adminAuth.whoami` against
     Convex. If the cookie is missing, expired, or tampered with, the
     loader throws 401 — the admin page never renders.
   - **Client-side** (`@jessepomeroy/admin`'s `<AuthGuard>` wrapping
     `<AdminLayout>` in `src/routes/admin/+layout.svelte`): reads the
     session via `authClient.useSession()`, then calls
     `api.adminAuth.checkAdminAccess(email, siteUrl)` to verify the
     email is in `platformClients.adminEmails`. On failure, renders a
     "not authorized" page with a sign-out button.
3. Sign-in flow: `<AuthGuard>` renders `<LoginPage>` → user clicks
   Google → the Better Auth client calls `/api/auth/signin/google` →
   SvelteKit proxies all `/api/auth/*` traffic to Convex
   (`src/routes/api/auth/[...all]/+server.ts`) → Convex's Better Auth
   component handles the OAuth handshake with Google → on callback
   (`/api/auth/callback/google`), a session cookie is set on the site's
   origin.
4. Logout: `authClient.signOut()` clears the session; `<AuthGuard>`
   re-renders the login page.

Session TTL is Better Auth's default (7 days, rolling renewal). To change,
adjust `betterAuth({ ... })` in `convex/auth.ts`.

### Where the pieces live

| File | Purpose |
|---|---|
| `convex/auth.config.ts` | Registers Convex Better Auth component with Convex's auth system |
| `convex/auth.ts` | `betterAuth()` config: secret, trusted origins, social provider, DB adapter |
| `convex/adminAuth.ts` | `whoami` (server-side session validator) + `checkAdminAccess` (allowlist check) |
| `convex/authHelpers.ts` | `requireAuth`, `requireSiteAdmin`, `requireWebhookCallerOrAuth` — used inside every admin mutation/query |
| `src/lib/auth/client.ts` | Lazy Better Auth browser client (SSR-safe — audit H26) |
| `src/lib/server/adminAuth.ts` | `requireAuth(cookies)` / `requireAuthWithIdentity(cookies)` — used in every admin `+*.server.ts` loader |
| `src/routes/api/auth/[...all]/+server.ts` | SvelteKit → Convex reverse proxy for all `/api/auth/*` requests |
| `src/routes/admin/+layout.svelte` | `<AuthGuard><AdminLayout>` — client-side guard + UI chrome |
| `src/routes/admin/+layout.server.ts` | Calls `requireAuth(cookies)` before fetching tier data |

---

## Required environment variables

Set these in BOTH Vercel (Settings → Environment Variables) AND on the
Convex deployment (`npx convex env set <NAME> <VALUE>`). Convex functions
don't see Vercel's env, so the values must be mirrored.

| Variable | What it is | Where | How to get it |
|---|---|---|---|
| `BETTER_AUTH_SECRET` | Signs session tokens | Vercel + Convex | `openssl rand -base64 32` |
| `AUTH_SECRET` | Legacy signing key (kept for compatibility with some Better Auth plugins) | Vercel | `openssl rand -base64 32` (different value from `BETTER_AUTH_SECRET`) |
| `SITE_URL` | Base URL Better Auth uses to build callback URLs | Vercel + Convex | e.g. `https://margarethelena.com` |
| `AUTH_GOOGLE_ID` | Google OAuth client ID | Vercel + Convex | Google Cloud Console (see below) |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret | Vercel + Convex | Google Cloud Console |
| `PUBLIC_CONVEX_URL` | Convex API URL | Vercel | `https://<slug>.convex.cloud` |
| `PUBLIC_CONVEX_SITE_URL` | Convex site URL (auth proxy target) | Vercel | `https://<slug>.convex.site` |

> **Don't set `ADMIN_EMAIL` for auth.** In this codebase `ADMIN_EMAIL` is
> used only for the Stripe/LumaPrints notification recipient — auth
> allowlist lives in Convex (see "Admin allowlist" below).

Generate a different `BETTER_AUTH_SECRET` per environment (dev vs prod). If
they match, a dev-signed cookie would validate in prod.

---

## Admin allowlist

The list of emails allowed into `/admin` is a field on the site's
`platformClients` row:

```ts
platformClients: defineTable({
  name: v.string(),
  email: v.string(),
  siteUrl: v.string(),                // matches adminConfig.siteUrl
  adminEmails: v.array(v.string()),   // lowercased, exact match
  // ... tier, subscriptionStatus, etc.
})
```

`api.adminAuth.checkAdminAccess` (queried by `<AuthGuard>`) and
`requireSiteAdmin` (used inside Convex mutations) both look up this row
by `siteUrl` and check that the authenticated user's email is in
`adminEmails`.

### Add an admin

Convex Dashboard → Data → `platformClients` → the row with the site's
siteUrl → edit `adminEmails` array → add the lowercased email.

Or via mutation:

```bash
npx convex run platform:updateClient '{
  "clientId": "<row _id from Convex dashboard>",
  "adminEmails": ["margaret@margarethelena.com", "assistant@margarethelena.com"]
}'
```

The change is live immediately (Convex queries are reactive). The new
admin still needs to be a Google OAuth **test user** (see below) if the
app is in Testing mode.

### Remove an admin

Same as above — remove the email from the `adminEmails` array.

No code change, no redeploy.

---

## Part 1 — Developer setup (you, locally)

### 1. Create a Google OAuth client

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials).
2. **Create a project** if you don't have one ("Reflecting Pool" is fine).
3. Open the **OAuth consent screen** tab:
   - User type: **External**
   - App name: `Reflecting Pool Admin` (or whatever)
   - User support email + developer email: your email
   - Scopes: add `userinfo.email` and `userinfo.profile`
   - **Test users**: add your personal Gmail, plus the client's email when you're ready
   - Leave the app in **Testing** mode (don't submit for verification — not needed for <100 admins)
4. Back on **Credentials** → **Create Credentials** → **OAuth client ID**:
   - Application type: **Web application**
   - Name: `Reflecting Pool — Admin`
   - **Authorized redirect URIs**:
     ```
     http://localhost:5173/api/auth/callback/google
     http://localhost:5174/api/auth/callback/google
     ```
   - Click **Create** → copy the **Client ID** and **Client secret**.

### 2. Add env vars

Populate `.env.local` (or copy from `.env.example`):

```bash
BETTER_AUTH_SECRET="$(openssl rand -base64 32)"
AUTH_SECRET="$(openssl rand -base64 32)"
SITE_URL=http://localhost:5173
AUTH_GOOGLE_ID=<Client ID>
AUTH_GOOGLE_SECRET=<Client Secret>
PUBLIC_CONVEX_URL=https://<your-deployment>.convex.cloud
PUBLIC_CONVEX_SITE_URL=https://<your-deployment>.convex.site
```

Mirror the Convex-side values:

```bash
npx convex env set BETTER_AUTH_SECRET "<same value as .env.local>"
npx convex env set SITE_URL "http://localhost:5173"
npx convex env set AUTH_GOOGLE_ID "<Client ID>"
npx convex env set AUTH_GOOGLE_SECRET "<Client Secret>"
```

### 3. Seed a dev `platformClients` row

Until there's an onboarding UI, add a row manually:

```bash
npx convex run platform:createClient '{
  "name": "Reflecting Pool",
  "email": "your-email@example.com",
  "siteUrl": "reflecting-pool.com",
  "tier": "full",
  "subscriptionStatus": "active",
  "adminEmails": ["your-gmail@gmail.com"]
}'
```

(`siteUrl` must match `adminConfig.siteUrl` in `src/lib/config/admin.ts`.
For Maggie's deployment, use `margarethelena.com` or whatever you set
the admin config to.)

### 4. Test

Restart dev (env vars only load at boot):

```bash
pnpm dev
```

Visit `http://localhost:5173/admin`. You should hit the `<AuthGuard>`
login page. Click **Sign in with Google**, approve, and land on the
dashboard.

If you see the "not authorized" screen after signing in, your Gmail
isn't in the `adminEmails` array on the seeded row. Check for typos or
capitalization — the check is case-insensitive but whitespace-sensitive.

---

## Part 2 — Deploying to production

### 1. Add the production redirect URI

Google Cloud Console → your OAuth credential → **Authorized redirect
URIs** → add:

```
https://<production-domain>/api/auth/callback/google
```

Keep the localhost URIs — you still need them for dev.

### 2. Set production env vars

Vercel Dashboard → Settings → Environment Variables:

| Variable | Value |
|---|---|
| `BETTER_AUTH_SECRET` | **Generate a new one** — different from dev |
| `AUTH_SECRET` | **Generate a new one** — different from dev |
| `SITE_URL` | `https://<production-domain>` |
| `AUTH_GOOGLE_ID` | Same as dev (one OAuth client covers both) |
| `AUTH_GOOGLE_SECRET` | Same as dev |
| `PUBLIC_CONVEX_URL` | Production Convex deployment `.convex.cloud` URL |
| `PUBLIC_CONVEX_SITE_URL` | Production Convex `.convex.site` URL |

Mirror to production Convex:

```bash
npx convex env set BETTER_AUTH_SECRET "<prod value>" --prod
npx convex env set SITE_URL "https://<domain>" --prod
npx convex env set AUTH_GOOGLE_ID "<value>" --prod
npx convex env set AUTH_GOOGLE_SECRET "<value>" --prod
```

### 3. Seed the production `platformClients` row

Run against production:

```bash
npx convex run platform:createClient --prod '{
  "name": "Margaret Helena",
  "email": "margaret@margarethelena.com",
  "siteUrl": "reflecting-pool.com",
  "tier": "full",
  "subscriptionStatus": "active",
  "adminEmails": ["margaret@margarethelena.com", "you@example.com"]
}'
```

Include your own email temporarily so you can verify the flow.

### 4. Verify

Deploy, visit `https://<domain>/admin`, sign in with an email in
`adminEmails`, confirm you reach the dashboard.

---

## Part 3 — Handing off to the client

Do this **after** the site is live in production.

### Before handoff (you still have access)

1. **Add the client's email as a Google Cloud test user**: Google Cloud
   Console → OAuth consent screen → Test users → Add users.
2. **Confirm the client's email is in `adminEmails`** on the production
   `platformClients` row (via Convex Dashboard or the `platform:updateClient`
   mutation). No redeploy needed — the query is live-reactive.
3. **Have the client test login** on a screenshare. They should hit
   `/admin`, click the Google button, approve, and land on the dashboard.
4. If they see an **unverified app warning** — that's expected while the
   OAuth app is in Testing mode. They click "Advanced" → "Go to
   Reflecting Pool Admin (unsafe)". (It's safe; Google just hasn't
   verified the app. Not worth submitting for verification unless
   you want >100 users.)

### At handoff

| Thing | What to do |
|---|---|
| Google Cloud project | Add the client as **Owner** in IAM so they can rotate OAuth credentials later |
| Vercel project | Add them as a team member or transfer ownership |
| Convex project | Add them as a member (Admin role) in the Convex dashboard |
| Domain registrar | Transfer if desired |
| Secrets | Share production env var values via a password manager (1Password, Bitwarden) |
| Docs | Tell them `ADMIN-AUTH.md` (this file) covers the auth setup |

### After handoff

- **Remove your email from `adminEmails`** on the production
  `platformClients` row (keep a dev copy for maintenance).
- **Keep yourself as a Google Cloud test user** so you can re-add
  yourself temporarily for future maintenance work.

---

## Adding or removing admins later

Edit `platformClients.adminEmails` on the appropriate row in Convex.
Either:

- Convex Dashboard → Data → `platformClients` → edit the row directly, or
- Run `npx convex run platform:updateClient '{ "clientId": "...", "adminEmails": [...] }'`

The change takes effect immediately. No redeploy required.

If the new person isn't a Google Cloud Console test user yet, add them
there too, or they'll hit the unverified-app warning.

---

## Common problems

**"not authorized" screen after signing in**
Email isn't in `platformClients.adminEmails` for the current site. Check
for typos, trailing whitespace, or capitalization. The allowlist check
is case-insensitive but the email has to otherwise match what Google
returns.

Also check that `adminConfig.siteUrl` in `src/lib/config/admin.ts`
matches the `siteUrl` on the `platformClients` row. If they diverge,
`checkAdminAccess` won't find the row and will return `authorized: false`.

**401 immediately on `/admin` loader (no login screen shown)**
The server-side `requireAuth(cookies)` in `src/lib/server/adminAuth.ts`
is rejecting the cookie. Usually one of:
- Cookie is missing (not signed in yet — expected on first visit)
- `PUBLIC_CONVEX_URL` env var missing — `adminAuth.ts` fails closed
- Convex deployment is down or the session expired

**Redirect URI mismatch error from Google**
The callback URL isn't in **Authorized redirect URIs** in Google Cloud
Console. Common causes:
- Dev server on an unexpected port → add that port's URI
- Production deployed to a new domain → add the new domain's URI
- Missing `https://` or wrong subdomain

**Infinite login redirect loop**
`SITE_URL` env var doesn't match the domain the browser is on. Better
Auth builds callback URLs from `SITE_URL`; a mismatch (e.g. `www.` vs
bare) prevents the cookie from being set on the right origin.

**Sign in works but admin pages still redirect to login**
`PUBLIC_CONVEX_SITE_URL` isn't set, so the `/api/auth/[...all]` proxy is
sending requests to the wrong host. Check Vercel env — the value should
be the `.convex.site` URL (NOT `.convex.cloud`).

**Auth works locally but not in preview deploys**
Preview deploys get random URLs from Vercel. Either:
- Add wildcard patterns to `trustedOrigins` in `convex/auth.ts`
- Or add each preview URL to the Google Cloud Console redirect list
- Or (easiest) test auth only on production + localhost

---

## Rotating secrets

**Rotate `BETTER_AUTH_SECRET`** — invalidates all existing sessions
(everyone gets signed out).

```bash
NEW="$(openssl rand -base64 32)"
# Vercel: update the env var value → trigger redeploy
npx convex env set BETTER_AUTH_SECRET "$NEW" --prod
```

**Rotate `AUTH_GOOGLE_SECRET`** — do this if the client secret is ever
exposed:

1. Google Cloud Console → your OAuth client → **Add secret** (this
   creates a second active secret)
2. Update env var in Vercel AND Convex (`--prod`) → redeploy
3. After 24 hours of no failures, **Delete old secret** in Google Cloud

**Rotate `AUTH_SECRET`** — less critical than `BETTER_AUTH_SECRET`
(mostly used by Better Auth plugins). Rotate when handing off to a new
owner.

---

*Last updated: 2026-04-23 — migrated from Auth.js to Better Auth*

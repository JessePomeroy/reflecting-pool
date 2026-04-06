# Admin Auth — Setup & Handoff Guide

Google OAuth with an email allowlist. Only emails listed in `ADMIN_EMAIL`
can complete the OAuth flow and reach `/admin/*`. No passwords, no shared
tokens, no user-management surface.

---

## How it works

1. User visits any `/admin/*` page.
2. If no session → redirected to `/admin/login?next=<original-url>`.
3. Click **Sign in with Google** → Auth.js redirects to Google.
4. Google asks the user to approve → redirects back to `/auth/callback/google`.
5. Auth.js checks the returned email against `ADMIN_EMAIL`.
   - Match → session cookie set → redirected to the original URL.
   - No match → back to `/admin/login?error=AccessDenied`.

Session is a signed JWT cookie (expires after 30 days by default, extended on
each request). Logout clears the cookie.

All flow logic lives in:

- `src/auth.ts` — Auth.js config, provider, allowlist callback.
- `src/hooks.server.ts` — chains Auth.js's handler, populates `locals.user`.
- `src/lib/server/auth.ts` — `isAdmin()` and `requireAdmin()` helpers.
- `src/routes/admin/+layout.server.ts` — calls `requireAdmin()` on every admin page.

---

## Required environment variables

| Variable | What it is | How to get it |
|---|---|---|
| `AUTH_SECRET` | JWT signing secret | `openssl rand -base64 32` |
| `AUTH_GOOGLE_ID` | Google OAuth client ID | Google Cloud Console (see below) |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret | Google Cloud Console |
| `ADMIN_EMAIL` | Comma-separated email allowlist | Google account(s) allowed to log in |
| `AUTH_TRUST_HOST` | Trust `Host` header | Set to `true` in production only |

**Generate a different `AUTH_SECRET` for dev and prod.** If they match, a
dev-signed cookie would validate in prod.

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
     http://localhost:5173/auth/callback/google
     http://localhost:5174/auth/callback/google
     ```
   - Click **Create** → copy the **Client ID** and **Client secret**.

### 2. Add to `.env`

```
AUTH_SECRET=<paste output of: openssl rand -base64 32>
AUTH_GOOGLE_ID=<Client ID>
AUTH_GOOGLE_SECRET=<Client secret>
ADMIN_EMAIL=your-personal-gmail@gmail.com
```

### 3. Test

Restart the dev server (env vars only load at boot).

```
pnpm dev
```

Visit `http://localhost:5173/admin`. You should be redirected to
`/admin/login`. Click **Sign in with Google**, choose your account, approve
the consent screen, and you should land on the dashboard.

If you see `AccessDenied` after signing in, the email you signed in with
doesn't match `ADMIN_EMAIL`. Check that the value is lowercased and exact.

---

## Part 2 — Deploying to production

### 1. Add the production redirect URI

Back in Google Cloud Console → your OAuth credential → **Authorized redirect
URIs** → add:

```
https://<production-domain>/auth/callback/google
```

Replace `<production-domain>` with the actual domain (e.g.
`https://margarethelena.com`). Keep the localhost URIs — you still need them
for dev.

### 2. Set production env vars on your host (Vercel / Netlify / etc.)

| Variable | Value |
|---|---|
| `AUTH_SECRET` | **Generate a new one** with `openssl rand -base64 32` |
| `AUTH_GOOGLE_ID` | Same Client ID as dev (one OAuth client works for both) |
| `AUTH_GOOGLE_SECRET` | Same Client Secret as dev |
| `ADMIN_EMAIL` | Production admin's email |
| `AUTH_TRUST_HOST` | `true` |

`AUTH_TRUST_HOST=true` is required on most serverless hosts. Without it,
Auth.js won't trust the `Host` header when building redirect URLs.

### 3. Verify

Deploy, visit `https://<domain>/admin`, sign in with the email in
`ADMIN_EMAIL`, confirm you reach the dashboard.

---

## Part 3 — Handing off to the client

Do this **after** the site is live in production.

### Before handoff (you still have access)

1. **Add the client's email to the test users list** in Google Cloud Console
   → OAuth consent screen → Test users → Add users.
2. **Add the client's email to `ADMIN_EMAIL`** in production env vars
   alongside yours (comma-separated):
   ```
   ADMIN_EMAIL=you@example.com,margaret@example.com
   ```
3. Redeploy (most hosts rebuild when env vars change).
4. **Have the client test login** while you're on the phone/screen-share.
   They should hit `/admin`, click the Google button, approve, and land on
   the dashboard.
5. If they see an **unverified app warning** — that's expected while the
   OAuth app is in Testing mode. They can click "Advanced" → "Go to
   Reflecting Pool Admin (unsafe)" to proceed. (It's safe; Google just
   hasn't verified the app. For a 1-admin site it's not worth submitting
   for verification.)

### At handoff

Hand over the following:

| Thing | What to do |
|---|---|
| Google Cloud project | Add the client as **Owner** in IAM so they can rotate OAuth credentials later |
| Hosting account (Vercel/Netlify) | Add them as a team member or transfer ownership |
| Domain registrar | Transfer if desired |
| `.env` values | Share production env vars via a password manager (1Password, Bitwarden) |
| This document | Tell them `ADMIN-AUTH.md` covers what they need |

### After handoff

- **Remove your email from `ADMIN_EMAIL`** on production (but keep it in dev).
- Keep yourself as a **test user** in Google Cloud Console → OAuth consent
  screen, so you can still sign in during future maintenance work if they
  re-add you to `ADMIN_EMAIL` temporarily.

---

## Adding or removing admins later

Edit the `ADMIN_EMAIL` env var on your host. Redeploy (or trigger an env-var
reload if your host supports it). That's the whole flow — no code changes.

```
ADMIN_EMAIL=margaret@example.com,assistant@example.com
```

If the person isn't already a test user in the Google Cloud Console → OAuth
consent screen, add them there too, or they'll hit the unverified-app
warning.

---

## Common problems

**"AccessDenied" after signing in**
Email doesn't match `ADMIN_EMAIL`. Check for typos, trailing whitespace,
capitalization. The allowlist check is case-insensitive but the email has to
otherwise match exactly what Google returns.

**"Configuration" error on login**
One of `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` is missing or
malformed. Check env vars on your host.

**Redirect URI mismatch error from Google**
The callback URL the app is using isn't in the **Authorized redirect URIs**
list in Google Cloud Console. Usually caused by:
- Dev server on an unexpected port (add that port's URI)
- Production deployed to a new domain (add the new domain's URI)
- Missing trailing slash or http/https mismatch

**Session expires too quickly**
Auth.js JWT sessions default to 30 days with rolling renewal. If you want a
different duration, add `session: { maxAge: 60 * 60 * 24 * 90 }` (90 days)
to the config in `src/auth.ts`.

**Logged in but admin pages still redirect to /admin/login**
Likely `AUTH_TRUST_HOST` is not set in production. Auth.js is building
callback URLs with the wrong host, so the session cookie isn't valid for
the current domain.

---

## Rotating secrets

**Rotate `AUTH_SECRET`** — invalidates all existing sessions (everyone gets
signed out).

```
openssl rand -base64 32  # paste into host env vars → redeploy
```

**Rotate `AUTH_GOOGLE_SECRET`** — do this if the client secret is ever
exposed. In Google Cloud Console → your OAuth client → **Add secret** →
update env var → redeploy → **Delete old secret** after 24h.

---

*Last updated: 2026-04-05*

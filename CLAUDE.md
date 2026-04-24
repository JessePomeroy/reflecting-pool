# CLAUDE.md — reflecting-pool

Last updated: 2026-04-23

## What this is

reflecting-pool is Margaret Helena's fine-art photography site (prod:
**zippymiggy.com**). It plays two roles at once:

1. Maggie's bespoke site (first real client).
2. The forking template for future client spokes (client #3+) — you fork
   this repo, redesign the visual layer, keep the plumbing.

## Platform at a glance

Jesse is the platform operator running a photographer-SaaS. Each client
site is a spoke; **angelsrest** is both Jesse's own photography site AND
the super-admin hub that aggregates across all spokes.

**Deployment model: per-client Convex projects.**
- One Convex project per client (dev deployment + prod deployment pair).
- Schema + functions live in `angelsrest/convex/`; the same codebase
  deploys to every project via per-client `CONVEX_DEPLOY_KEY`.
- `platformClients.siteUrl` is the tenancy key inside each deployment
  (effectively one row on spoke deployments; the full roster on
  angelsrest's deployment).
- Dev is currently one shared deployment (`acoustic-kiwi-347`) as a
  Gap-1 consolidation convenience; prod is per-client.

**Client-owned accounts** (client pays, owns identity; if Jesse walks
away, client keeps these):
- Sanity — own project, own Studio repo.
- Stripe — Connect Express account under Jesse's platform; photographer
  receives payouts directly, Jesse takes an application fee on print
  sales.
- LumaPrints — own account (own API key + store ID).
- Cal.com — own account.
- Google OAuth — own Google Cloud project + credentials. Prevents
  Jesse's account being a SPOF for every client's "sign in with Google."

**Operator-owned accounts** (Jesse's, across all spokes):
- Vercel — one team, project per client.
- Cloudflare — shared Worker + R2 for gallery storage.
- GitHub — one account, repo per client.
- Sentry — one org, **project per client** (quota isolation + routing).
- Resend — one account, client domains verified (DNS records on
  client's registrar; From addresses match the client's brand).

**The client's two logins (all they ever see):**
1. Sanity Studio (their project) — edits galleries + catalog.
2. `<their-domain>/admin` — Better Auth gates via
   `platformClients.adminEmails`. Basic tier = Dashboard + Orders +
   Inquiries + Galleries. Subscription unlocks CRM + Board + Invoicing
   + Quotes + Contracts + Emails + Messages.

## Repo layout

- Frontend: SvelteKit, this repo → `zippymiggy.com`.
- Backend (Convex) schema + functions live in
  `/Users/jessepomeroy/Documents/work/angelsrest/convex/`.
  Types consumed here via `@jessepomeroy/crm-api` (linked for local dev,
  published to GitHub Packages for prod).
- Admin UI: `@jessepomeroy/admin` npm package — 60 components + server
  handler factories + tier gating.
- Sanity Studio: separate repo per client (not yet created for
  reflecting-pool — pending H42a).

## Aesthetic (reflecting-pool specific)

- Font: `Cormorant` serif via Google Fonts, preloaded in
  `+layout.svelte`. Use `var(--font-serif)`.
- Palette: `--ink: #1a1f2e`, `--paper: #f0f4f8`. Apply via
  `rgba(var(--ink-rgb), X)` / `rgba(var(--paper-rgb), X)` so opacity
  variations stay legible over the gradient.
- Background: global caustics video + ink-to-paper gradient in
  `+layout.svelte`. Don't double this on per-page backgrounds.
- Tone: lowercase headings, letter-spacing 0.1–0.15em, weight 300,
  muted opacity (0.4–0.8). Italic accents for secondary text.
- Buttons: transparent background, 1px `rgba(paper, 0.3)` border,
  `min-height: 44px` (mobile a11y). Hover increases opacity; no fill.
- Reference pages: `src/routes/about/+page.svelte`,
  `src/routes/delivery/[token]/+page.svelte`.

Other clients will have different aesthetics — this section is
reflecting-pool's only.

## Key architectural facts

1. **Sanity = CMS only.** `src/lib/server/sanity.ts` reads gallery +
   print catalog. Currently mocked until Maggie's Sanity project is
   live (H42a).
2. **Orders live in Convex, not Sanity.** Stripe + LumaPrints webhooks
   call `api.orders.create` / `api.orders.updateStatus` /
   `api.orders.getByLumaprintsOrderNumber` via `@jessepomeroy/crm-api`.
   Idempotency via the `by_stripeSessionId` index — retries are safe.
3. **Admin auth = "HTTP-proxy for mutations, JWT on socket for
   queries."** Browser Convex WebSocket authed via `/api/admin/token`
   (cookie → JWT). `setupAuth(() => ({ isAuthenticated:
   data.isAuthenticated, ... }))` where `data.isAuthenticated` comes
   from `+layout.server.ts`'s `requireAuthWithIdentity` (NOT
   `authClient.useSession()` — that re-introduces the pause bug in
   `@mmailaender/convex-better-auth-svelte@0.7.3`). Mutations route
   through `/api/admin/mutation/+server.ts`. See the PR candidate in
   `~/Documents/quilt/00_inbox/` for the full design.
4. **Auth proxy uses `createSvelteKitHandler()`.** Hand-rolled fetch()
   proxies break multi-Set-Cookie responses (known SvelteKit issue);
   the canonical handler preserves each cookie via `getSetCookie()`.
   Background in AUDIT.md's five-layer fix reflection.
5. **JWKS auto-rotate is on** (`jwksRotateOnTokenGenerationError: true`
   in `angelsrest/convex/auth.ts`). Self-heals
   `ERR_JOSE_NOT_SUPPORTED` silently-swallowed failures during
   algorithm migration. Safe to leave on permanently.
6. **`galleries.updateImage` is intentionally unauthed** — the
   customer-facing `/delivery/[token]` page calls it to toggle
   `isFavorite`. Tightening requires a token-authorized variant.
7. **Convex is single-tenant per deployment today** — `requireAuth`
   effectively equals `requireSiteAdmin`. The helpers are shaped for
   the multi-client-aware admin-package template; don't remove
   `requireSiteAdmin` even when it looks redundant.

## Canonical docs

**In-repo** (technical + tooling-consumed):
- `AUDIT.md` — live audit (44 items open). Commits cite audit IDs.
  Session reflections at the bottom include the five-layer Better Auth
  fix (2026-04-23).
- `AGENTS.md` — dev workflow for this repo.
- `ARCHITECTURE.md` — animation/parallax architecture.
- `LUMAPRINTS.md` — LumaPrints integration reference.
- `SANITY-SCHEMA.md` — schema definitions for H42a un-mock.

**Obsidian vault** (generalized, operator-facing):
- `02_reference/agentic-engineering/Our Agentic Workflow.md` — Jesse's
  blueprint for agent interactions. Follow this when spawning
  sub-agents.
- `02_reference/projects/photographer_crm/client-onboarding-workflow.md`
  — canonical 9-phase client onboarding runbook (Phase 0 scoping →
  Phase 9 handoff). Use for every new client.
- `02_reference/projects/reflecting pool/client-handoff.md` — pricing +
  launch sequence + client-training content specific to Maggie.
- `02_reference/projects/reflecting pool/testing-pipeline.md` —
  before-launch QA checklist.

## Working with Claude

Autonomy dial (Jesse's preferences, 2026-04-23):

| Action | Default |
|---|---|
| Reads, git status/log | Free |
| Run tests, typecheck, lint | Free |
| Install / remove deps | **Ask** |
| Commit code changes | **Ask** |
| Commit doc changes | **Ask** |
| Push to remote, open PRs | **Ask** |
| Spawn sub-agents for research | Default-on |
| Parallel tool calls | Default-on |
| Propose + execute refactor without review | Sometimes — collaborative |

Style: concise over comprehensive. Brutal honesty on tradeoffs. Todo
lists when work is multi-step. Sub-agent prompts follow the blueprint
pattern in `Our Agentic Workflow.md` (`[READ]` / `[AGENT]` / `[DET]` /
`[REPORT]` steps, explicit scope constraints, never push to main).

Non-negotiables (always ask before touching):
- Public-facing aesthetic (`Cormorant`, ink/paper palette, lowercase
  tone).
- Audit IDs — never renumber closed ones, only append.
- Anything in `convex/_generated/` — regenerate via CLI, don't hand-edit.
- Copy/text content destined for Sanity.
- Env var names + shapes.
- Session memory / reflections — append, never delete.

## Current state

**Pick up here:** last session ended 2026-04-23; full debrief at
`~/Documents/quilt/02_reference/projects/reflecting pool/
session-2026-04-23-debrief.md`. Next action: Phase 0 of the Option A
migration (backup + verify, no infrastructure changes).

**In dev:** admin dashboard signs in, queries work, mutations via
HTTP-proxy work. Five-layer Better Auth fix landed 2026-04-23.

**In prod:** angelsrest.online is live with plain Stripe (not Connect).
reflecting-pool prod not yet provisioned (no dedicated Convex project;
`loyal-swan-967` is angelsrest's, not to be reused).

**Blocked on Maggie:** Sanity project creation (H42a). Jesse is
pre-creating the project under his account and will transfer admin to
Maggie at handoff.

**Option A migration pending.** reflecting-pool prod needs its own
Convex project before launch. Stripe Connect Express needs wiring
before client #2 takes real orders. Spec for this work: see
`~/Documents/quilt/02_reference/projects/reflecting pool/option-a-
migration.md` (to be written after this CLAUDE.md lands).

**User actions pending** (only Jesse can do these):
1. Rotate secrets per C11 (`GALLERY_ADMIN_SECRET`,
   `AUTH_GOOGLE_SECRET`, `AUTH_SECRET`, `BETTER_AUTH_SECRET`).
2. Set `WEBHOOK_SECRET` + `LUMAPRINTS_WEBHOOK_SECRET` on Vercel +
   each Convex deployment.
3. GitHub branch protection on `main` (H35).
4. `zippymiggy.com` DNS → Vercel; add as production domain with apex
   → www redirect.

## Useful commands

```bash
pnpm dev                  # vite dev server
pnpm check                # svelte-kit sync + svelte-check
pnpm tsc --noEmit         # TS-only typecheck (faster than svelte-check)
pnpm lint                 # biome check .
pnpm test                 # vitest run

# Convex tooling lives in angelsrest. Regenerate types after a schema
# change:
cd ../angelsrest && npx convex dev
# Change flows back here through the linked @jessepomeroy/crm-api
# package — no install needed.
```

## Commit style

Audit-related commits: `audit <tier>: <short description> (C1/C2/...,
H3/H4/...)`. Reference closed audit IDs so `AUDIT.md` + commit history
stay in sync.

Non-audit commits: conventional commits (`fix`, `feat`, `chore`,
`docs`, `refactor`) with scope where useful.


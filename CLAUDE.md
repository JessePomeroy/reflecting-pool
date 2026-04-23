# CLAUDE.md — session memory for reflecting-pool

Last updated: 2026-04-23 (prod domain = zippymiggy.com; Sanity scoped to
CMS-only; orders migrating from Sanity → Convex)

## Platform model

reflecting-pool is one spoke of a platform-operator model. Jesse owns
and maintains the platform; clients (Maggie here, future photographers
later) consume it. The split dictates who owns which third-party
account and blocks on whom for launch.

**Operator-owned (Jesse's accounts across all client sites):**
- **Vercel** — all spoke hosting, one team; each client gets a project.
- **Cloudflare** — Worker + R2 for gallery image storage; one account
  serves every site.
- **Convex** — one codebase in `angelsrest`, multiple deployments (one
  per spoke). Tenancy key is `platformClients.siteUrl`.
- **Sentry, GitHub, Resend** — operator tooling. Resend verifies each
  client's domain for outbound `from`, but the account is Jesse's.

**Client-owned (Maggie's accounts, per-client):**
- **Sanity** — each client has their own project/org. Client signs up,
  invites Jesse as Administrator, hands over project ID + API token.
  `platformClients.sanityProjectId` is where the ID lives on the
  Convex side.
- **Stripe** — each client has their own account (identity, bank,
  payouts). Client hands over publishable/secret/webhook-signing keys.
- **LumaPrints** — each client has their own supplier account (billing
  card, store ID). Client hands over API key + secret + store ID.
- **Domain** — each client owns their domain at a registrar. Client
  points DNS at Vercel (or delegates nameservers to Jesse).

**The client's two logins (the only interfaces she ever sees):**
1. **Sanity Studio** for her project — she edits galleries + catalog.
2. **`<her-domain>/admin`** — Better Auth gates via
   `platformClients.adminEmails`; the admin dashboard package renders
   orders, stats, inquiries, gallery management.

She does NOT see Vercel, Cloudflare, Convex, Sentry, GitHub, or any of
the operator-side infrastructure. If the operator walks away entirely,
the client keeps Sanity + Stripe + LumaPrints + domain — the content +
money + identity. Everything else is replaceable.

Practical implication: H42a (Sanity un-mock) blocks on the client
creating their Sanity project, not on the operator. Same pattern as
Stripe / LumaPrints keys.

## Prod domain

**`https://www.zippymiggy.com/`** is the production URL. Apex
`https://zippymiggy.com` should redirect to the `www` host (configure at
registrar / Vercel). Until DNS is live, treat the domain as a hard-coded
future reference — do not deploy without it.

Config touch-points that depend on the domain:
- `adminConfig.siteUrl` in `src/lib/config/admin.ts` → `"zippymiggy.com"`
  (bare domain, no scheme, no www — the key `platformClients.siteUrl`
  matches against).
- `platformClients.siteUrl` in Convex (via `ensureSiteAdmin`):
  `"zippymiggy.com"`.
- Convex env `SITE_URL` on the `--prod` deployment:
  `npx convex env set --prod SITE_URL https://www.zippymiggy.com`.
- `trustedOrigins` in `angelsrest/convex/auth.ts` must enumerate both
  `https://www.zippymiggy.com` and `https://zippymiggy.com` alongside the
  angelsrest entries (single Convex codebase, multi-deploy — one list
  covers both sites' origins).
- Vercel env: `SITE_URL`, `PUBLIC_SITE_URL`.

## Repo snapshot

- **reflecting-pool** is Margaret Helena's fine-art photography site
  (prod: **zippymiggy.com**). SvelteKit + Convex + Better Auth + Sanity
  (CMS only, currently mocked) + LumaPrints (print fulfillment) + Stripe
  (checkout) + a Cloudflare Worker for gallery image storage.
- **Admin UI** is consumed from `@jessepomeroy/admin` (a separate repo at
  `/Users/jessepomeroy/Documents/work/admin-dashboard`). The admin package
  ships components + server handlers only; it calls this repo's Convex
  functions via a Proxy alias (`api.galleryDelivery` → `api.galleries`).
- **Convex schema + functions live in angelsrest** (Gap 1 consolidation,
  2026-04-23). This repo consumes generated API types via
  `@jessepomeroy/crm-api` (linked via `link:../angelsrest/packages/crm-api`
  for local dev; published to GitHub Packages for prod). The SvelteKit
  `$convex` alias now points at that package. No more `convex/` folder
  here, and `npx convex dev` is run from angelsrest, not here.
- **angelsrest** at `/Users/jessepomeroy/Documents/work/angelsrest` is the
  reference implementation. When in doubt, check angelsrest's equivalent
  — most patterns here were ported wholesale.

## Canonical docs

- `AUDIT.md` — live audit findings + session reflection at the end.
- `AGENTS.md` — dev workflow doc. Prefer over ad-hoc instructions.
- `CLIENT-HANDOFF.md` — full service-setup + launch checklist for Maggie
  (see the top "For Maggie — launch sequence" section). Also covers
  pricing + client-training content.
- `ADMIN-AUTH.md` — **stale**: describes Auth.js, reality is Better Auth.
  Update when time allows.
- `TESTING-PIPELINE.md` — step-by-step testing guide for before-launch
  QA.

## Aesthetic vocabulary

- **Font**: `Cormorant` serif (Google Fonts, preloaded in
  `+layout.svelte`). Use `var(--font-serif)`.
- **Palette**: `--ink: #1a1f2e`, `--paper: #f0f4f8`. Always apply via
  `rgba(var(--ink-rgb), X)` / `rgba(var(--paper-rgb), X)` so opacity
  variations stay legible over the site gradient.
- **Background**: global caustics video + ink-to-paper gradient in
  `+layout.svelte`. Don't double this on per-page backgrounds.
- **Tone**: lowercase headings, letter-spacing 0.1–0.15em, weight 300,
  muted opacity (0.4–0.8). Italic accents for secondary text.
- **Buttons**: transparent background, 1px `rgba(paper, 0.3)` border,
  `min-height: 44px` (mobile a11y). Hover increases opacity; no fill.
- **Reference pages**: `src/routes/about/+page.svelte`,
  `src/routes/delivery/[token]/+page.svelte`.

## Key architectural facts

0. **Convex lives in angelsrest, not here** — generated API types are
   consumed via `@jessepomeroy/crm-api` (a thin re-export package at
   `angelsrest/packages/crm-api`). For local dev both repos are checked
   out side-by-side and the package is linked via
   `link:../angelsrest/packages/crm-api` — schema edits in angelsrest are
   immediately visible here (TS re-exports resolve through the symlink,
   Vite transpiles on demand). For prod, `@jessepomeroy/crm-api` is
   published to GitHub Packages by a workflow in angelsrest that
   hash-diffs `convex/_generated/api.d.ts` on every main-branch push and
   auto-bumps the patch version when it changes. First publish requires
   manual intervention — see `angelsrest/packages/crm-api/README.md`.
1. **Sanity = CMS only, orders = Convex.** `src/lib/server/sanity.ts`
   handles gallery/print reads (`fetchPrintableProducts`,
   `fetchCollections`, `fetchCollectionWithPrints`, `fetchPrintProduct`).
   Those are still mocked until the Sanity project is live (audit H42a).
   **Orders do NOT live in Sanity** — the Stripe + LumaPrints webhooks
   write to Convex via `@jessepomeroy/crm-api` (`api.orders.create` /
   `api.orders.updateStatus` / `api.orders.getByLumaprintsOrderNumber`),
   same pattern as angelsrest. C13/C14 idempotency is already enforced
   by the `by_stripeSessionId` index on the Convex orders table. The
   legacy `*SanityOrder` functions were removed on the Sanity → Convex
   migration (2026-04-23); if you see them in an old branch, that's
   pre-migration code.
2. **No `WEBHOOK_SECRET` in prod yet** — needs
   `npx convex env set WEBHOOK_SECRET <value>` AND Vercel. The
   `convex/orders.ts`, `convex/invoices.markPaid`, and
   `convex/platform.updateSubscription` webhook paths fail closed until
   this is set.
3. **Convex is single-tenant per deployment** — `requireAuth` is
   effectively equivalent to `requireSiteAdmin` today, but the helpers
   are shaped for the multi-tenant future (admin-dashboard template
   reuse). Don't remove `requireSiteAdmin` even when it looks redundant.
4. **`galleries.updateImage` is intentionally unauthed** — the
   customer-facing `/delivery/[token]` calls it to toggle `isFavorite`.
   Tightening this requires routing through a token-authorized variant.
5. **Admin auth = "HTTP-proxy for mutations, JWT on socket for queries"**
   — matches angelsrest (2026-04-23). Browser Convex WebSocket is
   authed via `/api/admin/token` (cookie → JWT), driven by
   `setupAuth(() => ({ isAuthenticated: data.isAuthenticated, ... }))`
   where `data.isAuthenticated` comes from `+layout.server.ts`'s
   `requireAuthWithIdentity` call (NOT `authClient.useSession()` — that
   re-introduces the pause bug in
   `@mmailaender/convex-better-auth-svelte@0.7.3`). Mutations route
   through `/api/admin/mutation/+server.ts`, a universal proxy that
   forwards any `api.<mod>.<fn>` by name on a fresh `ConvexHttpClient`.
   See `~/Documents/quilt/00_inbox/2026-04-23 PR candidate —
   convex-better-auth-svelte pause bug.md` for the full design.
6. **Admin identity on `platformClients`** — the
   `platformClients.siteUrl` for this site is `"zippymiggy.com"`
   (bare domain, no scheme; must match what `adminConfig.siteUrl`
   sends). `adminEmails` currently contains `thinkingofview@gmail.com`
   on dev + prod so Jesse can sign in during development.
   **At handoff: swap in Maggie's admin email** via
   `npx convex run platform:ensureSiteAdmin
     '{"siteUrl":"zippymiggy.com","adminEmail":"<maggie-email>"}'`
   on both dev and `--prod`. Keep Jesse's email in the list if ongoing
   admin access is desired, or drop it via a second patch. See
   `convex/platform.ts#ensureSiteAdmin` — it's idempotent and
   append-only. **NB**: any `platformClients` rows still keyed to
   `"reflecting-pool.com"` are pre-domain-decision stubs — re-run
   `ensureSiteAdmin` with the new key or patch them directly.

## Session memory — 2026-04-23 audit sweep

- **Goal**: bring reflecting-pool up to angelsrest parity on the audit.
- **Scope**: 43 of 89 items closed in one session. All 14 CRITICAL done
  except C11 (user-only key rotation). Bulk of HIGH auth + perf + CI.
- **Strategy**: port angelsrest wholesale rather than audit-item-by-item.
- **Remaining priorities**:
  1. User action: rotate `GALLERY_ADMIN_SECRET`, `AUTH_GOOGLE_SECRET`,
     `AUTH_SECRET`, `BETTER_AUTH_SECRET` per C11.
  2. User action: set `WEBHOOK_SECRET` (Vercel + Convex),
     `LUMAPRINTS_WEBHOOK_SECRET` (Vercel).
  3. User action: enable GitHub branch protection on `main` (H35).
  4. User action: set prod Convex `SITE_URL` to the new domain
     (currently still set to `https://angelsrest.online` on
     `loyal-swan-967` — carried over from the angelsrest template).
     Run `npx convex env set --prod SITE_URL https://www.zippymiggy.com`.
     Dev is correctly set to `http://localhost:5173`. Until this lands,
     Better Auth's OAuth callback and `trustedOrigins` on prod redirect
     and compare against the wrong host.
  5. User action: extend `angelsrest/convex/auth.ts` `trustedOrigins` to
     include `https://www.zippymiggy.com` and `https://zippymiggy.com`
     alongside the angelsrest entries, then redeploy both Convex
     deployments (`npx convex deploy` from angelsrest for each).
  6. User action: point `zippymiggy.com` DNS at Vercel and add it as a
     production domain in the Vercel project (with apex → www redirect).
  7. Code: port `convex/stripeFees.ts` for H4 (fee capture scheduled
     action). Requires Node runtime + STRIPE_SECRET_KEY on Convex.
  8. Code (H42 split):
     - **H42a** — un-mock Sanity CMS reads (`fetchPrintableProducts`,
       `fetchCollections`, `fetchCollectionWithPrints`,
       `fetchPrintProduct`) once the Sanity project is created and the
       `gallery` schema is deployed.
     - **H42b** — (**in progress 2026-04-23**) rewrite Stripe +
       LumaPrints webhooks to write orders to Convex via crm-api instead
       of the `*SanityOrder` stubs. Changes to `orders.create`,
       `orders.updateStatus`, new `orders.getByLumaprintsOrderNumber`.
     - **H42c** — port `convex/inquiries.ts` to angelsrest so the admin
       inquiries page stops stubbing `inquiries: []` in
       `src/routes/admin/inquiries/+page.server.ts`; drop the
       `as unknown as AdminAPI` cast in `src/lib/config/admin.ts`.
  9. Code: `@sentry/sveltekit` wire-up (H39), adapter-vercel pin (H38),
     Biome-Svelte re-enable (H37).
  10. Polish: remaining MEDIUM (M2/M3/M5 etc.) and LOW items.

## Useful commands

```bash
pnpm dev                  # vite dev server
pnpm check                # svelte-kit sync + svelte-check
pnpm tsc --noEmit         # TS-only typecheck (faster than svelte-check)
pnpm lint                 # biome check .
pnpm test                 # vitest run

# Convex tooling has moved to angelsrest (Gap 1 consolidation). To
# regenerate types after a schema change, run from angelsrest:
#   cd ../angelsrest && npx convex dev
# The change flows back here through the linked @jessepomeroy/crm-api
# package — no install needed.
```

## Commit style

Audit-related commits follow the pattern:
`audit <tier>: <short description> (C1/C2/..., H3/H4/...)`

Reference the audit IDs closed so `AUDIT.md` + commit history stay in
sync.

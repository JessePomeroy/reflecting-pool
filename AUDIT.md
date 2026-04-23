# Codebase Audit — reflecting-pool

Generated: 2026-04-22

Scope: Convex backend, SvelteKit frontend + server routes, server/lib utilities, and configuration/infrastructure. Matches the format and depth of the recent angelsrest audit.

Severity legend: 🚨 CRITICAL • 🔴 HIGH • 🟡 MEDIUM • ⚪ LOW

## Architectural context

Before the findings list, three repo-shape notes that shape how severe several items are:

1. **Sanity = CMS, Convex = orders** (updated 2026-04-23). Earlier the
   Stripe webhook called `createSanityOrder` / `updateSanityOrder` /
   `findOrderByLumaprintsNumber` with the Convex `orders` table defined
   but unwritten — a "two data stores, half-wired" state. Resolution:
   the domain was mis-named. Sanity is only for CMS reads (gallery
   listings, print catalog). Orders write to Convex from the start,
   mirroring angelsrest. The webhook rewrite (H42b, 2026-04-23)
   replaces the Sanity-order functions with `api.orders.create` /
   `api.orders.updateStatus` / `api.orders.getByLumaprintsOrderNumber`
   via `@jessepomeroy/crm-api`. Idempotency comes for free from the
   `by_stripeSessionId` index; fee capture scheduling works via the
   `stripeFees.captureFeesForOrder` action once H4 lands.

2. **Sanity CMS is still mocked** — but only the CMS reads, not orders.
   `fetchPrintableProducts` / `fetchCollections` /
   `fetchCollectionWithPrints` / `fetchPrintProduct` return static
   sample data (flowers 01–35). Production deploy requires creating the
   Sanity project, defining `gallery` + `image` schemas, and swapping
   the mocks for real `sanityClient.fetch` calls. See H42a. Order-side
   mocks (`createSanityOrder` et al.) are gone — the webhook rewrite
   (H42b) removed them.

3. **No portal / delivery routes yet.** `convex/portal.ts` + the `portalTokens`
   and `galleries*` tables are defined, but there are no `/portal/[token]` or
   `/delivery/[token]` routes in `src/routes/`. Auth holes in those Convex
   functions are live-fire landmines (the functions are callable from any
   Convex client) but no current UI exercises them. Gallery-delivery CRUD is
   similarly dormant.

All three mean the **surface area of usable attack paths today is smaller than
the findings list suggests**. But each of these paths is scheduled to light up:
before wiring the admin UI to real data, before un-mocking Sanity CMS, before
shipping portal/delivery routes, the findings below need to close.

---

## 🚨 CRITICAL — Fix Immediately

### Security / Authorization

- [x] **C1** `convex/adminAuth.ts:4-24` — `checkAdminAccess` is a query that
  accepts an `email` argument and checks whether that email is in
  `platformClients.adminEmails` for the given `siteUrl`. The email is
  client-supplied; `ctx.auth.getUserIdentity()` is never called. A caller with
  any siteUrl can probe arbitrary emails and learn who the admins are.
  _Fix:_ Derive email from `ctx.auth.getUserIdentity()`; ignore the arg or
  keep it only as a consistency check. Add a `requireSiteAdmin(ctx, siteUrl)`
  helper to `authHelpers.ts`.

- [x] **C2** `convex/authHelpers.ts:7-13` — The only auth helper is `requireAuth`
  which checks "logged in" but nothing about site membership. Better Auth
  accepts any Google login; an attacker who signs up with any Google account
  passes `requireAuth` for every site in the system. Every call site that
  relies on `requireAuth` (galleries, patching/deleting helpers, etc.) is
  therefore gated only on "has a Google account" — trivially bypassable.
  _Fix:_ Add `requireSiteAdmin(ctx, siteUrl)` that loads `platformClients` by
  `siteUrl` and asserts `identity.email` is in `adminEmails`. Migrate every
  inline `requireAuth` + siteUrl check to this helper.

- [x] **C3** `convex/platform.ts` — Every query + mutation is public:
  - `listAll` (line 23) returns **every** `platformClients` row including
    adminEmails, stripeCustomerId, stripeSubscriptionId, tier. Cross-tenant
    enumeration of the whole platform.
  - `getBySubscriptionId` (line 29) exposes a client's full admin record
    given a subscription ID.
  - `createClient` (line 39) lets anyone register a new tenant.
  - `updateSubscription` (line 60) lets anyone flip any tenant to `tier: "full"`
    — **free paid-tier escalation**.
  - `updateClient` (line 92) lets anyone edit any tenant.

  _Fix:_ `checkTier` (the only legitimately public one) stays. All others
  need `requireSiteAdmin`, except `updateSubscription` which should be gated
  on a shared `WEBHOOK_SECRET` (same pattern as angelsrest C5).

- [x] **C4** `convex/orders.ts` — `create` (line 32), `updateStatus` (line 74),
  and `list`/`getStats`/`getNextOrderNumber`/`lookup` are all public with no
  auth. `updateStatus` is catastrophic: anyone can mark any order
  `refunded` / `shipped` / `delivered` and inject tracking numbers/URLs.
  `create` is webhook-called today but has no shared-secret gate, so any
  Convex client can insert orders. _Fix:_ Same pattern as angelsrest C4/C5 —
  add `WEBHOOK_SECRET` + `requireWebhookCallerOrAuth` helper; lock admin
  mutations (`updateStatus`, `list`, `getStats`) behind `requireSiteAdmin`;
  keep `lookup` public but POST-body-only (see H-series).

- [x] **C5** `convex/portal.ts` — `createToken` (line 5), `markUsed` (line 28),
  and `listTokens` (line 82) have no auth. Anyone can mint portal tokens for
  any document on any tenant. `getByToken` (line 42) reads a token and
  returns the document without:
  - checking `tokenDoc.used === false`,
  - checking `document.siteUrl === tokenDoc.siteUrl` (cross-tenant leak if
    the schema ever drifts or a document is moved).

  No `/portal/[token]` route exists yet, so this is a **loaded gun with no
  trigger** — but the Convex functions are callable directly. _Fix:_
  `createToken` → `requireSiteAdmin(siteUrl)`. `markUsed` → atomic,
  authed-via-token flow (see C10). `getByToken` → reject when
  `tokenDoc.used`, verify document.siteUrl matches. `listTokens` →
  `requireSiteAdmin`.

- [x] **C6** Catastrophic read-path leak — every admin query is public.
  Missing `requireAuth`/`requireSiteAdmin` on:
  `platform.listAll`, `platform.getBySubscriptionId`;
  `orders.list`, `orders.getStats`, `orders.getNextOrderNumber`;
  `quotes.list`, `quotes.get`, `quotes.listPresets`, `quotes.getNextNumber`;
  `invoices.list`, `invoices.get`, `invoices.getNextNumber`;
  `contracts.list`, `contracts.get`, `contracts.listTemplates`;
  `crm.listClients`, `crm.listClientsPaginated`, `crm.getClient`, `crm.getStats`;
  `emailLog.list`;
  `emailTemplates.list`, `emailTemplates.get`, `emailTemplates.getByCategory`;
  `messages.list`, `messages.allThreads`;
  `tags.listTags`, `tags.getClientTags`;
  `notifications.getUnreadFlags`;
  `activityLog.getClientActivity`;
  `galleries.get`, `galleries.getBySlug`, `galleries.listBySite`, `galleries.listByClient`, `galleries.getImages`, `galleries.getDownloadStats`;
  `portal.listTokens`.

  Admin UI calls these from the browser, so an unauthenticated user pointing
  their own Convex client at the deployment can read everything.
  _Fix:_ `requireSiteAdmin(ctx, siteUrl)` on all of them. Intentional public
  surfaces to leave ungated (with `@audit` comment noting why):
  `platform.checkTier` (landing/portal load), `orders.lookup` (customer
  order status), `galleries.get*` (when token flow lands — gate via token).
  No inquiries route exists today — `/api/contact` is the only public
  write path and it's already gated by rate limit + server-side escape.

- [x] **C7** Same as C6 but for admin mutations — every writer is public:
  `quotes.create/update/markSent/markAccepted/markDeclined/convertToInvoice/remove/createPreset/updatePreset/removePreset`;
  `invoices.create/update/markSent/markPaid/remove`;
  `contracts.create/update/markSent/markSigned/remove/(template CRUD)`;
  `crm.createClient/updateClient/deleteClient`;
  `emailLog.create`, `emailTemplates.create/update/remove`;
  `messages.send/markRead`;
  `tags.createTag/deleteTag/assignTag/removeTag`;
  `notifications.markSeen`;
  `activityLog.logActivity`;
  `galleries.create/update/remove/addImage/removeImage/reorderImages/updateImage/logDownload`;
  `kanban.*` (every mutation);
  `portal.createToken/markUsed`.

  `galleries.updateImage` is particularly bad — _no auth at all_ (not even
  `requireAuth`), so any anonymous caller can flip `isFavorite` on any image.
  _Fix:_ `requireSiteAdmin(ctx, siteUrl)` on all. `galleries.logDownload`
  should migrate to a token-authorized mutation (see C5).

- [x] **C8** `convex/helpers/patching.ts:18-37` + `helpers/deleting.ts` —
  `patchDocument` only calls `requireAuth(ctx)` then checks the document's
  `siteUrl` matches the caller-supplied `siteUrl`. Since every logged-in
  user passes `requireAuth`, and the caller supplies `siteUrl`, the
  ownership check is vacuous: any authenticated user patches any tenant's
  documents as long as they pass the correct siteUrl string (which they
  learned from `platform.listAll`). _Fix:_ Swap `requireAuth(ctx)` →
  `requireSiteAdmin(ctx, siteUrl)` in both helpers. Migrate every inline
  `requireAuth + siteUrl check` pattern (quotes.markSent/markAccepted/
  markDeclined/convertToInvoice, contracts.markSigned, etc.) to use the
  helper.

- [x] **C9** `src/routes/api/webhooks/lumaprints/+server.ts:1-54` —
  **No signature verification.** The handler parses JSON and trusts the
  `event: "shipment.created"` payload directly. An attacker POSTs a forged
  event → the order is marked `shipped` in Sanity with fake tracking.
  (Stripe webhook in the same folder is correctly verified via
  `stripe.webhooks.constructEvent`.) _Fix:_ LumaPrints supports an HMAC
  signature header; validate it against a `LUMAPRINTS_WEBHOOK_SECRET`
  env var before trusting payload. Until LumaPrints confirms the header
  name, gate on a query-string shared token at minimum.

- [x] **C10** Portal accept/decline/sign flow is not atomic (landmine — no
  UI yet). `portal.markUsed` and the mutations that would mark the target
  document (`contracts.markSigned` etc., which don't exist yet) are
  separate calls. Angelsrest fixed this with atomic
  `portal.acceptQuote`/`declineQuote`/`signContract`. Before
  `/portal/[token]` routes are added, design the atomic mutations. _Fix:_
  Introduce `portal.acceptQuote(token)`, `portal.declineQuote(token)`,
  `portal.signContract(token, signerName, signerEmail?, signatureData?)` —
  each validates the token + marks used + patches the doc in a single
  Convex transaction.

- [ ] **C11** `.env` contains production-shape secrets on disk:
  `AUTH_GOOGLE_SECRET` (`GOCSPX-…`), `GALLERY_ADMIN_SECRET`,
  `AUTH_SECRET`, `BETTER_AUTH_SECRET` (placeholder), and mentions sharing
  `GALLERY_ADMIN_SECRET` across reflecting-pool + angelsrest.
  `.env` is correctly gitignored so this is disk-only, not repo-history,
  but the file lives in a working directory and can be shoulder-surfed or
  accidentally shared in a screenshot. The shared secret with angelsrest
  widens the blast radius. **User action required:** rotate
  `AUTH_GOOGLE_SECRET` and `GALLERY_ADMIN_SECRET` (separate per repo);
  regenerate `AUTH_SECRET`/`BETTER_AUTH_SECRET`. See angelsrest
  `ROTATION.md` for the procedure.

- [x] **C12** `src/routes/admin/+layout.server.ts:15-23` — The layout loader
  calls `api.platform.checkTier` and returns `{ tier, isCreator }` with no
  session check. With `ssr = false` on the admin layout, the server load
  still runs for unauthenticated visitors; child loaders
  (`admin/+page.server.ts`, `admin/inquiries/+page.server.ts`,
  `admin/orders/+page.server.ts`, `admin/galleries/+page.server.ts`) also
  don't validate auth before fetching data. `src/hooks.server.ts` has a
  comment that says "Admin auth is handled client-side by Better Auth via
  the admin package" — this is security-through-architecture-choice and
  wrong. Browser-only gates don't protect the data fetched by
  `+page.server.ts`. _Fix:_ Add `src/lib/server/adminAuth.ts` that calls
  Better Auth's server-side session check (or a Convex `whoami` roundtrip)
  and throw 401/403 at the top of each admin `+*.server.ts` load.

### Data Integrity

- [x] **C13** `src/routes/api/webhooks/stripe/+server.ts` — Stripe
  webhook originally had **no idempotency guard**; on retry it would
  duplicate the order, re-submit to LumaPrints, and re-email the
  customer. First fix (pre-migration) added a Sanity `findOrderByStripe­
  SessionId` lookup. Final fix (H42b, 2026-04-23): the webhook now calls
  `api.orders.create` on Convex, which enforces idempotency via the
  `by_stripeSessionId` index and returns `{ alreadyExisted, lumaprints­
  OrderNumber, status, stripeFees }` so the webhook can skip already-
  completed side effects (LumaPrints submission, fee capture, emails).
  Matches angelsrest's `orders.create` contract exactly.

- [x] **C14** `src/routes/api/webhooks/stripe/+server.ts` — Even with
  C13's dedupe, email sends used to fire unconditionally inside the
  outer `if (event.type === "checkout.session.completed")`. H42b
  gates the email block on `!orderResult.alreadyExisted`, identical to
  angelsrest's pattern. Admin + customer confirmation emails now fire
  exactly once per session.

---

## 🔴 HIGH — Ship-blocking Bugs

### Auth Flow / Server-Side Session

- [ ] **H1** `src/routes/api/auth/[...all]/+server.ts:1-36` — The auth proxy
  rewrites requests to `PUBLIC_CONVEX_SITE_URL` (falling back to
  `PUBLIC_CONVEX_URL?.replace(".cloud", ".site") || ""`). If either env
  var is misconfigured at deploy time, the proxy targets the empty string
  or the wrong host silently. No allowlist, no origin check. Currently
  server-env-sourced so not externally controllable, but a typo in Vercel
  env config could send auth traffic nowhere. _Fix:_ Fail-closed if
  `PUBLIC_CONVEX_SITE_URL` is missing; log + error on Convex-domain mismatch.

- [ ] **H2** `src/lib/server/stripe.ts:8-10` + `src/routes/api/webhooks/stripe/+server.ts:12-14` —
  `ADMIN_EMAIL` and `FROM_EMAIL` have hardcoded personal-email fallbacks
  (`jesse@reflectingpool.com`, `orders@reflectingpool.com`). If these env
  vars aren't set in Vercel for a client deployment, emails leak to the
  developer's domain. _Fix:_ Throw on missing env in prod (startup check);
  document required vars in `.env.example`.

- [ ] **H3** `src/hooks.server.ts:8-26` — No CSP at all. angelsrest's audit
  H45 deferred `unsafe-inline`; reflecting-pool hasn't even set the
  baseline. XSS-defense-in-depth is zero. _Fix:_ Add a CSP tier: minimum
  `default-src 'self'; img-src 'self' https: data:; frame-ancestors 'none';`
  then iterate on script-src/style-src with nonces or hashes to drop
  inline. Leave `'unsafe-inline'` on style-src only until a migration plan
  lands.

### Money / Idempotency

- [ ] **H4** `src/routes/api/webhooks/stripe/+server.ts` — Stripe fees are
  never captured. The Convex `orders` schema has a `stripeFees` field, and
  the webhook has access to `session.payment_intent` — but no
  `balance_transactions.retrieve()` call. Same fix as angelsrest H5:
  schedule a Convex action (or a simple setTimeout-offloaded worker — but
  angelsrest learned the hard way to use a scheduled action) to fetch the
  BT at T+15s and patch fees onto the order. _Fix:_ Add
  `convex/stripeFees.ts` with `"use node"` directive and
  `captureFeesForOrder` internal action; schedule it from the webhook
  after order creation.

- [ ] **H5** `src/lib/server/stripe.ts:43` — `Math.round(params.priceInDollars * 100)`
  is the only dollars→cents conversion point, which is fine as long as
  `priceInDollars` arrives already-quantized-to-cents. The only upstream
  is `getRetailPrice()` in `src/lib/shop/pricing.ts`, which returns a
  hardcoded integer value — so the current path is safe. _Flag this
  anyway:_ any future coupon/discount logic that applies a percent
  discount in float-land will silently leak pennies. Move to
  integer-cents throughout `pricing.ts` before coupons ship.

- [x] **H6** `src/routes/api/checkout/+server.ts:43` —
  `expectedPrice !== priceInDollars` uses strict float equality. Works
  today because both sides come from the same lookup table. If pricing
  ever becomes computed (margin %, shipping add-on, coupon), one side can
  be `35.00000000001` and break legitimate checkouts. _Fix:_
  `Math.abs(expected - actual) < 0.01` (or integer cents everywhere).

- [ ] **H7** `src/lib/shop/pricing.ts` — currency is USD-only; `formatPrice`
  hardcodes `$`. Same deferral as angelsrest H7 — only relevant if
  non-USD revenue lands. Document and move on.

### Convex Performance / Correctness

- [x] **H8** `convex/messages.ts:43-87` `allThreads` — `ctx.db.query("platformMessages").order("desc").collect()` fetches **every message across
  every tenant**. No siteUrl filter, no cap. At scale this OOMs the query
  and leaks cross-tenant metadata (sender, content, unread counts) in the
  summary. _Fix:_ Rewrite per-tenant — iterate `platformClients` first,
  then for each run `platformMessages.withIndex("by_siteUrl_unread", q =>
  q.eq("siteUrl", site.siteUrl).eq("read", false)).take(1)` to get the
  latest unread. Matches angelsrest H17.

- [x] **H9** `convex/messages.ts:29-40` `markRead` — `.collect()` every
  unread row for a site, patch each in a loop. Transaction-limit blow-up
  at ~5000 rows. _Fix:_ Scheduler-chain 500-row batches (angelsrest H14
  pattern) or accept the cap + schedule a cleanup job.

- [x] **H10** `convex/messages.ts:4-13` `list` — `.collect()` with no cap.
  Same scaling concern; cap at 500 per fetch.

- [x] **H11** `convex/orders.ts:132-203` `getStats` — `.collect()` all
  orders for a site + iterate 30 days of revenue in memory. Unbounded; at
  ~10K orders this slows to seconds. _Fix:_ Either cap at a rolling
  window via `by_siteUrl.filter(_creationTime > 30d)` + maintain an
  aggregate table for all-time, or use scheduled denormalization
  (angelsrest M31-equivalent).

- [x] **H12** `convex/platform.ts:23-26` `listAll` — `.collect()` on the
  platformClients table. Low scale risk (few dozen tenants max) but
  still unbounded; cap at 500.

- [x] **H13** `convex/quotes.ts:13-27`, `contracts.ts` list, `invoices.ts`
  list, `crm.ts listClients`, `emailLog.ts list`, `emailTemplates.ts list`,
  `inquiries` (if any) — every list query uses `.collect()` with no cap
  and post-filters status in JS. Status filters have `by_siteUrl_status`
  compound indexes defined in schema but not used. _Fix:_ Mirror
  angelsrest H12 — helper `queryBySiteUrl` that dispatches to the
  compound index when the status arg is set; cap at 500.

- [x] **H14** `convex/galleries.ts:59-87` `remove` — `.take(2000)` on
  images + downloads then sequential delete. Silently truncates at 2000
  and risks transaction-limit blow-up at a few hundred. _Fix:_ Angelsrest
  H14 pattern — split into `remove` + scheduler-chained `_removeBatch`
  that processes 500 rows and reschedules until empty.

- [x] **H15** `convex/galleries.ts:238-247` `getImages` — `.take(2000)`.
  Photo galleries often exceed 2000. Silent truncation + no stable sort
  (sorts by `order` alone; ties untied). _Fix:_ Either chunk in UI or
  enforce a 500-image / gallery product limit; add `_creationTime`
  tiebreak to sort.

- [x] **H16** `convex/galleries.ts:109-131` `listBySite` — loops
  `await ctx.db.get(id)` inside a `for` loop (lines 121-124). N+1.
  _Fix:_ `await Promise.all(clientIds.map(id => ctx.db.get(id)))`.

- [x] **H17** `convex/tags.ts getClientTags` — N+1 fan-out on tagId
  lookups (per audit agent; line-exact location: `tags.ts` fan-out loop
  after `.collect()` on assignments). _Fix:_ `Promise.all`.

- [x] **H18** `convex/kanban.ts:93` `generateId()` uses
  `Math.random().toString(36).slice(2, 11)` — low-entropy collision risk
  when many columns are created across tenants (and tenants share a
  namespace). _Fix:_ `crypto.randomUUID()`. Matches angelsrest H16.

- [x] **H19** `convex/quotes.ts:80-111` `update` accepts
  `status: v.optional(v.string())` — should be the literal union from
  schema (`"draft" | "sent" | "accepted" | "declined" | "expired"`).
  Same pattern in `contracts.ts update`, `invoices.ts update`,
  `crm.ts updateClient`, `orders.ts updateStatus` (already tight here —
  keep), `emailTemplates.getByCategory` (casts as any, line 32),
  `emailLog.ts list` (casts type as any). _Fix:_ Define
  `statusValidator` per module matching the schema union; share via
  `helpers/validators.ts`.

- [x] **H20** `convex/kanban.ts moveCard` — accepts `targetColumnId` but
  doesn't validate it against the board config. Clients can land on a
  nonexistent column. _Fix:_ Load boardConfig for
  `(siteUrl, projectType)`, verify targetColumnId is in the columns list
  or throw. Matches angelsrest M29.

- [x] **H21** `convex/kanban.ts deleteColumn` cascade — moves clients to
  fallback column without recomputing `boardPosition`, causing duplicate
  positions. _Fix:_ Compute `max(boardPosition)` in the fallback column
  first; queue migrating clients at `max+1..`. Matches angelsrest M30.

- [ ] **H22** `convex/notifications.ts` `adminLastSeen` table uses
  `siteUrl` as a `userId` key (schema.ts:440-447). Comment in
  `notifications.ts` acknowledges "each site has a single admin" — but
  `platformClients.adminEmails` is `v.array(v.string())`, so that
  assumption is wrong. Two admins on the same site will clobber each
  other's "last seen" state. _Fix:_ Include Better Auth identity subject
  in the key: `by_siteUrl_and_userId` (already defined) should actually
  be used, and `userId` should come from
  `ctx.auth.getUserIdentity().subject`, not from siteUrl.

- [ ] **H23** `convex/orders.ts lookup` is the only legitimately public
  order-surface, but it accepts `email` as a GET-style query arg that
  will flow through to a browser URL if any client page is wired (none
  today). Before the `/orders` lookup UI lands: match angelsrest H34 —
  make it POST-body only.

### Frontend Bugs

- [x] **H24** `src/routes/+error.svelte:2`, `src/routes/shop/+error.svelte:2`,
  `src/routes/admin/+error.svelte:2` — all three use the deprecated
  `$app/stores`. _Fix:_ migrate to `$app/state` (replace `import { page }
  from "$app/stores"` + `$page.X` → `import { page } from "$app/state"` +
  `page.X`). Matches angelsrest H25.

- [x] **H25** `src/lib/components/Lightbox.svelte:13-16` — `let index =
  $state(0); $effect.pre(() => { index = currentIndex; });` is the
  prop-to-state sync anti-pattern. Every re-render with a new
  `currentIndex` clobbers local increments from `next()`/`prev()`.
  Currently works only because the parent never changes `currentIndex`
  after open, but any parent-driven navigation will overwrite the user's
  paging. _Fix:_ Either drop the effect and initialize once
  (`let index = $state(currentIndex)`) or make `index` a `$derived`
  with internal offset: `let offset = $state(0); let index = $derived(
  currentIndex + offset);` — matches angelsrest H27's `GalleryModal` fix.

- [x] **H26** `src/lib/auth/client.ts:7` — reads `window.location.origin`
  at module init (outside any `if (browser)` or lazy getter). Runs during
  SSR and throws. _Fix:_ Wrap in a lazy Proxy / function that resolves
  at first browser access. Matches angelsrest H29.

- [x] **H27** `src/routes/shop/[slug]/+page.svelte` — checkout click catches
  network errors with only `console.error`, sets `isSubmitting = false`,
  no user-facing feedback. _Fix:_ toast the error; matches angelsrest
  H28 pattern.

- [ ] **H28** `src/routes/shop/success/+page.svelte:4, 23-24` — reads
  `session_id` from the URL and renders only a 16-char-truncated version
  (no PII). The mild concern is that anyone with the success URL lands
  on the page (cache-leak risk is low — the page reveals nothing). This
  is a much weaker version of angelsrest's H30. _Fix:_ Before the first
  real customer, bind the page to a checkout cookie set at
  `/api/checkout` so that an unrelated visitor sees a generic "look up
  your order" prompt instead.

### Server / Webhooks

- [ ] **H29** Webhook logging hygiene — the pre-migration stubs
  (`[Sanity Mock] …` in `createSanityOrder`/`updateSanityOrder`/
  `findOrderByLumaprintsNumber`) were removed on H42b (2026-04-23)
  along with the Sanity-order functions themselves. The replacement
  Convex-backed webhooks currently emit ad-hoc `console.log` /
  `console.error` lines with order IDs in them. Before first real
  customer, port angelsrest's `logStructured` helper
  (`src/lib/server/logger.ts`) and swap the existing logs for
  structured events — e.g. `logStructured("order.created", {
  sessionId, orderNumber, alreadyExisted })` — so PII stays out of
  log payloads and dashboards can aggregate by event type. Matches
  angelsrest H33.

- [ ] **H30** `src/lib/server/lumaprints.ts:97, 117` — `validateImage()`
  and `getShippingPrice()` exist as exports but **nothing calls them**.
  Checkout creates sessions before image validation; webhook submits to
  LumaPrints without pre-flight image check. Outcome: customer pays,
  LumaPrints rejects image, order lands in `fulfillment_error`. _Fix:_
  Wire `validateImage` into the shop product page (client calls
  `/api/shop/validate-image`; fails-closed per angelsrest H39) before
  showing the paper/size picker. Shipping-price similarly —
  either wire or delete (dead code).

- [x] **H31** `src/routes/api/webhooks/stripe/+server.ts:29-45` —
  `validateCheckoutMetadata` verifies string presence but not that
  `paperWidth`/`paperHeight` are numeric and in a sane range. An
  attacker who can call `/api/checkout` (no auth) can set
  `paperWidth: "999999"` in metadata and send it to LumaPrints. _Fix:_
  Parse + range-check in both `/api/checkout` (before session create)
  and in the webhook's metadata validator.

- [x] **H32** `src/routes/api/webhooks/stripe/+server.ts:67` — shipping
  country silently defaults to `"US"` when Stripe omits it. Only way
  to hit this is if Stripe's API response shape drifts or a test
  session omits shipping collection. Flag as matching pattern of
  angelsrest H37 (silent default) — change to throw and fail-closed,
  since shipping to the wrong country is an expensive bug.

### Infra / CI

- [x] **H33** `.github/workflows/ci.yml` — runs `biome check src/` +
  `svelte-check` but **no `pnpm test`**. 109 Vitest tests (per
  CLIENT-HANDOFF.md) never run in CI. A regression in webhook math,
  pricing, LumaPrints encoder, or coupon math ships silently. _Fix:_
  Add a test step after type-check. Matches angelsrest H41.

- [x] **H34** `.github/workflows/ci.yml` — no `concurrency:` block.
  Multiple pushes queue and each runs independently, wasting minutes.
  _Fix:_ `concurrency: { group: ci-${{ github.ref }},
  cancel-in-progress: true }`. Matches angelsrest H43.

- [ ] **H35** `.github/workflows/dependabot-auto-merge.yml` — auto-merges
  without requiring CI to pass, and the `@jessepomeroy/admin` rule
  auto-merges **any** version bump (including majors). With H33, a
  breaking update lands with no test run. _Fix:_ require
  `status checks: success` in the workflow + restrict
  `@jessepomeroy/admin` to `semver-minor`/`semver-patch`. Also requires
  GitHub branch-protection on `main` (user action). Matches angelsrest
  H42.

- [x] **H36** `.env.example` **does not exist**. `CLIENT-HANDOFF.md` and
  `TESTING-PIPELINE.md` reference `cp .env.example .env` but there is
  no such file. New dev manually reverse-engineers the var list from
  the existing `.env`. At least 23 env vars are read somewhere in the
  code; `FROM_EMAIL` and `GALLERY_WORKER_URL` aren't documented
  anywhere. _Fix:_ Create `.env.example` matching angelsrest H44 pattern
  — grouped by service, comments on required vs optional, notes on
  which vars also need `npx convex env set` or Vercel Dashboard.

- [ ] **H37** `biome.json:17-24` — `.svelte` files have `"linter":
  { "enabled": false }`. No lint on any Svelte component — no unused-
  variable, no rule enforcement, no consistency. Biome 2.4 supports
  Svelte; commit `352aa47` explicitly disabled it. _Fix:_ Re-enable and
  triage the resulting warnings, or add an explicit `svelte-check
  --no-tsconfig` step for lint-like rules; lint-staged should include
  `.svelte`.

- [ ] **H38** `svelte.config.js` — Vercel adapter is `adapter-auto`;
  nothing pins `runtime` or `maxDuration`. Default Vercel node version
  can shift under you. _Fix:_ `import adapter from "@sveltejs/adapter-vercel"`
  and pin `{ runtime: "nodejs22.x", maxDuration: 30 }`. Matches
  angelsrest H47.

- [ ] **H39** No Sentry wiring at all. `@sentry/sveltekit` not installed;
  no source-map upload; no runtime error tracking. Production errors
  disappear into Vercel function logs. _Fix:_ Install, wire
  `sentrySvelteKit()` in `vite.config.ts` (no-op without env so it's
  safe to land now), document `SENTRY_AUTH_TOKEN`/`SENTRY_ORG`/
  `SENTRY_PROJECT` in `.env.example`. Matches angelsrest H46.

- [x] **H40** `package.json` has no `engines` field. CI pins Node 22;
  local dev + future CI runners can drift. _Fix:_ `"engines": { "node":
  ">=22.0.0", "pnpm": ">=10.33.0" }`.

- [ ] **H41** `.husky/pre-commit` runs only `lint-staged`. No secret
  scanner, no check that `.env` patterns don't slip into staged files.
  `AUTH_GOOGLE_SECRET=GOCSPX-…` could be pasted into a tracked config
  and committed without warning. _Fix:_ Add `scripts/check-secrets.sh`
  per angelsrest "Infrastructure" section; invoke before `lint-staged`.

- [ ] **H42a** **Sanity CMS reads are still mocked** —
  `src/lib/server/sanity.ts` `fetchPrintableProducts`, `fetchCollections`,
  `fetchCollectionWithPrints`, `fetchPrintProduct` all return static
  flowers-01–35 sample data. Before the first real visitor can see real
  prints:
  - Create the Sanity project; set `SANITY_PROJECT_ID`, `SANITY_DATASET`,
    `SANITY_API_TOKEN` on Vercel.
  - Define `gallery` + `image` schemas (no `order` schema — orders live
    in Convex per H42b). Reference `SANITY-SCHEMA.md` for field names;
    drop the `order` section of that doc when un-mocking.
  - Un-mock each read function; verify `sanityClient.fetch` signatures
    against the existing GROQ queries in the file (already written,
    commented out).
  - Maggie uploads the real galleries via Sanity Studio.

- [x] **H42b** **Stripe + LumaPrints webhooks write to Convex, not
  Sanity** (closed 2026-04-23). Removed `createSanityOrder`,
  `updateSanityOrder`, `findOrderByLumaprintsNumber`,
  `findOrderByStripeSessionId` from `src/lib/server/sanity.ts`. Stripe
  webhook (`src/routes/api/webhooks/stripe/+server.ts`) now calls
  `api.orders.create` + `api.orders.updateStatus` via
  `@jessepomeroy/crm-api`; LumaPrints webhook
  (`src/routes/api/webhooks/lumaprints/+server.ts`) calls the new
  `api.orders.getByLumaprintsOrderNumber` query + `api.orders.update­
  Status`. Idempotency (C13/C14) comes from the `by_stripeSessionId`
  index on the Convex orders table; retries are safe. Stripe-fee
  capture scheduling (H4) still pending. Requires `WEBHOOK_SECRET` set
  on both Vercel + Convex before first real order (user action per
  CLAUDE.md).

- [ ] **H42c** **Inquiries module missing from Convex.** The admin
  inquiries page still stubs `inquiries: []` in
  `src/routes/admin/inquiries/+page.server.ts`, and `src/lib/config/admin.ts`
  casts `api as unknown as AdminAPI` to satisfy the admin package's
  type shape. Port angelsrest's `convex/inquiries.ts` to the angelsrest
  codebase, regenerate crm-api types, un-stub the page, drop the cast.

### Schema / Indexing

- [x] **H43** `galleryDownloads` has both `by_gallery` and
  `by_siteUrl_and_galleryId` indexes (schema.ts:422-424). The
  single-column index is redundant — every real callsite is per-site.
  Drop `by_gallery`; change `galleries.getDownloadStats` and
  `galleries.remove` to use `by_siteUrl_and_galleryId`. Matches
  angelsrest M23.

- [x] **H44** `clientTagAssignments` has `by_siteUrl`, `by_clientId`,
  `by_tagId` but no `by_clientId_and_tagId` compound index. The
  duplicate-check logic in `tags.assignTag` would want a unique
  compound lookup. _Fix:_ Add the compound index + migrate to
  `.withIndex("by_clientId_and_tagId", ...).unique()`. Matches
  angelsrest M22.

---

## 🟡 MEDIUM — Code Quality / Refactor

### Duplication / Missing Helpers

- [x] **M1** No `requireSiteAdmin` / `requireWebhookCallerOrAuth`
  helpers. Every auth call in the Convex backend rolls its own pattern
  (or skips auth entirely). _Fix:_ create the helpers once in
  `authHelpers.ts`; migrate every site-scoped mutation to use them.
  (This is the M1 dual of angelsrest's M1 — resolved by C8/C4
  together.)

- [ ] **M2** Stripe + Resend clients instantiated ad-hoc. `src/lib/server/
  stripe.ts` creates a module-level `stripe`; webhook handler creates
  `new Resend(...)` inline (`stripe/+server.ts:12`). Single-sourced
  singletons in `$lib/server/stripeClient.ts` + `$lib/server/
  resendClient.ts` are easier to mock, easier to swap env source.
  Matches angelsrest M3.

- [ ] **M3** `$lib/server/apiError` helper missing. Every API route
  raises `error(400, "…")` with ad-hoc strings; no structured
  `{ code, message, details? }` response shape. Matches angelsrest M8.

### Naming / Typing

- [ ] **M4** `v.string()` status fields on mutation args where schema
  has a literal union — see H19. In `list` queries it's tolerable
  (status widens in filter logic); in mutations it's loose. Tier-3
  polish after C7 closes.

- [ ] **M5** No Sanity codegen. Types in `src/lib/shop/types.ts` are
  hand-maintained. When real Sanity schemas land (H42), add
  `@sanity/codegen` to keep `Order`, `PrintProduct`, `PrintCollection`
  in sync. Matches angelsrest M15.

- [x] **M6** Magic `take()` constants scattered across Convex files
  (500, 2000, 1000, 100). Promote to `helpers/limits.ts` so caps are
  auditable in one place. Matches angelsrest M13.

### Error Handling / UX

- [ ] **M7** No toast component. Errors in checkout, contact form, and
  any future admin mutation either land inline (stale form state) or
  swallow via `console.error`. _Fix:_ angelsrest M16 pattern — runes-
  based toast store + `<Toaster />` component; wire to checkout +
  contact.

- [ ] **M8** `ContactForm.svelte` — success/error states update inline
  but no `aria-live` region announces status to AT users. _Fix:_ wrap
  the status paragraph in `aria-live="polite"`.

- [ ] **M9** `src/routes/api/webhooks/stripe/+server.ts:199-203` email
  failures are caught + `console.error`'d only. Comment in code says
  "email failure must never crash the webhook" — correct — but an
  alert path (re-queue or admin notification) would catch the case
  where Resend is down for hours. _Fix:_ enqueue a retry via a Convex
  scheduled action, or at minimum a structured log event that a
  monitoring rule can alert on.

### Schema / Performance

- [ ] **M10** No child-table pattern for unbounded arrays. `contracts.
  variables`, `quotes.packages`, `invoices.items`, `emailTemplates.
  variables` all store arrays inline on the parent. Fine at current
  scale; Tier-3 if any of them grow past ~50 entries per row.

- [ ] **M11** `notifications.getUnreadFlags` uses `.take(10)` on quotes/
  invoices/contracts lookups (per agent analysis of
  `notifications.ts:97/112/127`). 11th+ unread is invisible to the
  sidebar. _Fix:_ use the `by_siteUrl_status` compound index for a
  cheap `.first()` "has any `new`/`draft`?" query instead of taking
  10 and filtering.

- [ ] **M12** `quotes.convertToInvoice` does create an activity log
  entry via `activityLog.logActivity` — **verified correct**. Keeping
  this row so it doesn't regress (angelsrest M27 was missing).

### Preview Mode / Sanity

- [ ] **M13** Sanity draft preview is not wired. No `{ isPreview: boolean }`
  flag in `locals`, no two-client helper
  `getSanityClient(isPreview)`, no `+page.server.ts` threading
  preview through to `fetch`. If you ever add Presentation Tool
  previews, this is the setup matching angelsrest H48/M35. Tier-2
  when real Sanity lands.

### Deps / Config

- [x] **M14** CI runs `pnpm biome check src/`, local runs (via
  `package.json:"check"`) runs `biome check` on the default root.
  Scope divergence: root configs (`svelte.config.js`, `vite.config.ts`,
  `vitest.config.ts`) aren't linted in CI. _Fix:_ CI → `pnpm lint`
  mapping to `biome check .`. Matches angelsrest L50.

- [ ] **M15** `lint-staged` config in `package.json:32-36` only covers
  `*.{js,ts}`. `.svelte` files don't get formatted on commit. Once
  H37 re-enables Svelte lint, extend lint-staged to include `.svelte`.

- [ ] **M16** Seven markdown docs (README, AGENTS, ARCHITECTURE,
  CLIENT-HANDOFF, TESTING-PIPELINE, ADMIN-AUTH, SANITY-SCHEMA,
  LUMAPRINTS) with overlapping scope. Single SETUP.md +
  service-specific sub-docs would reduce "which doc has the truth?"
  churn. Tier-3 polish.

- [ ] **M17** `README.md` uses `npm` commands throughout; package.json
  pins `packageManager: pnpm@10.33.0`. _Fix:_ s/npm/pnpm/g. Matches
  angelsrest L22.

- [ ] **M18** `src/lib/config/admin.ts:16-21` — `siteUrl`, `siteName`,
  `fromEmail`, `galleryWorkerUrl` are hardcoded strings. For the
  template-reuse workflow (sell this to other photographers), every
  var should be env-driven. _Fix:_ migrate to `$env/static/public`
  (siteUrl/siteName) and `$env/static/private` (fromEmail/galleryWorkerUrl).

- [ ] **M19** `vitest.config.ts` + `vite.config.ts` — check for
  `path.resolve(".")` anti-pattern (should be
  `dirname(fileURLToPath(import.meta.url))` for robustness). Matches
  angelsrest L15.

- [ ] **M20** No `@types/dompurify` installed — but check: if DOMPurify
  is not used at all (reflecting-pool doesn't currently render
  user-submitted HTML), this is moot. If any contract/quote body
  rendering is added later, install DOMPurify + use it before
  `{@html}`. Matches angelsrest M37 inverted.

---

## ⚪ LOW — Nits

- [ ] **L1** `src/lib/utils/math.ts` + `LeafLayer.svelte` +
  `PhotoCard.svelte` use `Math.random()` — correctly, for animation.
  Add a one-line comment noting "animation only; never use for IDs
  or security". Matches angelsrest L16 inverted.

- [ ] **L2** `.editorconfig` missing. Add a standard file so editors
  stop fighting over whitespace. Matches angelsrest L24.

- [ ] **L3** `.vscode/extensions.json` missing. Recommend
  `biomejs.biome`, `svelte.svelte-vscode`. Matches angelsrest L26.

- [ ] **L4** `src/hooks.server.ts:20-22` — the auth-route security-
  headers skip has a one-line comment. Expand to explain "response
  body is already consumed by Better Auth handler; headers are set
  by Better Auth itself". Matches angelsrest L12.

- [x] **L5** `src/routes/api/webhooks/lumaprints/+server.ts:42` — `TODO:
  Send "order shipped" email` left in place. Either implement or
  capture in a backlog issue, don't leave the TODO dangling.

- [ ] **L6** `src/routes/api/webhooks/stripe/+server.ts:14` + other
  fallback email strings — they contain emojis/personality in subject
  lines (angelsrest L14 stripped emoji from subjects). Review.

- [ ] **L7** `.env` line-order / comments — `GALLERY_ADMIN_SECRET` is
  commented "shared with angelsrest"; the shared-secret pattern is
  a code-smell worth its own comment + migration note.

- [ ] **L8** `CLAUDE.md` is 6 lines and mostly a pointer to
  `AGENTS.md`. Either drop `CLAUDE.md` or pick one as canonical —
  matches angelsrest L23.

- [ ] **L9** `src/routes/api/contact/+server.ts` — rate limit wired,
  escapes wired. One nit: the rate-limit key is IP-only. If you ever
  want per-form limits, factor the key. Not required.

- [ ] **L10** `src/app.html` — no `<link rel="preload">` hints for
  fonts. Performance polish, not functional.

- [ ] **L11** `AUDIT.md` (this file) should be added to `.gitignore`
  once created — the angelsrest pattern keeps the audit out of the
  repo history since it references secrets and file:line references
  that are useful internally but noisy externally. Depends on your
  preference.

---

## Status Tracking

| Severity | Count | Completed | Remaining |
|----------|-------|-----------|-----------|
| CRITICAL | 14    | 13        | 1 (C11 — user key rotation) |
| HIGH     | 44    | 26        | 18 |
| MEDIUM   | 20    | 3         | 17 |
| LOW      | 11    | 1         | 10 |
| **Total**| **89** | **43**   | **46** |

Compare to angelsrest (136 items, 105 resolved): reflecting-pool caught up
to angelsrest's auth foundation + webhook hardening + delivery-route in one
sweep. Remaining items are mostly polish (Sentry wiring, Vercel pin,
Biome-Svelte enablement), user-only actions (key rotation, Vercel env vars,
branch protection), and work dependent on un-mocking Sanity (H29, H42).

---

## Fix order (suggested)

1. **Do not ship to production yet** — C12/C3/C4/C6/C7 together mean
   the admin backend is an open API. First-customer is blocked on
   closing these.

2. **Tier 1: auth foundation (1-2 days).** C1, C2, C8 —
   `requireSiteAdmin` helper + `adminAuth.checkAdminAccess` fix +
   migrate `patchDocument`/`deleteDocument`. Then sweep C3, C6, C7 —
   add `requireSiteAdmin(ctx, siteUrl)` to every query and mutation in
   `convex/*.ts` except the small "intentionally public" list (see
   C6 closing note). C12: add server-side Better Auth session check
   in `src/lib/server/adminAuth.ts`; wire to every `+page.server.ts`
   and `+layout.server.ts` under `admin/`.

3. **Tier 1: webhook hardening (half day).** C9 (LumaPrints signature),
   C13+C14 (Stripe idempotency + email dedupe), H4 (fee capture
   scheduled action), H31 (metadata range-check).

4. **Tier 1: user-only actions.** C11 (rotate keys; follow angelsrest
   ROTATION.md), H35 (GitHub branch protection).

5. **Tier 2: query perf (1 day).** H8-H15 (messages, orders, galleries,
   unbounded collects, N+1 fan-outs, Math.random IDs, status
   validators).

6. **Tier 2: CI + infra (half day).** H33-H40 (tests in CI, concurrency,
   auto-merge gate, `.env.example`, biome-svelte, Vercel pin, Sentry,
   engines, secret scanner).

7. **Tier 2: frontend landmines (half day).** H24-H28 (app/stores
   migration, Lightbox effect, auth/client SSR, checkout toast).

8. **Tier 3: polish.** M-series and L-series as time permits.

---

## Steps for user

The items below need the human (environment/platform changes outside the
repo, or credentials only you have).

### 1. Before deploying this branch — new env vars

**`WEBHOOK_SECRET`** will gate the Convex webhook-called mutations after
C4/C7 lands.

```bash
SECRET=$(openssl rand -base64 32)
# Vercel Dashboard → Project → Environment Variables → Add:
#   Name:  WEBHOOK_SECRET
#   Value: <paste $SECRET>
#   Environments: Production, Preview, Development
npx convex env set WEBHOOK_SECRET "$SECRET"
```

**`STRIPE_SECRET_KEY`** on the Convex deployment (separate from Vercel's copy)
for the H4 fee-capture action.

```bash
npx convex env set STRIPE_SECRET_KEY sk_live_...   # same value as Vercel
```

**`LUMAPRINTS_WEBHOOK_SECRET`** — obtain from LumaPrints support; add to
Vercel for the C9 signature fix.

### 2. Before the next billable customer — rotate keys (C11)

`GALLERY_ADMIN_SECRET` is shared with angelsrest. Rotate both:
per-repo separate secrets going forward. Also rotate
`AUTH_GOOGLE_SECRET`, `AUTH_SECRET`, `BETTER_AUTH_SECRET`.

After rotation:
- Delete `/Users/jessepomeroy/Documents/work/reflecting-pool/.env`.
- Create `.env.local` with test-mode keys for dev.
- Verify no secret slipped into tracked files:
  ```bash
  git grep -E "sk_live|pk_live|whsec_|re_[A-Z0-9]|GOCSPX-" -- \
    ':!pnpm-lock.yaml' ':!AUDIT.md'
  # Expected: empty output.
  ```

### 3. Enable GitHub branch protection (H35)

github.com → Settings → Branches → Add branch protection rule for `main`:
- Require a pull request before merging.
- Require status checks to pass — select the CI check.
- Do not allow bypassing.

Prevents the Dependabot auto-merge workflow from landing PRs with a red CI.

### 4. Un-mock Sanity before the first customer (H42)

`createSanityOrder`/`updateSanityOrder`/`findOrderByLumaprintsNumber`
return mocks. Define Sanity schemas (Studio repo:
`reflecting-pool-studio/schemas/order.ts`), export, then un-mock the
functions. Re-run the money-path audit (C13, C14, H4, H29) after real
writes are live — some findings shift from "theoretical" to "live".

### 5. Optional — Sentry source maps (H39)

Install `@sentry/sveltekit`, wire `sentrySvelteKit()` in
`vite.config.ts`. Land without env vars (no-op). Later add Vercel env:

```
SENTRY_ORG=<your-org>
SENTRY_PROJECT=<your-project>
SENTRY_AUTH_TOKEN=<auth-token>
```

### 6. Future/eventual

- Tier 3 items — refactor cleanup, naming polish, docs consolidation.
- H3 CSP hardening — real XSS-defense-in-depth win but needs a
  coordinated audit of inline scripts/styles + third-party script
  strategy.
- M5/M13 Sanity codegen + preview mode — after H42 lands and schemas
  stabilize.
- H23 `/orders` lookup POST-body migration — before wiring a customer-
  facing lookup UI.

---

## Reflection — catch-up-to-angelsrest sweep (2026-04-23)

One session. 43 of 89 items closed — all 14 CRITICAL minus the key
rotation (C11, user action), the bulk of HIGH auth/perf/CI, and a handful
of MEDIUM/LOW. The strategy was: treat angelsrest as the reference
implementation and port wholesale rather than audit-item-by-audit-item.
That made the Convex sweep mechanical — every admin module got the same
treatment in one pass: `requireAuth` (or `requireWebhookCallerOrAuth`)
at the top, `.collect()` → `.take(LIMIT)`, inline auth checks → helper
functions. Schema got `v.literal("gallery")` added to `portalTokens.type`
and a `by_clientId_and_tagId` compound index.

What this sweep actually accomplished:

1. **Auth foundation.** `requireSiteAdmin` + `requireWebhookCallerOrAuth`
   + server-side admin gate in `src/lib/server/adminAuth.ts`. Every admin
   loader now throws 401 before touching tenant data. `patchDocument` /
   `deleteDocument` went from "any Google account" to "site admin only".
2. **Portal atomic flow.** `portal.acceptQuote` / `declineQuote` /
   `signContract` replace the old two-call pattern; the customer-facing
   delivery/portal UI now has a replay-safe back-end.
3. **Delivery route lives.** `/delivery/[token]` is wired end-to-end —
   server loader validates the token, computes worker URLs, renders a
   reflecting-pool-native page (Cormorant serif, ink/paper palette, no
   lifted angelsrest CSS). admin-dashboard's `handleShare` will now
   actually work instead of throwing `ArgumentValidationError`.
4. **Webhook hardening.** LumaPrints gained HMAC-or-query-token
   verification (previously trusted every POST). Stripe gained
   idempotency (short-circuits on retries via
   `findOrderByStripeSessionId`). Both close the worst duplicate-
   fulfillment gotchas — with the caveat that idempotency is a no-op
   until Sanity is un-mocked.
5. **CI / infra parity.** `.env.example`, `pnpm test` in CI, concurrency
   cancel, `engines` pin, lint-staged now covers `.svelte`.

What's still open and worth flagging:

- **C11 — key rotation** requires the human. Old secrets still on disk.
- **H42 — Sanity mock** is the single biggest blocker for the shop
  flow going live. Idempotency (C13) and PII redaction (H29) are
  theoretical until the mock flips off.
- **H4 — Stripe fee capture** (`stripeFees.ts` port) was deferred — the
  scheduled action requires a Convex node action + env setup.
- **H37/H38/H39 — Biome-Svelte / Vercel adapter pin / Sentry** are
  mechanical ports I didn't reach.
- **`galleries.updateImage` is intentionally unauthed** — matches
  angelsrest's pattern (the customer-facing favorite toggle uses it).
  A token-auth variant would be stronger; left as a follow-up.

The interesting tension in this codebase: reflecting-pool was written
before admin-dashboard was extracted into a package. That created a gap
between "what the admin UI calls" (admin-dashboard's component
expectations) and "what the Convex backend offered" (a half-hardened
single-tenant version). Catching up meant porting angelsrest's auth
model, which was designed around the same admin-dashboard contract.
Proxy-aliasing `api.galleryDelivery` → `api.galleries` in
`src/lib/config/admin.ts` is the remaining seam — it works, but it's a
signal that the multi-tenant story hasn't fully landed. Worth a note for
the next template-reuse exercise.

Files touched (for the curious):

```
convex/adminAuth.ts          convex/helpers/deleting.ts       convex/orders.ts
convex/authHelpers.ts        convex/helpers/limits.ts         convex/platform.ts
convex/activityLog.ts        convex/helpers/marking.ts        convex/portal.ts
convex/contracts.ts          convex/helpers/numbering.ts      convex/quotes.ts
convex/crm.ts                convex/helpers/patching.ts       convex/schema.ts
convex/emailLog.ts           convex/helpers/querying.ts       convex/tags.ts
convex/emailTemplates.ts     convex/galleries.ts
convex/kanban.ts             convex/messages.ts               convex/notifications.ts

src/hooks.server.ts
src/lib/auth/client.ts
src/lib/config/admin.ts
src/lib/server/adminAuth.ts  (new)
src/lib/server/galleryWorkerUrl.ts  (new)
src/lib/server/sanity.ts
src/lib/components/Lightbox.svelte
src/routes/+error.svelte     src/routes/admin/+error.svelte   src/routes/shop/+error.svelte
src/routes/admin/+layout.server.ts
src/routes/admin/+page.server.ts
src/routes/admin/galleries/+page.server.ts
src/routes/admin/inquiries/+page.server.ts
src/routes/admin/orders/+page.server.ts
src/routes/api/checkout/+server.ts
src/routes/api/webhooks/lumaprints/+server.ts
src/routes/api/webhooks/stripe/+server.ts
src/routes/delivery/[token]/+page.server.ts  (new)
src/routes/delivery/[token]/+page.svelte     (new)
src/routes/shop/[slug]/+page.svelte
.env.example                (new)
.github/workflows/ci.yml
package.json
```

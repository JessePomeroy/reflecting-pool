# AGENTS.md — reflecting-pool

Canonical rules for this client-spoke repository.

## Project context

- **Stack:** SvelteKit 5, Svelte runes, TypeScript, Vite, Sanity, shared Convex,
  Stripe Connect, LumaPrints, Resend, and the gallery Worker
- **Role:** Maggie Pomeroy's public site and tenant admin host
- **Studio:** `../reflecting-pool-studio`
- **Current architecture:** `ARCHITECTURE.md`

## Ownership boundaries

- **Sanity owns content:** homepage, portfolio galleries, shop catalog,
  collections, about, modeling, contact settings, and site settings.
- **Shared Convex owns operations:** orders, CRM, board, invoices, quotes,
  contracts, messages, platform tenancy, and private delivery galleries.
- **This SvelteKit app owns composition:** public routes, admin host routes,
  validated checkout requests, and per-client presentation.
- **The hub owns commerce execution:** connected-account Checkout creation,
  Stripe commerce webhook intake, shared Convex order writes, fulfillment,
  refunds, and order notifications belong in `../angelsrest`.
- **The Studio template is upstream:** shared Studio schema/component changes
  belong in `../sanity-studio-template`, then sync into
  `../reflecting-pool-studio`.

Do not add a local `convex/` directory. Consume `@jessepomeroy/crm-api` through
the `$convex` alias.

## Public-site design and performance

- Preserve Reflecting Pool's ink/paper palette, Cormorant typography,
  lowercase tone, and underwater/floating visual language unless the user asks
  for an aesthetic change.
- CSS owns ambient motion; JavaScript owns interactive physics and parallax.
- Do not have CSS animation and JavaScript both write the same `transform`.
  Bridge through CSS custom properties.
- Use one shared input/parallax loop; avoid per-component pointer listeners and
  allocations inside animation frames.
- Touch targets are at least 44px and mobile behavior is designed with the
  desktop behavior, not added later.
- Use `will-change` only while an element is actively interactive.

## Content loading

Server content modules live under `src/lib/server/content/` and use
`fetchSanityOrFallback` from `sanityClient.ts`. The fallback keeps development
and builds usable when Sanity is unavailable; it is not a second authoritative
content store. New production content fields must be added upstream in the
Studio schema and reflected in the GROQ/normalization boundary.

## Admin authentication and transport

- Better Auth owns the session.
- `src/routes/admin/+layout.server.ts` validates the session, checks stored
  `adminEmails` membership for this site, and returns authorized tier data
  before child server loads run.
- `src/routes/admin/+layout.svelte` authenticates the browser Convex WebSocket
  manually with `setupAuth`.
- Queries use the authenticated WebSocket.
- Mutations use `/api/admin/mutation` and a fresh authenticated
  `ConvexHttpClient` through `@jessepomeroy/admin`'s HTTP transport.
- New tenant data access must authorize stored membership; `siteUrl` supplied by
  the browser is not authorization.
- Shared admin HTTP handlers use the host's per-request site-admin verifier;
  never replace it with an identity-only session check.

Do not replace the manual WebSocket auth with `createSvelteAuthClient` without
testing client navigation, refresh, expiry, and logout behavior.

Public contact submissions must keep Turnstile verification in
`/api/contact`, ahead of email or persistence side effects. The browser may
collect the challenge token but is not the trusted verification boundary. New
client hostnames must be added to the shared widget before launch.

## Commerce and fulfillment

- `/api/checkout` rate-limits and validates the requested print against local
  shared pricing, then asks the Angels Rest hub to create the tenant's Stripe
  session. It uses the platform account during controlled pre-handoff testing
  and the connected account after onboarding.
- `CHECKOUT_BRIDGE_SECRET` is unique to this tenant. The hub binds it to the
  canonical `zippymiggy.com` tenant and explicit public redirect origins; never
  copy it to another client repository.
- The Angels Rest `/api/webhooks/stripe` endpoint is the single commerce-event
  owner for this spoke and future Stripe Connect clients.
- This repository has no Stripe commerce webhook or outbound LumaPrints client.
  Do not add either to a future client spoke.
- Reflecting Pool remains pre-handoff and currently has no connected Stripe
  account. Complete Connect onboarding and verify the hub's connected-account
  webhook destination before enabling client-owned live orders.
- The Angels Rest `/api/webhooks/lumaprints` endpoint is the single shipment-event
  owner for this spoke and future clients. This repository must not hold the
  platform `WEBHOOK_SECRET` or provider webhook credentials.
- Checkout session and LumaPrints order identifiers are idempotency boundaries.
  Never move email or physical-fulfillment side effects ahead of their claims.

See `LUMAPRINTS.md` before changing this flow.

## Gallery domains

- Public portfolio galleries are Sanity content.
- Private delivery galleries are shared Convex records plus R2 objects served by
  `../gallery-worker`.
- Admin gallery handlers come from `@jessepomeroy/admin/server` and must enforce
  tenant scope before issuing Worker requests.

## Key files

- Site identity: `src/lib/config/site.ts`
- Admin host config: `src/lib/config/admin.ts`, `admin.server.ts`
- Sanity boundary: `src/lib/server/sanityClient.ts`, `src/lib/server/content/`
- Checkout boundary: `src/lib/server/checkoutIntake.ts`, `checkoutBridge.ts`
- LumaPrints ownership and handoff notes: `LUMAPRINTS.md`
- Gallery delivery browser behavior: `@jessepomeroy/gallery-delivery`
- Shared package aliases: `svelte.config.js`

## Checks

```bash
pnpm lint
pnpm check
pnpm test
pnpm build
```

Do not run formatting/write modes during a read-only task. Do not run live smoke
commands unless the user explicitly places the configured external environment
in scope.

## Git rules

- Use a focused branch unless the user specifies otherwise.
- Do not commit, push, deploy, or change external configuration without explicit
  permission.
- Preserve unrelated worktree changes.
- Do not add AI-assistant co-author trailers.

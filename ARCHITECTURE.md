# Architecture — Reflecting Pool

Reflecting Pool is a client spoke. It owns client presentation and HTTP
composition while sharing operational backend and admin packages with the
Angels Rest platform.

## Dependency direction

```text
reflecting-pool (SvelteKit host)
  ├── reflecting-pool-studio / Sanity (client editorial content)
  ├── @jessepomeroy/crm-api / shared Convex (operations)
  ├── @jessepomeroy/admin (shared admin UI and server handlers)
  ├── @jessepomeroy/print-catalog (pure print metadata/pricing)
  ├── angelsrest hub checkout bridge (Stripe Connect session creation)
  └── gallery-worker (R2 upload and delivery)
```

Shared packages and upstream services do not import this host. Per-client visual
components and fallback content remain local.

## Data ownership

| Domain | Owner | Local boundary |
|---|---|---|
| Homepage, portfolio, about, modeling, shop catalog, site settings | Sanity | `src/lib/server/content/`, `sanityClient.ts` |
| Orders and fulfillment state | Shared Convex | Angels Rest commerce webhook; local `orderIntake.ts` is migration-only |
| CRM, invoices, quotes, contracts, messages, board | Shared Convex | `@jessepomeroy/admin` pages |
| Private delivery gallery metadata | Shared Convex | delivery page/admin package |
| Delivery image/archive objects | Gallery Worker + R2 | `src/lib/galleryDelivery/`, admin server routes |
| Print choices and wholesale/retail helpers | `@jessepomeroy/print-catalog` plus local pricing policy | `src/lib/shop/` |

Sanity loaders intentionally have local fallbacks. Fallbacks are resilience and
development fixtures, not an alternate CMS.

## Public request flows

### Content

Public server loads call one content module. That module fetches and normalizes
Sanity data or returns a typed fallback. Browser components receive normalized
data rather than importing Sanity credentials or clients.

### Print checkout

1. Browser submits a product/material/size choice to `/api/checkout`.
2. The route rate-limits the caller.
3. `checkoutIntake.ts` validates dimensions, material ID, and server-owned price.
4. `checkoutBridge.ts` sends a signed request to the Angels Rest hub.
5. The request carries the bare-domain operational tenant key separately from
   this site's public redirect origin.
6. The hub creates a Stripe Connect Checkout session for this tenant.
7. Stripe sends the connected-account event to the hub commerce webhook.
8. The hub creates/reuses the shared Convex order, submits LumaPrints, applies
   refund recovery, and sends applicable notifications.

The local Stripe webhook and `orderIntake.ts` remain only as a staged migration
compatibility path. Existing deployments default to that path until live Stripe
routing is verified. With `STRIPE_COMMERCE_WEBHOOK_OWNER=hub`, an unexpected
local Checkout event returns a non-2xx response and performs no side effects.
Future spokes use the bridge and hub webhook; they do not copy this compatibility
path.

### Shipment webhook

The LumaPrints webhook validates its configured authentication, looks up the
shared Convex order, atomically claims the shipment-email side effect, sends the
client-branded email, and records delivery status. Retryable claim failures must
propagate so the upstream can retry.

## Admin request flow

1. Better Auth establishes the session.
2. The server layout validates identity and loads tenant tier.
3. The browser WebSocket receives a JWT through `/api/admin/token` and
   `setupAuth` for reactive queries.
4. Mutations POST to `/api/admin/mutation`; the server creates a fresh
   authenticated Convex HTTP client.
5. Shared Convex functions enforce tenant membership.
6. Gallery HTTP handlers separately authorize and call the gallery Worker.

The tenant key in `src/lib/config/admin.ts` is an operational identifier and
must match the shared `platformClients.siteUrl` record exactly. Public canonical
URLs are owned by `src/lib/config/site.ts` and deployment configuration; do not
silently conflate the two when changing domains.

## Visual architecture

- `ParallaxProvider.svelte` is the shared interactive-input boundary.
- CSS custom properties compose interactive offsets with ambient CSS motion.
- `GalleryExperience`, `ClusterField`, `GalleryView`, `PhotoCard`,
  `WaterSurface`, and `LeafLayer` own distinct visual behaviors.
- Public visual state remains local to the Svelte tree; operational data does
  not belong in animation components.
- Mobile, reduced-motion, and input-capability paths are part of each behavior's
  contract.

The original visual concept is archived at
`docs/archive/visual-architecture-concept.md`; it is not a source map for the
current component tree.

## Documentation ownership

- `AGENTS.md`: repository rules and constraints.
- `ARCHITECTURE.md`: current ownership and request flows.
- `LUMAPRINTS.md`: current print/shipment integration.
- `reflecting-pool-studio`: actual Sanity schema.
- `docs/archive/`: historical audit/spec context only.

# LumaPrints integration — Reflecting Pool

LumaPrints is the physical-fulfillment boundary for eligible Reflecting Pool
print orders. Stripe owns payment, shared Convex owns order state, and
LumaPrints owns production/shipment.

## Outbound order flow

```text
/api/checkout
  → checkoutIntake.ts (rate, shape, and server-price validation)
  → checkoutBridge.ts (signed request to Angels Rest hub)
  → hub-owned Stripe Checkout (platform during testing; Connect after handoff)
  → Angels Rest /api/webhooks/stripe (tenant resolution + signature verification)
  → hub orderIntake.ts (Convex order + LumaPrints + refund recovery + email)
```

The Convex order is idempotent by Stripe checkout session. A persisted
`lumaprintsOrderNumber` prevents a repeated Stripe event from submitting a
second physical order.

Reflecting Pool is still pre-handoff and has no connected Stripe account. That
is acceptable for controlled testing on the hub platform account; client-owned
live sales require completed Connect onboarding and verified Connect-event
delivery to the hub first.

## Inbound shipment flow

LumaPrints sends its authenticated `shipping` event to the Angels Rest hub at
`/api/webhooks/lumaprints`. The hub resolves the globally unique LumaPrints
order number through shared Convex, claims a tokenized shipment-email lease,
resolves the stored tenant notification profile, sends through Resend with a
stable provider-order idempotency key, and records the delivery outcome.

Convex fences each send with a lease, while Resend remains an external side
effect whose outcome the hub must checkpoint. The package's deprecated
site-scoped shipment APIs require an authenticated site admin and reject
webhook-secret-only callers. The hub uses the provider-global V2 lease APIs.

## Ownership

| Concern | Source of truth |
|---|---|
| Product editorial content and variants | `reflecting-pool-studio` / Sanity |
| Papers, sizes, frames, canvas, Luma IDs | `@jessepomeroy/print-catalog` |
| Retail pricing policy | `src/lib/shop/pricing.ts` |
| Order and shipment-email state | shared Convex `orders` |
| Luma HTTP client and payload builder | Angels Rest hub |
| Luma shipment webhook and shipment email | Angels Rest hub |
| Checkout request validation | `checkoutIntake.ts`, `checkoutBridge.ts` |
| Order/refund orchestration | Angels Rest commerce webhook and `orderIntake.ts` |

This spoke owns neither inbound nor outbound LumaPrints credentials. It has no
shipment callback, order-submission client, or platform-wide Convex webhook
bearer. Client branding comes from the hub's stored commerce profile.

## Image constraints

- Prepare Sanity URLs through `src/lib/shop/lumaprintsUrls.ts`.
- Do not send WebP presentation transforms to LumaPrints.
- Paper prints use the request-builder option policy; do not duplicate option
  IDs in route code.
- Treat configured paper dimensions and subcategory IDs as server-validated
  data before creating payment or fulfillment requests.

## Environment

The authoritative variable list is `.env.example`. The only fulfillment-related
spoke variables are the checkout bridge URL and its unique tenant-specific
spoke-to-hub signing secret:

- Checkout bridge

There are no LumaPrints or shared Convex webhook variables in this repository.
Do not reuse the checkout bridge secret for another client; the hub binds this
value to `zippymiggy.com` and its explicit redirect-origin allowlist.

Use `.env.local` for local development. Do not run external shipment or email
smoke tests against production without explicit scope.

## Verification

```bash
pnpm test
```

External smoke tests require explicit scope because they can create upstream
orders, send email, or mutate shared operational state.

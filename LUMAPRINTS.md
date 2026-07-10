# LumaPrints integration — Reflecting Pool

LumaPrints is the physical-fulfillment boundary for eligible Reflecting Pool
print orders. Stripe owns payment, shared Convex owns order state, and
LumaPrints owns production/shipment.

## Outbound order flow

```text
/api/checkout
  → checkoutIntake.ts (rate, shape, and server-price validation)
  → checkoutBridge.ts (signed request to Angels Rest hub)
  → Stripe Connect Checkout
  → Angels Rest /api/webhooks/stripe (tenant resolution + signature verification)
  → hub orderIntake.ts (Convex order + LumaPrints + refund recovery + email)
```

The Convex order is idempotent by Stripe checkout session. A persisted
`lumaprintsOrderNumber` prevents a repeated Stripe event from submitting a
second physical order.

## Inbound shipment flow

`/api/webhooks/lumaprints` accepts the configured LumaPrints webhook
authentication, resolves the order through shared Convex, claims the one-time
shipment email, sends through Resend, and records whether delivery was sent,
failed, or skipped.

Keep claim and delivery recording separate: Convex provides the atomic claim;
Resend remains an external side effect whose outcome must be observable.

## Ownership

| Concern | Source of truth |
|---|---|
| Product editorial content and variants | `reflecting-pool-studio` / Sanity |
| Papers, sizes, frames, canvas, Luma IDs | `@jessepomeroy/print-catalog` |
| Retail pricing policy | `src/lib/shop/pricing.ts` |
| Order and shipment-email state | shared Convex `orders` |
| Luma HTTP client and payload builder | Angels Rest hub for outbound orders; this spoke for shipment lookup |
| Checkout request validation | `checkoutIntake.ts`, `checkoutBridge.ts` |
| Order/refund orchestration | Angels Rest commerce webhook and `orderIntake.ts` |

The spoke's Stripe `orderIntake.ts` remains temporarily for a staged endpoint
migration and must not be copied into future client repositories.

## Image constraints

- Prepare Sanity URLs through `src/lib/shop/lumaprintsUrls.ts`.
- Do not send WebP presentation transforms to LumaPrints.
- Paper prints use the request-builder option policy; do not duplicate option
  IDs in route code.
- Treat configured paper dimensions and subcategory IDs as server-validated
  data before creating payment or fulfillment requests.

## Environment

The authoritative variable list is `.env.example`. Relevant groups include:

- Stripe/checkout bridge
- `WEBHOOK_SECRET`
- `LUMAPRINTS_API_KEY`, `LUMAPRINTS_API_SECRET`, `LUMAPRINTS_STORE_ID`
- `LUMAPRINTS_USE_SANDBOX`
- LumaPrints webhook secret/signing secret
- Resend sender/recipient configuration

Use `.env.local` for development and LumaPrints sandbox outside production.

## Verification

```bash
pnpm exec vitest run src/lib/__tests__/lumaprints.test.ts
pnpm exec vitest run src/routes/__tests__/webhook-stripe.test.ts
pnpm exec vitest run src/routes/__tests__/webhook-lumaprints.test.ts
pnpm test
```

External smoke tests require explicit scope because they can create upstream
orders, send email, or mutate shared operational state.

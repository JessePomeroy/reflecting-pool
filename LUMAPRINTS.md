# LumaPrints Integration — Reflecting Pool

*Print-on-demand fulfillment for fine art photography prints*

---

## Overview

Customers browse the shop, select a photo + paper type + size, checkout via Stripe. The system auto-submits the order to LumaPrints for printing and shipping. No manual intervention needed.

```
Customer → Shop → Stripe Checkout → Webhook → LumaPrints API → Print + Ship → Customer
                                       ↓
                                  Sanity Order (tracking)
                                       ↑
                              LumaPrints Webhook (shipped)
```

---

## Account

| Field | Value |
|---|---|
| Store ID | 83765 |
| API Base (Production) | `https://us.api.lumaprints.com` |
| API Base (Sandbox) | `https://us.api-sandbox.lumaprints.com` |
| Auth | Basic HTTP (API Key = username, API Secret = password) |
| Dashboard | https://dashboard.lumaprints.com |

---

## Products

Only **Fine Art Paper** (category 103). Keep it simple.

| Paper | Subcategory ID | Sizes | Cost Range |
|---|---|---|---|
| Archival Matte | 103001 | 4×6, 8×10, 11×14, 16×20 | $1.71 – $8.50 |
| Glossy | 103007 | 4×6, 8×10, 11×14, 16×20 | $3.02 – $10.20 |

**Option 39** (No Bleed) — ALWAYS use this. Avoids aspect ratio validation errors that plagued the angelsrest integration.

---

## Known Issues (from angelsrest) & Fixes

### Issue 1: Aspect Ratio Rejection
**Problem:** LumaPrints API rejected orders with aspect ratio errors even for valid sizes.
**Root cause:** Sanity CDN image URLs had query params (`?w=1200&fm=webp`) that confused LumaPrints' image processing.
**Fix:** Strip ALL query params from image URLs before sending to LumaPrints. Use the raw Sanity CDN URL:
```ts
// BAD: https://cdn.sanity.io/images/abc/prod/image.jpg?w=1200&fm=webp
// GOOD: https://cdn.sanity.io/images/abc/prod/image.jpg
function cleanImageUrl(sanityUrl: string): string {
  return sanityUrl.split('?')[0];
}
```

### Issue 2: Bleed Option Conflicts
**Problem:** Default bleed option (36) caused size validation failures.
**Fix:** Always use option 39 (No Bleed). Never send option 36.

### Issue 3: Image Format
**Problem:** WebP URLs may not be accepted.
**Fix:** Always request JPEG from Sanity CDN (no `?fm=webp`). The raw URL serves JPEG by default.

---

## Architecture

### New Files

```
src/
├── lib/
│   ├── server/
│   │   ├── lumaprints.ts          # API client (server-only)
│   │   └── stripe.ts              # Stripe helpers (server-only)
│   └── shop/
│       ├── types.ts               # PrintProduct, PaperOption, Order types
│       └── pricing.ts             # Retail price calculations
├── routes/
│   ├── shop/
│   │   ├── +page.svelte           # Shop listing (prints available for purchase)
│   │   ├── +page.server.ts        # Fetch products from Sanity
│   │   └── [slug]/
│   │       ├── +page.svelte       # Single product (paper picker + buy button)
│   │       └── +page.server.ts    # Fetch product + available papers
│   ├── api/
│   │   ├── checkout/
│   │   │   └── +server.ts         # Create Stripe checkout session
│   │   └── webhooks/
│   │       ├── stripe/
│   │       │   └── +server.ts     # Stripe webhook → create order + submit to LumaPrints
│   │       └── lumaprints/
│   │           └── +server.ts     # LumaPrints webhook → update tracking
```

### LumaPrints API Client (`src/lib/server/lumaprints.ts`)

```ts
import { LUMAPRINTS_API_KEY, LUMAPRINTS_API_SECRET, LUMAPRINTS_STORE_ID } from '$env/static/private';

const BASE_URL = import.meta.env.DEV
  ? 'https://us.api-sandbox.lumaprints.com'
  : 'https://us.api.lumaprints.com';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Basic ${btoa(`${LUMAPRINTS_API_KEY}:${LUMAPRINTS_API_SECRET}`)}`
};

export async function createOrder(order: LumaPrintsOrder): Promise<LumaPrintsOrderResponse> {
  const res = await fetch(`${BASE_URL}/api/v1/orders`, {
    method: 'POST',
    headers,
    body: JSON.stringify(order)
  });

  if (!res.ok) {
    const error = await res.json();
    throw new LumaPrintsError(`Order submission failed`, error);
  }

  return res.json();
}

export async function getOrder(orderNumber: string): Promise<LumaPrintsOrderStatus> {
  const res = await fetch(`${BASE_URL}/api/v1/orders/${orderNumber}`, { headers });
  if (!res.ok) throw new LumaPrintsError(`Failed to get order ${orderNumber}`);
  return res.json();
}

export async function getShipping(orderNumber: string): Promise<LumaPrintsShipment[]> {
  const res = await fetch(`${BASE_URL}/api/v1/orders/${orderNumber}/shipments`, { headers });
  if (!res.ok) throw new LumaPrintsError(`Failed to get shipments for ${orderNumber}`);
  return res.json();
}

export async function validateImage(imageUrl: string, width: number, height: number): Promise<ImageCheckResult> {
  const res = await fetch(`${BASE_URL}/api/v1/images/check`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      imageUrl: cleanImageUrl(imageUrl),
      width,
      height,
      subcategoryId: 103001 // Fine art paper
    })
  });
  return res.json();
}

export async function getShippingPrice(
  items: { subcategoryId: number; width: number; height: number; quantity: number }[],
  destination: { country: string; state: string; zipCode: string }
): Promise<ShippingPriceResponse> {
  const res = await fetch(`${BASE_URL}/api/v1/pricing/shipping`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      storeId: Number(LUMAPRINTS_STORE_ID),
      shippingMethod: 'default',
      recipient: destination,
      orderItems: items
    })
  });
  return res.json();
}

function cleanImageUrl(url: string): string {
  return url.split('?')[0];
}

class LumaPrintsError extends Error {
  details: unknown;
  constructor(message: string, details?: unknown) {
    super(message);
    this.name = 'LumaPrintsError';
    this.details = details;
  }
}
```

### Order Submission Builder

```ts
export function buildLumaPrintsOrder(
  externalId: string,
  recipient: Recipient,
  items: OrderItem[]
): LumaPrintsOrder {
  return {
    externalId,
    storeId: Number(LUMAPRINTS_STORE_ID),
    shippingMethod: 'default',
    recipient: {
      firstName: recipient.firstName,
      lastName: recipient.lastName,
      addressLine1: recipient.address1,
      addressLine2: recipient.address2 || '',
      city: recipient.city,
      state: recipient.state,
      zipCode: recipient.zip,
      country: recipient.country,
      phone: recipient.phone || ''
    },
    orderItems: items.map((item, i) => ({
      externalItemId: `${externalId}-item-${i + 1}`,
      subcategoryId: item.paperSubcategoryId,
      quantity: item.quantity,
      width: item.width,
      height: item.height,
      file: {
        imageUrl: cleanImageUrl(item.imageUrl) // CRITICAL: strip query params
      },
      orderItemOptions: [39] // ALWAYS No Bleed (option 39)
    }))
  };
}
```

### Stripe Webhook Flow (`src/routes/api/webhooks/stripe/+server.ts`)

```ts
export async function POST({ request }) {
  // 1. Verify Stripe signature
  const event = verifyStripeWebhook(request);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    // 2. Extract order details from Stripe metadata
    const { imageUrl, paperSubcategoryId, paperWidth, paperHeight, paperName } = session.metadata;
    const customer = session.customer_details;
    const shipping = session.shipping_details;

    // 3. Create order in Sanity
    const sanityOrder = await sanityClient.create({
      _type: 'order',
      stripeSessionId: session.id,
      customerEmail: customer.email,
      customerName: customer.name,
      status: 'processing',
      paperName,
      paperSize: `${paperWidth}×${paperHeight}`,
      amount: session.amount_total / 100,
      createdAt: new Date().toISOString()
    });

    // 4. Submit to LumaPrints
    try {
      const lpOrder = buildLumaPrintsOrder(
        sanityOrder._id,
        {
          firstName: shipping.name.split(' ')[0],
          lastName: shipping.name.split(' ').slice(1).join(' '),
          address1: shipping.address.line1,
          address2: shipping.address.line2,
          city: shipping.address.city,
          state: shipping.address.state,
          zip: shipping.address.postal_code,
          country: shipping.address.country,
        },
        [{
          imageUrl,
          paperSubcategoryId: Number(paperSubcategoryId),
          width: Number(paperWidth),
          height: Number(paperHeight),
          quantity: 1
        }]
      );

      const result = await createOrder(lpOrder);

      // 5. Update Sanity with LumaPrints order number
      await sanityClient.patch(sanityOrder._id).set({
        lumaprintsOrderNumber: result.orderNumber,
        status: 'submitted'
      }).commit();

    } catch (error) {
      // Log error, update Sanity status to 'fulfillment_error'
      console.error('LumaPrints submission failed:', error);
      await sanityClient.patch(sanityOrder._id).set({
        status: 'fulfillment_error',
        fulfillmentError: error.message
      }).commit();
      // TODO: Send alert to admin
    }
  }

  return new Response('ok');
}
```

### LumaPrints Webhook (`src/routes/api/webhooks/lumaprints/+server.ts`)

```ts
export async function POST({ request }) {
  const payload = await request.json();

  if (payload.event === 'shipment.created') {
    const { orderNumber, trackingNumber, trackingUrl, carrier } = payload.data;

    // Find order in Sanity by LumaPrints order number
    const order = await sanityClient.fetch(
      `*[_type == "order" && lumaprintsOrderNumber == $orderNumber][0]`,
      { orderNumber }
    );

    if (order) {
      await sanityClient.patch(order._id).set({
        status: 'shipped',
        trackingNumber,
        trackingUrl,
        shippingCarrier: carrier,
        shippedAt: new Date().toISOString()
      }).commit();

      // TODO: Send "order shipped" email to customer
    }
  }

  return new Response('ok');
}
```

---

## Sanity Schema Additions

### Order document (add to SANITY-SCHEMA.md)

```ts
{
  name: 'order',
  type: 'document',
  title: 'Order',
  icon: PackageIcon,
  fields: [
    { name: 'stripeSessionId', type: 'string', title: 'Stripe Session ID' },
    { name: 'customerName', type: 'string', title: 'Customer Name' },
    { name: 'customerEmail', type: 'string', title: 'Customer Email' },
    { name: 'status', type: 'string', title: 'Status',
      options: { list: [
        'processing', 'submitted', 'printing', 'shipped',
        'delivered', 'fulfillment_error', 'cancelled', 'refunded'
      ]},
      initialValue: 'processing' },
    { name: 'paperName', type: 'string', title: 'Paper Type' },
    { name: 'paperSize', type: 'string', title: 'Print Size' },
    { name: 'amount', type: 'number', title: 'Amount ($)' },
    { name: 'lumaprintsOrderNumber', type: 'string', title: 'LumaPrints Order #' },
    { name: 'trackingNumber', type: 'string', title: 'Tracking Number' },
    { name: 'trackingUrl', type: 'url', title: 'Tracking URL' },
    { name: 'shippingCarrier', type: 'string', title: 'Carrier' },
    { name: 'fulfillmentError', type: 'text', title: 'Fulfillment Error',
      hidden: ({ document }) => document?.status !== 'fulfillment_error' },
    { name: 'notes', type: 'text', title: 'Internal Notes' },
    { name: 'createdAt', type: 'datetime', title: 'Created' },
    { name: 'shippedAt', type: 'datetime', title: 'Shipped' }
  ],
  orderings: [
    { title: 'Newest', name: 'newest', by: [{ field: 'createdAt', direction: 'desc' }] }
  ],
  preview: {
    select: { name: 'customerName', status: 'status', amount: 'amount', date: 'createdAt' },
    prepare: ({ name, status, amount, date }) => ({
      title: `${name} — $${amount}`,
      subtitle: `${status} · ${new Date(date).toLocaleDateString()}`
    })
  }
}
```

---

## Environment Variables

```bash
# .env (gitignored)
LUMAPRINTS_API_KEY=eab4f36a...
LUMAPRINTS_API_SECRET=5ce35c...
LUMAPRINTS_STORE_ID=83765

STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

SANITY_PROJECT_ID=...
SANITY_DATASET=production
SANITY_API_TOKEN=...  # write access for webhooks
```

---

## Testing Checklist

- [ ] Sandbox: Submit test order with clean image URL + option 39
- [ ] Sandbox: Verify no aspect ratio errors
- [ ] Sandbox: Verify webhook receives shipment notification
- [ ] Stripe: Test checkout flow end-to-end
- [ ] Sanity: Verify order document created with correct fields
- [ ] Sanity: Verify status updates (processing → submitted → shipped)
- [ ] Error handling: Simulate LumaPrints API failure
- [ ] Error handling: Simulate invalid image URL
- [ ] Production: Add all env vars to Vercel
- [ ] Production: Register LumaPrints webhook URL
- [ ] Production: First real order test

---

## Retail Pricing Strategy

| Paper | Size | Your Cost | Suggested Retail | Margin |
|---|---|---|---|---|
| Archival Matte | 4×6 | ~$1.71 + shipping | $15 | ~$10 |
| Archival Matte | 8×10 | ~$3.19 + shipping | $35 | ~$25 |
| Archival Matte | 11×14 | ~$5.50 + shipping | $55 | ~$40 |
| Archival Matte | 16×20 | ~$8.50 + shipping | $85 | ~$60 |
| Glossy | 4×6 | ~$3.02 + shipping | $18 | ~$12 |
| Glossy | 8×10 | ~$5.09 + shipping | $40 | ~$28 |

*Shipping ~$5-8 domestic, varies by size. Factor into retail price or charge separately.*

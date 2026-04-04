# Testing Pipeline — Reflecting Pool

*Step-by-step guide for Jesse to test the full site before involving the client.*

---

## Phase 1: Local Dev (No Credentials Needed)

Everything works with mock data out of the box.

```bash
cd ~/Documents/work/reflecting-pool
pnpm install
pnpm dev
```

### Checklist — Portfolio

```
□ Open https://localhost:5173 (HTTPS — accept self-signed cert)
□ See 5 floating clusters (Wildflowers, Garden Portraits, etc.)
□ Hover over clusters — titles brighten, photos get shadows
□ Click a cluster — other clusters dismiss to edges, gallery opens
□ Gallery shows scattered photos (desktop) or 2-column (mobile)
□ Click a photo — lightbox opens
□ In lightbox: arrow keys work, escape closes, image counter shows
□ Click "back" (stroke-outlined, below title area) — returns to cluster index
□ Gallery title shows centered below title area (stroke-outlined)
□ Click the title "margaret helena" — letters ripple/wobble
□ Leaves float around, click one — it blows away and comes back
□ Click near clusters — clusters bounce away and spring back (gentle)
□ Click near leaves — leaves drift away and keep floating (no spring-back)
□ Click anywhere on background — ripple rings appear
□ Title is top-left with stroke text, fades at bottom (gradient mask)
□ Navigation links are top-right
□ Background is smooth gradient (dark navy → grey), no solid header block
```

### Checklist — Liquid Cursor (Desktop Only)

```
□ Exit Chrome DevTools responsive/device mode (Cmd+Shift+M)
□ Default browser cursor is hidden
□ Translucent blue-white blob follows mouse smoothly
□ Move fast — blob stretches in movement direction
□ Stop moving — blob wobbles/settles
□ Trail of smaller blobs appears behind fast movements
□ Trail blobs merge with main blob when close (liquid feel)
□ Cursor renders above all content (z-9999)
□ Cursor does NOT block clicks (pointer-events: none)
□ No WebGL errors in browser console
□ Chrome DevTools Performance: cursor < 2ms per frame
```

### Checklist — Mobile

```
□ Open on phone via https://[your-ip]:5173 (accept cert warning)
□ Clusters stack vertically (not floating)
□ Clusters start below the title area (~55% from top)
□ Navigation shows hamburger menu
□ Hamburger opens overlay with nav links
□ Gallery is 2-column layout
□ Lightbox: swipe left/right works
□ Default browser cursor visible (no liquid cursor on mobile)
□ Everything readable, nothing overflows
```

### Checklist — Gyroscope Parallax (iOS/Android Phone)

```
□ Open site on phone over HTTPS (required for gyroscope)
□ Tap anywhere on the page
□ iOS: should see "Allow motion & orientation" permission prompt
□ Grant permission
□ Tilt phone left/right — clusters and leaves shift horizontally
□ Tilt phone forward/back — clusters and leaves shift vertically
□ Movement is smooth (lerp-smoothed, not jittery)
□ Android: gyroscope should work immediately without permission prompt
```

### Checklist — Reduced Motion

```
□ System Settings → Accessibility → Display → Reduce Motion: ON
□ Refresh page
□ Photos should be visible but NOT floating/drifting
□ Leaves visible but NOT spinning/drifting
□ No ripple rings on click
□ Liquid cursor is disabled (normal browser cursor shown)
□ Click-ripple on clusters/leaves is disabled
□ Title displays but no letter ripple animation
□ Everything still looks good, just peaceful
□ Turn Reduce Motion back OFF when done
```

### Checklist — Shop

```
□ Navigate to /shop
□ See collections grid at top (5 collections with cover images)
□ See all prints grid below
□ Click a collection → collection page with prints grid
□ Breadcrumb shows: shop › collection name
□ Click a print → product page
□ Paper type selector works (Archival Matte / Glossy)
□ Size selector works (4×6, 8×10, 11×14, 16×20)
□ Price updates when you change paper/size
□ "Buy Now" button exists (won't work without Stripe — that's fine)
□ Breadcrumb shows: shop › collection › print name
```

### Checklist — About / Contact

```
□ Navigate to /about
□ See 3-column layout: portrait | bio | contact form + booking
□ Bio text is lowercase, Cormorant font
□ Contact form has: name, email, subject, message
□ Submit form — will show error (no Resend key — expected)
□ "Book a session" button exists (Cal.com placeholder)
□ On mobile: stacks to single column
```

### Checklist — Admin

```
□ Navigate to /admin
□ See dashboard with revenue cards, sparkline chart, recent orders
□ Sidebar: Dashboard, Orders, Inquiries, Galleries, Back to Site
□ /admin/orders — orders table with filters, search, CSV export
□ Click an order row — detail modal opens
□ Change status dropdown — works
□ Add notes — save button works
□ /admin/inquiries — inquiry table
□ Click inquiry — full message view
□ /admin/galleries — collection overview
□ Mobile: sidebar collapses to hamburger
```

### Checklist — Error Pages

```
□ Navigate to /shop/nonexistent-slug → shop error page
□ Navigate to /totally-fake-page → 404 page with "page not found"
□ Both should look clean, not broken
```

### Checklist — Technical

```
□ Open browser console — no errors (warnings are OK)
□ No debug console.log statements from LiquidCursor
□ Network tab — images load lazily (scroll to trigger)
□ Network tab — three.js loads via dynamic import (not in main bundle)
□ View source on /shop/[slug] — JSON-LD Product schema present
□ Visit /robots.txt — shows disallow /admin and /api
□ Visit /sitemap.xml — shows XML with pages
□ Run: pnpm test → tests pass
□ Run: npx svelte-check → 0 errors
```

### Checklist — Code Architecture

```
□ src/lib/utils/ripple.ts exists (shared physics)
□ src/lib/data/galleries.ts exists (extracted gallery data)
□ src/lib/shaders/cursor.ts exists (extracted GLSL)
□ ClusterField imports from ripple.ts (not inline physics)
□ LeafLayer imports from ripple.ts (not inline physics)
□ LiquidCursor imports from cursor.ts (not inline GLSL)
□ +page.svelte imports from galleries.ts (not inline data)
```

---

## Phase 2: Connect YOUR Sanity (Test With Your Account)

You don't need Maggie's credentials for this. Use your own Sanity account to test.

### 2a. Create Sanity Project

```bash
# Create a new studio project
mkdir ~/Documents/work/reflecting-pool-studio
cd ~/Documents/work/reflecting-pool-studio
npx sanity@latest init

# Choose:
# - Create new project: "Reflecting Pool Test"
# - Dataset: production
# - Template: Clean project with no predefined schemas
```

### 2b. Add Schemas

Copy the schemas from `SANITY-SCHEMA.md` into the studio's `schemaTypes/` folder.
Deploy: `npx sanity deploy`

### 2c. Set Environment Variables

```bash
# In reflecting-pool root, create .env
cp .env.example .env  # or create manually:

SANITY_PROJECT_ID=your-project-id
SANITY_DATASET=production
SANITY_API_TOKEN=your-write-token  # create in sanity.io/manage → API → Tokens

# Leave these as dummy for now:
LUMAPRINTS_API_KEY=test
LUMAPRINTS_API_SECRET=test
LUMAPRINTS_STORE_ID=0
STRIPE_SECRET_KEY=sk_test_dummy
STRIPE_WEBHOOK_SECRET=whsec_dummy
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_dummy
PUBLIC_SITE_URL=http://localhost:5173
RESEND_API_KEY=test
ADMIN_EMAIL=thinkingofview@gmail.com
```

### 2d. Uncomment Real GROQ Queries

In `src/lib/server/sanity.ts`:
- Find the commented-out GROQ queries
- Uncomment them
- Comment out or remove the mock data returns
- This is the most likely place for bugs — field names in queries vs actual schema

### 2e. Upload Test Content

In Sanity Studio:
```
□ Create 2-3 gallery documents with a few images each
□ Mark some images as printAvailable
□ Create an aboutPage document
□ Create siteSettings with social links
□ Set print prices on a few images
```

### 2f. Test With Real Data

```bash
cd ~/Documents/work/reflecting-pool
pnpm dev
```

```
□ Homepage shows galleries from Sanity (not mock data)
□ Shop shows prints marked as available
□ About page shows content from Sanity
□ Images load from Sanity CDN (check network tab — cdn.sanity.io)
□ Admin dashboard shows real data (or empty state)
```

---

## Phase 3: Connect Stripe (Test Mode)

### 3a. Use Your Stripe Account

```bash
# In .env, replace with your Stripe TEST keys:
STRIPE_SECRET_KEY=sk_test_your_key
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key
```

### 3b. Set Up Webhook (Local)

```bash
# Install Stripe CLI if you don't have it
brew install stripe/stripe-cli/stripe

# Forward webhooks to local dev server
stripe listen --forward-to localhost:5173/api/webhooks/stripe
# Copy the webhook signing secret it gives you → .env STRIPE_WEBHOOK_SECRET
```

### 3c. Test Checkout Flow

```
□ Go to /shop, pick a print, select paper + size
□ Click "Buy Now"
□ Stripe checkout opens (test mode)
□ Use test card: 4242 4242 4242 4242, any future expiry, any CVC
□ Complete checkout
□ Redirected to /shop/success
□ Check terminal — webhook received
□ Check Sanity Studio — order document created
□ LumaPrints will fail (dummy credentials) — that's expected
□ Order status should be "fulfillment_error" in Sanity
```

---

## Phase 4: Connect LumaPrints (Sandbox)

### 4a. Use Sandbox Credentials

```bash
# In .env:
LUMAPRINTS_API_KEY=your-sandbox-key
LUMAPRINTS_API_SECRET=your-sandbox-secret
LUMAPRINTS_STORE_ID=83765
```

### 4b. Test Order Submission

```
□ Repeat Stripe checkout flow
□ This time LumaPrints should accept the order
□ Check Sanity — order status should be "submitted"
□ Check Sanity — lumaprintsOrderNumber should be populated
□ Check LumaPrints dashboard — order visible
```

### 4c. Verify the Bug Fixes

```
□ Check the image URL sent to LumaPrints — NO query params
□ Check orderItemOptions — should be [39] (No Bleed)
□ If both are correct, the angelsrest bugs are fixed ✅
```

---

## Phase 5: Deploy to Vercel

```bash
# Push to GitHub
cd ~/Documents/work/reflecting-pool
git remote add origin git@github.com:jessepomeroy/reflecting-pool.git
git push -u origin main

# In Vercel:
# 1. Import the GitHub repo
# 2. Framework: SvelteKit (auto-detected)
# 3. Add ALL environment variables from .env
# 4. Deploy
```

### Post-Deploy Checklist

```
□ Site loads on Vercel URL
□ All pages work (portfolio, shop, about, admin)
□ Update Stripe webhook URL to production Vercel URL
□ Update LumaPrints webhook URL to production Vercel URL
□ Vercel Analytics appears in dashboard
□ Test one more checkout end-to-end on production
```

---

## Phase 6: Client Handoff (When Ready)

See `CLIENT-HANDOFF.md` for the full guide. Short version:

1. Create Sanity project under Maggie's email
2. Help her create Stripe + LumaPrints accounts
3. Transfer Vercel project (or add her to team)
4. Point her domain at Vercel
5. Swap all env vars to her credentials
6. 30-min training call (record it)
7. Done

---

## Known Issues to Watch For

| Issue | When You'll Hit It | Fix |
|---|---|---|
| GROQ field name mismatch | Phase 2d | Compare query fields vs actual Sanity schema |
| Resend `from` domain not verified | Phase 3c (emails) | Verify domain in Resend dashboard |
| Cal.com placeholder link | Phase 1 (about page) | Replace with real Cal.com booking link |
| Image aspect ratios | Phase 2e | Some photos may not fit the gallery card layout — test with real photos |
| Admin auth disabled | All phases | Don't deploy publicly without enabling auth |

---

*Last updated: 2026-04-04*

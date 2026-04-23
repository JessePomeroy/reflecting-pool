# Client Handoff Guide — Reflecting Pool

*For the developer (Jesse) — how to hand off and price the project.*

---

## For Maggie — launch sequence

A concrete, ordered checklist to take reflecting-pool from the current
repo state to "Maggie can log in and start selling prints." Do these in
order; each step unblocks the next.

### 0. Prereqs (you have most of these)

```
□ Margaret's preferred admin email (Gmail-based — required for Google OAuth)
□ Margaret's business/legal name (for Stripe identity verification)
□ Margaret's domain name (she owns it; likely margarethelena.com)
□ A password manager to share final secrets (1Password / Bitwarden shared vault)
```

### 1. Stand up external services (in this order)

```
□ 1a. Convex project → https://dashboard.convex.dev
     - Create project "reflecting-pool"
     - Add Margaret as a member (Admin role) once her account exists
     - Run locally: npx convex dev  (creates CONVEX_DEPLOYMENT in .env.local)
     - Note: PUBLIC_CONVEX_URL (*.convex.cloud)
     - Note: PUBLIC_CONVEX_SITE_URL (*.convex.site) — same slug, different TLD

□ 1b. Sanity project → https://sanity.io/manage
     - Create project "Reflecting Pool" (free plan)
     - Note: Project ID
     - Create API token (Editor role, "Website")
     - Create API token (Write role, "Webhooks")
     - Add Margaret as admin
     - NOTE: src/lib/server/sanity.ts is currently mocked (audit H42).
       Before Maggie can actually sell prints, the mock needs to flip off
       — define `order`, `gallery`, `image` schemas in her Sanity Studio
       and uncomment the real `sanityClient.create/fetch/patch` calls.

□ 1c. Google Cloud project + OAuth client → https://console.cloud.google.com
     - Create project "Reflecting Pool"
     - OAuth consent screen → External → Testing mode (OK for <100 admins)
     - Add Margaret as a Test user (and yourself for debugging)
     - Add scopes: userinfo.email, userinfo.profile
     - Credentials → OAuth client ID → Web application
     - Authorized redirect URIs:
         http://localhost:5173/api/auth/callback/google
         https://<production-domain>/api/auth/callback/google
     - Note: Client ID, Client Secret
     - NOTE: repo uses Better Auth via @mmailaender/convex-better-auth-svelte,
       NOT Auth.js. ADMIN-AUTH.md is stale on this point — update it when
       time allows.

□ 1d. Stripe account → https://dashboard.stripe.com  (Margaret's business)
     - Complete identity verification (her legal name, SSN/EIN, bank account)
     - Note: Secret key (sk_live_... for prod, sk_test_... for dev)
     - Note: Publishable key (pk_live_... / pk_test_...)
     - Add webhook endpoint → https://<domain>/api/webhooks/stripe
     - Events: checkout.session.completed
     - Note: Webhook signing secret (whsec_...)

□ 1e. LumaPrints account → https://dashboard.lumaprints.com
     - Register using Margaret's name/address
     - Verify store
     - Note: Store ID, API Key, API Secret
     - Add webhook endpoint → https://<domain>/api/webhooks/lumaprints
     - Events: shipment.created
     - Configure webhook auth ONE of the following (audit C9):
         • HMAC signing → note the signing secret they provide
         • Query-string token → add ?token=<secret> to the webhook URL
           and generate the secret yourself: openssl rand -base64 32

□ 1f. Resend → https://resend.com
     - Create account under Margaret's email
     - Add sending domain (e.g. margarethelena.com)
     - Verify via DNS (SPF + DKIM records) — might need ~1 hour for
       DNS propagation
     - Note: API key (re_...)
     - Decide: FROM_EMAIL (e.g. orders@margarethelena.com)
     - Decide: ADMIN_EMAIL (where order notifications go — Margaret's inbox)

□ 1g. Cloudflare account + Gallery Worker → https://dash.cloudflare.com
     - Create Cloudflare account under Margaret's email
     - Create an R2 bucket (photo storage for gallery delivery)
     - Deploy the gallery-worker (separate repo at
       /Users/jessepomeroy/Documents/work/gallery-worker) to her
       Cloudflare account
     - Note: GALLERY_WORKER_URL (e.g. https://gallery-worker.<margaret-subdomain>.workers.dev)
     - Generate: GALLERY_ADMIN_SECRET with openssl rand -base64 32
       This MUST be a different value than the one previously used in
       reflecting-pool's shared setup (audit C11 — the old secret is
       rotated out).

□ 1h. Vercel project → https://vercel.com
     - Import the reflecting-pool GitHub repo
     - Add Margaret as a team member (Developer role at minimum)
     - Connect the custom domain (margarethelena.com)
     - Configure DNS records per Vercel's instructions
     - HTTPS auto-provisions (wait ~15 min after DNS lands)
     - DON'T deploy yet — environment variables need to land first.
```

### 2. Generate secrets

Run these locally and save to a password manager alongside the keys from
step 1:

```bash
openssl rand -base64 32  # BETTER_AUTH_SECRET
openssl rand -base64 32  # AUTH_SECRET
openssl rand -base64 32  # WEBHOOK_SECRET (Convex ↔ webhooks)
openssl rand -base64 32  # LUMAPRINTS_WEBHOOK_SECRET (if using query-token auth)
openssl rand -base64 32  # GALLERY_ADMIN_SECRET (also set on gallery-worker)
```

### 3. Set environment variables in Vercel

Dashboard → Project → Settings → Environment Variables. Set ALL of the
following for Production (copy to Preview/Development as appropriate):

See the full list in `.env.example` at the repo root. Group by service:

```
# Site
PUBLIC_SITE_URL=https://margarethelena.com

# Convex (from step 1a)
PUBLIC_CONVEX_URL=https://<slug>.convex.cloud
PUBLIC_CONVEX_SITE_URL=https://<slug>.convex.site

# Better Auth (from step 2 + 1c)
BETTER_AUTH_SECRET=<openssl rand -base64 32>
AUTH_SECRET=<openssl rand -base64 32>
SITE_URL=https://margarethelena.com
AUTH_GOOGLE_ID=<from step 1c>
AUTH_GOOGLE_SECRET=<from step 1c>

# Webhook secret (from step 2)
WEBHOOK_SECRET=<openssl rand -base64 32>

# Sanity (from step 1b)
SANITY_PROJECT_ID=<from step 1b>
SANITY_DATASET=production
SANITY_API_TOKEN=<write-role token from step 1b>

# Stripe (from step 1d)
STRIPE_SECRET_KEY=sk_live_...
PUBLIC_STRIPE_PUBLIC_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Resend (from step 1f)
RESEND_API_KEY=re_...
ADMIN_EMAIL=margaret@margarethelena.com
FROM_EMAIL=orders@margarethelena.com

# LumaPrints (from step 1e)
LUMAPRINTS_API_KEY=...
LUMAPRINTS_API_SECRET=...
LUMAPRINTS_STORE_ID=...
LUMAPRINTS_USE_SANDBOX=false   # true during testing
LUMAPRINTS_WEBHOOK_SIGNING_SECRET=<from step 1e, if HMAC>
LUMAPRINTS_WEBHOOK_SECRET=<from step 2, if query token>

# Gallery Worker (from step 1g)
GALLERY_WORKER_URL=https://gallery-worker.<margaret-slug>.workers.dev
GALLERY_ADMIN_SECRET=<from step 2>
```

### 4. Set environment variables on Convex

A subset of the above also needs to live on the Convex deployment
(Convex functions can't read from Vercel's env, so these must be set
separately):

```bash
npx convex env set WEBHOOK_SECRET "<same value as Vercel>"
npx convex env set BETTER_AUTH_SECRET "<same value as Vercel>"
npx convex env set SITE_URL "https://margarethelena.com"
npx convex env set AUTH_GOOGLE_ID "<same value as Vercel>"
npx convex env set AUTH_GOOGLE_SECRET "<same value as Vercel>"
# Optional, only if you're using the Stripe fee-capture action (audit H4
# — not yet ported to reflecting-pool):
# npx convex env set STRIPE_SECRET_KEY "<same value as Vercel>"
```

### 5. Register Margaret as an admin in Convex

Until the dashboard's tenant-onboarding flow exists, add Margaret's
admin email directly:

```bash
npx convex run platform:createClient '{
  "name": "Margaret Helena",
  "email": "margaret@margarethelena.com",
  "siteUrl": "reflecting-pool.com",
  "tier": "full",
  "subscriptionStatus": "active",
  "adminEmails": ["margaret@margarethelena.com"]
}'
```

(The exact siteUrl must match `siteUrl` in `src/lib/config/admin.ts`.)

### 6. Deploy

```
□ Push main branch to GitHub
□ Vercel auto-deploys
□ Verify https://margarethelena.com loads the landing page
□ Verify https://margarethelena.com/shop loads (mock Sanity data)
□ Verify https://margarethelena.com/admin redirects to /admin/login
□ Sign in with Margaret's email → land on dashboard
```

### 7. Repository hardening (one-time)

```
□ GitHub → Settings → Branches → Add rule for "main":
     - Require a pull request before merging
     - Require status checks: CI (lint + type check + tests)
     - Do not allow bypassing (audit H35)
□ GitHub → Settings → Secrets and variables → Actions:
     - GH_PACKAGES_TOKEN (for installing @jessepomeroy/admin in CI)
□ GitHub → Settings → Collaborators: add Margaret (or just leave as
  read-only for now if you're maintaining)
```

### 8. Content setup (Margaret does with your help)

```
□ Upload photos to Sanity Studio (or via the admin dashboard once the
  gallery-delivery UI is wired to her Cloudflare Worker)
□ Mark which images are available as prints
□ Configure print prices (src/lib/shop/pricing.ts for now; Sanity-driven
  once H42 lands)
□ Write About page content in Sanity
□ Upload the caustics background video
□ Add her social media links
□ Set SEO defaults (description, OG image, favicon)
□ Replace Cal.com placeholder with her real booking link (src/routes/about/+page.svelte)
```

### 9. Test full flow before going live

```
□ Switch Stripe → test mode, LumaPrints → sandbox, Resend → test key
□ Place a test purchase end-to-end:
    - Add item to cart → checkout
    - Complete payment
    - Verify: Stripe webhook fires → Sanity order created → LumaPrints
      submission → confirmation email sent
    - Verify: idempotency — resend the Stripe webhook from dashboard,
      confirm no duplicate order/print (audit C13/C14)
□ Send a test contact form submission → verify admin email arrives
□ Mint a test gallery token via the admin dashboard → open the
  /delivery/[token] URL → verify photos load, favorites toggle, download
  works (audit C5/C10, Tier 2c delivery route)
□ Verify the LumaPrints shipment.created webhook flow by triggering a
  test shipment in their sandbox
□ Mobile: walk the full flow on iPhone + Android
□ Switch to live/production keys, flip LUMAPRINTS_USE_SANDBOX=false
□ Place one real small-order test (e.g. 5x7 print to yourself) — this
  exercises live Stripe + LumaPrints + Resend end-to-end
```

### 10. Client training (30-min Zoom)

```
□ Admin dashboard tour (admin/orders, admin/crm, admin/galleries,
  admin/inquiries, admin/quotes, admin/invoicing, admin/contracts,
  admin/messages, admin/board, admin/emails)
□ How to upload + publish a new gallery
□ How to share a gallery delivery link (portal token flow)
□ How to mint + send a quote/invoice/contract via portal link
□ Where to see incoming orders and contact-form inquiries
□ How to adjust print prices
□ How to edit About/Contact copy in Sanity
```

Record the session as a Loom for her to reference later.

### 11. Post-handoff

```
□ Remove your email from `adminEmails` on her Convex platformClients
  row (keep a dev copy for maintenance)
□ Keep yourself as a Google Cloud Console test user so you can re-add
  yourself temporarily for future maintenance work
□ Transfer Vercel project ownership (or leave as team member — your call)
□ Share all credentials via password manager (1Password/Bitwarden vault)
□ Schedule a 30-day check-in and a 90-day check-in for iteration
```

### 12. Before her first paid customer — deferred audit items

These are tracked in `AUDIT.md` and should close before real revenue flows:

```
□ C11 — rotate AUTH_GOOGLE_SECRET, AUTH_SECRET, BETTER_AUTH_SECRET,
     GALLERY_ADMIN_SECRET (per-repo, not shared with other builds)
□ H42 — un-mock src/lib/server/sanity.ts with real Sanity schemas +
     queries. This unblocks C13/C14 idempotency and H29 PII redaction,
     which are no-ops against mock data today.
□ H4 — port convex/stripeFees.ts from angelsrest so Stripe fees are
     captured into Convex orders automatically (requires
     STRIPE_SECRET_KEY on Convex; see step 4).
□ H39 — wire @sentry/sveltekit for error capture; add PUBLIC_SENTRY_DSN
     to Vercel.
```

---

## What the Client Gets

| Component | What It Is | Who Hosts | Monthly Cost |
|---|---|---|---|
| Portfolio site | SvelteKit app | Vercel (free tier) | $0 |
| Convex backend | CRM, quotes, invoices, contracts, messages, gallery-delivery metadata | Convex (free tier) | $0 |
| CMS | Sanity Studio (photos, shop content) | Sanity (free tier) | $0 |
| Auth | Better Auth + Google OAuth | Self (Convex-backed) | $0 |
| Print shop | Stripe checkout + LumaPrints fulfillment | Client's accounts | $0 (fees per transaction) |
| Transactional email | Resend | Resend (free tier) | $0 up to 3,000/mo |
| Gallery delivery | Cloudflare Worker (R2-backed image storage) | Client's Cloudflare | $0 up to 10GB + 10M reads/mo |
| Analytics | Vercel Analytics | Vercel (free tier) | $0 (up to 2,500 events/mo) |
| Error tracking | Sentry (optional) | Sentry (free tier) | $0 up to 5K events/mo |
| Domain | Client's custom domain | Their registrar | ~$12/year |

**Total ongoing cost to client: ~$0-20/month** (vs Squarespace at $16-49/month)

The free tiers cover a photography portfolio easily:
- Vercel free: 100GB bandwidth, unlimited deploys
- Convex free: 1M function calls/month, 1GB storage
- Sanity free: 100K API requests, 1GB assets, 3 users
- Stripe: no monthly fee, 2.9% + $0.30 per transaction
- LumaPrints: no monthly fee, pay per print
- Cloudflare R2: no egress fees; first 10GB storage free
- Resend: 3,000 free emails/month

---

## Pricing & Monetization

### The Squarespace Comparison

Your client currently pays for Squarespace. Here's what they're used to:

| | Squarespace | Your Custom Build |
|---|---|---|
| Monthly cost | $16-49/month ($192-588/year) | ~$0-20/month |
| Design | Template (shared with thousands) | Fully custom, one-of-a-kind |
| Performance | Good | Excellent (static, edge-deployed) |
| Print shop | Squarespace Commerce ($33-65/mo) | Stripe + LumaPrints (pay per sale) |
| CMS | Squarespace editor | Sanity Studio (more powerful) |
| SEO | Basic | Full control |
| Animations/effects | Very limited | Custom floating gallery, parallax, leaves |
| Ongoing vendor lock-in | Yes | No — they own the code |

**Key selling point:** They're currently paying $400-800/year for a template site. You're giving them something no one else has, for less ongoing cost, AND they own it.

### Pricing Models

#### Model 1: One-Time Build + Maintenance Retainer (Recommended)

```
Initial build:                    $2,500 - $4,000
  - Custom portfolio site
  - Print shop with LumaPrints
  - Sanity CMS setup
  - Mobile responsive
  - Handoff + training

Monthly maintenance retainer:     $75 - $150/month
  - Hosting management
  - Bug fixes
  - Minor content updates
  - Software updates (dependencies, security)
  - 1-2 hours of changes per month

Additional features:              $50-100/hour
  - New pages
  - Design changes
  - Integrations
```

**Why this works:**
- Client saves money vs Squarespace long-term ($150/mo vs $33-65/mo for commerce)
- You get recurring revenue
- The retainer covers the "I broke something" calls
- Build cost pays for your initial time (~25-40 hours of work)

#### Model 2: Lower Build Cost + Higher Retainer

```
Initial build:                    $1,500 - $2,000
Monthly retainer:                 $150 - $250/month
```

**Why this works:**
- Lower barrier to entry for the client
- You make it back in 6-12 months via retainer
- Good for clients hesitant about upfront cost
- Still cheaper than Squarespace Commerce

#### Model 3: Revenue Share (Advanced)

```
Initial build:                    $1,000 - $1,500 (reduced)
Monthly retainer:                 $50/month (basic maintenance)
Print sales commission:           10-15% of print revenue
```

**Why this works:**
- Aligns your incentive with theirs (you want them to sell prints)
- Good for photographers who sell a lot
- Requires trust and transparency
- More complex accounting

#### Model 4: Package Deal (Best for Selling)

```
"Reflecting Pool" Photography Package     $3,000 one-time

Includes:
✓ Custom floating gallery portfolio
✓ Integrated print shop (auto-fulfilled)
✓ CMS dashboard (edit everything yourself)
✓ Mobile responsive
✓ SEO optimized
✓ Custom domain setup
✓ 30-min training session
✓ 3 months of support included

After 3 months:
  Support plan: $100/month (optional but recommended)
```

**Why this works:**
- Clean, simple pricing
- Client knows exactly what they're getting
- The 3-month included support builds trust
- After 3 months they're hooked and the retainer feels natural

### Pricing Justification

When the client asks "why not just use Squarespace?":

1. **This is art, not a template.** Their portfolio has floating parallax, underwater caustics, drifting leaves. No template does this. It matches the quality of their photography.

2. **They own it.** Squarespace owns your site. Cancel and it's gone. This is THEIR code, THEIR content, THEIR data.

3. **Print shop saves money.** Squarespace Commerce is $33-65/month. This has $0 monthly cost — just Stripe's per-transaction fee.

4. **It's faster.** Static site on a CDN loads in under 1 second. Squarespace... doesn't.

5. **It grows with them.** Need a booking system? Email automation? Blog? We add it. No platform limitations.

### What NOT to Charge

Don't itemize hours or technologies. Clients don't care that you used SvelteKit vs React. They care about:
- "My photos look amazing"
- "People can buy prints easily"
- "I can update it myself"
- "It works on my phone"
- "It's faster than my old site"

Charge for the outcome, not the hours.

---

## Ongoing Revenue Opportunities

Once you've built this for one photographer, you have a **repeatable product**:

### 1. Sell to Other Photographers
Same codebase, different content. Each new client is:
- ~5 hours of customization (colors, fonts, layout tweaks)
- New Sanity project + content
- Same Stripe/LumaPrints setup
- Charge $2,000-3,000 per build
- $100/month retainer per client

**5 clients = $500/month recurring** for ~2 hours/month of maintenance each.

### 2. White-Label as a Product
"Reflecting Pool — Photography Portfolio Platform"
- Landing page, demo site
- Sell as a SaaS or one-time purchase
- $500-1,000 for the self-serve version
- $2,500+ for the done-for-you version

### 3. Maintenance-as-a-Service
Bundle maintenance for all your clients:
- Monthly dependency updates
- Security patches
- Performance monitoring
- Uptime alerts
- $100-200/client/month

### 4. Add-On Features (per client)
- Blog integration: $500
- Email newsletter (Resend/Mailchimp): $300
- Client proofing gallery: $800
- Instagram feed integration: $200
- Google Analytics dashboard: $150

---

## First Client Conversation Script

> "Right now you're paying Squarespace $[X]/month for a template that looks like every other photographer's site. What if you had something completely custom — floating images, an underwater aesthetic that matches your work — with a built-in print shop that costs nothing monthly? You'd own it completely, and you can update everything yourself through a simple dashboard. I can build this for $[X] and have it ready in [timeframe]."

---

## What's Actually Built (Current State — post-audit 2026-04-23)

### Public pages
- `/` — Floating parallax gallery with 5 photo clusters
- `/about` — Bio, contact form (Resend email), Cal.com booking
- `/shop` — Collections grid + individual prints grid
- `/shop/collection/[slug]` — Collection detail with prints
- `/shop/[slug]` — Individual print purchase (paper + size picker, Stripe checkout)
- `/shop/success` — Order confirmation
- `/shop/cancelled` — Checkout cancelled
- `/delivery/[token]` — **customer gallery delivery** (token-gated, minted from admin).
  Photos, favorites toggle, download all / favorites (zip via Cloudflare Worker)
- `/api/webhooks/stripe` — verified + idempotent (audit C13/C14)
- `/api/webhooks/lumaprints` — HMAC or query-token verified (audit C9)

### Admin (provided by `@jessepomeroy/admin` package)
- `/admin` — Dashboard with revenue cards, sparkline chart
- `/admin/orders` — Full order management (filters, search, CSV export)
- `/admin/inquiries` — Contact form submissions
- `/admin/galleries` — Gallery delivery (create/upload/share with clients)
- `/admin/crm` — Client CRM (photography + web categories)
- `/admin/quotes` / `/admin/invoicing` / `/admin/contracts` — document lifecycle
  with portal-token share links (`portal.acceptQuote`/`declineQuote`/`signContract`)
- `/admin/messages` — Client thread inbox
- `/admin/board` — Kanban by project type
- `/admin/emails` — Email templates

All admin pages are gated by **server-side** Better Auth session check
(`src/lib/server/adminAuth.ts`) in addition to client-side AuthGuard —
audit C12.

### Infrastructure
- Convex backend with `requireSiteAdmin` / `requireWebhookCallerOrAuth`
  helpers (audit C1-C8), all admin queries + mutations gated
- Better Auth via `@mmailaender/convex-better-auth-svelte` (NOT Auth.js —
  `ADMIN-AUTH.md` is stale on this point and needs updating)
- Vitest test suite (run in CI — audit H33)
- GitHub Actions CI: lint → type check → test with concurrency cancel
  (audit H34)
- CI installs `@jessepomeroy/admin` from GitHub Packages via `GH_PACKAGES_TOKEN`
- Pre-commit hooks (Biome + lint-staged; lint-staged now covers `.svelte`)
- Rate limiting on `/api/contact` and `/api/checkout`
- Security headers via `src/hooks.server.ts`
- `.env.example` at repo root documents all env vars
- robots.txt + sitemap.xml
- JSON-LD Product schema for SEO
- prefers-reduced-motion accessibility
- Vercel Analytics
- Error boundaries on all route groups

### What still needs human work (before first real customer)
- **Un-mock Sanity** (`src/lib/server/sanity.ts`) — blocks idempotency +
  PII redaction from taking effect (audit H42 / C13 / C14 / H29)
- **Rotate secrets** (audit C11) — `AUTH_GOOGLE_SECRET`, `AUTH_SECRET`,
  `BETTER_AUTH_SECRET`, `GALLERY_ADMIN_SECRET`. The old
  `GALLERY_ADMIN_SECRET` was shared with angelsrest — new per-repo value
  required.
- **Port `convex/stripeFees.ts`** (audit H4) for automatic fee capture
  on orders
- **Wire Sentry** (audit H39) — `@sentry/sveltekit`, source-map upload
- **Pin Vercel runtime** (audit H38) — swap `adapter-auto` for
  `@sveltejs/adapter-vercel` with `runtime: "nodejs22.x"`
- **Re-enable Biome Svelte linting** (audit H37)
- **Update `ADMIN-AUTH.md`** — currently describes Auth.js; reality is
  Better Auth
- **Replace Cal.com placeholder** in `src/routes/about/+page.svelte` with
  Margaret's real booking link
- **Upload content** — photos into Sanity, About copy, SEO defaults,
  caustics video, favicon, social links
- **Client training session** (30 min)

See `TESTING-PIPELINE.md` for step-by-step testing and `AUDIT.md` for
the full item list with status.

---

## For Maggie (First Client)

**Recommended deal:**
> "You don't owe me anything upfront. If you sell a print through the site, kick me 15%. If you refer me to another photographer, that pays for everything. No pressure."

**Template rights:**
Ask if she's OK with you selling the site design as a template to other photographers. Her content/photos stay unique — just the code structure gets reused.

**Ongoing costs for her:**
- Hosting: $0 (Vercel free)
- Convex: $0 (free tier)
- CMS: $0 (Sanity free)
- Cloudflare (gallery storage): $0 up to 10GB
- Resend (email): $0 up to 3K/mo
- Domain: ~$12/year
- Print sales: Stripe 2.9% + $0.30 per transaction + LumaPrints print cost
- Total: ~$1/month basically

---

*Last updated: 2026-04-23*

# Client Handoff Guide — Reflecting Pool

*For the developer (Jesse) — how to hand off and price the project.*

---

## What the Client Gets

| Component | What It Is | Who Hosts | Monthly Cost |
|---|---|---|---|
| Portfolio site | SvelteKit app | Vercel (free tier) | $0 |
| CMS | Sanity Studio | Sanity (free tier) | $0 |
| Print shop | Stripe checkout + LumaPrints fulfillment | Client's accounts | $0 (fees per transaction) |
| Domain | Client's custom domain | Their registrar | ~$12/year |

**Total ongoing cost to client: ~$0-20/month** (vs Squarespace at $16-49/month)

The free tiers cover a photography portfolio easily:
- Vercel free: 100GB bandwidth, unlimited deploys
- Sanity free: 100K API requests, 1GB assets, 3 users
- Stripe: no monthly fee, 2.9% + $0.30 per transaction
- LumaPrints: no monthly fee, pay per print

---

## Handoff Checklist

### Accounts to Create (Client's Name/Email)

```
□ 1. Sanity account → sanity.io/manage (free plan)
     - Create project "Reflecting Pool"
     - Note the Project ID
     - Create API token (Editor role) for the website
     - Create API token (Write role) for webhooks
     - Add client as admin

□ 2. Stripe account → dashboard.stripe.com (client's business)
     - Complete identity verification
     - Note: Publishable key, Secret key
     - Set up webhook endpoint → https://[domain]/api/webhooks/stripe
     - Webhook events: checkout.session.completed
     - Note: Webhook signing secret

□ 3. LumaPrints account → dashboard.lumaprints.com (client's name)
     - Register, verify store
     - Note: Store ID, API Key, API Secret
     - Set up webhook → https://[domain]/api/webhooks/lumaprints
     - Events: shipment.created

□ 4. Vercel account → vercel.com (client's email, or your team)
     - Import GitHub repo
     - Set all environment variables (see below)
     - Connect custom domain

□ 5. Domain DNS
     - Point domain to Vercel (CNAME or A record)
     - Enable HTTPS (Vercel auto-provisions SSL)
```

### Environment Variables (set in Vercel Dashboard)

```
LUMAPRINTS_API_KEY=...
LUMAPRINTS_API_SECRET=...
LUMAPRINTS_STORE_ID=...

STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

SANITY_PROJECT_ID=...
SANITY_DATASET=production
SANITY_API_TOKEN=...

PUBLIC_SITE_URL=https://clientdomain.com
```

### Content Setup

```
□ Upload galleries in Sanity Studio
□ Set which images are available as prints
□ Configure print prices
□ Write About page content
□ Set up booking session types
□ Upload caustics background video
□ Add social media links
□ Set SEO defaults (description, OG image)
```

### Testing Before Going Live

```
□ Test Stripe checkout (use test mode first)
□ Test LumaPrints order submission (use sandbox)
□ Verify webhook flow: purchase → order created → LumaPrints submitted
□ Test on mobile (iPhone + Android)
□ Test lightbox, navigation, all pages
□ Check print image quality (LumaPrints image check API)
□ Switch Stripe to live mode
□ Switch LumaPrints to production API
□ Place one real test order
```

---

## Client Training (30-min session)

Show them:
1. **Sanity Studio** — how to add/edit galleries, upload photos, mark prints for sale
2. **Orders** — where to see incoming orders, track status
3. **Inquiries** — how booking form submissions appear
4. **Print pricing** — how to adjust prices
5. **About/Contact** — how to edit text content

Record a Loom video for reference. Most clients never need to touch code.

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

*Last updated: 2026-04-03*

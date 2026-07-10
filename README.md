# Reflecting Pool

Reflecting Pool is Maggie Pomeroy's photography portfolio and the first client
spoke in the Angels Rest photographer platform.

## System overview

- **SvelteKit 5** owns the public site, client admin host, and HTTP routes.
- **Sanity** owns portfolio, shop, about, modeling, and site-settings content.
  The schema lives in the sibling `reflecting-pool-studio` repository.
- **Convex** owns orders, CRM, invoices, quotes, contracts, messages, private
  delivery galleries, and platform tenancy. This repository consumes the
  shared `@jessepomeroy/crm-api`; it does not own a `convex/` tree.
- **@jessepomeroy/admin** supplies the shared admin pages and server handlers.
- **@jessepomeroy/print-catalog** supplies shared print metadata and pricing
  helpers.
- **Stripe Connect**, **LumaPrints**, **Resend**, and the shared gallery Worker
  are external service boundaries.

See [ARCHITECTURE.md](ARCHITECTURE.md) for current request flows and ownership.

## Local development

Requirements are Node 22+ and the pnpm version declared in `package.json`.

```bash
pnpm config set --location user //npm.pkg.github.com/:_authToken "$GITHUB_TOKEN"
pnpm install
cp .env.example .env.local
pnpm dev
```

Use test-mode payment credentials and LumaPrints sandbox locally. Never put
production credentials in the repository-root `.env` file.

## Checks

```bash
pnpm lint
pnpm check
pnpm test
pnpm build
```

Browser smoke tests are available through `pnpm test:browser`. The gallery
bulk-delete smoke command touches a configured Worker/R2 environment and should
only be run deliberately.

## Documentation

- [AGENTS.md](AGENTS.md) — canonical repository rules
- [ARCHITECTURE.md](ARCHITECTURE.md) — current system and dependency boundaries
- [LUMAPRINTS.md](LUMAPRINTS.md) — current print and shipment integration
- [docs/archive/README.md](docs/archive/README.md) — historical audits and specs

## Related repositories

| Repository | Responsibility |
|---|---|
| `angelsrest` | Platform hub and owner of the shared Convex backend/package |
| `reflecting-pool-studio` | Maggie's Sanity Studio instance |
| `sanity-studio-template` | Upstream for shared Studio schemas/components |
| `admin-dashboard` | Source for `@jessepomeroy/admin` |
| `gallery-worker` | Shared Cloudflare Worker and R2 delivery boundary |

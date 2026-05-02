# reflecting-pool

Maggie's photography portfolio site — first paying-client deployment of the photographer CRM platform.

## What this is

A SvelteKit spoke site that consumes shared platform packages from `angelsrest`:

- `@jessepomeroy/admin` — full CRM admin dashboard (orders, inquiries, galleries, invoicing, quotes, contracts) gated by tier
- `@jessepomeroy/crm-api` — Convex schema + generated types

Plus:

- Sanity-driven content (photos, products, site settings) — schema lives in [`reflecting-pool-studio`](https://github.com/JessePomeroy/reflecting-pool-studio)
- Stripe Connect Express for print sales
- LumaPrints fulfillment pipeline
- Sentry for error capture (per-spoke project)

## Tech stack

- SvelteKit + Svelte 5 (runes)
- TypeScript strict
- Vite + `@sveltejs/adapter-vercel`
- Convex backend (shared schema with angelsrest)
- Sanity CMS (per-client studio)
- pnpm 10

See `AGENTS.md` for architecture rules (CSS-for-ambient, JS-for-interactive) and runtime constraints.

## Local dev

```sh
pnpm install
pnpm dev          # localhost:5173
pnpm check        # svelte-check
pnpm lint         # biome
pnpm test         # vitest
pnpm build        # production build
```

Required env vars in `.env.local` — copy from `.env.example` and ask Jesse for current dev credentials.

## Deploy

Production: Vercel (project link pending; set during launch).

`adapter-vercel` is pinned with `runtime: "nodejs22.x"` and `maxDuration: 30` to guard against shifting Vercel defaults — see the comment in `svelte.config.js`.

## Observability

Sentry wired via `src/instrumentation.server.ts` + `src/hooks.client.ts` + Sentry-wrapped `src/hooks.server.ts`, with `experimental.instrumentation.server: true` in `svelte.config.js`. Set `PUBLIC_SENTRY_DSN` in env to activate; missing DSN no-ops cleanly.

Per-spoke project pattern: each spoke has its own Sentry project, so events filter by site automatically.

## Related repos

| Repo | Role |
|---|---|
| [`angelsrest`](https://github.com/JessePomeroy/angelsrest) | Hub monorepo — owns shared `@jessepomeroy/admin` + `@jessepomeroy/crm-api` packages |
| [`reflecting-pool-studio`](https://github.com/JessePomeroy/reflecting-pool-studio) | Sanity studio for this site (live at https://reflecting-pool.sanity.studio/) |
| [`sanity-studio-template`](https://github.com/JessePomeroy/sanity-studio-template) | Template that reflecting-pool-studio was forked from |

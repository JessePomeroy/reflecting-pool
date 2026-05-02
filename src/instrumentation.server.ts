/**
 * Sentry server-side init.
 *
 * Loaded by SvelteKit at server startup when
 * `kit.experimental.instrumentation.server: true` is set in svelte.config.js
 * — that flag is required, otherwise this file is silently ignored.
 *
 * Safe no-op when PUBLIC_SENTRY_DSN is empty: the SDK silently disables
 * capture if `dsn` is falsy, so unconfigured environments (local dev
 * without a Sentry project, CI, fresh forks) keep working without errors.
 *
 * The DSN is read from PUBLIC_SENTRY_DSN so the same env var works on the
 * client side too. It's not actually a secret — DSNs are designed to ship
 * to browsers — and using PUBLIC_ keeps both runtimes in sync.
 *
 * Per-deployment DSNs are the multi-tenant pattern: each spoke (this site,
 * future per-client deploys) sets its own PUBLIC_SENTRY_DSN, so issues
 * route to the right Sentry project without code changes between clones.
 */

import * as Sentry from "@sentry/sveltekit";
import { env } from "$env/dynamic/public";

Sentry.init({
	dsn: env.PUBLIC_SENTRY_DSN,
	// Tag every event with which site it came from. Lets a single Sentry
	// org filter issues by spoke if multiple deployments ever route to
	// the same project.
	initialScope: {
		tags: { site: "reflecting-pool" },
	},
	// Error capture only for now. Performance, replays, profiling all off
	// to keep us comfortably under the 5K events/month free-tier ceiling.
	tracesSampleRate: 0,
	// Don't capture PII by default — order webhooks contain customer
	// emails and addresses. We'll attach scrubbed context manually via
	// the structured logger when needed.
	sendDefaultPii: false,
});

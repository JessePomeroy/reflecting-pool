// Mock for $env/dynamic/private in tests.
// Mirrors env-private.ts (the static-private mock) but exposes the values
// through the `env` object that `$env/dynamic/private` provides at runtime.
// Keep these in sync if either file is edited.
export const env = {
	LUMAPRINTS_API_KEY: "test-api-key",
	LUMAPRINTS_API_SECRET: "test-api-secret",
	LUMAPRINTS_STORE_ID: "42",
	// Explicitly "false" so tests exercise the same production URL path
	// that runtime hits. Flip to "true" if a test specifically needs to
	// verify sandbox routing.
	LUMAPRINTS_USE_SANDBOX: "false",
	STRIPE_SECRET_KEY: "sk_test_mock",
	STRIPE_WEBHOOK_SECRET: "whsec_mock",
	SANITY_PROJECT_ID: "test-project",
	SANITY_DATASET: "test",
	SANITY_API_TOKEN: "test-token",
	RESEND_API_KEY: "test-resend",
	ADMIN_EMAIL: "admin@test.com",
	GALLERY_ADMIN_SECRET: "test-gallery-admin",
	GALLERY_WORKER_URL: "https://gallery-worker.test",
};

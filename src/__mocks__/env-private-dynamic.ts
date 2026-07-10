// Mock for $env/dynamic/private in tests.
// Mirrors env-private.ts (the static-private mock) but exposes the values
// through the `env` object that `$env/dynamic/private` provides at runtime.
// Keep these in sync if either file is edited.
export const env = {
	CHECKOUT_BRIDGE_SECRET: "test-checkout-bridge-secret",
	CHECKOUT_BRIDGE_URL: "https://angelsrest.test/api/tenant-checkout/print",
	SANITY_PROJECT_ID: "test-project",
	SANITY_DATASET: "test",
	SANITY_API_READ_TOKEN: "test-read-token",
	SANITY_API_PREVIEW_TOKEN: "test-preview-token",
	RESEND_API_KEY: "test-resend",
	GALLERY_ADMIN_SECRET: "test-gallery-admin",
	GALLERY_WORKER_URL: "https://gallery-worker.test",
};

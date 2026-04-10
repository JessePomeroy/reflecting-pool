// Mock for $env/static/private in tests
export const LUMAPRINTS_API_KEY = "test-api-key";
export const LUMAPRINTS_API_SECRET = "test-api-secret";
export const LUMAPRINTS_STORE_ID = "42";
// Explicitly "false" so tests exercise the same production URL path
// that runtime hits. Flip to "true" if a test specifically needs to
// verify sandbox routing.
export const LUMAPRINTS_USE_SANDBOX = "false";
export const STRIPE_SECRET_KEY = "sk_test_mock";
export const STRIPE_WEBHOOK_SECRET = "whsec_mock";
export const SANITY_PROJECT_ID = "test-project";
export const SANITY_DATASET = "test";
export const SANITY_API_TOKEN = "test-token";
export const RESEND_API_KEY = "test-resend";
export const ADMIN_EMAIL = "admin@test.com";

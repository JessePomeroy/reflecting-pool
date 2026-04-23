// Forward Better Auth requests (sign-in, sign-out, get-session, callback,
// etc.) to the Convex HTTP actions at PUBLIC_CONVEX_SITE_URL. We previously
// had a hand-rolled fetch() proxy here that mis-handled multiple Set-Cookie
// headers — `new Headers(response.headers)` collapses repeated Set-Cookie
// lines into a single comma-joined value, which browsers silently mis-parse
// (only the first cookie survives). Symptom: session cookie gets set, but
// the JWT cookie (`better-auth.convex_jwt`) is lost, so `getToken(cookies)`
// returns null on the server and `requireAuthWithIdentity` 401s.
//
// `createSvelteKitHandler` from @mmailaender/convex-better-auth-svelte uses
// `getSetCookie()` (or equivalent) to preserve every Set-Cookie
// individually, and forwards proto/host headers so Better Auth's
// trusted-origin check passes in proxied-request mode. Same pattern as
// angelsrest's equivalent endpoint.
import { createSvelteKitHandler } from "@mmailaender/convex-better-auth-svelte/sveltekit";

export const { GET, POST } = createSvelteKitHandler();

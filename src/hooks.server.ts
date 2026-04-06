import type { Handle, HandleServerError } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";
import { dev } from "$app/environment";
import { handle as authHandle } from "./auth";

/**
 * Populate locals.user from the Auth.js session. Auth.js runs first (via
 * `sequence`), so `event.locals.auth()` is available here.
 */
const localsHandle: Handle = async ({ event, resolve }) => {
	const session = await event.locals.auth();
	const isAdmin = (session as (typeof session & { isAdmin?: boolean }) | null)?.isAdmin ?? false;
	event.locals.user = { isAdmin };
	return resolve(event);
};

export const handle = sequence(authHandle, localsHandle);

/**
 * Global server-side error handler.
 * Logs unhandled errors and returns a structured, safe response to the client.
 * In dev, includes the raw message and stack for debugging. In prod, returns
 * only a generic message so we never leak internals.
 */
export const handleError: HandleServerError = ({ error, event, status, message }) => {
	// 4xx errors are user-facing and already have a useful message — pass them through
	if (status >= 400 && status < 500) {
		return { message };
	}

	// Log 5xx and uncaught errors with request context
	const errorId = crypto.randomUUID();
	console.error(`[${errorId}] ${event.request.method} ${event.url.pathname} — ${status}`, error);

	return {
		message: dev
			? error instanceof Error
				? error.message
				: String(error)
			: "An unexpected error occurred.",
		errorId,
	};
};

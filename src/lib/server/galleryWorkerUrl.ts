import { dev } from "$app/environment";
import { env } from "$env/dynamic/private";

/**
 * Resolve the gallery worker base URL. Previously `src/lib/config/admin.ts`
 * hardcoded `https://gallery-worker.thinkingofview.workers.dev` as a
 * fallback — a foot-gun when the repo is forked by another photographer
 * since their gallery delivery would silently route to the wrong Worker.
 * Audit M18 addresses the admin config side; this helper backs server-side
 * reads. Dev keeps the fallback for local convenience; prod throws.
 */
export function getGalleryWorkerUrl(): string {
	const url = env.GALLERY_WORKER_URL;
	if (url) return url;
	if (dev) return "https://gallery-worker.thinkingofview.workers.dev";
	throw new Error("GALLERY_WORKER_URL is not set. Configure it in Vercel environment variables.");
}

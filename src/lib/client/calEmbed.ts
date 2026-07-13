export const CAL_EMBED_ORIGIN = "https://cal.com";
export const CAL_EMBED_SCRIPT_SRC = "https://app.cal.com/embed/embed.js";

type CalQueueEntry = unknown[];

export interface CalEmbedApi {
	(...args: unknown[]): void;
	loaded?: boolean;
	ns?: Record<string, CalEmbedApi>;
	q: CalQueueEntry[];
}

export type CalEmbedWindow = Window & {
	Cal?: CalEmbedApi;
};

function enqueue(api: CalEmbedApi, entry: CalQueueEntry) {
	api.q.push(entry);
}

function appendLoaderOnce(target: CalEmbedWindow) {
	if (target.document.querySelector(`script[src="${CAL_EMBED_SCRIPT_SRC}"]`)) return;

	const script = target.document.createElement("script");
	script.src = CAL_EMBED_SCRIPT_SRC;
	target.document.head.appendChild(script);
}

function createCalStub(target: CalEmbedWindow): CalEmbedApi {
	const stub = ((...args: unknown[]) => {
		const cal = target.Cal ?? stub;

		if (!cal.loaded) {
			cal.ns = {};
			cal.q = cal.q || [];
			appendLoaderOnce(target);
			cal.loaded = true;
		}

		if (args[0] === "init") {
			const namespaceApi = ((...namespaceArgs: unknown[]) => {
				enqueue(namespaceApi, namespaceArgs);
			}) as CalEmbedApi;
			const namespace = args[1];

			namespaceApi.q = namespaceApi.q || [];
			if (typeof namespace === "string") {
				cal.ns = cal.ns || {};
				cal.ns[namespace] = cal.ns[namespace] || namespaceApi;
				enqueue(cal.ns[namespace], args);
				enqueue(cal, ["-ready", namespace]);
			} else {
				enqueue(cal, args);
				enqueue(cal, ["-ready"]);
			}
			return;
		}

		enqueue(cal, args);
	}) as CalEmbedApi;

	stub.q = [];
	return stub;
}

export function initializeCalEmbed(target: CalEmbedWindow = window as CalEmbedWindow): CalEmbedApi {
	target.Cal = target.Cal || createCalStub(target);
	target.Cal("init", { origin: CAL_EMBED_ORIGIN });
	return target.Cal;
}

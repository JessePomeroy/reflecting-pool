import type { ModelingPageReadTelemetry } from "$lib/server/content/modelingPageProvider";
import { fetchModelingPageContent } from "$lib/server/content/modelingPageProvider";

export async function load() {
	const entries: ModelingPageReadTelemetry[] = [];
	try {
		return {
			modeling: await fetchModelingPageContent({ log: (entry) => entries.push(entry) }),
		};
	} finally {
		console.info("[cms]", entries);
	}
}

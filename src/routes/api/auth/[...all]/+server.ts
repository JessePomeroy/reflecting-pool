import { env } from "$env/dynamic/public";

async function handler({ request }: { request: Request }) {
	const url = new URL(request.url);
	const siteUrl =
		env.PUBLIC_CONVEX_SITE_URL || env.PUBLIC_CONVEX_URL?.replace(".cloud", ".site") || "";
	const targetUrl = `${siteUrl}${url.pathname}${url.search}`;

	const headers = new Headers(request.headers);
	headers.set("host", new URL(targetUrl).host);
	headers.delete("accept-encoding");

	const proxyRequest = new Request(targetUrl, {
		method: request.method,
		headers,
		body: request.body,
		duplex: "half",
	} as RequestInit);

	const response = await fetch(proxyRequest, { redirect: "manual" });

	// Strip content-encoding to avoid decoding mismatch
	const responseHeaders = new Headers(response.headers);
	responseHeaders.delete("content-encoding");
	responseHeaders.delete("content-length");

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: responseHeaders,
	});
}

export const GET = handler;
export const POST = handler;

export const PORTFOLIO_PREVIEW_COOKIE = "cms_portfolio_preview";
export const PORTFOLIO_PREVIEW_PATH = "/gallery/preview";
export const PORTFOLIO_PREVIEW_SCOPE = "portfolio-draft-preview";
export const PORTFOLIO_PREVIEW_TTL_SECONDS = 10 * 60;

export interface PortfolioPreviewGrant {
	scope: typeof PORTFOLIO_PREVIEW_SCOPE;
	siteUrl: string;
	galleryId: string;
	draftRevisionId: string;
	iat: number;
	exp: number;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function encodeBase64Url(bytes: Uint8Array) {
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string) {
	if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
	const base64 = value
		.replace(/-/g, "+")
		.replace(/_/g, "/")
		.padEnd(Math.ceil(value.length / 4) * 4, "=");
	try {
		const decoded = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
		return encodeBase64Url(decoded) === value ? decoded : null;
	} catch {
		return null;
	}
}

async function hmacKey(secret: string, usage: KeyUsage[]) {
	if (secret.length < 32 || secret.length > 512 || secret !== secret.trim()) {
		throw new Error("CMS preview secret is not configured safely");
	}
	return await crypto.subtle.importKey(
		"raw",
		encoder.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		usage,
	);
}

export async function createPortfolioPreviewGrant(
	secret: string,
	input: Pick<PortfolioPreviewGrant, "siteUrl" | "galleryId" | "draftRevisionId">,
	now = Date.now(),
) {
	const payload: PortfolioPreviewGrant = {
		scope: PORTFOLIO_PREVIEW_SCOPE,
		...input,
		iat: now,
		exp: now + PORTFOLIO_PREVIEW_TTL_SECONDS * 1000,
	};
	const encodedPayload = encodeBase64Url(encoder.encode(JSON.stringify(payload)));
	const signature = await crypto.subtle.sign(
		"HMAC",
		await hmacKey(secret, ["sign"]),
		encoder.encode(encodedPayload),
	);
	return `${encodedPayload}.${encodeBase64Url(new Uint8Array(signature))}`;
}

export async function verifyPortfolioPreviewGrant(
	secret: string,
	token: string | undefined,
	expectedSiteUrl: string,
	now = Date.now(),
): Promise<PortfolioPreviewGrant | null> {
	if (!token) return null;
	const [encodedPayload, encodedSignature, ...extra] = token.split(".");
	if (!encodedPayload || !encodedSignature || extra.length > 0) return null;
	const signature = decodeBase64Url(encodedSignature);
	const payloadBytes = decodeBase64Url(encodedPayload);
	if (!signature || !payloadBytes) return null;
	const valid = await crypto.subtle.verify(
		"HMAC",
		await hmacKey(secret, ["verify"]),
		signature,
		encoder.encode(encodedPayload),
	);
	if (!valid) return null;

	let payload: PortfolioPreviewGrant;
	try {
		payload = JSON.parse(decoder.decode(payloadBytes)) as PortfolioPreviewGrant;
	} catch {
		return null;
	}
	if (
		payload.scope !== PORTFOLIO_PREVIEW_SCOPE ||
		payload.siteUrl !== expectedSiteUrl ||
		typeof payload.galleryId !== "string" ||
		!payload.galleryId ||
		typeof payload.draftRevisionId !== "string" ||
		!payload.draftRevisionId ||
		!Number.isSafeInteger(payload.iat) ||
		!Number.isSafeInteger(payload.exp) ||
		payload.iat > now + 30_000 ||
		payload.exp <= now ||
		payload.exp - payload.iat !== PORTFOLIO_PREVIEW_TTL_SECONDS * 1000
	)
		return null;
	return payload;
}

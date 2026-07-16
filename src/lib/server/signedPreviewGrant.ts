export interface SignedPreviewGrantClaims {
	scope: string;
	siteUrl: string;
	iat: number;
	exp: number;
	[key: string]: unknown;
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

export async function createSignedPreviewGrant(
	secret: string,
	input: { scope: string; siteUrl: string; [key: string]: unknown },
	ttlSeconds: number,
	now = Date.now(),
) {
	const payload: SignedPreviewGrantClaims = {
		...input,
		iat: now,
		exp: now + ttlSeconds * 1000,
	};
	const encodedPayload = encodeBase64Url(encoder.encode(JSON.stringify(payload)));
	const signature = await crypto.subtle.sign(
		"HMAC",
		await hmacKey(secret, ["sign"]),
		encoder.encode(encodedPayload),
	);
	return `${encodedPayload}.${encodeBase64Url(new Uint8Array(signature))}`;
}

export async function verifySignedPreviewGrant(
	secret: string,
	token: string | undefined,
	expected: { scope: string; siteUrl: string; ttlSeconds: number },
	now = Date.now(),
): Promise<SignedPreviewGrantClaims | null> {
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

	let payload: unknown;
	try {
		payload = JSON.parse(decoder.decode(payloadBytes));
	} catch {
		return null;
	}
	if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
	const claims = payload as SignedPreviewGrantClaims;
	if (
		claims.scope !== expected.scope ||
		claims.siteUrl !== expected.siteUrl ||
		!Number.isSafeInteger(claims.iat) ||
		!Number.isSafeInteger(claims.exp) ||
		claims.iat > now + 30_000 ||
		claims.exp <= now ||
		claims.exp - claims.iat !== expected.ttlSeconds * 1000
	)
		return null;
	return claims;
}

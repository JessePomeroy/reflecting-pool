// Simple in-memory rate limiter for API endpoints
// Resets on server restart — fine for low-traffic sites

const requests = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
	ip: string,
	maxRequests: number = 10,
	windowMs: number = 60_000,
): { allowed: boolean; remaining: number } {
	const now = Date.now();
	const key = ip;

	const record = requests.get(key);

	if (!record || now > record.resetAt) {
		requests.set(key, { count: 1, resetAt: now + windowMs });
		return { allowed: true, remaining: maxRequests - 1 };
	}

	if (record.count >= maxRequests) {
		return { allowed: false, remaining: 0 };
	}

	record.count++;
	return { allowed: true, remaining: maxRequests - record.count };
}

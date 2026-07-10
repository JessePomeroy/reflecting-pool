import { describe, expect, it } from "vitest";
import { resolveCommerceWebhookOwner } from "$lib/server/commerceWebhookOwnership";

describe("commerce webhook ownership", () => {
	it("defaults existing deployments to the spoke during migration", () => {
		expect(resolveCommerceWebhookOwner(undefined)).toBe("spoke");
	});

	it("accepts the explicit hub migration target", () => {
		expect(resolveCommerceWebhookOwner("hub")).toBe("hub");
	});

	it("rejects ambiguous configuration", () => {
		expect(() => resolveCommerceWebhookOwner("both")).toThrow(
			'STRIPE_COMMERCE_WEBHOOK_OWNER must be "hub" or "spoke"',
		);
	});
});

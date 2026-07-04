import { describe, expect, it } from "vitest";
import { encodeShopSlug, shopCollectionPath, shopProductPath } from "./urls";

describe("shop URL helpers", () => {
	it("encodes shop slugs for path segments", () => {
		expect(encodeShopSlug("wildflowers&roses")).toBe("wildflowers%26roses");
		expect(encodeShopSlug("nested/print study")).toBe("nested%2Fprint%20study");
		expect(encodeShopSlug("photo%2Fstudy")).toBe("photo%252Fstudy");
	});

	it("builds encoded collection and product paths", () => {
		expect(shopCollectionPath("wildflowers&roses")).toBe("/shop/collection/wildflowers%26roses");
		expect(shopProductPath('print"study')).toBe("/shop/print%22study");
	});
});

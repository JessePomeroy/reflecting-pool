import { expect, test } from "@playwright/test";

test.describe("interactive surface", () => {
	test("desktop pointer enables the liquid cursor", async ({ page }) => {
		await page.goto("/");

		await expect(page.locator("canvas.liquid-cursor")).toBeAttached();
		await expect(page.locator("body")).toHaveClass(/liquid-cursor-enabled/);
	});

	test("reduced motion keeps the liquid cursor disabled", async ({ page }) => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		await page.goto("/");

		await expect(page.locator("canvas.liquid-cursor")).toBeAttached();
		await expect(page.locator("body")).not.toHaveClass(/liquid-cursor-enabled/);
	});

	test("mobile touch viewport renders without enabling the liquid cursor", async ({ browser }) => {
		const context = await browser.newContext({
			viewport: { width: 390, height: 844 },
			isMobile: true,
			hasTouch: true,
		});
		const page = await context.newPage();

		await page.goto("/");

		await expect(page.locator("main.splash")).toBeVisible();
		await expect(page.locator("body")).not.toHaveClass(/liquid-cursor-enabled/);

		await context.close();
	});

	test("water clicks render one shared pair of ripple rings", async ({ page }) => {
		await page.goto("/");
		await page.locator(".water-surface").click({ position: { x: 1000, y: 700 } });

		await expect(page.locator(".ripple-ring")).toHaveCount(2);
	});
});

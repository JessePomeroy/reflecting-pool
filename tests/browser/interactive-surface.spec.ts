import { expect, test } from "@playwright/test";

const LIQUID_CURSOR_TIMEOUT_MS = 15_000;
const interactiveSurfaceReady = (page: import("@playwright/test").Page) =>
	page.locator("body[data-interactive-surface-ready='true']");

async function emulateFinePointer(page: import("@playwright/test").Page) {
	await page.addInitScript(() => {
		const originalMatchMedia = window.matchMedia.bind(window);
		window.matchMedia = (query: string) => {
			if (query === "(any-pointer: fine)") {
				return {
					matches: true,
					media: query,
					onchange: null,
					addListener: () => {},
					removeListener: () => {},
					addEventListener: () => {},
					removeEventListener: () => {},
					dispatchEvent: () => false,
				};
			}

			return originalMatchMedia(query);
		};
	});
}

async function hasWebGL(page: import("@playwright/test").Page) {
	return page.evaluate(() => {
		const canvas = document.createElement("canvas");
		return Boolean(canvas.getContext("webgl") || canvas.getContext("webgl2"));
	});
}

test.describe("interactive surface", () => {
	test("desktop pointer enables the liquid cursor", async ({ page }) => {
		await emulateFinePointer(page);
		test.skip(
			Boolean(process.env.CI) || !(await hasWebGL(page)),
			"liquid cursor WebGL initialization is not reliable in headless CI",
		);
		await page.goto("/");

		await expect(page.locator("canvas.liquid-cursor")).toBeAttached();
		await expect(page.locator("body")).toHaveClass(/liquid-cursor-enabled/, {
			timeout: LIQUID_CURSOR_TIMEOUT_MS,
		});
	});

	test("reduced motion keeps the liquid cursor disabled", async ({ page }) => {
		await emulateFinePointer(page);
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
		await expect(interactiveSurfaceReady(page)).toBeAttached();

		const waterSurface = page.locator(".water-surface");
		await expect(waterSurface).toBeVisible();

		await waterSurface.evaluate((element) => {
			element.dispatchEvent(
				new MouseEvent("click", {
					bubbles: true,
					cancelable: true,
					clientX: 640,
					clientY: 360,
					view: window,
				}),
			);
		});

		await expect(page.locator(".ripple-ring")).toHaveCount(2);
	});
});

<script lang="ts">
import LeafLayer from "$lib/components/LeafLayer.svelte";
import Navigation from "$lib/components/Navigation.svelte";
import StrokeTitle from "$lib/components/StrokeTitle.svelte";
import WaterSurface from "$lib/components/WaterSurface.svelte";
import type { HomepageContent } from "$lib/server/content/homepage";

let { homepage }: { homepage: HomepageContent } = $props();
</script>

<WaterSurface />
<LeafLayer />

<header class="splash-header" id="site-title">
	<StrokeTitle />
</header>

<div class="splash-mobile-nav">
	<Navigation />
</div>

<main class="splash" aria-labelledby="site-title">
	<section class="splash-content">
		<nav class="splash-nav" aria-label="Primary">
			{#each homepage.navLinks as cta}
				<a href={cta.href}>{cta.label}</a>
			{/each}
		</nav>

		<div class="splash-copy">
			<p class="practice-line">{homepage.practiceLine}</p>

			<figure class="quote-block">
				<blockquote>{homepage.quote.text}</blockquote>
				<figcaption>{homepage.quote.attribution}</figcaption>
			</figure>
		</div>
	</section>
</main>

<style>
	.splash {
		position: relative;
		z-index: 10;
		min-height: 100svh;
		pointer-events: none;
	}

	.splash-header {
		position: fixed;
		top: 0;
		left: 0;
		z-index: 15;
		padding: 1.5rem 2.5rem;
		pointer-events: auto;
	}

	.splash-mobile-nav {
		display: none;
		position: fixed;
		top: 0;
		right: 0;
		z-index: 200;
		pointer-events: auto;
	}

	.splash-content {
		--content-top: clamp(21rem, 52vh, 34rem);
		position: fixed;
		left: 2.65rem;
		top: var(--content-top);
		z-index: 16;
		width: min(860px, calc(100vw - 5.3rem));
		max-height: calc(100svh - var(--content-top) - 2rem);
		overflow-y: auto;
		pointer-events: none;
	}

	.splash-nav {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: flex-start;
		gap: clamp(0.85rem, 2.2vw, 1.8rem);
		max-width: 860px;
		padding-left: 0.15rem;
		pointer-events: auto;
	}

	.splash-nav a {
		min-height: 44px;
		display: inline-flex;
		align-items: center;
		font-family: var(--font-serif);
		font-size: clamp(1rem, 1.55vw, 1.35rem);
		font-weight: 300;
		color: rgba(var(--paper-rgb), 0.58);
		text-decoration: none;
		letter-spacing: 0.08em;
		text-transform: lowercase;
		transition:
			color 300ms ease,
			transform 300ms ease;
	}

	.splash-nav a:hover {
		color: rgba(var(--paper-rgb), 0.92);
		transform: translateY(-2px);
	}

	.splash-copy {
		display: flex;
		flex-direction: column;
		gap: 1.45rem;
		max-width: 690px;
		margin-top: clamp(1.1rem, 2.8vh, 2rem);
		padding-left: 0.15rem;
		pointer-events: auto;
	}

	.practice-line {
		max-width: 600px;
		font-family: var(--font-serif);
		font-size: clamp(1.25rem, 2.4vw, 2.1rem);
		font-weight: 300;
		line-height: 1.22;
		color: rgba(var(--paper-rgb), 0.84);
		text-shadow: 0 1px 18px rgba(var(--ink-rgb), 0.32);
	}

	.quote-block {
		max-width: 690px;
		margin: 0;
		color: rgba(var(--paper-rgb), 0.68);
		text-shadow: 0 1px 16px rgba(var(--ink-rgb), 0.34);
	}

	.quote-block blockquote {
		margin: 0;
		font-family: var(--font-serif);
		font-size: clamp(0.95rem, 1.3vw, 1.12rem);
		font-style: italic;
		line-height: 1.6;
	}

	.quote-block figcaption {
		margin-top: 0.65rem;
		font-family: var(--font-serif);
		font-size: clamp(0.9rem, 1.2vw, 1rem);
		letter-spacing: 0.08em;
		color: rgba(var(--paper-rgb), 0.58);
	}

	.quote-block figcaption::before {
		content: "- ";
	}

	:global(.splash-header .title) {
		max-width: none;
		white-space: nowrap;
	}

	@media (max-width: 767px) {
		.splash-header {
			padding: 1rem 1.2rem;
		}

		.splash-mobile-nav {
			display: block;
		}

		.splash-content {
			--content-top: min(32vh, 13rem);
			left: 1.35rem;
			width: calc(100vw - 2.7rem);
			max-height: calc(100svh - var(--content-top) - 1rem);
		}

		.splash-nav {
			display: none;
		}

		.splash-copy {
			gap: 1.15rem;
			margin-top: 0;
		}

		.practice-line {
			font-size: 1.35rem;
		}

		.quote-block blockquote {
			font-size: 0.95rem;
			line-height: 1.5;
		}
	}
</style>

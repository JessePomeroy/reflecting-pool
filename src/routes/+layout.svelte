<script lang="ts">
import { inject } from "@vercel/analytics";
import type { Snippet } from "svelte";
import { dev } from "$app/environment";

interface Props {
	children: Snippet;
}

let { children }: Props = $props();

inject({ mode: dev ? "development" : "production" });
</script>

<svelte:head>
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<meta name="color-scheme" content="dark" />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Cormorant:ital,wght@0,300;0,400;0,500;1,300;1,400&display=swap"
		rel="stylesheet"
	/>
	<!-- Default SEO meta tags -->
	<title>margaret helena · photography</title>
	<meta name="description" content="Fine art photography prints on archival paper. Each print is made to order and shipped directly to you." />
	<meta property="og:title" content="margaret helena · photography" />
	<meta property="og:description" content="Fine art photography prints on archival paper" />
	<meta property="og:type" content="website" />
	<link rel="canonical" href="https://margarethelena.com" />
</svelte:head>

<video
	class="caustics-bg"
	autoplay
	loop
	muted
	playsinline
	src="/videos/caustics.mp4"
></video>
<div class="caustics-overlay"></div>
{@render children()}

<style>
	/* Design tokens — use rgb triplets so the same channels can be reused
	   at any opacity via rgba(var(--paper-rgb), X). Mobile breakpoint is
	   documented here for reference (CSS custom properties cannot be used
	   inside @media queries, so the 768px value is still hardcoded in each
	   component's media block — keep them in sync with --bp-mobile). */
	:global(:root) {
		--ink: #1a1f2e;
		--ink-rgb: 26, 31, 46;
		--paper: #f0f4f8;
		--paper-rgb: 240, 244, 248;
		--font-serif: 'Cormorant', serif;
		--bp-mobile: 768px;
		--admin-dark-rgb: var(--ink-rgb);
		--admin-light-rgb: var(--paper-rgb);
	}

	:global(*) {
		margin: 0;
		padding: 0;
		box-sizing: border-box;
	}

	:global(html, body) {
		font-family: var(--font-serif);
		background: transparent;
		color: rgba(var(--paper-rgb), 0.85);
		overflow-x: hidden;
		min-height: 100vh;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
	}

	:global(body) {
		position: relative;
		cursor: none;
	}

	/* Caustics video background */
	.caustics-bg {
		position: fixed;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		z-index: -2;
		opacity: 0.6;
	}

	.caustics-overlay {
		position: fixed;
		inset: 0;
		z-index: -1;
		background: linear-gradient(
			to bottom,
			rgba(var(--ink-rgb),1) 0%,
			rgba(var(--ink-rgb),1) 12%,
			rgba(var(--ink-rgb),0.92) 22%,
			rgba(58, 66, 85, 0.6) 45%,
			rgba(138, 154, 171, 0.35) 70%,
			rgba(200, 207, 216, 0.25) 100%
		);
		pointer-events: none;
	}

	/* Restore default cursor on touch devices (no custom cursor needed) */
	@media (pointer: coarse) {
		:global(body) {
			cursor: auto;
		}
	}

	/* Restore default cursor when user prefers reduced motion */
	@media (prefers-reduced-motion: reduce) {
		:global(body) {
			cursor: auto;
		}
	}

	/* Scrollbar styling */
	:global(::-webkit-scrollbar) {
		width: 6px;
	}

	:global(::-webkit-scrollbar-track) {
		background: transparent;
	}

	:global(::-webkit-scrollbar-thumb) {
		background: rgba(var(--ink-rgb),0.3);
		border-radius: 3px;
	}
</style>

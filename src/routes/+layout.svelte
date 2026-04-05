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
/>
<div class="caustics-overlay"></div>
{@render children()}

<style>
	:global(*) {
		margin: 0;
		padding: 0;
		box-sizing: border-box;
	}

	:global(html, body) {
		font-family: 'Cormorant', serif;
		background: linear-gradient(to bottom, #1a1f2e 0%, #1a1f2e 20%, #3a4255 45%, #8a9aab 70%, #c8cfd8 100%);
		background-attachment: fixed;
		color: rgba(240, 244, 248, 0.85);
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
			rgba(26, 31, 46, 0.6) 0%,
			rgba(26, 31, 46, 0.4) 50%,
			rgba(200, 207, 216, 0.1) 100%
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
		background: rgba(26, 31, 46, 0.3);
		border-radius: 3px;
	}
</style>

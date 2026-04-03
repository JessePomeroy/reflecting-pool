<script lang="ts">
import type { Snippet } from "svelte";

interface Props {
	children: Snippet;
}

let { children }: Props = $props();
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

{@render children()}

<style>
	:global(*) {
		margin: 0;
		padding: 0;
		box-sizing: border-box;
	}

	:global(html, body) {
		font-family: 'Cormorant', serif;
		background: #c8cfd8;
		color: rgba(240, 244, 248, 0.85);
		overflow-x: hidden;
		min-height: 100vh;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
	}

	:global(body) {
		position: relative;
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

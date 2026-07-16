<script lang="ts">
import AboutExperience from "$lib/components/AboutExperience.svelte";
import type { PageData } from "./$types";

let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Contact draft preview · margaret helena</title>
	<meta name="robots" content="noindex, nofollow, noarchive" />
</svelte:head>

<AboutExperience about={data.about} settings={data.settings} />

<aside aria-label="Draft preview">
	<strong>draft preview</strong>
	<span>only you can see this saved Contact &amp; Booking draft</span>
	<a href="/admin/editor/pages/contact">return to editor</a>
</aside>

<style>
	aside { position: fixed; right: 1rem; bottom: 1rem; z-index: 300; display: flex; gap: .8rem; align-items: center; padding: .7rem .9rem; border: 1px solid rgba(var(--paper-rgb), .32); border-radius: 999px; background: rgba(var(--ink-rgb), .82); color: rgba(var(--paper-rgb), .82); font-family: var(--font-serif); font-size: .72rem; letter-spacing: .08em; backdrop-filter: blur(12px); }
	strong { font-weight: 400; text-transform: lowercase; }
	span { color: rgba(var(--paper-rgb), .58); }
	a { color: inherit; text-underline-offset: .2em; }
	@media (max-width: 640px) {
		aside { left: 1rem; right: 1rem; justify-content: space-between; border-radius: .6rem; }
		span { display: none; }
	}
</style>

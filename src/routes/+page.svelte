<script lang="ts">
import HomepageExperience from "$lib/components/HomepageExperience.svelte";
import type { PageData } from "./$types";

let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>margaret helena · photography</title>
	<meta name="description" content={data.homepage.seo.description} />
	{#if data.homepage.seo.ogImage}
		<meta property="og:image" content={data.homepage.seo.ogImage} />
	{/if}
</svelte:head>

<HomepageExperience homepage={data.homepage} />

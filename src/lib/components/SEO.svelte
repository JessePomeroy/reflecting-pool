<script lang="ts">
interface Props {
	title: string;
	description: string;
	url?: string;
	image?: string;
}

let { title, description, url = "", image = "" }: Props = $props();

const siteName = "margaret helena · photography";
const fullTitle = $derived(title ? `${title} · margaret helena` : siteName);
</script>

<svelte:head>
	<title>{fullTitle}</title>
	<meta name="description" content={description} />

	<!-- Open Graph -->
	<meta property="og:title" content={fullTitle} />
	<meta property="og:description" content={description} />
	<meta property="og:type" content="website" />
	{#if url}
		<meta property="og:url" content={url} />
	{/if}
	{#if image}
		<meta property="og:image" content={image} />
	{/if}
	<meta property="og:site_name" content={siteName} />

	<!-- Twitter Card -->
	<meta name="twitter:card" content={image ? 'summary_large_image' : 'summary'} />
	<meta name="twitter:title" content={fullTitle} />
	<meta name="twitter:description" content={description} />
	{#if image}
		<meta name="twitter:image" content={image} />
	{/if}
</svelte:head>

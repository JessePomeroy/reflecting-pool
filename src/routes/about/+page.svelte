<script lang="ts">
import AboutExperience from "$lib/components/AboutExperience.svelte";
import SEO from "$lib/components/SEO.svelte";
import type { PageData } from "./$types";

let { data }: { data: PageData } = $props();
</script>

<SEO title="about" description={data.about.seo.description} image={data.about.seo.ogImage} />

<AboutExperience about={data.about} settings={data.settings} />

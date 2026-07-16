<script lang="ts">
import GalleryExperience from "$lib/components/GalleryExperience.svelte";

let { data } = $props();
</script>

<GalleryExperience clusters={data.clusters} />

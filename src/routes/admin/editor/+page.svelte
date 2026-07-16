<script lang="ts">
import {
	LoadingState,
	SiteSettingsPage,
	type SiteSettingsEditorState,
	useAdminClient,
} from "@jessepomeroy/admin";
import { useQuery } from "convex-svelte";
import { api } from "$convex/api";
import { adminConfig } from "$lib/config/admin";
import { siteSettingsEditorSeed } from "$lib/content/siteSettingsSeed";

const editorStateQuery = useQuery(api.content.getSiteSettingsEditorState, {
	siteUrl: adminConfig.siteUrl,
});
const client = useAdminClient();

let startBlank = $state(false);
let seedStatus = $state<"idle" | "saving" | "error">("idle");
let seedError = $state("");
let editorState = $derived(
	editorStateQuery.data as SiteSettingsEditorState | null | undefined,
);

async function copyCurrentSettings() {
	seedStatus = "saving";
	seedError = "";
	try {
		await client.mutation(api.content.saveSiteSettingsDraft, {
			siteUrl: adminConfig.siteUrl,
			payload: siteSettingsEditorSeed,
		});
		// Keep this screen mounted until the reactive query observes the new
		// document. SiteSettingsPage can then initialize from the saved revision.
	} catch (error) {
		seedStatus = "error";
		seedError = error instanceof Error ? error.message : "Could not copy the current settings.";
	}
}
</script>

{#if editorState === undefined}
	<div class="loading"><LoadingState /></div>
{:else if editorState === null && !startBlank}
	<section class="seed-panel" aria-labelledby="seed-heading">
		<h1 id="seed-heading">set up site settings</h1>
		<p class="description">
			Copy the values Reflecting Pool currently uses as its safe fallback, or begin with empty fields.
			Nothing changes on the public site during this step.
		</p>

		<dl>
			<div><dt>name</dt><dd>{siteSettingsEditorSeed.artistName}</dd></div>
			<div><dt>site title</dt><dd>{siteSettingsEditorSeed.siteTitle}</dd></div>
			<div><dt>tagline</dt><dd>{siteSettingsEditorSeed.tagline}</dd></div>
		</dl>

		{#if seedError}<p class="error" role="alert">{seedError}</p>{/if}
		<div class="actions">
			<button
				type="button"
				class="primary"
				onclick={() => void copyCurrentSettings()}
				disabled={seedStatus === "saving"}
			>
				{seedStatus === "saving" ? "copying…" : "copy current settings"}
			</button>
			<button type="button" onclick={() => (startBlank = true)} disabled={seedStatus === "saving"}>
				start blank
			</button>
		</div>
		<p class="status" aria-live="polite">
			{seedStatus === "saving" ? "Saving an unpublished draft…" : "This creates an unpublished draft only."}
		</p>
	</section>
{:else}
	<SiteSettingsPage />
{/if}

<style>
	.loading {
		min-height: 45vh;
		display: grid;
		place-items: center;
	}

	.seed-panel {
		max-width: 720px;
		margin: 0 auto;
		padding: 64px 40px 96px;
	}

	h1 {
		margin: 0;
		color: var(--admin-heading);
		font-family: var(--admin-font-display);
		font-size: 1.8rem;
		font-weight: 500;
	}

	.description {
		max-width: 620px;
		margin: 10px 0 28px;
		color: var(--admin-text-muted);
		line-height: 1.65;
	}

	dl {
		margin: 0 0 28px;
		border-top: 1px solid var(--admin-border);
	}

	dl div {
		display: grid;
		grid-template-columns: 110px 1fr;
		gap: 18px;
		padding: 14px 0;
		border-bottom: 1px solid var(--admin-border);
	}

	dt {
		color: var(--admin-text-subtle);
		font-size: 0.72rem;
	}

	dd {
		margin: 0;
		color: var(--admin-text);
		line-height: 1.5;
	}

	.actions {
		display: flex;
		gap: 9px;
		flex-wrap: wrap;
	}

	button {
		border: 1px solid var(--admin-border-strong);
		border-radius: 6px;
		padding: 10px 14px;
		background: transparent;
		color: var(--admin-text);
		font: inherit;
		font-size: 0.78rem;
		cursor: pointer;
	}

	button:focus-visible {
		outline: 2px solid var(--admin-accent);
		outline-offset: 2px;
	}

	button:disabled {
		opacity: 0.45;
		cursor: default;
	}

	.primary {
		border-color: transparent;
		background: var(--admin-accent);
		color: var(--admin-bg);
	}

	.status,
	.error {
		margin: 12px 0 0;
		font-size: 0.76rem;
	}

	.status {
		color: var(--admin-text-subtle);
	}

	.error {
		color: var(--status-rose);
	}

	@media (max-width: 768px) {
		.seed-panel {
			padding: 36px 20px 72px;
		}

		dl div {
			grid-template-columns: 1fr;
			gap: 5px;
		}
	}
</style>

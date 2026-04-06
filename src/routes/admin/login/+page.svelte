<script lang="ts">
import type { PageData } from "./$types";

interface Props {
	data: PageData;
}
let { data }: Props = $props();

function errorMessage(code: string | null): string | null {
	if (!code) return null;
	switch (code) {
		case "AccessDenied":
			return "That account is not permitted to access the admin.";
		case "Configuration":
			return "Auth is not configured on the server.";
		case "Verification":
			return "The sign-in link has expired. Please try again.";
		default:
			return "Sign-in failed. Please try again.";
	}
}

const msg = $derived(errorMessage(data.error));
</script>

<svelte:head>
	<title>Admin login · Reflecting Pool</title>
</svelte:head>

<main class="login-wrap">
	<div class="login-card">
		<h1>Reflecting Pool</h1>
		<p class="hint">Sign in with the authorized Google account to continue.</p>

		{#if msg}
			<p class="error" role="alert">{msg}</p>
		{/if}

		<form method="POST">
			<input type="hidden" name="providerId" value="google" />
			<input type="hidden" name="redirectTo" value={data.next} />
			<button type="submit">
				<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
					<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
					<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
					<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
					<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
				</svg>
				Sign in with Google
			</button>
		</form>
	</div>
</main>

<style>
	.login-wrap {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #1a1f2e;
		color: rgba(var(--paper-rgb), 0.82);
		font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
		cursor: auto;
		padding: 2rem 1rem;
	}

	.login-wrap :global(*) {
		cursor: inherit;
	}

	.login-card {
		width: 100%;
		max-width: 380px;
		padding: 2.5rem 2rem;
		background: #242a3b;
		border: 1px solid rgba(var(--paper-rgb), 0.08);
		border-radius: 3px;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	h1 {
		margin: 0;
		font-family: var(--font-serif);
		font-size: 1.5rem;
		font-weight: 400;
		letter-spacing: 0.02em;
		color: rgba(var(--paper-rgb), 0.95);
	}

	.hint {
		margin: -0.75rem 0 0;
		font-size: 0.875rem;
		color: rgba(var(--paper-rgb), 0.55);
		line-height: 1.5;
	}

	form {
		margin: 0;
	}

	button {
		width: 100%;
		padding: 0.75rem 1rem;
		background: transparent;
		color: rgba(var(--paper-rgb), 0.9);
		border: 1px solid rgba(var(--paper-rgb), 0.3);
		border-radius: 2px;
		font-weight: 500;
		font-size: 0.8125rem;
		letter-spacing: 0.06em;
		cursor: pointer;
		font-family: inherit;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.625rem;
		transition: color 0.15s ease, border-color 0.15s ease, background 0.15s ease;
	}

	button:hover {
		color: rgba(var(--paper-rgb), 1);
		border-color: rgba(var(--paper-rgb), 0.55);
		background: rgba(var(--paper-rgb), 0.04);
	}

	.error {
		margin: 0;
		padding: 0.5rem 0.75rem;
		background: rgba(184, 124, 124, 0.08);
		border: 1px solid rgba(184, 124, 124, 0.3);
		border-radius: 2px;
		font-size: 0.8125rem;
		color: #d4a4a4;
	}
</style>

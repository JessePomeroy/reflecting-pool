<script lang="ts">
type FormState = "idle" | "sending" | "success" | "error";

let formStatus: FormState = $state("idle");
let errorMessage: string = $state("");

let name = $state("");
let email = $state("");
let subject = $state("");
let message = $state("");

async function handleSubmit(e: SubmitEvent) {
	e.preventDefault();
	formStatus = "sending";
	errorMessage = "";

	try {
		const res = await fetch("/api/contact", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name, email, subject, message }),
		});

		if (!res.ok) {
			const data = (await res.json().catch(() => ({}))) as { error?: string };
			throw new Error(data.error ?? "something went wrong");
		}

		formStatus = "success";
		name = "";
		email = "";
		subject = "";
		message = "";
	} catch (err) {
		formStatus = "error";
		errorMessage = err instanceof Error ? err.message : "something went wrong";
	}
}

function reset() {
	formStatus = "idle";
	errorMessage = "";
}
</script>

<div class="contact-form-wrapper">
	{#if formStatus === 'success'}
		<div class="form-success">
			<p class="success-message">message received — i'll be in touch soon.</p>
			<button class="reset-btn" onclick={reset}>send another message</button>
		</div>
	{:else}
		<form onsubmit={handleSubmit} class="contact-form" novalidate>
			<div class="field-group">
				<label for="cf-name">name</label>
				<input
					id="cf-name"
					type="text"
					bind:value={name}
					placeholder="your name"
					required
					disabled={formStatus === 'sending'}
					autocomplete="name"
				/>
			</div>

			<div class="field-group">
				<label for="cf-email">email</label>
				<input
					id="cf-email"
					type="email"
					bind:value={email}
					placeholder="your@email.com"
					required
					disabled={formStatus === 'sending'}
					autocomplete="email"
				/>
			</div>

			<div class="field-group">
				<label for="cf-subject">subject</label>
				<input
					id="cf-subject"
					type="text"
					bind:value={subject}
					placeholder="portrait session, print inquiry…"
					required
					disabled={formStatus === 'sending'}
				/>
			</div>

			<div class="field-group">
				<label for="cf-message">message</label>
				<textarea
					id="cf-message"
					bind:value={message}
					placeholder="tell me about your project…"
					rows="5"
					required
					disabled={formStatus === 'sending'}
				></textarea>
			</div>

			{#if formStatus === 'error'}
				<p class="error-message">{errorMessage}</p>
			{/if}

			<button type="submit" class="submit-btn" disabled={formStatus === 'sending'}>
				{formStatus === 'sending' ? 'sending…' : 'send message'}
			</button>
		</form>
	{/if}
</div>

<style>
	.contact-form-wrapper {
		width: 100%;
	}

	.contact-form {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.field-group {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	label {
		font-family: var(--font-serif);
		font-size: 0.8rem;
		letter-spacing: 0.1em;
		color: rgba(var(--ink-rgb), 0.5);
		text-transform: lowercase;
	}

	input,
	textarea {
		font-family: var(--font-serif);
		font-size: 1rem;
		color: var(--ink);
		background: rgba(255, 255, 255, 0.35);
		border: 1px solid rgba(var(--ink-rgb), 0.15);
		border-radius: 2px;
		padding: 0.65rem 0.85rem;
		width: 100%;
		outline: none;
		transition:
			border-color 0.25s ease,
			background 0.25s ease;
		-webkit-backdrop-filter: blur(4px);
		backdrop-filter: blur(4px);
		resize: vertical;
	}

	input::placeholder,
	textarea::placeholder {
		color: rgba(var(--ink-rgb), 0.3);
		font-style: italic;
	}

	input:focus,
	textarea:focus {
		border-color: rgba(var(--ink-rgb), 0.35);
		background: rgba(255, 255, 255, 0.55);
	}

	input:disabled,
	textarea:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.submit-btn {
		font-family: var(--font-serif);
		font-size: 0.85rem;
		font-weight: 400;
		letter-spacing: 0.15em;
		text-transform: lowercase;
		color: rgba(var(--paper-rgb), 0.9);
		background: var(--ink);
		border: none;
		border-radius: 2px;
		padding: 0.8rem 1.75rem;
		cursor: pointer;
		transition:
			opacity 0.25s ease,
			background 0.25s ease;
		align-self: flex-start;
		min-height: 44px;
	}

	.submit-btn:hover:not(:disabled) {
		background: rgba(var(--ink-rgb), 0.8);
	}

	.submit-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.error-message {
		font-family: var(--font-serif);
		font-size: 0.9rem;
		color: #8b3a3a;
		font-style: italic;
	}

	.form-success {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		align-items: flex-start;
	}

	.success-message {
		font-family: var(--font-serif);
		font-size: 1.1rem;
		font-style: italic;
		color: rgba(var(--ink-rgb), 0.7);
	}

	.reset-btn {
		font-family: var(--font-serif);
		font-size: 0.8rem;
		letter-spacing: 0.1em;
		text-transform: lowercase;
		color: rgba(var(--ink-rgb), 0.45);
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
		text-decoration: underline;
		text-underline-offset: 3px;
		transition: color 0.25s ease;
	}

	.reset-btn:hover {
		color: rgba(var(--ink-rgb), 0.7);
	}
</style>

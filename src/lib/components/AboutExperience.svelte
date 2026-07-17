<script lang="ts">
import { onMount } from "svelte";
import { initializeCalEmbed } from "$lib/client/calEmbed";
import ContactForm from "$lib/components/ContactForm.svelte";
import type { AboutContent } from "$lib/server/content/about";
import type { SiteSettingsResult } from "$lib/server/content/siteSettings";

let {
	about,
	settings,
}: {
	about: AboutContent;
	settings: SiteSettingsResult;
} = $props();

let booking = $derived(settings.contact.booking);
let portraitIndex = $state(0);
let touchStartX: number | null = null;
let currentPortrait = $derived(about.portraits[portraitIndex] ?? about.portraits[0]);

function previousPortrait() {
	if (about.portraits.length < 2) return;
	portraitIndex = (portraitIndex - 1 + about.portraits.length) % about.portraits.length;
}

function nextPortrait() {
	if (about.portraits.length < 2) return;
	portraitIndex = (portraitIndex + 1) % about.portraits.length;
}

function handlePortraitKeydown(event: KeyboardEvent) {
	if (event.key === "ArrowLeft") {
		event.preventDefault();
		previousPortrait();
	} else if (event.key === "ArrowRight") {
		event.preventDefault();
		nextPortrait();
	}
}

function handleTouchEnd(event: TouchEvent) {
	const endX = event.changedTouches[0]?.clientX;
	if (touchStartX === null || endX === undefined) return;
	const distance = endX - touchStartX;
	if (Math.abs(distance) >= 45) {
		if (distance > 0) previousPortrait(); else nextPortrait();
	}
	touchStartX = null;
}

onMount(() => {
	if (booking.enabled && booking.calLink) initializeCalEmbed();
});
</script>

<div class="about-page">
	<header class="page-header">
		<a href="/" class="back-link">← home</a>
		<h1>{about.heading}</h1>
	</header>

	<div class="about-grid">
		<aside class="portrait-col">
			{#if currentPortrait}
				<!-- svelte-ignore a11y_no_noninteractive_element_interactions (touch swipe supplements accessible buttons) -->
				<div class="portrait-sequence" role="group" aria-label="Portrait sequence" ontouchstart={(event) => (touchStartX = event.touches[0]?.clientX ?? null)} ontouchend={handleTouchEnd}>
					<div class="portrait-wrapper">
						<img
							src={currentPortrait.src}
							srcset={currentPortrait.srcset}
							sizes="(max-width: 700px) 100vw, (max-width: 1000px) 40vw, 360px"
							width={currentPortrait.width}
							height={currentPortrait.height}
							alt={currentPortrait.altText}
							class="portrait-img"
							loading="eager"
						/>
					</div>
					{#if about.portraits.length > 1}
						<div class="portrait-controls">
							<button type="button" onclick={previousPortrait} onkeydown={handlePortraitKeydown} aria-label="Previous portrait">←</button>
							<span aria-live="polite">{portraitIndex + 1} / {about.portraits.length}</span>
							<button type="button" onclick={nextPortrait} onkeydown={handlePortraitKeydown} aria-label="Next portrait">→</button>
						</div>
					{/if}
				</div>
			{/if}

			<div class="social-links">
				{#each settings.site.socialLinks as link}
					<a href={link.url} target="_blank" rel="noopener noreferrer" class="social-link">
						{link.platform}
					</a>
				{/each}
			</div>
		</aside>

		<main class="bio-col">
			<h2 class="artist-name">{about.displayName}</h2>
			{#if about.role}<p class="artist-role">{about.role}</p>{/if}

			{#if about.introduction.trim() || about.biography.trim()}
				<div class="bio-text">
					{#each [about.introduction, about.biography].filter(Boolean).flatMap((value) => value.split('\n\n')).filter(Boolean) as paragraph}
						<p>{paragraph}</p>
					{/each}
				</div>
			{/if}

			<div class="about-sections" id="modeling-acting">
				{#each about.sections as section}
					<section class="about-section">
						<h3>{section.title}</h3>
						<ul>
							{#each section.items as item}
								<li>{item}</li>
							{/each}
						</ul>
					</section>
				{/each}
			</div>

			{#if about.highlights.length > 0}
				<dl class="highlights">
					{#each about.highlights as item}
						<div class="highlight-item">
							<dt>{item.label}</dt>
							<dd>{item.value}</dd>
						</div>
					{/each}
				</dl>
			{/if}
		</main>

		<aside class="contact-col">
			<div class="contact-section" id="contact-form">
				<h2 class="section-heading">{settings.contact.heading}</h2>
				<p class="contact-intro">{settings.contact.intro}</p>
				<ContactForm confirmationMessage={settings.contact.confirmationMessage} />
			</div>

			<div class="booking-section" id="book">
				<h2 class="section-heading">book a session</h2>
				<p class="booking-intro">{booking.intro}</p>
				{#if booking.enabled && booking.calLink}
					<button
						class="booking-btn"
						data-cal-link={booking.calLink}
						data-cal-config={booking.calConfig}
					>
						{booking.label}
					</button>
				{:else if booking.url}
					<a class="booking-btn" href={booking.url} target="_blank" rel="noopener noreferrer">
						{booking.label}
					</a>
				{:else}
					<a class="booking-btn" href="#contact-form">send an inquiry</a>
				{/if}
			</div>
		</aside>
	</div>
</div>

<style>
	.about-page {
		--about-text: rgba(var(--paper-rgb), 0.9);
		--about-body: rgba(var(--paper-rgb), 0.76);
		--about-muted: rgba(var(--paper-rgb), 0.58);
		--about-faint: rgba(var(--paper-rgb), 0.34);
		--contact-label-color: rgba(var(--paper-rgb), 0.62);
		--contact-input-text: rgba(var(--ink-rgb), 0.96);
		--contact-input-bg: rgba(var(--paper-rgb), 0.72);
		--contact-input-bg-focus: rgba(var(--paper-rgb), 0.86);
		--contact-input-border: rgba(var(--paper-rgb), 0.24);
		--contact-input-border-focus: rgba(var(--paper-rgb), 0.52);
		--contact-placeholder-color: rgba(var(--ink-rgb), 0.45);
		--contact-submit-bg: rgba(var(--ink-rgb), 0.92);
		--contact-submit-bg-hover: rgba(var(--ink-rgb), 1);
		--contact-submit-text: rgba(var(--paper-rgb), 0.94);
		min-height: 100vh;
		padding: 2rem;
		max-width: 1200px;
		margin: 0 auto;
		text-shadow: 0 1px 14px rgba(var(--ink-rgb), 0.18);
	}

	.page-header {
		text-align: center;
		margin-bottom: 3rem;
		padding-top: 2rem;
	}

	.back-link {
		display: inline-block;
		color: var(--about-muted);
		text-decoration: none;
		font-size: 0.9rem;
		letter-spacing: 0.05em;
		margin-bottom: 2rem;
		transition: color 0.3s ease;
	}

	.back-link:hover { color: var(--about-text); }

	h1 {
		font-family: var(--font-serif);
		font-weight: 300;
		font-size: 3rem;
		color: var(--about-text);
		letter-spacing: 0.15em;
		text-transform: lowercase;
	}

	.about-grid {
		display: grid;
		grid-template-columns: 1fr 1.6fr 1.4fr;
		gap: 3rem;
		align-items: start;
	}

	.portrait-wrapper { position: sticky; top: 2rem; }
	.portrait-sequence { outline: none; }

	.portrait-img {
		width: 100%;
		aspect-ratio: 3 / 4;
		object-fit: cover;
		border-radius: 2px;
		display: block;
		filter: saturate(0.9) contrast(1.05);
	}

	.portrait-controls {
		display: grid;
		grid-template-columns: 44px 1fr 44px;
		gap: 0.5rem;
		align-items: center;
		margin-top: 0.75rem;
		color: var(--about-muted);
		font-family: var(--font-serif);
		font-size: 0.75rem;
		letter-spacing: 0.1em;
		text-align: center;
	}

	.portrait-controls button {
		min-width: 44px;
		min-height: 44px;
		border: 1px solid var(--about-faint);
		background: transparent;
		color: var(--about-text);
		font: inherit;
		cursor: pointer;
	}

	.portrait-controls button:focus-visible { outline: 2px solid var(--about-text); outline-offset: 2px; }

	.social-links { display: flex; gap: 1rem; margin-top: 1rem; flex-wrap: wrap; }

	.social-link {
		font-family: var(--font-serif);
		font-size: 0.8rem;
		letter-spacing: 0.1em;
		text-transform: lowercase;
		color: var(--about-muted);
		text-decoration: none;
		transition: color 0.25s ease;
		border-bottom: 1px solid var(--about-faint);
		padding-bottom: 1px;
	}

	.social-link:hover { color: var(--about-text); border-bottom-color: var(--about-muted); }

	.artist-name {
		font-family: var(--font-serif);
		font-weight: 300;
		font-size: 2rem;
		color: var(--about-text);
		letter-spacing: 0.12em;
		text-transform: lowercase;
		margin-bottom: 1.5rem;
	}

	.artist-role {
		margin: -0.9rem 0 1.5rem;
		color: var(--about-muted);
		font-family: var(--font-serif);
		font-size: 0.85rem;
		letter-spacing: 0.1em;
		text-transform: lowercase;
	}

	.bio-text { display: flex; flex-direction: column; gap: 1rem; margin-bottom: 2.5rem; }

	.bio-text p,
	.about-section li {
		font-family: var(--font-serif);
		font-size: 1.05rem;
		line-height: 1.75;
		color: var(--about-body);
	}

	.about-sections { display: flex; flex-direction: column; gap: 1.7rem; margin-bottom: 2.5rem; }

	.about-section h3 {
		font-family: var(--font-serif);
		font-weight: 300;
		font-size: 0.85rem;
		letter-spacing: 0.14em;
		text-transform: lowercase;
		color: var(--about-muted);
		margin-bottom: 0.65rem;
	}

	.about-section ul { display: flex; flex-direction: column; gap: 0.5rem; margin: 0; padding-left: 1.1rem; }
	.about-section li::marker { color: var(--about-faint); }
	.highlights { display: flex; flex-direction: column; gap: 0.6rem; }
	.highlight-item { display: grid; grid-template-columns: 7rem 1fr; gap: 0.5rem; }

	dt {
		font-family: var(--font-serif);
		font-size: 0.75rem;
		letter-spacing: 0.1em;
		text-transform: lowercase;
		color: var(--about-muted);
		padding-top: 0.1rem;
	}

	dd { font-family: var(--font-serif); font-size: 0.9rem; color: var(--about-body); margin: 0; }
	.contact-col { display: flex; flex-direction: column; gap: 3rem; }
	.contact-section, .booking-section { display: flex; flex-direction: column; gap: 0.75rem; }

	.section-heading {
		font-family: var(--font-serif);
		font-weight: 300;
		font-size: 1.4rem;
		color: var(--about-text);
		letter-spacing: 0.1em;
		text-transform: lowercase;
	}

	.contact-intro, .booking-intro {
		font-family: var(--font-serif);
		font-size: 0.95rem;
		line-height: 1.6;
		color: var(--about-body);
		margin-bottom: 0.5rem;
	}

	.booking-btn {
		font-family: var(--font-serif);
		font-size: 0.85rem;
		font-weight: 400;
		letter-spacing: 0.15em;
		text-transform: lowercase;
		color: var(--about-text);
		background: transparent;
		border: 1px solid var(--about-muted);
		border-radius: 2px;
		padding: 0.8rem 1.75rem;
		cursor: pointer;
		transition: background 0.25s ease, color 0.25s ease, border-color 0.25s ease;
		align-self: flex-start;
		min-height: 44px;
	}

	.booking-btn:hover {
		background: rgba(var(--paper-rgb), 0.9);
		color: rgba(var(--ink-rgb), 0.94);
		border-color: rgba(var(--paper-rgb), 0.9);
	}

	@media (max-width: 1024px) {
		.about-grid { grid-template-columns: 1fr 1fr; grid-template-areas: 'portrait bio' 'contact contact'; }
		.portrait-col { grid-area: portrait; }
		.bio-col { grid-area: bio; }
		.contact-col { grid-area: contact; }
		.portrait-wrapper { position: static; }
	}

	@media (max-width: 640px) {
		.about-grid { grid-template-columns: 1fr; grid-template-areas: 'portrait' 'bio' 'contact'; gap: 2rem; }
		.portrait-img { aspect-ratio: 4 / 3; max-height: 380px; }
		h1 { font-size: 2.2rem; }
		.about-page { padding: 1rem; }
		.highlight-item { grid-template-columns: 6rem 1fr; }
	}

	@media (prefers-reduced-motion: reduce) { .portrait-img { transition: none; } }
</style>

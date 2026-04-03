<script lang="ts">
import ContactForm from '$lib/components/ContactForm.svelte';
import SEO from '$lib/components/SEO.svelte';
import type { PageData } from './$types';

let { data }: { data: PageData } = $props();

const calConfig = "{'layout':'month_view'}";
</script>

<SEO
	title="about"
	description={data.about.seo.description}
	image={data.about.seo.ogImage}
/>

<svelte:head>
	<!-- Cal.com embed script -->
	<script>
		(function (C, A, L) {
			let p = function (a, ar) {
				a.q.push(ar);
			};
			let d = C.document;
			C.Cal =
				C.Cal ||
				function () {
					let cal = C.Cal;
					let ar = arguments;
					if (!cal.loaded) {
						cal.ns = {};
						cal.q = cal.q || [];
						d.head.appendChild(d.createElement('script')).src = A;
						cal.loaded = true;
					}
					if (ar[0] === L) {
						const api = function () {
							p(api, arguments);
						};
						const namespace = ar[1];
						api.q = api.q || [];
						if (typeof namespace === 'string') {
							cal.ns[namespace] = cal.ns[namespace] || api;
							p(cal.ns[namespace], ar);
							p(cal, ['-ready', namespace]);
						} else {
							p(cal, ar);
							p(cal, ['-ready']);
						}
						return;
					}
					p(cal, ar);
				};
			C.Cal('init', { origin: 'https://cal.com' });
		})(window, 'https://app.cal.com/embed/embed.js', 'init');
	</script>
</svelte:head>

<div class="about-page">
	<header class="page-header">
		<a href="/" class="back-link">← back to gallery</a>
		<h1>{data.about.heading}</h1>
	</header>

	<div class="about-grid">
		<!-- Column 1: Portrait -->
		<aside class="portrait-col">
			<div class="portrait-wrapper">
				<img
					src={data.about.portrait}
					alt="margaret helena"
					class="portrait-img"
					loading="eager"
				/>
			</div>

			<!-- Social links -->
			<div class="social-links">
				{#each data.about.socialLinks as link}
					<a
						href={link.url}
						target="_blank"
						rel="noopener noreferrer"
						class="social-link"
					>
						{link.platform}
					</a>
				{/each}
			</div>
		</aside>

		<!-- Column 2: Bio -->
		<main class="bio-col">
			<h2 class="artist-name">margaret helena</h2>

			<div class="bio-text">
				{#each data.about.bio.split('\n\n') as paragraph}
					<p>{paragraph}</p>
				{/each}
			</div>

			<div class="statement-block">
				<h3 class="statement-label">artist statement</h3>
				<div class="statement-text">
					{#each data.about.artistStatement.split('\n\n') as paragraph}
						<p>{paragraph}</p>
					{/each}
				</div>
			</div>

			{#if data.about.highlights.length > 0}
				<dl class="highlights">
					{#each data.about.highlights as item}
						<div class="highlight-item">
							<dt>{item.label}</dt>
							<dd>{item.value}</dd>
						</div>
					{/each}
				</dl>
			{/if}
		</main>

		<!-- Column 3: Contact + Booking -->
		<aside class="contact-col">
			<div class="contact-section">
				<h2 class="section-heading">get in touch</h2>
				<p class="contact-intro">
					questions about prints, sessions, or just want to say hello — i'd love to hear from you.
				</p>
				<ContactForm />
			</div>

			<div class="booking-section">
				<h2 class="section-heading">book a session</h2>
				<p class="booking-intro">
					portrait sessions, editorial work, and botanical commissions. let's make something together.
				</p>
				<button
					class="booking-btn"
					data-cal-link="photographer/session"
					data-cal-config={calConfig}
				>
					book a session
				</button>
			</div>
		</aside>
	</div>
</div>

<style>
	.about-page {
		min-height: 100vh;
		padding: 2rem;
		max-width: 1200px;
		margin: 0 auto;
	}

	/* ─── Header ─────────────────────────────────────────────── */
	.page-header {
		text-align: center;
		margin-bottom: 3rem;
		padding-top: 2rem;
	}

	.back-link {
		display: inline-block;
		color: rgba(26, 31, 46, 0.5);
		text-decoration: none;
		font-size: 0.9rem;
		letter-spacing: 0.05em;
		margin-bottom: 2rem;
		transition: color 0.3s ease;
	}

	.back-link:hover {
		color: rgba(26, 31, 46, 0.8);
	}

	h1 {
		font-family: 'Cormorant', serif;
		font-weight: 300;
		font-size: 3rem;
		color: #1a1f2e;
		letter-spacing: 0.15em;
		text-transform: lowercase;
	}

	/* ─── Grid ───────────────────────────────────────────────── */
	.about-grid {
		display: grid;
		grid-template-columns: 1fr 1.6fr 1.4fr;
		gap: 3rem;
		align-items: start;
	}

	/* ─── Portrait Column ────────────────────────────────────── */
	.portrait-wrapper {
		position: sticky;
		top: 2rem;
	}

	.portrait-img {
		width: 100%;
		aspect-ratio: 3 / 4;
		object-fit: cover;
		border-radius: 2px;
		display: block;
		filter: saturate(0.9) contrast(1.05);
	}

	.social-links {
		display: flex;
		gap: 1rem;
		margin-top: 1rem;
		flex-wrap: wrap;
	}

	.social-link {
		font-family: 'Cormorant', serif;
		font-size: 0.8rem;
		letter-spacing: 0.1em;
		text-transform: lowercase;
		color: rgba(26, 31, 46, 0.45);
		text-decoration: none;
		transition: color 0.25s ease;
		border-bottom: 1px solid rgba(26, 31, 46, 0.2);
		padding-bottom: 1px;
	}

	.social-link:hover {
		color: rgba(26, 31, 46, 0.75);
		border-bottom-color: rgba(26, 31, 46, 0.5);
	}

	/* ─── Bio Column ─────────────────────────────────────────── */
	.artist-name {
		font-family: 'Cormorant', serif;
		font-weight: 300;
		font-size: 2rem;
		color: #1a1f2e;
		letter-spacing: 0.12em;
		text-transform: lowercase;
		margin-bottom: 1.5rem;
	}

	.bio-text {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-bottom: 2.5rem;
	}

	.bio-text p,
	.statement-text p {
		font-family: 'Cormorant', serif;
		font-size: 1.05rem;
		line-height: 1.75;
		color: rgba(26, 31, 46, 0.7);
	}

	.statement-block {
		margin-bottom: 2.5rem;
		padding-left: 1.25rem;
		border-left: 1px solid rgba(26, 31, 46, 0.15);
	}

	.statement-label {
		font-family: 'Cormorant', serif;
		font-weight: 300;
		font-size: 0.75rem;
		letter-spacing: 0.15em;
		text-transform: lowercase;
		color: rgba(26, 31, 46, 0.4);
		margin-bottom: 0.75rem;
	}

	.statement-text {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.statement-text p {
		font-style: italic;
	}

	/* Highlights */
	.highlights {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.highlight-item {
		display: grid;
		grid-template-columns: 7rem 1fr;
		gap: 0.5rem;
	}

	dt {
		font-family: 'Cormorant', serif;
		font-size: 0.75rem;
		letter-spacing: 0.1em;
		text-transform: lowercase;
		color: rgba(26, 31, 46, 0.4);
		padding-top: 0.1rem;
	}

	dd {
		font-family: 'Cormorant', serif;
		font-size: 0.9rem;
		color: rgba(26, 31, 46, 0.65);
		margin: 0;
	}

	/* ─── Contact / Booking Column ───────────────────────────── */
	.contact-col {
		display: flex;
		flex-direction: column;
		gap: 3rem;
	}

	.contact-section,
	.booking-section {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.section-heading {
		font-family: 'Cormorant', serif;
		font-weight: 300;
		font-size: 1.4rem;
		color: #1a1f2e;
		letter-spacing: 0.1em;
		text-transform: lowercase;
	}

	.contact-intro,
	.booking-intro {
		font-family: 'Cormorant', serif;
		font-size: 0.95rem;
		line-height: 1.6;
		color: rgba(26, 31, 46, 0.55);
		margin-bottom: 0.5rem;
	}

	/* Booking button */
	.booking-btn {
		font-family: 'Cormorant', serif;
		font-size: 0.85rem;
		font-weight: 400;
		letter-spacing: 0.15em;
		text-transform: lowercase;
		color: #1a1f2e;
		background: transparent;
		border: 1px solid rgba(26, 31, 46, 0.3);
		border-radius: 2px;
		padding: 0.8rem 1.75rem;
		cursor: pointer;
		transition:
			background 0.25s ease,
			color 0.25s ease,
			border-color 0.25s ease;
		align-self: flex-start;
		min-height: 44px;
	}

	.booking-btn:hover {
		background: #1a1f2e;
		color: rgba(240, 244, 248, 0.9);
		border-color: #1a1f2e;
	}

	/* ─── Responsive ─────────────────────────────────────────── */
	@media (max-width: 1024px) {
		.about-grid {
			grid-template-columns: 1fr 1fr;
			grid-template-areas:
				'portrait bio'
				'contact contact';
		}

		.portrait-col {
			grid-area: portrait;
		}

		.bio-col {
			grid-area: bio;
		}

		.contact-col {
			grid-area: contact;
		}

		.portrait-wrapper {
			position: static;
		}
	}

	@media (max-width: 640px) {
		.about-grid {
			grid-template-columns: 1fr;
			grid-template-areas:
				'portrait'
				'bio'
				'contact';
			gap: 2rem;
		}

		.portrait-img {
			aspect-ratio: 4 / 3;
			max-height: 380px;
		}

		h1 {
			font-size: 2.2rem;
		}

		.about-page {
			padding: 1rem;
		}

		.highlight-item {
			grid-template-columns: 6rem 1fr;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.portrait-img {
			transition: none;
		}
	}
</style>

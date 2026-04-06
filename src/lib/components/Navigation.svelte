<script lang="ts">
let menuOpen = $state(false);

const links = [
	{ label: "photography", href: "#" },
	{ label: "shop", href: "#" },
	{ label: "about", href: "#" },
	{ label: "book", href: "#" },
];

function toggleMenu() {
	menuOpen = !menuOpen;
}

function closeMenu() {
	menuOpen = false;
}
</script>

<nav class="navigation" class:menu-open={menuOpen}>
	<!-- Desktop nav -->
	<ul class="nav-links desktop">
		{#each links as link}
			<li>
				<a href={link.href}>{link.label}</a>
			</li>
		{/each}
	</ul>

	<!-- Mobile hamburger -->
	<button class="hamburger mobile" onclick={toggleMenu} aria-label="Toggle menu">
		<span class="bar"></span>
		<span class="bar"></span>
		<span class="bar"></span>
	</button>

	<!-- Mobile overlay -->
	{#if menuOpen}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="mobile-overlay" onclick={closeMenu}>
			<ul class="nav-links-mobile">
				{#each links as link, i}
					<li style="animation-delay: {i * 80}ms">
						<a href={link.href} onclick={closeMenu}>{link.label}</a>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</nav>

<style>
	.navigation {
		z-index: 16;
		position: relative;
	}

	/* Desktop */
	.desktop {
		display: flex;
		gap: clamp(0.8rem, 2vw, 1.5rem);
		list-style: none;
		margin: 0;
		padding: 0;
		justify-content: flex-end;
		flex-wrap: wrap;
	}

	.desktop li a {
		font-family: var(--font-serif);
		font-weight: 400;
		font-size: clamp(0.85rem, 1.2vw, 1rem);
		color: rgba(var(--paper-rgb), 0.45);
		text-decoration: none;
		letter-spacing: 0.15em;
		transition: color 300ms ease;
	}

	.desktop li a:hover {
		color: rgba(var(--paper-rgb), 0.8);
	}

	.desktop li + li::before {
		content: '·';
		color: rgba(var(--paper-rgb), 0.25);
		margin-right: 1.5rem;
	}

	/* Mobile hamburger */
	.hamburger {
		display: none;
		flex-direction: column;
		gap: 5px;
		background: none;
		border: none;
		cursor: pointer;
		padding: 10px;
		position: fixed;
		top: 1.8rem;
		right: 1.2rem;
		z-index: 201;
	}

	.hamburger .bar {
		display: block;
		width: 24px;
		height: 2px;
		background: rgba(var(--paper-rgb), 0.7);
		transition: all 300ms ease;
	}

	.menu-open .hamburger .bar:nth-child(1) {
		transform: translateY(7px) rotate(45deg);
	}
	.menu-open .hamburger .bar:nth-child(2) {
		opacity: 0;
	}
	.menu-open .hamburger .bar:nth-child(3) {
		transform: translateY(-7px) rotate(-45deg);
	}

	/* Mobile overlay */
	.mobile-overlay {
		position: fixed;
		inset: 0;
		background: rgba(var(--ink-rgb), 0.97);
		z-index: 200;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.nav-links-mobile {
		list-style: none;
		padding: 0;
		text-align: center;
	}

	.nav-links-mobile li {
		opacity: 0;
		animation: fadeSlideIn 400ms ease forwards;
	}

	.nav-links-mobile li a {
		font-family: var(--font-serif);
		font-weight: 300;
		font-size: 2rem;
		color: rgba(var(--paper-rgb), 0.7);
		text-decoration: none;
		letter-spacing: 0.2em;
		display: block;
		padding: 0.8rem 2rem;
		transition: color 300ms ease;
	}

	.nav-links-mobile li a:hover {
		color: rgba(var(--paper-rgb), 1);
	}

	@keyframes fadeSlideIn {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (max-width: 767px) {
		.desktop {
			display: none;
		}
		.hamburger {
			display: flex;
		}
	}

	@media (max-width: 767px) and (orientation: landscape) {
		.hamburger {
			top: 2.8rem;
		}
	}


</style>

<script lang="ts">
import type { Snippet } from "svelte";
import { page } from "$app/stores";

interface Props {
	children: Snippet;
}

let { children }: Props = $props();

let sidebarOpen = $state(false);

type NavIcon = "dashboard" | "orders" | "inquiries" | "galleries";
const navItems: { href: string; label: string; icon: NavIcon }[] = [
	{ href: "/admin", label: "Dashboard", icon: "dashboard" },
	{ href: "/admin/orders", label: "Orders", icon: "orders" },
	{ href: "/admin/inquiries", label: "Inquiries", icon: "inquiries" },
	{ href: "/admin/galleries", label: "Galleries", icon: "galleries" },
];

function isActive(href: string, currentPath: string): boolean {
	if (href === "/admin") return currentPath === "/admin";
	return currentPath.startsWith(href);
}
</script>

<svelte:head>
	<title>Admin · Reflecting Pool</title>
</svelte:head>

<div class="admin-layout">
	<!-- Mobile Header -->
	<header class="mobile-header">
		<button class="menu-toggle" onclick={() => (sidebarOpen = !sidebarOpen)} aria-label="Toggle menu">
			{#if sidebarOpen}
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
			{:else}
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
			{/if}
		</button>
		<span class="brand">Reflecting Pool</span>
	</header>

	<!-- Sidebar -->
	<aside class="sidebar" class:open={sidebarOpen}>
		<div class="sidebar-header">
			<h1 class="brand">Reflecting Pool</h1>
			<span class="badge">Admin</span>
		</div>

		<nav class="nav">
			{#each navItems as item (item.href)}
				<a
					href={item.href}
					class="nav-item"
					class:active={isActive(item.href, $page.url.pathname)}
					onclick={() => (sidebarOpen = false)}
				>
					<span class="nav-icon" aria-hidden="true">
						{#if item.icon === "dashboard"}
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>
						{:else if item.icon === "orders"}
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>
						{:else if item.icon === "inquiries"}
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M3 7l9 6 9-6"/></svg>
						{:else if item.icon === "galleries"}
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="14" rx="1.5"/><circle cx="9" cy="10" r="1.5"/><path d="M21 15l-5-5L7 18"/></svg>
						{/if}
					</span>
					<span class="nav-label">{item.label}</span>
				</a>
			{/each}
		</nav>

		<div class="sidebar-footer">
			<a href="/" class="back-link">← Back to site</a>
			<form method="POST" action="/admin/logout" class="logout-form">
				<input type="hidden" name="redirectTo" value="/admin/login" />
				<button type="submit" class="logout-btn">Sign out</button>
			</form>
		</div>
	</aside>

	<!-- Overlay for mobile -->
	{#if sidebarOpen}
		<button class="overlay" onclick={() => (sidebarOpen = false)} aria-label="Close menu"></button>
	{/if}

	<!-- Main Content -->
	<main class="content">
		{@render children()}
	</main>
</div>

<style>
	/* ── Admin design tokens — harmonized with site palette ────────── */
	.admin-layout {
		/* Neutrals derived from --ink / --paper */
		--admin-bg: #1a1f2e;
		--admin-surface: #242a3b;
		--admin-surface-raised: #2b3244;
		--admin-border: rgba(var(--paper-rgb), 0.08);
		--admin-border-strong: rgba(var(--paper-rgb), 0.14);

		--admin-heading: rgba(var(--paper-rgb), 0.95);
		--admin-text: rgba(var(--paper-rgb), 0.82);
		--admin-text-muted: rgba(var(--paper-rgb), 0.55);
		--admin-text-subtle: rgba(var(--paper-rgb), 0.35);

		--admin-accent: rgba(var(--paper-rgb), 0.85);
		--admin-accent-hover: rgba(var(--paper-rgb), 1);
		--admin-active: rgba(var(--paper-rgb), 0.08);

		/* Status palette — muted, derived */
		--status-slate: #6b7fa8;
		--status-amber: #b89a5e;
		--status-lavender: #9d7eb3;
		--status-peach: #c48b6a;
		--status-sage: #7ea487;
		--status-rose: #b87c7c;
		--status-dusty-red: #a8676e;
		--status-gray: rgba(var(--paper-rgb), 0.35);

		display: flex;
		min-height: 100vh;
		background: var(--admin-bg);
		color: var(--admin-text);
		font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
		cursor: auto;
	}

	.admin-layout :global(*) {
		cursor: inherit;
	}

	/* Sidebar */
	.sidebar {
		width: 240px;
		background: var(--admin-surface);
		border-right: 1px solid var(--admin-border);
		display: flex;
		flex-direction: column;
		position: fixed;
		top: 0;
		left: 0;
		bottom: 0;
		z-index: 100;
		transition: transform 0.2s ease;
	}

	.sidebar-header {
		padding: 1.5rem 1.5rem 1.25rem;
		border-bottom: 1px solid var(--admin-border);
	}

	.brand {
		font-family: var(--font-serif);
		font-size: 1.15rem;
		font-weight: 400;
		letter-spacing: 0.04em;
		color: var(--admin-heading);
		margin: 0;
	}

	.badge {
		display: inline-block;
		font-size: 0.65rem;
		padding: 0.125rem 0.5rem;
		background: transparent;
		border: 1px solid var(--admin-border-strong);
		border-radius: 2px;
		color: var(--admin-text-muted);
		margin-left: 0.5rem;
		letter-spacing: 0.15em;
		text-transform: uppercase;
		vertical-align: middle;
	}

	.nav {
		flex: 1;
		padding: 0.75rem 0;
	}

	.nav-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.625rem 1.5rem;
		color: var(--admin-text-muted);
		text-decoration: none;
		border-left: 2px solid transparent;
		transition: color 0.15s ease, background 0.15s ease, border-color 0.15s ease;
	}

	.nav-item:hover {
		background: var(--admin-active);
		color: var(--admin-text);
	}

	.nav-item.active {
		background: var(--admin-active);
		color: var(--admin-heading);
		border-left-color: var(--admin-accent);
	}

	.nav-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 18px;
		height: 18px;
		color: inherit;
		opacity: 0.85;
	}

	.nav-label {
		font-size: 0.875rem;
		font-weight: 400;
		letter-spacing: 0.01em;
	}

	.sidebar-footer {
		padding: 1.25rem 1.5rem;
		border-top: 1px solid var(--admin-border);
	}

	.back-link {
		display: block;
		color: var(--admin-text-muted);
		text-decoration: none;
		font-size: 0.8125rem;
	}

	.back-link:hover {
		color: var(--admin-text);
	}

	.logout-form {
		margin-top: 0.75rem;
	}

	.logout-btn {
		width: 100%;
		background: transparent;
		border: 1px solid var(--admin-border-strong);
		color: var(--admin-text-muted);
		padding: 0.375rem 0.75rem;
		border-radius: 2px;
		font-size: 0.75rem;
		font-family: inherit;
		letter-spacing: 0.05em;
		cursor: pointer;
		text-align: left;
		transition: color 0.15s ease, border-color 0.15s ease;
	}

	.logout-btn:hover {
		border-color: var(--admin-border-strong);
		color: var(--admin-heading);
	}

	/* Mobile Header */
	.mobile-header {
		display: none;
	}

	.menu-toggle {
		background: transparent;
		border: none;
		color: var(--admin-heading);
		cursor: pointer;
		padding: 0.5rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	/* Overlay for mobile */
	.overlay {
		display: none;
	}

	/* Content */
	.content {
		flex: 1;
		margin-left: 240px;
		padding: 2rem 2.5rem;
		min-height: 100vh;
	}

	/* Responsive */
	@media (max-width: 768px) {
		.sidebar {
			transform: translateX(-100%);
		}

		.sidebar.open {
			transform: translateX(0);
		}

		.mobile-header {
			display: flex;
			align-items: center;
			gap: 1rem;
			position: fixed;
			top: 0;
			left: 0;
			right: 0;
			height: 52px;
			background: var(--admin-surface);
			border-bottom: 1px solid var(--admin-border);
			padding: 0 1rem;
			z-index: 90;
		}

		.content {
			margin-left: 0;
			padding: 4rem 1.25rem 2rem;
		}

		.overlay {
			display: block;
			position: fixed;
			inset: 0;
			background: rgba(0, 0, 0, 0.5);
			z-index: 95;
			border: none;
			cursor: pointer;
		}
	}
</style>

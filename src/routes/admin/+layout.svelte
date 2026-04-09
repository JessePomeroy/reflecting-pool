<script lang="ts">
import { setAdminConfig } from "@jessepomeroy/admin";
import { setupConvex } from "convex-svelte";
import type { Snippet } from "svelte";
import { page } from "$app/stores";
import { PUBLIC_CONVEX_URL } from "$env/static/public";
import { adminConfig } from "$lib/config/admin";

setupConvex(PUBLIC_CONVEX_URL);
setAdminConfig(adminConfig);

interface Props {
	data: any;
	children: Snippet;
}

let { data, children }: Props = $props();

let sidebarOpen = $state(false);

const navItems: { href: string; label: string; separator?: boolean }[] = [
	{ href: "/admin", label: "dashboard" },
	{ href: "/admin/inquiries", label: "inquiries" },
	{ href: "/admin/orders", label: "orders" },
	{ href: "/admin/galleries", label: "galleries" },
	{ href: "/admin/crm", label: "clients", separator: true },
	{ href: "/admin/board", label: "board" },
	{ href: "/admin/quotes", label: "quotes" },
	{ href: "/admin/contracts", label: "contracts" },
	{ href: "/admin/invoicing", label: "invoicing" },
	{ href: "/admin/emails", label: "emails", separator: true },
	{ href: "/admin/messages", label: "messages" },
];

function isActive(href: string, currentPath: string): boolean {
	if (href === "/admin") return currentPath === "/admin";
	return currentPath.startsWith(href);
}
</script>

<svelte:head>
	<title>Admin · Reflecting Pool</title>
</svelte:head>

<div class="admin-layout" data-admin>
	<!-- Mobile Header -->
	<header class="mobile-header">
		<button class="menu-toggle" onclick={() => (sidebarOpen = !sidebarOpen)} aria-label="Toggle menu">
			{#if sidebarOpen}
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
			{:else}
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
			{/if}
		</button>
		<span class="brand">{adminConfig.siteName}</span>
	</header>

	<!-- Sidebar -->
	<aside class="sidebar" class:open={sidebarOpen}>
		<div class="sidebar-header">
			<h1 class="brand">{adminConfig.siteName}</h1>
			<span class="badge">Admin</span>
		</div>

		<nav class="nav">
			{#each navItems as item (item.href)}
				{#if item.separator}
					<div class="nav-separator"></div>
				{/if}
				<a
					href={item.href}
					class="nav-item"
					class:active={isActive(item.href, $page.url.pathname)}
					onclick={() => (sidebarOpen = false)}
				>
					<span class="nav-label">{item.label}</span>
				</a>
			{/each}
		</nav>

		<div class="sidebar-footer">
			<a href="/" class="back-link">← back to site</a>
			<form method="POST" action="/admin/logout" class="logout-form">
				<input type="hidden" name="redirectTo" value="/admin/login" />
				<button type="submit" class="logout-btn">sign out</button>
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
	.admin-layout {
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
		font-size: 1.1rem;
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
		overflow-y: auto;
	}

	.nav-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.625rem 1.5rem;
		color: var(--admin-text-muted);
		text-decoration: none;
		border-left: 2px solid transparent;
		transition: color 0.15s, background 0.15s, border-color 0.15s;
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
		opacity: 0.85;
	}

	.nav-label {
		font-size: 0.875rem;
	}

	.nav-separator {
		height: 1px;
		background: var(--admin-border);
		margin: 6px 1.5rem;
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
		transition: color 0.15s, border-color 0.15s;
	}

	.logout-btn:hover {
		color: var(--admin-heading);
	}

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
	}

	.overlay {
		display: none;
	}

	.content {
		flex: 1;
		margin-left: 240px;
		padding: 2rem 2.5rem;
		min-height: 100vh;
		max-width: calc(100vw - 240px);
		overflow-x: hidden;
	}

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
			max-width: 100vw;
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

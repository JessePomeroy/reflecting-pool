<script lang="ts">
import type { Snippet } from "svelte";
import { page } from "$app/stores";

interface Props {
	children: Snippet;
}

let { children }: Props = $props();

let sidebarOpen = $state(false);

const navItems = [
	{ href: "/admin", label: "Dashboard", icon: "📊" },
	{ href: "/admin/orders", label: "Orders", icon: "📦" },
	{ href: "/admin/inquiries", label: "Inquiries", icon: "📬" },
	{ href: "/admin/galleries", label: "Galleries", icon: "🖼️" },
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
			<span class="menu-icon">{sidebarOpen ? "✕" : "☰"}</span>
		</button>
		<span class="brand">Reflecting Pool Admin</span>
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
					<span class="nav-icon">{item.icon}</span>
					<span class="nav-label">{item.label}</span>
				</a>
			{/each}
		</nav>

		<div class="sidebar-footer">
			<a href="/" class="back-link">← Back to Site</a>
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
		background: #111827;
		color: #e5e7eb;
		font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
	}

	/* Sidebar */
	.sidebar {
		width: 260px;
		background: #1f2937;
		border-right: 1px solid #374151;
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
		padding: 1.5rem;
		border-bottom: 1px solid #374151;
	}

	.brand {
		font-size: 1.25rem;
		font-weight: 600;
		color: #f9fafb;
	}

	.badge {
		display: inline-block;
		font-size: 0.75rem;
		padding: 0.125rem 0.5rem;
		background: #374151;
		border-radius: 9999px;
		color: #9ca3af;
		margin-left: 0.5rem;
	}

	.nav {
		flex: 1;
		padding: 1rem 0;
	}

	.nav-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1.5rem;
		color: #9ca3af;
		text-decoration: none;
		transition: all 0.15s ease;
	}

	.nav-item:hover {
		background: #374151;
		color: #f9fafb;
	}

	.nav-item.active {
		background: #374151;
		color: #f9fafb;
		border-right: 3px solid #10b981;
	}

	.nav-icon {
		font-size: 1.25rem;
	}

	.nav-label {
		font-size: 0.9375rem;
		font-weight: 500;
	}

	.sidebar-footer {
		padding: 1.5rem;
		border-top: 1px solid #374151;
	}

	.back-link {
		color: #9ca3af;
		text-decoration: none;
		font-size: 0.875rem;
	}

	.back-link:hover {
		color: #f9fafb;
	}

	/* Mobile Header */
	.mobile-header {
		display: none;
	}

	.menu-toggle {
		background: transparent;
		border: none;
		color: #f9fafb;
		font-size: 1.5rem;
		cursor: pointer;
		padding: 0.5rem;
	}

	.menu-icon {
		display: block;
	}

	/* Overlay for mobile */
	.overlay {
		display: none;
	}

	/* Content */
	.content {
		flex: 1;
		margin-left: 260px;
		padding: 2rem;
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
			height: 56px;
			background: #1f2937;
			border-bottom: 1px solid #374151;
			padding: 0 1rem;
			z-index: 90;
		}

		.content {
			margin-left: 0;
			padding-top: 4rem;
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
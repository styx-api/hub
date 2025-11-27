<!-- Footer.svelte -->
<script lang="ts">
	import type { CatalogIndex } from '$lib/services/catalog';
	import { URLS } from '$lib/constants/urls';

	interface Props {
		index?: CatalogIndex | null;
	}

	let { index = null }: Props = $props();

	type FooterLink = { label: string; href: string | null };

	const links: Record<string, FooterLink[]> = {
		gettingStarted: [
			{ label: 'Documentation', href: URLS.docs },
			{ label: 'GitHub Repository', href: URLS.github },
			{ label: 'Contributing Guide', href: URLS.contributing }
		],
		install: [
			{ label: 'Python (PyPI)', href: URLS.pypi },
			{ label: 'TypeScript (npm)', href: URLS.npm },
			{ label: 'R (coming soon)', href: null }
		],
		community: [
			{ label: 'Discord', href: URLS.discord },
			{ label: 'Research Paper', href: URLS.paper },
			{ label: 'Boutiques', href: URLS.boutiques }
		]
	};
</script>

{#snippet linkList(items: FooterLink[])}
	<div class="space-y-1 text-xs">
		{#each items as { label, href }}
			{#if href}
				<a {href} class="block text-muted-foreground transition-colors hover:text-foreground">
					{label}
				</a>
			{:else}
				<span class="block text-muted-foreground/60">{label}</span>
			{/if}
		{/each}
	</div>
{/snippet}

<footer class="mt-8 border-t pt-6">
	<div class="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
		<div class="space-y-2">
			<h4 class="text-sm font-semibold">Getting Started</h4>
			{@render linkList(links.gettingStarted)}
		</div>

		<div class="space-y-2">
			<h4 class="text-sm font-semibold">Install</h4>
			{@render linkList(links.install)}
		</div>

		<div class="space-y-2 sm:col-span-2 lg:col-span-1">
			<h4 class="text-sm font-semibold">Community</h4>
			{@render linkList(links.community)}
		</div>
	</div>

	<div class="mt-6 border-t pt-4">
		<div
			class="flex flex-col items-center justify-between gap-2 text-xs text-muted-foreground sm:flex-row"
		>
			<p>
				© 2025 NiWrap Hub.{#if index?.project.docs?.description}{' '}{index.project.docs
						.description}{/if}
			</p>
			{#if index}
				<p>NiWrap v{index.project.version}</p>
			{/if}
		</div>
	</div>
</footer>

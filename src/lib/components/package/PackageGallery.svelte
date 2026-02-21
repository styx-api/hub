<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { LoaderCircle, CircleAlert, RefreshCw, Terminal } from '@lucide/svelte/icons';
	import { catalog, type PackageInfo } from '$lib/services/catalog';
	import PackageIcon from './PackageIcon.svelte';

	interface Props {
		onPackageSelected?: (packageInfo: PackageInfo) => void;
	}
	let { onPackageSelected }: Props = $props();

	let packages: PackageInfo[] = $state([]);
	let error: string | null = $state(null);

	async function loadPackages() {
		try {
			error = null;
			const idx = await catalog.load();
			packages = [...idx.packages.values()];
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load packages';
		}
	}

	// Load on mount
	loadPackages();
</script>

{#if catalog.loading}
	<div class="flex items-center justify-center py-12">
		<div class="flex items-center space-x-3">
			<LoaderCircle class="h-6 w-6 animate-spin text-primary" />
			<span class="text-sm text-muted-foreground">Loading packages...</span>
		</div>
	</div>
{:else if error}
	<div class="py-8">
		<Alert variant="destructive">
			<CircleAlert class="h-4 w-4" />
			<AlertDescription class="flex items-center justify-between">
				<span>{error}</span>
				<button
					onclick={loadPackages}
					class="ml-4 inline-flex shrink-0 items-center gap-1 rounded border bg-background px-3 py-1 text-xs transition-colors hover:bg-muted"
				>
					<RefreshCw class="h-3 w-3" />
					Retry
				</button>
			</AlertDescription>
		</Alert>
	</div>
{:else}
	<div class="grid items-start gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
		{#each packages as pkg (pkg.package.name)}
			<button
				onclick={() => onPackageSelected?.(pkg)}
				class="group w-full cursor-pointer rounded-lg border border-border bg-card p-5 text-left transition-colors duration-200 hover:border-primary/40 hover:shadow-md focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:outline-none"
			>
				<div class="mb-3 flex items-center gap-3">
					<PackageIcon package={pkg} size="sm" class="shrink-0" />
					<h3
						class="line-clamp-2 flex min-h-10 min-w-0 flex-1 items-center text-sm leading-5 font-semibold transition-colors duration-200 group-hover:text-primary"
					>
						{pkg.package.docs?.title ?? pkg.package.name}
					</h3>
				</div>

				<div class="mb-4 flex min-h-8 items-center">
					{#if pkg.package.docs?.affiliation?.length}
						<p class="line-clamp-2 text-xs text-muted-foreground">
							{pkg.package.docs.affiliation.join(', ')}
						</p>
					{:else if pkg.package.docs?.authors?.length}
						<p class="line-clamp-2 text-xs text-muted-foreground">
							{pkg.package.docs.authors.join(', ')}
						</p>
					{/if}
				</div>

				<div class="flex items-center justify-between border-t border-border pt-3">
					<div class="flex items-center gap-1.5">
						<Terminal class="h-3 w-3 text-muted-foreground" />
						<span class="text-xs text-muted-foreground">
							{pkg.version.apps?.length ?? 0} app{(pkg.version.apps?.length ?? 0) !== 1 ? 's' : ''}
						</span>
					</div>
					<Badge variant="outline" class="h-5 px-2 text-xs font-medium">
						v{pkg.version.name}
					</Badge>
				</div>
			</button>
		{/each}
	</div>
{/if}

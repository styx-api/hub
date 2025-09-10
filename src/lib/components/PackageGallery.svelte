<script lang="ts">
	import { onMount } from 'svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { LoaderCircle, CircleAlert, RefreshCw, Terminal } from '@lucide/svelte/icons';
	import { getPackages, type Package } from '$lib/services/packages.svelte';
	import PackageIcon from './PackageIcon.svelte';

	// Props
	interface Props {
		onPackageSelected?: (packageInfo: Package) => void;
	}
	let { onPackageSelected = () => {} }: Props = $props();

	// State
	let packages: Package[] = $state([]);
	let loading = $state(true);
	let error = $state('');
	let retryCount = $state(0);

	async function loadPackages() {
		try {
			loading = true;
			error = '';
			packages = (await getPackages()) ?? [];
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load packages';
		} finally {
			loading = false;
		}
	}

	onMount(loadPackages);

	function handleRetry() {
		retryCount = 0;
		loadPackages();
	}

	function selectPackage(pkg: Package) {
		onPackageSelected(pkg);
	}
</script>

{#if loading}
	<div class="flex items-center justify-center py-12">
		<div class="flex items-center space-x-3">
			<LoaderCircle class="h-6 w-6 animate-spin text-primary" />
			<div class="text-sm text-muted-foreground">
				Loading packages...
				{#if retryCount > 0}
					<span class="block text-xs">Retry attempt {retryCount}/3</span>
				{/if}
			</div>
		</div>
	</div>
{:else if error}
	<div class="py-8">
		<Alert variant="destructive">
			<CircleAlert class="h-4 w-4" />
			<AlertDescription class="flex items-center justify-between">
				<span>{error}</span>
				<button
					onclick={handleRetry}
					class="ml-4 inline-flex shrink-0 items-center gap-1 rounded border bg-background px-3 py-1 text-xs transition-colors hover:bg-muted"
				>
					<RefreshCw class="h-3 w-3" />
					Retry
				</button>
			</AlertDescription>
		</Alert>
	</div>
{:else}
	<div class="space-y-6">
		<!-- Package Grid -->
		<div
			class="grid items-start gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
		>
			{#each packages as pkg (pkg.name)}
				<button
					onclick={() => selectPackage(pkg)}
					class="group relative w-full cursor-pointer overflow-hidden rounded-lg border border-border/50 bg-card p-4 text-left transition-all duration-200 hover:scale-[1.02] hover:border-primary/30 hover:shadow-lg hover:shadow-black/5 focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:outline-none"
				>
					<!-- Package Icon and Badge -->
					<div class="mb-3 flex items-center justify-between">
						<PackageIcon package={pkg} class="group-hover:shadow-md" />

						<Badge
							variant="outline"
							class="h-5 bg-background/80 px-2 text-xs font-medium backdrop-blur-sm"
						>
							v{pkg.version}
						</Badge>
					</div>

					<!-- Package Info -->
					<div class="mb-4 space-y-2">
						<h3
							class="text-base font-semibold transition-colors duration-200 group-hover:text-primary"
						>
							{pkg.docs.title ?? pkg.name}
						</h3>
						<p class="text-xs font-medium text-muted-foreground">
							{pkg.docs.authors?.join(', ')}
						</p>
					</div>

					<!-- App Count -->
					<div class="flex items-center justify-between border-t border-border/50 pt-3">
						<div class="flex items-center gap-1.5">
							<Terminal class="h-3 w-3 text-primary/70" />
							<span class="text-xs font-medium text-muted-foreground">
								{pkg.appCount} app{pkg.appCount !== 1 ? 's' : ''}
							</span>
						</div>
						<div
							class="h-1.5 w-1.5 rounded-full bg-primary/20 transition-colors duration-200 group-hover:bg-primary/40"
						></div>
					</div>

					<!-- Subtle hover overlay -->
					<div
						class="absolute inset-0 rounded-lg bg-gradient-to-br from-primary/5 to-primary/10 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
					></div>
				</button>
			{/each}
		</div>
	</div>
{/if}

<style>
	.line-clamp-1 {
		display: -webkit-box;
		-webkit-line-clamp: 1;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>

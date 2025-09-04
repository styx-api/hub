<!-- src/lib/components/PackageBrowser.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Loader2, AlertCircle, RefreshCw, Terminal } from '@lucide/svelte/icons';
	import { getPackages, type Package } from '$lib/services/packages.svelte';

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
			packages = await getPackages() ?? [];
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

	// icon/logo placeholder
	function getPackageIcon(packageName: string) {
		// replace with logos?
		return packageName.charAt(0).toUpperCase();
	}

	function getPackageColorClass(packageName: string) {
		const colors = [
			'from-blue-500 to-blue-600',
			'from-green-500 to-green-600', 
			'from-purple-500 to-purple-600',
			'from-orange-500 to-orange-600',
			'from-pink-500 to-pink-600',
			'from-cyan-500 to-cyan-600',
			'from-indigo-500 to-indigo-600',
			'from-teal-500 to-teal-600',
			'from-red-500 to-red-600',
			'from-amber-500 to-amber-600'
		];
		
		// Use package name hash to consistently assign colors
		let hash = 0;
		for (let i = 0; i < packageName.length; i++) {
			hash = packageName.charCodeAt(i) + ((hash << 5) - hash);
		}
		return colors[Math.abs(hash) % colors.length];
	}
</script>

{#if loading}
	<div class="flex items-center justify-center py-12">
		<div class="flex items-center space-x-3">
			<Loader2 class="h-6 w-6 animate-spin text-primary" />
			<div class="text-sm text-muted-foreground">
				Loading packages...
				{#if retryCount > 0}
					<span class="text-xs block">Retry attempt {retryCount}/3</span>
				{/if}
			</div>
		</div>
	</div>
{:else if error}
	<div class="py-8">
		<Alert variant="destructive">
			<AlertCircle class="h-4 w-4" />
			<AlertDescription class="flex items-center justify-between">
				<span>{error}</span>
				<button onclick={handleRetry} class="ml-4 shrink-0 inline-flex items-center gap-1 px-3 py-1 text-xs bg-background border rounded hover:bg-muted transition-colors">
					<RefreshCw class="h-3 w-3" />
					Retry
				</button>
			</AlertDescription>
		</Alert>
	</div>
{:else}
	<div class="space-y-6">
		<!-- Package Grid -->
		<div class="grid gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 items-start">
			{#each packages as pkg (pkg.name)}
				<button
					onclick={() => selectPackage(pkg)}
					class="group relative overflow-hidden rounded-lg border border-border/50 bg-card p-4 text-left transition-all duration-200 hover:shadow-lg hover:shadow-black/5 hover:scale-[1.02] hover:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer w-full"
				>
					<!-- Package Icon and Badge -->
					<div class="mb-3 flex items-center justify-between">
						<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br shadow-sm ring-1 ring-black/5 dark:ring-white/10 {getPackageColorClass(pkg.name)}">
							<span class="text-lg font-bold text-white drop-shadow-sm">
								{getPackageIcon(pkg.name)}
							</span>
						</div>
						<Badge variant="outline" class="h-5 px-2 text-xs font-medium bg-background/80 backdrop-blur-sm">
							v{pkg.version}
						</Badge>
					</div>

					<!-- Package Info -->
					<div class="space-y-2 mb-4">
						<h3 class="text-base font-semibold group-hover:text-primary transition-colors duration-200">
							{pkg.docs.title ?? pkg.name}
						</h3>
						<p class="text-xs text-muted-foreground font-medium">
							{pkg.docs.authors?.join(", ")}
						</p>
					</div>

					<!-- App Count -->
					<div class="pt-3 border-t border-border/50 flex items-center justify-between">
						<div class="flex items-center gap-1.5">
							<Terminal class="h-3 w-3 text-primary/70" />
							<span class="text-xs font-medium text-muted-foreground">
								{pkg.appCount} app{pkg.appCount !== 1 ? 's' : ''}
							</span>
						</div>
						<div class="h-1.5 w-1.5 rounded-full bg-primary/20 group-hover:bg-primary/40 transition-colors duration-200"></div>
					</div>

					<!-- Subtle hover overlay -->
					<div class="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10 opacity-0 transition-opacity duration-200 group-hover:opacity-100 rounded-lg"></div>
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
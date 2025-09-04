<!-- src/routes/+page.svelte -->
<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import { Sun, Moon, Menu, Loader2 } from '@lucide/svelte';
	import QuickSelector from '$lib/components/QuickSelector.svelte';
	import PackageInfoPage from '$lib/components/PackageInfoPage.svelte';
	import PackageBrowser from '$lib/components/PackageBrowser.svelte';
	import Contents from '$lib/components/Contents.svelte';
	import { resolve } from '$app/paths';

	import { loadData, isLoading, getProject, type Package, type App } from '$lib/services/packages.svelte';
	import { onMount } from 'svelte';

	// State
	let isDark = $state(false);
	let selectedPackage: Package | null = $state(null);
	let selectedApp: App | null = $state(null);
	let showMobileSelector = $state(false);
	let niwrapVersion: string | null = $state(null);

	onMount(() => {
		loadData();
		getProject().then((p) => niwrapVersion = p?.version ?? null)
	});

	function toggleTheme() {
		isDark = !isDark;
		document.documentElement.classList.toggle('dark');
	}

	function clearSelection() {
		selectedPackage = null;
		selectedApp = null;
		showMobileSelector = false;
		console.log('Selection cleared');
	}

	function toggleMobileSelector() {
		showMobileSelector = !showMobileSelector;
	}

	function handlePackageSelected(pkg: Package) {
		selectedPackage = pkg;
		console.log('Package selected:', pkg.name);
	}

	function handleAppSelected(app: App) {
		selectedApp = app;
		showMobileSelector = false;
		console.log('App selected:', app.name);
	}

	// Listen to changes
	$effect(() => {
		if (selectedPackage) {
			console.log('Package changed:', selectedPackage.name);
		}
	});

	$effect(() => {
		if (selectedApp) {
			console.log('App changed:', selectedApp.name);
		}
	});
</script>

<svelte:head>
	<title>NiWrap Hub</title>
	<meta name="description" content="Your central hub for neuroimaging CLI apps" />
</svelte:head>

<div class="container mx-auto max-w-7xl px-4 py-3 lg:px-6">
	<!-- Header -->
	<header class="mb-4">
		<!-- Desktop Layout -->
		<div class="hidden md:flex md:items-center md:gap-6">
			<!-- Logo and Title -->
			<button
				onclick={clearSelection}
				class="group flex shrink-0 cursor-pointer items-center space-x-3 transition-all hover:opacity-80"
			>
				<div
					class="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-200 bg-gradient-to-br from-amber-100 to-orange-100 shadow-md transition-shadow group-hover:shadow-lg"
				>
					<img src={resolve('/logo.svg')} alt="NiWrap" class="h-6 w-6" />
				</div>
				<h1 class="text-xl font-bold tracking-tight lg:text-2xl">NiWrap Hub</h1>
			</button>

			<!-- Selector -->
			<div class="max-w-2xl flex-1">
				<QuickSelector bind:package={selectedPackage} bind:app={selectedApp} compact={false} />
			</div>

			<!-- Theme Toggle -->
			<Button variant="outline" size="sm" onclick={toggleTheme} class="shrink-0">
				{#if isDark}
					<Sun class="h-4 w-4" />
				{:else}
					<Moon class="h-4 w-4" />
				{/if}
			</Button>
		</div>

		<!-- Mobile Layout -->
		<div class="space-y-3 md:hidden">
			<!-- Top row -->
			<div class="flex items-center justify-between">
				<button
					onclick={clearSelection}
					class="group flex cursor-pointer items-center space-x-3 transition-all hover:opacity-80"
				>
					<div
						class="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-200 bg-gradient-to-br from-amber-100 to-orange-100 shadow-sm transition-shadow group-hover:shadow-md"
					>
						<img src={resolve('/logo.svg')} alt="NiWrap" class="h-5 w-5" />
					</div>
					<h1 class="text-lg font-bold tracking-tight">NiWrap Hub</h1>
				</button>

				<div class="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onclick={toggleMobileSelector}
						aria-label="Toggle app selector"
					>
						<Menu class="h-4 w-4" />
					</Button>
					<Button variant="outline" size="sm" onclick={toggleTheme}>
						{#if isDark}
							<Sun class="h-4 w-4" />
						{:else}
							<Moon class="h-4 w-4" />
						{/if}
					</Button>
				</div>
			</div>

			<!-- Mobile selector or summary -->
			{#if showMobileSelector}
				<div class="rounded-lg border bg-card p-3">
					<div class="mb-3 flex items-center justify-between">
						<h3 class="text-sm font-medium">Select App</h3>
						<Button variant="ghost" size="sm" onclick={toggleMobileSelector}>×</Button>
					</div>
					<QuickSelector bind:package={selectedPackage} bind:app={selectedApp} compact={true} />
				</div>
			{:else}
				<div class="rounded-lg border bg-muted/30 p-3">
					{#if selectedPackage && selectedApp}
						<div class="flex items-center justify-between">
							<div class="min-w-0 flex-1">
								<p class="truncate text-sm font-medium">{selectedPackage.name}</p>
								<p class="truncate text-xs text-muted-foreground">{selectedApp.name}</p>
							</div>
							<Button variant="outline" size="sm" onclick={toggleMobileSelector}>Change</Button>
						</div>
					{:else if selectedPackage}
						<div class="flex items-center justify-between">
							<div class="min-w-0 flex-1">
								<p class="truncate text-sm font-medium">{selectedPackage.name}</p>
								<p class="text-xs text-muted-foreground">Select an app</p>
							</div>
							<Button variant="outline" size="sm" onclick={toggleMobileSelector}>Choose App</Button>
						</div>
					{:else}
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-medium">No app selected</p>
								<p class="text-xs text-muted-foreground">Tap to choose</p>
							</div>
							<Button variant="outline" size="sm" onclick={toggleMobileSelector}>Select</Button>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</header>

	<Separator class="hidden md:block" />

	<!-- Main content -->
	{#if isLoading()}
		<div class="flex items-center justify-center py-6">
			<div class="flex items-center space-x-3">
				<Loader2 class="h-5 w-5 animate-spin text-primary" />
				<div class="text-sm text-muted-foreground">Loading packages...</div>
			</div>
		</div>
	{:else}
		<div class="mt-4 space-y-4">
			{#if selectedPackage && selectedApp}
				<div class="min-h-[400px] w-full">
					<Contents descriptorId={selectedApp.name} packageId={selectedPackage.name} />
				</div>
			{:else if selectedPackage}
				<div class="min-h-[400px] w-full">
					<PackageInfoPage package={selectedPackage} onAppSelected={handleAppSelected} />
				</div>
			{:else}
				<PackageBrowser onPackageSelected={handlePackageSelected} />
			{/if}
		</div>
	{/if}

	<!-- Footer -->
	<footer class="mt-8 border-t pt-6">
		<div class="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
			<div class="space-y-2">
				<h4 class="text-sm font-semibold">Getting Started</h4>
				<div class="space-y-1 text-xs">
					<a
						href="https://styx-api.github.io/styxbook/"
						class="block text-muted-foreground transition-colors hover:text-foreground"
						>Documentation</a
					>
					<a
						href="https://github.com/styx-api/niwrap"
						class="block text-muted-foreground transition-colors hover:text-foreground"
						>GitHub Repository</a
					>
					<a
						href="https://styx-api.github.io/styxbook/contributing.html"
						class="block text-muted-foreground transition-colors hover:text-foreground"
						>Contributing Guide</a
					>
				</div>
			</div>

			<div class="space-y-2">
				<h4 class="text-sm font-semibold">Install</h4>
				<div class="space-y-1 text-xs">
					<a
						href="https://pypi.org/project/niwrap/"
						class="block text-muted-foreground transition-colors hover:text-foreground"
						>Python (PyPI)</a
					>
					<a
						href="https://www.npmjs.com/package/niwrap"
						class="block text-muted-foreground transition-colors hover:text-foreground"
						>TypeScript (npm)</a
					>
					<span class="block text-muted-foreground/60">R (coming soon)</span>
				</div>
			</div>

			<div class="space-y-2 sm:col-span-2 lg:col-span-1">
				<h4 class="text-sm font-semibold">Community</h4>
				<div class="space-y-1 text-xs">
					<a
						href="https://discord.gg/QMKUVCFWsR"
						class="block text-muted-foreground transition-colors hover:text-foreground">Discord</a
					>
					<a
						href="https://doi.org/10.1101/2025.07.24.666435"
						class="block text-muted-foreground transition-colors hover:text-foreground"
						>Research Paper</a
					>
					<a
						href="https://boutiques.github.io/"
						class="block text-muted-foreground transition-colors hover:text-foreground">Boutiques</a
					>
				</div>
			</div>
		</div>
	</footer>
</div>

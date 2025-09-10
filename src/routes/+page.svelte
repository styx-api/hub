<!-- src/routes/+page.svelte -->
<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import { Sun, Moon, Menu, Loader2 } from '@lucide/svelte';
	import QuickSelector from '$lib/components/QuickSelector.svelte';
	import PackageInfoPage from '$lib/components/PackageInfoPage.svelte';
	import PackageBrowser from '$lib/components/PackageBrowser.svelte';
	import AppPage from '$lib/components/AppPage.svelte';
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';

	import {
		loadData,
		isLoading,
		getProject,
		getPackages,
		getApps,
		type Package,
		type App,
		type Project
	} from '$lib/services/packages.svelte';
	import { onMount } from 'svelte';
	import { niwrapVersion, preloadNiwrap } from '$lib/services/niwrapExecution';

	// State
	let isDark = $state(false);
	let selectedPackage: Package | null = $state(null);
	let selectedApp: App | null = $state(null);
	let showMobileSelector = $state(false);
	let project: Project | null = $state(null);
	let packages: Package[] = $state([]);

	let isInitializing: boolean = false;

	let pageTitle = $derived(() => {
		if (selectedApp && selectedPackage) {
			return `${selectedApp.name} - ${selectedPackage.docs.title ?? selectedPackage.name} | NiWrap Hub`;
		} else if (selectedPackage) {
			return `${selectedPackage.docs.title ?? selectedPackage.name} | NiWrap Hub`;
		} else {
			return 'NiWrap Hub';
		}
	});

	onMount(async () => {
		isInitializing = true;
		preloadNiwrap();
		await loadData();
		const packagesResult = await getPackages();
		packages = packagesResult || [];

		const projectResponse = await getProject();
		if (projectResponse) {
			project = projectResponse;

			const niwrapJsVersion = await niwrapVersion();
			if (niwrapJsVersion != projectResponse.version) {
				console.error('NiWrap data version does not match niwrap javascript module version.');
			}
		}

		// Initialize state from URL params
		await initializeFromUrl();
	});

	async function initializeFromUrl() {
		if (!browser || packages.length === 0) return;

		isInitializing = true;

		const urlParams = new URLSearchParams(window.location.search);
		const packageName = urlParams.get('package');
		const appId = urlParams.get('app');

		if (packageName) {
			const pkg = packages.find((p) => p.name === packageName);
			if (pkg) {
				selectedPackage = pkg;

				if (appId) {
					const apps = await getApps(packageName);
					const app = apps?.find((a) => a.id === appId);
					if (app) {
						selectedApp = app;
					}
				}
			}
		}

		// Small delay to ensure all reactive updates are processed
		await new Promise((resolve) => setTimeout(resolve, 0));
		isInitializing = false;
	}

	function updateUrl() {
		if (!browser) return;

		const params = new URLSearchParams();

		if (selectedPackage) {
			params.set('package', selectedPackage.name);

			if (selectedApp) {
				params.set('app', selectedApp.id);
			}
		}

		const basePath = resolve('/');
		const newUrl = params.toString() ? `${basePath}?${params.toString()}` : basePath;
		goto(newUrl, { replaceState: false, keepFocus: true });
	}

	function toggleTheme() {
		isDark = !isDark;
		document.documentElement.classList.toggle('dark');
	}

	function clearSelection() {
		selectedPackage = null;
		selectedApp = null;
		showMobileSelector = false;
		updateUrl();
		console.log('Selection cleared');
	}

	function toggleMobileSelector() {
		showMobileSelector = !showMobileSelector;
	}

	function handlePackageSelected(pkg: Package) {
		selectedPackage = pkg;
		selectedApp = null; // clear app selection when package changes
		updateUrl();
		console.log('Package selected:', pkg.name);
	}

	function handleAppSelected(app: App) {
		selectedApp = app;
		showMobileSelector = false;
		updateUrl();
		console.log('App selected:', app.name);
	}

	// effect for URL updates when user makes selections
	$effect(() => {
		if (browser && packages.length > 0) {
			selectedPackage;
			selectedApp;
			if (!isInitializing) {
				updateUrl();
			}
		}
	});

	// separate effect for handling browser navigation (back/forward)
	$effect(() => {
		if (browser && packages.length > 0) {
			const handlePopstate = async () => {
				// reset state
				selectedPackage = null;
				selectedApp = null;
				// re-initialize from new URL
				await initializeFromUrl();
			};
			window.addEventListener('popstate', handlePopstate);
			return () => window.removeEventListener('popstate', handlePopstate);
		}
	});

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
	<title>{pageTitle()}</title>
	<meta name="description" content="Your central hub for neuroimaging CLI apps" />
</svelte:head>

<!-- Full height layout container -->
<div class="flex h-screen flex-col">
	<!-- Header - fixed height -->
	<div class="container mx-auto max-w-7xl px-4 py-3 lg:px-6">
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

				<!-- Version and Theme Toggle -->
				<div class="flex shrink-0 items-center gap-3">
					{#if project}
						<div
							class="hidden items-center gap-1.5 rounded-md border border-muted bg-muted/30 px-2.5 py-1 sm:flex"
						>
							<div class="h-1.5 w-1.5 rounded-full bg-green-500"></div>
							<span class="text-xs font-medium text-muted-foreground">v{project.version}</span>
						</div>
					{/if}
					<Button variant="outline" size="sm" onclick={toggleTheme}>
						{#if isDark}
							<Sun class="h-4 w-4" />
						{:else}
							<Moon class="h-4 w-4" />
						{/if}
					</Button>
				</div>
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
						{#if project}
							<div
								class="flex items-center gap-1.5 rounded-md border border-muted bg-muted/30 px-2 py-1"
							>
								<div class="h-1.5 w-1.5 rounded-full bg-green-500"></div>
								<span class="text-xs font-medium text-muted-foreground">v{project.version}</span>
							</div>
						{/if}
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
	</div>

	<!-- Main content - takes remaining height -->
	<div class="flex-1 overflow-hidden">
		{#if isLoading()}
			<div class="flex h-full items-center justify-center">
				<div class="flex items-center space-x-3">
					<Loader2 class="h-5 w-5 animate-spin text-primary" />
					<div class="text-sm text-muted-foreground">Loading packages...</div>
				</div>
			</div>
		{:else}
			<div class="h-full">
				{#if selectedPackage && selectedApp}
					<AppPage descriptorId={selectedApp.id} packageName={selectedPackage.name} />
				{:else if selectedPackage}
					<div class="container mx-auto h-full max-w-7xl overflow-y-auto px-4 lg:px-6">
						<div class="py-4">
							<PackageInfoPage package={selectedPackage} onAppSelected={handleAppSelected} />
						</div>
					</div>
				{:else}
					<div class="container mx-auto h-full max-w-7xl overflow-y-auto px-4 lg:px-6">
						<div class="py-4">
							<PackageBrowser onPackageSelected={handlePackageSelected} />
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Footer - only show when not in app mode -->
	{#if !selectedApp}
		<div class="container mx-auto max-w-7xl px-4 lg:px-6">
			<footer class="border-t py-6">
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

				<!-- Version info at bottom of footer -->
				<div class="mt-6 border-t pt-4">
					<div
						class="flex flex-col items-center justify-between gap-2 text-xs text-muted-foreground sm:flex-row"
					>
						<p>
							© 2025 NiWrap Hub.{#if project?.docs.description}{' ' + project.docs.description}{/if}
						</p>
						{#if project}
							<p>NiWrap v{project.version}</p>
						{/if}
					</div>
				</div>
			</footer>
		</div>
	{/if}
</div>
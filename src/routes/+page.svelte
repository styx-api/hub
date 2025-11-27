<script lang="ts">
	import { browser } from '$app/environment';
	import { Separator } from '$lib/components/ui/separator';
	import { LoaderCircle } from '@lucide/svelte';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import PackageDetails from '$lib/components/PackageDetails.svelte';
	import PackageGallery from '$lib/components/PackageGallery.svelte';
	import AppPage from '$lib/components/app-page/AppPage.svelte';
	import { catalog, type PackageInfo } from '$lib/services/packages.svelte';
	import { theme } from '$lib/services/theme.svelte';
	import { niwrapVersion, preloadNiwrap } from '$lib/services/niwrapExecution';
	import {
		parseUrlState,
		parseConfigFromUrl,
		updateUrl,
		clearConfigFromUrl
	} from '$lib/services/urlState';

	// UI state
	let showMobileSelector = $state(false);
	let isInitializing = $state(true);

	// Selection state
	let selectedPackage: PackageInfo | null = $state(null);
	let selectedApp: string | null = $state(null);
	let initialConfig: object | null = $state(null);

	// Derived
	const pageTitle = $derived(
		selectedApp && selectedPackage
			? `${selectedApp} - ${selectedPackage.package.docs?.title ?? selectedPackage.package.name} | NiWrap Hub`
			: selectedPackage
				? `${selectedPackage.package.docs?.title ?? selectedPackage.package.name} | NiWrap Hub`
				: 'NiWrap Hub'
	);

	// Initialize
	if (browser) {
		initialize();
	}

	async function initialize() {
		isInitializing = true;

		preloadNiwrap();
		const idx = await catalog.load();

		// Version check
		const jsVersion = await niwrapVersion();
		if (jsVersion !== idx.project.version) {
			console.error('NiWrap data version does not match niwrap javascript module version.');
		}

		await loadSelectionFromUrl(idx.packages);
		isInitializing = false;
	}

	async function loadSelectionFromUrl(packages: Map<string, PackageInfo>) {
		const { packageName, appName } = parseUrlState();

		// Load config
		initialConfig = await parseConfigFromUrl();
		if (initialConfig) {
			clearConfigFromUrl();
		}

		// Load selection
		if (packageName) {
			const pkg = packages.get(packageName);
			if (pkg) {
				selectedPackage = pkg;
				if (appName && pkg.version.apps?.includes(appName)) {
					selectedApp = appName;
				}
			}
		}
	}

	// Update URL when selection changes
	$effect(() => {
		selectedPackage;
		selectedApp;

		if (browser && catalog.index && !isInitializing) {
			updateUrl(
				selectedPackage?.package.name ?? null,
				selectedApp
			);
		}
	});

	// Handle browser back/forward
	$effect(() => {
		if (!browser || !catalog.index) return;

		const handlePopstate = async () => {
			selectedPackage = null;
			selectedApp = null;
			initialConfig = null;
			await loadSelectionFromUrl(catalog.index!.packages);
		};

		window.addEventListener('popstate', handlePopstate);
		return () => window.removeEventListener('popstate', handlePopstate);
	});

	// Actions
	function clearSelection() {
		selectedPackage = null;
		selectedApp = null;
		showMobileSelector = false;
		initialConfig = null;
	}

	function handlePackageSelected(pkg: PackageInfo) {
		selectedPackage = pkg;
		selectedApp = null;
		initialConfig = null;
	}

	function handleAppSelected(app: string) {
		selectedApp = app;
		showMobileSelector = false;
	}
</script>

<svelte:head>
	<title>{pageTitle}</title>
	<meta name="description" content="Your central hub for neuroimaging CLI apps" />
</svelte:head>

{#snippet loadingSpinner()}
	<div class="flex items-center justify-center py-6">
		<LoaderCircle class="h-5 w-5 animate-spin text-primary" />
		<span class="ml-3 text-sm text-muted-foreground">Loading packages...</span>
	</div>
{/snippet}

{#snippet headerSection()}
	<Header
		bind:selectedPackage
		bind:selectedApp
		index={catalog.index}
		isDark={theme.isDark}
		{showMobileSelector}
		onClearSelection={clearSelection}
		onToggleTheme={() => theme.toggle()}
		onToggleMobileSelector={() => (showMobileSelector = !showMobileSelector)}
	/>
	<Separator class="hidden md:block" />
{/snippet}

{#if selectedPackage && selectedApp}
	<div class="flex h-screen flex-col">
		<div class="container mx-auto max-w-7xl px-4 py-3 lg:px-6">
			{@render headerSection()}
		</div>

		<div class="flex-1 overflow-hidden">
			{#if catalog.loading || isInitializing}
				<div class="flex h-full items-center justify-center">
					{@render loadingSpinner()}
				</div>
			{:else}
				<AppPage package={selectedPackage} app={selectedApp} {initialConfig} />
			{/if}
		</div>
	</div>
{:else}
	<div class="container mx-auto max-w-7xl px-4 py-3 lg:px-6">
		{@render headerSection()}

		<div class="mt-4 space-y-4">
			{#if catalog.loading || isInitializing}
				{@render loadingSpinner()}
			{:else if selectedPackage}
				<div class="min-h-[400px] w-full">
					<PackageDetails package={selectedPackage} onAppSelected={handleAppSelected} />
				</div>
			{:else}
				<PackageGallery onPackageSelected={handlePackageSelected} />
			{/if}
		</div>

		<Footer index={catalog.index} />
	</div>
{/if}
<!-- src/routes/+page.svelte -->
<script lang="ts">
	import { Separator } from '$lib/components/ui/separator';
	import { LoaderCircle } from '@lucide/svelte';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import PackageDetails from '$lib/components/PackageDetails.svelte';
	import PackageGallery from '$lib/components/PackageGallery.svelte';
	import AppPage from '$lib/components/AppPage.svelte';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';

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
	}

	function toggleMobileSelector() {
		showMobileSelector = !showMobileSelector;
	}

	function handlePackageSelected(pkg: Package) {
		selectedPackage = pkg;
		selectedApp = null;
	}

	function handleAppSelected(app: App) {
		selectedApp = app;
		showMobileSelector = false;
	}

	$effect(() => {
		// Read the actual values to make this effect reactive to changes
		const currentPackage = selectedPackage;
		const currentApp = selectedApp;

		if (browser && packages.length > 0 && !isInitializing) {
			updateUrl();
		}
	});

	$effect(() => {
		if (browser && packages.length > 0) {
			const handlePopstate = async () => {
				selectedPackage = null;
				selectedApp = null;
				await initializeFromUrl();
			};
			window.addEventListener('popstate', handlePopstate);
			return () => window.removeEventListener('popstate', handlePopstate);
		}
	});
</script>

<svelte:head>
	<title>{pageTitle()}</title>
	<meta name="description" content="Your central hub for neuroimaging CLI apps" />
</svelte:head>

{#if selectedPackage && selectedApp}
	<!-- App Mode: Full height layout -->
	<div class="flex h-screen flex-col">
		<div class="container mx-auto max-w-7xl px-4 py-3 lg:px-6">
			<Header
				bind:selectedPackage
				bind:selectedApp
				{project}
				{isDark}
				{showMobileSelector}
				onClearSelection={clearSelection}
				onToggleTheme={toggleTheme}
				onToggleMobileSelector={toggleMobileSelector}
			/>
			<Separator class="hidden md:block" />
		</div>

		<div class="flex-1 overflow-hidden">
			{#if isLoading()}
				<div class="flex h-full items-center justify-center">
					<div class="flex items-center space-x-3">
						<LoaderCircle class="h-5 w-5 animate-spin text-primary" />
						<div class="text-sm text-muted-foreground">Loading packages...</div>
					</div>
				</div>
			{:else}
				<AppPage selectedPackage={selectedPackage} selectedApp={selectedApp} />
			{/if}
		</div>
	</div>
{:else}
	<!-- Browsing Mode: Normal page flow -->
	<div class="container mx-auto max-w-7xl px-4 py-3 lg:px-6">
		<Header
			bind:selectedPackage
			bind:selectedApp
			{project}
			{isDark}
			{showMobileSelector}
			onClearSelection={clearSelection}
			onToggleTheme={toggleTheme}
			onToggleMobileSelector={toggleMobileSelector}
		/>
		<Separator class="hidden md:block" />

		<div class="mt-4 space-y-4">
			{#if isLoading()}
				<div class="flex items-center justify-center py-6">
					<div class="flex items-center space-x-3">
						<LoaderCircle class="h-5 w-5 animate-spin text-primary" />
						<div class="text-sm text-muted-foreground">Loading packages...</div>
					</div>
				</div>
			{:else if selectedPackage}
				<div class="min-h-[400px] w-full">
					<PackageDetails package={selectedPackage} onAppSelected={handleAppSelected} />
				</div>
			{:else}
				<PackageGallery onPackageSelected={handlePackageSelected} />
			{/if}
		</div>

		<Footer {project} />
	</div>
{/if}

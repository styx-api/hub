<!-- src/routes/+page.svelte -->
<script lang="ts">
	import { Separator } from '$lib/components/ui/separator';
	import { LoaderCircle } from '@lucide/svelte';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import PackageDetails from '$lib/components/PackageDetails.svelte';
	import PackageGallery from '$lib/components/PackageGallery.svelte';
	import AppPage from '$lib/components/app-page/AppPage.svelte';
	import { goto, replaceState } from '$app/navigation';
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
	let isInitializing: boolean = $state(false);
	let initialConfig: object | null = $state(null);

	let pageTitle = $derived(() => {
		if (selectedApp && selectedPackage) {
			return `${selectedApp.name} - ${selectedPackage.package.docs?.title ?? selectedPackage.package.name} | NiWrap Hub`;
		} else if (selectedPackage) {
			return `${selectedPackage.package.docs?.title ?? selectedPackage.package.name} | NiWrap Hub`;
		} else {
			return 'NiWrap Hub';
		}
	});

	async function decompressString(str: string): Promise<string> {
		const data = Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
		const stream = new ReadableStream({
			start(controller) {
				controller.enqueue(data);
				controller.close();
			}
		}).pipeThrough(new DecompressionStream('gzip'));

		const decompressed = await new Response(stream).arrayBuffer();
		return new TextDecoder().decode(decompressed);
	}

	async function loadConfigFromUrl(): Promise<object | null> {
		const params = new URLSearchParams(window.location.search);
		const configParam = params.get('config');
		const encoding = params.get('enc');

		if (!configParam) return null;

		try {
			let json: string;

			if (encoding === 'gz') {
				json = await decompressString(configParam);
			} else {
				json = atob(configParam);
			}

			return JSON.parse(json);
		} catch (err) {
			console.error('Failed to parse config from URL:', err);
			return null;
		}
	}

	function clearConfigFromUrl() {
		if (!browser) return;

		const params = new URLSearchParams(window.location.search);
		params.delete('config');
		params.delete('enc');

		const basePath = resolve('/');
		const newUrl = params.toString() ? `${basePath}?${params.toString()}` : basePath;

		// Use replaceState so this doesn't add a history entry
		replaceState(newUrl, {});
	}

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
			if (niwrapJsVersion != projectResponse.project.version) {
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
		const appName = urlParams.get('app');

		// Load config from URL
		initialConfig = await loadConfigFromUrl();

		// Clear config params from URL after loading (use replaceState, not adding to history)
		if (initialConfig) {
			clearConfigFromUrl();
		}

		if (packageName) {
			const pkg = packages.find((p) => p.package.name === packageName);
			if (pkg) {
				selectedPackage = pkg;

				if (appName) {
					const apps = await getApps(packageName);
					const app = apps?.find((a) => a.name === appName);
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
			params.set('package', selectedPackage.package.name);

			if (selectedApp) {
				params.set('app', selectedApp.name);
			}
		}

		const basePath = resolve('/');
		const newUrl = params.toString() ? `${basePath}?${params.toString()}` : basePath;

		// Check if URL actually needs to change
		const currentUrl = window.location.pathname + window.location.search;
		if (currentUrl !== newUrl) {
			goto(newUrl, { replaceState: false, keepFocus: true, noScroll: true });
		}
	}

	function toggleTheme() {
		isDark = !isDark;
		document.documentElement.classList.toggle('dark');
	}

	function clearSelection() {
		selectedPackage = null;
		selectedApp = null;
		showMobileSelector = false;
		initialConfig = null;
	}

	function toggleMobileSelector() {
		showMobileSelector = !showMobileSelector;
	}

	function handlePackageSelected(pkg: Package) {
		selectedPackage = pkg;
		selectedApp = null;
		initialConfig = null;
	}

	function handleAppSelected(app: App) {
		selectedApp = app;
		showMobileSelector = false;
	}

	let isUpdatingUrl = $state(false);

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
				initialConfig = null;
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
			{#if isLoading() || isInitializing}
				<div class="flex h-full items-center justify-center">
					<div class="flex items-center space-x-3">
						<LoaderCircle class="h-5 w-5 animate-spin text-primary" />
						<div class="text-sm text-muted-foreground">Loading packages...</div>
					</div>
				</div>
			{:else}
				<AppPage {selectedPackage} {selectedApp} {initialConfig} />
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

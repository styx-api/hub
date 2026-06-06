<script lang="ts">
	import { browser } from '$app/environment';
	import { LoaderCircle } from '@lucide/svelte';
	import { Header, Footer } from '$lib/components/layout';

	import { PackageDetails } from '$lib/components/package';
	import { PackageGallery } from '$lib/components/package';
	import AppPage from '$lib/components/app-page/AppPage.svelte';
	import { catalog, type PackageInfo } from '$lib/services/catalog';
	import { compilerStatus } from '$lib/services/compiler';
	import { theme } from '$lib/services/theme.svelte';
	import {
		parseUrlState,
		parseConfigFromUrl,
		updateUrl,
		clearConfigFromUrl
	} from '$lib/services/urlState';

	// UI state
	let isInitializing = $state(true);

	// Selection state
	let selectedPackage: PackageInfo | null = $state(null);
	let selectedApp: string | null = $state(null);
	let initialConfig: object | null = $state(null);

	// SEO / social metadata. The hub is prerendered (adapter-static) on `/` only,
	// so non-JS social scrapers always see the gallery defaults baked into the
	// static head; the per-selection values below update at runtime for JS
	// crawlers (Googlebot). The canonical/og:url point at the production home
	// (niwrap.dev/hub) regardless of which mirror served the page.
	const SITE_URL = 'https://niwrap.dev/hub';
	const OG_IMAGE = 'https://niwrap.dev/niwrap/og-image.png';
	const OG_IMAGE_ALT = 'NiWrap - type-safe neuroimaging tools for Python and TypeScript';

	// Derived
	function getPageTitle(pkg: PackageInfo | null, app: string | null): string {
		if (app && pkg) {
			return `${app} - ${pkg.package.docs?.title ?? pkg.package.name} | NiWrap Hub`;
		}
		if (pkg) {
			return `${pkg.package.docs?.title ?? pkg.package.name} | NiWrap Hub`;
		}
		return 'NiWrap Hub - neuroimaging CLI tools in Python & TypeScript';
	}

	function getPageDescription(pkg: PackageInfo | null, app: string | null): string {
		if (app && pkg) {
			const label = pkg.package.docs?.title ?? pkg.package.name;
			return `Configure and run ${app} (${label}) and generate the equivalent Python or TypeScript command with NiWrap - right in your browser.`;
		}
		if (pkg) {
			const label = pkg.package.docs?.title ?? pkg.package.name;
			return (
				pkg.package.docs?.description ??
				`Typed Python and TypeScript wrappers for ${label} - generate and run commands in your browser with NiWrap.`
			);
		}
		return 'Browse, configure, and run neuroimaging CLI tools (FSL, ANTs, FreeSurfer & more) as typed Python and TypeScript wrappers - right in your browser.';
	}

	function getCanonicalUrl(pkg: PackageInfo | null, app: string | null): string {
		if (!pkg) return `${SITE_URL}/`;
		const params = new URLSearchParams({ package: pkg.package.name });
		if (app) params.set('app', app);
		return `${SITE_URL}/?${params.toString()}`;
	}

	// Keep meta descriptions in the SERP-friendly range; upstream package docs can
	// run arbitrarily long.
	function clampDescription(text: string, max = 160): string {
		return text.length > max ? text.slice(0, max - 1).trimEnd() + '…' : text;
	}

	const pageTitle = $derived(getPageTitle(selectedPackage, selectedApp));
	const pageDescription = $derived(
		clampDescription(getPageDescription(selectedPackage, selectedApp))
	);
	const canonicalUrl = $derived(getCanonicalUrl(selectedPackage, selectedApp));

	// Compiler lockstep status (bundled vs. the compiler that built the release).
	const compiler = $derived(compilerStatus(catalog.compiler));

	// Initialize
	if (browser) {
		initialize();
	}

	async function initialize() {
		isInitializing = true;

		const idx = await catalog.load();
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
		void selectedPackage;
		void selectedApp;

		if (browser && catalog.index && !isInitializing) {
			updateUrl(selectedPackage?.package.name ?? null, selectedApp);
		}
	});

	// Handle browser back/forward
	$effect(() => {
		if (!browser || !catalog.index) return;
		const packages = catalog.index.packages;

		const handlePopstate = async () => {
			const { packageName, appName } = parseUrlState();

			// Set selection synchronously so the URL update effect is a no-op
			// (updateUrl has an idempotency guard: it skips goto when URL already matches)
			if (packageName) {
				const pkg = packages.get(packageName);
				if (pkg) {
					selectedPackage = pkg;
					selectedApp = appName && pkg.version.apps?.includes(appName) ? appName : null;
				} else {
					selectedPackage = null;
					selectedApp = null;
				}
			} else {
				selectedPackage = null;
				selectedApp = null;
			}

			// Then load config asynchronously (doesn't affect URL computation)
			initialConfig = await parseConfigFromUrl();
			if (initialConfig) clearConfigFromUrl();
		};

		window.addEventListener('popstate', handlePopstate);
		return () => window.removeEventListener('popstate', handlePopstate);
	});

	// Actions
	function clearSelection() {
		selectedPackage = null;
		selectedApp = null;
		initialConfig = null;
	}

	function handlePackageSelected(pkg: PackageInfo) {
		selectedPackage = pkg;
		selectedApp = null;
		initialConfig = null;
	}

	function handleAppSelected(app: string) {
		selectedApp = app;
		initialConfig = null;
	}
</script>

<svelte:head>
	<title>{pageTitle}</title>
	<meta name="description" content={pageDescription} />
	<link rel="canonical" href={canonicalUrl} />

	<!-- Open Graph -->
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="NiWrap Hub" />
	<meta property="og:locale" content="en_US" />
	<meta property="og:title" content={pageTitle} />
	<meta property="og:description" content={pageDescription} />
	<meta property="og:url" content={canonicalUrl} />
	<meta property="og:image" content={OG_IMAGE} />
	<meta property="og:image:type" content="image/png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content={OG_IMAGE_ALT} />

	<!-- Twitter / X card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={pageTitle} />
	<meta name="twitter:description" content={pageDescription} />
	<meta name="twitter:image" content={OG_IMAGE} />
	<meta name="twitter:image:alt" content={OG_IMAGE_ALT} />
</svelte:head>

{#snippet loadingSpinner()}
	<div class="flex items-center justify-center py-6">
		<LoaderCircle class="h-5 w-5 animate-spin text-primary" />
		<span class="ml-3 text-sm text-muted-foreground">Loading packages...</span>
	</div>
{/snippet}

{#snippet headerSection()}
	<Header
		{selectedPackage}
		{selectedApp}
		isDark={theme.isDark}
		onClearSelection={clearSelection}
		onToggleTheme={() => theme.toggle()}
		onPackageSelected={handlePackageSelected}
		onAppSelected={handleAppSelected}
	/>
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

		<Footer {compiler} />
	</div>
{/if}

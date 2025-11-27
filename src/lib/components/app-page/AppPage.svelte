<script lang="ts">
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import ConfigurationPanel from './ConfigurationPanel.svelte';
	import ResultsPanel from './ResultsPanel.svelte';
	import { Settings, Terminal as TerminalIcon, FileCode, ExternalLink } from '@lucide/svelte';
	import { niwrapDeathMessage, niwrapExecute } from '../../services/niwrapExecution';
	import { catalog, type PackageInfo } from '$lib/services/packages.svelte';
	import { getSchemaAtPath, getSchemaMetadata } from '$lib/services/schema/schemaUtils';
	import type { AppType } from '$lib/services/catalog';
	import { github, openExternal } from '$lib/utils/github';
	import { URLS } from '$lib/constants/urls';
	import { Button } from '$lib/components/ui/button';
	import { compressString } from '$lib/utils/compression';

	interface Props {
		package: PackageInfo;
		app: string;
		initialConfig?: object | null;
	}

	let { package: pkg, app, initialConfig = null }: Props = $props();

	// State
	let appData: AppType | null = $state(null);
	let inputSchema: object | null = $state(null);
	let outputSchema: object | null = $state(null);
	let config: object = $state({});
	let isLoading = $state(true);
	let error: string | null = $state(null);
	let mobileActiveTab = $state('config');
	let desktopResultsTab = $state('command');

	type ExecutionResult =
		| { success: true; cargs: string[]; outputObject: Record<string, unknown> }
		| { success: false; error: string };

	let executionResult = $state<ExecutionResult | null>(null);
	
	// Track which app the current execution belongs to
	let executedForApp = $state<string | null>(null);

	// Derived
	const hasDescriptor = $derived(appData?.source != null);

	const githubUrls = $derived({
		schemaInput: github.schemaInput(pkg.package.name, app),
		schemaOutput: github.schemaOutput(pkg.package.name, app),
		descriptor: github.app(pkg.package.name, pkg.version.name, app)
	});
	const commandArgs = $derived(
		!executionResult || executedForApp !== app
			? []
			: !executionResult.success
				? niwrapDeathMessage()
				: executionResult.cargs.length > 0
					? executionResult.cargs
					: ['# No command generated']
	);

	const outputFiles = $derived.by(() => {
		if (!executionResult?.success || executedForApp !== app) return [];

		const results: Array<{
			path: string;
			title: string;
			description: string;
			label: string;
		}> = [];

		function processValue(value: unknown, keyPath: (string | number)[]) {
			if (typeof value === 'string') {
				const fieldSchema = outputSchema && getSchemaAtPath(outputSchema, keyPath);
				const metadata = fieldSchema && getSchemaMetadata(fieldSchema);
				results.push({
					path: '/outputs/' + value,
					title: metadata?.title ?? 'Title',
					description: metadata?.description ?? 'Description',
					label: keyPath.join('.')
				});
			} else if (Array.isArray(value)) {
				value.forEach((item, idx) => processValue(item, [...keyPath, idx]));
			} else if (value && typeof value === 'object') {
				for (const [key, nested] of Object.entries(value)) {
					processValue(nested, [...keyPath, key]);
				}
			}
		}

		for (const [key, value] of Object.entries(executionResult.outputObject)) {
			processValue(value, [key]);
		}

		return results;
	});

	const niwrapError = $derived(
		executionResult && !executionResult.success && executedForApp === app
			? executionResult.error
			: null
	);

	const hasConfig = $derived(Object.keys(config).length > 0);

	// Reset execution state when app changes
	$effect(() => {
		// This effect runs when `app` changes
		const currentApp = app;
		
		// Clear stale execution results immediately
		if (executedForApp !== currentApp) {
			executionResult = null;
			executedForApp = null;
		}
	});

	// Fetch app data and schema when app changes
	$effect(() => {
		loadApp(pkg.package.name, pkg.version.name, app);
	});

	// Execute when config changes (after initial load)
	$effect(() => {
		const currentApp = app;
		const currentConfig = config;
		const currentHasDescriptor = hasDescriptor;
		const currentIsLoading = isLoading;

		if (currentIsLoading || !currentHasDescriptor) return;

		const configKeys = Object.keys(currentConfig);
		if (configKeys.length === 0) {
			executionResult = { success: false, error: 'No configuration provided' };
			executedForApp = currentApp;
			return;
		}

		// Execute and tag result with current app
		niwrapExecute(currentConfig).then((result) => {
			// Only update if we're still on the same app
			if (app === currentApp) {
				executionResult = result;
				executedForApp = currentApp;
			}
		});
	});

	async function loadApp(packageName: string, versionName: string, appName: string) {
		isLoading = true;
		error = null;
		config = {};
		appData = null;
		inputSchema = null;
		outputSchema = null;
		executionResult = null;
		executedForApp = null;

		try {
			appData = (await catalog.getApp(packageName, appName)) ?? null;

			// Only fetch schemas if app has a descriptor
			if (appData?.source) {
				const [input, output] = await Promise.all([
					catalog.getAppInputSchema(packageName, appName),
					catalog.getAppOutputSchema(packageName, appName)
				]);
				inputSchema = input;
				outputSchema = output;

				if (initialConfig) {
					config = initialConfig;
				}
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load app';
		} finally {
			isLoading = false;
		}
	}

	// URL sharing
	const COMPRESSION_THRESHOLD = 150;

	async function createShareableUrl(): Promise<string> {
		if (!hasConfig) {
			return window.location.href.split('?')[0];
		}

		const json = JSON.stringify(config);
		const params = new URLSearchParams(window.location.search);

		if (json.length > COMPRESSION_THRESHOLD) {
			try {
				params.set('config', await compressString(json));
				params.set('enc', 'gz');
			} catch {
				params.set('config', btoa(json));
				params.delete('enc');
			}
		} else {
			params.set('config', btoa(json));
			params.delete('enc');
		}

		return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
	}

	async function handleShare() {
		try {
			const url = await createShareableUrl();
			await navigator.clipboard.writeText(url);
			// TODO: toast notification
		} catch (err) {
			console.error('Failed to copy to clipboard:', err);
		}
	}
</script>

{#snippet missingDescriptorCta()}
	<div class="flex flex-col items-center justify-center py-16 text-center">
		<div class="mb-6 rounded-full bg-muted p-4">
			<FileCode class="h-10 w-10 text-muted-foreground" />
		</div>

		<h3 class="mb-2 text-xl font-semibold">Descriptor not yet available</h3>

		<p class="mb-6 max-w-md text-muted-foreground">
			This app hasn't been wrapped yet. Help us expand niwrap by contributing a descriptor!
		</p>

		<div class="flex flex-wrap justify-center gap-3">
			<Button
				variant="default" onclick={() => openExternal(URLS.contributingNiwrap)}
			>
				<FileCode class="mr-2 h-4 w-4" />
				Contributing guide
				<ExternalLink class="ml-2 h-3 w-3" />
			</Button>

			<Button
				variant="outline" onclick={() => openExternal(githubUrls.descriptor)}
			>
				View app manifest
				<ExternalLink class="ml-2 h-3 w-3" />
			</Button>
		</div>
	</div>
{/snippet}

<!-- Mobile: Tabs -->
<div class="h-full overflow-y-auto lg:hidden">
	<div class="container mx-auto max-w-7xl px-4 lg:px-6">
		<div class="space-y-6 py-4">
			{#if !isLoading && !hasDescriptor}
				{@render missingDescriptorCta()}
			{:else}
				<Tabs bind:value={mobileActiveTab} class="w-full">
					<TabsList class="grid w-full grid-cols-2">
						<TabsTrigger value="config" class="flex items-center gap-2">
							<Settings class="h-4 w-4" />
							Configuration
						</TabsTrigger>
						<TabsTrigger value="results" disabled={!hasConfig} class="flex items-center gap-2">
							<TerminalIcon class="h-4 w-4" />
							Results
						</TabsTrigger>
					</TabsList>

					<TabsContent value="config" class="mt-6">
						<ConfigurationPanel
							descriptorInputSchema={inputSchema}
							bind:descriptorConfig={config}
							{isLoading}
							{error}
							{githubUrls}
							isMobile={true}
							onRetry={() => loadApp(pkg.package.name, pkg.version.name, app)}
							onShare={handleShare}
						/>
					</TabsContent>

					<TabsContent value="results" class="mt-6">
						<ResultsPanel
							{commandArgs}
							{outputFiles}
							descriptorConfig={config}
							{niwrapError}
							{hasConfig}
							{githubUrls}
							isMobile={true}
						/>
					</TabsContent>
				</Tabs>
			{/if}
		</div>
	</div>
</div>

<!-- Desktop: Two columns -->
<div class="hidden h-full w-full bg-background lg:flex">
	{#if !isLoading && !hasDescriptor}
		<div class="flex w-full items-center justify-center">
			{@render missingDescriptorCta()}
		</div>
	{:else}
		<div class="w-1/2 flex-shrink-0 overflow-y-auto border-r border-border">
			<div class="container mx-auto max-w-none px-6 lg:px-8">
				<div class="space-y-6 py-6 lg:py-8">
					<ConfigurationPanel
						descriptorInputSchema={inputSchema}
						bind:descriptorConfig={config}
						{isLoading}
						{error}
						{githubUrls}
						isMobile={false}
						onRetry={() => loadApp(pkg.package.name, pkg.version.name, app)}
						onShare={handleShare}
					/>
				</div>
			</div>
		</div>

		<div class="w-1/2 overflow-y-auto bg-muted/20">
			<div class="container mx-auto max-w-none px-6 lg:px-8">
				<div class="space-y-6 py-6 lg:py-8">
					<ResultsPanel
						{commandArgs}
						{outputFiles}
						descriptorConfig={config}
						{niwrapError}
						{hasConfig}
						{githubUrls}
						isMobile={false}
						bind:activeTab={desktopResultsTab}
					/>
				</div>
			</div>
		</div>
	{/if}
</div>
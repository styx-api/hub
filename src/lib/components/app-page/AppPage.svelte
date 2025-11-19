<script lang="ts">
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import ConfigurationPanel from './ConfigurationPanel.svelte';
	import ResultsPanel from './ResultsPanel.svelte';
	import { Settings, Terminal as TerminalIcon } from '@lucide/svelte';
	import { niwrapDeathMessage, niwrapExecute } from '../../services/niwrapExecution';
	import {
		getAppInputSchema,
		getAppOutputSchema,
		type App,
		type Package
	} from '$lib/services/packages.svelte';
	import { getSchemaAtPath, getSchemaMetadata } from '$lib/services/schema/schemaUtils';
	import { onMount } from 'svelte';

	interface Props {
		selectedPackage: Package;
		selectedApp: App;
		initialConfig?: object | null;
	}

	let { selectedPackage, selectedApp, initialConfig = null }: Props = $props();

	// State
	let descriptorInputSchema: object | null = $state(null);
	let descriptorOutputSchema: object | null = $state(null);
	let descriptorConfig: object = $state({});
	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let mobileActiveTab = $state('config');
	let desktopResultsTab = $state('command');
	let isInitialized = $state(false);
	let niwrapExecutionData:
		| {
				success: true;
				cargs: string[];
				outputObject: any;
		  }
		| {
				success: false;
				error: string;
		  }
		| null = $state(null);

	// Constants
	const COMPRESSION_THRESHOLD = 150; // Compress if JSON string is longer than this

	// Track app/package changes to refetch schema and clear config
	let previousAppId = $state<string | undefined>(undefined);

	$effect(() => {
		const currentAppId = selectedApp?.id;

		// If app changed (but not on initial render where previousAppId is undefined)
		if (previousAppId !== undefined && previousAppId !== currentAppId) {
			// Clear the config when switching apps
			descriptorConfig = {};
			fetchSchema();
		}

		previousAppId = currentAppId;
	});

	// Computed values
	const githubUrls = $derived({
		schemaInput: `https://github.com/styx-api/niwrap-json-schema/blob/main/${selectedPackage.package.name}/${selectedPackage.package.name}.${selectedApp.name}.input.json`,
		schemaOutput: `https://github.com/styx-api/niwrap-json-schema/blob/main/${selectedPackage.package.name}/${selectedPackage.package.name}.${selectedApp.name}.output.json`,
		descriptor:`https://github.com/styx-api/niwrap/blob/main/src/niwrap/${selectedPackage.package.name}/${selectedPackage.version.name}/${selectedApp.name}/app.json`
	});

	const commandArgs = $derived(() => {
		if (!niwrapExecutionData) return [];
		if (!niwrapExecutionData.success) {
			return niwrapDeathMessage();
		}
		const args = niwrapExecutionData.cargs;
		if (!Array.isArray(args)) {
			return ['Error: Invalid command arguments'];
		}
		return args.length > 0 ? args : ['# No command generated'];
	});

	const outputFiles = $derived.by(() => {
		if (!niwrapExecutionData) return [];
		const ret = [];
		if (!niwrapExecutionData.success) return [];

		const processValue = (value, keyPath) => {
			if (typeof value === 'string') {
				const outputFieldSchema =
					descriptorOutputSchema && getSchemaAtPath(descriptorOutputSchema, keyPath);
				const keyMetadata = outputFieldSchema && getSchemaMetadata(outputFieldSchema);
				ret.push({
					path: '/outputs/' + value,
					title: keyMetadata?.title ?? 'Title',
					description: keyMetadata?.description ?? 'Description',
					label: keyPath.join('.')
				});
			} else if (Array.isArray(value)) {
				value.forEach((item, idx) => {
					processValue(item, [...keyPath, idx]);
				});
			} else if (value && typeof value === 'object') {
				for (const [nestedKey, nestedValue] of Object.entries(value)) {
					processValue(nestedValue, [...keyPath, nestedKey]);
				}
			}
		};

		// console.log('o', JSON.stringify(niwrapExecutionData.outputObject));
		for (const [key, value] of Object.entries(niwrapExecutionData.outputObject)) {
			processValue(value, [key]);
		}

		return ret;
	});

	const niwrapError = $derived(
		niwrapExecutionData?.success ? null : (niwrapExecutionData?.error ?? '???')
	);
	const hasConfig = $derived(Object.keys(descriptorConfig).length > 0);

	// URL sharing functions
	async function compressString(str: string): Promise<string> {
		const encoder = new TextEncoder();
		const data = encoder.encode(str);
		const stream = new ReadableStream({
			start(controller) {
				controller.enqueue(data);
				controller.close();
			}
		}).pipeThrough(new CompressionStream('gzip'));

		const compressed = await new Response(stream).arrayBuffer();
		return btoa(String.fromCharCode(...new Uint8Array(compressed)));
	}

	async function createShareableUrl(): Promise<string> {
		if (Object.keys(descriptorConfig).length === 0) {
			return window.location.href.split('?')[0];
		}

		const json = JSON.stringify(descriptorConfig);
		const params = new URLSearchParams(window.location.search);

		// Choose encoding based on size
		if (json.length > COMPRESSION_THRESHOLD) {
			try {
				const compressed = await compressString(json);
				params.set('config', compressed);
				params.set('enc', 'gz'); // Flag to indicate compression
			} catch (err) {
				console.error('Compression failed, falling back to base64:', err);
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
		const url = await createShareableUrl();
		try {
			await navigator.clipboard.writeText(url);
			// TODO: Show a toast notification that the link was copied
			console.log('Link copied to clipboard!');
		} catch (err) {
			console.error('Failed to copy to clipboard:', err);
			// Fallback: select the URL or show it in a modal
		}
	}

	// Load config from parent and fetch schema on mount
	onMount(async () => {
		// First, fetch the schema
		await fetchSchema();

		// Use initialConfig from parent if provided
		if (initialConfig) {
			descriptorConfig = initialConfig;
		}

		// Mark as initialized
		isInitialized = true;
	});

	// Execute niwrap when config changes (but only after initialization)
	$effect(() => {
		if (!isInitialized) return;

		if (!descriptorConfig || Object.keys(descriptorConfig).length === 0) {
			niwrapExecutionData = { success: false, error: 'No configuration provided' };
			return;
		}

		niwrapExecute(descriptorConfig).then((d) => (niwrapExecutionData = d));
	});

	// Methods
	async function fetchSchema() {
		if (!selectedPackage || !selectedApp) return;
		isLoading = true;
		error = null;
		try {
			const inputSchema = await getAppInputSchema(selectedPackage.package.name, selectedApp.id);
			const outputSchema = await getAppOutputSchema(selectedPackage.package.name, selectedApp.id);
			descriptorInputSchema = inputSchema;
			descriptorOutputSchema = outputSchema;
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to fetch schema';
			error = errorMessage;
		} finally {
			isLoading = false;
		}
	}
</script>

<!-- Mobile: Single Column with Tabs -->
<div class="h-full overflow-y-auto lg:hidden">
	<div class="container mx-auto max-w-7xl px-4 lg:px-6">
		<div class="space-y-6 py-4">
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
					{#if isInitialized}
						<ConfigurationPanel
							{descriptorInputSchema}
							bind:descriptorConfig
							{isLoading}
							{error}
							{githubUrls}
							isMobile={true}
							onRetry={fetchSchema}
							onShare={handleShare}
						/>
					{/if}
				</TabsContent>

				<TabsContent value="results" class="mt-6">
					<ResultsPanel
						commandArgs={commandArgs()}
						{outputFiles}
						{descriptorConfig}
						{niwrapError}
						{hasConfig}
						{githubUrls}
						isMobile={true}
					/>
				</TabsContent>
			</Tabs>
		</div>
	</div>
</div>

<!-- Desktop: Two Column Layout with Individual Scrolling -->
<div class="hidden h-full w-full bg-background lg:flex">
	<div class="w-1/2 flex-shrink-0 overflow-y-auto border-r border-border">
		<div class="container mx-auto max-w-none px-6 lg:px-8">
			<div class="space-y-6 py-6 lg:py-8">
				{#if isInitialized}
					<ConfigurationPanel
						{descriptorInputSchema}
						bind:descriptorConfig
						{isLoading}
						{error}
						{githubUrls}
						isMobile={false}
						onRetry={fetchSchema}
						onShare={handleShare}
					/>
				{/if}
			</div>
		</div>
	</div>

	<div class="w-1/2 overflow-y-auto bg-muted/20">
		<div class="container mx-auto max-w-none px-6 lg:px-8">
			<div class="space-y-6 py-6 lg:py-8">
				<ResultsPanel
					commandArgs={commandArgs()}
					{outputFiles}
					{descriptorConfig}
					{niwrapError}
					{hasConfig}
					{githubUrls}
					isMobile={false}
					bind:activeTab={desktopResultsTab}
				/>
			</div>
		</div>
	</div>
</div>

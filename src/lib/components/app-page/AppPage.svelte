<script lang="ts">
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import ConfigurationPanel from './ConfigurationPanel.svelte';
	import ResultsPanel from './ResultsPanel.svelte';
	import { Settings, Terminal as TerminalIcon, FileCode, ExternalLink } from '@lucide/svelte';
	import {
		compileTool,
		executeTool,
		compilerStatus,
		compilerMismatchWarning,
		type ExecutionResult
	} from '$lib/services/compiler';
	import { niwrapDeathMessage } from '$lib/utils/deathMessage';
	import { catalog, type PackageInfo } from '$lib/services/catalog';
	import { getSchemaAtPath, getSchemaMetadata } from '$lib/services/schema/schemaUtils';
	import { streamFieldNames } from '$lib/services/schema/outputsSchema';
	import type { AppType } from '$lib/services/catalog';
	import { github, openExternal } from '$lib/utils/github';
	import { URLS } from '$lib/constants/urls';
	import { Button } from '$lib/components/ui/button';
	import { compressString } from '$lib/utils/compression';
	import { copyToClipboard } from '$lib/utils/clipboard';
	import { toast } from 'svelte-sonner';

	interface Props {
		package: PackageInfo;
		app: string;
		initialConfig?: object | null;
	}

	let { package: pkg, app, initialConfig = null }: Props = $props();

	// State
	let appData = $state<AppType | null>(null);
	let inputSchema = $state<object | null>(null);
	let outputSchema = $state<object | null>(null);
	let config = $state<object>({});
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let mobileActiveTab = $state('config');
	let desktopResultsTab = $state('command');

	// Execution result (command + outputs + call snippets), from `executeTool`.
	let executionResult = $state<ExecutionResult | null>(null);

	// Track which app the current execution belongs to
	let executedForApp = $state<string | null>(null);

	// Generation counter to discard stale execution results
	let executionGeneration = 0;

	// Worker-crash recovery: the last compiled descriptor (to recompile in place
	// without re-fetching or wiping the form), and a bounded retry counter so a
	// genuinely dead worker can't loop. Reset per `loadApp`.
	let lastDescriptor: string | null = null;
	let recoveryAttempts = 0;
	const MAX_RECOVERY = 1;

	// Derived
	const hasDescriptor = $derived(appData?.descriptor != null);

	const githubUrls = $derived({
		schemaInput: github.schemaInput(pkg.package.name, app),
		schemaOutput: github.schemaOutput(pkg.package.name, app),
		descriptor: github.app(pkg.package.name, pkg.version.name, app)
	});
	const commandArgs = $derived(
		!executionResult || executedForApp !== app
			? []
			: !executionResult.success
				? // A compiler/infra failure gets a neutral placeholder (the alert above
					// explains it); a config the tool rejected keeps the playful tombstone.
					executionResult.recoverable
					? ['# Compiler unavailable']
					: niwrapDeathMessage()
				: executionResult.cargs.length > 0
					? executionResult.cargs
					: ['# No command generated']
	);

	interface OutputEntry {
		keyPath: (string | number)[];
		filePath: string;
		pythonAccessor: string;
		title: string | null;
		description: string | null;
		isRoot: boolean;
	}

	function buildPythonAccessor(keyPath: (string | number)[]): string {
		return (
			'result.' +
			keyPath
				.map((k) => (typeof k === 'number' ? `[${k}]` : k))
				.join('.')
				.replace(/\.\[/g, '[')
		);
	}

	const outputEntries = $derived.by((): OutputEntry[] => {
		if (!executionResult?.success || executedForApp !== app) return [];

		const results: OutputEntry[] = [];

		function processValue(value: unknown, keyPath: (string | number)[], isRoot: boolean) {
			if (typeof value === 'string') {
				const fieldSchema = outputSchema && getSchemaAtPath(outputSchema, keyPath);
				const metadata = fieldSchema ? getSchemaMetadata(fieldSchema) : null;
				results.push({
					keyPath,
					filePath: value,
					pythonAccessor: buildPythonAccessor(keyPath),
					title: metadata?.title ?? null,
					description: metadata?.description ?? null,
					isRoot
				});
			} else if (Array.isArray(value)) {
				value.forEach((item, idx) => processValue(item, [...keyPath, idx], false));
			} else if (value && typeof value === 'object') {
				for (const [key, nested] of Object.entries(value)) {
					processValue(nested, [...keyPath, key], false);
				}
			}
		}

		// stdout/stderr stream fields are arrays of text lines, not file paths -
		// skip them so the output list doesn't render each line as a bogus file.
		const streams = streamFieldNames(outputSchema as Parameters<typeof streamFieldNames>[0]);

		const entries = Object.entries(executionResult.outputObject);
		for (const [key, value] of entries) {
			if (streams.has(key)) continue;
			const isRoot = key === 'root';
			processValue(value, [key], isRoot);
		}

		return results;
	});

	// The current failure (for this app), split into the two kinds the UI renders
	// differently: a config the tool rejected vs. an in-browser compiler failure.
	const failure = $derived(
		executionResult && !executionResult.success && executedForApp === app ? executionResult : null
	);
	const configError = $derived(failure && !failure.recoverable ? failure.error : null);
	const compilerError = $derived(failure && failure.recoverable ? failure.error : null);

	// Lockstep (C8): warn when the bundled compiler differs from the one that built
	// the published release, so the user knows the command/snippets may not match
	// `pip install niwrap`. `null` when they match or can't be verified.
	const compilerWarning = $derived(compilerMismatchWarning(compilerStatus(catalog.compiler)));

	// Call snippets (H5) ride along on the execution result so they refresh with
	// the config and survive a command error (best-effort render even when the
	// command itself throws).
	const forCurrentApp = $derived(executionResult != null && executedForApp === app);
	const pythonCode = $derived(forCurrentApp ? (executionResult!.python ?? null) : null);
	const typescriptCode = $derived(forCurrentApp ? (executionResult!.typescript ?? null) : null);
	const snippetError = $derived(forCurrentApp ? (executionResult!.snippetError ?? null) : null);

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
		loadApp(pkg.package.name, app);
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
			executionResult = {
				success: false,
				error: 'No configuration provided',
				recoverable: false,
				python: '',
				typescript: '',
				snippetError: null
			};
			executedForApp = currentApp;
			return;
		}

		// Increment generation so any in-flight execution is discarded
		const gen = ++executionGeneration;

		const run = executeTool(currentConfig as Record<string, unknown>);
		run.then(async (result) => {
			// Ignore a result superseded by a newer config/app.
			if (gen !== executionGeneration) return;

			// A worker crash leaves the respawned worker with an empty cache, so the
			// execute fails as `recoverable`. Recompile in place (repopulating the
			// cache, keeping the form intact) and retry once before giving up.
			if (!result.success && result.recoverable && recoveryAttempts < MAX_RECOVERY) {
				recoveryAttempts++;
				try {
					await recompileInPlace(pkg.package.name, currentApp);
					if (gen !== executionGeneration) return;
					const retried = await executeTool(currentConfig as Record<string, unknown>);
					if (gen === executionGeneration) {
						// Recovered: refresh the budget so a later, independent crash can also retry.
						if (retried.success) recoveryAttempts = 0;
						executionResult = retried;
						executedForApp = currentApp;
					}
					return;
				} catch {
					// Recompile failed; fall through to surface the original failure.
				}
			}

			if (gen === executionGeneration) {
				if (result.success) recoveryAttempts = 0;
				executionResult = result;
				executedForApp = currentApp;
			}
		});
	});

	async function loadApp(packageName: string, appName: string) {
		isLoading = true;
		error = null;
		config = {};
		appData = null;
		inputSchema = null;
		outputSchema = null;
		executionResult = null;
		executedForApp = null;
		executionGeneration++;
		lastDescriptor = null;
		recoveryAttempts = 0;

		try {
			const entry = (await catalog.getApp(packageName, appName)) ?? null;
			appData = entry;

			// Compile the descriptor in-browser for the form schemas. Apps without a
			// descriptor render the "not yet available" CTA instead.
			if (entry?.descriptor) {
				const descriptor = await catalog.fetchDescriptor(entry);
				lastDescriptor = descriptor;
				const compiled = await compileTool(
					descriptor,
					packageName,
					appName,
					'niwrap',
					entry.format
				);
				inputSchema = compiled.inputSchema;
				outputSchema = compiled.outputSchema;

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

	/**
	 * Recompile the current descriptor to repopulate a respawned worker's cache,
	 * without re-fetching or resetting the form. Used by the execute effect's
	 * one-shot crash recovery; throws if there is no descriptor to recompile.
	 */
	async function recompileInPlace(packageName: string, appName: string): Promise<void> {
		if (!lastDescriptor || !appData?.descriptor) {
			throw new Error('no descriptor to recompile');
		}
		const compiled = await compileTool(
			lastDescriptor,
			packageName,
			appName,
			'niwrap',
			appData.format
		);
		inputSchema = compiled.inputSchema;
		outputSchema = compiled.outputSchema;
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
			await copyToClipboard(url);
			toast.success('Link copied to clipboard!');
		} catch (err) {
			console.error('Failed to copy to clipboard:', err);
			toast.error('Failed to copy link to clipboard');
		}
	}
</script>

{#snippet missingDescriptorCta()}
	<div class="flex flex-col items-center justify-center py-20 text-center">
		<div class="mb-6 rounded-full bg-muted p-4">
			<FileCode class="h-10 w-10 text-muted-foreground" />
		</div>

		<h3 class="mb-2 text-xl font-semibold">Descriptor not yet available</h3>

		<p class="mb-6 max-w-md text-muted-foreground">
			This app hasn't been wrapped yet. Help us expand niwrap by contributing a descriptor!
		</p>

		<div class="flex flex-wrap justify-center gap-3">
			<Button variant="default" onclick={() => openExternal(URLS.contributingNiwrap)}>
				<FileCode class="mr-2 h-4 w-4" />
				Contributing guide
				<ExternalLink class="ml-2 h-3 w-3" />
			</Button>

			<Button variant="outline" onclick={() => openExternal(githubUrls.descriptor)}>
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

					<TabsContent value="config" class="mt-4">
						<ConfigurationPanel
							descriptorInputSchema={inputSchema}
							bind:descriptorConfig={config}
							{isLoading}
							{error}
							{githubUrls}
							isMobile={true}
							onRetry={() => loadApp(pkg.package.name, app)}
							onShare={handleShare}
						/>
					</TabsContent>

					<TabsContent value="results" class="mt-4">
						<ResultsPanel
							{commandArgs}
							{outputEntries}
							descriptorConfig={config}
							{configError}
							{compilerError}
							{compilerWarning}
							{pythonCode}
							{typescriptCode}
							{snippetError}
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
						onRetry={() => loadApp(pkg.package.name, app)}
						onShare={handleShare}
					/>
				</div>
			</div>
		</div>

		<div class="w-1/2 overflow-y-auto bg-background">
			<div class="container mx-auto max-w-none px-6 lg:px-8">
				<div class="space-y-6 py-6 lg:py-8">
					<ResultsPanel
						{commandArgs}
						{outputEntries}
						descriptorConfig={config}
						{configError}
						{compilerError}
						{compilerWarning}
						{pythonCode}
						{typescriptCode}
						{snippetError}
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

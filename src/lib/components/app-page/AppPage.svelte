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

	interface Props {
		selectedPackage: Package;
		selectedApp: App;
	}

	let { selectedPackage, selectedApp }: Props = $props();

	// State
	let descriptorInputSchema: object | null = $state(null);
	let descriptorOutputSchema: object | null = $state(null);
	let descriptorConfig: object = $state({});
	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let mobileActiveTab = $state('config');
	let desktopResultsTab = $state('command');
	let niwrapExecutionData = $state<
		| {
				success: true;
				cargs: string[];
				outputObject: any;
		  }
		| {
				success: false;
				error: string;
		  }
		| null
	>(null);

	// Computed values
	const githubUrls = $derived({
		schemaInput: `https://github.com/styx-api/niwrap-json-schema/blob/main/${selectedPackage.name}/${selectedPackage.name}.${selectedApp.name}.input.json`,
		schemaOutput: `https://github.com/styx-api/niwrap-json-schema/blob/main/${selectedPackage.name}/${selectedPackage.name}.${selectedApp.name}.output.json`,
		descriptor: `https://github.com/styx-api/niwrap/blob/main/descriptors/${selectedPackage.name}/${selectedApp.name}.json`
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
		for (const [key, value] of Object.entries(niwrapExecutionData.outputObject)) {
			if (!(typeof value === 'string')) continue;
			const outputFieldSchema =
				descriptorOutputSchema && getSchemaAtPath(descriptorOutputSchema, [key]);
			const keyMetadata = outputFieldSchema && getSchemaMetadata(outputFieldSchema);
			ret.push({
				path: '/outputs/' + value,
				title: keyMetadata && (keyMetadata?.title ?? 'Title'),
				description: keyMetadata && (keyMetadata?.description ?? 'Description'),
				label: key
			});
		}
		return ret;
	});

	const niwrapError = $derived(
		niwrapExecutionData?.success ? null : (niwrapExecutionData?.error ?? '???')
	);
	const hasConfig = $derived(Object.keys(descriptorConfig).length > 0);

	// Effects
	$effect(() => {
		if (!descriptorConfig || Object.keys(descriptorConfig).length === 0) {
			niwrapExecutionData = { success: false, error: 'No configuration provided' };
		}
		niwrapExecute(descriptorConfig).then((d) => (niwrapExecutionData = d));
	});

	$effect(() => {
		fetchSchema();
	});

	// Methods
	async function fetchSchema() {
		if (!selectedPackage || !selectedApp) return;
		isLoading = true;
		error = null;
		try {
			const inputSchema = await getAppInputSchema(selectedPackage.name, selectedApp.id);
			const outputSchema = await getAppOutputSchema(selectedPackage.name, selectedApp.id);
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
					<ConfigurationPanel
						{descriptorInputSchema}
						bind:descriptorConfig
						{isLoading}
						{error}
						{githubUrls}
						isMobile={true}
						onRetry={fetchSchema}
					/>
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
				<ConfigurationPanel
					{descriptorInputSchema}
					bind:descriptorConfig
					{isLoading}
					{error}
					{githubUrls}
					isMobile={false}
					onRetry={fetchSchema}
				/>
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
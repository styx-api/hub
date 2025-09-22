<script lang="ts">
	import SchemaForm from './schema-form/SchemaForm.svelte';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import Terminal from './Terminal.svelte';
	import FileTreeView from './FileTreeView.svelte';
	import { niwrapDeathMessage, niwrapExecute } from '../services/niwrapExecution';
	import CodeBlock from './CodeBlock.svelte';
	import {
		Terminal as TerminalIcon,
		FolderTree,
		Settings,
		TriangleAlert,
		Copy,
		Check,
		RefreshCw,
		LoaderCircle,
		Code,
		Github,
		ExternalLink
	} from '@lucide/svelte';
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
	let descriptorInputSchema: object | null = $state(null);
	let descriptorOutputSchema: object | null = $state(null);
	let descriptorConfig: object = $state({});
	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let activeTab = $state('command');
	let commandCopied = $state(false);
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

	const getGithubUrls = (packageName: string, descriptorName: string) => ({
		schemaInput: `https://github.com/styx-api/niwrap-json-schema/blob/main/${packageName}/${packageName}.${descriptorName}.input.json`,
		schemaOutput: `https://github.com/styx-api/niwrap-json-schema/blob/main/${packageName}/${packageName}.${descriptorName}.output.json`,
		descriptor: `https://github.com/styx-api/niwrap/blob/main/descriptors/${packageName}/${descriptorName}.json`
	});

	$effect(() => {
		if (!descriptorConfig || Object.keys(descriptorConfig).length === 0) {
			niwrapExecutionData = { success: false, error: 'No configuration provided' };
		}
		niwrapExecute(descriptorConfig).then((d) => (niwrapExecutionData = d));
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
			const outputFieldSchema = descriptorOutputSchema && getSchemaAtPath(descriptorOutputSchema, [key]);
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
	const hasOutputs = $derived(outputFiles.length > 0);
	const githubUrls = $derived(getGithubUrls(selectedPackage.name, selectedApp.name));

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
	async function copyCommand() {
		try {
			const command = commandArgs().join(' ');
			await navigator.clipboard.writeText(command);
			commandCopied = true;
			setTimeout(() => (commandCopied = false), 2000);
		} catch (err) {
			console.error('Failed to copy command:', err);
		}
	}

	function openGithubFile(url: string) {
		window.open(url, '_blank', 'noopener,noreferrer');
	}

	$effect(() => {
		fetchSchema();
	});
</script>

<!-- Mobile: Single Column with Tabs -->
<div class="h-full overflow-y-auto lg:hidden">
	<div class="container mx-auto max-w-7xl px-4 lg:px-6">
		<div class="space-y-6 py-4">
			<header class="space-y-2">
				<div class="flex items-center justify-between">
					<div class="space-y-1">
						<h1 class="text-lg font-semibold tracking-tight text-foreground">Configuration</h1>
						<p class="text-sm text-muted-foreground">Set parameters to generate command</p>
					</div>
					<!-- Mobile GitHub Button -->
					<div class="flex gap-1">
						<Button
							variant="outline"
							size="sm"
							onclick={() => openGithubFile(githubUrls.descriptor)}
							class="h-8 w-8 p-0"
							title="View descriptor on GitHub"
						>
							<Github class="h-3 w-3" />
						</Button>
					</div>
				</div>
			</header>
			<Tabs value="config" class="w-full">
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
					{#if isLoading}
						<Card>
							<CardContent class="flex items-center justify-center py-12">
								<div class="flex items-center space-x-3">
									<LoaderCircle class="h-5 w-5 animate-spin text-primary" />
									<div class="text-sm text-muted-foreground">Loading configuration schema...</div>
								</div>
							</CardContent>
						</Card>
					{:else if error}
						<Alert variant="destructive">
							<TriangleAlert class="h-4 w-4" />
							<AlertDescription class="flex items-center justify-between">
								<span>{error}</span>
								<Button variant="outline" size="sm" onclick={fetchSchema} class="ml-4 shrink-0">
									<RefreshCw class="mr-1 h-3 w-3" />
									Retry
								</Button>
							</AlertDescription>
						</Alert>
					{:else if descriptorInputSchema}
						<SchemaForm schema={descriptorInputSchema} bind:value={descriptorConfig} />
					{:else}
						<Card>
							<CardContent class="flex flex-col items-center justify-center py-12 text-center">
								<div class="mb-4 rounded-full bg-muted p-3">
									<Settings class="h-6 w-6 text-muted-foreground" />
								</div>
								<CardTitle class="mb-2 text-base">No Configuration Required</CardTitle>
								<CardDescription>This app doesn't require configuration parameters.</CardDescription
								>
							</CardContent>
						</Card>
					{/if}
				</TabsContent>
				<TabsContent value="results" class="mt-6">
					<div class="space-y-4">
						{#if niwrapError}
							<Alert variant="destructive">
								<TriangleAlert class="h-4 w-4" />
								<AlertDescription>
									<strong>Configuration Error:</strong>
									{niwrapError}
								</AlertDescription>
							</Alert>
						{/if}
						<Card>
							<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-3">
								<div>
									<CardTitle class="text-base">Generated Command</CardTitle>
									<CardDescription>Copy and run this command in your terminal</CardDescription>
								</div>
								<Button
									variant="outline"
									size="sm"
									onclick={copyCommand}
									disabled={!hasConfig || !!niwrapError}
								>
									{#if commandCopied}
										<Check class="mr-1 h-3 w-3" />
										Copied
									{:else}
										<Copy class="mr-1 h-3 w-3" />
										Copy
									{/if}
								</Button>
							</CardHeader>
							<CardContent>
								<Terminal
									args={commandArgs()}
									prompt="$ "
									showCursor={true}
									class="font-mono text-sm"
								/>
							</CardContent>
						</Card>
						{#if hasOutputs}
							<Card>
								<CardHeader>
									<CardTitle class="text-base">Expected Output Files</CardTitle>
									<CardDescription>
										Files that will be generated when you run the command
									</CardDescription>
								</CardHeader>
								<CardContent>
									<div class="rounded-lg bg-muted/50 p-4">
										<FileTreeView files={outputFiles} />
									</div>
								</CardContent>
							</Card>
						{/if}
						{#if hasConfig}
							<Card>
								<CardHeader>
									<CardTitle class="text-base">Configuration JSON</CardTitle>
									<CardDescription>Current parameter values in JSON format</CardDescription>
								</CardHeader>
								<CardContent>
									<CodeBlock code={JSON.stringify(descriptorConfig, null, 2)} language="json" />
								</CardContent>
							</Card>
						{/if}
					</div>
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
				<header class="space-y-2">
					<div class="flex items-center justify-between">
						<div>
							<h1 class="text-xl font-semibold tracking-tight text-foreground">Configuration</h1>
							<p class="text-sm text-muted-foreground">Set parameters to generate command</p>
						</div>
						<!-- Desktop GitHub Buttons -->
						<div class="flex gap-2">
							<Button
								variant="outline"
								size="sm"
								onclick={() => openGithubFile(githubUrls.schemaInput)}
								class="h-8"
								title="View input schema on GitHub"
							>
								<Github class="mr-1 h-3 w-3" />
								<span class="hidden xl:inline">Schema</span>
							</Button>
							<Button
								variant="outline"
								size="sm"
								onclick={() => openGithubFile(githubUrls.descriptor)}
								class="h-8"
								title="View descriptor on GitHub"
							>
								<Github class="mr-1 h-3 w-3" />
								<span class="hidden xl:inline">Descriptor</span>
							</Button>
						</div>
					</div>
				</header>
				<div class="space-y-4">
					{#if isLoading}
						<Card>
							<CardContent class="flex items-center justify-center py-12">
								<div class="flex items-center space-x-3">
									<LoaderCircle class="h-5 w-5 animate-spin text-primary" />
									<div class="text-sm text-muted-foreground">Loading configuration schema...</div>
								</div>
							</CardContent>
						</Card>
					{:else if error}
						<Alert variant="destructive">
							<TriangleAlert class="h-4 w-4" />
							<AlertDescription class="flex items-center justify-between">
								<span>{error}</span>
								<Button variant="outline" size="sm" onclick={fetchSchema} class="ml-4 shrink-0">
									<RefreshCw class="mr-1 h-3 w-3" />
									Retry
								</Button>
							</AlertDescription>
						</Alert>
					{:else if descriptorInputSchema}
						<SchemaForm schema={descriptorInputSchema} bind:value={descriptorConfig} />
					{:else}
						<Card>
							<CardContent class="flex flex-col items-center justify-center py-12 text-center">
								<div class="mb-4 rounded-full bg-muted p-3">
									<Settings class="h-6 w-6 text-muted-foreground" />
								</div>
								<CardTitle class="mb-2 text-base">No Configuration Required</CardTitle>
								<CardDescription>This app doesn't require configuration parameters.</CardDescription
								>
							</CardContent>
						</Card>
					{/if}
				</div>
			</div>
		</div>
	</div>
	<div class="w-1/2 overflow-y-auto bg-muted/20">
		<div class="container mx-auto max-w-none px-6 lg:px-8">
			<div class="space-y-6 py-6 lg:py-8">
				<header class="space-y-2">
					<div class="flex items-center justify-between">
						<div>
							<h2 class="text-xl font-semibold tracking-tight text-foreground">Results</h2>
							<p class="text-sm text-muted-foreground">Generated command and outputs</p>
						</div>
						<!-- Desktop GitHub Source Buttons -->
						<!-- <div class="flex gap-2">
							<Button
								variant="outline"
								size="sm"
								onclick={() => openGithubFile(githubUrls.implementation)}
								class="h-8"
								title="View implementation on GitHub"
							>
								<Github class="mr-1 h-3 w-3" />
								<span class="hidden xl:inline">Code</span>
							</Button>
							<Button
								variant="outline"
								size="sm"
								onclick={() => openGithubFile(githubUrls.tests)}
								class="h-8"
								title="View tests on GitHub"
							>
								<Github class="mr-1 h-3 w-3" />
								<span class="hidden xl:inline">Tests</span>
							</Button>
						</div> -->
					</div>
				</header>
				<Tabs bind:value={activeTab} class="w-full">
					<TabsList class="grid w-full grid-cols-3">
						<TabsTrigger value="command" disabled={!hasConfig} class="flex items-center gap-2">
							<TerminalIcon class="h-3 w-3" />
							<span class="hidden xl:inline">Command</span>
						</TabsTrigger>
						<TabsTrigger value="outputs" disabled={!hasOutputs} class="flex items-center gap-2">
							<FolderTree class="h-3 w-3" />
							<span class="hidden xl:inline">Outputs</span>
							{#if hasOutputs}
								<Badge variant="secondary" class="ml-1 h-4 px-1 text-xs">
									{outputFiles.length}
								</Badge>
							{/if}
						</TabsTrigger>
						<TabsTrigger value="config" disabled={!hasConfig} class="flex items-center gap-2">
							<Code class="h-3 w-3" />
							<span class="hidden xl:inline">JSON</span>
						</TabsTrigger>
					</TabsList>
					<TabsContent value="command" class="mt-6">
						<div class="space-y-4">
							{#if niwrapError}
								<Alert variant="destructive">
									<TriangleAlert class="h-4 w-4" />
									<AlertDescription>
										<strong>Configuration Error:</strong>
										{niwrapError}
									</AlertDescription>
								</Alert>
							{/if}
							<Card>
								<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-3">
									<div>
										<CardTitle class="text-base">Generated Command</CardTitle>
										<CardDescription>Copy and run in terminal</CardDescription>
									</div>
									<div class="flex gap-2">
										<!-- <Button
											variant="outline"
											size="sm"
											onclick={() => openGithubFile(githubUrls.implementation)}
											title="View source code"
										>
											<ExternalLink class="h-3 w-3" />
										</Button> -->
										<Button
											variant="outline"
											size="sm"
											onclick={copyCommand}
											disabled={!hasConfig || !!niwrapError}
										>
											{#if commandCopied}
												<Check class="mr-1 h-3 w-3" />
												Copied
											{:else}
												<Copy class="mr-1 h-3 w-3" />
												Copy
											{/if}
										</Button>
									</div>
								</CardHeader>
								<CardContent>
									<Terminal
										args={commandArgs()}
										prompt="$ "
										showCursor={true}
										class="font-mono text-sm"
									/>
								</CardContent>
							</Card>
						</div>
					</TabsContent>
					<TabsContent value="outputs" class="mt-6">
						<Card>
							<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-3">
								<div>
									<CardTitle class="text-base">Expected Output Files</CardTitle>
									<CardDescription>Files generated by the command</CardDescription>
								</div>
								<Button
									variant="outline"
									size="sm"
									onclick={() => openGithubFile(githubUrls.descriptor)}
									title="View output schema"
								>
									<ExternalLink class="h-3 w-3" />
								</Button>
							</CardHeader>
							<CardContent>
								<div class="rounded-lg bg-muted/50 p-4">
									<FileTreeView files={outputFiles} />
								</div>
							</CardContent>
						</Card>
					</TabsContent>
					<TabsContent value="config" class="mt-6">
						<Card>
							<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-3">
								<div>
									<CardTitle class="text-base">Configuration JSON</CardTitle>
									<CardDescription>Parameter values in JSON</CardDescription>
								</div>
								<Button
									variant="outline"
									size="sm"
									onclick={() => openGithubFile(githubUrls.schemaInput)}
									title="View input schema"
								>
									<ExternalLink class="h-3 w-3" />
								</Button>
							</CardHeader>
							<CardContent>
								<CodeBlock code={JSON.stringify(descriptorConfig, null, 2)} language="json" />
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
			</div>
		</div>
	</div>
</div>

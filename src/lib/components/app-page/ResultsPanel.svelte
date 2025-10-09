<script lang="ts">
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
	import CodeBlock from './CodeBlock.svelte';
	import {
		Terminal as TerminalIcon,
		FolderTree,
		TriangleAlert,
		Code,
		ExternalLink,

		BracesIcon

	} from '@lucide/svelte';
	import { fetchSymbolmapForConfig } from '$lib/services/niwrapPythonSymbolmaps';

	interface OutputFile {
		path: string;
		title: string;
		description: string;
		label: string;
	}

	interface Props {
		commandArgs: string[];
		outputFiles: OutputFile[];
		descriptorConfig: object;
		niwrapError: string | null;
		hasConfig: boolean;
		githubUrls: { schemaInput: string; descriptor: string };
		isMobile?: boolean;
		activeTab?: string;
	}

	let {
		commandArgs,
		outputFiles,
		descriptorConfig,
		niwrapError,
		hasConfig,
		githubUrls,
		isMobile = false,
		activeTab = $bindable('command')
	}: Props = $props();

	const hasOutputs = $derived(outputFiles.length > 0);

	let pythonCode = $state<string | null>(null);
	let pythonCodeError = $state<Error | null>(null);
	let isLoadingPython = $state<boolean>(false);

	$effect(() => {
		// Don't clear existing code immediately - just mark as loading
		isLoadingPython = true;
		pythonCodeError = null;

		createPythonStaticCallFromConfig(descriptorConfig)
			.then((code) => {
				pythonCode = code;
				isLoadingPython = false;
			})
			.catch((error) => {
				pythonCodeError = error;
				isLoadingPython = false;
			});
	});

	// let command = $derived<string>(quoteCommandLineArgs(commandArgs));

	function openGithubFile(url: string) {
		window.open(url, '_blank', 'noopener,noreferrer');
	}

	// TODO: very quick and hacky way to do this - needs a big refactor
	function createPythonStaticCall(
		descriptorConfig: Record<string, any>,
		symbolMap: Record<string, any>
	): string {
		/**
		 * Generate Python code for nested function calls based on descriptor config and symbol map.
		 */

		function buildParams(
			pkg: string,
			config: Record<string, any>,
			spec: Record<string, any>,
			indentLevel: number = 1
		): string[] {
			/**
			 * Recursively build parameter strings for function calls.
			 */
			const params: string[] = [];
			const indent = '    '.repeat(indentLevel);

			const properties = spec.properties || {};

			for (const [key, value] of Object.entries(config)) {
				// Skip special keys like @type
				if (key.startsWith('@')) {
					continue;
				}

				if (!(key in properties)) {
					continue;
				}

				const propSpec = properties[key];
				const varParam = propSpec.var_param;

				if (!varParam) {
					continue;
				}

				// Handle arrays of structured objects
				if (
					Array.isArray(value) &&
					value.length > 0 &&
					typeof value[0] === 'object' &&
					value[0] !== null
				) {
					const listItems: string[] = [];

					for (const item of value) {
						// Check if this is a variant type
						if (propSpec.variants && item['@type']) {
							const variantType = item['@type'];

							if (!(variantType in propSpec.variants)) {
								throw new Error(`Unknown variant type "${variantType}" for property: ${key}`);
							}

							const variantSpec = propSpec.variants[variantType];
							const fnStruct = variantSpec.fn_struct_make_params;

							if (!fnStruct) {
								throw new Error(`fn_struct_make_params missing for variant: ${variantType}`);
							}

							const nestedParams = buildParams(pkg, item, variantSpec, indentLevel + 2);
							const nestedIndent = '    '.repeat(indentLevel + 1);

							let nestedCall = `${nestedIndent}${pkg}.${fnStruct}(`;
							if (nestedParams.length > 0) {
								nestedCall += '\n' + nestedParams.join(',\n') + `\n${nestedIndent}`;
							}
							nestedCall += ')';

							listItems.push(nestedCall);
						}
						// Check if this has a nested structure (non-variant)
						else if (propSpec.fn_struct_make_params) {
							const nestedParams = buildParams(pkg, item, propSpec, indentLevel + 2);
							const nestedIndent = '    '.repeat(indentLevel + 1);

							let nestedCall = `${nestedIndent}${pkg}.${propSpec.fn_struct_make_params}(`;
							if (nestedParams.length > 0) {
								nestedCall += '\n' + nestedParams.join(',\n') + `\n${nestedIndent}`;
							}
							nestedCall += ')';

							listItems.push(nestedCall);
						}
					}

					if (listItems.length > 0) {
						const listContent = '[\n' + listItems.join(',\n') + `\n${indent}]`;
						params.push(`${indent}${varParam}=${listContent}`);
					}
				}
				// Check if this property has variants (union types)
				else if (
					propSpec.variants &&
					typeof value === 'object' &&
					value !== null &&
					!Array.isArray(value)
				) {
					const variantType = value['@type'];

					if (!variantType) {
						throw new Error(`@type missing for variant property: ${key}`);
					}

					if (!(variantType in propSpec.variants)) {
						throw new Error(`Unknown variant type "${variantType}" for property: ${key}`);
					}

					const variantSpec = propSpec.variants[variantType];
					const fnStruct = variantSpec.fn_struct_make_params;

					if (!fnStruct) {
						throw new Error(`fn_struct_make_params missing for variant: ${variantType}`);
					}

					// Build nested params for the variant
					const nestedParams = buildParams(pkg, value, variantSpec, indentLevel + 1);

					let nestedCall = `${pkg}.${fnStruct}(`;
					if (nestedParams.length > 0) {
						nestedCall += '\n' + nestedParams.join(',\n') + `\n${indent}`;
					}
					nestedCall += ')';

					params.push(`${indent}${varParam}=${nestedCall}`);
				}
				// Check if this property has nested structure (non-variant)
				else if (
					propSpec.fn_struct_make_params &&
					typeof value === 'object' &&
					value !== null &&
					!Array.isArray(value)
				) {
					// Nested structure - recursively build params
					const nestedParams = buildParams(pkg, value, propSpec, indentLevel + 1);

					let nestedCall = `${pkg}.${propSpec.fn_struct_make_params}(`;
					if (nestedParams.length > 0) {
						nestedCall += '\n' + nestedParams.join(',\n') + `\n${indent}`;
					}
					nestedCall += ')';

					params.push(`${indent}${varParam}=${nestedCall}`);
				} else {
					// Simple value - format appropriately
					let formattedValue: string;

					if (typeof value === 'string') {
						formattedValue = `"${value}"`;
					} else if (typeof value === 'boolean') {
						formattedValue = value ? 'True' : 'False';
					} else if (value === null || value === undefined) {
						formattedValue = 'None';
					} else if (Array.isArray(value)) {
						// Simple array (primitives)
						formattedValue = JSON.stringify(value);
					} else {
						formattedValue = String(value);
					}

					params.push(`${indent}${varParam}=${formattedValue}`);
				}
			}

			return params;
		}

		// Extract the root function name
		const rootFn = symbolMap.fn_root_make_params_and_execute;

		if (!rootFn) {
			throw new Error('fn_root_make_params_and_execute not found in symbolMap');
		}

		const pkg = descriptorConfig['@type'].split('/')[0];

		// Build all parameters
		const params = buildParams(pkg, descriptorConfig, symbolMap, 1);

		// Construct the final function call
		let result = `from niwrap import ${pkg}\n\n`;

		result += `${pkg}.${rootFn}(`;
		if (params.length > 0) {
			result += '\n' + params.join(',\n') + '\n';
		}
		result += ')';

		return result;
	}

	export async function createPythonStaticCallFromConfig(
		descriptorConfig: Record<string, any>
	): Promise<string> {
		/**
		 * Convenience function that fetches the symbolmap and generates Python code.
		 */

		// Fetch the appropriate symbolmap
		const symbolmap = await fetchSymbolmapForConfig(descriptorConfig);

		// Generate the Python code
		const pythonCode = createPythonStaticCall(descriptorConfig, symbolmap);

		return pythonCode;
	}
</script>

<div class="space-y-6">
	{#if !isMobile}
		<header class="space-y-2">
			<div class="flex items-center justify-between">
				<div>
					<h2 class="text-xl font-semibold tracking-tight text-foreground">Results</h2>
					<p class="text-sm text-muted-foreground">Generated command and outputs</p>
				</div>
			</div>
		</header>
	{/if}

	<Tabs bind:value={activeTab} class="w-full">
		<TabsList class="grid w-full grid-cols-4">
			<TabsTrigger value="command" disabled={!hasConfig} class="flex items-center gap-2">
				<TerminalIcon class="h-3 w-3" />
				<span class:hidden={isMobile} class="xl:inline">Command</span>
			</TabsTrigger>
			<TabsTrigger value="outputs" disabled={!hasOutputs} class="flex items-center gap-2">
				<FolderTree class="h-3 w-3" />
				<span class:hidden={isMobile} class="xl:inline">Outputs</span>
				{#if hasOutputs}
					<Badge variant="secondary" class="ml-1 h-4 px-1 text-xs">
						{outputFiles.length}
					</Badge>
				{/if}
			</TabsTrigger>
			<TabsTrigger value="python" disabled={!hasConfig} class="flex items-center gap-2">
				<Code class="h-3 w-3" />
				<span class:hidden={isMobile} class="xl:inline">Python</span>
			</TabsTrigger>
			<TabsTrigger value="config" disabled={!hasConfig} class="flex items-center gap-2">
				<BracesIcon class="h-3 w-3" />
				<span class:hidden={isMobile} class="xl:inline">JSON</span>
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
							<CardDescription>
								{isMobile
									? 'Copy and run in terminal'
									: 'Copy and run this command in your terminal'}
							</CardDescription>
						</div>
						<div class="flex gap-2"></div>
					</CardHeader>
					<CardContent>
						<Terminal args={commandArgs} prompt="$ " showCursor={true} class="font-mono text-sm" />
					</CardContent>
				</Card>
			</div>
		</TabsContent>

		<TabsContent value="outputs" class="mt-6">
			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-3">
					<div>
						<CardTitle class="text-base">Expected Output Files</CardTitle>
						<CardDescription>
							{isMobile
								? 'Files generated by the command'
								: 'Files that will be generated when you run the command'}
						</CardDescription>
					</div>
					{#if !isMobile}
						<Button
							variant="outline"
							size="sm"
							onclick={() => openGithubFile(githubUrls.descriptor)}
							title="View output schema"
						>
							<ExternalLink class="h-3 w-3" />
						</Button>
					{/if}
				</CardHeader>
				<CardContent>
					<div class="rounded-lg bg-muted/50 p-4">
						<FileTreeView files={outputFiles} />
					</div>
				</CardContent>
			</Card>
		</TabsContent>

		<TabsContent value="python" class="mt-6">
			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-3">
					<div>
						<CardTitle class="text-base">Python Code</CardTitle>
						<CardDescription>
							{isMobile ? 'This config in Python' : 'Use this config in Python with NiWrap'}
						</CardDescription>
					</div>
				</CardHeader>
				<CardContent>
					{#if pythonCodeError}
						<Alert variant="destructive">
							<TriangleAlert class="h-4 w-4" />
							<AlertDescription>
								<strong>Python Code Generation Error:</strong>
								{pythonCodeError.message}
							</AlertDescription>
						</Alert>
					{:else if pythonCode}
						<CodeBlock code={pythonCode} language="python" />
					{/if}
				</CardContent>
			</Card>
		</TabsContent>

		<TabsContent value="config" class="mt-6">
			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-3">
					<div>
						<CardTitle class="text-base">Configuration JSON</CardTitle>
						<CardDescription>
							Parameter values in JSON. Can be dynamically executed using <code
								>niwrap.execute(...)</code
							>.
						</CardDescription>
					</div>
					{#if !isMobile}
						<Button
							variant="outline"
							size="sm"
							onclick={() => openGithubFile(githubUrls.schemaInput)}
							title="View input schema"
						>
							<ExternalLink class="h-3 w-3" />
						</Button>
					{/if}
				</CardHeader>
				<CardContent>
					<CodeBlock code={JSON.stringify(descriptorConfig, null, 2)} language="json" />
				</CardContent>
			</Card>
		</TabsContent>
	</Tabs>
</div>

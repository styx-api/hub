<script lang="ts">
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert';
	import Terminal from './Terminal.svelte';
	import OutputList from './OutputList.svelte';
	import CodeBlock from './CodeBlock.svelte';
	import {
		Terminal as TerminalIcon,
		FileOutput,
		TriangleAlert,
		Code,
		FileCode2,
		ExternalLink,
		BracesIcon,
		RotateCcw,
		Package,
		Download
	} from '@lucide/svelte';
	import type { BundledLanguage } from 'shiki';
	import { BUNDLED_CORE_NAME, BUNDLED_CORE_VERSION } from '$lib/services/compiler';
	import { downloadText, safeFileStem } from '$lib/utils/download';

	interface OutputEntry {
		keyPath: (string | number)[];
		filePath: string;
		pythonAccessor: string;
		title: string | null;
		description: string | null;
		isRoot: boolean;
	}

	interface Props {
		commandArgs: string[];
		outputEntries: OutputEntry[];
		descriptorConfig: object;
		/** A config the tool rejected when building the command (user-fixable). */
		configError: string | null;
		/** The in-browser compiler failed/crashed (infra, not the config). */
		compilerError: string | null;
		/** Lockstep warning when the bundled compiler differs from the release's. */
		compilerWarning: string | null;
		/** Python call snippet for the current config, or null when unavailable. */
		pythonCode: string | null;
		/** TypeScript call snippet for the current config, or null when unavailable. */
		typescriptCode: string | null;
		/** Set if the compiler failed to render the snippets (shown in both tabs). */
		snippetError: string | null;
		/** Compiled input/output JSON schemas (the integration contract). */
		inputSchema: object | null;
		outputSchema: object | null;
		/** Full generated single-tool wrapper modules (config-independent). */
		pythonModule: string | null;
		typescriptModule: string | null;
		/** App name, used for download filenames and the Source-tab heading. */
		toolName: string;
		hasConfig: boolean;
		githubUrls: { schemaInput: string; descriptor: string };
		isMobile?: boolean;
		activeTab?: string;
	}

	let {
		commandArgs,
		outputEntries,
		descriptorConfig,
		configError,
		compilerError,
		compilerWarning,
		pythonCode,
		typescriptCode,
		snippetError,
		inputSchema,
		outputSchema,
		pythonModule,
		typescriptModule,
		toolName,
		hasConfig,
		githubUrls,
		isMobile = false,
		activeTab = $bindable('command')
	}: Props = $props();

	const fileCount = $derived(outputEntries.filter((e) => !e.isRoot).length);
	const hasOutputs = $derived(outputEntries.length > 0);

	// Source artifacts (the "vendor one tool" tab). Config-independent, so they're
	// available as soon as the tool compiles - even before the form is filled.
	let sourceTab = $state('python');
	const fileStem = $derived(safeFileStem(toolName));
	const inputSchemaJson = $derived(inputSchema ? JSON.stringify(inputSchema, null, 2) : '');
	const outputSchemaJson = $derived(outputSchema ? JSON.stringify(outputSchema, null, 2) : '');
	const hasSource = $derived(Boolean(pythonModule || typescriptModule));

	function openGithubFile(url: string) {
		window.open(url, '_blank', 'noopener,noreferrer');
	}
</script>

<!-- Python and TypeScript share rendering: an error alert or the highlighted call. -->
{#snippet codeSnippet(code: string | null, language: BundledLanguage)}
	{#if snippetError}
		<Alert variant="destructive">
			<TriangleAlert class="h-4 w-4" />
			<AlertDescription>
				<strong>Code Generation Error:</strong>
				{snippetError}
			</AlertDescription>
		</Alert>
	{:else if code}
		<CodeBlock {code} {language} />
	{/if}
{/snippet}

<!-- A downloadable source artifact (a generated module or schema): filename + download, then the code. -->
{#snippet sourceArtifact(
	filename: string,
	content: string,
	language: BundledLanguage,
	mime: string
)}
	<div class="space-y-2">
		<div class="flex items-center justify-between gap-2">
			<code class="truncate text-xs text-muted-foreground">{filename}</code>
			<Button
				variant="outline"
				size="sm"
				onclick={() => downloadText(filename, content, mime)}
				class="h-7 shrink-0 cursor-pointer gap-1"
			>
				<Download class="h-3 w-3" />
				Download
			</Button>
		</div>
		<CodeBlock code={content} {language} showLineNumbers />
	</div>
{/snippet}

<div class="space-y-6">
	<!-- Lockstep (C8): the hub's compiler differs from the one that built the release. -->
	{#if compilerWarning}
		<Alert
			class="border-amber-500/40 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
		>
			<TriangleAlert class="h-4 w-4" />
			<AlertTitle>Compiler version mismatch</AlertTitle>
			<AlertDescription class="text-amber-900/90 dark:text-amber-200/90">
				{compilerWarning}
			</AlertDescription>
		</Alert>
	{/if}

	<Tabs bind:value={activeTab} class="w-full">
		<TabsList class="grid w-full grid-cols-6">
			<TabsTrigger value="command" disabled={!hasConfig} class="flex items-center gap-2">
				<TerminalIcon class="h-3.5 w-3.5" />
				<span class="sr-only xl:not-sr-only">Command</span>
			</TabsTrigger>
			<TabsTrigger value="outputs" disabled={!hasOutputs} class="flex items-center gap-2">
				<FileOutput class="h-3.5 w-3.5" />
				<span class="sr-only xl:not-sr-only">Outputs</span>
				{#if fileCount > 0}
					<Badge variant="secondary" class="ml-1 h-4 px-1 text-xs">
						{fileCount}
					</Badge>
				{/if}
			</TabsTrigger>
			<TabsTrigger value="python" disabled={!hasConfig} class="flex items-center gap-2">
				<Code class="h-3.5 w-3.5" />
				<span class="sr-only xl:not-sr-only">Python</span>
			</TabsTrigger>
			<TabsTrigger value="typescript" disabled={!hasConfig} class="flex items-center gap-2">
				<FileCode2 class="h-3.5 w-3.5" />
				<span class="sr-only xl:not-sr-only">TypeScript</span>
			</TabsTrigger>
			<TabsTrigger value="config" disabled={!hasConfig} class="flex items-center gap-2">
				<BracesIcon class="h-3.5 w-3.5" />
				<span class="sr-only xl:not-sr-only">JSON</span>
			</TabsTrigger>
			<TabsTrigger value="source" disabled={!hasSource} class="flex items-center gap-2">
				<Package class="h-3.5 w-3.5" />
				<span class="sr-only xl:not-sr-only">Source</span>
			</TabsTrigger>
		</TabsList>

		<TabsContent value="command" class="mt-4">
			<div class="space-y-4">
				{#if compilerError}
					<!-- Infrastructure failure (worker crash / lost cache), not the config. -->
					<Alert variant="destructive">
						<TriangleAlert class="h-4 w-4" />
						<AlertTitle>The in-browser compiler hit an error.</AlertTitle>
						<AlertDescription>
							<div class="flex items-start justify-between gap-4">
								<span>Reload the page to recompile this tool.</span>
								<Button
									variant="outline"
									size="sm"
									onclick={() => window.location.reload()}
									class="shrink-0 cursor-pointer"
								>
									<RotateCcw class="mr-1 h-3 w-3" />
									Reload
								</Button>
							</div>
						</AlertDescription>
					</Alert>
				{:else if configError}
					<Alert variant="destructive">
						<TriangleAlert class="h-4 w-4" />
						<AlertDescription>
							<strong>Configuration Error:</strong>
							{configError}
						</AlertDescription>
					</Alert>
				{/if}
				<div class="space-y-2">
					<h3 class="text-base font-semibold">Generated Command</h3>
					<p class="text-sm text-muted-foreground">
						{isMobile ? 'Copy and run in terminal' : 'Copy and run this command in your terminal'}
					</p>
				</div>
				<Terminal args={commandArgs} prompt="$ " showCursor={true} class="font-mono text-sm" />
			</div>
		</TabsContent>

		<TabsContent value="outputs" class="mt-4">
			<div class="space-y-4">
				<div class="flex items-center justify-between">
					<div class="space-y-1">
						<h3 class="text-base font-semibold">Expected Output Files</h3>
						<p class="text-sm text-muted-foreground">
							{isMobile
								? 'Files generated by the command'
								: 'Files that will be generated when you run the command'}
						</p>
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
				</div>
				<OutputList entries={outputEntries} />
			</div>
		</TabsContent>

		<TabsContent value="python" class="mt-4">
			<div class="space-y-4">
				<div class="space-y-1">
					<h3 class="text-base font-semibold">Python Code</h3>
					<p class="text-sm text-muted-foreground">
						{isMobile ? 'This config in Python' : 'Use this config in Python with NiWrap'}
					</p>
				</div>
				{@render codeSnippet(pythonCode, 'python')}
			</div>
		</TabsContent>

		<TabsContent value="typescript" class="mt-4">
			<div class="space-y-4">
				<div class="space-y-1">
					<h3 class="text-base font-semibold">TypeScript Code</h3>
					<p class="text-sm text-muted-foreground">
						{isMobile ? 'This config in TypeScript' : 'Use this config in TypeScript with NiWrap'}
					</p>
				</div>
				{@render codeSnippet(typescriptCode, 'typescript')}
			</div>
		</TabsContent>

		<TabsContent value="config" class="mt-4">
			<div class="space-y-4">
				<div class="flex items-center justify-between">
					<div class="space-y-1">
						<h3 class="text-base font-semibold">Configuration JSON</h3>
						<p class="text-sm text-muted-foreground">
							Parameter values in JSON. Can be dynamically executed using <code
								>niwrap.execute(...)</code
							>.
						</p>
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
				</div>
				<CodeBlock code={JSON.stringify(descriptorConfig, null, 2)} language="json" />
			</div>
		</TabsContent>

		<TabsContent value="source" class="mt-4">
			<div class="space-y-4">
				<div class="space-y-1">
					<h3 class="text-base font-semibold">Vendor this tool</h3>
					<p class="text-sm text-muted-foreground">
						The full generated wrapper for <code>{toolName}</code>. Drop a single file into your
						project and depend only on <code>styxdefs</code> - no need to install all of NiWrap.
					</p>
					<p class="text-xs text-muted-foreground">
						Generated by <code>{BUNDLED_CORE_NAME}@{BUNDLED_CORE_VERSION}</code>. You own the copy,
						so it won't pick up later fixes.
					</p>
				</div>

				<Tabs bind:value={sourceTab} class="w-full">
					<TabsList class="grid w-full grid-cols-4">
						<TabsTrigger value="python" disabled={!pythonModule}>Python</TabsTrigger>
						<TabsTrigger value="typescript" disabled={!typescriptModule}>TypeScript</TabsTrigger>
						<TabsTrigger value="input-schema" disabled={!inputSchemaJson}>
							{isMobile ? 'Input' : 'Input schema'}
						</TabsTrigger>
						<TabsTrigger value="output-schema" disabled={!outputSchemaJson}>
							{isMobile ? 'Output' : 'Output schema'}
						</TabsTrigger>
					</TabsList>

					<TabsContent value="python" class="mt-4">
						<div class="space-y-3">
							<p class="text-sm text-muted-foreground">
								Then <code>pip install styxdefs</code> and import from this module.
							</p>
							{#if pythonModule}
								{@render sourceArtifact(`${fileStem}.py`, pythonModule, 'python', 'text/x-python')}
							{/if}
						</div>
					</TabsContent>

					<TabsContent value="typescript" class="mt-4">
						<div class="space-y-3">
							<p class="text-sm text-muted-foreground">
								Then <code>npm install styxdefs</code> and import from this module.
							</p>
							{#if typescriptModule}
								{@render sourceArtifact(
									`${fileStem}.ts`,
									typescriptModule,
									'typescript',
									'text/plain'
								)}
							{/if}
						</div>
					</TabsContent>

					<TabsContent value="input-schema" class="mt-4">
						<div class="space-y-3">
							<p class="text-sm text-muted-foreground">
								JSON Schema for this tool's inputs - a language-neutral contract for validation or
								building your own form.
							</p>
							{#if inputSchemaJson}
								{@render sourceArtifact(
									`${fileStem}.schema.json`,
									inputSchemaJson,
									'json',
									'application/json'
								)}
							{/if}
						</div>
					</TabsContent>

					<TabsContent value="output-schema" class="mt-4">
						<div class="space-y-3">
							<p class="text-sm text-muted-foreground">
								JSON Schema describing the files and streams the tool produces.
							</p>
							{#if outputSchemaJson}
								{@render sourceArtifact(
									`${fileStem}.outputs.schema.json`,
									outputSchemaJson,
									'json',
									'application/json'
								)}
							{/if}
						</div>
					</TabsContent>
				</Tabs>
			</div>
		</TabsContent>
	</Tabs>
</div>

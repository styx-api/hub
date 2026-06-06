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
		RotateCcw
	} from '@lucide/svelte';
	import type { BundledLanguage } from 'shiki';

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
		hasConfig,
		githubUrls,
		isMobile = false,
		activeTab = $bindable('command')
	}: Props = $props();

	const fileCount = $derived(outputEntries.filter((e) => !e.isRoot).length);
	const hasOutputs = $derived(outputEntries.length > 0);

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
		<TabsList class="grid w-full grid-cols-5">
			<TabsTrigger value="command" disabled={!hasConfig} class="flex items-center gap-2">
				<TerminalIcon class="h-3.5 w-3.5" />
				<span class:hidden={isMobile} class="xl:inline">Command</span>
			</TabsTrigger>
			<TabsTrigger value="outputs" disabled={!hasOutputs} class="flex items-center gap-2">
				<FileOutput class="h-3.5 w-3.5" />
				<span class:hidden={isMobile} class="xl:inline">Outputs</span>
				{#if fileCount > 0}
					<Badge variant="secondary" class="ml-1 h-4 px-1 text-xs">
						{fileCount}
					</Badge>
				{/if}
			</TabsTrigger>
			<TabsTrigger value="python" disabled={!hasConfig} class="flex items-center gap-2">
				<Code class="h-3.5 w-3.5" />
				<span class:hidden={isMobile} class="xl:inline">Python</span>
			</TabsTrigger>
			<TabsTrigger value="typescript" disabled={!hasConfig} class="flex items-center gap-2">
				<FileCode2 class="h-3.5 w-3.5" />
				<span class:hidden={isMobile} class="xl:inline">TypeScript</span>
			</TabsTrigger>
			<TabsTrigger value="config" disabled={!hasConfig} class="flex items-center gap-2">
				<BracesIcon class="h-3.5 w-3.5" />
				<span class:hidden={isMobile} class="xl:inline">JSON</span>
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
	</Tabs>
</div>

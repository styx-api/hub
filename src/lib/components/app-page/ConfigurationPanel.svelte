<script lang="ts">
	import SchemaForm from '../schema-form/SchemaForm.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert';
	import { describeLoadError } from '$lib/services/compiler';
	import { descriptorSourceInfo } from '$lib/utils/descriptorSource';
	import {
		TriangleAlert,
		RefreshCw,
		LoaderCircle,
		Settings,
		FileJson,
		Share2,
		Check
	} from '@lucide/svelte';

	interface Props {
		descriptorInputSchema: object | null;
		descriptorConfig: object;
		isLoading: boolean;
		error: string | null;
		githubUrls: { descriptorSource: string };
		/** Source descriptor format (boutiques | workbench | ...); drives the provenance chip. */
		sourceFormat?: string | null;
		isMobile?: boolean;
		onRetry: () => void;
		onShare?: () => void;
	}

	let {
		descriptorInputSchema,
		descriptorConfig = $bindable(),
		isLoading,
		error,
		githubUrls,
		sourceFormat = null,
		isMobile = false,
		onRetry,
		onShare
	}: Props = $props();

	const hasConfig = $derived(Object.keys(descriptorConfig).length > 0);
	// Turn a raw fetch/compile diagnostic into a clean headline + tidied detail.
	const loadError = $derived(error ? describeLoadError(error) : null);
	// Where this wrapper came from: labels the provenance chip + its source link.
	const source = $derived(descriptorSourceInfo(sourceFormat));
	let showCopied = $state(false);

	async function handleShare() {
		if (onShare) {
			await onShare();
			showCopied = true;
			setTimeout(() => {
				showCopied = false;
			}, 2000);
		}
	}
</script>

<div class="space-y-6">
	<header class="space-y-2 border-b border-border/30 pb-4">
		<div class="flex items-center justify-between">
			<div class:space-y-1={isMobile}>
				<h1 class="text-xl font-bold tracking-tight text-foreground">Configuration</h1>
				<p class="text-sm text-muted-foreground">Set parameters to generate command</p>
			</div>
			<div class="flex gap-2">
				{#if onShare && hasConfig}
					<Button
						variant="default"
						size="sm"
						onclick={handleShare}
						class="h-8 cursor-pointer"
						title={showCopied ? 'Copied!' : 'Copy shareable link'}
					>
						{#if showCopied}
							<Check class="mr-1 h-3 w-3" />
						{:else}
							<Share2 class="mr-1 h-3 w-3" />
						{/if}
						<span class="hidden xl:inline">{showCopied ? 'Copied!' : 'Share'}</span>
					</Button>
				{/if}
				{#if source}
					<Button
						variant="outline"
						size="sm"
						href={githubUrls.descriptorSource}
						target="_blank"
						rel="noopener noreferrer"
						class="h-8 cursor-pointer"
						title={`Generated from ${source.blurb}. View the source on GitHub.`}
					>
						<FileJson class="mr-1 h-3 w-3 text-muted-foreground" />
						<span>{source.label}</span>
					</Button>
				{/if}
			</div>
		</div>
	</header>

	<div class="space-y-6">
		{#if isLoading}
			<div class="flex items-center justify-center py-12">
				<div class="flex items-center space-x-3">
					<LoaderCircle class="h-5 w-5 animate-spin text-primary" />
					<div class="text-sm text-muted-foreground">Loading configuration schema...</div>
				</div>
			</div>
		{:else if loadError}
			<Alert variant="destructive">
				<TriangleAlert class="h-4 w-4" />
				<AlertTitle>{loadError.title}</AlertTitle>
				<AlertDescription>
					<div class="flex items-start justify-between gap-4">
						<p class="text-sm">
							Retrying may help. If it persists, the tool's descriptor may be unavailable or need a
							fix.
						</p>
						<Button variant="outline" size="sm" onclick={onRetry} class="shrink-0 cursor-pointer">
							<RefreshCw class="mr-1 h-3 w-3" />
							Retry
						</Button>
					</div>
					{#if loadError.detail}
						<details class="mt-2">
							<summary class="cursor-pointer text-xs opacity-70">Technical details</summary>
							<pre
								class="mt-1 overflow-x-auto text-xs whitespace-pre-wrap opacity-80">{loadError.detail}</pre>
						</details>
					{/if}
				</AlertDescription>
			</Alert>
		{:else if descriptorInputSchema}
			<SchemaForm schema={descriptorInputSchema} bind:value={descriptorConfig} />
		{:else}
			<div class="flex flex-col items-center justify-center py-12 text-center">
				<div class="mb-4 rounded-full bg-muted p-3">
					<Settings class="h-6 w-6 text-muted-foreground" />
				</div>
				<p class="mb-2 text-base font-semibold">No Configuration Required</p>
				<p class="text-sm text-muted-foreground">
					This app doesn't require configuration parameters.
				</p>
			</div>
		{/if}
	</div>
</div>

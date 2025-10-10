<script lang="ts">
	import SchemaForm from '../schema-form/SchemaForm.svelte';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { TriangleAlert, RefreshCw, LoaderCircle, Settings, Github, Share2, Check } from '@lucide/svelte';

	interface Props {
		descriptorInputSchema: object | null;
		descriptorConfig: object;
		isLoading: boolean;
		error: string | null;
		githubUrls: { schemaInput: string; descriptor: string };
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
		isMobile = false,
		onRetry,
		onShare
	}: Props = $props();

	const hasConfig = $derived(Object.keys(descriptorConfig).length > 0);
	let showCopied = $state(false);

	function openGithubFile(url: string) {
		window.open(url, '_blank', 'noopener,noreferrer');
	}

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
	<header class="space-y-2">
		<div class="flex items-center justify-between">
			<div class:space-y-1={isMobile}>
				<h1
					class="font-semibold tracking-tight text-foreground"
					class:text-lg={isMobile}
					class:text-xl={!isMobile}
				>
					Configuration
				</h1>
				<p class="text-sm text-muted-foreground">Set parameters to generate command</p>
			</div>
			<div class="flex gap-2">
				{#if onShare && hasConfig}
					<Button
						variant="default"
						size="sm"
						onclick={handleShare}
						class="h-8 cursor-pointer"
						title={showCopied ? "Copied!" : "Copy shareable link"}
					>
						{#if showCopied}
							<Check class="h-3 w-3 mr-1" />
						{:else}
							<Share2 class="h-3 w-3 mr-1" />
						{/if}
						<span class="hidden xl:inline">{showCopied ? 'Copied!' : 'Share'}</span>
					</Button>
				{/if}
				{#if isMobile}
					<Button
						variant="outline"
						size="sm"
						onclick={() => openGithubFile(githubUrls.descriptor)}
						class="h-8 w-8 p-0 cursor-pointer"
						title="View descriptor on GitHub"
					>
						<Github class="h-3 w-3" />
					</Button>
				{:else}
					<Button
						variant="outline"
						size="sm"
						onclick={() => openGithubFile(githubUrls.descriptor)}
						class="h-8 cursor-pointer"
						title="View descriptor on GitHub"
					>
						<Github class="mr-1 h-3 w-3" />
						<span class="hidden xl:inline">Descriptor</span>
					</Button>
				{/if}
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
					<Button variant="outline" size="sm" onclick={onRetry} class="ml-4 shrink-0 cursor-pointer">
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
					<CardDescription>This app doesn't require configuration parameters.</CardDescription>
				</CardContent>
			</Card>
		{/if}
	</div>
</div>
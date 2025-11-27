<!-- CodeBlock.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { cn } from '$lib/utils';
	import { Button } from '$lib/components/ui/button';
	import { Check, Copy } from '@lucide/svelte';
	import type { BundledLanguage, BundledTheme } from 'shiki';
	import { getShikiHighlighter } from '$lib/services/highlighter';

	interface Props {
		code: string;
		language?: BundledLanguage;
		lightTheme?: BundledTheme;
		darkTheme?: BundledTheme;
		showCopyButton?: boolean;
		showLineNumbers?: boolean;
		title?: string;
		class?: string;
	}

	let {
		code,
		language = 'javascript',
		lightTheme = 'material-theme-lighter',
		darkTheme = 'material-theme',
		showCopyButton = true,
		showLineNumbers = false,
		title,
		class: className
	}: Props = $props();

	let highlightedCode = $state<string>('');
	let isLoading = $state<boolean>(true);
	let error = $state<string | null>(null);
	let copied = $state<boolean>(false);
	let isDarkMode = $state<boolean>(false);

	function updateDarkMode() {
		isDarkMode = document.documentElement.classList.contains('dark');
	}

	async function getHighlighter() {
		return getShikiHighlighter();
	}

	let currentTheme = $derived(isDarkMode ? darkTheme : lightTheme);

	async function highlightCode() {
		if (!code.trim()) {
			highlightedCode = '';
			return;
		}

		try {
			const highlighter = await getHighlighter();

			highlightedCode = highlighter.codeToHtml(code, {
				lang: language,
				theme: currentTheme,
				transformers: showLineNumbers
					? [
							{
								name: 'line-numbers',
								line(node: any, line: any) {
									node.children.unshift({
										type: 'element',
										tagName: 'span',
										properties: {
											class: 'line-number',
											'data-line': line.toString()
										},
										children: []
									});
								}
							}
						]
					: []
			});

			error = null;
		} catch (err) {
			error = `Failed to highlight code: ${err}`;
			console.error('Code highlighting error:', err);
		}
	}

	onMount(() => {
		updateDarkMode();

		// Watch for changes to document class list
		const observer = new MutationObserver((mutations) => {
			mutations.forEach((mutation) => {
				if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
					updateDarkMode();
				}
			});
		});

		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['class']
		});

		// Initialize highlighting
		isLoading = true;
		highlightCode().then(() => {
			isLoading = false;
		});

		// Cleanup observer on component destroy
		return () => {
			observer.disconnect();
		};
	});

	// Re-highlight when dependencies change
	$effect(() => {
		const theme = currentTheme;
		if (!isLoading) {
			highlightCode();
		}
	});

	async function copyToClipboard() {
		try {
			await navigator.clipboard.writeText(code);
			copied = true;
			setTimeout(() => {
				copied = false;
			}, 2000);
		} catch (err) {
			console.error('Failed to copy code:', err);
		}
	}
</script>

<div class={cn('relative overflow-hidden rounded-lg border bg-muted', className)}>
	{#if title}
		<div class="flex items-center justify-between border-b bg-muted/50 px-4 py-2">
			<span class="text-sm font-medium text-muted-foreground">{title}</span>
			{#if showCopyButton}
				<Button
					variant="ghost"
					size="sm"
					onclick={copyToClipboard}
					class="h-6 w-6 cursor-pointer p-0"
					aria-label="Copy code"
				>
					{#if copied}
						<Check class="h-3 w-3" />
					{:else}
						<Copy class="h-3 w-3" />
					{/if}
				</Button>
			{/if}
		</div>
	{:else if showCopyButton}
		<div class="absolute top-2 right-2 z-10">
			<Button
				variant="ghost"
				size="sm"
				onclick={copyToClipboard}
				class="h-6 w-6 cursor-pointer p-0 opacity-70 transition-opacity hover:opacity-100"
				aria-label="Copy code"
			>
				{#if copied}
					<Check class="h-3 w-3" />
				{:else}
					<Copy class="h-3 w-3" />
				{/if}
			</Button>
		</div>
	{/if}

	<div class="group relative">
		{#if isLoading}
			<div class="flex items-center justify-center p-8">
				<div class="text-sm text-muted-foreground">Loading syntax highlighter...</div>
			</div>
		{:else if error}
			<div class="p-4 text-sm text-destructive">
				{error}
			</div>
			<pre class="overflow-x-auto p-4 text-sm"><code>{code}</code></pre>
		{:else}
			<div class="overflow-x-auto">
				{@html highlightedCode}
			</div>
		{/if}
	</div>
</div>

<style>
	/* Custom styles for line numbers if enabled */
	:global(.line-number) {
		margin-right: 1rem;
		display: inline-block;
		width: 2rem;
		text-align: right;
		color: hsl(var(--muted-foreground) / 0.5);
		counter-increment: line-counter;
	}

	:global(.line-number::before) {
		content: counter(line-counter);
	}

	/* Ensure proper spacing and styling for Shiki output */
	:global(.shiki) {
		background-color: transparent !important;
		padding: 1rem;
		font-size: 0.875rem;
		counter-reset: line-counter;
	}

	:global(.shiki pre) {
		background-color: transparent !important;
		padding: 0 !important;
		margin: 0 !important;
	}

	:global(.shiki code) {
		background-color: transparent !important;
	}

	/* Make copy button visible on hover */
	:global(.group:hover .group-hover\\:opacity-100) {
		opacity: 1 !important;
	}
</style>

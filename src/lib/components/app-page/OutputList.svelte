<script lang="ts">
	import { FileText, FolderOpen, Copy, FileX2 } from '@lucide/svelte';
	import { cn } from '$lib/utils';
	import { copyToClipboard } from '$lib/utils/clipboard';
	import { toast } from 'svelte-sonner';

	interface OutputEntry {
		keyPath: (string | number)[];
		filePath: string;
		pythonAccessor: string;
		title: string | null;
		description: string | null;
		isRoot: boolean;
	}

	interface Props {
		entries: OutputEntry[];
		class?: string;
	}

	let { entries, class: className }: Props = $props();

	const rootEntry = $derived(entries.find((e) => e.isRoot));
	const fileEntries = $derived(entries.filter((e) => !e.isRoot));

	function copyAccessor(accessor: string) {
		copyToClipboard(accessor)
			.then(() => {
				toast.success('Copied to clipboard!');
			})
			.catch((err) => {
				console.error('Failed to copy:', err);
				toast.error('Failed to copy to clipboard');
			});
	}
</script>

<div class={cn('w-full', className)}>
	{#if entries.length === 0}
		<div
			class="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/50 bg-muted/20 py-8 text-center"
		>
			<FileX2 class="mb-2 h-8 w-8 text-muted-foreground/50" />
			<p class="text-sm text-muted-foreground">No output files</p>
		</div>
	{:else}
		{#if rootEntry}
			<div
				class="mb-3 flex items-center gap-2 rounded-md border border-border/30 bg-muted/20 px-3 py-2"
			>
				<FolderOpen class="h-4 w-4 flex-shrink-0 text-muted-foreground" />
				<span class="font-mono text-sm text-muted-foreground">{rootEntry.filePath}</span>
				{#if rootEntry.title}
					<span class="mx-1 text-muted-foreground/40">|</span>
					<span class="text-xs text-muted-foreground/70">{rootEntry.title}</span>
				{/if}
			</div>
		{/if}

		<div class="space-y-1">
			{#each fileEntries as entry}
				<div class="group rounded-md px-3 py-2 transition-colors hover:bg-accent/50">
					<div class="flex items-center justify-between gap-2">
						<div class="flex min-w-0 items-center gap-2">
							<FileText class="h-4 w-4 flex-shrink-0 text-muted-foreground" />
							<span class="truncate font-mono text-sm font-medium">{entry.filePath}</span>
						</div>
						<button
							class={cn(
								'flex flex-shrink-0 items-center gap-1 rounded-md border px-2 py-1 font-mono text-xs transition-all duration-150',
								'cursor-pointer border-border bg-secondary text-secondary-foreground',
								'opacity-0 group-hover:opacity-100',
								'hover:border-border/80 hover:bg-secondary/80 hover:shadow-sm',
								'active:scale-95 active:bg-secondary/60',
								'focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:outline-none'
							)}
							onclick={() => copyAccessor(entry.pythonAccessor)}
							title="Copy Python accessor"
							type="button"
						>
							<Copy class="h-3 w-3" />
							{entry.pythonAccessor}
						</button>
					</div>
					{#if entry.title}
						<p class="mt-1 pl-6 text-xs text-muted-foreground">{entry.title}</p>
					{/if}
					{#if entry.description}
						<p class="mt-0.5 pl-6 text-xs text-muted-foreground/70">{entry.description}</p>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<script lang="ts">
	import * as Popover from '$lib/components/ui/popover';
	import { parseGlossaryText } from '$lib/services/glossary';

	let { text }: { text: string } = $props();

	let segments = $derived(parseGlossaryText(text));
</script>

{#each segments as segment}
	{#if segment.type === 'text'}
		{segment.content}
	{:else}
		<Popover.Root>
			<Popover.Trigger class="cursor-help border-b border-dotted border-foreground/40">
				{#snippet child({ props })}
					<span {...props}>{segment.content}</span>
				{/snippet}
			</Popover.Trigger>
			<Popover.Content
				class="w-auto max-w-xs rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground shadow-md"
			>
				<p class="font-semibold">{segment.entry.title}</p>
				<p class="mt-0.5 text-primary-foreground/80">{segment.entry.description}</p>
			</Popover.Content>
		</Popover.Root>
	{/if}
{/each}

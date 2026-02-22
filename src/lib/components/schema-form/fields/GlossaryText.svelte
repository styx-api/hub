<script lang="ts">
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { parseGlossaryText } from '$lib/services/glossary';

	let { text }: { text: string } = $props();

	let segments = $derived(parseGlossaryText(text));
</script>

<Tooltip.Provider delayDuration={300}>
	{#each segments as segment}
		{#if segment.type === 'text'}
			{segment.content}
		{:else}
			<Tooltip.Root>
				<Tooltip.Trigger class="cursor-help border-b border-dotted border-foreground/40">
					{#snippet child({ props })}
						<span {...props}>{segment.content}</span>
					{/snippet}
				</Tooltip.Trigger>
				<Tooltip.Content>
					<p class="font-semibold">{segment.entry.title}</p>
					<p class="mt-0.5 text-primary-foreground/80">{segment.entry.description}</p>
				</Tooltip.Content>
			</Tooltip.Root>
		{/if}
	{/each}
</Tooltip.Provider>

<script lang="ts">
	import FieldRenderer from '../FieldRenderer.svelte';
	import type { FieldProps } from '../types';
	import { isSchemaObject } from '$lib/services/schema/schema';
	import { getFieldLabel } from '../utils';
	import GlossaryText from './GlossaryText.svelte';

	let { schema, value, path, onUpdate }: FieldProps = $props();

	let fieldName: string = $state('');

	$effect(() => {
		fieldName = getFieldLabel(path);
	});
</script>

<div class="space-y-4">
	<div>
		<span class="text-sm font-semibold text-foreground">{schema.title || fieldName}</span>
		{#if schema.description}
			<p class="mt-1 text-sm leading-relaxed text-foreground/70">
				<GlossaryText text={schema.description} />
			</p>
		{/if}
	</div>

	{#if schema.properties && value && typeof value === 'object'}
		<div class={path.length > 1 ? 'space-y-4 border-l-2 border-border/50 pl-4' : 'space-y-4'}>
			{#each Object.entries(schema.properties) as [key, propSchema]}
				{#if key !== '@type' && isSchemaObject(propSchema)}
					<FieldRenderer
						schema={propSchema}
						value={value[key]}
						path={[...path, key]}
						required={schema.required?.includes(key)}
						{onUpdate}
					/>
				{/if}
			{/each}
		</div>
	{/if}
</div>

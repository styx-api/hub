<script lang="ts">
	import FieldRenderer from '../FieldRenderer.svelte';
	import type { FieldProps } from '../types';
	import { isSchemaObject } from '$lib/services/schema/schema';
	import { getFieldLabel } from '../utils';

	let { schema, value, path, onUpdate }: FieldProps = $props();

	let fieldName: string = $state('');

	$effect(() => {
		fieldName = getFieldLabel(path);
	});
</script>

<div class="relative space-y-4">
	<div class="space-y-2">
		<span class="text-l font-semibold text-foreground">{schema.title || fieldName}</span>
		{#if schema.description}
			<p class="text-xs text-muted-foreground">{schema.description}</p>
		{/if}
	</div>
	{#if schema.properties && value && typeof value === 'object'}
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
	{/if}
</div>

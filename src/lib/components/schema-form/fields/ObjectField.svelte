<!-- fields/ObjectField.svelte -->
<script lang="ts">
	// import { Badge } from '$lib/components/ui/badge';
	import FieldRenderer from '../FieldRenderer.svelte';
	import type { FieldProps } from '../types';
	import { isObjectSchema, isSchemaObject, type JSONSchema } from '$lib/services/schema/schema';
	import { getFieldLabel } from '../utils';

	let { schema, value, path, required, onUpdate }: FieldProps = $props();

	let objectSchema: JSONSchema.Object = $state({});

	let fieldName: string = $state('');

	$effect(() => {
		if (isObjectSchema(schema)) {
			objectSchema = schema;
		}
	});

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
	{#if schema.properties && value}
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

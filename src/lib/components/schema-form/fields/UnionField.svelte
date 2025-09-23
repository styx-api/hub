<!-- fields/UnionField.svelte -->
<script lang="ts">
	import * as Select from '$lib/components/ui/select/index.js';
	import { Separator } from '$lib/components/ui/separator';
	import FieldRenderer from '../FieldRenderer.svelte';
	import { getSchemaDefaultValue } from '../../../services/schema/defaultValue';
	import type { FieldProps } from '../types';
	import { isObjectSchema, isSchemaObject, type JSONSchema } from '$lib/services/schema/schema';
	import { isUnion } from '$lib/services/schema/schemaUtils';
	import { type RequireField } from '$lib/utils/utils';
	import { getFieldLabel } from '../utils';

	let { schema, value, path, required, onUpdate }: FieldProps = $props();

	type TypeAlternativeInfo = {
		value: string;
		label: string;
		schema: JSONSchema.Object;
	};

	let unionSchema: RequireField<JSONSchema.Object, 'anyOf'> = $state({ anyOf: [] });
	let fieldName: string = $state('Union');
	let currentType: string = $state('');
	let typeOptions: TypeAlternativeInfo[] = $state([]);
	let selectedSchema: TypeAlternativeInfo | undefined = $state(undefined);

	function getTypeInfo(schema: JSONSchema.Object): TypeAlternativeInfo {
		const typeTag: string = (schema?.properties?.['@type'] as any)?.const ?? 'unknown';
		return {
			value: typeTag,
			label: schema.title || typeTag,
			schema: schema
		};
	}

	$effect(() => {
		if (isUnion(schema)) {
			unionSchema = schema;

			typeOptions = unionSchema.anyOf
				.filter(isObjectSchema)
				.filter((x) => typeof x !== 'boolean')
				.map(getTypeInfo);
		}
	});

	$effect(() => {
		fieldName = getFieldLabel(path);
		currentType = value?.['@type'] || '';
		selectedSchema = typeOptions.find((t) => t.value === currentType);
	});

	function handleTypeChange(newType: string) {
		selectedSchema = typeOptions.find((t) => t.value === newType);
		if (selectedSchema) {
			const defaultVal = getSchemaDefaultValue(selectedSchema.schema);
			// Ensure @type is set
			if (typeof defaultVal === 'object' && defaultVal !== null) {
				defaultVal['@type'] = newType;
			}
			onUpdate(path, defaultVal);
		}
	}
</script>

<div class="relative space-y-4">
	<div class="space-y-2">
		<span class="text-l font-semibold text-foreground">{schema.title || fieldName}</span>
		{#if schema.description}
			<p class="text-xs text-muted-foreground">{schema.description}</p>
		{/if}
	</div>

	<Select.Root type="single" value={currentType} onValueChange={handleTypeChange}>
		<Select.Trigger class="w-full">
			{selectedSchema?.label || 'Select something...'}
		</Select.Trigger>
		<Select.Content>
			{#each typeOptions as option}
				<Select.Item value={option.value}>{option.label}</Select.Item>
			{/each}
		</Select.Content>
	</Select.Root>

	{#if selectedSchema && isSchemaObject(selectedSchema.schema)}
		<Separator />
		<div class="space-y-4">
			<FieldRenderer
				schema={selectedSchema.schema}
				{value}
				path={[...path]}
				required={true}
				{onUpdate}
			/>
		</div>
	{/if}
</div>

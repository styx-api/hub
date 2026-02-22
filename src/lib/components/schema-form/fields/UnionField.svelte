<script lang="ts">
	import * as Select from '$lib/components/ui/select/index.js';
	import { Badge } from '$lib/components/ui/badge';
	import FieldRenderer from '../FieldRenderer.svelte';
	import { getSchemaDefaultValue } from '../../../services/schema/defaultValue';
	import type { FieldProps } from '../types';
	import { isObjectSchema, isSchemaObject, type JSONSchema } from '$lib/services/schema/schema';
	import { isUnion } from '$lib/services/schema/schemaUtils';
	import { type RequireField } from '$lib/utils/utils';
	import { getFieldLabel } from '../utils';
	import GlossaryText from './GlossaryText.svelte';

	let { schema, value, path, onUpdate }: FieldProps = $props();

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

<div class="space-y-3">
	<div>
		<div class="flex items-center gap-2">
			<span class="text-sm font-semibold text-foreground">{schema.title || fieldName}</span>
			<Badge variant="outline" class="px-1.5 py-0 text-[10px]">
				{typeOptions.length}
				{typeOptions.length === 1 ? 'type' : 'types'}
			</Badge>
		</div>
		{#if schema.description}
			<p class="mt-1 text-sm leading-relaxed text-foreground/70">
				<GlossaryText text={schema.description} />
			</p>
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
		<div class="space-y-4 border-l-2 border-border/50 pl-4">
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

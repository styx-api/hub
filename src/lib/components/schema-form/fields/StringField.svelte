<!-- fields/StringField.svelte -->
<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import { isStringSchema, type JSONSchema } from '$lib/services/schema/schema';
	import { simpleClone } from '$lib/utils/utils';
	import type { FieldProps } from '../types';
	import { getFieldLabel, getFieldId } from '../utils';
	import FieldSnippet from './FieldSnippet.svelte';

	let { schema, value, path, required, onUpdate }: FieldProps = $props();

	let stringSchema: JSONSchema.String = $state({});
	let hasEnum: boolean = $state(false);
	let enumOptions: string[] = $state([]);

	let fieldName: string = $state('');
	let fieldId: string = $state('');

	$effect(() => {
		if (isStringSchema(schema)) {
			stringSchema = schema;
			hasEnum = Array.isArray(stringSchema.enum) && stringSchema.enum.length > 0;
			enumOptions = hasEnum ? (simpleClone(stringSchema.enum!!) as string[]) : [];
		}
	});

	$effect(() => {
		fieldName = getFieldLabel(path);
		fieldId = getFieldId(path, 'string');
	});

	function handleInputChange(e: Event) {
		const newValue = (e.target as HTMLInputElement).value;
		onUpdate(path, newValue || (required ? '' : undefined));
	}

	function handleSelectChange(selectedValue: string | undefined) {
		onUpdate(path, selectedValue || (required ? '' : undefined));
	}
</script>

<FieldSnippet
	title={stringSchema.title || fieldName}
	description={stringSchema.description}
	{required}
	labelFor={fieldId}
>
	{#if hasEnum}
		<Select.Root type="single" value={value || ''} onValueChange={handleSelectChange}>
			<Select.Trigger
				id={fieldId}
				class={required && !value ? 'w-full border-destructive' : 'w-full'}
			>
				{value || stringSchema.default || `Select ${fieldName}`}
			</Select.Trigger>
			<Select.Content>
				{#each enumOptions as option}
					<Select.Item value={option}>{option}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
	{:else}
		<Input
			id={fieldId}
			type="text"
			value={value || ''}
			oninput={handleInputChange}
			placeholder={stringSchema.default || `Enter ${fieldName}`}
			class={required && !value ? 'border-destructive' : ''}
		/>
	{/if}
</FieldSnippet>

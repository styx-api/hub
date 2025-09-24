<!-- fields/NumberField.svelte -->
<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import { isIntegerSchema, isNumberSchema, type JSONSchema } from '$lib/services/schema/schema';
	import { simpleClone } from '$lib/utils/utils';
	import type { FieldProps } from '../types';
	import { getFieldId, getFieldLabel } from '../utils';
	import FieldSnippet from './FieldSnippet.svelte';

	let { schema, value, path, required, onUpdate }: FieldProps = $props();

	let numberSchema: JSONSchema.Number | JSONSchema.Integer = $state({});
	let isInteger: boolean = $state(false);
	let hasEnum: boolean = $state(false);
	let enumOptions: number[] = $state([]);

	let fieldName: string = $state('');
	let fieldId: string = $state('');

	$effect(() => {
		const isInt = isIntegerSchema(schema);
		if (isInt || isNumberSchema(schema)) {
			numberSchema = schema;
			isInteger = isInt;
			hasEnum = Array.isArray(numberSchema.enum) && numberSchema.enum.length > 0;
			enumOptions = hasEnum ? (simpleClone(numberSchema.enum!!) as number[]) : [];
		}
	});

	$effect(() => {
		fieldName = getFieldLabel(path);
		fieldId = getFieldId(path, 'number');
	});

	function handleInputChange(e: Event) {
		const val = (e.target as HTMLInputElement).value;
		if (val === '') {
			onUpdate(path, required ? 0 : undefined);
		} else {
			const num = isInteger ? parseInt(val) : parseFloat(val);
			if (!isNaN(num)) {
				onUpdate(path, num);
			}
		}
	}

	function handleSelectChange(selectedValue: string | undefined) {
		if (selectedValue === undefined || selectedValue === '') {
			onUpdate(path, required ? 0 : undefined);
		} else {
			const num = isInteger ? parseInt(selectedValue) : parseFloat(selectedValue);
			if (!isNaN(num)) {
				onUpdate(path, num);
			}
		}
	}
</script>

<FieldSnippet
	title={numberSchema.title || fieldName}
	description={numberSchema.description}
	{required}
	labelFor={fieldId}
>
	{#if hasEnum}
		<Select.Root type="single" value={value?.toString() || ''} onValueChange={handleSelectChange}>
			<Select.Trigger
				id={fieldId}
				class={required && value === undefined ? 'w-full border-destructive' : 'w-full'}
			>
				{value?.toString() || numberSchema.default?.toString() || `Select ${fieldName}`}
			</Select.Trigger>
			<Select.Content>
				{#each enumOptions as option}
					<Select.Item value={option.toString()}>{option}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
	{:else}
		<Input
			id={fieldId}
			type="number"
			step={isInteger ? '1' : 'any'}
			value={value ?? ''}
			min={numberSchema.minimum}
			max={numberSchema.maximum}
			oninput={handleInputChange}
			placeholder="0"
			class={required && value === undefined ? 'border-destructive' : ''}
		/>
	{/if}
</FieldSnippet>

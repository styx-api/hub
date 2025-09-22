<!-- fields/NumberField.svelte -->
<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { isIntegerSchema, isNumberSchema, type JSONSchema } from '$lib/services/schema/schema';
	import type { FieldProps } from '../types';
	import { getFieldId, getFieldLabel } from '../utils';
	import FieldSnippet from './FieldSnippet.svelte';

	let { schema, value, path, required, onUpdate }: FieldProps = $props();

	let numberSchema: JSONSchema.Number = $state({});
	let isInteger: boolean = $state(false);

	let fieldName: string = $state('');
	let fieldId: string = $state('');

	$effect(() => {
		if (isNumberSchema(schema)) {
			numberSchema = schema;
			isInteger = isIntegerSchema(schema);
		}
	});

	$effect(() => {
		fieldName = getFieldLabel(path);
		fieldId = getFieldId(path, 'number');
	});

	function handleChange(e: Event) {
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
</script>

<FieldSnippet
	title={numberSchema.title || fieldName}
	description={numberSchema.description}
	{required}
	labelFor={fieldId}
>
	<Input
		id={fieldId}
		type="number"
		step={isInteger ? '1' : 'any'}
		value={value ?? ''}
		min={schema.minimum}
		max={schema.maximum}
		oninput={handleChange}
		placeholder="0"
		class={required && value === undefined ? 'border-destructive' : ''}
	/>
</FieldSnippet>

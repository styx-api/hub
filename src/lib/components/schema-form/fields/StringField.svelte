<!-- fields/StringField.svelte -->
<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { isStringSchema, type JSONSchema } from '$lib/services/schema/schema';
	import type { FieldProps } from '../types';
	import { getFieldLabel, getFieldId } from '../utils';
	import FieldSnippet from './FieldSnippet.svelte';

	let { schema, value, path, required, onUpdate }: FieldProps = $props();

	let stringSchema: JSONSchema.String = $state({});

	let fieldName: string = $state('');
	let fieldId: string = $state('');

	$effect(() => {
		if (isStringSchema(schema)) {
			stringSchema = schema;
		}
	});

	$effect(() => {
		fieldName = getFieldLabel(path);
		fieldId = getFieldId(path, 'string');
	});

	function handleChange(e: Event) {
		const newValue = (e.target as HTMLInputElement).value;
		onUpdate(path, newValue || (required ? '' : undefined));
	}
</script>

<FieldSnippet
	title={stringSchema.title || fieldName}
	description={stringSchema.description}
	{required}
	labelFor={fieldId}
>
	<Input
	  id={fieldId}
		type="text"
		value={value || ''}
		oninput={handleChange}
		placeholder={stringSchema.default || `Enter ${fieldName}`}
		class={required && !value ? 'border-destructive' : ''}
	/>
</FieldSnippet>

<script lang="ts">
	import * as Select from '$lib/components/ui/select';
	import type { FieldProps } from '../types';
	import { getFieldLabel, getFieldId } from '../utils';
	import FieldSnippet from './FieldSnippet.svelte';

	let { schema, value, path, required, onUpdate }: FieldProps = $props();

	// styx2 emits enums bare (`{ enum: [...] }`) with no `type`, and the values may
	// be strings OR numbers (e.g. dimensionality is `[2, 3, 4]`). The Select speaks
	// strings, so we key options by their stringified form and map back to the
	// original typed value on change - storing the number 2, not the string "2".
	const options = $derived(
		(Array.isArray(schema.enum) ? schema.enum : []).map((raw) => ({
			key: String(raw),
			label: String(raw),
			raw
		}))
	);

	const fieldName = $derived(getFieldLabel(path));
	const fieldId = $derived(getFieldId(path, 'enum'));
	const currentKey = $derived(value === undefined || value === null ? '' : String(value));
	const currentLabel = $derived(options.find((o) => o.key === currentKey)?.label);

	function handleChange(selectedKey: string | undefined) {
		const match = options.find((o) => o.key === selectedKey);
		onUpdate(path, match ? match.raw : required ? options[0]?.raw : undefined);
	}
</script>

<FieldSnippet
	title={schema.title || fieldName}
	description={schema.description}
	{required}
	labelFor={fieldId}
>
	<Select.Root type="single" value={currentKey} onValueChange={handleChange}>
		<Select.Trigger
			id={fieldId}
			class={required && currentKey === '' ? 'w-full border-destructive' : 'w-full'}
		>
			{currentLabel ?? `Select ${fieldName}`}
		</Select.Trigger>
		<Select.Content>
			{#each options as option}
				<Select.Item value={option.key}>{option.label}</Select.Item>
			{/each}
		</Select.Content>
	</Select.Root>
</FieldSnippet>

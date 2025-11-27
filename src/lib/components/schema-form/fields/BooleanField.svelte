<!-- fields/BooleanField.svelte -->
<script lang="ts">
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Label } from '$lib/components/ui/label';
	import { isBooleanSchema, type JSONSchema } from '$lib/services/schema/schema';
	import type { FieldProps } from '../types';
	import { getFieldId, getFieldLabel } from '../utils';

	let { schema, value, path, required, onUpdate }: FieldProps = $props();

	let booleanSchema: JSONSchema.Boolean = $state({});

	let fieldName: string = $state('');
	let fieldId: string = $state('');

	$effect(() => {
		if (isBooleanSchema(schema)) {
			booleanSchema = schema;
		}
	});

	$effect(() => {
		fieldName = getFieldLabel(path);
		fieldId = getFieldId(path, 'number');
	});

	function handleChange(checked: boolean) {
		onUpdate(path, checked ? true : undefined);
	}
</script>

<!-- slight variation on the usual FieldSnippet, as checkbox is left of the label -->
<div class="relative flex items-start space-x-3 rounded-lg border border-border/50 bg-muted/20 p-3">
	<Checkbox id={fieldId} checked={value === true} onCheckedChange={handleChange} class="mt-0.5" />
	<div class="flex-1 space-y-1">
		<Label for={fieldId} class="text-sm font-medium">
			{booleanSchema.title || fieldName}
			{#if required}<span class="ml-1 text-destructive">*</span>{/if}
		</Label>
		{#if booleanSchema.description}
			<p class="text-xs text-muted-foreground">{booleanSchema.description}</p>
		{/if}
	</div>
</div>

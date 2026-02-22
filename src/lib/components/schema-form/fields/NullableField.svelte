<script lang="ts">
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import FieldRenderer from '../FieldRenderer.svelte';
	import { getSchemaDefaultValue } from '../../../services/schema/defaultValue';
	import type { FieldProps } from '../types';
	import { isNullSchema, isSchemaObject, type JSONSchema } from '$lib/services/schema/schema';
	import { getFieldId, getFieldLabel } from '../utils';

	let { schema, value, path, required, onUpdate }: FieldProps = $props();

	let nonNullSchema = $derived(makeNonNullSchema(schema));

	let fieldName: string = $state('');
	let fieldId: string = $state('');

	let checked = $derived(value !== null && value !== undefined);

	$effect(() => {
		fieldName = getFieldLabel(path);
		fieldId = getFieldId(path, 'number');
	});

	$effect(() => {
		const shouldBeChecked = value !== null && value !== undefined;
		if (checked !== shouldBeChecked) {
			checked = shouldBeChecked;
		}
	});

	function makeNonNullSchema(schema: JSONSchema.Interface) {
		const nonNullSchema = schema.anyOf?.find((x) => !isNullSchema(x));
		if (!nonNullSchema) return schema;
		if (!isSchemaObject(nonNullSchema)) return schema;
		return nonNullSchema;
	}

	function handleToggle(newChecked: boolean) {
		checked = newChecked;

		if (newChecked && nonNullSchema) {
			const defaultVal = getSchemaDefaultValue(nonNullSchema);
			onUpdate(path, defaultVal);
		} else {
			onUpdate(path, undefined);
		}
	}
</script>

<div class="space-y-3">
	<div
		class="flex items-start space-x-3 rounded-md px-3 py-2.5 transition-colors hover:bg-muted/40"
	>
		<Checkbox {checked} id={fieldId + '--enabled'} onCheckedChange={handleToggle} class="mt-0.5" />
		<div class="flex-1 space-y-1">
			<div class="flex items-center gap-2">
				<Label for={fieldId + '--enabled'} class="text-sm font-medium">
					Enable {schema.title || fieldName}
					{#if required}<span class="ml-1 text-destructive">*</span>{/if}
				</Label>
				<Badge variant="outline" class="px-1.5 py-0 text-[10px]">Optional</Badge>
			</div>
			{#if schema.description}
				<p class="text-sm leading-relaxed text-foreground/70">{schema.description}</p>
			{/if}
		</div>
	</div>
	{#if checked && nonNullSchema && isSchemaObject(nonNullSchema)}
		<div class="mt-3 ml-4 border-l-2 border-border/50 pl-4">
			<FieldRenderer schema={nonNullSchema} {value} {path} required={true} {onUpdate} />
		</div>
	{/if}
</div>

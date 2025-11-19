<script lang="ts">
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Label } from '$lib/components/ui/label';
	import FieldRenderer from '../FieldRenderer.svelte';
	import { getSchemaDefaultValue } from '../../../services/schema/defaultValue';
	import type { FieldProps } from '../types';
	import { isNullSchema, isSchemaObject, type JSONSchema } from '$lib/services/schema/schema';
	import { CircleQuestionMarkIcon } from '@lucide/svelte';
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
		class="relative flex items-start space-x-3 rounded-lg border border-border/50 bg-muted/20 p-3"
	>
		<CircleQuestionMarkIcon class="absolute top-2 right-2 h-4 w-4 text-muted-foreground" />
		<Checkbox {checked} id={fieldId+"--enabled"} onCheckedChange={handleToggle} class="mt-0.5" />
		<div class="flex-1 space-y-1">
			<Label for={fieldId+"--enabled"} class="text-sm font-medium">
				Enable {schema.title || fieldName}
				{#if required}<span class="ml-1 text-destructive">*</span>{/if}
			</Label>
			{#if schema.description}
				<p class="text-xs text-muted-foreground">{schema.description}</p>
			{/if}
		</div>
	</div>
	{#if checked && nonNullSchema && isSchemaObject(nonNullSchema)}
		<div class="ml-6 border-l-2 border-primary/20 pl-4">
			<FieldRenderer schema={nonNullSchema} {value} {path} required={true} {onUpdate} />
		</div>
	{/if}
</div>

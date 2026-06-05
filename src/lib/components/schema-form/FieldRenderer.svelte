<script lang="ts">
	import StringField from './fields/StringField.svelte';
	import NumberField from './fields/NumberField.svelte';
	import BooleanField from './fields/BooleanField.svelte';
	import ObjectField from './fields/ObjectField.svelte';
	import ArrayField from './fields/ArrayField.svelte';
	import NullableField from './fields/NullableField.svelte';
	import UnionField from './fields/UnionField.svelte';
	import EnumField from './fields/EnumField.svelte';
	import { getFieldType, type FieldType } from '$lib/services/schema/fieldType';
	import type { FieldProps } from './types';
	import type { Component } from 'svelte';

	let { schema, value, path = [], required = false, onUpdate }: FieldProps = $props();

	// eslint-disable-next-line @typescript-eslint/no-empty-object-type
	const fieldComponents: Record<FieldType, Component<FieldProps, {}, ''> | null> = {
		string: StringField,
		number: NumberField,
		integer: NumberField,
		boolean: BooleanField,
		object: ObjectField,
		array: ArrayField,
		nullable: NullableField,
		union: UnionField,
		enum: EnumField,
		const: null,
		null: null,
		unknown: null
	} as const;

	const fieldType = $derived(getFieldType(schema, required));
	const FieldComponent = $derived(fieldComponents[fieldType]);
</script>

{#if FieldComponent !== null}
	<FieldComponent {schema} {value} {path} {required} {onUpdate} />
{:else}
	<div class="text-sm text-muted-foreground">
		Unsupported type: {fieldType}
		{JSON.stringify(schema)}
	</div>
{/if}

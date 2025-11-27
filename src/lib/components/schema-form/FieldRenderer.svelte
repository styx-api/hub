<script lang="ts">
	import StringField from './fields/StringField.svelte';
	import NumberField from './fields/NumberField.svelte';
	import BooleanField from './fields/BooleanField.svelte';
	import ObjectField from './fields/ObjectField.svelte';
	import ArrayField from './fields/ArrayField.svelte';
	import NullableField from './fields/NullableField.svelte';
	import UnionField from './fields/UnionField.svelte';
	import {
		type JSONSchema,
		isObjectSchema,
		isArraySchema,
		isStringSchema,
		isNumberSchema,
		isIntegerSchema,
		isBooleanSchema,
		isNullSchema
	} from '$lib/services/schema/schema';
	import type { FieldProps } from './types';
	import type { Component } from 'svelte';
	import { isNullable, isUnion } from '$lib/services/schema/schemaUtils';

	let { schema, value, path = [], required = false, onUpdate }: FieldProps = $props();

	type FieldType =
		| 'const'
		| 'nullable'
		| 'union'
		| 'object'
		| 'array'
		| 'string'
		| 'integer'
		| 'number'
		| 'boolean'
		| 'null'
		| 'unknown';

	function getFieldType(schema: JSONSchema.Interface): FieldType {
		if (schema.const !== undefined) return 'const';

		if (isBooleanSchema(schema)) return 'boolean';
		if (!required || isNullable(schema)) return 'nullable';
		if (isUnion(schema)) return 'union';
		if (isObjectSchema(schema)) return 'object';
		if (isArraySchema(schema)) return 'array';
		if (isStringSchema(schema)) return 'string';
		if (isIntegerSchema(schema)) return 'integer';
		if (isNumberSchema(schema)) return 'number';
		if (isNullSchema(schema)) return 'null';

		return 'unknown';
	}

	const fieldComponents: Record<FieldType, Component<FieldProps, {}, ''> | null> = {
		string: StringField,
		number: NumberField,
		integer: NumberField,
		boolean: BooleanField,
		object: ObjectField,
		array: ArrayField,
		nullable: NullableField,
		union: UnionField,
		const: null,
		null: null,
		unknown: null
	} as const;

	const fieldType = $derived(getFieldType(schema));
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

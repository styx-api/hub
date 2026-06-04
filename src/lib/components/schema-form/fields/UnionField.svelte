<script lang="ts">
	import * as Select from '$lib/components/ui/select/index.js';
	import { Badge } from '$lib/components/ui/badge';
	import FieldRenderer from '../FieldRenderer.svelte';
	import { getSchemaDefaultValue } from '../../../services/schema/defaultValue';
	import type { FieldProps } from '../types';
	import { isSchemaObject, type JSONSchema } from '$lib/services/schema/schema';
	import { getUnionVariants } from '$lib/services/schema/schemaUtils';
	import { getFieldLabel } from '../utils';
	import GlossaryText from './GlossaryText.svelte';

	let { schema, value, path, onUpdate }: FieldProps = $props();

	type VariantKind = 'object' | 'literal' | 'primitive';

	type VariantInfo = {
		/** Stable select key = the variant's index in the union. */
		key: string;
		label: string;
		kind: VariantKind;
		schema: JSONSchema.Interface;
		/** `@type` discriminator const, for object variants. */
		typeTag?: string;
		/** The literal value, for `const` variants (e.g. `"Linear"`). */
		literalValue?: unknown;
	};

	/**
	 * styx2 unions are `oneOf` and can be *mixed*: some variants are objects tagged
	 * by a distinct `@type` const, others are bare literals (e.g. interpolation is
	 * `"Linear" | "NearestNeighbor" | { @type: "multiLabel", ... } | ...`). We
	 * classify each variant so the picker can set either a literal value or an
	 * object default, and only render a sub-form for the object/primitive cases.
	 */
	function classify(variant: JSONSchema, index: number): VariantInfo | null {
		const key = String(index);
		if (!isSchemaObject(variant)) return null;

		const typeTag = (variant.properties?.['@type'] as { const?: unknown } | undefined)?.const;
		if (typeof typeTag === 'string') {
			return { key, kind: 'object', schema: variant, typeTag, label: variant.title || typeTag };
		}
		if (variant.const !== undefined) {
			return {
				key,
				kind: 'literal',
				schema: variant,
				literalValue: variant.const,
				label: variant.title || String(variant.const)
			};
		}
		// A plain typed branch (e.g. a hand-written `anyOf: [string, number]`).
		return {
			key,
			kind: 'primitive',
			schema: variant,
			label: variant.title || `Option ${index + 1}`
		};
	}

	const variants = $derived(
		(getUnionVariants(schema) ?? [])
			.map((v, i) => classify(v, i))
			.filter((v): v is VariantInfo => v !== null)
	);

	const fieldName = $derived(getFieldLabel(path));

	// Which variant does the current value correspond to?
	const selectedKey = $derived.by(() => {
		if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
			const tag = (value as Record<string, unknown>)['@type'];
			const byTag = variants.find((v) => v.kind === 'object' && v.typeTag === tag);
			if (byTag) return byTag.key;
			const anyObject = variants.find((v) => v.kind === 'object' || v.kind === 'primitive');
			return anyObject?.key ?? '';
		}
		const byLiteral = variants.find((v) => v.kind === 'literal' && v.literalValue === value);
		if (byLiteral) return byLiteral.key;
		const primitive = variants.find((v) => v.kind === 'primitive');
		return value !== undefined && primitive ? primitive.key : '';
	});

	const selected = $derived(variants.find((v) => v.key === selectedKey));

	function handleTypeChange(newKey: string | undefined) {
		const variant = variants.find((v) => v.key === newKey);
		if (!variant) return;

		if (variant.kind === 'literal') {
			onUpdate(path, variant.literalValue);
			return;
		}

		const defaultVal = getSchemaDefaultValue(variant.schema);
		if (
			variant.kind === 'object' &&
			variant.typeTag &&
			defaultVal &&
			typeof defaultVal === 'object'
		) {
			(defaultVal as Record<string, unknown>)['@type'] = variant.typeTag;
		}
		onUpdate(path, defaultVal);
	}
</script>

<div class="space-y-3">
	<div>
		<div class="flex items-center gap-2">
			<span class="text-sm font-semibold text-foreground">{schema.title || fieldName}</span>
			<Badge variant="outline" class="px-1.5 py-0 text-[10px]">
				{variants.length}
				{variants.length === 1 ? 'type' : 'types'}
			</Badge>
		</div>
		{#if schema.description}
			<p class="mt-1 text-sm leading-relaxed text-foreground/70">
				<GlossaryText text={schema.description} />
			</p>
		{/if}
	</div>

	<Select.Root type="single" value={selectedKey} onValueChange={handleTypeChange}>
		<Select.Trigger class="w-full">
			{selected?.label || 'Select something...'}
		</Select.Trigger>
		<Select.Content>
			{#each variants as option}
				<Select.Item value={option.key}>{option.label}</Select.Item>
			{/each}
		</Select.Content>
	</Select.Root>

	{#if selected && selected.kind !== 'literal' && isSchemaObject(selected.schema)}
		<div class="space-y-4 border-l-2 border-border/50 pl-4">
			<FieldRenderer schema={selected.schema} {value} path={[...path]} required={true} {onUpdate} />
		</div>
	{/if}
</div>

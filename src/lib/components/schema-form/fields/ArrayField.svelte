<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Plus, Trash2 } from '@lucide/svelte';
	import FieldRenderer from '../FieldRenderer.svelte';
	import { getSchemaDefaultValue } from '../../../services/schema/defaultValue';
	import type { FieldProps } from '../types';
	import { isArraySchema, isSchemaObject, type JSONSchema } from '$lib/services/schema/schema';
	import { getFieldLabel } from '../utils';

	let { schema, value, path, onUpdate }: FieldProps = $props();

	let itemSchema: JSONSchema.Interface = $state({});
	let fieldName: string = $state('Array');
	let items: any[] = $state([]);

	$effect(() => {
		if (isArraySchema(schema) && schema.items && isSchemaObject(schema.items)) {
			itemSchema = schema.items;
		}
	});

	$effect(() => {
		fieldName = getFieldLabel(path);
		items = Array.isArray(value) ? value : [];
	});

	function addItem() {
		const newItem = schema.items ? getSchemaDefaultValue(schema.items) : null;
		onUpdate(path, [...items, newItem]);
	}

	function removeItem(index: number) {
		onUpdate(
			path,
			items.filter((_, i) => i !== index)
		);
	}
</script>

<div class="space-y-3">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-2">
			<h3 class="text-sm font-medium">{schema.title || fieldName}</h3>
			<Badge variant="outline" class="px-1.5 py-0 text-[10px]">
				{items.length}
				{items.length === 1 ? 'item' : 'items'}
			</Badge>
		</div>
		<Button variant="outline" size="sm" onclick={addItem} class="h-7 cursor-pointer px-2 text-xs">
			<Plus class="mr-1 h-3 w-3" />Add
		</Button>
	</div>
	{#if schema.description}
		<p class="text-sm leading-relaxed text-foreground/70">{schema.description}</p>
	{/if}

	<!-- Items -->
	{#if items.length === 0}
		<div
			class="flex items-center justify-center rounded-lg border border-dashed border-border/50 bg-muted/20 py-8"
		>
			<p class="text-sm text-muted-foreground">No items yet</p>
		</div>
	{/if}

	{#each items as item, index}
		<div class="rounded border border-border/30 bg-background">
			<div
				class="flex items-center justify-between border-b border-border/30 bg-muted/30 px-3 py-2"
			>
				<div class="flex items-center gap-2 text-sm">
					<span class="text-muted-foreground">#{index + 1}</span>
					{#if itemSchema.title}
						<span class="font-medium">{itemSchema.title}</span>
					{/if}
				</div>
				<Button
					variant="ghost"
					size="sm"
					onclick={() => removeItem(index)}
					class="h-6 w-6 cursor-pointer p-0 text-muted-foreground transition-colors duration-200 hover:text-destructive"
				>
					<Trash2 class="h-3 w-3 transition-colors duration-200" />
				</Button>
			</div>
			<div class="p-3">
				{#if schema.items}
					<FieldRenderer
						schema={itemSchema}
						value={item}
						path={[...path, index]}
						required={true}
						{onUpdate}
					/>
				{/if}
			</div>
		</div>
	{/each}
</div>

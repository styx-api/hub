<!-- fields/ArrayField.svelte -->
<script lang="ts">
	import { Button } from '$lib/components/ui/button';
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

<div class="space-y-2">
	<!-- Header -->
	<div class="sticky top-0 z-20 bg-background pb-1">
		<div class="flex items-center justify-between">
			<h3 class="text-sm font-medium">{schema.title || fieldName}</h3>
			<Button variant="ghost" size="sm" onclick={addItem} class="h-7 cursor-pointer px-2 text-xs">
				<Plus class="mr-1 h-3 w-3" />Add
			</Button>
		</div>
		{#if schema.description}
			<p class="text-xs text-muted-foreground">{schema.description}</p>
		{/if}
	</div>

	<!-- Items -->
	{#each items as item, index}
		<div class="rounded border bg-muted/30">
			<div class="sticky top-12 z-10 flex items-center justify-between border-b bg-muted px-3 py-2">
				<div class="flex items-center gap-2 text-sm">
					<span class="text-muted-foreground">{getFieldLabel([...path, index])}</span>
					{#if itemSchema.title}
						<span class="font-medium">{itemSchema.title}</span>
					{/if}
				</div>
				<Button
					variant="ghost"
					size="sm"
					onclick={() => removeItem(index)}
					class="h-6 w-6 cursor-pointer p-0 transition-colors duration-200 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
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

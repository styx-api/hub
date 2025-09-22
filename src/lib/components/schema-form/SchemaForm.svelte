<!-- SchemaForm.svelte - Main component -->
<script lang="ts">
	import FieldRenderer from './FieldRenderer.svelte';
	import { getSchemaDefaultValue } from '../../services/schema/defaultValue';
	import { isSchemaObject, type JSONSchema } from '$lib/services/schema/schema';
	import type { SchemaPath } from '$lib/services/schema/schemaUtils';

	let { schema, value = $bindable({}) }: { schema: JSONSchema; value: any } = $props();


	// reset value when schema changes
	$effect(() => {
		if (schema) {
			value = getSchemaDefaultValue(schema) || {};
			// console.log("New default", value)
		}
	})

	// Simple update handler
	function handleUpdate(path: SchemaPath, newValue: any) {
		// Simple deep clone using JSON (handles most cases)
		let updated;
		try {
			updated = JSON.parse(JSON.stringify(value || {}));
		} catch (e) {
			// Fallback to creating new object if JSON fails
			updated = { ...value };
		}

		// Handle empty path (root update)
		if (path.length === 0) {
			value = newValue;
			return;
		}

		// Navigate to the parent of the target
		let current = updated;
		for (let i = 0; i < path.length - 1; i++) {
			if (!current[path[i]]) {
				current[path[i]] = {};
			}
			current = current[path[i]];
		}

		// Set or delete the value
		const lastKey = path[path.length - 1];
		if (newValue === undefined) {
			delete current[lastKey];
		} else {
			current[lastKey] = newValue;
		}

		value = updated;
	}
</script>

{#if isSchemaObject(schema)}
	<FieldRenderer {schema} {value} path={[]} required={true} onUpdate={handleUpdate} />
{:else}
	<div class="text-destructive">No schema provided</div>
{/if}

import { simpleClone } from '$lib/utils/utils';
import {
	type JSONSchema,
	isSchemaObject,
	isObjectSchema,
	isArraySchema,
	isStringSchema,
	isNumberSchema,
	isIntegerSchema,
	isBooleanSchema,
	isNullSchema
} from './schema';

/**
 * Generate a minimal default value that conforms to the given JSON Schema.
 * Only generates required fields and respects explicit defaults/const values.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSchemaDefaultValue(schema: JSONSchema, visited = new Set<JSONSchema>()): any {
	// Prevent infinite recursion
	if (!schema || visited.has(schema)) {
		return null;
	}

	visited.add(schema);
	try {
		return generateValue(schema, visited);
	} finally {
		visited.delete(schema);
	}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateValue(schema: JSONSchema, visited: Set<JSONSchema>): any {
	// Handle boolean schemas
	if (typeof schema === 'boolean') {
		return schema ? {} : null;
	}

	// Priority 1: Explicit values
	if (schema.default !== undefined) return simpleClone(schema.default);
	if (schema.const !== undefined) return schema.const;
	if (schema.enum?.length) return schema.enum[0];

	// Priority 2: Union types - pick first non-null option
	if (schema.anyOf?.length) {
		const nonNull = schema.anyOf.find((s) => !isNullSchema(s));
		return generateValue(nonNull || schema.anyOf[0], visited);
	}
	if (schema.oneOf?.length) {
		return generateValue(schema.oneOf[0], visited);
	}
	if (schema.allOf?.length) {
		return generateValue(mergeAllOf(schema.allOf as JSONSchema[]), visited);
	}

	// Priority 3: Type-based generation using type guards
	if (isObjectSchema(schema)) {
		return generateObject(schema, visited);
	}
	if (isArraySchema(schema)) {
		return generateArray(schema, visited);
	}
	if (isStringSchema(schema)) {
		return generateString(schema);
	}
	if (isIntegerSchema(schema)) {
		return generateNumber(schema, true);
	}
	if (isNumberSchema(schema)) {
		return generateNumber(schema, false);
	}
	if (isBooleanSchema(schema)) {
		return false;
	}
	if (isNullSchema(schema)) {
		return null;
	}

	// Fallback: try to infer from explicit type
	if (isSchemaObject(schema) && schema.type) {
		const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;
		return generateForType(type, schema, visited);
	}

	// Final fallback: infer from properties
	return generateForType(inferType(schema), schema, visited);
}

function inferType(schema: JSONSchema): string {
	if (!isSchemaObject(schema)) return 'null';

	if (schema.properties || schema.additionalProperties) return 'object';
	if (schema.items !== undefined || schema.prefixItems !== undefined) return 'array';
	if (schema.pattern || schema.minLength !== undefined || schema.maxLength !== undefined)
		return 'string';
	if (
		schema.minimum !== undefined ||
		schema.maximum !== undefined ||
		schema.multipleOf !== undefined
	)
		return 'number';
	return 'null';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateForType(type: string, schema: JSONSchema, visited: Set<JSONSchema>): any {
	if (!isSchemaObject(schema)) return null;

	switch (type) {
		case 'object':
			return isObjectSchema(schema) ? generateObject(schema, visited) : {};
		case 'array':
			return isArraySchema(schema) ? generateArray(schema, visited) : [];
		case 'string':
			return isStringSchema(schema) ? generateString(schema) : '';
		case 'number':
			return isNumberSchema(schema) ? generateNumber(schema, false) : 0;
		case 'integer':
			return isIntegerSchema(schema) ? generateNumber(schema, true) : 0;
		case 'boolean':
			return isBooleanSchema(schema) ? false : false;
		default:
			return null;
	}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateObject(schema: JSONSchema.Object, visited: Set<JSONSchema>): Record<string, any> {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const result: Record<string, any> = {};
	const required = new Set(schema.required || []);

	// Only generate required properties
	if (schema.properties && required.size > 0) {
		for (const [key, propSchema] of Object.entries(schema.properties)) {
			if (required.has(key)) {
				result[key] = getSchemaDefaultValue(propSchema, visited);
			}
		}
	}

	return result;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateArray(schema: JSONSchema.Array, visited: Set<JSONSchema>): any[] {
	const minItems = schema.minItems || 0;

	// Only generate if minItems > 0
	if (minItems === 0) {
		return [];
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const result: any[] = [];

	// Handle prefixItems (tuples)
	if (schema.prefixItems && Array.isArray(schema.prefixItems)) {
		for (let i = 0; i < Math.min(minItems, schema.prefixItems.length); i++) {
			result.push(getSchemaDefaultValue(schema.prefixItems[i], visited));
		}

		// If we need more items and have a general items schema
		if (result.length < minItems && schema.items) {
			for (let i = result.length; i < minItems; i++) {
				result.push(getSchemaDefaultValue(schema.items, visited));
			}
		}
	} else if (schema.items) {
		// Uniform array: generate minItems elements
		for (let i = 0; i < minItems; i++) {
			result.push(getSchemaDefaultValue(schema.items, visited));
		}
	}

	return result;
}

function generateString(schema: JSONSchema.String): string {
	// Format-specific defaults
	const formatDefaults: Record<string, string> = {
		email: 'user@example.com',
		uri: 'https://example.com',
		url: 'https://example.com',
		date: new Date().toISOString().split('T')[0],
		'date-time': new Date().toISOString(),
		time: '00:00:00',
		uuid: '00000000-0000-0000-0000-000000000000'
	};

	if (schema.format && formatDefaults[schema.format]) {
		return formatDefaults[schema.format];
	}

	// Generate minimal string respecting minLength
	const minLength = schema.minLength || 0;
	return minLength > 0 ? 'a'.repeat(minLength) : '';
}

function generateNumber(
	schema: JSONSchema.Number | JSONSchema.Integer,
	isInteger: boolean
): number {
	const min =
		schema.minimum ??
		(schema.exclusiveMinimum !== undefined ? schema.exclusiveMinimum + (isInteger ? 1 : 0.01) : 0);
	const max =
		schema.maximum ??
		(schema.exclusiveMaximum !== undefined
			? schema.exclusiveMaximum - (isInteger ? 1 : 0.01)
			: undefined);

	let value = min;

	// If we have constraints that push us away from the minimum
	if (schema.exclusiveMinimum !== undefined && schema.exclusiveMinimum >= min) {
		value = schema.exclusiveMinimum + (isInteger ? 1 : 0.01);
	}

	// Ensure we don't exceed maximum
	if (max !== undefined && value > max) {
		value = max;
	}

	// Handle multipleOf constraint
	if (schema.multipleOf && schema.multipleOf > 0) {
		value = Math.ceil(value / schema.multipleOf) * schema.multipleOf;
	}

	return isInteger ? Math.floor(value) : value;
}

function mergeAllOf(schemas: JSONSchema[]): JSONSchema {
	const merged: JSONSchema.Interface = {};
	const allRequired = new Set<string>();
	const allProperties: Record<string, JSONSchema> = {};

	for (const schema of schemas) {
		if (!isSchemaObject(schema)) continue;

		// Take first type encountered
		merged.type = merged.type || schema.type;
		merged.default = merged.default ?? schema.default;
		merged.const = merged.const ?? schema.const;

		// Merge properties (last wins for simplicity)
		if (schema.properties) {
			Object.assign(allProperties, schema.properties);
		}

		// Collect all required fields
		if (schema.required) {
			schema.required.forEach((r) => allRequired.add(r));
		}

		// Take most restrictive numeric constraints
		if (schema.minimum !== undefined) {
			merged.minimum = Math.max(merged.minimum ?? -Infinity, schema.minimum);
		}
		if (schema.maximum !== undefined) {
			merged.maximum = Math.min(merged.maximum ?? Infinity, schema.maximum);
		}
		if (schema.minLength !== undefined) {
			merged.minLength = Math.max(merged.minLength ?? 0, schema.minLength);
		}
		if (schema.maxLength !== undefined) {
			merged.maxLength = Math.min(merged.maxLength ?? Infinity, schema.maxLength);
		}
		if (schema.minItems !== undefined) {
			merged.minItems = Math.max(merged.minItems ?? 0, schema.minItems);
		}
		if (schema.maxItems !== undefined) {
			merged.maxItems = Math.min(merged.maxItems ?? Infinity, schema.maxItems);
		}
	}

	if (Object.keys(allProperties).length > 0) {
		merged.properties = allProperties;
	}
	if (allRequired.size > 0) {
		merged.required = Array.from(allRequired);
	}

	return merged;
}

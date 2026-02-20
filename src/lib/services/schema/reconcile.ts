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
import { getSchemaDefaultValue } from './defaultValue';

/**
 * Reconciles a loaded value against a schema, fixing type mismatches.
 *
 * When a URL-encoded config from an older schema version is loaded,
 * the data shape may not match the current schema (e.g. a field that was
 * a plain number is now expected to be an object). This function walks the
 * value alongside the schema and replaces mismatched subtrees with schema
 * defaults while preserving values that still conform.
 */

export function reconcileValueWithSchema(value: any, schema: JSONSchema): any {
	if (!isSchemaObject(schema)) return value;

	// Handle union types (anyOf/oneOf) - resolve to the best-matching branch
	if (schema.anyOf) {
		const nonNull = schema.anyOf.filter((s) => !isNullSchema(s));

		// If value is null/undefined and null is allowed, keep it
		if (value == null && schema.anyOf.some(isNullSchema)) {
			return value;
		}

		// Try to find a branch that matches the value's type
		for (const branch of nonNull) {
			if (valueMatchesSchemaType(value, branch)) {
				return reconcileValueWithSchema(value, branch);
			}
		}

		// No branch matches - fall back to default
		return getSchemaDefaultValue(schema);
	}

	if (schema.oneOf) {
		for (const branch of schema.oneOf) {
			if (valueMatchesSchemaType(value, branch)) {
				return reconcileValueWithSchema(value, branch);
			}
		}
		return getSchemaDefaultValue(schema);
	}

	// Object schema: value must be a plain object
	if (isObjectSchema(schema) && schema.properties) {
		if (value == null || typeof value !== 'object' || Array.isArray(value)) {
			return getSchemaDefaultValue(schema) ?? {};
		}

		// Recurse into each property

		const result: Record<string, any> = { ...value };
		for (const [key, propSchema] of Object.entries(schema.properties)) {
			if (key in result) {
				result[key] = reconcileValueWithSchema(result[key], propSchema);
			}
		}
		return result;
	}

	// Array schema: value must be an array
	if (isArraySchema(schema)) {
		if (!Array.isArray(value)) {
			return getSchemaDefaultValue(schema) ?? [];
		}

		// Reconcile each item against the items schema
		if (schema.items && isSchemaObject(schema.items)) {
			return value.map((item: unknown) => reconcileValueWithSchema(item, schema.items!));
		}
		return value;
	}

	// Primitive schemas: check that the value type matches
	if (isStringSchema(schema)) {
		return typeof value === 'string' ? value : (getSchemaDefaultValue(schema) ?? '');
	}
	if (isIntegerSchema(schema) || isNumberSchema(schema)) {
		return typeof value === 'number' ? value : (getSchemaDefaultValue(schema) ?? 0);
	}
	if (isBooleanSchema(schema)) {
		return typeof value === 'boolean' ? value : (getSchemaDefaultValue(schema) ?? false);
	}
	if (isNullSchema(schema)) {
		return null;
	}

	// Unknown schema shape - keep value as-is
	return value;
}

/**
 * Checks whether a value's runtime type is compatible with a schema's expected type.
 */

function valueMatchesSchemaType(value: any, schema: JSONSchema): boolean {
	if (!isSchemaObject(schema)) return false;

	if (isObjectSchema(schema) && schema.properties) {
		return value != null && typeof value === 'object' && !Array.isArray(value);
	}
	if (isArraySchema(schema)) {
		return Array.isArray(value);
	}
	if (isStringSchema(schema)) {
		return typeof value === 'string';
	}
	if (isIntegerSchema(schema) || isNumberSchema(schema)) {
		return typeof value === 'number';
	}
	if (isBooleanSchema(schema)) {
		return typeof value === 'boolean';
	}
	if (isNullSchema(schema)) {
		return value === null;
	}
	return true;
}

import type { JSONSchema } from 'json-schema-typed/draft-2020-12';
export type { JSONSchema };

// function equalsString<T extends string>(obj: unknown, s: T): obj is T {
//   return typeof obj === 'string' && obj === s;
// }

// Base type guard to check if it's the object form
export function isSchemaObject(obj: JSONSchema): obj is JSONSchema.Interface {
	return typeof obj === 'object' && obj !== null;
}

// Object schema
export function isObjectSchema(obj: JSONSchema): obj is JSONSchema.Object {
	return (
		isSchemaObject(obj) &&
		(obj.type === 'object' || obj.properties !== undefined || obj.anyOf !== undefined)
	);
}

// Array schema
export function isArraySchema(obj: JSONSchema): obj is JSONSchema.Array {
	return (
		isSchemaObject(obj) &&
		(obj.type === 'array' || obj.items !== undefined || obj.prefixItems !== undefined)
	);
}

// String schema
export function isStringSchema(obj: JSONSchema): obj is JSONSchema.String {
	return (
		isSchemaObject(obj) &&
		(obj.type === 'string' ||
			obj.pattern !== undefined ||
			obj.maxLength !== undefined ||
			obj.minLength !== undefined)
	);
}

// Number schema
export function isNumberSchema(obj: JSONSchema): obj is JSONSchema.Number {
	return (
		isSchemaObject(obj) &&
		(obj.type === 'number' ||
			obj.maximum !== undefined ||
			obj.minimum !== undefined ||
			obj.multipleOf !== undefined)
	);
}

// Integer schema
export function isIntegerSchema(obj: JSONSchema): obj is JSONSchema.Integer {
	return (
		isSchemaObject(obj) &&
		(obj.type === 'integer' || (obj.type === 'number' && obj.multipleOf === 1))
	);
}

// Boolean schema
export function isBooleanSchema(obj: JSONSchema): obj is JSONSchema.Boolean {
	return isSchemaObject(obj) && obj.type === 'boolean';
}

// Null schema
export function isNullSchema(obj: JSONSchema): obj is JSONSchema.Null {
	return isSchemaObject(obj) && obj.type === 'null';
}

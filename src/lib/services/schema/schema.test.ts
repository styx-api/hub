import { describe, it, expect } from 'vitest';
import {
	isSchemaObject,
	isObjectSchema,
	isArraySchema,
	isStringSchema,
	isNumberSchema,
	isIntegerSchema,
	isBooleanSchema,
	isNullSchema
} from './schema';

describe('isSchemaObject', () => {
	it('returns true for plain objects', () => {
		expect(isSchemaObject({})).toBe(true);
		expect(isSchemaObject({ type: 'string' })).toBe(true);
	});

	it('returns false for booleans', () => {
		expect(isSchemaObject(true)).toBe(false);
		expect(isSchemaObject(false)).toBe(false);
	});

	it('returns false for null', () => {
		// null is technically a valid JSONSchema (permissive), but isSchemaObject checks for object form
		expect(isSchemaObject(null as any)).toBe(false);
	});
});

describe('isObjectSchema', () => {
	it('detects type: object', () => {
		expect(isObjectSchema({ type: 'object' })).toBe(true);
	});

	it('detects presence of properties', () => {
		expect(isObjectSchema({ properties: { name: { type: 'string' } } })).toBe(true);
	});

	it('detects presence of anyOf', () => {
		expect(isObjectSchema({ anyOf: [{ type: 'string' }] })).toBe(true);
	});

	it('returns false for non-object schemas', () => {
		expect(isObjectSchema({ type: 'string' })).toBe(false);
		expect(isObjectSchema({ type: 'number' })).toBe(false);
		expect(isObjectSchema(true)).toBe(false);
	});
});

describe('isArraySchema', () => {
	it('detects type: array', () => {
		expect(isArraySchema({ type: 'array' })).toBe(true);
	});

	it('detects presence of items', () => {
		expect(isArraySchema({ items: { type: 'string' } })).toBe(true);
	});

	it('detects presence of prefixItems', () => {
		expect(isArraySchema({ prefixItems: [{ type: 'string' }] })).toBe(true);
	});

	it('returns false for non-array schemas', () => {
		expect(isArraySchema({ type: 'string' })).toBe(false);
		expect(isArraySchema({ type: 'object' })).toBe(false);
	});
});

describe('isStringSchema', () => {
	it('detects type: string', () => {
		expect(isStringSchema({ type: 'string' })).toBe(true);
	});

	it('detects string-specific keywords', () => {
		expect(isStringSchema({ pattern: '^[a-z]+$' })).toBe(true);
		expect(isStringSchema({ minLength: 1 })).toBe(true);
		expect(isStringSchema({ maxLength: 100 })).toBe(true);
	});

	it('returns false for non-string schemas', () => {
		expect(isStringSchema({ type: 'number' })).toBe(false);
		expect(isStringSchema(true)).toBe(false);
	});
});

describe('isNumberSchema', () => {
	it('detects type: number', () => {
		expect(isNumberSchema({ type: 'number' })).toBe(true);
	});

	it('detects number-specific keywords', () => {
		expect(isNumberSchema({ minimum: 0 })).toBe(true);
		expect(isNumberSchema({ maximum: 100 })).toBe(true);
		expect(isNumberSchema({ multipleOf: 5 })).toBe(true);
	});

	it('returns false for non-number schemas', () => {
		expect(isNumberSchema({ type: 'string' })).toBe(false);
	});
});

describe('isIntegerSchema', () => {
	it('detects type: integer', () => {
		expect(isIntegerSchema({ type: 'integer' })).toBe(true);
	});

	it('detects number with multipleOf 1', () => {
		expect(isIntegerSchema({ type: 'number', multipleOf: 1 })).toBe(true);
	});

	it('returns false for plain number without multipleOf 1', () => {
		expect(isIntegerSchema({ type: 'number' })).toBe(false);
		expect(isIntegerSchema({ type: 'number', multipleOf: 0.5 })).toBe(false);
	});
});

describe('isBooleanSchema', () => {
	it('detects type: boolean', () => {
		expect(isBooleanSchema({ type: 'boolean' })).toBe(true);
	});

	it('returns false for non-boolean schemas', () => {
		expect(isBooleanSchema({ type: 'string' })).toBe(false);
		expect(isBooleanSchema(true)).toBe(false);
	});
});

describe('isNullSchema', () => {
	it('detects type: null', () => {
		expect(isNullSchema({ type: 'null' })).toBe(true);
	});

	it('returns false for non-null schemas', () => {
		expect(isNullSchema({ type: 'string' })).toBe(false);
		expect(isNullSchema({})).toBe(false);
	});
});

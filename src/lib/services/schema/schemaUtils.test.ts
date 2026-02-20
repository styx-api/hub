import { describe, it, expect } from 'vitest';
import {
	getSchemaAtPath,
	isNullable,
	getNonNullSchema,
	isUnion,
	getSchemaMetadata
} from './schemaUtils';

describe('getSchemaAtPath', () => {
	it('returns root schema for empty path', () => {
		const schema = { type: 'string' as const };
		expect(getSchemaAtPath(schema, [])).toBe(schema);
	});

	it('traverses object properties', () => {
		const nameSchema = { type: 'string' as const };
		const schema = {
			type: 'object' as const,
			properties: { name: nameSchema }
		};
		expect(getSchemaAtPath(schema, ['name'])).toBe(nameSchema);
	});

	it('traverses array items', () => {
		const itemSchema = { type: 'number' as const };
		const schema = {
			type: 'array' as const,
			items: itemSchema
		};
		expect(getSchemaAtPath(schema, [0])).toBe(itemSchema);
	});

	it('traverses nested paths', () => {
		const streetSchema = { type: 'string' as const };
		const schema = {
			type: 'object' as const,
			properties: {
				address: {
					type: 'object' as const,
					properties: { street: streetSchema }
				}
			}
		};
		expect(getSchemaAtPath(schema, ['address', 'street'])).toBe(streetSchema);
	});

	it('resolves through union types', () => {
		const nameSchema = { type: 'string' as const };
		const schema = {
			anyOf: [
				{ type: 'null' as const },
				{
					type: 'object' as const,
					properties: { name: nameSchema }
				}
			]
		};
		expect(getSchemaAtPath(schema, ['name'])).toBe(nameSchema);
	});

	it('returns null for missing path', () => {
		const schema = {
			type: 'object' as const,
			properties: { name: { type: 'string' as const } }
		};
		expect(getSchemaAtPath(schema, ['age'])).toBeNull();
	});

	it('returns null for boolean schema with path', () => {
		expect(getSchemaAtPath(true, ['anything'])).toBeNull();
	});
});

describe('isNullable', () => {
	it('returns true for schema with null in anyOf', () => {
		expect(
			isNullable({
				anyOf: [{ type: 'null' }, { type: 'string' }]
			})
		).toBe(true);
	});

	it('returns false for schema without null in anyOf', () => {
		expect(
			isNullable({
				anyOf: [{ type: 'string' }, { type: 'number' }]
			})
		).toBe(false);
	});

	it('returns false for non-union schema', () => {
		expect(isNullable({ type: 'string' })).toBe(false);
	});
});

describe('getNonNullSchema', () => {
	it('returns non-null branch from nullable union', () => {
		const stringSchema = { type: 'string' as const };
		const schema = {
			anyOf: [{ type: 'null' as const }, stringSchema]
		};
		expect(getNonNullSchema(schema)).toBe(stringSchema);
	});

	it('returns the schema itself for non-nullable schemas', () => {
		const schema = { type: 'string' as const };
		expect(getNonNullSchema(schema)).toBe(schema);
	});
});

describe('isUnion', () => {
	it('returns true for anyOf with multiple non-null types', () => {
		expect(
			isUnion({
				anyOf: [{ type: 'string' }, { type: 'number' }]
			})
		).toBe(true);
	});

	it('returns false for nullable union with single non-null type', () => {
		expect(
			isUnion({
				anyOf: [{ type: 'null' }, { type: 'string' }]
			})
		).toBe(false);
	});

	it('returns false for non-union schema', () => {
		expect(isUnion({ type: 'string' })).toBe(false);
	});

	it('returns false for boolean schema', () => {
		expect(isUnion(true)).toBe(false);
	});
});

describe('getSchemaMetadata', () => {
	it('extracts title, description, and type', () => {
		expect(
			getSchemaMetadata({
				type: 'string',
				title: 'Name',
				description: 'The user name'
			})
		).toEqual({
			title: 'Name',
			description: 'The user name',
			type: 'string'
		});
	});

	it('returns undefined fields when not present', () => {
		expect(getSchemaMetadata({ type: 'number' })).toEqual({
			title: undefined,
			description: undefined,
			type: 'number'
		});
	});

	it('returns null for boolean schema', () => {
		expect(getSchemaMetadata(true)).toBeNull();
	});
});

import { describe, it, expect } from 'vitest';
import { getSchemaDefaultValue } from './defaultValue';

describe('getSchemaDefaultValue', () => {
	describe('primitive defaults', () => {
		it('returns empty string for string schema', () => {
			expect(getSchemaDefaultValue({ type: 'string' })).toBe('');
		});

		it('returns 0 for number schema', () => {
			expect(getSchemaDefaultValue({ type: 'number' })).toBe(0);
		});

		it('returns 0 for integer schema', () => {
			expect(getSchemaDefaultValue({ type: 'integer' })).toBe(0);
		});

		it('returns false for boolean schema', () => {
			expect(getSchemaDefaultValue({ type: 'boolean' })).toBe(false);
		});

		it('returns null for null schema', () => {
			expect(getSchemaDefaultValue({ type: 'null' })).toBe(null);
		});
	});

	describe('explicit values', () => {
		it('returns explicit default', () => {
			expect(getSchemaDefaultValue({ type: 'string', default: 'hello' })).toBe('hello');
		});

		it('returns const value', () => {
			expect(getSchemaDefaultValue({ type: 'number', const: 42 })).toBe(42);
		});

		it('returns first enum value', () => {
			expect(getSchemaDefaultValue({ type: 'string', enum: ['a', 'b', 'c'] })).toBe('a');
		});

		it('prioritizes default over const and enum', () => {
			expect(
				getSchemaDefaultValue({ type: 'string', default: 'def', const: 'con', enum: ['en'] })
			).toBe('def');
		});
	});

	describe('object schemas', () => {
		it('returns empty object for object schema with no required fields', () => {
			expect(
				getSchemaDefaultValue({
					type: 'object',
					properties: { name: { type: 'string' } }
				})
			).toEqual({});
		});

		it('generates required fields only', () => {
			expect(
				getSchemaDefaultValue({
					type: 'object',
					properties: {
						name: { type: 'string' },
						age: { type: 'number' },
						optional: { type: 'boolean' }
					},
					required: ['name', 'age']
				})
			).toEqual({ name: '', age: 0 });
		});
	});

	describe('array schemas', () => {
		it('returns empty array when no minItems', () => {
			expect(getSchemaDefaultValue({ type: 'array', items: { type: 'string' } })).toEqual([]);
		});

		it('generates minItems elements', () => {
			expect(
				getSchemaDefaultValue({
					type: 'array',
					items: { type: 'number' },
					minItems: 3
				})
			).toEqual([0, 0, 0]);
		});
	});

	describe('union types', () => {
		it('picks first non-null option from anyOf', () => {
			expect(
				getSchemaDefaultValue({
					anyOf: [{ type: 'null' }, { type: 'string' }]
				})
			).toBe('');
		});

		it('uses first option from oneOf', () => {
			expect(
				getSchemaDefaultValue({
					oneOf: [{ type: 'number' }, { type: 'string' }]
				})
			).toBe(0);
		});

		it('merges allOf schemas', () => {
			expect(
				getSchemaDefaultValue({
					allOf: [
						{ type: 'object', properties: { a: { type: 'string' } }, required: ['a'] },
						{ properties: { b: { type: 'number' } }, required: ['b'] }
					]
				})
			).toEqual({ a: '', b: 0 });
		});
	});

	describe('string format defaults', () => {
		it('returns email format default', () => {
			expect(getSchemaDefaultValue({ type: 'string', format: 'email' })).toBe('user@example.com');
		});

		it('returns uri format default', () => {
			expect(getSchemaDefaultValue({ type: 'string', format: 'uri' })).toBe('https://example.com');
		});

		it('returns uuid format default', () => {
			expect(getSchemaDefaultValue({ type: 'string', format: 'uuid' })).toBe(
				'00000000-0000-0000-0000-000000000000'
			);
		});

		it('respects minLength when no format', () => {
			expect(getSchemaDefaultValue({ type: 'string', minLength: 5 })).toBe('aaaaa');
		});
	});

	describe('number constraints', () => {
		it('respects minimum', () => {
			expect(getSchemaDefaultValue({ type: 'number', minimum: 10 })).toBe(10);
		});

		it('respects exclusiveMinimum', () => {
			expect(getSchemaDefaultValue({ type: 'integer', exclusiveMinimum: 5 })).toBe(6);
		});

		it('respects multipleOf', () => {
			expect(getSchemaDefaultValue({ type: 'number', minimum: 1, multipleOf: 5 })).toBe(5);
		});
	});

	describe('circular reference protection', () => {
		it('returns null for circular references', () => {
			const schema: any = { type: 'object', properties: {} };
			schema.properties.self = schema;
			schema.required = ['self'];
			// The visited set prevents infinite recursion
			const result = getSchemaDefaultValue(schema);
			expect(result).toEqual({ self: null });
		});
	});

	describe('boolean schemas', () => {
		it('returns {} for true schema', () => {
			expect(getSchemaDefaultValue(true)).toEqual({});
		});

		it('returns null for false schema', () => {
			expect(getSchemaDefaultValue(false)).toBe(null);
		});
	});
});

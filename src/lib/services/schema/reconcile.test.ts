import { describe, it, expect } from 'vitest';
import { reconcileValueWithSchema } from './reconcile';

describe('reconcileValueWithSchema', () => {
	describe('matching values pass through', () => {
		it('keeps matching string', () => {
			expect(reconcileValueWithSchema('hello', { type: 'string' })).toBe('hello');
		});

		it('keeps matching number', () => {
			expect(reconcileValueWithSchema(42, { type: 'number' })).toBe(42);
		});

		it('keeps matching boolean', () => {
			expect(reconcileValueWithSchema(true, { type: 'boolean' })).toBe(true);
		});

		it('keeps matching array', () => {
			expect(
				reconcileValueWithSchema([1, 2], { type: 'array', items: { type: 'number' } })
			).toEqual([1, 2]);
		});
	});

	describe('type mismatches get replaced with defaults', () => {
		it('replaces number with string default', () => {
			expect(reconcileValueWithSchema(42, { type: 'string' })).toBe('');
		});

		it('replaces string with number default', () => {
			expect(reconcileValueWithSchema('hello', { type: 'number' })).toBe(0);
		});

		it('replaces string with boolean default', () => {
			expect(reconcileValueWithSchema('yes', { type: 'boolean' })).toBe(false);
		});

		it('replaces non-array with array default', () => {
			expect(
				reconcileValueWithSchema('not-array', { type: 'array', items: { type: 'string' } })
			).toEqual([]);
		});

		it('replaces non-object with object default', () => {
			expect(
				reconcileValueWithSchema('not-object', {
					type: 'object',
					properties: { name: { type: 'string' } }
				})
			).toEqual({});
		});
	});

	describe('object property recursion', () => {
		it('recurses into object properties', () => {
			const schema = {
				type: 'object' as const,
				properties: {
					name: { type: 'string' as const },
					age: { type: 'number' as const }
				}
			};
			const value = { name: 'Alice', age: 30, extra: 'kept' };
			const result = reconcileValueWithSchema(value, schema);
			expect(result.name).toBe('Alice');
			expect(result.age).toBe(30);
			expect(result.extra).toBe('kept');
		});

		it('fixes mismatched nested properties', () => {
			const schema = {
				type: 'object' as const,
				properties: {
					count: { type: 'number' as const }
				}
			};
			const result = reconcileValueWithSchema({ count: 'not-a-number' }, schema);
			expect(result.count).toBe(0);
		});
	});

	describe('array item reconciliation', () => {
		it('reconciles each array item', () => {
			const schema = {
				type: 'array' as const,
				items: { type: 'number' as const }
			};
			const result = reconcileValueWithSchema([1, 'two', 3], schema);
			expect(result).toEqual([1, 0, 3]);
		});
	});

	describe('union types (anyOf)', () => {
		it('picks matching branch', () => {
			const schema = {
				anyOf: [{ type: 'string' as const }, { type: 'number' as const }]
			};
			expect(reconcileValueWithSchema('hello', schema)).toBe('hello');
			expect(reconcileValueWithSchema(42, schema)).toBe(42);
		});

		it('handles null in nullable union', () => {
			const schema = {
				anyOf: [{ type: 'null' as const }, { type: 'string' as const }]
			};
			expect(reconcileValueWithSchema(null, schema)).toBe(null);
			expect(reconcileValueWithSchema(undefined, schema)).toBe(undefined);
		});

		it('falls back to default when no branch matches', () => {
			const schema = {
				anyOf: [{ type: 'null' as const }, { type: 'string' as const }]
			};
			// number doesn't match either branch
			expect(reconcileValueWithSchema(42, schema)).toBe('');
		});
	});

	describe('null schema', () => {
		it('always returns null for null schema', () => {
			expect(reconcileValueWithSchema('anything', { type: 'null' })).toBe(null);
			expect(reconcileValueWithSchema(42, { type: 'null' })).toBe(null);
		});
	});

	describe('non-schema-object passthrough', () => {
		it('returns value as-is for boolean schema', () => {
			expect(reconcileValueWithSchema('hello', true)).toBe('hello');
			expect(reconcileValueWithSchema(42, false)).toBe(42);
		});
	});
});

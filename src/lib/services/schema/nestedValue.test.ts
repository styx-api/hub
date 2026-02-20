import { describe, it, expect } from 'vitest';
import { getNestedValue, updateNestedValue, deleteNestedProperty } from './nestedValue';

describe('getNestedValue', () => {
	it('returns value at simple path', () => {
		expect(getNestedValue({ name: 'Alice' }, 'name')).toBe('Alice');
	});

	it('returns value at deep path', () => {
		expect(getNestedValue({ user: { profile: { name: 'Bob' } } }, 'user.profile.name')).toBe('Bob');
	});

	it('returns value at array index', () => {
		expect(getNestedValue({ items: ['a', 'b', 'c'] }, 'items.1')).toBe('b');
	});

	it('returns undefined for missing path', () => {
		expect(getNestedValue({ a: 1 }, 'b')).toBeUndefined();
		expect(getNestedValue({ a: 1 }, 'a.b.c')).toBeUndefined();
	});

	it('returns the whole object for empty path', () => {
		const obj = { a: 1 };
		expect(getNestedValue(obj, '')).toBe(obj);
	});

	it('handles null/undefined intermediate values', () => {
		expect(getNestedValue({ a: null }, 'a.b')).toBeUndefined();
		expect(getNestedValue({ a: undefined }, 'a.b')).toBeUndefined();
	});
});

describe('updateNestedValue', () => {
	it('sets a nested value', () => {
		const result = updateNestedValue({ user: { name: 'Alice' } }, 'user.name', 'Bob');
		expect(result).toEqual({ user: { name: 'Bob' } });
	});

	it('creates intermediate objects', () => {
		const result = updateNestedValue({}, 'a.b.c', 42);
		expect(result).toEqual({ a: { b: { c: 42 } } });
	});

	it('extends arrays when setting by index', () => {
		const result = updateNestedValue({ items: ['a'] }, 'items.3', 'd');
		expect(result.items[3]).toBe('d');
		expect(result.items.length).toBe(4);
	});

	it('preserves immutability of original', () => {
		const original = { user: { name: 'Alice' } };
		const result = updateNestedValue(original, 'user.name', 'Bob');
		expect(original.user.name).toBe('Alice');
		expect(result.user.name).toBe('Bob');
	});

	it('replaces whole value when path is empty', () => {
		expect(updateNestedValue({ a: 1 }, '', { b: 2 })).toEqual({ b: 2 });
	});
});

describe('deleteNestedProperty', () => {
	it('removes a leaf property', () => {
		const result = deleteNestedProperty({ a: 1, b: 2 }, 'a');
		expect(result).toEqual({ b: 2 });
	});

	it('removes an array element', () => {
		const result = deleteNestedProperty({ items: ['a', 'b', 'c'] }, 'items.1');
		expect(result).toEqual({ items: ['a', 'c'] });
	});

	it('cleans up empty parent objects', () => {
		const result = deleteNestedProperty(
			{ wrapper: { inner: 'value' }, keep: true },
			'wrapper.inner'
		);
		// wrapper becomes empty and gets cleaned, but keep stays
		expect(result).toEqual({ keep: true });
	});

	it('returns original object for missing path', () => {
		const obj = { a: 1 };
		const result = deleteNestedProperty(obj, 'b');
		expect(result).toBe(obj);
	});

	it('returns original object for empty path', () => {
		const obj = { a: 1 };
		expect(deleteNestedProperty(obj, '')).toBe(obj);
	});
});

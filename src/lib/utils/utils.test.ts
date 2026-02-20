import { describe, it, expect } from 'vitest';
import { simpleClone } from './utils';

describe('simpleClone', () => {
	it('deep copies a plain object', () => {
		const original = { a: 1, b: 'hello' };
		const clone = simpleClone(original);
		expect(clone).toEqual(original);
		expect(clone).not.toBe(original);
	});

	it('deep copies arrays', () => {
		const original = [1, 2, [3, 4]];
		const clone = simpleClone(original);
		expect(clone).toEqual(original);
		expect(clone[2]).not.toBe(original[2]);
	});

	it('deep copies nested structures', () => {
		const original = { a: { b: { c: [1, 2] } } };
		const clone = simpleClone(original);
		expect(clone).toEqual(original);
		expect(clone.a).not.toBe(original.a);
		expect(clone.a.b).not.toBe(original.a.b);
		expect(clone.a.b.c).not.toBe(original.a.b.c);
	});

	it('handles null input by returning empty object', () => {
		expect(simpleClone(null)).toEqual({});
	});

	it('handles undefined input by returning empty object', () => {
		expect(simpleClone(undefined)).toEqual({});
	});

	it('handles empty object', () => {
		expect(simpleClone({})).toEqual({});
	});

	it('handles empty array', () => {
		expect(simpleClone([])).toEqual([]);
	});
});

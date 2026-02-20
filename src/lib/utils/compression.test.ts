import { describe, it, expect } from 'vitest';
import { compressString, decompressString } from './compression';

describe('compression round-trip', () => {
	it('round-trips an empty string', async () => {
		const compressed = await compressString('');
		const result = await decompressString(compressed);
		expect(result).toBe('');
	});

	it('round-trips a short string', async () => {
		const input = 'hello world';
		const compressed = await compressString(input);
		const result = await decompressString(compressed);
		expect(result).toBe(input);
	});

	it('round-trips a long string', async () => {
		const input = 'x'.repeat(10000);
		const compressed = await compressString(input);
		const result = await decompressString(compressed);
		expect(result).toBe(input);
	});

	it('round-trips JSON content', async () => {
		const input = JSON.stringify({ key: 'value', nested: { arr: [1, 2, 3] } });
		const compressed = await compressString(input);
		const result = await decompressString(compressed);
		expect(result).toBe(input);
	});

	it('round-trips unicode content', async () => {
		const input = 'Hello 🌍 こんにちは';
		const compressed = await compressString(input);
		const result = await decompressString(compressed);
		expect(result).toBe(input);
	});
});

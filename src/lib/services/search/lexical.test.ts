import { describe, expect, it } from 'vitest';
import { lexicalScore, tokenize } from './lexical';
import type { ToolRef } from '$lib/services/catalog';

const ref = (over: Partial<ToolRef>): ToolRef => ({
	tool_id: 'fsl/bet',
	name: 'bet',
	package: 'fsl',
	description: 'brain extraction tool',
	wrapped: true,
	...over
});

describe('tokenize', () => {
	it('lowercases, splits on non-alphanumerics, drops stopwords and 1-char tokens', () => {
		expect(tokenize('Brain-Extraction of the T1')).toEqual(['brain', 'extraction', 't1']);
	});
});

describe('lexicalScore', () => {
	it('rewards an exact name match most', () => {
		expect(lexicalScore('bet', ref({}))).toBeGreaterThan(
			lexicalScore('bet', ref({ name: 'betsurf' }))
		);
	});

	it('scores prefix above substring above none', () => {
		const prefix = lexicalScore('be', ref({ name: 'bet' }));
		const substring = lexicalScore('et', ref({ name: 'bet' }));
		expect(prefix).toBeGreaterThan(substring);
		expect(substring).toBeGreaterThan(0);
	});

	it('matches description tokens', () => {
		expect(lexicalScore('extraction', ref({ name: 'xyz' }))).toBeGreaterThan(0);
	});

	it('breaks ties toward wrapped tools', () => {
		expect(lexicalScore('bet', ref({ wrapped: true }))).toBeGreaterThan(
			lexicalScore('bet', ref({ wrapped: false }))
		);
	});
});

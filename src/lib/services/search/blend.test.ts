import { describe, expect, it } from 'vitest';
import { blendHits, cosineScores } from './blend';
import type { ToolRef } from '$lib/services/catalog';

const ref = (over: Partial<ToolRef>): ToolRef => ({
	tool_id: `${over.package ?? 'fsl'}/${over.name ?? 'bet'}`,
	name: 'bet',
	package: 'fsl',
	description: '',
	wrapped: true,
	...over
});

describe('cosineScores', () => {
	it('is the dot product per row, keyed by tool_id', () => {
		// 2 rows, dim 2: row0 = [1,0], row1 = [0,1]
		const vectors = new Float32Array([1, 0, 0, 1]);
		const scores = cosineScores([1, 0], vectors, 2, ['a/x', 'b/y']);
		expect(scores.get('a/x')).toBeCloseTo(1);
		expect(scores.get('b/y')).toBeCloseTo(0);
	});
});

describe('blendHits (lexical-only, sem = null)', () => {
	const refs = [
		ref({ package: 'fsl', name: 'bet', description: 'brain extraction' }),
		ref({ package: 'fsl', name: 'flirt', description: 'linear registration' }),
		ref({ package: 'afni', name: '3dcalc', description: 'voxelwise calculator' })
	];

	it('ranks exact name match first', () => {
		const hits = blendHits('bet', refs, null, 10);
		expect(hits[0].tool_id).toBe('fsl/bet');
	});

	it('drops zero-score refs', () => {
		const hits = blendHits('flirt', refs, null, 10);
		expect(hits.map((h) => h.tool_id)).toEqual(['fsl/flirt']);
	});

	it('respects the limit', () => {
		const hits = blendHits('a', refs, null, 1); // matches several via includes
		expect(hits.length).toBeLessThanOrEqual(1);
	});
});

describe('blendHits (hybrid, sem present)', () => {
	const refs = [
		ref({ package: 'fsl', name: 'bet', description: 'brain extraction' }),
		ref({ package: 'fsl', name: 'flirt', description: 'linear registration' })
	];

	it('surfaces a semantically-similar tool with no lexical overlap', () => {
		// "skull strip" shares no tokens with either, but sem favors bet.
		const sem = new Map([
			['fsl/bet', 0.8],
			['fsl/flirt', 0.05]
		]);
		const hits = blendHits('skull strip', refs, sem, 10);
		expect(hits[0].tool_id).toBe('fsl/bet');
		// flirt is below the 0.1 relevance gate and has no lexical hit → excluded.
		expect(hits.map((h) => h.tool_id)).toEqual(['fsl/bet']);
	});

	it('keeps an exact name match dominant via the half-weight lexical term', () => {
		const sem = new Map([
			['fsl/bet', 0.3],
			['fsl/flirt', 0.35]
		]);
		// "flirt" is an exact name → lexNorm 1.0 → +0.5 lifts it over bet's higher sem.
		const hits = blendHits('flirt', refs, sem, 10);
		expect(hits[0].tool_id).toBe('fsl/flirt');
	});
});

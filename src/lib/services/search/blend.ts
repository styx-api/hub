/**
 * Cosine + blend — the shared ranking core (see contract.ts; ports
 * niwrap-mcp/src/search.ts). Pure and synchronous: given the query, the tool
 * refs, and an optional semantic-score map, it produces the ranked hit list.
 * Passing `sem = null` yields a pure-lexical ranking — that's the instant path
 * the UI shows while the model warms, and the permanent path when semantic is
 * gated off or unavailable.
 */

import type { ToolRef } from '$lib/services/catalog';
import { lexicalScore } from './lexical';

export interface SearchHit extends ToolRef {
	/** Blended relevance score (higher is better). */
	score: number;
}

/**
 * Cosine similarity (== dot product, since both sides are L2-normalized) of a
 * query vector to every indexed tool. Returns a tool_id -> score map.
 */
export function cosineScores(
	queryVec: number[] | Float32Array,
	vectors: Float32Array,
	dim: number,
	toolIds: string[]
): Map<string, number> {
	const scores = new Map<string, number>();
	for (let i = 0; i < toolIds.length; i++) {
		const off = i * dim;
		let dot = 0;
		for (let j = 0; j < dim; j++) dot += queryVec[j] * vectors[off + j];
		scores.set(toolIds[i], dot);
	}
	return scores;
}

/**
 * Blend semantic + lexical into a ranked hit list. With `sem`, semantics drive
 * recall on capability queries while a half-weight lexical term keeps exact-name
 * matches dominant; without it, ranking is pure normalized lexical.
 */
export function blendHits(
	query: string,
	refs: ToolRef[],
	sem: Map<string, number> | null,
	limit: number
): SearchHit[] {
	return refs
		.map((ref) => {
			const lex = lexicalScore(query, ref);
			const lexNorm = Math.min(lex, 100) / 100;
			const semScore = sem?.get(ref.tool_id) ?? 0;
			const score = sem ? semScore + 0.5 * lexNorm : lexNorm;
			// Relevance must come from an actual query match, not the wrapped(+1)
			// tiebreaker — otherwise every callable tool would pass the gate and flood
			// an interactive palette. (The MCP gates on `lex > 0`, fine for a capped
			// API result but wrong for a dropdown.)
			const hasLexHit = lex > (ref.wrapped ? 1 : 0);
			const relevant = sem ? semScore > 0.1 || hasLexHit : hasLexHit;
			return { ref, score, relevant };
		})
		.filter((x) => x.relevant)
		.sort((a, b) => b.score - a.score || a.ref.tool_id.localeCompare(b.ref.tool_id))
		.slice(0, limit)
		.map((x) => ({ ...x.ref, score: Math.round(x.score * 1000) / 1000 }));
}

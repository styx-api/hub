/**
 * Published-embeddings contract (consumer side).
 *
 * Mirrors niwrap-mcp/docs/embeddings-contract.md. The matched-pair invariant is
 * the whole game: the index is only usable if it was built with the same model
 * (and dim) we embed the query with — otherwise cosine is meaningless and we
 * fall back to lexical.
 *
 * This module is intentionally free of hub/DOM/Svelte imports so the cosine +
 * blend core (this file + lexical.ts + blend.ts) can be lifted verbatim into a
 * shared `@niwrap/semantic-core` package later, imported by both the hub and
 * niwrap-mcp.
 */

export const EMBED_MODEL = 'Xenova/all-MiniLM-L6-v2';
export const EMBED_DIM = 384;

/** `embeddings.meta.json` — the authoritative row→tool map (row `i` is `tools[i]`). */
export interface EmbIndexMeta {
	model: string;
	dim: number;
	encoding?: string;
	version: string; // == catalog version (matched-pair binding)
	count: number;
	tools: { tool_id: string; name: string; package: string; description?: string }[];
}

/** A loaded, validated index: meta + the row-major, L2-normalized f32 vectors. */
export interface EmbIndex {
	meta: EmbIndexMeta;
	vectors: Float32Array; // length = count * dim
}

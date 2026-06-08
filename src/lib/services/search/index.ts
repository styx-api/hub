/**
 * Hybrid tool search for the hub.
 *
 * The UI drives this in two beats: `blendHits(query, refs, null, limit)` ranks
 * lexically and synchronously on every keystroke (instant), then — if semantic
 * is enabled for the session — a debounced `semanticScores(query)` resolves and
 * the UI re-blends with the semantic map for the upgraded ranking. Everything
 * degrades to lexical on any failure.
 */

export { blendHits, cosineScores, type SearchHit } from './blend';
export { lexicalScore, tokenize } from './lexical';
export { semanticScores, loadIndex } from './semantic';
export { semanticSearch, type SemanticMode } from './gating.svelte';
export { EMBED_MODEL, EMBED_DIM } from './contract';

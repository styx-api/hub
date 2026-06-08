/**
 * Semantic scoring: fetch + validate the published tool-vector index for the
 * loaded catalog version, embed the query live, cosine vs every row.
 *
 * Every failure path returns null so callers fall back to lexical: no announce,
 * an unsupported/ mismatched model, a failed fetch, a blob that doesn't match
 * its declared shape, or a model that won't load. The index is cached per
 * resolved catalog version, so a new release naturally misses + refetches.
 */

import { catalog } from '$lib/services/catalog';
import { cosineScores } from './blend';
import { EMBED_DIM, EMBED_MODEL, type EmbIndex, type EmbIndexMeta } from './contract';
import { embed } from './embedder/client';

// Keyed by resolved catalog version; the in-flight promise is cached so concurrent
// searches share one fetch.
const indexCache = new Map<string, Promise<EmbIndex | null>>();

/**
 * Fetch + validate the index for the loaded version, or null if semantic search
 * isn't available for it. Asserts the matched-pair invariant (model/dim) before
 * trusting the fetch, then the blob's shape before trusting its bytes.
 */
export async function loadIndex(): Promise<EmbIndex | null> {
	await catalog.load();
	const src = catalog.getEmbeddingsSource();
	if (!src) return null;

	let cached = indexCache.get(src.version);
	if (!cached) {
		cached = (async () => {
			try {
				// The index must be built with the same model/dim we query with.
				if (src.model !== EMBED_MODEL || src.dim !== EMBED_DIM) return null;

				const [metaRes, vecRes] = await Promise.all([fetch(src.metaUrl), fetch(src.vectorsUrl)]);
				if (!metaRes.ok || !vecRes.ok) return null;

				const meta = (await metaRes.json()) as EmbIndexMeta;
				const buf = await vecRes.arrayBuffer();
				if (
					meta.model !== EMBED_MODEL ||
					meta.dim !== EMBED_DIM ||
					buf.byteLength !== meta.count * meta.dim * 4 ||
					meta.tools.length !== meta.count
				) {
					return null;
				}
				return { meta, vectors: new Float32Array(buf) };
			} catch {
				return null;
			}
		})();
		indexCache.set(src.version, cached);
		// Only a successful load stays cached. A null (transient fetch failure, or a
		// mismatch that's cheap to re-check) is evicted so a later search retries
		// rather than the whole session being stuck on lexical after one blip.
		cached.then((idx) => {
			if (!idx) indexCache.delete(src.version);
		});
	}
	return cached;
}

/**
 * Cosine similarity of `query` to every indexed tool, as a tool_id -> score map,
 * or null if semantic search is unavailable (callers fall back to lexical).
 */
export async function semanticScores(query: string): Promise<Map<string, number> | null> {
	const index = await loadIndex();
	if (!index) return null;
	let qv: number[];
	try {
		qv = (await embed([query]))[0];
	} catch {
		return null;
	}
	const toolIds = index.meta.tools.map((t) => t.tool_id);
	return cosineScores(qv, index.vectors, index.meta.dim, toolIds);
}

/** Test-only: clear the per-version index cache. */
export function __resetIndexCache(): void {
	indexCache.clear();
}

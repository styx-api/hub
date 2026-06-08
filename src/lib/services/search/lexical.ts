/**
 * Lexical relevance scoring — net-new in the hub (the old QuickSelector did only
 * boolean substring matching with no ranking). Ported from niwrap-mcp's
 * `lexicalScore`/`tokenize` so the two clients rank identically.
 *
 * Pure (no DOM/Svelte). Part of the liftable core (see contract.ts).
 */

import type { ToolRef } from '$lib/services/catalog';

const STOPWORDS = new Set([
	'a',
	'an',
	'the',
	'to',
	'of',
	'for',
	'my',
	'with',
	'and',
	'or',
	'in',
	'on',
	'into',
	'from'
]);

export function tokenize(query: string): string[] {
	return query
		.toLowerCase()
		.split(/[^a-z0-9]+/)
		.filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/**
 * Lexical relevance of a tool to a query: tokenized substring scoring over the
 * app name, description, and package. Exact/prefix name matches dominate, so
 * "bet" -> fsl/bet stays #1; capability/synonym queries are handled by the
 * semantic layer (see blend.ts).
 */
export function lexicalScore(query: string, ref: ToolRef): number {
	const q = query.trim().toLowerCase();
	const tokens = tokenize(q);
	const name = ref.name.toLowerCase();
	const desc = (ref.description ?? '').toLowerCase();
	const pkg = ref.package.toLowerCase();
	let score = 0;
	if (name === q) score += 100;
	else if (q && name.startsWith(q)) score += 40;
	else if (q && name.includes(q)) score += 20;
	for (const t of tokens) {
		if (name.includes(t)) score += 10;
		if (desc.includes(t)) score += 3;
		if (pkg.includes(t)) score += 2;
	}
	if (ref.wrapped) score += 1; // prefer callable tools on ties
	return score;
}

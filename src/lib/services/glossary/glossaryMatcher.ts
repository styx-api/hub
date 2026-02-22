import { GLOSSARY_ENTRIES, type GlossaryEntry } from './glossary';

export type TextSegment =
	| { type: 'text'; content: string }
	| { type: 'term'; content: string; entry: GlossaryEntry };

/** Map from exact term variant to its parent entry for O(1) lookup */
const termMap = new Map<string, GlossaryEntry>();
for (const entry of GLOSSARY_ENTRIES) {
	for (const term of entry.terms) {
		termMap.set(term, entry);
	}
}

/**
 * Collect all term variants, sorted by length descending so longer matches win
 * (e.g. "rsfMRI" before "fMRI" before "MRI").
 */
const allTerms = GLOSSARY_ENTRIES.flatMap((e) => e.terms).sort((a, b) => b.length - a.length);

/**
 * Build a single case-sensitive regex from all term variants.
 * Only exact casings listed in `terms` arrays will match, so common English words
 * like "fast", "first", "bold" won't trigger on their lowercase forms.
 * Uses negative lookbehind/lookahead for letter boundaries to avoid matching inside longer words.
 */
const pattern = new RegExp(
	'(?<![a-zA-Z])(' +
		allTerms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') +
		')(?![a-zA-Z])',
	'g'
);

/**
 * Parse text into segments of plain text and glossary-matched terms.
 * Case-sensitive matching using exact term variants from the glossary.
 */
export function parseGlossaryText(text: string): TextSegment[] {
	if (!text) return [];

	const segments: TextSegment[] = [];
	let lastIndex = 0;

	for (const match of text.matchAll(pattern)) {
		const matchStart = match.index;
		const matchText = match[0];

		// Add preceding plain text
		if (matchStart > lastIndex) {
			segments.push({ type: 'text', content: text.slice(lastIndex, matchStart) });
		}

		const entry = termMap.get(matchText);
		if (entry) {
			segments.push({ type: 'term', content: matchText, entry });
		} else {
			// Shouldn't happen, but fallback to plain text
			segments.push({ type: 'text', content: matchText });
		}

		lastIndex = matchStart + matchText.length;
	}

	// Add trailing plain text
	if (lastIndex < text.length) {
		segments.push({ type: 'text', content: text.slice(lastIndex) });
	}

	return segments;
}

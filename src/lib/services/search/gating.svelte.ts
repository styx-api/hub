/**
 * Whether to run semantic search on this device/session.
 *
 * Default posture is on-by-default, opt-out: capable devices get semantic
 * automatically; phone-class, data-saver, slow-connection, and low-memory
 * contexts default to lexical-only so we never push a ~23MB download where it's
 * unwelcome. A persisted user toggle can force it on or off ('auto' respects the
 * heuristic). The decision is computed once per session and cached.
 */

import { browser } from '$app/environment';

export type SemanticMode = 'auto' | 'on' | 'off';

const STORAGE_KEY = 'niwrap:semantic-search';

// Minimal typings for the non-standard navigator surfaces we read (Chromium-only;
// absent elsewhere, which we treat as "don't block").
interface NetworkInformation {
	saveData?: boolean;
	effectiveType?: string;
}
type NavigatorExt = Navigator & { connection?: NetworkInformation; deviceMemory?: number };

/** The capability heuristic for `auto` mode. Conservative: when unsure, allow. */
function deviceLooksCapable(): boolean {
	if (!browser) return false;
	const nav = navigator as NavigatorExt;
	const conn = nav.connection;
	if (conn?.saveData) return false; // explicit data-saver
	if (conn?.effectiveType && /(^|-)(slow-2g|2g|3g)$/.test(conn.effectiveType)) return false;
	if (typeof nav.deviceMemory === 'number' && nav.deviceMemory < 4) return false; // ~<4GB RAM
	const coarse = window.matchMedia('(pointer: coarse)').matches;
	const narrow = window.matchMedia('(max-width: 640px)').matches;
	if (coarse && narrow) return false; // phone-class → lexical only
	return true;
}

class SemanticSearchStore {
	#mode = $state<SemanticMode>('auto');
	// Capability is cached per session (re-reading media queries on every keystroke
	// is pointless; a device doesn't change class mid-session).
	#capable = false;

	constructor() {
		if (browser) {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored === 'on' || stored === 'off' || stored === 'auto') this.#mode = stored;
			this.#capable = deviceLooksCapable();
		}
	}

	get mode(): SemanticMode {
		return this.#mode;
	}

	/** Resolved decision: should the current search run the semantic pass? */
	get enabled(): boolean {
		if (this.#mode === 'on') return true;
		if (this.#mode === 'off') return false;
		return this.#capable;
	}

	setMode(mode: SemanticMode): void {
		this.#mode = mode;
		if (browser) localStorage.setItem(STORAGE_KEY, mode);
	}

	/** Cycle auto → on → off → auto for a simple one-button control. */
	cycle(): void {
		this.setMode(this.#mode === 'auto' ? 'on' : this.#mode === 'on' ? 'off' : 'auto');
	}
}

export const semanticSearch = new SemanticSearchStore();

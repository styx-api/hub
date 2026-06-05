/**
 * Feature flag for the compile-in-browser path (Phase C / architecture A).
 *
 * Off by default: the hub keeps using the v1 runtime artefacts (catalog schema
 * fetch + the `niwrap.execute` URL bundle). Toggle the new path at runtime, no
 * rebuild needed:
 *   - `?compiler=v2` / `?compiler=on`  - force on (also persists for the session)
 *   - `?compiler=v1` / `?compiler=off` - force off
 *   - otherwise: `localStorage['styx:compileInBrowser'] === '1'`
 *
 * Reads `window`, so it returns `false` during SSR/prerender (the static,
 * compiler-free default).
 */

const STORAGE_KEY = 'styx:compileInBrowser';

export function compileInBrowserEnabled(): boolean {
	if (typeof window === 'undefined') return false;

	const param = new URLSearchParams(window.location.search).get('compiler');
	try {
		if (param === 'v2' || param === 'on') {
			window.localStorage.setItem(STORAGE_KEY, '1');
			return true;
		}
		if (param === 'v1' || param === 'off') {
			window.localStorage.setItem(STORAGE_KEY, '0');
			return false;
		}
		return window.localStorage.getItem(STORAGE_KEY) === '1';
	} catch {
		// localStorage can throw (private mode, blocked cookies); fall back to the
		// query param alone.
		return param === 'v2' || param === 'on';
	}
}

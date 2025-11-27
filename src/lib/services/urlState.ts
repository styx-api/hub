import { goto, replaceState } from '$app/navigation';
import { browser } from '$app/environment';
import { resolve } from '$app/paths';
import { decompressString } from '$lib/utils/compression';

export interface UrlState {
	packageName: string | null;
	appName: string | null;
}

export function parseUrlState(): UrlState {
	if (!browser) return { packageName: null, appName: null };

	const params = new URLSearchParams(window.location.search);
	return {
		packageName: params.get('package'),
		appName: params.get('app')
	};
}

export async function parseConfigFromUrl(): Promise<object | null> {
	if (!browser) return null;

	const params = new URLSearchParams(window.location.search);
	const configParam = params.get('config');
	if (!configParam) return null;

	try {
		const json =
			params.get('enc') === 'gz' ? await decompressString(configParam) : atob(configParam);
		return JSON.parse(json);
	} catch (err) {
		console.error('Failed to parse config from URL:', err);
		return null;
	}
}

export function updateUrl(packageName: string | null, appName: string | null) {
	if (!browser) return;

	const params = new URLSearchParams();
	if (packageName) {
		params.set('package', packageName);
		if (appName) params.set('app', appName);
	}

	const basePath = resolve('/');
	const newUrl = params.toString() ? `${basePath}?${params.toString()}` : basePath;
	const currentUrl = window.location.pathname + window.location.search;

	if (currentUrl !== newUrl) {
		goto(newUrl, { replaceState: false, keepFocus: true, noScroll: true });
	}
}

export function clearConfigFromUrl() {
	if (!browser) return;

	const params = new URLSearchParams(window.location.search);
	params.delete('config');
	params.delete('enc');

	const basePath = resolve('/');
	const newUrl = params.toString() ? `${basePath}?${params.toString()}` : basePath;
	replaceState(newUrl, {});
}

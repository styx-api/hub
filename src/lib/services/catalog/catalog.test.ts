import { afterEach, describe, expect, it, vi } from 'vitest';
import { catalog, toPackageInfo } from './store.svelte';
import { fetchDescriptor, fetchManifest, fetchReleasesIndex } from './types';
import type { ManifestPackage } from './types';

afterEach(() => vi.unstubAllGlobals());

/** Stub global fetch; the handler decides the body per requested URL. */
function mockFetch(
	handler: (url: string) => { ok?: boolean; status?: number; statusText?: string; body?: unknown }
): { urls: string[] } {
	const urls: string[] = [];
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: string | URL) => {
			const url = String(input);
			urls.push(url);
			const r = handler(url);
			return {
				ok: r.ok ?? true,
				status: r.status ?? 200,
				statusText: r.statusText ?? 'OK',
				json: async () => r.body,
				text: async () => r.body
			} as unknown as Response;
		})
	);
	return { urls };
}

describe('toPackageInfo', () => {
	it('maps a manifest package to the consumer shape (apps -> names)', () => {
		const pkg: ManifestPackage = {
			name: 'fsl',
			version: '6.0.4',
			container: 'brainlife/fsl:6.0.4-patched2',
			neurodeskId: 'fsl',
			docs: { title: 'FSL', description: 'FMRIB Software Library' },
			apps: [
				{
					name: 'bet',
					descriptor: 'descriptors/fsl/bet.json',
					format: 'boutiques',
					description: 'x'
				},
				{ name: 'asl_calib' } // listed but unwrapped: no descriptor/format
			]
		};

		expect(toPackageInfo(pkg)).toEqual({
			package: {
				name: 'fsl',
				neurodeskId: 'fsl',
				docs: { title: 'FSL', description: 'FMRIB Software Library' }
			},
			version: {
				name: '6.0.4',
				container: 'brainlife/fsl:6.0.4-patched2',
				apps: ['bet', 'asl_calib']
			}
		});
	});

	it('tolerates optional package fields (no container/neurodeskId/docs)', () => {
		const pkg: ManifestPackage = { name: 'greedy', version: '1.3.0', apps: [{ name: 'greedy' }] };
		const info = toPackageInfo(pkg);
		expect(info.package).toEqual({ name: 'greedy', neurodeskId: undefined, docs: undefined });
		expect(info.version).toEqual({ name: '1.3.0', container: undefined, apps: ['greedy'] });
	});
});

describe('hosted-layout URLs', () => {
	it('fetchReleasesIndex hits niwrap/index.json', async () => {
		const { urls } = mockFetch(() => ({ body: { latest: '1.0.0', versions: [] } }));
		await fetchReleasesIndex();
		expect(urls).toEqual(['https://niwrap.dev/niwrap/index.json']);
	});

	it('fetchManifest resolves the index catalog path against the Pages root', async () => {
		const { urls } = mockFetch(() => ({ body: { version: '1.0.0', packages: [] } }));
		await fetchManifest('1.0.0/catalog.json');
		expect(urls).toEqual(['https://niwrap.dev/niwrap/1.0.0/catalog.json']);
	});

	it('fetchDescriptor builds a version-scoped descriptor URL and returns text', async () => {
		const { urls } = mockFetch(() => ({ body: '{"name":"bet"}' }));
		const text = await fetchDescriptor('1.0.0', 'descriptors/fsl/bet.json');
		expect(urls).toEqual(['https://niwrap.dev/niwrap/1.0.0/descriptors/fsl/bet.json']);
		expect(text).toBe('{"name":"bet"}');
	});

	it('throws with status detail on a failed descriptor fetch', async () => {
		mockFetch(() => ({ ok: false, status: 404, statusText: 'Not Found' }));
		await expect(fetchDescriptor('1.0.0', 'descriptors/x/y.json')).rejects.toThrow(/404/);
	});
});

describe('catalog store', () => {
	it('exposes the manifest compiler after load (for the lockstep check)', async () => {
		mockFetch((url) =>
			url.includes('index.json')
				? {
						body: {
							schemaVersion: 1,
							project: 'niwrap',
							latest: '1.0.0',
							versions: [
								{
									version: '1.0.0',
									catalog: '1.0.0/catalog.json',
									compiler: '@styx-api/core@0.2.0'
								}
							]
						}
					}
				: {
						body: {
							schemaVersion: 1,
							project: 'niwrap',
							version: '1.0.0',
							compiler: { name: '@styx-api/core', version: '0.2.0' },
							descriptorBase: 'descriptors',
							packages: []
						}
					}
		);

		expect(catalog.compiler).toBeNull();
		await catalog.load();
		expect(catalog.compiler).toEqual({ name: '@styx-api/core', version: '0.2.0' });
	});
});

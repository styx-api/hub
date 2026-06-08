import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EmbeddingsSource } from '$lib/services/catalog';

// Mock the catalog store (its getEmbeddingsSource feeds loadIndex) and the
// embedder worker client (no real model/worker in unit tests). The mock fns are
// created via vi.hoisted so they exist when the hoisted vi.mock factories run.
const { getEmbeddingsSource, embed } = vi.hoisted(() => ({
	getEmbeddingsSource: vi.fn<() => EmbeddingsSource | null>(),
	embed: vi.fn<(texts: string[]) => Promise<number[][]>>()
}));
vi.mock('$lib/services/catalog', () => ({
	catalog: { load: vi.fn(async () => undefined), getEmbeddingsSource }
}));
vi.mock('./embedder/client', () => ({ embed }));

import { loadIndex, semanticScores, __resetIndexCache } from './semantic';

// Fixture must use the real dim — loadIndex enforces the matched-pair invariant
// (meta.dim === EMBED_DIM === 384). row0 is the e0 basis vector, row1 is e1.
const DIM = 384;
const META = {
	model: 'Xenova/all-MiniLM-L6-v2',
	dim: DIM,
	encoding: 'f32',
	version: '1.0.0',
	count: 2,
	tools: [
		{ tool_id: 'a/x', name: 'x', package: 'a' },
		{ tool_id: 'b/y', name: 'y', package: 'b' }
	]
};
const VEC = new Float32Array(2 * DIM);
VEC[0] = 1; // row0 = e0
VEC[DIM + 1] = 1; // row1 = e1
const VEC_BUF = VEC.buffer;

const source = (over: Partial<EmbeddingsSource> = {}): EmbeddingsSource => ({
	version: '1.0.0',
	model: 'Xenova/all-MiniLM-L6-v2',
	dim: DIM,
	count: 2,
	metaUrl: 'https://niwrap.dev/niwrap/1.0.0/embeddings.meta.json',
	vectorsUrl: 'https://niwrap.dev/niwrap/1.0.0/embeddings.f32',
	...over
});

function mockFetch(opts: {
	meta?: unknown;
	metaOk?: boolean;
	vecOk?: boolean;
	vecBuf?: ArrayBuffer;
}) {
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: string | URL) => {
			const url = String(input);
			const isMeta = url.includes('meta');
			return {
				ok: isMeta ? (opts.metaOk ?? true) : (opts.vecOk ?? true),
				json: async () => opts.meta ?? META,
				arrayBuffer: async () => opts.vecBuf ?? VEC_BUF
			} as unknown as Response;
		})
	);
}

beforeEach(() => {
	__resetIndexCache();
	getEmbeddingsSource.mockReset();
	embed.mockReset();
});
afterEach(() => vi.unstubAllGlobals());

describe('loadIndex', () => {
	it('returns null when the version announces no embeddings', async () => {
		getEmbeddingsSource.mockReturnValue(null);
		expect(await loadIndex()).toBeNull();
	});

	it('returns null on a model mismatch (matched-pair invariant)', async () => {
		getEmbeddingsSource.mockReturnValue(source({ model: 'some/other-model' }));
		expect(await loadIndex()).toBeNull();
	});

	it('returns null when the blob byte length disagrees with the declared shape', async () => {
		getEmbeddingsSource.mockReturnValue(source());
		mockFetch({ vecBuf: new Float32Array(100).buffer }); // not count*dim*4
		expect(await loadIndex()).toBeNull();
	});

	it('returns null on a failed fetch', async () => {
		getEmbeddingsSource.mockReturnValue(source());
		mockFetch({ vecOk: false });
		expect(await loadIndex()).toBeNull();
	});

	it('loads + validates a well-formed index', async () => {
		getEmbeddingsSource.mockReturnValue(source());
		mockFetch({});
		const idx = await loadIndex();
		expect(idx?.meta.count).toBe(2);
		expect(idx?.vectors.length).toBe(2 * DIM);
	});

	it('retries after a transient failure rather than caching null for the session', async () => {
		getEmbeddingsSource.mockReturnValue(source());
		mockFetch({ vecOk: false }); // first attempt fails
		expect(await loadIndex()).toBeNull();
		mockFetch({}); // connectivity restored
		const idx = await loadIndex(); // must refetch, not return the cached null
		expect(idx?.meta.count).toBe(2);
	});

	it('caches a successful load (no refetch on the second call)', async () => {
		getEmbeddingsSource.mockReturnValue(source());
		mockFetch({});
		await loadIndex();
		const fetchSpy = vi.mocked(fetch);
		const callsAfterFirst = fetchSpy.mock.calls.length;
		await loadIndex();
		expect(fetchSpy.mock.calls.length).toBe(callsAfterFirst); // served from cache
	});
});

describe('semanticScores', () => {
	it('returns null (lexical fallback) when no index is available', async () => {
		getEmbeddingsSource.mockReturnValue(null);
		expect(await semanticScores('skull strip')).toBeNull();
	});

	it('returns null when query embedding fails', async () => {
		getEmbeddingsSource.mockReturnValue(source());
		mockFetch({});
		embed.mockRejectedValue(new Error('model failed to load'));
		expect(await semanticScores('skull strip')).toBeNull();
	});

	it('cosines the query vector against every row', async () => {
		getEmbeddingsSource.mockReturnValue(source());
		mockFetch({});
		const q = new Array(DIM).fill(0);
		q[0] = 1; // query == e0 → matches row0 (a/x), orthogonal to row1 (b/y)
		embed.mockResolvedValue([q]);
		const scores = await semanticScores('q');
		expect(scores?.get('a/x')).toBeCloseTo(1);
		expect(scores?.get('b/y')).toBeCloseTo(0);
	});
});

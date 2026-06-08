/// <reference lib="webworker" />

/**
 * Query-embedding worker.
 *
 * Loads the all-MiniLM-L6-v2 sentence-embedding model (~23MB ONNX) via
 * transformers.js and embeds the *search query* into a 384-d, mean-pooled,
 * L2-normalized vector — the same space the published tool vectors live in.
 * Tool vectors are precomputed in niwrap CI; only the query is embedded live.
 *
 * It runs in a worker for the same reason the compiler does: keep the chunky
 * model + ONNX runtime off the main bundle/thread. The model download + WASM
 * compile happen here, on first embed — never at page load.
 */

import { env, pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers';
import { EMBED_MODEL } from '../contract';
import type { EmbedRequest, EmbedResponse } from './protocol';

// Where the model weights are served from. We default to the HF CDN (the
// transformers.js default) so this works before niwrap.dev hosts the model;
// flip MODEL_HOST to 'https://niwrap.dev' (with the files laid out under
// `<host>/<remotePathTemplate>`) to serve same-origin alongside the vectors.
const MODEL_HOST: string | null = null;
if (MODEL_HOST) {
	env.allowLocalModels = false;
	env.remoteHost = MODEL_HOST;
}

let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;

/** Lazily build the pipeline: prefer WebGPU, fall back to WASM (the universal floor). */
function getExtractor(): Promise<FeatureExtractionPipeline> {
	if (!extractorPromise) {
		extractorPromise = (async () => {
			try {
				return await pipeline('feature-extraction', EMBED_MODEL, { device: 'webgpu' });
			} catch {
				return await pipeline('feature-extraction', EMBED_MODEL, { device: 'wasm' });
			}
		})();
	}
	return extractorPromise;
}

self.onmessage = async (ev: MessageEvent<EmbedRequest>) => {
	const { id, texts } = ev.data;
	try {
		const extractor = await getExtractor();
		const out = await extractor(texts, { pooling: 'mean', normalize: true });
		const vectors = out.tolist() as number[][];
		const res: EmbedResponse = { id, ok: true, vectors };
		self.postMessage(res);
	} catch (err) {
		const res: EmbedResponse = {
			id,
			ok: false,
			error: err instanceof Error ? err.message : String(err)
		};
		self.postMessage(res);
	}
};

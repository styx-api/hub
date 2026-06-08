/**
 * Main-thread client for the query-embedding worker.
 *
 * Lazily spawns the worker on first `embed()` (never at page load), correlates
 * request/response by id, and re-spawns on a worker-level failure. The heavy
 * transformers.js import lives only in worker.ts, so it never enters the main
 * bundle. Mirrors the compiler client (services/compiler/client.ts).
 */

import { browser } from '$app/environment';
import type { EmbedRequest, EmbedResponse } from './protocol';

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, (res: EmbedResponse) => void>();

function getWorker(): Worker {
	if (!worker) {
		worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
		worker.onmessage = (ev: MessageEvent<EmbedResponse>) => {
			const resolve = pending.get(ev.data.id);
			if (resolve) {
				pending.delete(ev.data.id);
				resolve(ev.data);
			}
		};
		worker.onerror = (ev) => {
			// A worker-level failure (bad import, model load crash) can't be tied to
			// one request: fail everything in flight and drop the worker so the next
			// call respawns. Callers treat a rejection as "semantic unavailable" and
			// fall back to lexical.
			ev.preventDefault?.();
			const message = ev.message || 'The query embedder stopped unexpectedly.';
			for (const [id, resolve] of pending) resolve({ id, ok: false, error: message });
			pending.clear();
			worker?.terminate();
			worker = null;
		};
	}
	return worker;
}

/** Embed texts into 384-d L2-normalized vectors. Rejects if the model/worker fails. */
export function embed(texts: string[]): Promise<number[][]> {
	if (!browser) return Promise.reject(new Error('embedder is browser-only'));
	const id = nextId++;
	return new Promise((resolve, reject) => {
		pending.set(id, (res) => (res.ok ? resolve(res.vectors) : reject(new Error(res.error))));
		const req: EmbedRequest = { id, texts };
		getWorker().postMessage(req);
	});
}

/**
 * Main-thread client for the compile-in-browser worker (Phase C / H3 + H4).
 *
 * Lazily spawns the worker on first use, correlates request/response by id, and
 * exposes the two operations the app page needs: compile a descriptor to its
 * form schemas, and execute a config to a command line + outputs. The execute
 * result mirrors the legacy `niwrapExecute` shape so call sites stay uniform.
 */

import type { WorkerRequest, WorkerResponse } from './types';

export interface CompileResult {
	inputSchema: object;
	outputSchema: object;
	/** Root `@type` discriminator (`<pkg>/<app>`). */
	appType: string;
}

export type ExecutionResult =
	| { success: true; cargs: string[]; outputObject: Record<string, unknown> }
	| { success: false; error: string };

/** Distributive omit so the discriminated-union members keep their own fields. */
type WithoutId<T> = T extends unknown ? Omit<T, 'id'> : never;

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, (res: WorkerResponse) => void>();

function getWorker(): Worker {
	if (!worker) {
		worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
		worker.onmessage = (ev: MessageEvent<WorkerResponse>) => {
			const resolve = pending.get(ev.data.id);
			if (resolve) {
				pending.delete(ev.data.id);
				resolve(ev.data);
			}
		};
		worker.onerror = (ev) => {
			// A worker-level failure (e.g. a bad import) can't be tied to one request;
			// fail everything in flight and drop the worker so the next call respawns.
			// In practice this only fires at spawn/import time - compile and execute
			// errors are caught inside the worker - so a successful compile implies a
			// stable worker. The respawned worker starts with an empty cache; recovery
			// (recompile) happens when the app reloads. Full crash-recovery is H6.
			const message = ev.message || 'compiler worker crashed';
			for (const [id, resolve] of pending) {
				resolve({ kind: 'error', id, ok: false, error: message });
			}
			pending.clear();
			worker?.terminate();
			worker = null;
		};
	}
	return worker;
}

function send(req: WithoutId<WorkerRequest>): Promise<WorkerResponse> {
	const id = nextId++;
	return new Promise((resolve) => {
		pending.set(id, resolve);
		getWorker().postMessage({ ...req, id } as WorkerRequest);
	});
}

export async function compileTool(
	descriptor: string,
	packageName: string,
	appName: string,
	projectName: string
): Promise<CompileResult> {
	const res = await send({ kind: 'compile', descriptor, packageName, appName, projectName });
	if (!res.ok) throw new Error(res.error);
	if (res.kind !== 'compile') throw new Error('unexpected worker response for compile');
	return { inputSchema: res.inputSchema, outputSchema: res.outputSchema, appType: res.appType };
}

export async function executeTool(config: Record<string, unknown>): Promise<ExecutionResult> {
	const appType = config['@type'];
	if (typeof appType !== 'string') {
		return { success: false, error: 'Invalid config: missing @type' };
	}
	// The form's config is a Svelte `$state` proxy, which `worker.postMessage`
	// (structured clone) cannot serialize - it throws and the request silently
	// never reaches the worker. The config is plain JSON data, so round-trip it
	// to a clonable plain object first.
	const plainConfig = JSON.parse(JSON.stringify(config)) as Record<string, unknown>;
	const res = await send({ kind: 'execute', appType, config: plainConfig });
	if (!res.ok) return { success: false, error: res.error };
	if (res.kind !== 'execute')
		return { success: false, error: 'unexpected worker response for execute' };
	return { success: true, cargs: res.cargs, outputObject: res.outputs as Record<string, unknown> };
}

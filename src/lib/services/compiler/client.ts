/**
 * Main-thread client for the compile-in-browser worker (Phase C / H3 + H4).
 *
 * Lazily spawns the worker on first use, correlates request/response by id, and
 * exposes the two operations the app page needs: compile a descriptor to its
 * form schemas, and execute a config to a command line + outputs (plus the call
 * snippets, which ride along on the execute result).
 */

import type { WorkerRequest, WorkerResponse } from './types';

export interface CompileResult {
	inputSchema: object;
	outputSchema: object;
	/** Root `@type` discriminator (`<pkg>/<app>`). */
	appType: string;
}

/**
 * Call snippets for the current config (H5). Rendered by the worker alongside
 * the command and attached to both result branches, so the Python / TypeScript
 * tabs show a best-effort call even when the command itself errors. `snippetError`
 * is set only if rendering the snippets threw (rare).
 */
export interface Snippets {
	python: string;
	typescript: string;
	snippetError: string | null;
}

export type ExecutionResult =
	| ({ success: true; cargs: string[]; outputObject: Record<string, unknown> } & Snippets)
	| ({ success: false; error: string } & Snippets);

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
	projectName: string,
	format?: string
): Promise<CompileResult> {
	const res = await send({
		kind: 'compile',
		descriptor,
		packageName,
		appName,
		projectName,
		format
	});
	if (!res.ok) throw new Error(res.error);
	if (res.kind !== 'compile') throw new Error('unexpected worker response for compile');
	return { inputSchema: res.inputSchema, outputSchema: res.outputSchema, appType: res.appType };
}

/** A failure with no snippets (the config never reached a successful render). */
function failed(error: string): ExecutionResult {
	return { success: false, error, python: '', typescript: '', snippetError: null };
}

export async function executeTool(config: Record<string, unknown>): Promise<ExecutionResult> {
	const appType = config['@type'];
	if (typeof appType !== 'string') {
		return failed('Invalid config: missing @type');
	}
	// The form's config is a Svelte `$state` proxy, which `worker.postMessage`
	// (structured clone) cannot serialize - it throws and the request silently
	// never reaches the worker. The config is plain JSON data, so round-trip it
	// to a clonable plain object first.
	const plainConfig = JSON.parse(JSON.stringify(config)) as Record<string, unknown>;
	const res = await send({ kind: 'execute', appType, config: plainConfig });
	if (!res.ok) return failed(res.error);
	if (res.kind !== 'execute') return failed('unexpected worker response for execute');
	const snippets: Snippets = {
		python: res.python,
		typescript: res.typescript,
		snippetError: res.snippetError
	};
	// A run that threw (e.g. a missing required input) is a command failure, but
	// its call snippets still rendered - surface them with the error.
	if (res.commandError) return { success: false, error: res.commandError, ...snippets };
	return {
		success: true,
		cargs: res.cargs,
		outputObject: res.outputs as Record<string, unknown>,
		...snippets
	};
}

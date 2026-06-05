/**
 * Message protocol between the main thread and the compile-in-browser Web Worker
 * (Phase C / H3 + H4). The worker bundles `@styx-api/core` and turns one
 * Boutiques descriptor into the form schemas (H3) and, per config, the command
 * line + outputs via transpile-and-run (H4).
 */

export interface CompileRequest {
	kind: 'compile';
	id: number;
	/** Raw Boutiques descriptor text (the niwrap `boutiques.json`). */
	descriptor: string;
	/** Package name - sets the tool's `@type` prefix (`<pkg>/<app>`). */
	packageName: string;
	/** App name, for diagnostics only. */
	appName: string;
	/** Project name (`niwrap`) - threaded into the codegen context. */
	projectName: string;
}

export interface ExecuteRequest {
	kind: 'execute';
	id: number;
	/** `config['@type']` - routes to the cached compiled tool. */
	appType: string;
	/** The descriptor config produced by the form. */
	config: Record<string, unknown>;
}

export type WorkerRequest = CompileRequest | ExecuteRequest;

export interface CompileResponse {
	kind: 'compile';
	id: number;
	ok: true;
	/** Root `@type` discriminator (`<pkg>/<app>`); the execute cache key. */
	appType: string;
	inputSchema: object;
	outputSchema: object;
}

export interface ExecuteResponse {
	kind: 'execute';
	id: number;
	ok: true;
	/** Python call snippet (`renderPythonCall`); best-effort even on command error. */
	python: string;
	/** TypeScript call snippet (`renderTypeScriptCall`); best-effort even on command error. */
	typescript: string;
	/** Set if rendering the snippets threw (rare); the snippet strings are empty then. */
	snippetError: string | null;
	cargs: string[];
	outputs: unknown;
	/**
	 * Set if running the generated code threw (e.g. a config missing a required
	 * input). Reported separately from `snippetError` so a config that fails
	 * validation still shows its best-effort call snippets, as it did pre-Phase-C.
	 */
	commandError: string | null;
}

export interface ErrorResponse {
	kind: 'error';
	id: number;
	ok: false;
	error: string;
}

export type WorkerResponse = CompileResponse | ExecuteResponse | ErrorResponse;

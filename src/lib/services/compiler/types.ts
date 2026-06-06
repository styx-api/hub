/**
 * Message protocol between the main thread and the compile-in-browser Web Worker
 * (Phase C / H3 + H4). The worker bundles `@styx-api/core` and turns one
 * Boutiques descriptor into the form schemas (H3) and, per config, the command
 * line + outputs via transpile-and-run (H4).
 */

export interface CompileRequest {
	kind: 'compile';
	id: number;
	/** Raw descriptor text (the niwrap `boutiques.json` / `workbench.json`). */
	descriptor: string;
	/** Package name - sets the tool's `@type` prefix (`<pkg>/<app>`). */
	packageName: string;
	/** App name, for diagnostics only. */
	appName: string;
	/** Project name (`niwrap`) - threaded into the codegen context. */
	projectName: string;
	/** Descriptor format hint from the manifest (`boutiques` | `workbench`); auto-detected if omitted. */
	format?: string;
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

/**
 * A 2-file "delegation" codegen target (nipype Interface / pydra task, experimental
 * in `@styx-api/core` 0.5.0). `module` is the interface/task file; it delegates
 * execution by importing the co-located styx Python wrapper as `_<styxStem>.py`,
 * whose content is the response's `pythonModule`. So a working vendor needs both
 * `<ifaceStem>.py` (this `module`) and `<styxStem>.py` (`pythonModule`). The stems
 * come from the compiler (`nipypeNames`/`pydraNames`), not the tool name, because
 * the import target must be a valid Python module (e.g. `3dcalc` -> `_v_3dcalc`).
 */
export interface DelegationArtifact {
	/** The nipype Interface / pydra task module source (the `<ifaceStem>.py` file). */
	module: string;
	/** File stem for the interface/task file (e.g. `bet`, `v_3dcalc`). */
	ifaceStem: string;
	/** File stem for the co-located styx wrapper, content = `pythonModule` (e.g. `_bet`, `_v_3dcalc`). */
	styxStem: string;
}

export interface CompileResponse {
	kind: 'compile';
	id: number;
	ok: true;
	/** Root `@type` discriminator (`<pkg>/<app>`); the execute cache key. */
	appType: string;
	inputSchema: object;
	outputSchema: object;
	/**
	 * Full generated single-tool wrapper modules (config-independent, so computed
	 * once per compile). Self-contained except for the `styxdefs` runtime import,
	 * so the UI can offer them as copy-paste "vendor one tool" artifacts.
	 */
	pythonModule: string;
	typescriptModule: string;
	/**
	 * The tool's Boutiques descriptor, regenerated from the IR (config-independent).
	 * A portable, language-neutral spec offered alongside the wrappers in the
	 * "vendor one tool" tab; pretty-printed JSON, ready to write to a file.
	 */
	boutiquesDescriptor: string;
	/**
	 * The compiler's canonical module stem for the tool (`bet`, `v_3dcalc`) - a valid
	 * identifier even when the raw tool name isn't, so the UI names the vendored files
	 * after it (matching the delegation files' stems). `null` only if unavailable.
	 */
	moduleStem: string | null;
	/**
	 * Experimental Python-ecosystem workflow targets (config-independent), or `null`
	 * when generation isn't applicable/failed for this tool. Each delegates execution
	 * to `pythonModule` - see {@link DelegationArtifact}.
	 */
	nipype: DelegationArtifact | null;
	pydra: DelegationArtifact | null;
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

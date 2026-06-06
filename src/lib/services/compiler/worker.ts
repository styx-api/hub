/// <reference lib="webworker" />

/**
 * Compile-in-browser worker (Phase C / H3 + H4, architecture A).
 *
 * Bundles `@styx-api/core` and, for one Boutiques descriptor:
 *  - H3: `compile -> defaultPipeline -> solve -> resolveOutputs -> createContext`,
 *    then `generateSchema` / `generateOutputsSchema` for the forms.
 *  - H4: `generateTypeScript` -> sucrase (type-strip + ESM->CJS) -> eval against
 *    the real `styxdefs` `DryRunner` to get `{ cargs, outputs }`. The export to
 *    call is the compiler's own `appEntrypoint(ctx).executeFn` - no name
 *    recomputation here.
 *
 * A single tool compiles in well under a millisecond; the worker exists to keep
 * the (chunky) compiler import off the main bundle/thread, not for raw speed.
 * The transpiled+eval'd execute fn is cached per `@type` so each config change
 * is just a function call.
 */

import {
	appEntrypoint,
	buildTypedSpec,
	compile,
	createContext,
	defaultPipeline,
	generateBoutiques,
	generateNipype,
	generateOutputsSchema,
	generatePydra,
	generatePython,
	generateSchema,
	generateTypeScript,
	nipypeNames,
	pydraNames,
	renderPythonCall,
	renderTypeScriptCall,
	resolveOutputs,
	solve,
	type CodegenContext,
	type FormatName
} from '@styx-api/core';
import { transform } from 'sucrase';
import * as styxdefs from 'styxdefs';
import type { DelegationArtifact, WorkerRequest, WorkerResponse } from './types';

type ExecuteFn = (config: Record<string, unknown>, runner: styxdefs.Runner) => unknown;

interface CompiledTool {
	inputSchema: object;
	outputSchema: object;
	execute: ExecuteFn;
	/**
	 * The compiled context, kept so the call snippets (H5) can be rendered per
	 * config via `renderPythonCall` / `renderTypeScriptCall` - they need the
	 * `BoundType` tree, which only lives here in the worker.
	 */
	ctx: CodegenContext;
}

// Keyed by root `@type` (`<pkg>/<app>`). Single tool shown at a time, but a small
// map keeps execute routing correct if the user flips between tools quickly. Bounded
// (FIFO) so a long browsing session across many tools can't grow it without limit.
const cache = new Map<string, CompiledTool>();
const MAX_CACHED_TOOLS = 16;

/**
 * Transpile generated TypeScript to CJS and evaluate it, resolving its
 * `require("styxdefs")` to the worker's real `styxdefs` and returning the named
 * execute export.
 */
function buildExecute(tsCode: string, executeName: string): ExecuteFn {
	const { code } = transform(tsCode, { transforms: ['typescript', 'imports'] });

	const module = { exports: {} as Record<string, unknown> };
	const requireShim = (name: string): unknown => {
		if (name === 'styxdefs') return styxdefs;
		throw new Error(`generated code required an unexpected module: ${name}`);
	};

	const factory = new Function('require', 'module', 'exports', code);
	factory(requireShim, module, module.exports);

	const exec = module.exports[executeName];
	if (typeof exec !== 'function') {
		throw new Error(`generated module is missing the execute export "${executeName}"`);
	}
	return exec as ExecuteFn;
}

/**
 * Build a 2-file delegation artifact (nipype/pydra) defensively. These backends
 * are experimental in 0.5.0 and "degrade/skip" on tools whose solved root is not
 * a struct (no flat kwarg surface), so a throw here must not blank the core
 * python/typescript/schema outputs - it just leaves that target unavailable
 * (the UI disables its option).
 */
function delegationArtifact(
	gen: (ctx: CodegenContext) => string,
	names: (ctx: CodegenContext) => { ifaceStem: string; styxStem: string },
	ctx: CodegenContext
): DelegationArtifact | null {
	try {
		const n = names(ctx);
		return { module: gen(ctx), ifaceStem: n.ifaceStem, styxStem: n.styxStem };
	} catch (err) {
		// Expected for tools the solver collapses to a non-struct root (no kwarg
		// surface). Log it anyway so a genuine codegen regression - which would make
		// the target silently unavailable for *every* tool - is distinguishable from
		// the per-tool "not applicable" case rather than vanishing into a bare catch.
		console.warn('delegation codegen skipped:', err instanceof Error ? err.message : err);
		return null;
	}
}

/**
 * The compiler's canonical Python module stem for the tool (`bet`, `v_3dcalc`,
 * `chauffeur_afni`) - always a valid module identifier, unlike the raw tool name
 * (`3dcalc` can't name a Python module). Used for the vendored filenames so they
 * match the delegation files' stems. `null` only if the projection throws.
 */
function toolModuleStem(ctx: CodegenContext): string | null {
	try {
		return buildTypedSpec(ctx).delegation.moduleName || null;
	} catch {
		return null;
	}
}

function compileTool(
	descriptor: string,
	packageName: string,
	projectName: string,
	appName: string,
	format?: string
): {
	appType: string;
	tool: CompiledTool;
	pythonModule: string;
	typescriptModule: string;
	boutiquesDescriptor: string;
	moduleStem: string | null;
	nipype: DelegationArtifact | null;
	pydra: DelegationArtifact | null;
} {
	// Honor the manifest's declared format (authoritative) rather than sniffing.
	const parsed = format
		? compile(descriptor, { format: format as FormatName, filename: appName })
		: compile(descriptor);
	if (parsed.errors.length > 0) {
		throw new Error(`compiling ${appName}: ${parsed.errors.map((e) => e.message).join('; ')}`);
	}

	const piped = defaultPipeline.apply(parsed.expr);
	const solveResult = solve(piped.expr);
	const outputs = resolveOutputs(piped.expr, solveResult);
	const ctx = createContext(piped.expr, solveResult, outputs, {
		app: parsed.meta,
		package: { name: packageName },
		project: { name: projectName }
	});

	const entry = appEntrypoint(ctx);
	if (!entry) {
		throw new Error(`${appName} has no dispatch entrypoint (missing app id or package name)`);
	}

	// The full generated TS module doubles as both the execute source (transpiled
	// and eval'd) and a copy-paste artifact for the UI, so generate it once. Python,
	// both modules, and the regenerated Boutiques descriptor are config-independent,
	// so they ride on the compile response (computed once per tool) rather than the
	// per-config execute response.
	const typescriptModule = generateTypeScript(ctx);
	const tool: CompiledTool = {
		inputSchema: generateSchema(ctx),
		outputSchema: generateOutputsSchema(ctx),
		execute: buildExecute(typescriptModule, entry.executeFn),
		ctx
	};
	const boutiquesDescriptor = JSON.stringify(generateBoutiques(ctx).descriptor, null, 2);
	// The nipype Interface / pydra task delegate execution to the styx Python
	// wrapper they import as `_<styxStem>.py` (content = `pythonModule`), so they
	// ship as a 2-file package; the UI pairs each with `pythonModule` under that stem.
	return {
		appType: entry.type,
		tool,
		pythonModule: generatePython(ctx),
		typescriptModule,
		boutiquesDescriptor,
		moduleStem: toolModuleStem(ctx),
		nipype: delegationArtifact(generateNipype, nipypeNames, ctx),
		pydra: delegationArtifact(generatePydra, pydraNames, ctx)
	};
}

function handle(msg: WorkerRequest): WorkerResponse {
	if (msg.kind === 'compile') {
		const {
			appType,
			tool,
			pythonModule,
			typescriptModule,
			boutiquesDescriptor,
			moduleStem,
			nipype,
			pydra
		} = compileTool(msg.descriptor, msg.packageName, msg.projectName, msg.appName, msg.format);
		cache.set(appType, tool);
		if (cache.size > MAX_CACHED_TOOLS) {
			const oldest = cache.keys().next().value;
			if (oldest !== undefined) cache.delete(oldest);
		}
		return {
			kind: 'compile',
			id: msg.id,
			ok: true,
			appType,
			inputSchema: tool.inputSchema,
			outputSchema: tool.outputSchema,
			pythonModule,
			typescriptModule,
			boutiquesDescriptor,
			moduleStem,
			nipype,
			pydra
		};
	}

	const tool = cache.get(msg.appType);
	if (!tool) {
		throw new Error(`no compiled tool for @type "${msg.appType}" - compile it first`);
	}

	// Snippets (H5) and the command (H4) both derive from the config but fail
	// independently: a config missing a required input throws when run yet still
	// has a meaningful best-effort call snippet (only the fields it set), so guard
	// each so one failure doesn't blank out the other. The package import root
	// tracks `ctx.project.name` ("niwrap"), so no `packageRoot` override is needed.
	let python = '';
	let typescript = '';
	let snippetError: string | null = null;
	try {
		python = renderPythonCall(tool.ctx, msg.config);
		typescript = renderTypeScriptCall(tool.ctx, msg.config);
	} catch (err) {
		snippetError = err instanceof Error ? err.message : String(err);
	}

	// A fresh DryRunner per run isolates `lastCargs`. The generated execute fn
	// uses the runner we pass (it only falls back to the global runner when none
	// is given), so no `setGlobalRunner` is needed.
	let cargs: string[] = [];
	let outputs: unknown = null;
	let commandError: string | null = null;
	try {
		const runner = new styxdefs.DryRunner();
		outputs = tool.execute(msg.config, runner);
		cargs = runner.lastCargs ?? [];
	} catch (err) {
		commandError = err instanceof Error ? err.message : String(err);
	}

	return {
		kind: 'execute',
		id: msg.id,
		ok: true,
		python,
		typescript,
		snippetError,
		cargs,
		outputs,
		commandError
	};
}

self.onmessage = (ev: MessageEvent<WorkerRequest>) => {
	const msg = ev.data;
	try {
		self.postMessage(handle(msg));
	} catch (err) {
		const res: WorkerResponse = {
			kind: 'error',
			id: msg.id,
			ok: false,
			error: err instanceof Error ? err.message : String(err)
		};
		self.postMessage(res);
	}
};

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
	compile,
	createContext,
	defaultPipeline,
	generateOutputsSchema,
	generateSchema,
	generateTypeScript,
	resolveOutputs,
	solve
} from '@styx-api/core';
import { transform } from 'sucrase';
import * as styxdefs from 'styxdefs';
import type { WorkerRequest, WorkerResponse } from './types';

type ExecuteFn = (config: Record<string, unknown>, runner: styxdefs.Runner) => unknown;

interface CompiledTool {
	inputSchema: object;
	outputSchema: object;
	execute: ExecuteFn;
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

function compileTool(
	descriptor: string,
	packageName: string,
	projectName: string,
	appName: string
): { appType: string; tool: CompiledTool } {
	const parsed = compile(descriptor);
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

	const tool: CompiledTool = {
		inputSchema: generateSchema(ctx),
		outputSchema: generateOutputsSchema(ctx),
		execute: buildExecute(generateTypeScript(ctx), entry.executeFn)
	};
	return { appType: entry.type, tool };
}

function handle(msg: WorkerRequest): WorkerResponse {
	if (msg.kind === 'compile') {
		const { appType, tool } = compileTool(
			msg.descriptor,
			msg.packageName,
			msg.projectName,
			msg.appName
		);
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
			outputSchema: tool.outputSchema
		};
	}

	const tool = cache.get(msg.appType);
	if (!tool) {
		throw new Error(`no compiled tool for @type "${msg.appType}" - compile it first`);
	}
	// A fresh DryRunner per run isolates `lastCargs`. The generated execute fn
	// uses the runner we pass (it only falls back to the global runner when none
	// is given), so no `setGlobalRunner` is needed.
	const runner = new styxdefs.DryRunner();
	const outputs = tool.execute(msg.config, runner);
	return { kind: 'execute', id: msg.id, ok: true, cargs: runner.lastCargs ?? [], outputs };
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

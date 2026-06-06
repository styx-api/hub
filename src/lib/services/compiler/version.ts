/**
 * Compiler-version lockstep (Phase C / H6, C8).
 *
 * The hub compiles descriptors in-browser with its bundled `@styx-api/core`, but
 * users `pip install niwrap` / `npm install niwrap` built by the compiler version
 * recorded in the manifest (`compiler.version`). When those drift, the command and
 * snippets the hub shows can differ from the installed package, so we surface the
 * bundled version and warn on mismatch.
 *
 * The bundled version is injected at build time by a Vite `define`
 * (`__STYX_CORE_VERSION__`, see `vite.config.ts`) - it is never recomputed or
 * hardcoded here.
 */

/** The `@styx-api/core` version bundled into this hub build. `"unknown"` if unresolved. */
export const BUNDLED_CORE_VERSION: string =
	typeof __STYX_CORE_VERSION__ !== 'undefined' ? __STYX_CORE_VERSION__ : 'unknown';

/** The compiler package the hub bundles; manifests name the same package. */
export const BUNDLED_CORE_NAME = '@styx-api/core';

/** The manifest's `compiler` block ({@link Manifest.compiler}). */
export interface ManifestCompiler {
	name: string;
	version: string;
	gitRef?: string;
}

export interface CompilerStatus {
	/** Compiler package name (from the manifest). */
	name: string;
	/** Compiler version that built the published release (manifest). */
	manifestVersion: string;
	/** `@styx-api/core` version bundled into this hub build. */
	bundledVersion: string;
	/** Whether the bundled version could be resolved at build time. */
	verifiable: boolean;
	/** True when the versions agree, or when we can't verify (avoid false alarms). */
	match: boolean;
}

/**
 * Compare the manifest's compiler against the hub's bundled compiler. Returns
 * `null` when there is no manifest compiler to compare against. When the bundled
 * version is unknown (define missing), `match` is `true` so we never warn on an
 * unverifiable build.
 *
 * `bundled` is injectable for testing; production callers use the default.
 */
export function compilerStatus(
	compiler: ManifestCompiler | null | undefined,
	bundled: string = BUNDLED_CORE_VERSION
): CompilerStatus | null {
	if (!compiler) return null;
	const verifiable = bundled !== 'unknown';
	const match =
		!verifiable || (compiler.name === BUNDLED_CORE_NAME && compiler.version === bundled);
	return {
		name: compiler.name,
		manifestVersion: compiler.version,
		bundledVersion: bundled,
		verifiable,
		match
	};
}

/**
 * A one-line warning for a mismatched compiler, or `null` when matched/unverifiable.
 * Used both in the footer and on the app page (where the consequence - snippets and
 * command that may not match the installed package - is visible).
 */
export function compilerMismatchWarning(status: CompilerStatus | null): string | null {
	if (!status || status.match) return null;
	return (
		`This hub compiles with ${status.name} ${status.bundledVersion}, but the ` +
		`published release was built with ${status.manifestVersion}. The generated command ` +
		`and code snippets may differ slightly from the installed package.`
	);
}

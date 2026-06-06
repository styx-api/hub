/**
 * User-facing wording for compiler failures (Phase C / H6).
 *
 * The in-browser compiler can throw raw solver/codegen diagnostics. Those are
 * useful but read like a crash, so each surface pairs a plain-language headline
 * with the tidied raw detail (shown de-emphasized). The worker only ever forwards
 * `Error.message` (never a stack), so there is no stack to leak here; `tidyDetail`
 * just trims and drops a redundant leading `Error:`.
 */

export interface FriendlyError {
	/** Plain-language headline shown prominently. */
	title: string;
	/** The tidied raw diagnostic, shown de-emphasized for the curious. */
	detail: string;
}

/** Trim and strip a redundant leading `Error:` so the detail reads cleanly. */
export function tidyDetail(raw: string): string {
	return raw.replace(/^\s*Error:\s*/i, '').trim();
}

/** A descriptor that failed to fetch or compile into form schemas. */
export function describeLoadError(raw: string): FriendlyError {
	return {
		title: "This tool couldn't be loaded.",
		detail: tidyDetail(raw)
	};
}

/** A config that the generated code rejected when building the command. */
export function describeCommandError(raw: string): FriendlyError {
	return {
		title: "This configuration can't produce a command yet.",
		detail: tidyDetail(raw)
	};
}

/** The in-browser compiler hit an unexpected error (e.g. the worker crashed). */
export function describeCompilerError(raw: string): FriendlyError {
	return {
		title: 'The in-browser compiler hit an unexpected error.',
		detail: tidyDetail(raw)
	};
}

/**
 * Trigger a client-side download of a text artifact (a generated wrapper module
 * or schema). Creates a transient object URL, clicks a synthetic anchor, then
 * revokes the URL. No-op outside the browser (SSR safety).
 */
export function downloadText(filename: string, text: string, mime = 'text/plain'): void {
	if (typeof document === 'undefined') return;
	const blob = new Blob([text], { type: `${mime};charset=utf-8` });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = filename;
	document.body.appendChild(anchor);
	anchor.click();
	anchor.remove();
	URL.revokeObjectURL(url);
}

/** Sanitize a tool name into a safe download filename stem (keeps word chars, `.`, `-`). */
export function safeFileStem(name: string): string {
	return name.replace(/[^a-zA-Z0-9._-]/g, '_') || 'tool';
}

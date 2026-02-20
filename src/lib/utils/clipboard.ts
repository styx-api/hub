/**
 * Copy text to the clipboard, with fallback for non-secure contexts.
 * Throws on failure — callers handle UI feedback.
 */
export async function copyToClipboard(text: string): Promise<void> {
	if (navigator.clipboard && window.isSecureContext) {
		await navigator.clipboard.writeText(text);
		return;
	}

	// Fallback for older browsers or non-secure contexts
	const textArea = document.createElement('textarea');
	textArea.value = text;
	textArea.style.position = 'fixed';
	textArea.style.left = '-999999px';
	textArea.style.top = '-999999px';
	document.body.appendChild(textArea);
	textArea.focus();
	textArea.select();

	try {
		const success = document.execCommand('copy');
		if (!success) {
			throw new Error('execCommand copy returned false');
		}
	} finally {
		textArea.remove();
	}
}

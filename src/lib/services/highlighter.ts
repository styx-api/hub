import { createHighlighterCore } from 'shiki/core';
import { createOnigurumaEngine } from 'shiki/engine/oniguruma';

import materialThemeLighter from '@shikijs/themes/material-theme-lighter';
import materialTheme from '@shikijs/themes/material-theme';

let highlighterInstance: any = null;

export async function getShikiHighlighter() {
	if (!highlighterInstance) {
		highlighterInstance = await createHighlighterCore({
			themes: [materialThemeLighter, materialTheme],
			langs: [
				import('@shikijs/langs/javascript'),
				import('@shikijs/langs/typescript'),
				import('@shikijs/langs/python'),
				import('@shikijs/langs/json'),
				import('@shikijs/langs/bash')
			],
			engine: createOnigurumaEngine(import('shiki/wasm'))
		});
	}
	return highlighterInstance;
}

/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { enhancedImages } from '@sveltejs/enhanced-img';
import { defineConfig } from 'vite';
import pkg from './package.json' with { type: 'json' };

/**
 * Resolve the bundled `@styx-api/core` version at config time so the running app
 * can compare it against the manifest's `compiler.version` (lockstep / C8). The hub
 * pins core exactly (publishing discipline), so the dependency spec IS the bundled
 * version; a non-exact spec we can't resolve here yields "unknown", which disables
 * the mismatch warning rather than guessing. Never recomputed or hardcoded.
 */
function bundledCoreVersion(): string {
	const pin = (pkg.dependencies as Record<string, string> | undefined)?.['@styx-api/core'];
	return pin && /^\d+\.\d+\.\d+(?:[-+].*)?$/.test(pin) ? pin : 'unknown';
}

export default defineConfig({
	plugins: [enhancedImages(), tailwindcss(), sveltekit()],
	define: {
		__STYX_CORE_VERSION__: JSON.stringify(bundledCoreVersion())
	},
	test: {
		include: ['src/**/*.test.ts'],
		environment: 'node',
		alias: {
			$lib: '/src/lib'
		}
	}
});

export const URLS = {
	// Documentation
	docs: 'https://niwrap.dev/styxbook/',
	contributing: 'https://niwrap.dev/styxbook/contributing.html',
	contributingNiwrap: 'https://niwrap.dev/styxbook/contributing/niwrap.html',

	// GitHub repositories
	github: 'https://github.com/styx-api/niwrap',
	githubSchema: 'https://github.com/styx-api/niwrap-json-schema',

	// Package registries
	pypi: 'https://pypi.org/project/niwrap/',
	npm: 'https://www.npmjs.com/package/niwrap',

	// Community
	discord: 'https://discord.gg/QMKUVCFWsR',
	paper: 'https://doi.org/10.1101/2025.07.24.666435',
	boutiques: 'https://boutiques.github.io/'
} as const;

export type UrlKey = keyof typeof URLS;
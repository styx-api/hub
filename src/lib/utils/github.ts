const NIWRAP_SRC = 'https://github.com/styx-api/niwrap/blob/main/src/niwrap';
const SCHEMA_BASE = 'https://github.com/styx-api/niwrap-json-schema/blob/main';

export const github = {
	package: (pkg: string) => `${NIWRAP_SRC}/${pkg}/package.json`,

	version: (pkg: string, version: string) => `${NIWRAP_SRC}/${pkg}/${version}/version.json`,

	app: (pkg: string, version: string, app: string) =>
		`${NIWRAP_SRC}/${pkg}/${version}/${app}/app.json`,

	/**
	 * The original source descriptor the wrapper was generated from. The file is
	 * named after its format (`boutiques.json`, `workbench.json`, ...), which the
	 * manifest's `format` field gives us directly.
	 */
	descriptorSource: (pkg: string, version: string, app: string, format: string) =>
		`${NIWRAP_SRC}/${pkg}/${version}/${app}/${format}.json`,

	schemaInput: (pkg: string, app: string) => `${SCHEMA_BASE}/${pkg}/${pkg}.${app}.input.json`,

	schemaOutput: (pkg: string, app: string) => `${SCHEMA_BASE}/${pkg}/${pkg}.${app}.output.json`
} as const;

export function openExternal(url: string) {
	window.open(url, '_blank', 'noopener,noreferrer');
}

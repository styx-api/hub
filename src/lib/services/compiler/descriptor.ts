/**
 * Fetch the raw Boutiques descriptor for a tool.
 *
 * Until Track N hosts a version-first descriptor layout on niwrap.dev, the hub
 * pulls `boutiques.json` straight from the niwrap repo:
 *   src/niwrap/<pkg>/<version>/<app>/<sourcePath>
 * `sourcePath` comes from the app manifest's `source.path` (defaults to
 * `boutiques.json`).
 */

const NIWRAP_RAW = 'https://raw.githubusercontent.com/styx-api/niwrap/main/src/niwrap';

export async function fetchDescriptor(
	packageName: string,
	version: string,
	appName: string,
	sourcePath = 'boutiques.json'
): Promise<string> {
	const url = `${NIWRAP_RAW}/${packageName}/${version}/${appName}/${sourcePath}`;
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(
			`Failed to fetch descriptor (${response.status} ${response.statusText}): ${url}`
		);
	}
	return response.text();
}

/**
 * Catalog data layer (Phase C / architecture A).
 *
 * The hub fetches a single version-first manifest from niwrap.dev Pages
 * (`niwrap/index.json` -> `niwrap/<version>/catalog.json`) and compiles
 * descriptors in the browser. This replaces the v1 runtime stitching (per-package
 * `app.json` walk + prebuilt JSON Schema + the JS runtime bundle).
 *
 * The consumer-facing `PackageInfo` / `CatalogIndex` shape is kept stable so the
 * gallery, search, and app page are unchanged; only the source moved.
 */

const PAGES_ROOT = 'https://niwrap.dev/niwrap';
const INDEX_PATH = 'index.json';

async function fetchJson<T>(url: string): Promise<T> {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
	}
	return (await response.json()) as T;
}

// --- Shared docs shape -----------------------------------------------------

export interface DocsType {
	title?: string;
	description?: string;
	authors?: string[];
	affiliation?: string[];
	literature?: string[];
	urls?: string[];
}

// --- Hosted manifest shape (what niwrap's `wrap hub-build` emits) -----------

/** One app entry. `descriptor`/`format` are absent for listed-but-unwrapped apps. */
export interface ManifestApp {
	name: string;
	/** Path to the descriptor, relative to the version dir (e.g. `descriptors/fsl/bet.json`). */
	descriptor?: string;
	/** Descriptor format hint passed to the compiler (`boutiques` | `workbench`). */
	format?: string;
	/** One-line summary for listings/search. */
	description?: string;
}

export interface ManifestPackage {
	name: string;
	version: string;
	container?: string;
	neurodeskId?: string;
	docs?: DocsType;
	apps: ManifestApp[];
}

export interface Manifest {
	schemaVersion: number;
	project: string;
	version: string;
	compiler: { name: string; version: string; gitRef?: string };
	descriptorBase: string;
	docs?: DocsType;
	packages: ManifestPackage[];
}

export interface ReleasesIndex {
	schemaVersion: number;
	project: string;
	latest: string;
	versions: { version: string; catalog: string; compiler: string; releaseDate?: string }[];
}

// --- Consumer-facing shape (kept stable for existing components) ------------

export interface ProjectType {
	name: string;
	version: string;
	docs?: DocsType;
}

export interface PackageType {
	name: string;
	neurodeskId?: string;
	docs?: DocsType;
}

export interface VersionType {
	name: string;
	container?: string;
	/** App names (for counts, search, and selection); per-app detail is in the manifest. */
	apps: string[];
}

/** App metadata as carried by the manifest. */
export type AppType = ManifestApp;

export interface PackageInfo {
	package: PackageType;
	version: VersionType;
}

export interface CatalogIndex {
	project: ProjectType;
	packages: Map<string, PackageInfo>;
}

// --- Fetchers --------------------------------------------------------------

export async function fetchReleasesIndex(): Promise<ReleasesIndex> {
	return fetchJson<ReleasesIndex>(`${PAGES_ROOT}/${INDEX_PATH}`);
}

/** `catalogPath` is the index entry's `catalog` field (e.g. `1.0.0/catalog.json`). */
export async function fetchManifest(catalogPath: string): Promise<Manifest> {
	return fetchJson<Manifest>(`${PAGES_ROOT}/${catalogPath}`);
}

/**
 * Fetch a raw descriptor's text. `version` is the niwrap release version and
 * `descriptor` is the manifest app's `descriptor` path (relative to the version
 * dir), so the URL is `niwrap.dev/niwrap/<version>/<descriptor>`.
 */
export async function fetchDescriptor(version: string, descriptor: string): Promise<string> {
	const url = `${PAGES_ROOT}/${version}/${descriptor}`;
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(
			`Failed to fetch descriptor (${response.status} ${response.statusText}): ${url}`
		);
	}
	return response.text();
}

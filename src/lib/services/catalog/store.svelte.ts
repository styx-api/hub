import type {
	AppType,
	CatalogIndex,
	EmbeddingsAnnounce,
	EmbeddingsSource,
	Manifest,
	ManifestPackage,
	PackageInfo,
	ToolRef
} from './types';
import { fetchDescriptor, fetchManifest, fetchReleasesIndex, PAGES_ROOT } from './types';

export type { PackageInfo, CatalogIndex };

export function toPackageInfo(pkg: ManifestPackage): PackageInfo {
	return {
		package: { name: pkg.name, neurodeskId: pkg.neurodeskId, docs: pkg.docs },
		version: { name: pkg.version, container: pkg.container, apps: pkg.apps.map((a) => a.name) }
	};
}

class CatalogStore {
	#index: CatalogIndex | null = $state(null);
	#loading = $state(false);
	#loadPromise: Promise<CatalogIndex> | null = null;

	// Compiler that built the loaded release (reactive, for the lockstep/C8 check).
	#compiler: Manifest['compiler'] | null = $state(null);

	// Raw manifest (non-reactive): the source for per-app lookups + descriptor URLs.
	#manifest: Manifest | null = null;
	// Per-app entries keyed by `<package>/<app>` for O(1) getApp.
	#apps = new Map<string, AppType>();
	// The loaded version's embeddings announce (if it ships any); drives semantic search.
	#embeddings: EmbeddingsAnnounce | null = null;
	// Flat tool refs (with descriptions), built once per load and memoized for search.
	#toolRefs: ToolRef[] | null = null;

	get loading(): boolean {
		return this.#loading;
	}

	get index(): CatalogIndex | null {
		return this.#index;
	}

	/** The compiler that built the loaded release (`@styx-api/core` + version). */
	get compiler(): Manifest['compiler'] | null {
		return this.#compiler;
	}

	async load(): Promise<CatalogIndex> {
		if (this.#index) return this.#index;

		// Deduplicate concurrent calls
		if (!this.#loadPromise) {
			this.#loadPromise = this.#fetchIndex();
		}
		return this.#loadPromise;
	}

	async #fetchIndex(): Promise<CatalogIndex> {
		this.#loading = true;
		try {
			const releases = await fetchReleasesIndex();
			const release =
				releases.versions.find((v) => v.version === releases.latest) ?? releases.versions[0];
			if (!release) throw new Error('catalog index lists no versions');

			const manifest = await fetchManifest(release.catalog);
			this.#manifest = manifest;
			this.#compiler = manifest.compiler;
			this.#embeddings = release.embeddings ?? null;
			this.#toolRefs = null; // rebuilt lazily from the new manifest

			this.#apps.clear();
			for (const pkg of manifest.packages) {
				for (const app of pkg.apps) {
					this.#apps.set(`${pkg.name}/${app.name}`, app);
				}
			}

			const packages = new Map<string, PackageInfo>(
				manifest.packages.map((pkg) => [pkg.name, toPackageInfo(pkg)])
			);

			this.#index = {
				project: { name: manifest.project, version: manifest.version, docs: manifest.docs },
				packages
			};
			return this.#index;
		} catch (err) {
			this.#loadPromise = null; // Allow retry on failure
			throw err;
		} finally {
			this.#loading = false;
		}
	}

	async getPackage(name: string): Promise<PackageInfo | undefined> {
		const idx = await this.load();
		return idx.packages.get(name);
	}

	async getApp(packageName: string, appName: string): Promise<AppType | undefined> {
		await this.load();
		return this.#apps.get(`${packageName}/${appName}`);
	}

	/** The loaded release version (`manifest.version`), or null before load. */
	get version(): string | null {
		return this.#manifest?.version ?? null;
	}

	/**
	 * Flat list of every app as a search ref (with description + wrapped flag),
	 * built once from the loaded manifest and memoized. Empty before load.
	 */
	toolRefs(): ToolRef[] {
		if (this.#toolRefs) return this.#toolRefs;
		const manifest = this.#manifest;
		if (!manifest) return [];
		const refs: ToolRef[] = [];
		for (const pkg of manifest.packages) {
			for (const app of pkg.apps) {
				refs.push({
					tool_id: `${pkg.name}/${app.name}`,
					name: app.name,
					package: pkg.name,
					description: app.description,
					wrapped: Boolean(app.descriptor)
				});
			}
		}
		this.#toolRefs = refs;
		return refs;
	}

	/**
	 * Resolve the loaded version's embeddings source: the f32 variant's absolute
	 * URLs, or null if the version announces no (supported) embeddings — in which
	 * case semantic search falls back to lexical. Call after `load()`.
	 */
	getEmbeddingsSource(): EmbeddingsSource | null {
		const announce = this.#embeddings;
		const version = this.#manifest?.version;
		if (!announce || !version) return null;
		const variant = announce.variants.find((v) => v.encoding === 'f32');
		if (!variant) return null; // only f32 is supported today
		return {
			version,
			model: announce.model,
			dim: announce.dim,
			count: announce.count,
			metaUrl: `${PAGES_ROOT}/${variant.meta}`,
			vectorsUrl: `${PAGES_ROOT}/${variant.vectors}`
		};
	}

	/** Fetch the raw descriptor text for an app (compiled in-browser by the worker). */
	async fetchDescriptor(app: AppType): Promise<string> {
		const manifest = this.#manifest;
		if (!manifest) throw new Error('catalog not loaded');
		if (!app.descriptor) throw new Error(`app "${app.name}" has no descriptor`);
		return fetchDescriptor(manifest.version, app.descriptor);
	}
}

export const catalog = new CatalogStore();

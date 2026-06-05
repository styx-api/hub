import type { AppType, CatalogIndex, Manifest, ManifestPackage, PackageInfo } from './types';
import { fetchDescriptor, fetchManifest, fetchReleasesIndex } from './types';

export type { PackageInfo, CatalogIndex };

function toPackageInfo(pkg: ManifestPackage): PackageInfo {
	return {
		package: { name: pkg.name, neurodeskId: pkg.neurodeskId, docs: pkg.docs },
		version: { name: pkg.version, container: pkg.container, apps: pkg.apps.map((a) => a.name) }
	};
}

class CatalogStore {
	#index: CatalogIndex | null = $state(null);
	#loading = $state(false);
	#loadPromise: Promise<CatalogIndex> | null = null;

	// Raw manifest (non-reactive): the source for per-app lookups + descriptor URLs.
	#manifest: Manifest | null = null;
	// Per-app entries keyed by `<package>/<app>` for O(1) getApp.
	#apps = new Map<string, AppType>();

	get loading(): boolean {
		return this.#loading;
	}

	get index(): CatalogIndex | null {
		return this.#index;
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

	async getApps(packageName: string): Promise<string[]> {
		const pkg = await this.getPackage(packageName);
		return pkg?.version.apps ?? [];
	}

	async getApp(packageName: string, appName: string): Promise<AppType | undefined> {
		await this.load();
		return this.#apps.get(`${packageName}/${appName}`);
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

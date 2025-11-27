import type { ProjectType, PackageType, VersionType, AppType } from './types';
import { fetchAppSchemaInput, fetchAppSchemaOutput } from './schema';

import { getApp, getPackage, getProject, getVersion } from './types';

export interface PackageInfo {
	package: PackageType;
	version: VersionType;
}

export interface CatalogIndex {
	project: ProjectType;
	packages: Map<string, PackageInfo>;
}

const PROJECT = 'niwrap';

export const getProjectNiwrap = () => getProject(PROJECT);

export const getPackageNiwrap = (packageName: string) => getPackage(PROJECT, packageName);

export const getVersionNiwrap = (packageName: string, versionName: string) =>
	getVersion(PROJECT, packageName, versionName);

export const getAppNiwrap = (packageName: string, versionName: string, appName: string) =>
	getApp(PROJECT, packageName, versionName, appName);

class CatalogStore {
	#index: CatalogIndex | null = $state(null);
	#loading = $state(false);
	#loadPromise: Promise<CatalogIndex> | null = null;

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
			const project = await getProjectNiwrap();

			const results = await Promise.all(
				project.packages.map(async (name) => {
					const pkg = await getPackageNiwrap(name);
					const version = await getVersionNiwrap(pkg.name, pkg.default);
					return { pkg, version };
				})
			);

			const packages = new Map<string, PackageInfo>(
				results.map(({ pkg, version }) => [pkg.name, { package: pkg, version }])
			);

			this.#index = { project, packages };
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
		const pkg = await this.getPackage(packageName);
		if (!pkg) return undefined;
		return getAppNiwrap(packageName, pkg.version.name, appName);
	}

	async getAppInputSchema(packageName: string, appId: string) {
		return fetchAppSchemaInput(packageName, appId);
	}

	async getAppOutputSchema(packageName: string, appId: string) {
		return fetchAppSchemaOutput(packageName, appId);
	}
}

export const catalog = new CatalogStore();

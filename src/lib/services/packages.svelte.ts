import type { ProjectType, PackageType, VersionType, AppType } from './catalog';
import {
  getProjectNiwrap,
  getVersionNiwrap,
  getAppNiwrap,
  getPackageNiwrap,
} from './catalogNiwrap';
import { fetchAppSchemaInput, fetchAppSchemaOutput } from './niwrapSchema';

type PackageInfo = {
  package: PackageType;
  version: VersionType;
};

type NiwrapIndex = {
  project: ProjectType;
  packages: Map<string, PackageInfo>;
};

export type Project = NiwrapIndex;
export type Package = PackageInfo;
export type App = {
  name: string;
  id: string;
};

let index: NiwrapIndex | null = $state(null);
let loading = $state(false);
let loadPromise: Promise<void> | null = null;

// singleton / cached
export async function getIndex(): Promise<NiwrapIndex> {
  if (index !== null) {
    return index;
  }
  if (loadPromise === null) {
    loadPromise = loadData();
  }
  await loadPromise;
  return index!;
}

export function isLoading(): boolean {
  return loading;
}

export async function loadData(): Promise<void> {
  if (loading) return;
  loading = true;
  try {
    const project = await getProjectNiwrap();
    
    // Fetch package.json AND version.json concurrently for each package
    const packagePromises = project.packages.map(async (packageName) => {
      const pkg = await getPackageNiwrap(packageName);
      const version = await getVersionNiwrap(pkg.name, pkg.default);
      return { pkg, version };
    });
    
    const results = await Promise.all(packagePromises);

    // Build the index
    const packages = new Map<string, PackageInfo>();
    for (const { pkg, version } of results) {
      packages.set(pkg.name, { package: pkg, version });
    }

    index = { project, packages };
  } catch (err) {
    console.error('Failed to load niwrap catalog:', err);
    loadPromise = null;
    throw err;
  } finally {
    loading = false;
  }
}

export async function getProject(): Promise<Project | null> {
  return await getIndex();
}

export async function getPackages(): Promise<Package[] | null> {
  const idx = await getIndex();
  return Array.from(idx.packages.values()).map((p) => ({
    ...p,
    appCount: p.version.apps?.length ?? 0,
  }));
}

export async function getPackageByName(name: string): Promise<Package | null> {
  const idx = await getIndex();
  const pkgInfo = idx.packages.get(name);
  if (!pkgInfo) return null;
  
  return pkgInfo;
}

export async function getPackageInfo(packageName: string): Promise<PackageInfo | null> {
  const idx = await getIndex();
  return idx.packages.get(packageName) ?? null;
}

export async function getVersion(packageName: string): Promise<VersionType | null> {
  const pkgInfo = await getPackageInfo(packageName);
  return pkgInfo?.version ?? null;
}

export async function getApps(packageName: string): Promise<App[] | null> {
  const pkgInfo = await getPackageInfo(packageName);
  if (!pkgInfo?.version.apps) return null;
  
  return pkgInfo.version.apps.map((appName) => ({
    name: appName,
    id: appName,
  }));
}

export async function getApp(packageName: string, appName: string): Promise<AppType | null> {
  const pkgInfo = await getPackageInfo(packageName);
  if (!pkgInfo) return null;
  
  // Fetch the app on demand
  return await getAppNiwrap(packageName, pkgInfo.version.name, appName);
}

export async function getAppInputSchema(packageName: string, appId: string) {
  return await fetchAppSchemaInput(packageName, appId);
}

export async function getAppOutputSchema(packageName: string, appId: string) {
  return await fetchAppSchemaOutput(packageName, appId);
}
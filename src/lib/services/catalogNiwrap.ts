/**
 * niwrap-specific catalog functions
 */

import {
  type AppContext,
  type AppType,
  type PackageType,
  type ProjectType,
  type VersionContext,
  type VersionType,
  getApp,
  getPackage,
  getProject,
  getVersion,
  iterApps,
  iterPackages,
  iterVersions,
} from './catalog';

const PROJECT_NAME_NIWRAP = 'niwrap';

export async function getProjectNiwrap(): Promise<ProjectType> {
  return await getProject(PROJECT_NAME_NIWRAP);
}

export async function getPackageNiwrap(packageName: string): Promise<PackageType> {
  return await getPackage(PROJECT_NAME_NIWRAP, packageName);
}

export async function getVersionNiwrap(
  packageName: string,
  versionName: string
): Promise<VersionType> {
  return await getVersion(PROJECT_NAME_NIWRAP, packageName, versionName);
}

export async function getAppNiwrap(
  packageName: string,
  versionName: string,
  appName: string
): Promise<AppType> {
  return await getApp(PROJECT_NAME_NIWRAP, packageName, versionName, appName);
}

export async function* iterPackagesNiwrap(): AsyncGenerator<PackageType> {
  const project = await getProjectNiwrap();
  yield* iterPackages(project);
}

export async function* iterVersionsNiwrap(
  packageName: string
): AsyncGenerator<VersionType> {
  const pkg = await getPackageNiwrap(packageName);
  yield* iterVersions(PROJECT_NAME_NIWRAP, pkg);
}

export async function* iterAppsNiwrap(
  packageName: string,
  versionName: string
): AsyncGenerator<AppType> {
  const version = await getVersionNiwrap(packageName, versionName);
  yield* iterApps(PROJECT_NAME_NIWRAP, packageName, version);
}

export async function* iterAllPackagesNiwrap(): AsyncGenerator<PackageType> {
  yield* iterPackagesNiwrap();
}

export async function* iterAllVersionsNiwrap(): AsyncGenerator<VersionContext> {
  const project = await getProjectNiwrap();
  for await (const pkg of iterPackagesNiwrap()) {
    for await (const version of iterVersions(PROJECT_NAME_NIWRAP, pkg)) {
      yield { project, package: pkg, version };
    }
  }
}

export async function* iterAllAppsNiwrap(): AsyncGenerator<AppContext> {
  const project = await getProjectNiwrap();
  for await (const pkg of iterPackagesNiwrap()) {
    const packageName = pkg.name;
    for await (const version of iterVersions(PROJECT_NAME_NIWRAP, pkg)) {
      for await (const app of iterApps(PROJECT_NAME_NIWRAP, packageName, version)) {
        yield { project, package: pkg, version, app };
      }
    }
  }
}
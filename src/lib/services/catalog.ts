/**
 * Type definitions and utility functions for wrap data structure
 */

const BASE_URL = 'https://niwrap.dev/niwrap/source';
const FILE_PROJECTS = 'projects.json';
const FILE_PROJECT = 'project.json';
const FILE_PACKAGE = 'package.json';
const FILE_VERSION = 'version.json';
const FILE_APP = 'app.json';

// Utility function to fetch and parse JSON
async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }
  return await response.json() as T;
}

// Type definitions
export interface ProjectsType {
  projects: string[];
  __path__: string;
}

export interface DocsType {
  title?: string;
  description?: string;
  authors?: string[];
  literature?: string[];
  urls?: string[];
}

export interface ProjectType {
  name: string;
  version: string;
  license: string;
  packages: string[];
  __path__: string;
  docs?: DocsType;
}

export interface PackageType {
  name: string;
  neurodeskId?: string;
  versions: string[];
  default: string;
  __path__: string;
  docs?: DocsType;
}

export interface ExecutablesType {
  required?: string[];
  ignored?: string[];
}

export interface VersionType {
  name: string;
  __path__: string;
  container?: string;
  apps?: string[];
  executables?: ExecutablesType;
  release_date?: string;
  deprecated?: boolean;
  docs?: DocsType;
}

export interface DescriptorSourceType {
  type: 'boutiques';
  path: string;
}

export interface AppType {
  name: string;
  __path__: string;
  exe?: string;
  args?: string[];
  source?: DescriptorSourceType;
  docs?: DocsType;
}

// Data accessor functions
export async function getProjects(): Promise<ProjectsType> {
  const url = `${BASE_URL}/${FILE_PROJECTS}`;
  const data = await fetchJson<Omit<ProjectsType, '__path__'>>(url);
  return { ...data, __path__: url };
}

export async function getProject(projectName: string): Promise<ProjectType> {
  const url = `${BASE_URL}/${projectName}/${FILE_PROJECT}`;
  const data = await fetchJson<Omit<ProjectType, '__path__'>>(url);
  return { ...data, __path__: url };
}

export async function getPackage(
  projectName: string,
  packageName: string
): Promise<PackageType> {
  const url = `${BASE_URL}/${projectName}/${packageName}/${FILE_PACKAGE}`;
  const data = await fetchJson<Omit<PackageType, '__path__'>>(url);
  return { ...data, __path__: url };
}

export async function getVersion(
  projectName: string,
  packageName: string,
  versionName: string
): Promise<VersionType> {
  const url = `${BASE_URL}/${projectName}/${packageName}/${versionName}/${FILE_VERSION}`;
  const data = await fetchJson<Omit<VersionType, '__path__'>>(url);
  return { ...data, __path__: url };
}

export async function getApp(
  projectName: string,
  packageName: string,
  versionName: string,
  appName: string
): Promise<AppType> {
  const url = `${BASE_URL}/${projectName}/${packageName}/${versionName}/${appName}/${FILE_APP}`;
  const data = await fetchJson<Omit<AppType, '__path__'>>(url);
  return { ...data, __path__: url };
}

// Iterator functions (using async generators)
export async function* iterProjects(
  projects: ProjectsType
): AsyncGenerator<ProjectType> {
  for (const name of projects.projects) {
    yield await getProject(name);
  }
}

export async function* iterPackages(
  project: ProjectType
): AsyncGenerator<PackageType> {
  const projectName = project.name;
  for (const packageName of project.packages) {
    yield await getPackage(projectName, packageName);
  }
}

export async function* iterVersions(
  projectName: string,
  pkg: PackageType
): AsyncGenerator<VersionType> {
  const packageName = pkg.name;
  for (const versionName of pkg.versions) {
    yield await getVersion(projectName, packageName, versionName);
  }
}

export async function* iterApps(
  projectName: string,
  packageName: string,
  version: VersionType
): AsyncGenerator<AppType> {
  const versionName = version.name;
  if (version.apps) {
    for (const appName of version.apps) {
      yield await getApp(projectName, packageName, versionName, appName);
    }
  }
}

// Context types
export interface PackageContext {
  project: ProjectType;
  package: PackageType;
}

export interface VersionContext {
  project: ProjectType;
  package: PackageType;
  version: VersionType;
}

export interface AppContext {
  project: ProjectType;
  package: PackageType;
  version: VersionType;
  app: AppType;
}

// Higher-level iterator functions
export async function* iterAllPackages(
  projects: ProjectsType
): AsyncGenerator<PackageContext> {
  for await (const project of iterProjects(projects)) {
    for await (const pkg of iterPackages(project)) {
      yield { project, package: pkg };
    }
  }
}

export async function* iterAllVersions(
  projects: ProjectsType
): AsyncGenerator<VersionContext> {
  for await (const project of iterProjects(projects)) {
    const projectName = project.name;
    for await (const pkg of iterPackages(project)) {
      for await (const version of iterVersions(projectName, pkg)) {
        yield { project, package: pkg, version };
      }
    }
  }
}

export async function* iterAllApps(
  projects: ProjectsType
): AsyncGenerator<AppContext> {
  for await (const project of iterProjects(projects)) {
    const projectName = project.name;
    for await (const pkg of iterPackages(project)) {
      const packageName = pkg.name;
      for await (const version of iterVersions(projectName, pkg)) {
        for await (const app of iterApps(projectName, packageName, version)) {
          yield { project, package: pkg, version, app };
        }
      }
    }
  }
}
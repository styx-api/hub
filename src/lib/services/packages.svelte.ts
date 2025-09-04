import { fetchIrIndex, type IrDumpIndex, type IrPackage, type IrProject } from "./niwrapIr";
import { fetchSchemaIndex, fetchAppSchema, type SchemaIndex } from "./niwrapSchema";

type Index = {
  "ir": IrDumpIndex,
  "schema": SchemaIndex,
}
export type Project = IrProject;
export type Package = IrPackage & {"appCount": number};
export type App = {
  name: string;
  id: string;
};

let index: Index | null = $state(null);
let loading = $state(false);
let loadPromise: Promise<void> | null = null; // Cache loading promise

export async function getIndex() {
  if (index !== null) {
    return index; // Already loaded
  }
  
  if (loadPromise === null) {
    // First caller starts the loading
    loadPromise = loadData();
  }
  
  // All callers wait for the same promise
  await loadPromise;
  return index;
}

export function isLoading() { return loading; }

export async function loadData() {
  if (loading) return; // Prevent duplicate loads
  loading = true;
  try {
    let [irIndex, schemaIndex] = await Promise.all([fetchIrIndex(), fetchSchemaIndex()]);
    if (irIndex.project.version != schemaIndex.version) {
      throw new Error(`IR index and schema index versions do not match.`);
    }
    index = {
      "ir": irIndex,
      "schema": schemaIndex,
    }
  } catch (err) {
    console.error('Failed to load indices:', err);
    // Reset loadPromise on error so it can be retried
    loadPromise = null;
    throw err; // Re-throw to let callers handle the error
  } finally {
    loading = false;
  }
}

export async function getProject(): Promise<Project | null> {
  return (await getIndex())?.ir.project ?? null;
}

export async function getPackages(): Promise<Package[] | null> {
  const index = await getIndex();
  return index?.ir.packages.map((p) => ({...p.package, appCount: p.apps.length})) ?? null;
}

export async function getPackageByName(name: string): Promise<Package | null> {
  const packages = await getPackages();
  return packages?.find((p) => p.name == name) ?? null;
}

export async function getApps(packageName: string): Promise<App[] | null> {
  return (await getIndex())?.ir
    .packages.find((p) => p.package.name == packageName)
    ?.apps.map((app) => ({ "name": app.name, "id": app.id }))
    ?? null;
}

export async function getAppInputSchema(packageName: string, appId: string) {
  const app = (await getIndex())?.schema.packages.find((p) => p.name == packageName)?.apps.find((a) => a.id == appId);
  if (!app) return null;
  return await fetchAppSchema(app.inputSchema);
}

export async function getAppOutputSchema(packageName: string, appId: string) {
  const app = (await getIndex())?.schema.packages.find((p) => p.name == packageName)?.apps.find((a) => a.id == appId);
  if (!app) return null;
  return await fetchAppSchema(app.outputSchema);
}
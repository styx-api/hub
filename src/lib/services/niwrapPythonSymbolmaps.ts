// package name -> package symbolmap index path
export type PythonSymbolmapsIndex = Record<string, string>;

// public name -> app symbolmap path
export type PythonSymbolmapsPackageIndex = Record<string, string>;

interface PythonSymbolmapVar {
  var_param: string,
}

interface PythonSymbolmapStruct {
  var_param: string,
  fn_struct_make_params: string,
  properties: Record<string, PythonSymbolmapStruct | PythonSymbolmapVar>,
}

export interface PythonSymbolmap {
  fn_root_make_params_and_execute: string,
  properties: Record<string, PythonSymbolmapStruct | PythonSymbolmapVar>,
}

// Cache for the main index
let cachedMainIndex: PythonSymbolmapsIndex | null = null;

// Cache for package indices (keyed by path)
const packageIndexCache = new Map<string, PythonSymbolmapsPackageIndex>();

export async function fetchPythonSymbolmapsIndex(): Promise<PythonSymbolmapsIndex> {
  if (cachedMainIndex !== null) {
    return cachedMainIndex;
  }

  const downloadUrl = "https://niwrap.dev/niwrap/python-symbolmaps/index.json";
  const response = await fetch(downloadUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch file content: ${response.status} ${response.statusText}`);
  }

  const content = await response.json();
  cachedMainIndex = content;

  return content;
}

export async function fetchPythonSymbolmapsPackageIndex(path: string): Promise<PythonSymbolmapsPackageIndex> {
  if (packageIndexCache.has(path)) {
    return packageIndexCache.get(path)!;
  }

  const downloadUrl = "https://niwrap.dev/niwrap/python-symbolmaps/" + path;
  const response = await fetch(downloadUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch file content: ${response.status} ${response.statusText}`);
  }

  const content = await response.json();
  packageIndexCache.set(path, content);

  return content;
}

export async function fetchPythonSymbolmap(path: string): Promise<PythonSymbolmap> {
  const downloadUrl = "https://niwrap.dev/niwrap/python-symbolmaps/" + path;
  const response = await fetch(downloadUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch file content: ${response.status} ${response.statusText}`);
  }

  const content = await response.json();
  
  // Basic validation
  if (!content.fn_root_make_params_and_execute || !content.properties) {
    throw new Error('Invalid file structure');
  }

  return content;
}

export async function fetchSymbolmapForConfig(
    descriptorConfig: Record<string, any>
): Promise<PythonSymbolmap> {
    /**
     * Fetch the appropriate Python symbolmap for a given descriptor config.
     * The config must have an @type field in the format "package/interface".
     */
    
    // Extract the @type field
    const typeField = descriptorConfig["@type"];
    
    if (!typeField || typeof typeField !== "string") {
        throw new Error("Config must have an @type field (e.g., 'greedy/greedy')");
    }
    
    // Parse the @type field (format: "package/interface")
    const parts = typeField.split("/");
    
    if (parts.length < 2) {
        throw new Error(`Invalid @type format: ${typeField}. Expected format: "package/interface"`);
    }
    
    const packageName = parts[0];
    
    // Fetch the main index to get the package index path
    const mainIndex = await fetchPythonSymbolmapsIndex();
    
    if (!(packageName in mainIndex)) {
        throw new Error(`Package "${packageName}" not found in symbolmaps index`);
    }
    
    const packageIndexPath = mainIndex[packageName];
    
    // Fetch the package index to get the interface symbolmap path
    const packageIndex = await fetchPythonSymbolmapsPackageIndex(packageIndexPath);
    
    if (!(typeField in packageIndex)) {
        throw new Error(`Interface "${typeField}" not found in package "${packageName}"`);
    }
    
    const symbolmapPath = packageIndex[typeField];
    
    // Fetch and return the actual symbolmap
    const symbolmap = await fetchPythonSymbolmap(symbolmapPath);
    
    return symbolmap;
}

// Optional: Function to clear caches if needed
export function clearSymbolmapCaches(): void {
  cachedMainIndex = null;
  packageIndexCache.clear();
}
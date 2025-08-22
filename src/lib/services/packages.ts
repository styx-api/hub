// Types

/** GitHub API file metadata */
export interface GitHubFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string;
  type: 'file' | 'dir';
}

export type Endpoint = {
  target: string;
  status: 'done';
  descriptor: string;
} | {
  target: string;
  status: 'missing' | 'ignore';
}

/**
 * Information about a software package
 */
export interface PackageInfo {
  /** Human readable name of the package/software */
  name: string;
  
  /** The author or organization that created the package */
  author: string;
  
  /** The official website or repository URL */
  url: string;
  
  /** The descriptor generation approach (e.g., "Manual", "Automated") */
  approach: string;
  
  /** Current integration status (e.g., "Experimental", "Well Tested") */
  status: string;
  
  /** Docker container image identifier */
  container: string;
  
  /** Version number of the package */
  version: string;
  
  /** Brief description of what the package does */
  description: string;
  
  /** Unique identifier for the package */
  id: string;
  
  /** API configuration and endpoints */
  api: {
    /** List of available API endpoints */
    endpoints: Endpoint[];
  };
}

/** Result of package fetching operation */
export interface FetchResult {
  packages: PackageInfo[];
  errors: Array<{ file: string; error: string }>;
}

// Cache
const cache = new Map<string, { data: any; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getFromCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry || Date.now() > entry.expires) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, expires: Date.now() + CACHE_TTL });
}

// API
const REPO_URL = 'https://api.github.com/repos/styx-api/niwrap/contents/packages';

async function fetchRequest(url: string, options: any = {}): Promise<Response> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response;
}

async function getRepositoryFiles(): Promise<GitHubFile[]> {
  const cached = getFromCache<GitHubFile[]>('repo-files');
  if (cached) return cached;

  const response = await fetchRequest(REPO_URL);
  const files = await response.json();
  
  setCache('repo-files', files);
  return files;
}

async function fetchPackage(file: GitHubFile): Promise<PackageInfo> {
  const cached = getFromCache<PackageInfo>(`package-${file.sha}`);
  if (cached) return cached;

  const response = await fetchRequest(file.download_url);
  const packageData = await response.json();
  
  // Validate required fields
  if (!packageData.name || !packageData.id || !packageData.api?.endpoints) {
    throw new Error('Invalid package structure');
  }

  setCache(`package-${file.sha}`, packageData);
  return packageData;
}

/** Fetch all packages from the repository with caching */
export async function getAllPackages(): Promise<FetchResult> {
  try {
    const files = await getRepositoryFiles();
    const jsonFiles = files.filter(f => f.type === 'file' && f.name.endsWith('.json'));

    const results = await Promise.allSettled(
      jsonFiles.map(file => fetchPackage(file))
    );

    const packages: PackageInfo[] = [];
    const errors: Array<{ file: string; error: string }> = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        packages.push(result.value);
      } else {
        errors.push({
          file: jsonFiles[index].name,
          error: result.reason?.message || 'Unknown error'
        });
      }
    });

    return { packages, errors };
  } catch (error) {
    return {
      packages: [],
      errors: [{ file: 'repository', error: error instanceof Error ? error.message : 'Failed to fetch' }]
    };
  }
}

/** Clear all cached data */
export function clearCache(): void {
  cache.clear();
}
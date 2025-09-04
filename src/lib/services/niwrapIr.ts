export interface IrDocumentation {
  title?: string;
  description?: string;
  authors?: string[];
  literature?: string[];
  urls?: string[];
}

export interface IrProject {
  name: string;
  version: string;
  license: string;
  docs: IrDocumentation;
  extras?: any;
}

export interface IrPackage {
  name: string;
  version: string;
  docker: string;
  docs: IrDocumentation;
}

export interface AppListing {
  id: string;
  name: string;
  app: string;
}

export interface PackageListing {
  package: IrPackage;
  apps: AppListing[];
}


export interface IrDumpIndex {
  project: IrProject;
  packages: PackageListing[];
}

export async function fetchIrIndex(): Promise<IrDumpIndex> {
  const downloadUrl = "https://styx-api.github.io/niwrap/niwrap-ir-dump/index.json";
  const response = await fetch(downloadUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch file content: ${response.status} ${response.statusText}`);
  }

  const content = await response.json();

  // Basic validation
  if (!content.project || !content.packages) {
    throw new Error('Invalid file structure');
  }

  return content;
}

export async function fetchIrApp(app: string): Promise<object> {
  const downloadUrl = "https://styx-api.github.io/niwrap/niwrap-ir-dump/" + app;
  const response = await fetch(downloadUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch file content: ${response.status} ${response.statusText}`);
  }

  const content = await response.json();

  // Basic validation
  if (!content.uid) {
    throw new Error('Invalid file structure');
  }

  return content;

}
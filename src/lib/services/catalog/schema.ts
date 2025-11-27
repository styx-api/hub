export interface SchemaAppListing {
	id: string;
	inputSchema: string;
	outputSchema: string;
}

export interface SchemaPackageListing {
	name: string;
	apps: SchemaAppListing[];
}

export interface SchemaIndex {
	name: string;
	version: string;
	packages: SchemaPackageListing[];
}

export async function fetchSchemaIndex(): Promise<SchemaIndex> {
	const downloadUrl = 'https://niwrap.dev/niwrap/niwrap-json-schema/index.json';
	const response = await fetch(downloadUrl);

	if (!response.ok) {
		throw new Error(`Failed to fetch file content: ${response.status} ${response.statusText}`);
	}

	const content = await response.json();

	// Basic validation
	if (!content.name || !content.version || !content.packages) {
		throw new Error('Invalid file structure');
	}

	return content;
}

async function fetchAppSchema(path: string): Promise<object> {
	const downloadUrl = `https://niwrap.dev/niwrap/niwrap-json-schema/${path}`;
	const response = await fetch(downloadUrl);

	if (!response.ok) {
		throw new Error(`Failed to fetch file content: ${response.status} ${response.statusText}`);
	}

	const content = await response.json();

	// Basic validation
	if (!content['$schema'] || !content.properties) {
		throw new Error('Invalid file structure');
	}

	return content;
}

export async function fetchAppSchemaInput(packageName: string, appName: string): Promise<object> {
	const path = `${packageName}/${packageName}.${appName}.input.json`;
	return fetchAppSchema(path);
}

export async function fetchAppSchemaOutput(packageName: string, appName: string): Promise<object> {
	const path = `${packageName}/${packageName}.${appName}.output.json`;
	return fetchAppSchema(path);
}

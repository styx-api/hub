
function getJsonSchemaDownloadUrl(packageId: string, descriptorId: string) {
  return `https://raw.githubusercontent.com/styx-api/niwrap-json-schema/refs/heads/main/${packageId}/${packageId}.${descriptorId}.json`;
}

export async function fetchDescriptorJsonSchema(packageId: string, descriptorId: string): Promise<object> {
  const downloadUrl = getJsonSchemaDownloadUrl(packageId, descriptorId);
  const response = await fetch(downloadUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch file content: ${response.status} ${response.statusText}`);
  }

  const content = await response.json();

  // Basic validation
  if (!content["$schema"] || !content.properties) {
    throw new Error('Invalid schema file structure');
  }

  return content;
}

function getDescriptorIrDownloadUrl(packageId: string, descriptorId: string) {
  return `https://raw.githubusercontent.com/styx-api/niwrap-ir-dump/refs/heads/main/${packageId}/${descriptorId}.json`;
}

export async function fetchDescriptorIr(packageId: string, descriptorId: string): Promise<object> {
  const downloadUrl = getDescriptorIrDownloadUrl(packageId, descriptorId);
  const response = await fetch(downloadUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch file content: ${response.status} ${response.statusText}`);
  }

  const content = await response.json();

  // Basic validation
  if (!content.uid || !content.package || !content.command) {
    throw new Error('Invalid schema file structure');
  }

  return content;
}
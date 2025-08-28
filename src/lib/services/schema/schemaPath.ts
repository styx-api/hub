import type { JsonSchema } from "./types";

/**
 * Resolves a path within a JSON Schema and returns the schema at that path.
 * Supports object properties, array indices, and union types.
 * 
 * @param schema The root JSON Schema
 * @param path The path to resolve (e.g., "user.address.street" or "items.0.name")
 * @returns The schema at the specified path, or null if not found
 */
export function getSchemaAtPath(schema: JsonSchema, path: string): JsonSchema | null {
  if (!schema || !path) {
    return schema || null;
  }

  const pathParts = parsePath(path);
  return resolveSchemaPath(schema, pathParts);
}

/**
 * Gets the title from a schema at the specified path
 */
export function getSchemaTitle(schema: JsonSchema, path: string): string | undefined {
  const targetSchema = getSchemaAtPath(schema, path);
  return targetSchema?.title;
}

/**
 * Gets the description from a schema at the specified path
 */
export function getSchemaDescription(schema: JsonSchema, path: string): string | undefined {
  const targetSchema = getSchemaAtPath(schema, path);
  return targetSchema?.description;
}

/**
 * Gets both title and description from a schema at the specified path
 */
export function getSchemaMetadata(schema: JsonSchema, path: string): { title?: string; description?: string } {
  const targetSchema = getSchemaAtPath(schema, path);
  return {
    title: targetSchema?.title,
    description: targetSchema?.description
  };
}

/**
 * Parses a path string into an array of path segments
 * Handles both dot notation and array indices
 */
function parsePath(path: string): string[] {
  if (!path) return [];
  
  // Split by dots, but handle array notation like "items[0]" or "items.0"
  const parts: string[] = [];
  const segments = path.split('.');
  
  for (const segment of segments) {
    // Handle array bracket notation like "items[0]"
    const bracketMatch = segment.match(/^([^[\]]+)\[(\d+)\]$/);
    if (bracketMatch) {
      parts.push(bracketMatch[1]); // property name
      parts.push(bracketMatch[2]); // array index
    } else {
      parts.push(segment);
    }
  }
  
  return parts.filter(part => part !== '');
}

/**
 * Recursively resolves a schema path
 */
function resolveSchemaPath(schema: JsonSchema, pathParts: string[]): JsonSchema | null {
  if (!schema || pathParts.length === 0) {
    return schema || null;
  }

  const [currentPart, ...remainingParts] = pathParts;
  
  // Handle union types (anyOf, oneOf, allOf)
  const resolvedSchema = resolveUnions(schema);
  if (!resolvedSchema) return null;

  // Check if current part is a numeric index (for arrays)
  const isArrayIndex = /^\d+$/.test(currentPart);
  
  if (isArrayIndex) {
    return resolveArrayPath(resolvedSchema, remainingParts);
  } else {
    return resolveObjectPath(resolvedSchema, currentPart, remainingParts);
  }
}

/**
 * Resolves union types (anyOf, oneOf, allOf) to find the best matching schema
 */
function resolveUnions(schema: JsonSchema): JsonSchema | null {
  // Handle allOf by merging schemas
  if (schema.allOf && Array.isArray(schema.allOf)) {
    return mergeAllOfSchemas(schema.allOf);
  }

  // Handle anyOf - prefer object/array schemas over primitive types
  if (schema.anyOf && Array.isArray(schema.anyOf)) {
    return selectBestUnionSchema(schema.anyOf);
  }

  // Handle oneOf - prefer object/array schemas over primitive types
  if (schema.oneOf && Array.isArray(schema.oneOf)) {
    return selectBestUnionSchema(schema.oneOf);
  }

  return schema;
}

/**
 * Selects the best schema from a union based on complexity and usefulness for path resolution
 */
function selectBestUnionSchema(schemas: JsonSchema[]): JsonSchema | null {
  if (schemas.length === 0) return null;
  if (schemas.length === 1) return schemas[0];

  // Filter out null schemas
  const nonNullSchemas = schemas.filter(s => 
    s.type !== 'null' && 
    !(Array.isArray(s.type) && s.type.includes('null'))
  );

  if (nonNullSchemas.length === 0) return schemas[0];

  // Prefer schemas with properties (objects) or items (arrays)
  const structuredSchema = nonNullSchemas.find(s => s.properties || s.items);
  if (structuredSchema) return structuredSchema;

  // Prefer object or array types
  const objectOrArraySchema = nonNullSchemas.find(s => 
    s.type === 'object' || s.type === 'array' ||
    (Array.isArray(s.type) && (s.type.includes('object') || s.type.includes('array')))
  );
  if (objectOrArraySchema) return objectOrArraySchema;

  // Return first non-null schema
  return nonNullSchemas[0];
}

/**
 * Merges allOf schemas into a single schema
 */
function mergeAllOfSchemas(schemas: JsonSchema[]): JsonSchema {
  const merged: JsonSchema = {};
  const allProperties: Record<string, JsonSchema[]> = {};

  for (const schema of schemas) {
    // Merge basic properties
    Object.assign(merged, schema);

    // Collect properties for merging
    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (!allProperties[key]) allProperties[key] = [];
        allProperties[key].push(propSchema);
      }
    }
  }

  // Merge collected properties
  if (Object.keys(allProperties).length > 0) {
    merged.properties = {};
    for (const [key, propSchemas] of Object.entries(allProperties)) {
      if (propSchemas.length === 1) {
        merged.properties[key] = propSchemas[0];
      } else {
        // If multiple schemas for the same property, merge them with allOf
        merged.properties[key] = { allOf: propSchemas };
      }
    }
  }

  return merged;
}

/**
 * Resolves a path within an array schema
 */
function resolveArrayPath(schema: JsonSchema, remainingParts: string[]): JsonSchema | null {
  if (!schema.items) return null;

  let itemSchema: JsonSchema;

  if (Array.isArray(schema.items)) {
    // Tuple validation - use first item schema as fallback
    itemSchema = schema.items[0] || {};
  } else {
    itemSchema = schema.items;
  }

  return resolveSchemaPath(itemSchema, remainingParts);
}

/**
 * Resolves a path within an object schema
 */
function resolveObjectPath(schema: JsonSchema, propertyName: string, remainingParts: string[]): JsonSchema | null {
  // Check if property exists in schema.properties
  if (schema.properties && schema.properties[propertyName]) {
    return resolveSchemaPath(schema.properties[propertyName], remainingParts);
  }

  // Check additionalProperties
  if (schema.additionalProperties) {
    if (typeof schema.additionalProperties === 'object') {
      return resolveSchemaPath(schema.additionalProperties, remainingParts);
    }
    // If additionalProperties is true, we can't determine the schema
    return null;
  }

  // Property not found
  return null;
}

/**
 * Gets all possible paths in a schema (useful for debugging or introspection)
 * Returns an array of path strings with their corresponding titles/descriptions
 */
export function getAllSchemaPaths(
  schema: JsonSchema, 
  maxDepth: number = 5,
  currentPath: string = '',
  visited = new Set<JsonSchema>()
): Array<{ path: string; title?: string; description?: string; type?: string | string[] }> {
  const paths: Array<{ path: string; title?: string; description?: string; type?: string | string[] }> = [];
  
  if (!schema || maxDepth <= 0 || visited.has(schema)) {
    return paths;
  }
  
  visited.add(schema);

  try {
    // Add current path if it has metadata
    if (currentPath && (schema.title || schema.description)) {
      paths.push({
        path: currentPath,
        title: schema.title,
        description: schema.description,
        type: schema.type
      });
    }

    const resolvedSchema = resolveUnions(schema);
    if (!resolvedSchema) return paths;

    // Handle object properties
    if (resolvedSchema.properties) {
      for (const [key, propSchema] of Object.entries(resolvedSchema.properties)) {
        const newPath = currentPath ? `${currentPath}.${key}` : key;
        paths.push(...getAllSchemaPaths(propSchema, maxDepth - 1, newPath, visited));
      }
    }

    // Handle array items
    if (resolvedSchema.items && !Array.isArray(resolvedSchema.items)) {
      const newPath = currentPath ? `${currentPath}[0]` : '[0]';
      paths.push(...getAllSchemaPaths(resolvedSchema.items, maxDepth - 1, newPath, visited));
    }

    return paths;
  } finally {
    visited.delete(schema);
  }
}

/**
 * Type guard to check if a schema has structural properties (object or array)
 */
export function isStructuralSchema(schema: JsonSchema): boolean {
  return !!(schema.properties || schema.items || 
           schema.type === 'object' || schema.type === 'array' ||
           (Array.isArray(schema.type) && (schema.type.includes('object') || schema.type.includes('array'))));
}
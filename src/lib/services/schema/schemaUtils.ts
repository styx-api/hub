import type { RequireField } from "$lib/utils/utils";
import { isNullSchema, isObjectSchema, isSchemaObject, type JSONSchema } from "./schema";

export type SchemaPath = (string | number)[];

/**
 * Resolves a path within a JSON Schema and returns the schema at that path.
 * @param schema The root JSON Schema
 * @param path The path to resolve (e.g., "user.address.street" or "items.0")
 * @returns The schema at the specified path, or null if not found
 */
export function getSchemaAtPath(schema: JSONSchema, path: SchemaPath): JSONSchema | null {
  if (path.length === 0) return schema;
  
  if (!isSchemaObject(schema)) return null;
  
  const resolvedSchema = resolveUnion(schema) || schema;
  if (!isSchemaObject(resolvedSchema)) return null;
  
  const [currentKey, ...remainingPath] = path;
  
  // properties
  if (typeof currentKey === 'string') {
    if (resolvedSchema.properties?.[currentKey]) {
      return getSchemaAtPath(resolvedSchema.properties[currentKey], remainingPath);
    }
  }
  
  // array indices
  if (typeof currentKey === 'number') {
    if (resolvedSchema.items) {
      return getSchemaAtPath(resolvedSchema.items, remainingPath);
    }
  }
  
  return null;
}

/**
 * Resolves union types to the most useful schema for path traversal
 */
function resolveUnion(schema: JSONSchema): JSONSchema | null {
  if (!isSchemaObject(schema) || !schema.anyOf) return null;
  
  // Filter out null schemas
  const nonNullSchemas = schema.anyOf.filter(s => !isNullSchema(s));
  
  if (nonNullSchemas.length === 0) return null;
  if (nonNullSchemas.length === 1) return nonNullSchemas[0];
  
  // For multiple schemas, prefer object schemas for path traversal
  const objectSchemas = nonNullSchemas.filter(s => isObjectSchema(s));
  if (objectSchemas.length > 0) return objectSchemas[0];
  
  // Otherwise return the first non-null schema
  return nonNullSchemas[0];
}

/**
 * Gets schema metadata
 */
export function getSchemaMetadata(schema: JSONSchema) {
  if (!isSchemaObject(schema)) return null;
  return {
    title: schema?.title,
    description: schema?.description,
    type: schema?.type
  };
}

/**
 * Checks if schema is nullable (has null schema in anyOf)
 */
export function isNullable(schema: JSONSchema): boolean {
  return (isObjectSchema(schema) && (schema.anyOf?.some(isNullSchema))) ?? false;
}

/**
 * Gets non-null schema from nullable union
 */
export function getNonNullSchema(schema: JSONSchema): JSONSchema | null {
  if (!isObjectSchema(schema) || !isNullable(schema)) return schema;
  return schema.anyOf?.find(s => !isNullSchema(s)) ?? null;
}

/**
 * Checks if schema is a union (anyOf without null, or with multiple non-null types)
 */
export function isUnion(schema: JSONSchema): schema is RequireField<JSONSchema.Object, 'anyOf'> {
  if (!isObjectSchema(schema)) return false;
  
  if (schema.anyOf && schema.anyOf.length > 1) {
    const nonNullSchemas = schema.anyOf.filter(s => !isNullSchema(s));
    return nonNullSchemas.length > 1;
  }
  
  return false;
}
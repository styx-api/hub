import type { JsonSchema } from "./types";


/**
 * Generate a default value that conforms to the given JSON Schema.
 * Supports basic types, arrays, objects, unions (anyOf/oneOf), const values,
 * default values, and various validation constraints.
 * Not meant to be comprehensive, just needs to support what Styx outputs.
 * I couldnt find a good library that does this.
 */
export function getSchemaDefaultValue(schema: JsonSchema, visited = new Set<JsonSchema>()): any {
  // Prevent infinite recursion with circular references
  if (visited.has(schema)) {
    return null;
  }
  visited.add(schema);

  try {
    return generateValue(schema, visited);
  } finally {
    visited.delete(schema);
  }
}

function generateValue(schema: JsonSchema, visited: Set<JsonSchema>): any {
  // Handle null/undefined schema
  if (!schema || typeof schema !== 'object') {
    return null;
  }

  // 1. Explicit default value takes precedence
  if (schema.default !== undefined) {
    return cloneValue(schema.default);
  }

  // 2. Const value (schema defines a single allowed value)
  if (schema.const !== undefined) {
    return cloneValue(schema.const);
  }

  // 3. Enum - pick the first value
  if (schema.enum && Array.isArray(schema.enum) && schema.enum.length > 0) {
    return cloneValue(schema.enum[0]);
  }

  // 4. Handle union types (anyOf, oneOf, allOf)
  if (schema.anyOf && Array.isArray(schema.anyOf)) {
    return handleAnyOf(schema.anyOf, visited);
  }

  if (schema.oneOf && Array.isArray(schema.oneOf)) {
    return handleOneOf(schema.oneOf, visited);
  }

  if (schema.allOf && Array.isArray(schema.allOf)) {
    return handleAllOf(schema.allOf, visited);
  }

  // 5. Handle type-based generation
  const types = normalizeTypes(schema.type);
  
  // If multiple types, prioritize in order of preference
  if (types.length > 1) {
    const preferredOrder = ['object', 'array', 'string', 'number', 'integer', 'boolean', 'null'];
    for (const preferredType of preferredOrder) {
      if (types.includes(preferredType)) {
        return generateByType(preferredType, schema, visited);
      }
    }
  }

  // Single type or no type specified
  const primaryType = types.length > 0 ? types[0] : inferTypeFromSchema(schema);
  return generateByType(primaryType, schema, visited);
}

function normalizeTypes(type: string | string[] | undefined): string[] {
  if (!type) return [];
  if (Array.isArray(type)) return type;
  return [type];
}

function inferTypeFromSchema(schema: JsonSchema): string {
  // Infer type from schema properties
  if (schema.properties || schema.additionalProperties !== undefined) {
    return 'object';
  }
  if (schema.items !== undefined) {
    return 'array';
  }
  if (schema.minimum !== undefined || schema.maximum !== undefined) {
    return 'number';
  }
  if (schema.minLength !== undefined || schema.maxLength !== undefined || schema.pattern) {
    return 'string';
  }
  
  return 'null';
}

function generateByType(type: string, schema: JsonSchema, visited: Set<JsonSchema>): any {
  switch (type) {
    case 'string':
      return generateString(schema);
    
    case 'number':
    case 'integer':
      return generateNumber(schema, type === 'integer');
    
    case 'boolean':
      return false;
    
    case 'array':
      return generateArray(schema, visited);
    
    case 'object':
      return generateObject(schema, visited);
    
    case 'null':
      return null;
    
    default:
      return null;
  }
}

function generateString(schema: JsonSchema): string {
  // Handle format-specific defaults
  if (schema.format) {
    switch (schema.format) {
      case 'email':
        return 'example@example.com';
      case 'uri':
      case 'url':
        return 'https://example.com';
      case 'date':
        return new Date().toISOString().split('T')[0];
      case 'date-time':
        return new Date().toISOString();
      case 'time':
        return '00:00:00';
      case 'uuid':
        return '00000000-0000-0000-0000-000000000000';
    }
  }

  // Handle pattern - generate a simple string that might match
  if (schema.pattern) {
    // For common patterns, provide reasonable defaults
    if (schema.pattern.includes('[0-9]') || schema.pattern.includes('\\d')) {
      return '123';
    }
    if (schema.pattern.includes('[a-zA-Z]')) {
      return 'abc';
    }
  }

  // Handle length constraints
  const minLength = schema.minLength || 0;
  const maxLength = schema.maxLength;

  if (minLength > 0) {
    return 'x'.repeat(minLength);
  }

  return '';
}

function generateNumber(schema: JsonSchema, isInteger: boolean): number {
  const min = schema.minimum ?? (isInteger ? 0 : 0.0);
  const max = schema.maximum;

  if (max !== undefined && min > max) {
    return min;
  }

  let value = min;
  
  // If there's a maximum, pick a value in the middle of the range
  if (max !== undefined) {
    value = min + (max - min) / 2;
  }

  return isInteger ? Math.floor(value) : value;
}

function generateArray(schema: JsonSchema, visited: Set<JsonSchema>): any[] {
  const minItems = schema.minItems || 0;
  const maxItems = schema.maxItems;
  const targetLength = Math.max(minItems, 1); // Generate at least one item unless minItems is 0

  if (minItems === 0 && !schema.items) {
    return [];
  }

  const result: any[] = [];
  
  if (schema.items) {
    if (Array.isArray(schema.items)) {
      // Tuple validation - each position has its own schema
      for (let i = 0; i < Math.min(targetLength, schema.items.length); i++) {
        result.push(getSchemaDefaultValue(schema.items[i], visited));
      }
    } else {
      // Single schema for all items
      for (let i = 0; i < targetLength; i++) {
        result.push(getSchemaDefaultValue(schema.items, visited));
      }
    }
  }

  return result;
}

function generateObject(schema: JsonSchema, visited: Set<JsonSchema>): Record<string, any> {
  const result: Record<string, any> = {};
  const required = new Set(schema.required || []);

  // Handle defined properties
  if (schema.properties) {
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      // Always include required properties, optionally include others
      if (required.has(key) || shouldIncludeOptionalProperty(propSchema)) {
        result[key] = getSchemaDefaultValue(propSchema, visited);
      }
    }
  }

  // Handle additionalProperties if no regular properties were defined
  if (Object.keys(result).length === 0 && schema.additionalProperties) {
    if (typeof schema.additionalProperties === 'object') {
      // additionalProperties has a schema
      result.additionalProperty = getSchemaDefaultValue(schema.additionalProperties, visited);
    } else if (schema.additionalProperties === true) {
      // Any additional properties allowed
      result.additionalProperty = null;
    }
  }

  return result;
}

function shouldIncludeOptionalProperty(propSchema: JsonSchema): boolean {
  // Include optional properties if they have defaults, constants, or are simple types
  if (propSchema.default !== undefined || propSchema.const !== undefined) {
    return true;
  }
  
  // Include if it's a basic type (helps create more complete examples)
  const types = normalizeTypes(propSchema.type);
  return types.some(type => ['string', 'number', 'integer', 'boolean'].includes(type));
}

function handleAnyOf(schemas: JsonSchema[], visited: Set<JsonSchema>): any {
  if (schemas.length === 0) return null;

  // Check if this is a nullable union (includes null type)
  const hasNull = schemas.some(s => 
    s.type === 'null' || 
    (Array.isArray(s.type) && s.type.includes('null'))
  );

  if (hasNull && schemas.length === 2) {
    // Simple nullable case - use the non-null schema
    const nonNullSchema = schemas.find(s => 
      s.type !== 'null' && 
      !(Array.isArray(s.type) && s.type.includes('null'))
    );
    if (nonNullSchema) {
      return getSchemaDefaultValue(nonNullSchema, visited);
    }
  }

  // For complex unions, prefer schemas with defaults or constants
  const schemaWithDefault = schemas.find(s => s.default !== undefined || s.const !== undefined);
  if (schemaWithDefault) {
    return getSchemaDefaultValue(schemaWithDefault, visited);
  }

  // Otherwise use the first non-null schema
  const firstNonNull = schemas.find(s => 
    s.type !== 'null' && 
    !(Array.isArray(s.type) && s.type.includes('null'))
  );
  
  return getSchemaDefaultValue(firstNonNull || schemas[0], visited);
}

function handleOneOf(schemas: JsonSchema[], visited: Set<JsonSchema>): any {
  // oneOf is exclusive - only one schema should match
  // Use similar logic to anyOf but prefer the first valid option
  return handleAnyOf(schemas, visited);
}

function handleAllOf(schemas: JsonSchema[], visited: Set<JsonSchema>): any {
  // allOf means the value must satisfy ALL schemas
  // Merge all schemas and generate a value that satisfies all constraints
  const merged = mergeSchemas(schemas);
  return getSchemaDefaultValue(merged, visited);
}

function mergeSchemas(schemas: JsonSchema[]): JsonSchema {
  const merged: JsonSchema = {};
  const allProperties: Record<string, JsonSchema[]> = {};
  const allRequired: string[] = [];

  for (const schema of schemas) {
    // Merge basic properties
    if (schema.type && !merged.type) {
      merged.type = schema.type;
    }
    if (schema.default !== undefined && merged.default === undefined) {
      merged.default = schema.default;
    }
    if (schema.const !== undefined && merged.const === undefined) {
      merged.const = schema.const;
    }

    // Collect properties
    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (!allProperties[key]) allProperties[key] = [];
        allProperties[key].push(propSchema);
      }
    }

    // Collect required fields
    if (schema.required) {
      allRequired.push(...schema.required);
    }

    // Merge constraints (take the most restrictive)
    if (schema.minimum !== undefined) {
      merged.minimum = Math.max(merged.minimum || -Infinity, schema.minimum);
    }
    if (schema.maximum !== undefined) {
      merged.maximum = Math.min(merged.maximum || Infinity, schema.maximum);
    }
    if (schema.minLength !== undefined) {
      merged.minLength = Math.max(merged.minLength || 0, schema.minLength);
    }
    if (schema.maxLength !== undefined) {
      merged.maxLength = Math.min(merged.maxLength || Infinity, schema.maxLength);
    }
  }

  // Merge properties by combining schemas for each property
  if (Object.keys(allProperties).length > 0) {
    merged.properties = {};
    for (const [key, propSchemas] of Object.entries(allProperties)) {
      if (propSchemas.length === 1) {
        merged.properties[key] = propSchemas[0];
      } else {
        merged.properties[key] = { allOf: propSchemas };
      }
    }
  }

  if (allRequired.length > 0) {
    merged.required = [...new Set(allRequired)];
  }

  return merged;
}

function cloneValue(value: any): any {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  
  if (Array.isArray(value)) {
    return value.map(cloneValue);
  }
  
  const cloned: any = {};
  for (const [key, val] of Object.entries(value)) {
    cloned[key] = cloneValue(val);
  }
  return cloned;
}

import { isNullSchema, isObjectSchema, isSchemaObject, type JSONSchema } from './schema';

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
 * The variant list of a union schema, regardless of which keyword carries it.
 * styx2 emits unions as `oneOf` (each variant has a distinct `@type` const);
 * v1 and hand-written schemas may use `anyOf`. Returns null when neither is present.
 */
export function getUnionVariants(schema: JSONSchema): readonly JSONSchema[] | null {
	if (!isSchemaObject(schema)) return null;
	return schema.anyOf ?? schema.oneOf ?? null;
}

/**
 * Resolves union types to the most useful schema for path traversal
 */
function resolveUnion(schema: JSONSchema): JSONSchema | null {
	const variants = getUnionVariants(schema);
	if (!variants) return null;

	// Filter out null schemas
	const nonNullSchemas = variants.filter((s) => !isNullSchema(s));

	if (nonNullSchemas.length === 0) return null;
	if (nonNullSchemas.length === 1) return nonNullSchemas[0];

	// For multiple schemas, prefer object schemas for path traversal
	const objectSchemas = nonNullSchemas.filter((s) => isObjectSchema(s));
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

/** Is a schema's `type` keyword the array form that includes `"null"`? */
function hasNullInTypeArray(schema: JSONSchema): boolean {
	return isSchemaObject(schema) && Array.isArray(schema.type) && schema.type.includes('null');
}

/**
 * Checks if a schema permits null. Covers all three encodings the hub may see:
 * a null branch in a `anyOf`/`oneOf` union, or a `type: [..., "null"]` array
 * (how styx2's outputs schema marks an always-present-but-nullable field).
 */
export function isNullable(schema: JSONSchema): boolean {
	if (!isSchemaObject(schema)) return false;
	if (hasNullInTypeArray(schema)) return true;
	return getUnionVariants(schema)?.some(isNullSchema) ?? false;
}

/**
 * Gets the non-null schema from a nullable schema. For a union, returns the lone
 * non-null branch; for a `type: [T, "null"]` array, narrows `type` to the
 * non-null entries; otherwise returns the schema unchanged.
 */
export function getNonNullSchema(schema: JSONSchema): JSONSchema | null {
	if (!isSchemaObject(schema) || !isNullable(schema)) return schema;

	const variants = getUnionVariants(schema);
	if (variants) return variants.find((s) => !isNullSchema(s)) ?? null;

	if (hasNullInTypeArray(schema) && Array.isArray(schema.type)) {
		const nonNull = schema.type.filter((t) => t !== 'null');
		return { ...schema, type: nonNull.length === 1 ? nonNull[0] : nonNull };
	}

	return schema;
}

/**
 * Checks if a schema is a discriminated union the form should render with a
 * variant picker: an `anyOf`/`oneOf` carrying more than one non-null branch. A
 * single-branch union plus `null` is merely nullable, not a union.
 */
export function isUnion(schema: JSONSchema): boolean {
	const variants = getUnionVariants(schema);
	if (!variants || variants.length <= 1) return false;
	return variants.filter((s) => !isNullSchema(s)).length > 1;
}

/**
 * Checks if a schema is a closed enumeration. styx2 emits enums bare
 * (`{ "enum": [...] }`) with no `type`, so the field router cannot rely on a
 * string/number type guard to find them.
 */
export function isEnumSchema(schema: JSONSchema): boolean {
	return isSchemaObject(schema) && Array.isArray(schema.enum) && schema.enum.length > 0;
}

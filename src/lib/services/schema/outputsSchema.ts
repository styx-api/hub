import { type JSONSchema, isSchemaObject, isArraySchema } from './schema';
import { isNullable } from './schemaUtils';

/**
 * Interprets a styx2 **outputs** schema (`*.outputs.schema.json`).
 *
 * Unlike the inputs schema, every Outputs field is `required` - a tool's Outputs
 * object always carries every key. What varies is the *shape* of each value, and
 * the hub must tell three things apart that the naive "walk the value and print
 * every string as a file" renderer conflates:
 *
 * - **path outputs** (single, optional-single, or list) carry `x-styx-type: "path"`;
 * - **streams** (stdout / stderr) are an `array` of plain strings (lines of text)
 *   **without** `x-styx-type` - rendering each line as a file path is the bug this
 *   classification exists to prevent;
 * - the synthetic **`root`** entry is the run's output directory, surfaced first.
 *
 * See `@styx/core`'s `backend/schema/jsonschema.ts` (`generateOutputsSchema`) for
 * the emitting side of this contract.
 */

/** The synthetic output-directory field styx2 lists first in every Outputs schema. */
export const ROOT_OUTPUT_NAME = 'root';

export type OutputFieldKind = 'directory' | 'file' | 'stream' | 'other';
export type OutputCardinality = 'single' | 'list';

export interface OutputFieldDescriptor {
	/** The Outputs object property key (the descriptor's output id). */
	name: string;
	kind: OutputFieldKind;
	cardinality: OutputCardinality;
	/** A single output whose gate is off is `null` (encoded as a `"null"` type branch). */
	optional: boolean;
	title?: string;
	description?: string;
}

/** Does a schema carry styx2's `x-styx-type: "path"` marker? */
export function hasStyxPathType(schema: JSONSchema | undefined): boolean {
	return (
		isSchemaObject(schema as JSONSchema) &&
		(schema as Record<string, unknown>)['x-styx-type'] === 'path'
	);
}

/**
 * Is this Outputs field a captured stream (stdout/stderr)? Streams are the one
 * `array` whose items are plain strings with no `x-styx-type` - so a consumer can
 * distinguish "lines of text" from "a list of produced file paths".
 */
export function isStreamField(schema: JSONSchema | undefined): boolean {
	if (!isSchemaObject(schema as JSONSchema) || !isArraySchema(schema as JSONSchema)) return false;
	const items = (schema as JSONSchema.Array).items;
	return !hasStyxPathType(items as JSONSchema);
}

/** Classify a single Outputs property schema. */
export function classifyOutputField(name: string, schema: JSONSchema): OutputFieldDescriptor {
	const base = { name } as const;
	const meta = isSchemaObject(schema)
		? { title: schema.title, description: schema.description }
		: {};

	if (isArraySchema(schema)) {
		const items = (schema as JSONSchema.Array).items as JSONSchema | undefined;
		if (hasStyxPathType(items)) {
			return { ...base, ...meta, kind: 'file', cardinality: 'list', optional: false };
		}
		// array-of-string with no `x-styx-type` -> a stdout/stderr stream.
		return { ...base, ...meta, kind: 'stream', cardinality: 'list', optional: false };
	}

	if (hasStyxPathType(schema)) {
		// The synthetic output-dir is identified by name. styx2 bumps it to `root_`
		// if a tool declares its own output that sanitizes to `root`, so a literal
		// `root` field is always the dir; a bumped `root_` would fall through as a
		// regular file (it still points at the dir, so this is harmless - it just
		// loses the folder affordance). Matches AppPage's `key === 'root'` check.
		const kind: OutputFieldKind = name === ROOT_OUTPUT_NAME ? 'directory' : 'file';
		return { ...base, ...meta, kind, cardinality: 'single', optional: isNullable(schema) };
	}

	return { ...base, ...meta, kind: 'other', cardinality: 'single', optional: isNullable(schema) };
}

/**
 * Describe every field of an Outputs schema in declaration order (styx2 lists
 * `root` first, then file/mutable outputs, then stream fields).
 */
export function describeOutputs(
	outputsSchema: JSONSchema | null | undefined
): OutputFieldDescriptor[] {
	if (!isSchemaObject(outputsSchema as JSONSchema)) return [];
	const properties = (outputsSchema as JSONSchema.Object).properties;
	if (!properties) return [];
	return Object.entries(properties).map(([name, schema]) =>
		classifyOutputField(name, schema as JSONSchema)
	);
}

/** The set of stream (stdout/stderr) field names in an Outputs schema. */
export function streamFieldNames(outputsSchema: JSONSchema | null | undefined): Set<string> {
	return new Set(
		describeOutputs(outputsSchema)
			.filter((f) => f.kind === 'stream')
			.map((f) => f.name)
	);
}

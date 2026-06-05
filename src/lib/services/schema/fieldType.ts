import {
	type JSONSchema,
	isObjectSchema,
	isArraySchema,
	isStringSchema,
	isNumberSchema,
	isIntegerSchema,
	isBooleanSchema,
	isNullSchema
} from './schema';
import { isNullable, isUnion, isEnumSchema } from './schemaUtils';

/**
 * The kind of form control a schema maps to. Drives which field component
 * `FieldRenderer` mounts. `const` and `null` render nothing (the `@type`
 * discriminator and bare null branches are not user-editable); `unknown` is the
 * "we don't recognise this schema" fallback.
 */
export type FieldType =
	| 'const'
	| 'nullable'
	| 'enum'
	| 'union'
	| 'object'
	| 'array'
	| 'string'
	| 'integer'
	| 'number'
	| 'boolean'
	| 'null'
	| 'unknown';

/**
 * Classify a schema into the form control that should render it.
 *
 * Kept as a pure function (rather than inline in `FieldRenderer`) so the routing
 * can be unit-tested against real styx2 schemas - the guarantee we care about is
 * that every field of every emitted tool resolves to something other than
 * `'unknown'`.
 *
 * Ordering notes:
 * - `boolean` is checked before optionality: a boolean carries its own
 *   tri-state via the checkbox, so an optional boolean is still a `boolean`.
 * - An optional (`!required`) or nullable field becomes `nullable` - a checkbox
 *   that, when enabled, re-renders its inner schema as required. This is how
 *   styx2's "omitted from `required`" optionality surfaces, since styx2 never
 *   emits an `anyOf: [T, null]` wrapper.
 * - `enum` is checked before the union/object/scalar guards because styx2 emits
 *   enums bare (`{ enum: [...] }`) with no `type`, so the scalar guards miss them.
 * - `union` (an `anyOf`/`oneOf` with >1 non-null branch) is checked before
 *   `object`, since a `oneOf` of object variants would otherwise fall through.
 */
export function getFieldType(schema: JSONSchema.Interface, required: boolean): FieldType {
	if (schema.const !== undefined) return 'const';

	if (isBooleanSchema(schema)) return 'boolean';
	if (!required || isNullable(schema)) return 'nullable';
	if (isEnumSchema(schema)) return 'enum';
	if (isUnion(schema)) return 'union';
	if (isObjectSchema(schema)) return 'object';
	if (isArraySchema(schema)) return 'array';
	if (isStringSchema(schema)) return 'string';
	if (isIntegerSchema(schema)) return 'integer';
	if (isNumberSchema(schema)) return 'number';
	if (isNullSchema(schema)) return 'null';

	return 'unknown';
}

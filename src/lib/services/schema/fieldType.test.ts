import { describe, it, expect } from 'vitest';
import { getFieldType } from './fieldType';
import { getUnionVariants, getNonNullSchema } from './schemaUtils';
import { isSchemaObject, isObjectSchema, isArraySchema, type JSONSchema } from './schema';
import betSchema from './__fixtures__/bet.schema.json';
import antsSchema from './__fixtures__/antsApplyTransforms.schema.json';

const bet = betSchema as unknown as JSONSchema.Object;
const ants = antsSchema as unknown as JSONSchema.Object;

/**
 * Walk a schema exactly the way the form's components recurse, collecting the
 * dotted path of any field that routes to `'unknown'` (i.e. would render the
 * "Unsupported type" fallback). The guarantee H1 buys us is that this list is
 * empty for every real styx2 tool.
 */
function collectUnknowns(
	schema: JSONSchema,
	required: boolean,
	path: string[] = [],
	unknowns: string[] = [],
	depth = 0
): string[] {
	if (!isSchemaObject(schema) || depth > 64) return unknowns;
	const here = path.join('.') || '(root)';

	switch (getFieldType(schema, required)) {
		case 'unknown':
			unknowns.push(here);
			break;
		case 'nullable':
			// The optional wrapper re-renders its inner schema as required.
			collectUnknowns(getNonNullSchema(schema) ?? schema, true, path, unknowns, depth + 1);
			break;
		case 'union':
			// Object/primitive variants render a sub-form; literal (`const`) variants don't.
			(getUnionVariants(schema) ?? []).forEach((variant, i) => {
				if (isSchemaObject(variant) && variant.const !== undefined) return;
				collectUnknowns(variant, true, [...path, `<${i}>`], unknowns, depth + 1);
			});
			break;
		case 'object': {
			if (isObjectSchema(schema) && schema.properties) {
				const req = schema.required ?? [];
				for (const [key, propSchema] of Object.entries(schema.properties)) {
					if (key === '@type') continue;
					collectUnknowns(propSchema, req.includes(key), [...path, key], unknowns, depth + 1);
				}
			}
			break;
		}
		case 'array': {
			const items = isArraySchema(schema) ? schema.items : undefined;
			if (items && isSchemaObject(items)) {
				collectUnknowns(items, true, [...path, '[]'], unknowns, depth + 1);
			}
			break;
		}
		// const / null / boolean / string / integer / number / enum are leaves.
	}
	return unknowns;
}

describe('getFieldType against real styx2 schemas', () => {
	it('renders every field of fsl/bet (no Unsupported type)', () => {
		expect(collectUnknowns(bet, true)).toEqual([]);
	});

	it('renders every field of ants/antsApplyTransforms (no Unsupported type)', () => {
		expect(collectUnknowns(ants, true)).toEqual([]);
	});
});

describe('getFieldType routing for styx2 dialect shapes', () => {
	const prop = (root: JSONSchema.Object, key: string) =>
		root.properties![key] as JSONSchema.Interface;

	it('routes a oneOf object union to "union"', () => {
		// ants.output = oneOf of three @type-tagged object variants
		expect(getFieldType(prop(ants, 'output'), true)).toBe('union');
	});

	it('routes a mixed literal+object oneOf to "union"', () => {
		// ants.interpolation = "Linear" | ... | { @type: "multiLabel", ... } | ...
		expect(getFieldType(prop(ants, 'interpolation'), true)).toBe('union');
	});

	it('routes a bare enum (no type) to "enum"', () => {
		// ants.dimensionality = { enum: [2, 3, 4] }
		expect(getFieldType(prop(ants, 'dimensionality'), true)).toBe('enum');
		expect(getFieldType(prop(ants, 'output_data_type'), true)).toBe('enum');
	});

	it('routes an x-styx-type path scalar to "string"', () => {
		expect(getFieldType(prop(ants, 'input_image'), true)).toBe('string');
		expect(getFieldType(prop(bet, 'infile'), true)).toBe('string');
	});

	it('routes an array to "array" when required, "nullable" when optional', () => {
		// bet.center_of_gravity is an array, and is not in `required`.
		expect(getFieldType(prop(bet, 'center_of_gravity'), false)).toBe('nullable');
		expect(getFieldType(prop(bet, 'center_of_gravity'), true)).toBe('array');
	});

	it('routes a number scalar with bounds to "number"', () => {
		expect(getFieldType(prop(bet, 'fractional_intensity'), true)).toBe('number');
	});

	it('keeps a boolean a "boolean" even when optional', () => {
		expect(getFieldType(prop(bet, 'verbose'), false)).toBe('boolean');
	});
});

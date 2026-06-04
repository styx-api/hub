import { describe, it, expect } from 'vitest';
import {
	classifyOutputField,
	describeOutputs,
	isStreamField,
	streamFieldNames,
	type OutputFieldDescriptor
} from './outputsSchema';
import type { JSONSchema } from './schema';
import betOutputs from './__fixtures__/bet.outputs.schema.json';
import antsOutputs from './__fixtures__/antsApplyTransforms.outputs.schema.json';
import c3dOutputs from './__fixtures__/c3d.outputs.schema.json';
import avscaleOutputs from './__fixtures__/avscale.outputs.schema.json';

const byName = (fields: OutputFieldDescriptor[]) =>
	Object.fromEntries(fields.map((f) => [f.name, f]));

describe('describeOutputs against real styx2 outputs schemas', () => {
	it('classifies fsl/bet outputs (root dir + required path files)', () => {
		const fields = byName(describeOutputs(betOutputs as unknown as JSONSchema));

		expect(fields['root']).toMatchObject({ kind: 'directory', cardinality: 'single' });
		expect(fields['outfile']).toMatchObject({
			kind: 'file',
			cardinality: 'single',
			optional: false
		});
		// Every bet output is a required, present-single path file.
		const files = Object.values(fields).filter((f) => f.name !== 'root');
		expect(files.length).toBeGreaterThan(0);
		expect(files.every((f) => f.kind === 'file' && f.cardinality === 'single' && !f.optional)).toBe(
			true
		);
	});

	it('classifies an optional single output (type: [string, null])', () => {
		const fields = byName(describeOutputs(antsOutputs as unknown as JSONSchema));

		expect(fields['root']).toMatchObject({ kind: 'directory' });
		expect(fields['output_image_outfile']).toMatchObject({
			kind: 'file',
			cardinality: 'single',
			optional: true
		});
	});
});

// Real list-output and stream fixtures. Crucially c3d and avscale BOTH name the
// field `output` - c3d's is a list of paths, avscale's is a captured stream - so
// these prove the classifier keys off the items' `x-styx-type`, NOT the field name.
describe('describeOutputs for real list / stream outputs', () => {
	it('classifies c3d/c3d `output` (array of x-styx-type paths) as a file list', () => {
		const fields = byName(describeOutputs(c3dOutputs as unknown as JSONSchema));
		expect(fields['root']).toMatchObject({ kind: 'directory' });
		expect(fields['output']).toMatchObject({ kind: 'file', cardinality: 'list', optional: false });
		expect(streamFieldNames(c3dOutputs as unknown as JSONSchema).size).toBe(0);
	});

	it('classifies fsl/avscale `output` (array of strings, no x-styx-type) as a stream', () => {
		const fields = byName(describeOutputs(avscaleOutputs as unknown as JSONSchema));
		expect(fields['output']).toMatchObject({ kind: 'stream', cardinality: 'list' });
		// Name-independent: the stream is detected even though it is not stdout/stderr.
		expect(streamFieldNames(avscaleOutputs as unknown as JSONSchema)).toEqual(new Set(['output']));
	});
});

// The mutable-input output (a writable copy surfaced as an output) is a plain path
// single in the schema; styx2's bet/ants/c3d/avscale don't emit one, so it's asserted
// against the documented encoding (see @styx/core backend/schema/jsonschema.ts).
describe('classifyOutputField edge cases', () => {
	const path = { type: 'string', 'x-styx-type': 'path' } as unknown as JSONSchema;

	it('treats a mutable-input output (a plain path single) as a file', () => {
		expect(classifyOutputField('inplace_image', path)).toMatchObject({
			kind: 'file',
			cardinality: 'single',
			optional: false
		});
	});

	it('isStreamField is true only for non-path arrays', () => {
		expect(
			isStreamField({ type: 'array', items: { type: 'string' } } as unknown as JSONSchema)
		).toBe(true);
		expect(isStreamField({ type: 'array', items: path } as unknown as JSONSchema)).toBe(false);
		expect(isStreamField(path)).toBe(false);
	});
});

describe('streamFieldNames', () => {
	it('returns only the stream field names', () => {
		const schema = {
			type: 'object',
			properties: {
				root: { type: 'string', 'x-styx-type': 'path' },
				out: { type: 'string', 'x-styx-type': 'path' },
				logs: { type: 'array', items: { type: 'string' } },
				output: { type: 'array', items: { type: 'string', 'x-styx-type': 'path' } }
			}
		} as unknown as JSONSchema;

		// `logs` is a stream; `output` (array of paths) is NOT.
		expect(streamFieldNames(schema)).toEqual(new Set(['logs']));
	});

	it('is empty for a schema with no streams (real bet outputs)', () => {
		expect(streamFieldNames(betOutputs as unknown as JSONSchema).size).toBe(0);
	});

	it('is empty for null/undefined', () => {
		expect(streamFieldNames(null).size).toBe(0);
		expect(streamFieldNames(undefined).size).toBe(0);
	});
});

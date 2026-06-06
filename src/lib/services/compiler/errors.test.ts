import { describe, expect, it } from 'vitest';
import {
	describeCommandError,
	describeCompilerError,
	describeLoadError,
	tidyDetail
} from './errors';

describe('tidyDetail', () => {
	it('trims whitespace and a redundant leading "Error:"', () => {
		expect(tidyDetail('  Error: something broke  ')).toBe('something broke');
		expect(tidyDetail('error: lower case too')).toBe('lower case too');
	});

	it('leaves a clean message untouched', () => {
		expect(tidyDetail('compiling bet: unexpected token')).toBe('compiling bet: unexpected token');
	});
});

describe('describe* helpers', () => {
	it('pair a plain-language title with the tidied detail', () => {
		const load = describeLoadError('Error: boom');
		expect(load.title).toMatch(/couldn't be loaded/i);
		expect(load.detail).toBe('boom');

		expect(describeCommandError('missing required input').title).toMatch(
			/can't produce a command/i
		);
		expect(describeCompilerError('worker crashed').title).toMatch(/in-browser compiler/i);
	});

	it('never surface a stack-trace-looking blob (only the message is passed in)', () => {
		// The worker forwards only `Error.message`, so detail is a single line here.
		const detail = describeLoadError('solve(): cannot read properties of undefined').detail;
		expect(detail).not.toContain('\n    at ');
	});
});

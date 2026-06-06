import { describe, it, expect } from 'vitest';
import { safeFileStem } from './download';

describe('safeFileStem', () => {
	it('passes through a plain tool name', () => {
		expect(safeFileStem('bet')).toBe('bet');
	});

	it('keeps word chars, dots, and dashes', () => {
		expect(safeFileStem('antsApplyTransforms')).toBe('antsApplyTransforms');
		expect(safeFileStem('v1.0-final')).toBe('v1.0-final');
	});

	it('replaces characters unsafe for a filename', () => {
		// Workbench-style names with slashes/spaces must not escape the filename.
		expect(safeFileStem('volume/create')).toBe('volume_create');
		expect(safeFileStem('wb command')).toBe('wb_command');
	});

	it('falls back to "tool" only for an empty result', () => {
		expect(safeFileStem('')).toBe('tool');
		// Non-empty input keeps its (sanitized) length rather than collapsing.
		expect(safeFileStem('///')).toBe('___');
	});
});

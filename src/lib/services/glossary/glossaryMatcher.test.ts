import { describe, it, expect } from 'vitest';
import { parseGlossaryText } from './glossaryMatcher';

describe('parseGlossaryText', () => {
	it('returns empty array for empty input', () => {
		expect(parseGlossaryText('')).toEqual([]);
	});

	it('returns single text segment when no matches', () => {
		const result = parseGlossaryText('no abbreviations here');
		expect(result).toEqual([{ type: 'text', content: 'no abbreviations here' }]);
	});

	it('matches a single term', () => {
		const result = parseGlossaryText('This is an MRI scan');
		expect(result).toHaveLength(3);
		expect(result[0]).toEqual({ type: 'text', content: 'This is an ' });
		expect(result[1]).toMatchObject({ type: 'term', content: 'MRI' });
		expect(result[1].type === 'term' && result[1].entry.title).toBe('Magnetic Resonance Imaging');
		expect(result[2]).toEqual({ type: 'text', content: ' scan' });
	});

	it('matches multiple terms in a sentence', () => {
		const result = parseGlossaryText('Convert DICOM to NIfTI format');
		const terms = result.filter((s) => s.type === 'term');
		expect(terms).toHaveLength(2);
		expect(terms[0].content).toBe('DICOM');
		expect(terms[1].content).toBe('NIfTI');
	});

	it('does not match lowercase forms of acronym-only terms', () => {
		expect(parseGlossaryText('Use fsl for analysis').filter((s) => s.type === 'term')).toHaveLength(
			0
		);
		expect(parseGlossaryText('run it fast').filter((s) => s.type === 'term')).toHaveLength(0);
		expect(parseGlossaryText('the first step').filter((s) => s.type === 'term')).toHaveLength(0);
		expect(parseGlossaryText('bold move').filter((s) => s.type === 'term')).toHaveLength(0);
	});

	it('matches explicit lowercase variations like nifti and afni', () => {
		const r1 = parseGlossaryText('nifti format');
		const r2 = parseGlossaryText('afni tools');
		expect(r1.filter((s) => s.type === 'term')).toHaveLength(1);
		expect(r2.filter((s) => s.type === 'term')).toHaveLength(1);
	});

	it('matches term variations to the same entry', () => {
		const r1 = parseGlossaryText('NIfTI format');
		const r2 = parseGlossaryText('NIFTI format');
		const r3 = parseGlossaryText('Nifti format');
		const t1 = r1.filter((s) => s.type === 'term');
		const t2 = r2.filter((s) => s.type === 'term');
		const t3 = r3.filter((s) => s.type === 'term');
		expect(t1).toHaveLength(1);
		expect(t2).toHaveLength(1);
		expect(t3).toHaveLength(1);
		// All resolve to the same entry
		const expectedTitle = 'Neuroimaging Informatics Technology Initiative';
		expect(t1[0].type === 'term' && t1[0].entry.title).toBe(expectedTitle);
		expect(t2[0].type === 'term' && t2[0].entry.title).toBe(expectedTitle);
		expect(t3[0].type === 'term' && t3[0].entry.title).toBe(expectedTitle);
		// But preserve original text
		expect(t1[0].content).toBe('NIfTI');
		expect(t2[0].content).toBe('NIFTI');
		expect(t3[0].content).toBe('Nifti');
	});

	it('prefers longer match: fMRI over MRI', () => {
		const result = parseGlossaryText('Run an fMRI experiment');
		const terms = result.filter((s) => s.type === 'term');
		expect(terms).toHaveLength(1);
		expect(terms[0].content).toBe('fMRI');
	});

	it('prefers longer match: rsfMRI over fMRI', () => {
		const result = parseGlossaryText('Analyze rsfMRI data');
		const terms = result.filter((s) => s.type === 'term');
		expect(terms).toHaveLength(1);
		expect(terms[0].content).toBe('rsfMRI');
	});

	it('matches T1w variant to T1-Weighted entry', () => {
		const result = parseGlossaryText('Load the T1w image');
		const terms = result.filter((s) => s.type === 'term');
		expect(terms).toHaveLength(1);
		expect(terms[0].content).toBe('T1w');
		expect(terms[0].type === 'term' && terms[0].entry.title).toBe('T1-Weighted');
	});

	it('does not match terms inside longer words (MD not in CMD)', () => {
		const result = parseGlossaryText('Run the CMD command');
		const terms = result.filter((s) => s.type === 'term');
		expect(terms).toHaveLength(0);
	});

	it('does not match terms inside longer words (FA not in FAST)', () => {
		const result = parseGlossaryText('Run FAST segmentation');
		const terms = result.filter((s) => s.type === 'term');
		expect(terms).toHaveLength(1);
		expect(terms[0].content).toBe('FAST');
	});

	it('matches term at start of string', () => {
		const result = parseGlossaryText('MRI is a technique');
		expect(result[0]).toMatchObject({ type: 'term', content: 'MRI' });
	});

	it('matches term at end of string', () => {
		const result = parseGlossaryText('Data from MRI');
		const last = result[result.length - 1];
		expect(last).toMatchObject({ type: 'term', content: 'MRI' });
	});

	it('matches adjacent terms separated by non-alpha', () => {
		const result = parseGlossaryText('T1/T2 weighted images');
		const terms = result.filter((s) => s.type === 'term');
		expect(terms).toHaveLength(2);
		expect(terms[0].content).toBe('T1');
		expect(terms[1].content).toBe('T2');
	});

	it('handles text with only a glossary term', () => {
		const result = parseGlossaryText('BOLD');
		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({ type: 'term', content: 'BOLD' });
	});

	it('does not match partial word boundaries (e.g. ROIs should not match ROI)', () => {
		const result = parseGlossaryText('Multiple ROIs found');
		const terms = result.filter((s) => s.type === 'term');
		expect(terms).toHaveLength(0);
	});

	it('matches term followed by punctuation', () => {
		const result = parseGlossaryText('Apply BET, then run FAST.');
		const terms = result.filter((s) => s.type === 'term');
		expect(terms).toHaveLength(2);
		expect(terms[0].content).toBe('BET');
		expect(terms[1].content).toBe('FAST');
	});

	it('entry has separate title and description fields', () => {
		const result = parseGlossaryText('Use FSL tools');
		const terms = result.filter((s) => s.type === 'term');
		expect(terms).toHaveLength(1);
		if (terms[0].type === 'term') {
			expect(terms[0].entry.title).toBe('FMRIB Software Library');
			expect(terms[0].entry.description).toMatch(/neuroimaging analysis/i);
		}
	});

	it('matches new terms: EDDY, TOPUP, CSD', () => {
		const result = parseGlossaryText('Run EDDY and TOPUP before CSD fitting');
		const terms = result.filter((s) => s.type === 'term');
		expect(terms).toHaveLength(3);
		expect(terms.map((t) => t.content)).toEqual(['EDDY', 'TOPUP', 'CSD']);
	});

	it('matches diffusion file terms: bval, bvec', () => {
		const result = parseGlossaryText('Provide bval and bvec files');
		const terms = result.filter((s) => s.type === 'term');
		expect(terms).toHaveLength(2);
		expect(terms[0].content).toBe('bval');
		expect(terms[1].content).toBe('bvec');
	});

	it('matches coordinate system terms: RAS, LPS', () => {
		const result = parseGlossaryText('Convert from LPS to RAS orientation');
		const terms = result.filter((s) => s.type === 'term');
		expect(terms).toHaveLength(2);
		expect(terms[0].content).toBe('LPS');
		expect(terms[1].content).toBe('RAS');
	});
});

import { describe, expect, it } from 'vitest';
import { compilerMismatchWarning, compilerStatus, type ManifestCompiler } from './version';

const core = (version: string): ManifestCompiler => ({ name: '@styx-api/core', version });

describe('compilerStatus', () => {
	it('returns null when there is no manifest compiler', () => {
		expect(compilerStatus(null)).toBeNull();
		expect(compilerStatus(undefined)).toBeNull();
	});

	it('matches when the bundled version equals the manifest version', () => {
		const status = compilerStatus(core('0.2.0'), '0.2.0');
		expect(status).toMatchObject({
			name: '@styx-api/core',
			manifestVersion: '0.2.0',
			bundledVersion: '0.2.0',
			verifiable: true,
			match: true
		});
	});

	it('flags a version mismatch', () => {
		const status = compilerStatus(core('0.3.0'), '0.2.0');
		expect(status?.match).toBe(false);
		expect(status?.manifestVersion).toBe('0.3.0');
		expect(status?.bundledVersion).toBe('0.2.0');
	});

	it('flags a package-name mismatch even at the same version', () => {
		const status = compilerStatus({ name: '@other/core', version: '0.2.0' }, '0.2.0');
		expect(status?.match).toBe(false);
	});

	it('never warns when the bundled version is unknown (unverifiable build)', () => {
		const status = compilerStatus(core('9.9.9'), 'unknown');
		expect(status).toMatchObject({ verifiable: false, match: true });
	});
});

describe('compilerMismatchWarning', () => {
	it('returns null for a matching or unverifiable status', () => {
		expect(compilerMismatchWarning(compilerStatus(core('0.2.0'), '0.2.0'))).toBeNull();
		expect(compilerMismatchWarning(compilerStatus(core('9.9.9'), 'unknown'))).toBeNull();
		expect(compilerMismatchWarning(null)).toBeNull();
	});

	it('names both versions when mismatched', () => {
		const warning = compilerMismatchWarning(compilerStatus(core('0.3.0'), '0.2.0'));
		expect(warning).toContain('0.2.0');
		expect(warning).toContain('0.3.0');
		expect(warning).toMatch(/may differ/i);
	});
});

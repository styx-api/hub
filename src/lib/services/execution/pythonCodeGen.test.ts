import { describe, it, expect } from 'vitest';
import { createPythonStaticCall } from './pythonCodeGen';

describe('createPythonStaticCall', () => {
	it('generates a simple function call with no params', () => {
		const config = { '@type': 'mypkg/mytool' };
		const symbolMap = {
			fn_root_make_params_and_execute: 'my_tool',
			properties: {}
		};

		const result = createPythonStaticCall(config, symbolMap);
		expect(result).toBe('from niwrap import mypkg\n\nmypkg.my_tool()');
	});

	it('generates a call with simple string param', () => {
		const config = { '@type': 'mypkg/mytool', input_file: '/data/brain.nii' };
		const symbolMap = {
			fn_root_make_params_and_execute: 'my_tool',
			properties: {
				input_file: { var_param: 'input_file' }
			}
		};

		const result = createPythonStaticCall(config, symbolMap);
		expect(result).toContain('input_file="/data/brain.nii"');
		expect(result).toContain('from niwrap import mypkg');
	});

	it('generates a call with boolean params', () => {
		const config = { '@type': 'pkg/tool', verbose: true, debug: false };
		const symbolMap = {
			fn_root_make_params_and_execute: 'run_tool',
			properties: {
				verbose: { var_param: 'verbose' },
				debug: { var_param: 'debug' }
			}
		};

		const result = createPythonStaticCall(config, symbolMap);
		expect(result).toContain('verbose=True');
		expect(result).toContain('debug=False');
	});

	it('generates a call with numeric param', () => {
		const config = { '@type': 'pkg/tool', threshold: 0.5 };
		const symbolMap = {
			fn_root_make_params_and_execute: 'run_tool',
			properties: {
				threshold: { var_param: 'threshold' }
			}
		};

		const result = createPythonStaticCall(config, symbolMap);
		expect(result).toContain('threshold=0.5');
	});

	it('generates a call with null param', () => {
		const config = { '@type': 'pkg/tool', opt: null };
		const symbolMap = {
			fn_root_make_params_and_execute: 'run_tool',
			properties: {
				opt: { var_param: 'opt' }
			}
		};

		const result = createPythonStaticCall(config, symbolMap);
		expect(result).toContain('opt=None');
	});

	it('generates a call with simple array param', () => {
		const config = { '@type': 'pkg/tool', dims: [1, 2, 3] };
		const symbolMap = {
			fn_root_make_params_and_execute: 'run_tool',
			properties: {
				dims: { var_param: 'dims' }
			}
		};

		const result = createPythonStaticCall(config, symbolMap);
		expect(result).toContain('dims=[1,2,3]');
	});

	it('skips @type keys and unknown properties', () => {
		const config = { '@type': 'pkg/tool', unknown_key: 'value' };
		const symbolMap = {
			fn_root_make_params_and_execute: 'run_tool',
			properties: {}
		};

		const result = createPythonStaticCall(config, symbolMap);
		expect(result).toBe('from niwrap import pkg\n\npkg.run_tool()');
	});

	it('skips properties without var_param', () => {
		const config = { '@type': 'pkg/tool', no_param: 'value' };
		const symbolMap = {
			fn_root_make_params_and_execute: 'run_tool',
			properties: {
				no_param: {}
			}
		};

		const result = createPythonStaticCall(config, symbolMap);
		expect(result).toBe('from niwrap import pkg\n\npkg.run_tool()');
	});

	it('handles nested struct objects', () => {
		const config = {
			'@type': 'pkg/tool',
			opts: { value: 42 }
		};
		const symbolMap = {
			fn_root_make_params_and_execute: 'run_tool',
			properties: {
				opts: {
					var_param: 'opts',
					fn_struct_make_params: 'make_opts',
					properties: {
						value: { var_param: 'value' }
					}
				}
			}
		};

		const result = createPythonStaticCall(config, symbolMap);
		expect(result).toContain('opts=pkg.make_opts(');
		expect(result).toContain('value=42');
	});

	it('handles variant types', () => {
		const config = {
			'@type': 'pkg/tool',
			input: { '@type': 'variant_a', val: 'hello' }
		};
		const symbolMap = {
			fn_root_make_params_and_execute: 'run_tool',
			properties: {
				input: {
					var_param: 'input',
					variants: {
						variant_a: {
							fn_struct_make_params: 'make_variant_a',
							properties: {
								val: { var_param: 'val' }
							}
						}
					}
				}
			}
		};

		const result = createPythonStaticCall(config, symbolMap);
		expect(result).toContain('input=pkg.make_variant_a(');
		expect(result).toContain('val="hello"');
	});

	it('handles arrays of variant objects', () => {
		const config = {
			'@type': 'pkg/tool',
			items: [{ '@type': 'va', x: 1 }]
		};
		const symbolMap = {
			fn_root_make_params_and_execute: 'run_tool',
			properties: {
				items: {
					var_param: 'items',
					variants: {
						va: {
							fn_struct_make_params: 'make_va',
							properties: {
								x: { var_param: 'x' }
							}
						}
					}
				}
			}
		};

		const result = createPythonStaticCall(config, symbolMap);
		expect(result).toContain('items=[');
		expect(result).toContain('pkg.make_va(');
		expect(result).toContain('x=1');
	});

	it('throws when fn_root_make_params_and_execute is missing', () => {
		const config = { '@type': 'pkg/tool' };
		const symbolMap = { properties: {} };

		expect(() => createPythonStaticCall(config, symbolMap)).toThrow(
			'fn_root_make_params_and_execute not found'
		);
	});

	it('throws for unknown variant type', () => {
		const config = {
			'@type': 'pkg/tool',
			input: { '@type': 'unknown_variant', val: 1 }
		};
		const symbolMap = {
			fn_root_make_params_and_execute: 'run_tool',
			properties: {
				input: {
					var_param: 'input',
					variants: {
						known_variant: {
							fn_struct_make_params: 'make_known',
							properties: {}
						}
					}
				}
			}
		};

		expect(() => createPythonStaticCall(config, symbolMap)).toThrow(
			'Unknown variant type "unknown_variant"'
		);
	});
});

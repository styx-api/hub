import { fetchSymbolmapForConfig } from './symbolmaps';

/**
 * Recursively build parameter strings for Python function calls.
 */
function buildParams(
	pkg: string,
	config: Record<string, any>,
	spec: Record<string, any>,
	indentLevel: number = 1
): string[] {
	const params: string[] = [];
	const indent = '    '.repeat(indentLevel);

	const properties = spec.properties || {};

	for (const [key, value] of Object.entries(config)) {
		// Skip special keys like @type
		if (key.startsWith('@')) {
			continue;
		}

		if (!(key in properties)) {
			continue;
		}

		const propSpec = properties[key];
		const varParam = propSpec.var_param;

		if (!varParam) {
			continue;
		}

		// Handle arrays of structured objects
		if (
			Array.isArray(value) &&
			value.length > 0 &&
			typeof value[0] === 'object' &&
			value[0] !== null
		) {
			const listItems: string[] = [];

			for (const item of value) {
				// Check if this is a variant type
				if (propSpec.variants && item['@type']) {
					const variantType = item['@type'];

					if (!(variantType in propSpec.variants)) {
						throw new Error(`Unknown variant type "${variantType}" for property: ${key}`);
					}

					const variantSpec = propSpec.variants[variantType];
					const fnStruct = variantSpec.fn_struct_make_params;

					if (!fnStruct) {
						throw new Error(`fn_struct_make_params missing for variant: ${variantType}`);
					}

					const nestedParams = buildParams(pkg, item, variantSpec, indentLevel + 2);
					const nestedIndent = '    '.repeat(indentLevel + 1);

					let nestedCall = `${nestedIndent}${pkg}.${fnStruct}(`;
					if (nestedParams.length > 0) {
						nestedCall += '\n' + nestedParams.join(',\n') + `\n${nestedIndent}`;
					}
					nestedCall += ')';

					listItems.push(nestedCall);
				}
				// Check if this has a nested structure (non-variant)
				else if (propSpec.fn_struct_make_params) {
					const nestedParams = buildParams(pkg, item, propSpec, indentLevel + 2);
					const nestedIndent = '    '.repeat(indentLevel + 1);

					let nestedCall = `${nestedIndent}${pkg}.${propSpec.fn_struct_make_params}(`;
					if (nestedParams.length > 0) {
						nestedCall += '\n' + nestedParams.join(',\n') + `\n${nestedIndent}`;
					}
					nestedCall += ')';

					listItems.push(nestedCall);
				}
			}

			if (listItems.length > 0) {
				const listContent = '[\n' + listItems.join(',\n') + `\n${indent}]`;
				params.push(`${indent}${varParam}=${listContent}`);
			}
		}
		// Check if this property has variants (union types)
		else if (
			propSpec.variants &&
			typeof value === 'object' &&
			value !== null &&
			!Array.isArray(value)
		) {
			const variantType = value['@type'];

			if (!variantType) {
				throw new Error(`@type missing for variant property: ${key}`);
			}

			if (!(variantType in propSpec.variants)) {
				throw new Error(`Unknown variant type "${variantType}" for property: ${key}`);
			}

			const variantSpec = propSpec.variants[variantType];
			const fnStruct = variantSpec.fn_struct_make_params;

			if (!fnStruct) {
				throw new Error(`fn_struct_make_params missing for variant: ${variantType}`);
			}

			// Build nested params for the variant
			const nestedParams = buildParams(pkg, value, variantSpec, indentLevel + 1);

			let nestedCall = `${pkg}.${fnStruct}(`;
			if (nestedParams.length > 0) {
				nestedCall += '\n' + nestedParams.join(',\n') + `\n${indent}`;
			}
			nestedCall += ')';

			params.push(`${indent}${varParam}=${nestedCall}`);
		}
		// Check if this property has nested structure (non-variant)
		else if (
			propSpec.fn_struct_make_params &&
			typeof value === 'object' &&
			value !== null &&
			!Array.isArray(value)
		) {
			// Nested structure - recursively build params
			const nestedParams = buildParams(pkg, value, propSpec, indentLevel + 1);

			let nestedCall = `${pkg}.${propSpec.fn_struct_make_params}(`;
			if (nestedParams.length > 0) {
				nestedCall += '\n' + nestedParams.join(',\n') + `\n${indent}`;
			}
			nestedCall += ')';

			params.push(`${indent}${varParam}=${nestedCall}`);
		} else {
			// Simple value - format appropriately
			let formattedValue: string;

			if (typeof value === 'string') {
				formattedValue = `"${value}"`;
			} else if (typeof value === 'boolean') {
				formattedValue = value ? 'True' : 'False';
			} else if (value === null || value === undefined) {
				formattedValue = 'None';
			} else if (Array.isArray(value)) {
				// Simple array (primitives)
				formattedValue = JSON.stringify(value);
			} else {
				formattedValue = String(value);
			}

			params.push(`${indent}${varParam}=${formattedValue}`);
		}
	}

	return params;
}

/**
 * Generate Python code for a static NiWrap function call from a descriptor config and symbol map.
 */
export function createPythonStaticCall(
	descriptorConfig: Record<string, any>,
	symbolMap: Record<string, any>
): string {
	// Extract the root function name
	const rootFn = symbolMap.fn_root_make_params_and_execute;

	if (!rootFn) {
		throw new Error('fn_root_make_params_and_execute not found in symbolMap');
	}

	const pkg = descriptorConfig['@type'].split('/')[0];

	// Build all parameters
	const params = buildParams(pkg, descriptorConfig, symbolMap, 1);

	// Construct the final function call
	let result = `from niwrap import ${pkg}\n\n`;

	result += `${pkg}.${rootFn}(`;
	if (params.length > 0) {
		result += '\n' + params.join(',\n') + '\n';
	}
	result += ')';

	return result;
}

/**
 * Convenience function that fetches the symbolmap and generates Python code.
 */
export async function createPythonStaticCallFromConfig(
	descriptorConfig: Record<string, any>
): Promise<string> {
	const symbolmap = await fetchSymbolmapForConfig(descriptorConfig);
	return createPythonStaticCall(descriptorConfig, symbolmap);
}

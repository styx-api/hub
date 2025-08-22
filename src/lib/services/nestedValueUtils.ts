/**
 * Type-safe utilities for accessing and updating nested object/array structures
 * using dot-notation paths with proper immutability guarantees.
 */

export type NestedPath = string;
export type NestedValue = unknown;

/**
 * Safely retrieves a nested value using dot-notation path traversal.
 * 
 * @param obj Source object to traverse
 * @param path Dot-notation path (e.g., "user.profile.name", "items.0.title")
 * @returns Value at path or undefined if path doesn't exist
 */
export function getNestedValue(obj: unknown, path: NestedPath): NestedValue {
	if (!path) return obj;
	
	return path.split('.').reduce((current, key) => {
		return current != null && typeof current === 'object' 
			? (current as Record<string, unknown>)[key]
			: undefined;
	}, obj);
}

/**
 * Immutably updates a nested value using structural sharing.
 * Preserves existing array/object distinctions and extends arrays as needed.
 * 
 * @param obj Source object/array (remains unmodified)
 * @param path Dot-notation path to update location
 * @param value New value to set
 * @returns New object/array with updated value
 */
export function updateNestedValue<T>(obj: T, path: NestedPath, value: NestedValue): T {
	if (!path) return value as T;

	const keys = path.split('.');
	const result = cloneContainer(obj);
	let current: any = result;

	for (let i = 0; i < keys.length - 1; i++) {
		const key = keys[i];
		current = traverseToKey(current, key);
	}

	const finalKey = keys[keys.length - 1];
	setValueAtKey(current, finalKey, value);

	return result;
}

function cloneContainer<T>(obj: T): T {
	if (Array.isArray(obj)) return [...obj] as T;
	if (obj != null && typeof obj === 'object') return { ...obj as object } as T;
	return obj;
}

function traverseToKey(current: any, key: string): any {
	if (Array.isArray(current) && isNumericKey(key)) {
		const index = parseInt(key, 10);
		extendArrayToIndex(current, index);
		
		if (!isObject(current[index])) {
			current[index] = {};
		} else {
			current[index] = cloneContainer(current[index]);
		}
		return current[index];
	}

	if (!isObject(current[key])) {
		current[key] = {};
	} else {
		current[key] = cloneContainer(current[key]);
	}
	return current[key];
}

function setValueAtKey(current: any, key: string, value: NestedValue): void {
	if (Array.isArray(current) && isNumericKey(key)) {
		const index = parseInt(key, 10);
		extendArrayToIndex(current, index);
		current[index] = value;
		return;
	}
	
	current[key] = value;
}

function isNumericKey(key: string): boolean {
	return /^\d+$/.test(key);
}

function isObject(value: unknown): boolean {
	return value != null && typeof value === 'object';
}

function extendArrayToIndex(arr: unknown[], targetIndex: number): void {
	while (arr.length <= targetIndex) {
		arr.push(undefined);
	}
}
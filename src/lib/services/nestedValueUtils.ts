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

/**
 * Immutably removes a nested property using structural sharing.
 * Automatically cleans up empty parent objects and arrays.
 * 
 * @param obj Source object/array (remains unmodified)
 * @param path Dot-notation path to property to remove
 * @returns New object/array with property removed and empty parents cleaned
 */
export function deleteNestedProperty<T>(obj: T, path: NestedPath): T {
	if (!path) return obj;
	
	const keys = path.split('.');
	
	// Check if path exists before attempting deletion
	if (getNestedValue(obj, path) === undefined) {
		return obj;
	}
	
	const result = cloneContainer(obj);
	const pathToParent = keys.slice(0, -1).join('.');
	const finalKey = keys[keys.length - 1];
	
	if (pathToParent) {
		// Navigate to parent and clone path
		let current: any = result;
		for (let i = 0; i < keys.length - 1; i++) {
			const key = keys[i];
			current[key] = cloneContainer(current[key]);
			current = current[key];
		}
		
		// Remove the final property
		removeValueAtKey(current, finalKey);
	} else {
		// Top-level property removal
		removeValueAtKey(result, finalKey);
	}

	return cleanEmptyContainers(result) as T;
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

function removeValueAtKey(current: any, key: string): void {
	if (Array.isArray(current) && isNumericKey(key)) {
		const index = parseInt(key, 10);
		if (index >= 0 && index < current.length) {
			current.splice(index, 1);
		}
		return;
	}
	
	if (isObject(current)) {
		delete (current as Record<string, unknown>)[key];
	}
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

/**
 * Recursively removes empty objects and arrays from a nested structure.
 * Preserves meaningful falsy values like 0, false, and empty strings.
 */
function cleanEmptyContainers(obj: unknown): unknown {
	if (obj === null || obj === undefined) {
		return obj;
	}
	
	if (Array.isArray(obj)) {
		const cleaned = obj
			.map(cleanEmptyContainers)
			.filter(item => !isEmptyContainer(item));
		
		return cleaned.length > 0 ? cleaned : undefined;
	}
	
	if (typeof obj === 'object') {
		const cleaned: Record<string, unknown> = {};
		let hasValidProps = false;
		
		for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
			const cleanedValue = cleanEmptyContainers(value);
			
			if (!isEmptyContainer(cleanedValue)) {
				cleaned[key] = cleanedValue;
				hasValidProps = true;
			}
		}
		
		return hasValidProps ? cleaned : undefined;
	}
	
	return obj;
}

/**
 * Determines if a value represents an empty container that should be removed.
 * Empty objects and arrays are considered empty, but falsy primitives are not.
 */
function isEmptyContainer(value: unknown): boolean {
	if (value === undefined) return true;
	if (Array.isArray(value)) return value.length === 0;
	if (value != null && typeof value === 'object') {
		return Object.keys(value as Record<string, unknown>).length === 0;
	}
	return false;
}
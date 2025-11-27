export type RequireField<T, K extends keyof T> = T & Required<Pick<T, K>>;

// deep clone via converting to and from json
export function simpleClone<T>(x: T): T {
	return JSON.parse(JSON.stringify(x || {}));
}

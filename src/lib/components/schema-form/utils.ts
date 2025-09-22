import type { SchemaPath } from "./types";

export function getFieldLabel(path: SchemaPath): string {
	const pathTail: string | number | undefined = path[path.length - 1];
	if (typeof pathTail === "string") return pathTail;
	if (typeof pathTail === "number") return `${getFieldLabel(path.slice(0, -1))} #${pathTail + 1}`;
	return "Unknown Field";
}

export function getFieldId(path: SchemaPath, qualifier: string = "unknown"): string {
	return `${qualifier}-${path.join('/')}`
}
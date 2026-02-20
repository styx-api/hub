import type { JSONSchema } from '$lib/services/schema/schema';
import type { SchemaPath } from '$lib/services/schema/schemaUtils';
export type { SchemaPath };

export type FieldProps = {
	schema: JSONSchema.Interface;

	value: any;
	path: SchemaPath;
	required?: boolean;

	onUpdate: (path: SchemaPath, value: any) => void;
};

import type { JSONSchema } from '$lib/services/schema/schema';
import type { SchemaPath } from '$lib/services/schema/schemaUtils';
export type { SchemaPath };

export type FieldProps = {
	schema: JSONSchema.Interface;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	value: any;
	path: SchemaPath;
	required?: boolean;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	onUpdate: (path: SchemaPath, value: any) => void;
};

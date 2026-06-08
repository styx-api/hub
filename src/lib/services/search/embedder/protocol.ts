/** Worker message protocol for the query embedder (kept tiny + structured-clone safe). */

export interface EmbedRequest {
	id: number;
	texts: string[];
}

export type EmbedResponse =
	| { id: number; ok: true; vectors: number[][] }
	| { id: number; ok: false; error: string };

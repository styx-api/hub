export async function compressString(str: string): Promise<string> {
	const data = new TextEncoder().encode(str);
	const stream = new ReadableStream({
		start(controller) {
			controller.enqueue(data);
			controller.close();
		}
	}).pipeThrough(new CompressionStream('gzip'));

	const compressed = await new Response(stream).arrayBuffer();
	return btoa(String.fromCharCode(...new Uint8Array(compressed)));
}

export async function decompressString(str: string): Promise<string> {
	const data = Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
	const stream = new ReadableStream({
		start(controller) {
			controller.enqueue(data);
			controller.close();
		}
	}).pipeThrough(new DecompressionStream('gzip'));

	const decompressed = await new Response(stream).arrayBuffer();
	return new TextDecoder().decode(decompressed);
}

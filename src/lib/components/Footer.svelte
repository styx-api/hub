<script lang="ts">
	import type { Project } from '$lib/services/packages.svelte';

	interface Props {
		project: Project | null;
	}

	let { project }: Props = $props();
</script>

<footer class="mt-8 border-t pt-6">
	<div class="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
		<div class="space-y-2">
			<h4 class="text-sm font-semibold">Getting Started</h4>
			<div class="space-y-1 text-xs">
				<a
					href="https://niwrap.dev/styxbook/"
					class="block text-muted-foreground transition-colors hover:text-foreground"
					>Documentation</a
				>
				<a
					href="https://github.com/styx-api/niwrap"
					class="block text-muted-foreground transition-colors hover:text-foreground"
					>GitHub Repository</a
				>
				<a
					href="https://niwrap.dev/styxbook/contributing.html"
					class="block text-muted-foreground transition-colors hover:text-foreground"
					>Contributing Guide</a
				>
			</div>
		</div>

		<div class="space-y-2">
			<h4 class="text-sm font-semibold">Install</h4>
			<div class="space-y-1 text-xs">
				<a
					href="https://pypi.org/project/niwrap/"
					class="block text-muted-foreground transition-colors hover:text-foreground"
					>Python (PyPI)</a
				>
				<a
					href="https://www.npmjs.com/package/niwrap"
					class="block text-muted-foreground transition-colors hover:text-foreground"
					>TypeScript (npm)</a
				>
				<span class="block text-muted-foreground/60">R (coming soon)</span>
			</div>
		</div>

		<div class="space-y-2 sm:col-span-2 lg:col-span-1">
			<h4 class="text-sm font-semibold">Community</h4>
			<div class="space-y-1 text-xs">
				<a
					href="https://discord.gg/QMKUVCFWsR"
					class="block text-muted-foreground transition-colors hover:text-foreground">Discord</a
				>
				<a
					href="https://doi.org/10.1101/2025.07.24.666435"
					class="block text-muted-foreground transition-colors hover:text-foreground"
					>Research Paper</a
				>
				<a
					href="https://boutiques.github.io/"
					class="block text-muted-foreground transition-colors hover:text-foreground">Boutiques</a
				>
			</div>
		</div>
	</div>

	<div class="mt-6 border-t pt-4">
		<div
			class="flex flex-col items-center justify-between gap-2 text-xs text-muted-foreground sm:flex-row"
		>
			<p>
				© 2025 NiWrap Hub.{#if project?.project.docs?.description}{' ' + project.project.docs.description}{/if}
			</p>
			{#if project}
				<p>NiWrap v{project.project.version}</p>
			{/if}
		</div>
	</div>
</footer>

<script lang="ts">
	import { URLS } from '$lib/constants/urls';

	const links = [
		{ label: 'Docs', href: URLS.docs },
		{ label: 'GitHub', href: URLS.github },
		{ label: 'PyPI', href: URLS.pypi },
		{ label: 'npm', href: URLS.npm },
		{ label: 'Discord', href: URLS.discord },
		{ label: 'Paper', href: URLS.paper }
	];
</script>

<footer class="mt-12 border-t border-border/50 py-6">
	<div class="flex flex-col items-center gap-3">
		<nav class="flex flex-wrap items-center justify-center gap-y-1">
			{#each links as { label, href }, i}
				{#if i > 0}
					<span class="px-1 text-xs leading-none text-muted-foreground/30" aria-hidden="true">&middot;</span>
				{/if}
				<a
					{href}
					target="_blank"
					rel="noopener noreferrer"
					class="rounded px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
				>
					{label}
				</a>
			{/each}
		</nav>
		<p class="text-[11px] text-muted-foreground/50">
			Open source neuroimaging tool wrappers
		</p>
	</div>
</footer>

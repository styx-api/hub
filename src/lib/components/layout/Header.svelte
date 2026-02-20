<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Sun, Moon, Star } from '@lucide/svelte';
	import { QuickSelector } from '$lib/components/shared';
	import logo from '$lib/assets/logo.svg';
	import type { PackageInfo } from '$lib/services/catalog';
	import { URLS } from '$lib/constants/urls';

	interface Props {
		selectedPackage: PackageInfo | null;
		selectedApp: string | null;
		isDark: boolean;
		onClearSelection: () => void;
		onToggleTheme: () => void;
		onPackageSelected: (pkg: PackageInfo) => void;
		onAppSelected: (app: string) => void;
	}

	let {
		selectedPackage,
		selectedApp,
		isDark,
		onClearSelection,
		onToggleTheme,
		onPackageSelected,
		onAppSelected
	}: Props = $props();
</script>

<header class="mb-4">
	<div class="flex items-center gap-3">
		<button
			onclick={onClearSelection}
			class="flex shrink-0 cursor-pointer items-center gap-2 transition-opacity hover:opacity-80"
			aria-label="Home"
		>
			<img src={logo} alt="NiWrap" class="h-7 w-7" />
			<span class="hidden text-base font-bold tracking-tight md:inline">NiWrap</span>
		</button>

		<div class="min-w-0 flex-1">
			<QuickSelector
				package={selectedPackage}
				app={selectedApp}
				compact={true}
				{onPackageSelected}
				{onAppSelected}
			/>
		</div>

		<div class="flex shrink-0 items-center gap-1.5">
			<a
				href={URLS.github}
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2 text-xs font-medium text-muted-foreground transition-colors hover:border-yellow-500/50 hover:text-foreground"
				aria-label="Star on GitHub"
			>
				<Star class="h-3 w-3" />
				<span class="hidden sm:inline">Star</span>
			</a>
			<Button variant="outline" size="icon" class="h-8 w-8" onclick={onToggleTheme}>
				{#if isDark}
					<Sun class="h-3.5 w-3.5" />
				{:else}
					<Moon class="h-3.5 w-3.5" />
				{/if}
			</Button>
		</div>
	</div>
</header>

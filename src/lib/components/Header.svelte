<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Sun, Moon, Menu } from '@lucide/svelte';
	import QuickSelector from '$lib/components/QuickSelector.svelte';
	import { resolve as resolve_ } from '$app/paths';
	import type { Package, App, Project } from '$lib/services/packages.svelte';

	const resolve = resolve_ as (arg0: string) => string; // typescript complains about something weird here.

	interface Props {
		selectedPackage: Package | null;
		selectedApp: App | null;
		project: Project | null;
		isDark: boolean;
		showMobileSelector: boolean;
		onClearSelection: () => void;
		onToggleTheme: () => void;
		onToggleMobileSelector: () => void;
	}

	let {
		selectedPackage = $bindable(),
		selectedApp = $bindable(),
		project,
		isDark,
		showMobileSelector,
		onClearSelection,
		onToggleTheme,
		onToggleMobileSelector
	}: Props = $props();
</script>

<header class="mb-4">
	<!-- Desktop Layout -->
	<div class="hidden md:flex md:items-center md:gap-6">
		<button
			onclick={onClearSelection}
			class="group flex shrink-0 cursor-pointer items-center space-x-3 transition-all hover:opacity-80"
		>
			<div
				class="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-200 bg-gradient-to-br from-amber-100 to-orange-100 shadow-md transition-shadow group-hover:shadow-lg"
			>
				<img src={resolve('/logo.svg')} alt="NiWrap" class="h-6 w-6" />
			</div>
			<h1 class="text-xl font-bold tracking-tight lg:text-2xl">NiWrap Hub</h1>
		</button>

		<div class="max-w-2xl flex-1">
			<QuickSelector bind:package={selectedPackage} bind:app={selectedApp} compact={false} />
		</div>

		<div class="flex shrink-0 items-center gap-3">
			{#if project}
				<div
					class="hidden items-center gap-1.5 rounded-md border border-muted bg-muted/30 px-2.5 py-1 sm:flex"
				>
					<div class="h-1.5 w-1.5 rounded-full bg-green-500"></div>
					<span class="text-xs font-medium text-muted-foreground">v{project.version}</span>
				</div>
			{/if}
			<Button variant="outline" size="sm" onclick={onToggleTheme}>
				{#if isDark}
					<Sun class="h-4 w-4" />
				{:else}
					<Moon class="h-4 w-4" />
				{/if}
			</Button>
		</div>
	</div>

	<!-- Mobile Layout -->
	<div class="space-y-3 md:hidden">
		<div class="flex items-center justify-between">
			<button
				onclick={onClearSelection}
				class="group flex cursor-pointer items-center space-x-3 transition-all hover:opacity-80"
			>
				<div
					class="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-200 bg-gradient-to-br from-amber-100 to-orange-100 shadow-sm transition-shadow group-hover:shadow-md"
				>
					<img src={resolve('/logo.svg')} alt="NiWrap" class="h-5 w-5" />
				</div>
				<h1 class="text-lg font-bold tracking-tight">NiWrap Hub</h1>
			</button>

			<div class="flex items-center gap-2">
				{#if project}
					<div
						class="flex items-center gap-1.5 rounded-md border border-muted bg-muted/30 px-2 py-1"
					>
						<div class="h-1.5 w-1.5 rounded-full bg-green-500"></div>
						<span class="text-xs font-medium text-muted-foreground">v{project.version}</span>
					</div>
				{/if}
				<Button
					variant="outline"
					size="sm"
					onclick={onToggleMobileSelector}
					aria-label="Toggle app selector"
				>
					<Menu class="h-4 w-4" />
				</Button>
				<Button variant="outline" size="sm" onclick={onToggleTheme}>
					{#if isDark}
						<Sun class="h-4 w-4" />
					{:else}
						<Moon class="h-4 w-4" />
					{/if}
				</Button>
			</div>
		</div>

		{#if showMobileSelector}
			<div class="rounded-lg border bg-card p-3">
				<div class="mb-3 flex items-center justify-between">
					<h3 class="text-sm font-medium">Select App</h3>
					<Button variant="ghost" size="sm" onclick={onToggleMobileSelector}>×</Button>
				</div>
				<QuickSelector bind:package={selectedPackage} bind:app={selectedApp} compact={true} />
			</div>
		{:else if selectedApp}
			<div class="rounded-lg border bg-muted/30 p-3">
				<div class="flex items-center justify-between">
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm font-medium">{selectedPackage?.name}</p>
						<p class="truncate text-xs text-muted-foreground">{selectedApp.name}</p>
					</div>
					<Button variant="outline" size="sm" onclick={onToggleMobileSelector}>Change</Button>
				</div>
			</div>
		{:else if selectedPackage}
			<div class="rounded-lg border bg-muted/30 p-3">
				<div class="flex items-center justify-between">
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm font-medium">{selectedPackage.name}</p>
						<p class="text-xs text-muted-foreground">Select an app</p>
					</div>
					<Button variant="outline" size="sm" onclick={onToggleMobileSelector}>Choose App</Button>
				</div>
			</div>
		{:else}
			<div class="rounded-lg border bg-muted/30 p-3">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium">No app selected</p>
						<p class="text-xs text-muted-foreground">Tap to choose</p>
					</div>
					<Button variant="outline" size="sm" onclick={onToggleMobileSelector}>Select</Button>
				</div>
			</div>
		{/if}
	</div>
</header>

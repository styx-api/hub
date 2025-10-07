<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Sun, Moon, Menu } from '@lucide/svelte';
	import QuickSelector from '$lib/components/QuickSelector.svelte';
	import logo from '$lib/assets/logo.svg';
	import type { Package, App, Project } from '$lib/services/packages.svelte';

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

	let betaClicks = $state(0);
	let showEasterEgg = $state(false);
	let easterEggTimeout: ReturnType<typeof setTimeout> | null = null;

	const betaMessages = [
		"Still breaking things",
		"Bugs are features",
		"Works on my machine",
		"Unfinished business",
		"Proceed with caution",
		"Handle with care",
		"Expect the unexpected",
		"Trust issues included",
		"Stability not guaranteed",
		"Blame Jason"
	];

	function handleBetaClick(event: MouseEvent) {
		event.stopPropagation();
		betaClicks++;
		showEasterEgg = true;

		if (easterEggTimeout) {
			clearTimeout(easterEggTimeout);
		}

		easterEggTimeout = setTimeout(() => {
			showEasterEgg = false;
			betaClicks = 0;
		}, 2000);
	}

	function getBetaMessage() {
		if (betaClicks > betaMessages.length) return "You found all the bugs";
		return betaMessages[Math.min(betaClicks - 1, betaMessages.length - 1)];
	}
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
				<img src={logo} alt="NiWrap" class="h-7 w-7" />
			</div>
			<div class="relative">
				<h1 class="text-xl font-bold tracking-tight lg:text-2xl">
					NiWrap Hub
					<!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<sup 
						class="ml-1.5 cursor-pointer rounded bg-purple-600 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white transition-transform hover:scale-110 active:scale-95 dark:bg-purple-500"
						onclick={handleBetaClick}
						role="button"
						tabindex="0"
					>
						BETA
					</sup>
				</h1>
				{#if showEasterEgg}
					<div class="pointer-events-none absolute left-0 top-full z-50 mt-1 rounded border border-border bg-background px-2 py-1 text-xs text-muted-foreground shadow-lg">
						{getBetaMessage()}
					</div>
				{/if}
			</div>
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
					<img src={logo} alt="NiWrap" class="h-6 w-6" />
				</div>
				<div class="relative">
					<h1 class="text-lg font-bold tracking-tight">
						NiWrap Hub
						<sup 
							class="ml-1.5 cursor-pointer rounded bg-purple-600 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white transition-transform hover:scale-110 active:scale-95 dark:bg-purple-500"
							onclick={handleBetaClick}
							role="button"
							tabindex="0"
						>
							BETA
						</sup>
					</h1>
					{#if showEasterEgg}
						<div class="pointer-events-none absolute left-0 top-full z-50 mt-1 rounded border border-border bg-background px-2 py-1 text-xs text-muted-foreground shadow-lg">
							{getBetaMessage()}
						</div>
					{/if}
				</div>
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
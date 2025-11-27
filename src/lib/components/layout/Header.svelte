<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Sun, Moon, Menu } from '@lucide/svelte';
	import { QuickSelector } from '$lib/components/shared';
	import logo from '$lib/assets/logo.svg';
	import type { PackageInfo, CatalogIndex } from '$lib/services/catalog';

	interface Props {
		selectedPackage: PackageInfo | null;
		selectedApp: string | null;
		index: CatalogIndex | null;
		isDark: boolean;
		showMobileSelector: boolean;
		onClearSelection: () => void;
		onToggleTheme: () => void;
		onToggleMobileSelector: () => void;
	}

	let {
		selectedPackage = $bindable(),
		selectedApp = $bindable(),
		index,
		isDark,
		showMobileSelector,
		onClearSelection,
		onToggleTheme,
		onToggleMobileSelector
	}: Props = $props();

	// Easter egg state
	let betaClicks = $state(0);
	let showEasterEgg = $state(false);
	let easterEggTimeout: ReturnType<typeof setTimeout> | null = null;

	const BETA_MESSAGES = [
		'Still breaking things',
		'Bugs are features',
		'Works on my machine',
		'Unfinished business',
		'Proceed with caution',
		'Handle with care',
		'Expect the unexpected',
		'Trust issues included',
		'Stability not guaranteed',
		'Blame Jason'
	];

	const betaMessage = $derived(
		betaClicks > BETA_MESSAGES.length
			? 'You found all the bugs'
			: BETA_MESSAGES[Math.min(betaClicks - 1, BETA_MESSAGES.length - 1)]
	);

	function handleBetaClick(event: MouseEvent) {
		event.stopPropagation();
		betaClicks++;
		showEasterEgg = true;

		if (easterEggTimeout) clearTimeout(easterEggTimeout);

		easterEggTimeout = setTimeout(() => {
			showEasterEgg = false;
			betaClicks = 0;
		}, 2000);
	}
</script>

{#snippet betaBadge()}
	<sup
		class="ml-1.5 cursor-pointer rounded bg-purple-600 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white transition-transform hover:scale-110 active:scale-95 dark:bg-purple-500"
		onclick={handleBetaClick}
		onkeydown={(e) => e.key === 'Enter' && handleBetaClick(e)}
		role="button"
		tabindex="0"
	>
		BETA
	</sup>
{/snippet}

{#snippet easterEggTooltip()}
	{#if showEasterEgg}
		<div
			class="pointer-events-none absolute top-full left-0 z-50 mt-1 rounded border border-border bg-background px-2 py-1 text-xs text-muted-foreground shadow-lg"
		>
			{betaMessage}
		</div>
	{/if}
{/snippet}

{#snippet versionBadge()}
	{#if index}
		<div
			class="flex items-center gap-1.5 rounded-md border border-muted bg-muted/30 px-2 py-1 sm:px-2.5"
		>
			<div class="h-1.5 w-1.5 rounded-full bg-green-500"></div>
			<span class="text-xs font-medium text-muted-foreground">v{index.project.version}</span>
		</div>
	{/if}
{/snippet}

{#snippet themeToggle()}
	<Button variant="outline" size="sm" onclick={onToggleTheme}>
		{#if isDark}
			<Sun class="h-4 w-4" />
		{:else}
			<Moon class="h-4 w-4" />
		{/if}
	</Button>
{/snippet}

{#snippet logoButton(size: 'sm' | 'lg')}
	{@const iconSize = size === 'lg' ? 'h-10 w-10' : 'h-8 w-8'}
	{@const imgSize = size === 'lg' ? 'h-7 w-7' : 'h-6 w-6'}
	{@const titleSize = size === 'lg' ? 'text-xl lg:text-2xl' : 'text-lg'}
	{@const roundedSize = size === 'lg' ? 'rounded-xl' : 'rounded-lg'}
	{@const shadow =
		size === 'lg' ? 'shadow-md group-hover:shadow-lg' : 'shadow-sm group-hover:shadow-md'}

	<button
		onclick={onClearSelection}
		class="group flex shrink-0 cursor-pointer items-center space-x-3 transition-all hover:opacity-80"
	>
		<div
			class="flex items-center justify-center border border-amber-200 bg-gradient-to-br from-amber-100 to-orange-100 transition-shadow {iconSize} {roundedSize} {shadow}"
		>
			<img src={logo} alt="NiWrap" class={imgSize} />
		</div>
		<div class="relative">
			<h1 class="font-bold tracking-tight {titleSize}">
				NiWrap Hub
				{@render betaBadge()}
			</h1>
			{@render easterEggTooltip()}
		</div>
	</button>
{/snippet}

{#snippet mobileAppStatus()}
	{#if showMobileSelector}
		<div class="rounded-lg border bg-card p-3">
			<div class="mb-3 flex items-center justify-between">
				<h3 class="text-sm font-medium">Select App</h3>
				<Button variant="ghost" size="sm" onclick={onToggleMobileSelector}>×</Button>
			</div>
			<QuickSelector bind:package={selectedPackage} bind:app={selectedApp} compact={true} />
		</div>
	{:else}
		{@const title = selectedApp
			? selectedPackage?.package.name
			: selectedPackage
				? selectedPackage.package.name
				: 'No app selected'}
		{@const subtitle = selectedApp
			? selectedApp
			: selectedPackage
				? 'Select an app'
				: 'Tap to choose'}
		{@const buttonText = selectedApp ? 'Change' : selectedPackage ? 'Choose App' : 'Select'}

		<div class="rounded-lg border bg-muted/30 p-3">
			<div class="flex items-center justify-between">
				<div class="min-w-0 flex-1">
					<p class="truncate text-sm font-medium">{title}</p>
					<p class="truncate text-xs text-muted-foreground">{subtitle}</p>
				</div>
				<Button variant="outline" size="sm" onclick={onToggleMobileSelector}>{buttonText}</Button>
			</div>
		</div>
	{/if}
{/snippet}

<header class="mb-4">
	<!-- Desktop -->
	<div class="hidden md:flex md:items-center md:gap-6">
		{@render logoButton('lg')}

		<div class="max-w-2xl flex-1">
			<QuickSelector bind:package={selectedPackage} bind:app={selectedApp} compact={false} />
		</div>

		<div class="flex shrink-0 items-center gap-3">
			<div class="hidden sm:flex">
				{@render versionBadge()}
			</div>
			{@render themeToggle()}
		</div>
	</div>

	<!-- Mobile -->
	<div class="space-y-3 md:hidden">
		<div class="flex items-center justify-between">
			{@render logoButton('sm')}

			<div class="flex items-center gap-2">
				{@render versionBadge()}
				<Button
					variant="outline"
					size="sm"
					onclick={onToggleMobileSelector}
					aria-label="Toggle app selector"
				>
					<Menu class="h-4 w-4" />
				</Button>
				{@render themeToggle()}
			</div>
		</div>

		{@render mobileAppStatus()}
	</div>
</header>

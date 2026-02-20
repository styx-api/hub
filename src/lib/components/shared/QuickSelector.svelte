<script lang="ts">
	import { tick } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import * as Command from '$lib/components/ui/command/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import {
		Check,
		ChevronsUpDown,
		LoaderCircle,
		Search,
		Package as PackageIcon,
		Terminal,
		CircleAlert,
		RefreshCw
	} from '@lucide/svelte/icons';
	import { cn } from '$lib/utils.js';
	import { catalog, type PackageInfo } from '$lib/services/catalog';

	interface Props {
		package?: PackageInfo | null;
		app?: string | null;
		compact?: boolean;
		onPackageSelected?: (pkg: PackageInfo) => void;
		onAppSelected?: (app: string) => void;
	}

	let {
		package: selectedPackage = null,
		app: selectedApp = null,
		compact = false,
		onPackageSelected,
		onAppSelected
	}: Props = $props();

	let packages: PackageInfo[] = $state([]);
	let error: string | null = $state(null);
	let open = $state(false);
	let triggerRef = $state<HTMLButtonElement | null>(null);
	let search = $state('');
	let appLimit = $state(50);
	let listRef = $state<HTMLDivElement | null>(null);

	interface AppEntry {
		name: string;
		package: PackageInfo;
	}

	// Build flat app index once packages load
	const allApps = $derived<AppEntry[]>(
		packages.flatMap((pkg) =>
			(pkg.version.apps ?? []).map((app) => ({ name: app, package: pkg }))
		)
	);

	const searchTerms = $derived(
		search
			.toLowerCase()
			.trim()
			.split(/\s+/)
			.filter((t) => t.length > 0)
	);

	const MAX_PACKAGES = 8;
	const APP_PAGE_SIZE = 50;

	function matchesAllTerms(terms: string[], ...fields: string[]): boolean {
		const combined = fields.join(' ').toLowerCase();
		return terms.every((term) => combined.includes(term));
	}

	const filteredPackages = $derived(
		searchTerms.length === 0
			? packages.slice(0, MAX_PACKAGES)
			: packages
					.filter((p) =>
						matchesAllTerms(
							searchTerms,
							p.package.docs?.title ?? '',
							p.package.name
						)
					)
					.slice(0, MAX_PACKAGES)
	);

	// All matching apps (unsliced — sliced in template via appLimit)
	const filteredApps = $derived(
		searchTerms.length === 0 || search.trim().length < 2
			? []
			: allApps.filter((a) =>
					matchesAllTerms(
						searchTerms,
						a.name,
						a.package.package.docs?.title ?? '',
						a.package.package.name
					)
				)
	);

	// When a package is selected and no search, show its apps (unsliced)
	const selectedPackageApps = $derived(
		searchTerms.length === 0 && selectedPackage
			? (selectedPackage.version.apps ?? [])
			: []
	);

	// The app list currently being displayed (whichever is active)
	const totalAppCount = $derived(
		filteredApps.length > 0 ? filteredApps.length : selectedPackageApps.length
	);
	const hasMoreApps = $derived(totalAppCount > appLimit);

	const hasResults = $derived(
		filteredPackages.length > 0 || filteredApps.length > 0 || selectedPackageApps.length > 0
	);

	const packageLabel = $derived(
		selectedPackage
			? (selectedPackage.package.docs?.title ?? selectedPackage.package.name)
			: null
	);
	const hasSelection = $derived(!!selectedPackage);

	const buttonHeight = $derived(compact ? 'h-8' : 'h-10');
	const textSize = $derived(compact ? 'text-sm' : 'text-base');

	// Reset app limit when search changes or popover opens
	$effect(() => {
		void search;
		appLimit = APP_PAGE_SIZE;
	});

	function showMore() {
		if (!listRef) {
			appLimit += APP_PAGE_SIZE;
			return;
		}
		const scrollTop = listRef.scrollTop;
		// Prevent cmdk from resetting scroll during re-render
		listRef.style.overflow = 'hidden';
		appLimit += APP_PAGE_SIZE;
		tick().then(() => {
			requestAnimationFrame(() => {
				if (listRef) {
					listRef.scrollTop = scrollTop;
					listRef.style.overflow = '';
				}
			});
		});
	}

	// Load packages on init
	loadPackages();

	async function loadPackages() {
		try {
			error = null;
			const idx = await catalog.load();
			packages = [...idx.packages.values()];
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load packages';
		}
	}

	function handleSelectPackage(pkg: PackageInfo) {
		onPackageSelected?.(pkg);
		open = false;
		search = '';
		tick().then(() => triggerRef?.focus());
	}

	function handleSelectApp(entry: AppEntry) {
		onPackageSelected?.(entry.package);
		onAppSelected?.(entry.name);
		open = false;
		search = '';
		tick().then(() => triggerRef?.focus());
	}
</script>

<div class="w-full">
	{#if catalog.loading}
		<div class="flex items-center justify-center py-6">
			<LoaderCircle class="h-5 w-5 animate-spin text-primary" />
			<span class="ml-3 text-sm text-muted-foreground">Loading packages...</span>
		</div>
	{:else if error}
		<Alert variant="destructive">
			<CircleAlert class="h-4 w-4" />
			<AlertDescription class="flex items-center justify-between">
				<span>{error}</span>
				<Button variant="outline" size="sm" onclick={loadPackages} class="ml-4 shrink-0">
					<RefreshCw class="mr-1 h-3 w-3" />
					Retry
				</Button>
			</AlertDescription>
		</Alert>
	{:else}
		<Popover.Root bind:open>
			<Popover.Trigger bind:ref={triggerRef}>
				{#snippet child({ props })}
					<Button
						{...props}
						variant="outline"
						class={cn(
							'w-full justify-between text-left font-normal',
							buttonHeight,
							hasSelection && 'border-primary/50 bg-primary/5'
						)}
						role="combobox"
						aria-expanded={open}
						aria-label="Search packages and apps"
					>
						<div class="flex min-w-0 items-center">
							{#if selectedApp && packageLabel}
								<Terminal class="mr-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
								<span class="truncate text-xs text-muted-foreground">{packageLabel}</span>
								<span class="mx-1.5 text-xs text-muted-foreground/50">/</span>
								<span class={cn('truncate font-mono font-medium', textSize)}>{selectedApp}</span>
							{:else if packageLabel}
								<PackageIcon class="mr-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
								<span class={cn('truncate', textSize)}>{packageLabel}</span>
							{:else}
								<Search class="mr-2 h-3.5 w-3.5 shrink-0 opacity-50" />
								<span class={cn('truncate text-muted-foreground', textSize)}>
									Search packages and apps...
								</span>
							{/if}
						</div>
						<ChevronsUpDown class="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
					</Button>
				{/snippet}
			</Popover.Trigger>
			<Popover.Content class="w-96 p-0" align="start">
				<Command.Root shouldFilter={false}>
					<Command.Input placeholder="Search..." class="h-9" bind:value={search} />
					<Command.List class="max-h-80" bind:ref={listRef}>
						{#if !hasResults}
							<Command.Empty>No results found.</Command.Empty>
						{/if}

						{#if filteredPackages.length > 0}
							<Command.Group heading="Packages">
								{#each filteredPackages as pkg (pkg.package.name)}
									{@const isSelected = selectedPackage?.package.name === pkg.package.name}
									{@const appCount = pkg.version.apps?.length ?? 0}
									<Command.Item
										value={pkg.package.name}
										onSelect={() => handleSelectPackage(pkg)}
										class="flex cursor-pointer items-center justify-between py-2"
									>
										<div class="flex min-w-0 flex-1 items-center">
											<Check
												class={cn('mr-2 h-3.5 w-3.5 text-primary', !isSelected && 'text-transparent')}
											/>
											<PackageIcon class="mr-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
											<span class="truncate text-sm font-medium">
												{pkg.package.docs?.title ?? pkg.package.name}
											</span>
										</div>
										<Badge variant="secondary" class="ml-2 h-5 shrink-0 px-1.5 text-xs">
											{appCount}
										</Badge>
									</Command.Item>
								{/each}
							</Command.Group>
						{/if}

						{#if filteredApps.length > 0}
							<Command.Group heading="Apps">
								{#each filteredApps.slice(0, appLimit) as entry (entry.package.package.name + '/' + entry.name)}
									{@const isSelected =
										selectedPackage?.package.name === entry.package.package.name &&
										selectedApp === entry.name}
									<Command.Item
										value={entry.package.package.name + '/' + entry.name}
										onSelect={() => handleSelectApp(entry)}
										class="flex cursor-pointer items-center justify-between py-2"
									>
										<div class="flex min-w-0 flex-1 items-center">
											<Check
												class={cn('mr-2 h-3.5 w-3.5 text-primary', !isSelected && 'text-transparent')}
											/>
											<Terminal class="mr-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
											<span class="truncate font-mono text-sm">{entry.name}</span>
										</div>
										<span class="ml-2 shrink-0 text-xs text-muted-foreground">
											{entry.package.package.docs?.title ?? entry.package.package.name}
										</span>
									</Command.Item>
								{/each}
							</Command.Group>
						{/if}

						{#if selectedPackageApps.length > 0}
							<Command.Group heading={packageLabel ?? 'Apps'}>
								{#each selectedPackageApps.slice(0, appLimit) as appName (appName)}
									{@const isSelected = selectedApp === appName}
									<Command.Item
										value={selectedPackage?.package.name + '/' + appName}
										onSelect={() => {
											onAppSelected?.(appName);
											open = false;
											search = '';
											tick().then(() => triggerRef?.focus());
										}}
										class="flex cursor-pointer items-center py-2"
									>
										<div class="flex min-w-0 flex-1 items-center">
											<Check
												class={cn('mr-2 h-3.5 w-3.5 text-primary', !isSelected && 'text-transparent')}
											/>
											<Terminal class="mr-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
											<span class="truncate font-mono text-sm">{appName}</span>
										</div>
									</Command.Item>
								{/each}
							</Command.Group>
						{/if}

						{#if search.trim().length > 0 && search.trim().length < 2}
							<div class="px-4 py-3 text-center text-xs text-muted-foreground">
								Type 2+ characters to search apps
							</div>
						{/if}

						{#if hasMoreApps}
							<Command.Item
								value="__show_more__"
								onSelect={showMore}
								class="flex cursor-pointer items-center justify-center py-2 text-xs text-muted-foreground"
							>
								Show {Math.min(APP_PAGE_SIZE, totalAppCount - appLimit)} more of {totalAppCount} results...
							</Command.Item>
						{/if}
					</Command.List>
				</Command.Root>
			</Popover.Content>
		</Popover.Root>
	{/if}
</div>

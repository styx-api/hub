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
		RefreshCw,
		Sparkles
	} from '@lucide/svelte/icons';
	import { cn } from '$lib/utils.js';
	import { catalog, type PackageInfo, type ToolRef } from '$lib/services/catalog';
	import { blendHits, semanticScores, semanticSearch, type SearchHit } from '$lib/services/search';

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

	// Flat tool refs (with descriptions) + a name→PackageInfo map for selection.
	let refs: ToolRef[] = $state([]);
	let packagesByName = $state(new Map<string, PackageInfo>());

	// Semantic upgrade: the resolved cosine map and the query it belongs to. When
	// `semQuery` matches the current trimmed search, hits blend in semantics;
	// otherwise the list stays on the instant lexical ranking.
	let semScores = $state<Map<string, number> | null>(null);
	let semQuery = $state('');
	// Status of the semantic pass for the current query, for the footer label.
	let semStatus = $state<'idle' | 'pending' | 'ready' | 'unavailable'>('idle');

	const APP_RESULT_CAP = 200;

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
					.filter((p) => matchesAllTerms(searchTerms, p.package.docs?.title ?? '', p.package.name))
					.slice(0, MAX_PACKAGES)
	);

	// Ranked tool hits (unsliced — sliced in template via appLimit). Lexical and
	// synchronous on every keystroke; upgrades to the blended ranking once the
	// semantic map for this query has resolved.
	const appHits = $derived<SearchHit[]>(
		searchTerms.length === 0 || search.trim().length < 2
			? []
			: blendHits(
					search,
					refs,
					semScores && semQuery === search.trim() ? semScores : null,
					APP_RESULT_CAP
				)
	);

	// Debounced semantic pass: embeds the query in a worker and stores the cosine
	// map for the *current* query only (stale resolutions are ignored). Skipped
	// when semantic is gated off or the query is too short — pure lexical then.
	$effect(() => {
		const q = search.trim();
		if (!semanticSearch.enabled || q.length < 2) {
			semScores = null;
			semQuery = '';
			semStatus = 'idle';
			return;
		}
		let cancelled = false;
		semStatus = 'pending';
		const timer = setTimeout(() => {
			semanticScores(q).then((scores) => {
				if (cancelled || search.trim() !== q) return;
				semScores = scores;
				semQuery = q;
				semStatus = scores ? 'ready' : 'unavailable';
			});
		}, 150);
		return () => {
			cancelled = true;
			clearTimeout(timer);
		};
	});

	// When a package is selected and no search, show its apps (unsliced)
	const selectedPackageApps = $derived(
		searchTerms.length === 0 && selectedPackage ? (selectedPackage.version.apps ?? []) : []
	);

	// The app list currently being displayed (whichever is active)
	const totalAppCount = $derived(appHits.length > 0 ? appHits.length : selectedPackageApps.length);
	const hasMoreApps = $derived(totalAppCount > appLimit);

	const hasResults = $derived(
		filteredPackages.length > 0 || appHits.length > 0 || selectedPackageApps.length > 0
	);

	const packageLabel = $derived(
		selectedPackage ? (selectedPackage.package.docs?.title ?? selectedPackage.package.name) : null
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
			packagesByName = new Map(packages.map((p) => [p.package.name, p]));
			refs = catalog.toolRefs();
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

	function handleSelectHit(hit: SearchHit) {
		const pkg = packagesByName.get(hit.package);
		if (pkg) onPackageSelected?.(pkg);
		onAppSelected?.(hit.name);
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
												class={cn(
													'mr-2 h-3.5 w-3.5 text-primary',
													!isSelected && 'text-transparent'
												)}
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

						{#if appHits.length > 0}
							<Command.Group heading="Apps">
								{#each appHits.slice(0, appLimit) as hit (hit.tool_id)}
									{@const pkg = packagesByName.get(hit.package)}
									{@const isSelected =
										selectedPackage?.package.name === hit.package && selectedApp === hit.name}
									<Command.Item
										value={hit.tool_id}
										onSelect={() => handleSelectHit(hit)}
										class="flex cursor-pointer items-center justify-between py-2"
									>
										<div class="flex min-w-0 flex-1 items-center">
											<Check
												class={cn(
													'mr-2 h-3.5 w-3.5 text-primary',
													!isSelected && 'text-transparent'
												)}
											/>
											<Terminal class="mr-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
											<span class="truncate font-mono text-sm">{hit.name}</span>
										</div>
										<span class="ml-2 shrink-0 text-xs text-muted-foreground">
											{pkg?.package.docs?.title ?? hit.package}
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
												class={cn(
													'mr-2 h-3.5 w-3.5 text-primary',
													!isSelected && 'text-transparent'
												)}
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
					{#if search.trim().length >= 2}
						<div
							class="flex items-center justify-between border-t border-border px-3 py-1.5 text-xs text-muted-foreground"
						>
							<span class="flex items-center gap-1.5">
								{#if semStatus === 'ready'}
									<Sparkles class="h-3 w-3 text-primary" />
									Semantic ranking
								{:else if semStatus === 'pending'}
									<LoaderCircle class="h-3 w-3 animate-spin" />
									Warming semantic search…
								{:else}
									Lexical ranking
								{/if}
							</span>
							<button
								type="button"
								onclick={() => semanticSearch.cycle()}
								title="Toggle smarter (semantic) search. Auto enables it on capable devices; first use downloads a ~23MB model, cached after."
								class="rounded px-1.5 py-0.5 font-medium hover:bg-muted hover:text-foreground"
							>
								{semanticSearch.mode === 'auto'
									? 'Auto'
									: semanticSearch.mode === 'on'
										? 'On'
										: 'Off'}
							</button>
						</div>
					{/if}
				</Command.Root>
			</Popover.Content>
		</Popover.Root>
	{/if}
</div>

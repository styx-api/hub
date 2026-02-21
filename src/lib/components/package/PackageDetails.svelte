<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import {
		ExternalLink,
		User,
		Globe,
		Container,
		Copy,
		Check,
		Terminal,
		Github,
		Search,
		BookOpen,
		Building2,
		ChevronDown,
		ChevronUp,
		Tag
	} from '@lucide/svelte';
	import { copyToClipboard } from '$lib/utils/clipboard';
	import { toast } from 'svelte-sonner';
	import { type PackageInfo } from '$lib/services/catalog';
	import PackageIcon from './PackageIcon.svelte';
	import { github } from '$lib/utils/github';

	interface Props {
		package: PackageInfo;
		showBorder?: boolean;
		showAppSelector?: boolean;
		onAppSelected?: (appName: string) => void;
	}
	let { package: pkg, showBorder = true, showAppSelector = true, onAppSelected }: Props = $props();

	let copied = $state(false);
	let searchQuery = $state('');
	let refsExpanded = $state(false);
	let visibleCount = $state(0);

	const INITIAL_COUNT = 20;
	const INCREMENT = 40;

	const apps = $derived(pkg.version.apps ?? []);
	const packageGithubUrl = $derived(github.package(pkg.package.name));
	const literature = $derived(pkg.package.docs?.literature ?? []);
	const urls = $derived(pkg.package.docs?.urls ?? []);
	const authors = $derived(pkg.package.docs?.authors ?? []);
	const affiliation = $derived(pkg.package.docs?.affiliation ?? []);

	function urlLabel(url: string): string {
		try {
			const parsed = new URL(url);
			const hostname = parsed.hostname.replace(/^www\./, '');
			if (hostname.includes('github')) return 'GitHub';
			if (hostname.includes('wiki') || parsed.pathname.includes('wiki')) return 'Wiki';
			if (hostname.includes('readthedocs')) return 'Docs';
			// Extract meaningful domain part (handle .co.uk, .ac.uk, etc.)
			const parts = hostname.split('.');
			const tld = parts.slice(-1)[0];
			if (tld === 'uk' || tld === 'jp' || tld === 'au') {
				return parts.slice(0, -2).pop() ?? hostname;
			}
			return parts.slice(-2, -1)[0] ?? hostname;
		} catch {
			return 'Docs';
		}
	}

	const needsSearch = $derived(apps.length > INITIAL_COUNT);
	const isSearching = $derived(searchQuery.trim().length > 0);
	const filteredApps = $derived(
		isSearching ? apps.filter((app) => app.toLowerCase().includes(searchQuery.toLowerCase())) : apps
	);
	const displayedApps = $derived(
		isSearching || !needsSearch ? filteredApps : filteredApps.slice(0, visibleCount)
	);
	const hasMore = $derived(!isSearching && needsSearch && visibleCount < filteredApps.length);

	// Reset when package changes
	$effect(() => {
		void pkg.package.name;
		visibleCount = INITIAL_COUNT;
		searchQuery = '';
	});

	async function copyContainer() {
		const container = pkg.version.container;
		if (!container) return;

		try {
			await copyToClipboard(container);
			copied = true;
			toast.success('Copied to clipboard');
			setTimeout(() => (copied = false), 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
			toast.error('Failed to copy to clipboard');
		}
	}

	function selectApp(app: string) {
		onAppSelected?.(app);
	}
</script>

<div class="mx-auto w-full max-w-5xl space-y-6">
	<!-- Hero -->
	<div class="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
		<PackageIcon package={pkg} size="xl" class="shrink-0 shadow-lg" />

		<div class="min-w-0 flex-1 space-y-3">
			<div class="space-y-2">
				<h2 class="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
					{pkg.package.docs?.title ?? pkg.package.name}
				</h2>
				<div class="flex flex-wrap items-center gap-2">
					<Badge variant="secondary" class="font-mono text-xs">
						<Tag class="mr-1 h-3 w-3" />
						v{pkg.version.name}
					</Badge>
					<span class="font-mono text-xs text-muted-foreground">{pkg.package.name}</span>

					<span class="hidden items-center gap-1.5 sm:flex">
						<span class="text-border">|</span>
						{#each urls as url}
							<a
								href={url}
								target="_blank"
								rel="noopener noreferrer"
								class="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
							>
								<Globe class="h-3 w-3" />
								{urlLabel(url)}
								<ExternalLink class="h-2.5 w-2.5 opacity-50" />
							</a>
						{/each}
						<a
							href={packageGithubUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
						>
							<Github class="h-3 w-3" />
							Source
						</a>
					</span>
				</div>

				<!-- Mobile-only links -->
				<div class="flex flex-wrap items-center gap-2 sm:hidden">
					{#each urls as url}
						<a
							href={url}
							target="_blank"
							rel="noopener noreferrer"
							class="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
						>
							<Globe class="h-3 w-3" />
							{urlLabel(url)}
						</a>
					{/each}
					<a
						href={packageGithubUrl}
						target="_blank"
						rel="noopener noreferrer"
						class="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
					>
						<Github class="h-3 w-3" />
						Source
					</a>
				</div>
			</div>

			{#if pkg.package.docs?.description}
				<div class="space-y-2">
					{#each pkg.package.docs.description.split('\n').filter((line) => line.trim()) as line}
						<p class="max-w-prose text-sm leading-relaxed text-muted-foreground">{line}</p>
					{/each}
				</div>
			{/if}

			<!-- Metadata pills -->
			<div class="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
				{#if authors.length}
					<div class="flex items-center gap-1.5">
						<User class="h-3.5 w-3.5 shrink-0" />
						<span class="truncate">{authors.join(', ')}</span>
					</div>
				{/if}

				{#if affiliation.length}
					<div class="flex items-center gap-1.5">
						<Building2 class="h-3.5 w-3.5 shrink-0" />
						<span class="truncate">{affiliation.join(', ')}</span>
					</div>
				{/if}

				{#if pkg.version.container}
					<button
						onclick={copyContainer}
						class="flex cursor-pointer items-center gap-1.5 rounded-md transition-colors hover:text-foreground"
						title="Click to copy"
					>
						<Container class="h-3.5 w-3.5 shrink-0" />
						<code class="font-mono text-xs">{pkg.version.container}</code>
						{#if copied}
							<Check class="h-3 w-3 text-green-600" />
						{:else}
							<Copy class="h-3 w-3 opacity-40" />
						{/if}
					</button>
				{/if}

				<div class="flex items-center gap-1.5">
					<Terminal class="h-3.5 w-3.5 shrink-0" />
					<span><strong class="text-foreground">{apps.length}</strong> apps</span>
				</div>
			</div>
		</div>
	</div>

	<!-- References -->
	{#if literature.length > 0}
		<div class="rounded-lg border border-border/50 bg-muted/30">
			<button
				onclick={() => (refsExpanded = !refsExpanded)}
				class="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
			>
				<div class="flex items-center gap-2">
					<BookOpen class="h-4 w-4 text-muted-foreground" />
					<span>References</span>
					<Badge variant="secondary" class="text-[10px]">{literature.length}</Badge>
				</div>
				{#if refsExpanded}
					<ChevronUp class="h-4 w-4 text-muted-foreground" />
				{:else}
					<ChevronDown class="h-4 w-4 text-muted-foreground" />
				{/if}
			</button>
			{#if refsExpanded}
				<div class="space-y-2 border-t border-border/50 px-4 py-3">
					{#each literature as ref}
						<p class="text-xs leading-relaxed text-muted-foreground">{ref}</p>
					{/each}
				</div>
			{/if}
		</div>
	{/if}

	<!-- Apps -->
	{#if showAppSelector && apps.length > 0}
		<div class="space-y-3">
			{#if needsSearch}
				<div class="relative">
					<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						type="text"
						placeholder="Search {apps.length} applications..."
						class="h-10 pl-10 text-sm"
						bind:value={searchQuery}
					/>
				</div>
			{/if}

			{#if isSearching && filteredApps.length === 0}
				<p class="py-6 text-center text-sm text-muted-foreground">
					No applications matching "{searchQuery}"
				</p>
			{:else}
				<div class="space-y-0.5">
					{#each displayedApps as app (app)}
						<button
							onclick={() => selectApp(app)}
							class="group flex w-full cursor-pointer items-center gap-2.5 rounded-md px-3 py-1.5 text-left transition-colors hover:bg-muted/60"
						>
							<Terminal
								class="h-3.5 w-3.5 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-primary"
							/>
							<span class="font-mono text-sm text-foreground">{app}</span>
						</button>
					{/each}
				</div>

				{#if needsSearch}
					<div class="flex flex-col items-center gap-2 pt-2">
						{#if hasMore}
							<Button
								variant="outline"
								size="sm"
								class="text-xs"
								onclick={() => (visibleCount += INCREMENT)}
							>
								Show more
							</Button>
						{/if}
						<p class="text-xs text-muted-foreground">
							{#if isSearching}
								{filteredApps.length} of {apps.length} apps
							{:else if hasMore}
								Showing {displayedApps.length} of {apps.length}
							{/if}
						</p>
					</div>
				{/if}
			{/if}
		</div>
	{/if}

	{#if showBorder}
		<div class="border-b border-border/30"></div>
	{/if}
</div>

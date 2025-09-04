<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import * as Command from '$lib/components/ui/command/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import CheckIcon from '@lucide/svelte/icons/check';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import {
		Loader2,
		Package as PackageIcon,
		Terminal,
		ArrowRight,
		AlertCircle,
		RefreshCw
	} from '@lucide/svelte/icons';
	import { cn } from '$lib/utils.js';
	import { getPackages, getApps, type App, type Package } from '$lib/services/packages.svelte';

	// Props
	interface Props {
		package?: Package | null;
		app?: App | null;
		showAppCounts?: boolean;
		compact?: boolean;
	}

	let {
		package: selectedPackage = $bindable(null),
		app: selectedApp = $bindable(null),
		showAppCounts: showAppCounts = true,
		compact = false
	}: Props = $props();

	let packages: Package[] = $state([]);
	let apps: App[] = $state([]);
	let loading = $state(true);
	let error = $state('');
	let packagePopoverOpen = $state(false);
	let appPopoverOpen = $state(false);
	let packageTriggerRef = $state<HTMLButtonElement | null>(null);
	let appTriggerRef = $state<HTMLButtonElement | null>(null);

	const hasPackage = $derived(!!selectedPackage);
	const hasApp = $derived(!!selectedApp);

	$effect(() => {
		if (!selectedPackage) return;
		getApps(selectedPackage.name).then((response) => {
			apps = response ?? [];
		});
	});

	// clear app when package changes.
	// looks really odd but works
	$effect(() => {
		selectedPackage;
		selectedApp = null;
	});

	async function loadPackages() {
		try {
			loading = true;
			packages = (await getPackages()) ?? [];
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to load packages';
			error = errorMessage;
		} finally {
			loading = false;
		}
	}

	onMount(loadPackages);

	// Helper functions
	function closePackagePopover() {
		packagePopoverOpen = false;
		tick().then(() => packageTriggerRef?.focus());
	}

	function closeAppPopover() {
		appPopoverOpen = false;
		tick().then(() => appTriggerRef?.focus());
	}

	function selectPackage(packageName: string) {
		const pkg = packages.find((p) => p.name === packageName);
		selectedPackage = pkg || null;
		closePackagePopover();
	}

	function selectApp(app: App) {
		selectedApp = app;
		closeAppPopover();
	}
</script>

<div class="w-full space-y-4">
	{#if loading}
		<div class="flex items-center justify-center py-6">
			<div class="flex items-center space-x-3">
				<Loader2 class="h-5 w-5 animate-spin text-primary" />
				<div class="text-sm text-muted-foreground">Loading packages...</div>
			</div>
		</div>
	{:else if error}
		<Alert variant="destructive">
			<AlertCircle class="h-4 w-4" />
			<AlertDescription class="flex items-center justify-between">
				<span>{error}</span>
				<Button variant="outline" size="sm" onclick={loadPackages} class="ml-4 shrink-0">
					<RefreshCw class="mr-1 h-3 w-3" />
					Retry
				</Button>
			</AlertDescription>
		</Alert>
	{:else}
		<!-- Selection Interface -->
		<div class="flex items-center gap-3">
			<!-- Package Selection -->
			<div class="min-w-0 flex-1">
				<Popover.Root bind:open={packagePopoverOpen}>
					<Popover.Trigger bind:ref={packageTriggerRef}>
						{#snippet child({ props })}
							<Button
								{...props}
								variant="outline"
								size={compact ? 'sm' : 'default'}
								class={cn(
									'w-full justify-between text-left font-normal transition-all',
									compact ? 'h-8' : 'h-10',
									hasPackage && 'border-primary/50 bg-primary/5'
								)}
								role="combobox"
								aria-expanded={packagePopoverOpen}
								aria-label="Select package"
							>
								<div class="flex min-w-0 items-center">
									<PackageIcon class={cn('mr-2 flex-shrink-0', compact ? 'h-3 w-3' : 'h-4 w-4')} />
									<span class={cn('truncate', compact ? 'text-sm' : 'text-base')}>
										{selectedPackage?.name || 'Choose a package...'}
									</span>
								</div>
								<ChevronsUpDownIcon
									class={cn('ml-2 flex-shrink-0 opacity-50', compact ? 'h-3 w-3' : 'h-4 w-4')}
								/>
							</Button>
						{/snippet}
					</Popover.Trigger>
					<Popover.Content class="w-96 p-0" align="start">
						<Command.Root>
							<Command.Input placeholder="Search packages..." class="h-9" />
							<Command.List class="max-h-64">
								<Command.Empty>No packages found.</Command.Empty>
								<Command.Group>
									{#each packages as pkg (pkg.name)}
										<Command.Item
											value={pkg.name}
											onSelect={() => selectPackage(pkg.name)}
											class="flex cursor-pointer items-center justify-between py-3"
										>
											<div class="flex min-w-0 flex-1 items-center">
												<CheckIcon
													class={cn(
														'mr-3 h-4 w-4 text-primary',
														selectedPackage?.name !== pkg.name && 'text-transparent'
													)}
												/>
												<div class="min-w-0 flex-1 space-y-1">
													<div class="flex items-center gap-2">
														<span class="truncate text-sm font-medium">{pkg.docs.title}</span>
														<Badge variant="outline" class="h-4 px-1.5 text-xs">
															v{pkg.version}
														</Badge>
													</div>
													<div class="truncate text-xs text-muted-foreground">
														{pkg.docs.authors?.join(', ')}
													</div>
												</div>
											</div>
											{#if showAppCounts}
												<div class="ml-3 flex flex-shrink-0 items-center">
													<Badge variant="secondary" class="h-5 px-2 text-xs">
														{pkg.appCount} app{pkg.appCount !== 1 ? 's' : ''}
													</Badge>
												</div>
											{/if}
										</Command.Item>
									{/each}
								</Command.Group>
							</Command.List>
						</Command.Root>
					</Popover.Content>
				</Popover.Root>
			</div>

			<!-- Arrow indicator -->
			<div class="flex-shrink-0 text-muted-foreground">
				<ArrowRight class={cn(compact ? 'h-3 w-3' : 'h-4 w-4')} />
			</div>

			<!-- App Selection -->
			<div class="min-w-0 flex-1">
				<Popover.Root bind:open={appPopoverOpen}>
					<Popover.Trigger bind:ref={appTriggerRef}>
						{#snippet child({ props })}
							<Button
								{...props}
								variant="outline"
								size={compact ? 'sm' : 'default'}
								class={cn(
									'w-full justify-between text-left font-normal transition-all',
									compact ? 'h-8' : 'h-10',
									!selectedPackage && 'opacity-50',
									hasApp && 'border-primary/50 bg-primary/5',
									selectedPackage &&
										apps.length === 0 &&
										'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950'
								)}
								role="combobox"
								aria-expanded={appPopoverOpen}
								aria-label="Select app"
								disabled={!selectedPackage}
							>
								<div class="flex min-w-0 items-center">
									<Terminal class={cn('mr-2 flex-shrink-0', compact ? 'h-3 w-3' : 'h-4 w-4')} />
									<span
										class={cn(
											'truncate',
											compact ? 'text-sm' : 'text-base',
											selectedApp ? 'font-mono' : ''
										)}
									>
										{!selectedPackage
											? 'Select package first'
											: apps.length === 0
												? 'No apps available'
												: selectedApp?.name || 'Choose an app...'}
									</span>
								</div>
								<ChevronsUpDownIcon
									class={cn('ml-2 flex-shrink-0 opacity-50', compact ? 'h-3 w-3' : 'h-4 w-4')}
								/>
							</Button>
						{/snippet}
					</Popover.Trigger>
					<Popover.Content class="w-80 p-0" align="start">
						<Command.Root>
							<Command.Input placeholder="Search apps..." class="h-9" />
							<Command.List class="max-h-48">
								<Command.Empty>No apps found.</Command.Empty>
								<Command.Group>
									{#each apps as app (app.id)}
										<Command.Item
											value={app.id}
											onSelect={() => selectApp(app)}
											class="flex cursor-pointer items-center py-2"
										>
											<CheckIcon
												class={cn(
													'mr-3 h-4 w-4 text-primary',
													selectedApp?.id !== app.id && 'text-transparent'
												)}
											/>
											<div class="flex-1">
												<div class="truncate font-mono text-sm font-medium">{app.name}</div>
											</div>
										</Command.Item>
									{/each}
								</Command.Group>
							</Command.List>
						</Command.Root>
					</Popover.Content>
				</Popover.Root>
			</div>
		</div>
	{/if}
</div>

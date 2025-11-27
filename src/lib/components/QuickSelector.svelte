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
		Package as PackageIcon,
		Terminal,
		ArrowRight,
		CircleAlert,
		RefreshCw
	} from '@lucide/svelte/icons';
	import { cn } from '$lib/utils.js';
	import { catalog, type PackageInfo } from '$lib/services/packages.svelte';

	interface Props {
		package?: PackageInfo | null;
		app?: string | null;
		showAppCounts?: boolean;
		compact?: boolean;
	}

	let {
		package: selectedPackage = $bindable(null),
		app: selectedApp = $bindable(null),
		showAppCounts = true,
		compact = false
	}: Props = $props();

	let packages: PackageInfo[] = $state([]);
	let error: string | null = $state(null);
	let packagePopoverOpen = $state(false);
	let appPopoverOpen = $state(false);
	let packageTriggerRef = $state<HTMLButtonElement | null>(null);
	let appTriggerRef = $state<HTMLButtonElement | null>(null);

	const apps = $derived(selectedPackage?.version.apps ?? []);
	const iconSize = $derived(compact ? 'h-3 w-3' : 'h-4 w-4');
	const textSize = $derived(compact ? 'text-sm' : 'text-base');
	const buttonHeight = $derived(compact ? 'h-8' : 'h-10');

	// Load packages on init
	loadPackages();

	// Clear app when package changes
	let prevPackageName: string | undefined;
	$effect(() => {
		const currentName = selectedPackage?.package.name;
		if (prevPackageName !== undefined && prevPackageName !== currentName) {
			selectedApp = null;
		}
		prevPackageName = currentName;
	});

	async function loadPackages() {
		try {
			error = null;
			const idx = await catalog.load();
			packages = [...idx.packages.values()];
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load packages';
		}
	}

	function selectPackage(packageName: string) {
		selectedPackage = packages.find((p) => p.package.name === packageName) ?? null;
		packagePopoverOpen = false;
		tick().then(() => packageTriggerRef?.focus());
	}

	function selectApp(app: string) {
		selectedApp = app;
		appPopoverOpen = false;
		tick().then(() => appTriggerRef?.focus());
	}
</script>

{#snippet appCount(count: number)}
	<Badge variant="secondary" class="h-5 px-2 text-xs">
		{count} app{count !== 1 ? 's' : ''}
	</Badge>
{/snippet}

<div class="w-full space-y-4">
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
		<div class="flex items-center gap-3">
			<!-- Package selector -->
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
									buttonHeight,
									selectedPackage && 'border-primary/50 bg-primary/5'
								)}
								role="combobox"
								aria-expanded={packagePopoverOpen}
								aria-label="Select package"
							>
								<div class="flex min-w-0 items-center">
									<PackageIcon class={cn('mr-2 flex-shrink-0', iconSize)} />
									<span class={cn('truncate', textSize)}>
										{selectedPackage?.package.docs?.title ?? 'Choose a package...'}
									</span>
								</div>
								<ChevronsUpDown class={cn('ml-2 flex-shrink-0 opacity-50', iconSize)} />
							</Button>
						{/snippet}
					</Popover.Trigger>
					<Popover.Content class="w-96 p-0" align="start">
						<Command.Root>
							<Command.Input placeholder="Search packages..." class="h-9" />
							<Command.List class="max-h-64">
								<Command.Empty>No packages found.</Command.Empty>
								<Command.Group>
									{#each packages as pkg (pkg.package.name)}
										{@const isSelected = selectedPackage?.package.name === pkg.package.name}
										{@const appCountNum = pkg.version.apps?.length ?? 0}
										<Command.Item
											value={pkg.package.docs?.title ?? pkg.package.name}
											onSelect={() => selectPackage(pkg.package.name)}
											class="flex cursor-pointer items-center justify-between py-3"
										>
											<div class="flex min-w-0 flex-1 items-center">
												<Check
													class={cn('mr-3 h-4 w-4 text-primary', !isSelected && 'text-transparent')}
												/>
												<div class="min-w-0 flex-1 space-y-1">
													<div class="flex items-center gap-2">
														<span class="truncate text-sm font-medium">
															{pkg.package.docs?.title}
														</span>
														<Badge variant="outline" class="h-4 px-1.5 text-xs">
															v{pkg.version.name}
														</Badge>
													</div>
													<div class="truncate text-xs text-muted-foreground">
														{pkg.package.docs?.authors?.join(', ')}
													</div>
												</div>
											</div>
											{#if showAppCounts}
												<div class="ml-3 flex-shrink-0">
													{@render appCount(appCountNum)}
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

			<ArrowRight class={cn('flex-shrink-0 text-muted-foreground', iconSize)} />

			<!-- App selector -->
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
									buttonHeight,
									!selectedPackage && 'opacity-50',
									selectedApp && 'border-primary/50 bg-primary/5',
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
									<Terminal class={cn('mr-2 flex-shrink-0', iconSize)} />
									<span class={cn('truncate', textSize, selectedApp && 'font-mono')}>
										{#if !selectedPackage}
											Select package first
										{:else if apps.length === 0}
											No apps available
										{:else}
											{selectedApp ?? 'Choose an app...'}
										{/if}
									</span>
								</div>
								<ChevronsUpDown class={cn('ml-2 flex-shrink-0 opacity-50', iconSize)} />
							</Button>
						{/snippet}
					</Popover.Trigger>
					<Popover.Content class="w-80 p-0" align="start">
						<Command.Root>
							<Command.Input placeholder="Search apps..." class="h-9" />
							<Command.List class="max-h-48">
								<Command.Empty>No apps found.</Command.Empty>
								<Command.Group>
									{#each apps as app (app)}
										<Command.Item
											value={app}
											onSelect={() => selectApp(app)}
											class="flex cursor-pointer items-center py-2"
										>
											<Check
												class={cn('mr-3 h-4 w-4 text-primary', selectedApp !== app && 'text-transparent')}
											/>
											<span class="truncate font-mono text-sm font-medium">{app}</span>
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
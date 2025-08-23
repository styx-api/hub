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
		Package,
		Terminal,
		ArrowRight,
		AlertCircle,
		RefreshCw
	} from '@lucide/svelte/icons';
	import { cn } from '$lib/utils.js';
	import { getAllPackages, type PackageInfo, type Endpoint } from '$lib/services/packages';

	// Props
	interface Props {
		package?: PackageInfo | null;
		app?: Endpoint | null;
		showEndpointCounts?: boolean;
		compact?: boolean;
	}

	let {
		package: selectedPackage = $bindable(null),
		app: selectedApp = $bindable(null),
		showEndpointCounts = true,
		compact = false
	}: Props = $props();

	// Simple internal state
	let packages: PackageInfo[] = $state([]);
	let loading = $state(true);
	let error = $state('');
	let packagePopoverOpen = $state(false);
	let appPopoverOpen = $state(false);
	let packageTriggerRef = $state<HTMLButtonElement | null>(null);
	let appTriggerRef = $state<HTMLButtonElement | null>(null);
	let retryCount = $state(0);

	// Simple computed values
	const availableEndpoints = $derived(
		selectedPackage?.api.endpoints.filter((e) => e.status === 'done') || []
	);
	const hasPackage = $derived(!!selectedPackage);
	const hasApp = $derived(!!selectedApp);

	// Clear app when package changes
	$effect(() => {
		if (selectedPackage) {
			// If current app doesn't belong to selected package, clear it
			if (selectedApp && !availableEndpoints.some((e) => e.target === selectedApp?.target)) {
				selectedApp = null;
			}
		} else {
			selectedApp = null;
		}
	});

	// Load packages with retry logic
	async function loadPackages() {
		try {
			loading = true;
			error = '';

			const result = await getAllPackages();

			// Process packages - filter endpoints and sort
			const processedPackages = result.packages.map((pkg) => ({
				...pkg,
				api: {
					...pkg.api,
					endpoints: pkg.api.endpoints
						.filter((endpoint) => endpoint.status === 'done')
						.sort((a, b) => a.target.localeCompare(b.target))
				}
			}));

			// Only keep packages with available endpoints
			packages = processedPackages.filter((pkg) => pkg.api.endpoints.length > 0);

			if (result.errors.length > 0) {
				console.warn('Some packages failed to load:', result.errors);
			}

			if (packages.length === 0) {
				error = 'No packages with available apps found';
			}

			retryCount = 0;
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to load packages';

			if (retryCount < 3) {
				setTimeout(
					() => {
						retryCount++;
						loadPackages();
					},
					1000 * Math.pow(2, retryCount)
				);
			} else {
				error = errorMessage;
			}
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadPackages();
	});

	// Helper functions
	function closePackagePopover() {
		packagePopoverOpen = false;
		tick().then(() => packageTriggerRef?.focus());
	}

	function closeAppPopover() {
		appPopoverOpen = false;
		tick().then(() => appTriggerRef?.focus());
	}

	function selectPackage(packageId: string) {
		const pkg = packages.find((p) => p.id === packageId);
		selectedPackage = pkg || null;
		closePackagePopover();
	}

	function selectApp(endpoint: Endpoint) {
		selectedApp = endpoint;
		closeAppPopover();
	}

	function handleRetry() {
		retryCount = 0;
		loadPackages();
	}
</script>

<div class="w-full space-y-4">
	{#if loading}
		<div class="flex items-center justify-center py-6">
			<div class="flex items-center space-x-3">
				<Loader2 class="h-5 w-5 animate-spin text-primary" />
				<div class="text-sm text-muted-foreground">
					Loading packages...
					{#if retryCount > 0}
						<span class="block text-xs">Retry attempt {retryCount}/3</span>
					{/if}
				</div>
			</div>
		</div>
	{:else if error}
		<Alert variant="destructive">
			<AlertCircle class="h-4 w-4" />
			<AlertDescription class="flex items-center justify-between">
				<span>{error}</span>
				<Button variant="outline" size="sm" onclick={handleRetry} class="ml-4 shrink-0">
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
									<Package class={cn('mr-2 flex-shrink-0', compact ? 'h-3 w-3' : 'h-4 w-4')} />
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
									{#each packages as pkg (pkg.id)}
										<Command.Item
											value={`${pkg.name} ${pkg.author} ${pkg.approach} ${pkg.description}`}
											onSelect={() => selectPackage(pkg.id)}
											class="flex cursor-pointer items-center justify-between py-3"
										>
											<div class="flex min-w-0 flex-1 items-center">
												<CheckIcon
													class={cn(
														'mr-3 h-4 w-4 text-primary',
														selectedPackage?.id !== pkg.id && 'text-transparent'
													)}
												/>
												<div class="min-w-0 flex-1 space-y-1">
													<div class="flex items-center gap-2">
														<span class="truncate text-sm font-medium">{pkg.name}</span>
														<Badge variant="outline" class="h-4 px-1.5 text-xs">
															v{pkg.version}
														</Badge>
													</div>
													<div class="truncate text-xs text-muted-foreground">
														{pkg.author}
													</div>
												</div>
											</div>
											{#if showEndpointCounts}
												<div class="ml-3 flex flex-shrink-0 items-center">
													<Badge variant="secondary" class="h-5 px-2 text-xs">
														{pkg.api.endpoints.length} app{pkg.api.endpoints.length !== 1
															? 's'
															: ''}
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
										availableEndpoints.length === 0 &&
										'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950'
								)}
								role="combobox"
								aria-expanded={appPopoverOpen}
								aria-label="Select app"
								disabled={!selectedPackage}
							>
								<div class="flex min-w-0 items-center">
									<Terminal class={cn('mr-2 flex-shrink-0', compact ? 'h-3 w-3' : 'h-4 w-4')} />
									<span class={cn('truncate', compact ? 'text-sm' : 'text-base')}>
										{!selectedPackage
											? 'Select package first'
											: availableEndpoints.length === 0
												? 'No apps available'
												: selectedApp?.target || 'Choose an app...'}
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
									{#each availableEndpoints as endpoint (endpoint.target)}
										<Command.Item
											value={endpoint.target}
											onSelect={() => selectApp(endpoint)}
											class="flex cursor-pointer items-center py-2"
										>
											<CheckIcon
												class={cn(
													'mr-3 h-4 w-4 text-primary',
													selectedApp?.target !== endpoint.target && 'text-transparent'
												)}
											/>
											<div class="flex-1">
												<div class="truncate text-sm font-medium">{endpoint.target}</div>
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

		<!-- Selection Status -->
		{#if selectedPackage && availableEndpoints.length === 0}
			<Alert>
				<AlertCircle class="h-4 w-4" />
				<AlertDescription>
					This package has no available apps. Try selecting a different package.
				</AlertDescription>
			</Alert>
		{/if}
	{/if}
</div>

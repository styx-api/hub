<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import * as Command from '$lib/components/ui/command/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import CheckIcon from '@lucide/svelte/icons/check';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import { Loader2, Package, Terminal, ArrowRight, AlertCircle, RefreshCw } from '@lucide/svelte/icons';
	import { cn } from '$lib/utils.js';
	import { getAllPackages, type PackageInfo, type Endpoint } from '$lib/services/packages';

	// Props
	interface Props {
		onAppSelected?: (packageInfo: PackageInfo, endpoint: Endpoint) => void;
		onPackageSelected?: (packageInfo: PackageInfo) => void;
		selectedPackage?: PackageInfo | null;
		autoFocusApp?: boolean;
		showEndpointCounts?: boolean;
		compact?: boolean;
	}

	let {
		onAppSelected = () => {},
		onPackageSelected = () => {},
		selectedPackage = null,
		autoFocusApp = true,
		showEndpointCounts = true,
		compact = false
	}: Props = $props();

	// State
	let packages: PackageInfo[] = $state([]);
	let loading = $state(true);
	let error = $state('');
	let selectedApp = $state('');
	let packagePopoverOpen = $state(false);
	let appPopoverOpen = $state(false);
	let packageTriggerRef = $state<HTMLButtonElement | null>(null);
	let appTriggerRef = $state<HTMLButtonElement | null>(null);
	let retryCount = $state(0);

	// Computed values
	const selectedPackageId = $derived(selectedPackage?.id || '');
	const availableEndpoints = $derived(selectedPackage?.api.endpoints || []);
	const selectedEndpoint = $derived(
		availableEndpoints.find((endpoint) => endpoint.target === selectedApp) || null
	);
	const hasSelection = $derived(!!selectedPackage);
	const hasAppSelection = $derived(!!selectedEndpoint);

	// Display values with better fallbacks
	const selectedPackageName = $derived(() => {
		if (!selectedPackage) return 'Choose a package...';
		return selectedPackage.name;
	});

	const selectedAppName = $derived(() => {
		if (!selectedPackage) return 'Select package first';
		if (!selectedApp) return availableEndpoints.length > 0 ? 'Choose an app...' : 'No apps available';
		return selectedApp;
	});

	// Auto-focus app selector when package is selected (only once per selection)
	let hasAutoFocused = $state(false);
	
	$effect(() => {
		if (selectedPackageId && autoFocusApp && appTriggerRef && !hasAutoFocused) {
			hasAutoFocused = true;
			tick().then(() => {
				setTimeout(() => {
					appTriggerRef?.focus();
				}, 200);
			});
		}
		
		// Reset flag when package changes or is cleared
		if (!selectedPackageId) {
			hasAutoFocused = false;
		}
	});

	// Reset app when package changes
	$effect(() => {
		if (selectedPackage) {
			selectedApp = '';
			hasAutoFocused = false;
		}
	});

	// Emit selection events
	$effect(() => {
		if (selectedPackage && selectedEndpoint) {
			onAppSelected(selectedPackage, selectedEndpoint);
		} else if (selectedPackage && !selectedApp) {
			onPackageSelected(selectedPackage);
		}
	});

	// Load packages with retry logic
	async function loadPackages() {
		try {
			loading = true;
			error = '';
			
			const result = await getAllPackages();

			// Filter and sort endpoints
			const processedPackages = result.packages.map((pkg) => ({
				...pkg,
				api: {
					...pkg.api,
					endpoints: pkg.api.endpoints
						.filter((endpoint) => endpoint.status === 'done')
						.sort((a, b) => a.target.localeCompare(b.target))
				}
			}));

			// Filter out packages with no available endpoints
			packages = processedPackages.filter(pkg => pkg.api.endpoints.length > 0);

			if (result.errors.length > 0) {
				console.warn('Some packages failed to load:', result.errors);
			}

			if (packages.length === 0) {
				error = 'No packages with available apps found';
			}

			retryCount = 0;
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to load packages';
			
			// Retry logic with exponential backoff
			if (retryCount < 3) {
				setTimeout(() => {
					retryCount++;
					loadPackages();
				}, 1000 * Math.pow(2, retryCount));
			} else {
				error = errorMessage;
			}
		} finally {
			loading = false;
		}
	}

	// Load packages on mount
	onMount(() => {
		loadPackages();
	});

	// Helper functions
	function closeAndFocusPackageTrigger() {
		packagePopoverOpen = false;
		tick().then(() => {
			packageTriggerRef?.focus();
		});
	}

	function closeAndFocusAppTrigger() {
		appPopoverOpen = false;
		tick().then(() => {
			appTriggerRef?.focus();
		});
	}

	function selectPackage(packageId: string) {
		const pkg = packages.find(p => p.id === packageId);
		if (pkg) {
			onPackageSelected(pkg);
		}
		closeAndFocusPackageTrigger();
	}

	function selectApp(app: string) {
		selectedApp = app;
		closeAndFocusAppTrigger();
	}

	function handleRetry() {
		retryCount = 0;
		loadPackages();
	}

	// Keyboard shortcuts
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Tab' && hasSelection && !hasAppSelection && availableEndpoints.length > 0) {
			event.preventDefault();
			appTriggerRef?.focus();
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="w-full space-y-4">
	{#if loading}
		<div class="flex items-center justify-center py-6">
			<div class="flex items-center space-x-3">
				<Loader2 class="h-5 w-5 animate-spin text-primary" />
				<div class="text-sm text-muted-foreground">
					Loading packages...
					{#if retryCount > 0}
						<span class="text-xs block">Retry attempt {retryCount}/3</span>
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
					<RefreshCw class="h-3 w-3 mr-1" />
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
								size={compact ? "sm" : "default"}
								class={cn(
									"w-full justify-between text-left font-normal transition-all",
									compact ? "h-8" : "h-10",
									hasSelection && "border-primary/50 bg-primary/5"
								)}
								role="combobox"
								aria-expanded={packagePopoverOpen}
								aria-label="Select package"
							>
								<div class="flex min-w-0 items-center">
									<Package class={cn("mr-2 flex-shrink-0", compact ? "h-3 w-3" : "h-4 w-4")} />
									<span class={cn("truncate", compact ? "text-sm" : "text-base")}>
										{selectedPackageName()}
									</span>
								</div>
								<ChevronsUpDownIcon class={cn("ml-2 flex-shrink-0 opacity-50", compact ? "h-3 w-3" : "h-4 w-4")} />
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
											class="flex items-center justify-between py-3 cursor-pointer"
										>
											<div class="flex min-w-0 flex-1 items-center">
												<CheckIcon
													class={cn(
														'mr-3 h-4 w-4 text-primary',
														selectedPackageId !== pkg.id && 'text-transparent'
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
														{pkg.api.endpoints.length} app{pkg.api.endpoints.length !== 1 ? 's' : ''}
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
				<ArrowRight class={cn(compact ? "h-3 w-3" : "h-4 w-4")} />
			</div>

			<!-- App Selection -->
			<div class="min-w-0 flex-1">
				<Popover.Root bind:open={appPopoverOpen}>
					<Popover.Trigger bind:ref={appTriggerRef}>
						{#snippet child({ props })}
							<Button
								{...props}
								variant="outline"
								size={compact ? "sm" : "default"}
								class={cn(
									"w-full justify-between text-left font-normal transition-all",
									compact ? "h-8" : "h-10",
									!selectedPackage && "opacity-50",
									hasAppSelection && "border-primary/50 bg-primary/5",
									selectedPackage && availableEndpoints.length === 0 && "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950"
								)}
								role="combobox"
								aria-expanded={appPopoverOpen}
								aria-label="Select app"
								disabled={!selectedPackage}
							>
								<div class="flex min-w-0 items-center">
									<Terminal class={cn("mr-2 flex-shrink-0", compact ? "h-3 w-3" : "h-4 w-4")} />
									<span class={cn("truncate", compact ? "text-sm" : "text-base")}>
										{selectedAppName()}
									</span>
								</div>
								<ChevronsUpDownIcon class={cn("ml-2 flex-shrink-0 opacity-50", compact ? "h-3 w-3" : "h-4 w-4")} />
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
											onSelect={() => selectApp(endpoint.target)}
											class="flex items-center py-2 cursor-pointer"
										>
											<CheckIcon
												class={cn(
													'mr-3 h-4 w-4 text-primary',
													selectedApp !== endpoint.target && 'text-transparent'
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
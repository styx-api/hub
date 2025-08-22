<!-- PackageInfoCard.svelte -->
<script lang="ts">
	import { tick } from 'svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Command from '$lib/components/ui/command/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import {
		ExternalLink,
		Package,
		User,
		Globe,
		Container,
		Activity,
		Copy,
		Check,
		Terminal,
		ChevronDown,
		ArrowRight
	} from '@lucide/svelte';
	import { cn } from '$lib/utils.js';
	import type { PackageInfo, Endpoint } from '$lib/services/packages';

	interface Props {
		packageInfo: PackageInfo;
		compact?: boolean;
		showBorder?: boolean;
		onAppSelected?: (endpoint: Endpoint) => void;
		showAppSelector?: boolean;
	}

	let {
		packageInfo,
		compact = false,
		showBorder = true,
		onAppSelected = () => {},
		showAppSelector = true
	}: Props = $props();

	let copied = $state(false);
	let selectedApp = $state('');
	let appPopoverOpen = $state(false);
	let appTriggerRef = $state<HTMLButtonElement | null>(null);

	// Computed values
	const availableEndpoints = $derived(packageInfo.api.endpoints || []);
	const selectedEndpoint = $derived(
		availableEndpoints.find((endpoint) => endpoint.target === selectedApp) || null
	);

	const selectedAppName = $derived(() => {
		if (!selectedApp)
			return availableEndpoints.length > 0
				? 'Choose an app to get started...'
				: 'No apps available';
		return selectedApp;
	});

	// Move color logic to utility functions
	const getStatusColor = (status: string) => {
		const colors = {
			experimental:
				'bg-amber-500/10 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
			'well tested':
				'bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
			deprecated:
				'bg-red-500/10 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
			beta: 'bg-blue-500/10 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20'
		};
		return (
			colors[status.toLowerCase()] ||
			'bg-slate-500/10 text-slate-600 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20'
		);
	};

	const getApproachColor = (approach: string) => {
		const colors = {
			manual:
				'bg-purple-500/10 text-purple-600 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20',
			automated:
				'bg-cyan-500/10 text-cyan-600 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/20'
		};
		return (
			colors[approach.toLowerCase()] ||
			'bg-slate-500/10 text-slate-600 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20'
		);
	};

	// Helper to get package icon/logo placeholder
	function getPackageIcon(packageName: string) {
		return packageName.charAt(0).toUpperCase();
	}

	// Helper to get package color scheme
	function getPackageColorClass(packageName: string) {
		const colors = [
			'from-blue-500 to-blue-600',
			'from-green-500 to-green-600',
			'from-purple-500 to-purple-600',
			'from-orange-500 to-orange-600',
			'from-pink-500 to-pink-600',
			'from-cyan-500 to-cyan-600',
			'from-indigo-500 to-indigo-600',
			'from-teal-500 to-teal-600',
			'from-red-500 to-red-600',
			'from-amber-500 to-amber-600'
		];

		let hash = 0;
		for (let i = 0; i < packageName.length; i++) {
			hash = packageName.charCodeAt(i) + ((hash << 5) - hash);
		}
		return colors[Math.abs(hash) % colors.length];
	}

	function openUrl(url: string) {
		window.open(url, '_blank');
	}

	async function copyContainer() {
		try {
			await navigator.clipboard.writeText(packageInfo.container);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	}

	function closeAndFocusAppTrigger() {
		appPopoverOpen = false;
		tick().then(() => {
			appTriggerRef?.focus();
		});
	}

	function selectApp(app: string) {
		selectedApp = app;
		const endpoint = availableEndpoints.find((e) => e.target === app);
		if (endpoint) {
			onAppSelected(endpoint);
		}
		closeAndFocusAppTrigger();
	}

	// Emit selection when app changes
	$effect(() => {
		if (selectedEndpoint) {
			onAppSelected(selectedEndpoint);
		}
	});
</script>

<div class="mx-auto w-full max-w-5xl space-y-8">
	<!-- Enhanced Header -->
	<div
		class="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card/50 to-muted/30 p-8"
	>
		<!-- Decorative background elements -->
		<div
			class="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-gradient-to-br {getPackageColorClass(
				packageInfo.name
			)} opacity-10"
		></div>
		<div
			class="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 opacity-20"
		></div>

		<div class="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
			<div class="space-y-4">
				<!-- Package icon and basic info -->
				<div class="flex items-start gap-4">
					<div
						class="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg ring-1 ring-black/5 dark:ring-white/10 {getPackageColorClass(
							packageInfo.name
						)}"
					>
						<span class="text-2xl font-bold text-white drop-shadow-sm">
							{getPackageIcon(packageInfo.name)}
						</span>
					</div>
					<div class="min-w-0 flex-1 space-y-2">
						<h2 class="text-3xl font-bold tracking-tight text-foreground">{packageInfo.name}</h2>
						<div class="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
							<span class="font-mono font-medium">v{packageInfo.version}</span>
							<span class="h-1 w-1 rounded-full bg-muted-foreground/50"></span>
							<span class="font-mono">{packageInfo.id}</span>
						</div>
					</div>
				</div>

				<!-- Description -->
				<div class="space-y-3">
					{#each packageInfo.description.split('\n').filter((x) => x.trim().length > 0) as line}
						<p class="max-w-3xl leading-relaxed text-muted-foreground">
							{line}
						</p>
					{/each}
				</div>
			</div>

			<!-- Status badges -->
			<div class="flex flex-wrap gap-2 sm:flex-col">
				<Badge variant="outline" class={getStatusColor(packageInfo.status)}>
					{packageInfo.status}
				</Badge>
				<Badge variant="outline" class={getApproachColor(packageInfo.approach)}>
					{packageInfo.approach}
				</Badge>
			</div>
		</div>
	</div>

	<!-- App Selector Section -->
	{#if showAppSelector && availableEndpoints.length > 0}
		<div class="space-y-4">
			<div class="flex items-center gap-3">
				<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
					<Terminal class="h-4 w-4 text-primary" />
				</div>
				<h3 class="text-lg font-semibold">Available Apps</h3>
				<Badge variant="secondary" class="h-6 px-2 text-sm">
					{availableEndpoints.length} app{availableEndpoints.length !== 1 ? 's' : ''}
				</Badge>
			</div>

			<div class="rounded-xl border border-border/50 bg-card/50 p-6">
				<div class="mb-4">
					<p class="text-sm text-muted-foreground">
						Select app
					</p>
				</div>

				<div class="flex items-center gap-3">
					<div class="min-w-0 flex-1">
						<Popover.Root bind:open={appPopoverOpen}>
							<Popover.Trigger bind:ref={appTriggerRef}>
								{#snippet child({ props })}
									<Button
										{...props}
										variant="outline"
										size="lg"
										class={cn(
											'w-full justify-between text-left font-normal transition-all hover:border-primary/50',
											selectedApp && 'border-primary/50 bg-primary/5'
										)}
										role="combobox"
										aria-expanded={appPopoverOpen}
										aria-label="Select app"
									>
										<div class="flex min-w-0 items-center">
											<Terminal class="mr-3 h-4 w-4 text-primary" />
											<span class="truncate">
												{selectedAppName()}
											</span>
										</div>
										<ChevronDown class="ml-2 h-4 w-4 opacity-50" />
									</Button>
								{/snippet}
							</Popover.Trigger>
							<Popover.Content class="w-96 p-0" align="start">
								<Command.Root>
									<Command.Input placeholder="Search apps..." class="h-9" />
									<Command.List class="max-h-64">
										<Command.Empty>No apps found.</Command.Empty>
										<Command.Group>
											{#each availableEndpoints as endpoint (endpoint.target)}
												<Command.Item
													value={endpoint.target}
													onSelect={() => selectApp(endpoint.target)}
													class="flex cursor-pointer items-center py-3"
												>
													<Check
														class={cn(
															'mr-3 h-4 w-4 text-primary',
															selectedApp !== endpoint.target && 'text-transparent'
														)}
													/>
													<div class="flex-1">
														<div class="font-medium">{endpoint.target}</div>
													</div>
												</Command.Item>
											{/each}
										</Command.Group>
									</Command.List>
								</Command.Root>
							</Popover.Content>
						</Popover.Root>
					</div>

					{#if selectedApp}
						<div class="flex items-center gap-2 text-sm text-muted-foreground">
							<ArrowRight class="h-4 w-4" />
							<span>Ready to explore</span>
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	<!-- Enhanced Info Grid -->
	<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
		<!-- Author -->
		<div
			class="group space-y-3 rounded-xl border border-border/50 bg-card/30 p-6 transition-all hover:bg-card/50"
		>
			<div class="flex items-center gap-3">
				<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
					<User class="h-4 w-4 text-blue-600 dark:text-blue-400" />
				</div>
				<span class="text-sm font-medium tracking-wide text-muted-foreground uppercase">Author</span
				>
			</div>
			<p class="font-semibold text-foreground">{packageInfo.author}</p>
		</div>

		<!-- Container with Copy Button -->
		<div
			class="group space-y-3 rounded-xl border border-border/50 bg-card/30 p-6 transition-all hover:bg-card/50"
		>
			<div class="flex items-center gap-3">
				<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10">
					<Container class="h-4 w-4 text-green-600 dark:text-green-400" />
				</div>
				<span class="text-sm font-medium tracking-wide text-muted-foreground uppercase"
					>Container</span
				>
			</div>
			<div class="group/container flex items-center gap-3">
				<code
					class="min-w-0 flex-1 truncate rounded-lg bg-muted px-3 py-2 font-mono text-sm text-foreground"
				>
					{packageInfo.container}
				</code>
				<Button
					variant="ghost"
					size="icon"
					class="h-8 w-8 shrink-0 opacity-0 transition-opacity group-hover/container:opacity-100"
					onclick={copyContainer}
					aria-label="Copy container name"
				>
					{#if copied}
						<Check class="h-4 w-4 text-green-600" />
					{:else}
						<Copy class="h-4 w-4" />
					{/if}
				</Button>
			</div>
		</div>

		<!-- Website -->
		<div
			class="group space-y-3 rounded-xl border border-border/50 bg-card/30 p-6 transition-all hover:bg-card/50"
		>
			<div class="flex items-center gap-3">
				<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10">
					<Globe class="h-4 w-4 text-purple-600 dark:text-purple-400" />
				</div>
				<span class="text-sm font-medium tracking-wide text-muted-foreground uppercase"
					>Website</span
				>
			</div>
			<Button
				variant="link"
				class="h-auto cursor-pointer justify-start p-0 font-semibold text-foreground transition-colors hover:text-blue-600 dark:hover:text-blue-400"
				onclick={() => openUrl(packageInfo.url)}
				aria-label={`Visit ${packageInfo.name} website`}
			>
				<span class="truncate">View Documentation</span>
				<ExternalLink class="ml-2 h-4 w-4 shrink-0" />
			</Button>
		</div>

		<!-- API Endpoints -->
		<div
			class="group space-y-3 rounded-xl border border-border/50 bg-card/30 p-6 transition-all hover:bg-card/50"
		>
			<div class="flex items-center gap-3">
				<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10">
					<Activity class="h-4 w-4 text-orange-600 dark:text-orange-400" />
				</div>
				<span class="text-sm font-medium tracking-wide text-muted-foreground uppercase">Apps</span>
			</div>
			<div class="flex items-baseline gap-2">
				<span class="text-2xl font-bold text-foreground">{packageInfo.api.endpoints.length}</span>
				<span class="text-sm text-muted-foreground">
					app{packageInfo.api.endpoints.length !== 1 ? 's' : ''} available
				</span>
			</div>
		</div>
	</div>

	<!-- Bottom border for visual separation -->
	{#if showBorder}
		<div class="border-b border-border/30"></div>
	{/if}
</div>

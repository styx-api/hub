<!-- PackageInfoCard.svelte -->
<script lang="ts">
	import { tick } from 'svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Command from '$lib/components/ui/command/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import {
		ExternalLink,
		User,
		Globe,
		Container,
		Copy,
		Check,
		Terminal,
		ChevronDown,
		ArrowRight
	} from '@lucide/svelte';
	import { cn } from '$lib/utils.js';
	import { type Package, type App, getApps } from '$lib/services/packages.svelte';

	interface Props {
		package: Package;
		compact?: boolean;
		showBorder?: boolean;
		onAppSelected?: (app: App) => void;
		showAppSelector?: boolean;
	}

	let {
		package: selectedPackage,
		compact = false,
		showBorder = true,
		onAppSelected = () => {},
		showAppSelector = true
	}: Props = $props();

	let apps: App[] = $state([]);
	let copied: boolean = $state(false);
	let selectedApp: App | null = $state(null);
	let appPopoverOpen: boolean = $state(false);
	let appTriggerRef = $state<HTMLButtonElement | null>(null);

	$effect(() => {
		if (!selectedPackage) return;
		getApps(selectedPackage.name).then((response) => {
			apps = response ?? [];
		});
	});

	const selectedAppName = $derived(() => {
		if (!selectedApp)
			return apps.length > 0
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
			await navigator.clipboard.writeText(selectedPackage.docker);
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

	function selectApp(app: App) {
		selectedApp = app;
		onAppSelected(app);
		closeAndFocusAppTrigger();
	}

	// Emit selection when app changes
	$effect(() => {
		if (selectedApp) {
			onAppSelected(selectedApp);
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
				selectedPackage.name
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
							selectedPackage.name
						)}"
					>
						<span class="text-2xl font-bold text-white drop-shadow-sm">
							{getPackageIcon(selectedPackage.name)}
						</span>
					</div>
					<div class="min-w-0 flex-1 space-y-2">
						<h2 class="text-3xl font-bold tracking-tight text-foreground">{selectedPackage.docs.title ?? selectedPackage.name}</h2>
						<div class="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
							<span class="font-mono font-medium">v{selectedPackage.version}</span>
							<span class="h-1 w-1 rounded-full bg-muted-foreground/50"></span>
							<span class="font-mono">{selectedPackage.name}</span>
						</div>
					</div>
				</div>

				<!-- Description -->
				<div class="space-y-3">
					{#each (selectedPackage.docs.description ?? "").split('\n').filter((x) => x.trim().length > 0) as line}
						<p class="max-w-3xl leading-relaxed text-muted-foreground">
							{line}
						</p>
					{/each}
				</div>
			</div>

			<!-- Status badges -->
			<!-- <div class="flex flex-wrap gap-2 sm:flex-col">
				<Badge variant="outline" class={getStatusColor(selectedPackage.status)}>
					{selectedPackage.status}
				</Badge>
				<Badge variant="outline" class={getApproachColor(selectedPackage.approach)}>
					{selectedPackage.approach}
				</Badge>
			</div> -->
		</div>
	</div>

	<!-- Package Details Section -->
	<div class="space-y-6">
		<!-- Metadata -->
		<div class="flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
			<div class="flex flex-wrap items-center gap-6">
				<div class="flex items-center gap-2">
					<User class="h-4 w-4" />
					<span>by <strong class="text-foreground">{selectedPackage.docs.authors?.join(", ")}</strong></span>
				</div>
				
				<div class="flex items-center gap-2">
					<Container class="h-4 w-4" />
					<code class="rounded bg-muted px-2 py-1 font-mono text-xs">
						{selectedPackage.docker}
					</code>
					<Button
						variant="ghost"
						size="icon"
						class="h-6 w-6"
						onclick={copyContainer}
						aria-label="Copy container name"
					>
						{#if copied}
							<Check class="h-3 w-3 text-green-600" />
						{:else}
							<Copy class="h-3 w-3" />
						{/if}
					</Button>
				</div>

				<div class="flex items-center gap-2">
					<Terminal class="h-4 w-4" />
					<span>
						<strong class="text-foreground">{selectedPackage.appCount}</strong>
						app{selectedPackage.appCount !== 1 ? 's' : ''} available
					</span>
				</div>
			</div>

			{#each selectedPackage.docs.urls ?? [] as url}
				<Button
					variant="outline"
					size="sm"
					onclick={() => openUrl(url)}
					class="shrink-0"
				>
					<Globe class="mr-2 h-4 w-4" />
					Documentation
					<ExternalLink class="ml-2 h-3 w-3" />
				</Button>
			{/each }
		</div>

		<!-- App Selector -->
		{#if showAppSelector && apps.length > 0}
			<div class="space-y-3">
				<div class="flex items-center gap-3">
					<Terminal class="h-5 w-5 text-primary" />
					<h3 class="text-lg font-semibold">Select Application</h3>
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
											{#each apps as app (app.id)}
												<Command.Item
													value={app.id}
													onSelect={() => selectApp(app)}
													class="flex cursor-pointer items-center py-3"
												>
													<Check
														class={cn(
															'mr-3 h-4 w-4 text-primary',
															selectedApp?.id !== app.id && 'text-transparent'
														)}
													/>
													<div class="flex-1">
														<div class="font-medium font-mono">{app.name}</div>
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
						<div class="flex items-center gap-2 text-sm text-primary">
							<ArrowRight class="h-4 w-4" />
							<span class="font-medium">Launching...</span>
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>

	<!-- Bottom border for visual separation -->
	{#if showBorder}
		<div class="border-b border-border/30"></div>
	{/if}
</div>
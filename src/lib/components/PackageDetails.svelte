<script lang="ts">
	import { tick } from 'svelte';
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
		ArrowRight,
		Github
	} from '@lucide/svelte';
	import { cn } from '$lib/utils.js';
	import { type Package, type App, getApps, getVersion } from '$lib/services/packages.svelte';
	import PackageIcon from './PackageIcon.svelte';

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

	// GitHub package definition URL
	const getPackageGithubUrl = (packageName: string) =>
		`https://github.com/styx-api/niwrap/blob/main/src/niwrap/${packageName}/package.json`;

	$effect(() => {
		if (!selectedPackage) return;
		getApps(selectedPackage.package.name).then((response) => {
			apps = response ?? [];
		});
	});

	const selectedAppName = $derived(() => {
		if (!selectedApp)
			return apps.length > 0 ? 'Choose an app to get started...' : 'No apps available';
		return selectedApp;
	});

	const packageGithubUrl = $derived(getPackageGithubUrl(selectedPackage.package.name));

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
		window.open(url, '_blank', 'noopener,noreferrer');
	}

	function openGithubUrl() {
		window.open(packageGithubUrl, '_blank', 'noopener,noreferrer');
	}

	async function copyContainer() {
		try {
			await navigator.clipboard.writeText(selectedPackage.version.container ?? "<no container>");
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
				selectedPackage.package.name
			)} opacity-10"
		></div>
		<div
			class="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 opacity-20"
		></div>

		<div class="relative space-y-4">
			<!-- Package icon and basic info -->
			<div class="flex items-start gap-4">
				<PackageIcon package={selectedPackage} size="lg" class="shadow-lg" />

				<div class="min-w-0 flex-1 space-y-2">
					<div class="flex items-start justify-between gap-4">
						<h2 class="min-w-0 flex-1 text-3xl font-bold tracking-tight text-foreground">
							{selectedPackage.package.docs?.title ?? selectedPackage.package.name}
						</h2>
						<!-- GitHub Button -->
						<Button
							variant="outline"
							size="sm"
							onclick={openGithubUrl}
							title="View package definition on GitHub"
							class="w-9 shrink-0 p-0 sm:w-auto sm:px-3"
						>
							<Github class="h-4 w-4 sm:mr-2" />
							<span class="hidden sm:inline">Source</span>
						</Button>
					</div>
					<div class="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
						<span class="font-mono font-medium">v{selectedPackage.version.name}</span>
						<span class="h-1 w-1 rounded-full bg-muted-foreground/50"></span>
						<span class="font-mono">{selectedPackage.package.name}</span>
					</div>
				</div>
			</div>
			<!-- Description -->
			<div class="space-y-3">
				{#each (selectedPackage.package.docs?.description ?? '')
					.split('\n')
					.filter((x) => x.trim().length > 0) as line}
					<p class="max-w-3xl leading-relaxed text-muted-foreground">
						{line}
					</p>
				{/each}
			</div>
		</div>
	</div>

	<!-- Package Details Section -->
	<div class="space-y-6">
		<!-- Metadata -->
		<div class="flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
			<div class="flex flex-wrap items-center gap-6">
				<div class="flex items-center gap-2">
					<User class="h-4 w-4" />
					<span
						>by <strong class="text-foreground">{selectedPackage.package?.docs?.authors?.join(', ')}</strong
						></span
					>
				</div>
				<div class="flex items-center gap-2">
					<Container class="h-4 w-4" />
					<code class="rounded bg-muted px-2 py-1 font-mono text-xs">
						{selectedPackage.version.container}
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
						<strong class="text-foreground">{selectedPackage.version.apps?.length ?? 0}</strong>
						app{(selectedPackage.version.apps?.length ?? 0) !== 1 ? 's' : ''} available
					</span>
				</div>
			</div>
			<!-- Documentation links -->
			{#each selectedPackage.package.docs?.urls ?? [] as url}
				<Button variant="outline" size="sm" onclick={() => openUrl(url)} class="shrink-0">
					<Globe class="mr-2 h-4 w-4" />
					Documentation
					<ExternalLink class="ml-2 h-3 w-3" />
				</Button>
			{/each}
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
													value={app.name}
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
														<div class="font-mono font-medium">{app.name}</div>
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

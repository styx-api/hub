<script lang="ts">
	import type { Package } from '$lib/services/packages.svelte';
	import { cn } from '$lib/utils.js';
	import type { Picture } from 'vite-imagetools';

	// @ts-ignore
	import LogoAfni from '../assets/afni.png?enhanced&w=32;48;64;80';
	// @ts-ignore
	import LogoFreesurfer from '../assets/freesurfer.png?enhanced&w=32;48;64;80';
	// @ts-ignore
	import LogoFsl from '../assets/fsl.jpg?enhanced&w=32;48;64;80';
	// @ts-ignore
	import LogoWorkbench from '../assets/workbench.png?enhanced&w=32;48;64;80';

	interface Props {
		package: Package;
		size?: 'sm' | 'md' | 'lg' | 'xl';
		class?: string;
	}

	let { package: pkg, size = 'md', class: className = '' }: Props = $props();

	let imageErrors = $state(new Set<string>());

	const hardcodedLogos: Record<string, Picture> = {
		fsl: LogoFsl,
		afni: LogoAfni,
		workbench: LogoWorkbench,
		freesurfer: LogoFreesurfer
	};

	function getPackageLogo(pkg: Package): Picture | null {
		const hardcodedLogo = hardcodedLogos[pkg.package.name.toLowerCase()];
		if (hardcodedLogo) return hardcodedLogo;
		//if (pkg.logo) return pkg.logo;
		return null;
	}

	function shouldShowLogo(pkg: Package): boolean {
		const logoUrl = getPackageLogo(pkg);
		return !!(logoUrl && !imageErrors.has(pkg.package.name));
	}

	function handleImageError(packageName: string) {
		imageErrors.add(packageName);
		imageErrors = imageErrors;
	}

	function getPackageIcon(packageName: string) {
		return packageName.charAt(0).toUpperCase();
	}

	function getPackageColors(packageName: string) {
		const colorSets = [
			{
				bg: 'bg-blue-500',
				text: 'text-white',
				tint: 'bg-blue-100 dark:bg-blue-900/40'
			},
			{
				bg: 'bg-emerald-500',
				text: 'text-white',
				tint: 'bg-emerald-100 dark:bg-emerald-900/40'
			},
			{
				bg: 'bg-violet-500',
				text: 'text-white',
				tint: 'bg-violet-100 dark:bg-violet-900/40'
			},
			{
				bg: 'bg-orange-500',
				text: 'text-white',
				tint: 'bg-orange-100 dark:bg-orange-900/40'
			},
			{
				bg: 'bg-rose-500',
				text: 'text-white',
				tint: 'bg-rose-100 dark:bg-rose-900/40'
			},
			{
				bg: 'bg-cyan-500',
				text: 'text-white',
				tint: 'bg-cyan-100 dark:bg-cyan-900/40'
			},
			{
				bg: 'bg-indigo-500',
				text: 'text-white',
				tint: 'bg-indigo-100 dark:bg-indigo-900/40'
			},
			{
				bg: 'bg-teal-500',
				text: 'text-white',
				tint: 'bg-teal-100 dark:bg-teal-900/40'
			},
			{
				bg: 'bg-red-500',
				text: 'text-white',
				tint: 'bg-red-100 dark:bg-red-900/40'
			},
			{
				bg: 'bg-amber-500',
				text: 'text-white',
				tint: 'bg-amber-100 dark:bg-amber-900/40'
			}
		];

		let hash = 0;
		for (let i = 0; i < packageName.length; i++) {
			hash = packageName.charCodeAt(i) + ((hash << 5) - hash);
		}
		return colorSets[Math.abs(hash) % colorSets.length];
	}

	const sizeVariants = {
		sm: {
			container: 'h-8 w-8',
			text: 'text-sm',
			padding: 'p-0.5'
		},
		md: {
			container: 'h-12 w-12',
			text: 'text-xl',
			padding: 'p-1'
		},
		lg: {
			container: 'h-16 w-16',
			text: 'text-2xl',
			padding: 'p-1.5'
		},
		xl: {
			container: 'h-20 w-20',
			text: 'text-3xl',
			padding: 'p-2'
		}
	};

	const packageColors = $derived(getPackageColors(pkg.package.name));
	const hasLogo = $derived(shouldShowLogo(pkg));
	const sizeConfig = $derived(sizeVariants[size]);

	const containerClass = $derived(
		cn(
			'relative overflow-hidden rounded-xl transition-all duration-200',
			'border border-border bg-card',
			'shadow-sm hover:shadow-md',
			sizeConfig.container,
			className
		)
	);
</script>

<div class={containerClass}>
	{#if hasLogo}
		<div
			class={cn(
				'flex h-full w-full items-center justify-center',
				packageColors.tint,
				sizeConfig.padding
			)}
		>
			<div class="aspect-square w-full overflow-hidden rounded-lg">
				<enhanced:img
					src={getPackageLogo(pkg)!!}
					alt="{pkg.package.name} logo"
					class="h-full w-full object-contain"
				/>
			</div>
		</div>
	{:else}
		<div class={cn('flex h-full w-full items-center justify-center', packageColors.bg)}>
			<span class={cn('font-semibold select-none', packageColors.text, sizeConfig.text)}>
				{getPackageIcon(pkg.package.name)}
			</span>
		</div>
	{/if}
</div>

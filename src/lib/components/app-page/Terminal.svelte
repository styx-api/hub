<script lang="ts">
	import { onMount } from 'svelte';
	import { cn } from '$lib/utils';
	import CopyButton from './TerminalCopyButton.svelte';
	import { join as quoteCommandLineArgs } from 'shlex';

	interface Props {
		args?: string[];
		prompt?: string;
		class?: string;
		showCursor?: boolean;
		showCopyButton?: boolean;
		title?: string;
	}

	let {
		args = $bindable<string[]>([]),
		prompt = $bindable<string>('$ '),
		class: className = '',
		showCursor = true,
		showCopyButton = true,
		title = 'Terminal'
	}: Props = $props();

	let cursorVisible = $state<boolean>(true);

	let command = $derived<string>(quoteCommandLineArgs(args));

	// Parse command into executable and arguments for syntax highlighting
	let parsedCommand = $derived(() => {
		if (!args.length) return { executable: '', arguments: '' };

		const [executable, ...rest] = args;
		const quotedExecutable = quoteCommandLineArgs([executable]);
		const quotedArgs = quoteCommandLineArgs(rest);

		return {
			executable: quotedExecutable,
			arguments: quotedArgs
		};
	});

	onMount((): (() => void) | void => {
		if (showCursor) {
			const cursorInterval: ReturnType<typeof setInterval> = setInterval(() => {
				cursorVisible = !cursorVisible;
			}, 1000);

			return () => clearInterval(cursorInterval);
		}
	});
</script>

<div
	class={cn(
		'group relative rounded-xl border border-gray-700/50 bg-gradient-to-br from-gray-900 to-black font-mono text-sm text-green-400 shadow-2xl backdrop-blur-sm',
		'min-h-[80px] w-full overflow-hidden',
		'[font-family:"JetBrains_Mono","SF_Mono","Monaco","Inconsolata","Roboto_Mono","Source_Code_Pro","Menlo","Consolas",monospace]',
		className
	)}
>
	<!-- Terminal header -->
	<div
		class="flex items-center justify-between border-b border-gray-700/50 bg-gray-800/50 px-4 py-3"
	>
		<div class="flex items-center space-x-2">
			<div
				class="h-3 w-3 rounded-full bg-red-500 shadow-sm transition-all duration-200 hover:shadow-red-500/50"
			></div>
			<div
				class="h-3 w-3 rounded-full bg-yellow-500 shadow-sm transition-all duration-200 hover:shadow-yellow-500/50"
			></div>
			<div
				class="h-3 w-3 rounded-full bg-green-500 shadow-sm transition-all duration-200 hover:shadow-green-500/50"
			></div>
		</div>

		<div class="text-xs font-medium text-gray-400">{title}</div>

		<div class="flex justify-end">
			{#if showCopyButton && args.length > 0}
				<CopyButton text={command} size="sm" />
			{:else}
				<!-- Spacer to maintain layout balance -->
				<div class="w-[60px]"></div>
			{/if}
		</div>
	</div>

	<!-- Terminal content -->
	<div class="overflow-x-auto p-4">
		<div class="flex items-center whitespace-pre">
			<span class="mr-2 font-semibold text-gray-400 select-none">{prompt}</span>
			{#if args.length > 0}
				<span class="select-text"
					><span class="font-bold text-cyan-300">{parsedCommand().executable}</span>{#if parsedCommand().arguments}<span
						class="font-medium text-green-300"
					>{' ' + parsedCommand().arguments}</span
					>{/if}</span
				>
			{/if}
			{#if showCursor}
				<span
					class="ml-1 inline-block h-5 w-2 animate-pulse bg-green-400 transition-opacity duration-200 select-none"
					class:opacity-0={!cursorVisible}
					class:opacity-100={cursorVisible}
				></span>
			{/if}
		</div>
	</div>

	<!-- Enhanced glow effect -->
	<div
		class="pointer-events-none absolute -inset-1 -z-10 rounded-xl bg-gradient-to-r from-green-600/20 via-cyan-600/20 to-blue-600/20 opacity-0 blur transition-opacity duration-500 group-hover:opacity-100"
	></div>

	<!-- Subtle inner glow -->
	<div
		class="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-green-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
	></div>
</div>

<style>
	/* Custom scrollbar styling */
	div::-webkit-scrollbar {
		height: 6px;
	}

	div::-webkit-scrollbar-track {
		background-color: rgba(31, 41, 55, 0.3);
		border-radius: 0.375rem;
	}

	div::-webkit-scrollbar-thumb {
		background-color: rgba(75, 85, 99, 0.7);
		border-radius: 0.375rem;
		transition: background-color 0.2s ease;
	}

	div::-webkit-scrollbar-thumb:hover {
		background-color: rgba(107, 114, 128, 0.9);
	}

	/* Firefox scrollbar */
	* {
		scrollbar-width: thin;
		scrollbar-color: rgba(75, 85, 99, 0.7) rgba(31, 41, 55, 0.3);
	}
</style>

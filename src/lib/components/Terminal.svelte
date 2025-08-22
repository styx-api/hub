<script lang="ts">
  import { onMount } from 'svelte';
  import { cn } from '$lib/utils';
  import CopyButton from './CopyButton.svelte';
	// import {quote as quoteCommandLineArgs} from "shell-quote";
	import {join as quoteCommandLineArgs} from "shlex";
  
  interface Props {
    args?: string[];
    prompt?: string;
    class?: string;
    showCursor?: boolean;
    showCopyButton?: boolean;
  }

  let {
    args = $bindable<string[]>([]),
    prompt = $bindable<string>('$ '),
    class: className = '',
    showCursor = true,
    showCopyButton = true
  }: Props = $props();
  
  let cursorVisible = $state<boolean>(true);
  
  let command = $derived<string>(quoteCommandLineArgs(args));
  
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
    'relative group font-mono text-sm bg-gradient-to-br from-gray-900 to-black text-green-400 rounded-xl border border-gray-700/50 shadow-2xl backdrop-blur-sm',
    'min-h-[80px] w-full overflow-hidden',
    '[font-family:"JetBrains_Mono","SF_Mono","Monaco","Inconsolata","Roboto_Mono","Source_Code_Pro","Menlo","Consolas",monospace]',
    className
  )}
>
  <!-- Terminal header -->
  <div class="flex items-center justify-between px-4 py-3 bg-gray-800/50 border-b border-gray-700/50">
    <div class="flex items-center space-x-2">
      <div class="w-3 h-3 rounded-full bg-red-500 shadow-sm"></div>
      <div class="w-3 h-3 rounded-full bg-yellow-500 shadow-sm"></div>
      <div class="w-3 h-3 rounded-full bg-green-500 shadow-sm"></div>
    </div>
    
    <div class="text-xs text-gray-400 font-medium">Terminal</div>
    
    <div class="flex justify-end">
      {#if showCopyButton}
        <CopyButton 
          text={command}
          size="sm"
        />
      {:else}
        <!-- Spacer to maintain layout balance -->
        <div class="w-[60px]"></div>
      {/if}
    </div>
  </div>
  
  <!-- Terminal content -->
  <div class="p-4 overflow-x-auto">
    <div class="flex items-center whitespace-nowrap">
      <span class="text-gray-400 mr-2 font-semibold select-none">{prompt}</span>
      <span class="text-green-300 font-medium select-text whitespace-pre">{command}</span>
      {#if showCursor}
        <span 
          class="ml-1 w-2 h-5 bg-green-400 inline-block transition-opacity duration-200 select-none"
          class:opacity-0={!cursorVisible}
          class:opacity-100={cursorVisible}
        ></span>
      {/if}
    </div>
  </div>
  
  <!-- Useless glow effect -->
  <div class="absolute -inset-1 bg-gradient-to-r from-green-600/20 to-blue-600/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 pointer-events-none"></div>
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
  }
  
  div::-webkit-scrollbar-thumb:hover {
    background-color: rgba(107, 114, 128, 0.9);
  }
</style>
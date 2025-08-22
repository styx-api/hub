<script lang="ts">
  import { cn } from '$lib/utils';
  
  interface Props {
    text: string;
    class?: string;
    size?: 'sm' | 'md' | 'lg';
  }

  let {
    text,
    class: className = '',
    size = 'sm'
  }: Props = $props();
  
  let copySuccess = $state<boolean>(false);
  let copyTimeout: ReturnType<typeof setTimeout>;
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs min-w-[60px]',
    md: 'px-3 py-2 text-sm min-w-[80px]',
    lg: 'px-4 py-2 text-base min-w-[100px]'
  };
  
  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };
  
  async function handleCopy(): Promise<void> {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      
      copySuccess = true;
      
      // Clear any existing timeout
      if (copyTimeout) {
        clearTimeout(copyTimeout);
      }
      
      copyTimeout = setTimeout(() => {
        copySuccess = false;
      }, 2000);
      
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  }
  
  // Cleanup timeout on component destroy
  $effect(() => {
    return () => {
      if (copyTimeout) {
        clearTimeout(copyTimeout);
      }
    };
  });
</script>

<button
  onclick={handleCopy}
  class={cn(
    'flex items-center justify-center space-x-1 text-gray-400 hover:text-green-400 transition-all duration-200 rounded-md hover:bg-gray-700/50',
    'focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:ring-offset-2 focus:ring-offset-transparent',
    'active:scale-95 transform',
    sizeClasses[size],
    className
  )}
  title={copySuccess ? 'Copied!' : 'Copy to clipboard'}
  disabled={copySuccess}
>
  {#if copySuccess}
    <svg class={cn(iconSizes[size], 'text-green-400')} fill="currentColor" viewBox="0 0 20 20">
      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
    </svg>
    <span class="text-green-400 font-medium">Copied!</span>
  {:else}
    <svg class={iconSizes[size]} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
    <span class="opacity-100 transition-opacity duration-200">
      Copy
    </span>
  {/if}
</button>
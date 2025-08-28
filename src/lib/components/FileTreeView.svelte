<script lang="ts">
  import { 
    ChevronRight, 
    ChevronDown, 
    FileText,
    FolderOpen,
    Copy
  } from '@lucide/svelte';
  import { cn } from '$lib/utils';

  // Types
  interface FileData {
    path: string;
    title?: string;
    description?: string;
    label: string;
  }

  interface TreeNode {
    type: 'file' | 'folder';
    data: FileData | null;
    children: Record<string, TreeNode>;
    path: string;
  }

  // Props
  interface Props {
    files: FileData[];
    class?: string;
    onFileClick?: (file: FileData) => void;
  }

  let { files, class: className, onFileClick }: Props = $props();

  // Helper function to build tree structure
  function buildTree(files: FileData[]): Record<string, TreeNode> {
    const tree: Record<string, TreeNode> = {};
    
    files.forEach(file => {
      const parts = file.path.split('/').filter(part => part);
      let current = tree;
      
      parts.forEach((part, index) => {
        if (!current[part]) {
          current[part] = {
            type: index === parts.length - 1 ? 'file' : 'folder',
            data: index === parts.length - 1 ? file : null,
            children: {},
            path: parts.slice(0, index + 1).join('/')
          };
        }
        current = current[part].children;
      });
    });
    
    return tree;
  }

  // Get all folder paths for default expansion
  function getAllFolderPaths(tree: Record<string, TreeNode>, basePath = ''): Record<string, boolean> {
    const paths: Record<string, boolean> = {};
    
    Object.entries(tree).forEach(([name, node]) => {
      const currentPath = basePath ? `${basePath}/${name}` : name;
      
      if (node.type === 'folder') {
        paths[currentPath] = true;
        Object.assign(paths, getAllFolderPaths(node.children, currentPath));
      }
    });
    
    return paths;
  }

  // Reactive state using Svelte 5 runes
  const tree = $derived(buildTree(files));
  let expanded = $state(getAllFolderPaths(tree));
  
  // Re-expand all folders when files change
  $effect(() => {
    expanded = getAllFolderPaths(tree);
  });
  
  function toggleExpanded(path: string) {
    expanded[path] = !expanded[path];
  }

  function handleFileClick(file: FileData) {
    onFileClick?.(file);
  }

  function copyLabel(label: string, event: Event) {
    event.stopPropagation();
    event.preventDefault();
    
    // Try modern clipboard API first
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(label).then(() => {
        console.log('Copied to clipboard:', label);
      }).catch(err => {
        console.error('Failed to copy:', err);
        // Fallback to older method
        fallbackCopy(label);
      });
    } else {
      // Fallback for older browsers or non-secure contexts
      fallbackCopy(label);
    }
  }

  function fallbackCopy(text: string) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      console.log('Copied using fallback:', text);
    } catch (err) {
      console.error('Fallback copy failed:', err);
    }
    
    document.body.removeChild(textArea);
  }
</script>

<div class={cn("w-full", className)}>
  {#each Object.entries(tree).sort(([,a], [,b]) => a.type === 'folder' ? -1 : 1) as [name, node]}
    {@render renderTree(node, name, '')}
  {/each}
</div>

{#snippet renderTree(node: TreeNode, name: string, path: string)}
  {@const currentPath = path ? `${path}/${name}` : name}
  {@const isExpanded = expanded[currentPath]}
  {@const hasChildren = Object.keys(node.children).length > 0}
  
  <div>
    <div 
      class={cn(
        "flex items-center py-2 px-3 rounded-md cursor-pointer group transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        node.data && "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      )}
      onclick={(e) => {
        // Only handle clicks if not on the copy button
        if (e.target instanceof Element && e.target.closest('button')) {
          return;
        }
        
        if (hasChildren) {
          toggleExpanded(currentPath);
        } else if (node.data) {
          handleFileClick(node.data);
        }
      }}
      role="button"
      tabindex="0"
      onkeydown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (hasChildren) {
            toggleExpanded(currentPath);
          } else if (node.data) {
            handleFileClick(node.data);
          }
        }
      }}
    >
      <div class="flex items-center flex-1 min-w-0">
        {#if hasChildren}
          <button 
            class={cn(
              "mr-2 p-0.5 rounded transition-colors",
              "hover:bg-accent/50"
            )}
            aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
          >
            {#if isExpanded}
              <ChevronDown class="h-4 w-4" />
            {:else}
              <ChevronRight class="h-4 w-4" />
            {/if}
          </button>
        {:else}
          <div class="w-6"></div>
        {/if}
        
        {#if node.type === 'folder'}
          <FolderOpen class="h-4 w-4 mr-3 text-primary flex-shrink-0" />
        {:else}
          <FileText class="h-4 w-4 mr-3 text-muted-foreground flex-shrink-0" />
        {/if}
        
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <span class={cn(
              "text-sm flex-1 truncate",
              node.data ? "font-medium" : "font-normal text-muted-foreground"
            )}>
              {node.data ? (node.data.title ?? "Title") : name}
            </span>
          </div>
          {#if node.data}
            <div class="flex items-center justify-between gap-2">
              <div class="flex-1 min-w-0">
                <div class="text-xs text-muted-foreground font-mono truncate">
                  {name}
                </div>
                <div class="text-xs text-muted-foreground/70 mt-0.5 line-clamp-2">
                  {node.data.description ?? "Description"}
                </div>
              </div>
              <button 
                class={cn(
                  "px-2 py-1 text-xs font-mono rounded-md border flex-shrink-0 transition-all duration-150",
                  "bg-secondary text-secondary-foreground border-border cursor-pointer",
                  "hover:bg-secondary/80 hover:border-border/80 hover:shadow-sm",
                  "active:bg-secondary/60 active:scale-95",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                )}
                onclick={(e) => node.data && copyLabel(node.data.label, e)}
                title="Copy label to clipboard"
                type="button"
              >
                <Copy class="h-3 w-3 inline mr-1" />
                {node.data.label}
              </button>
            </div>
          {/if}
        </div>
      </div>
    </div>
    
    {#if hasChildren && isExpanded}
      <div class="ml-4 border-l border-border pl-2">
        {#each Object.entries(node.children).sort(([,a], [,b]) => a.type === 'folder' ? -1 : 1) as [childName, childNode]}
          {@render renderTree(childNode, childName, currentPath)}
        {/each}
      </div>
    {/if}
  </div>
{/snippet}

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
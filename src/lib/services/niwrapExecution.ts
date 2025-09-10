import * as styxdefs from 'styxdefs';

// Cache for the dynamically loaded module
let niwrapModule: any = null;
let loadingPromise: Promise<any> | null = null;

/**
 * Dynamically loads the niwrap module from the hosted build artifacts
 * Uses browser detection to choose appropriate module format
 */
async function loadNiwrap(): Promise<any> {
  if (niwrapModule) {
    return niwrapModule;
  }

  // If already loading, return the same promise to avoid multiple loads
  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = (async () => {
    try {
      // Try ESM first (preferred for modern browsers)
      try {
        const module = await import('https://styx-api.github.io/niwrap/js/index.esm.js');
        niwrapModule = module;
        return niwrapModule;
      } catch (esmError) {
        console.warn('Failed to load ESM module, falling back to CJS:', esmError);
        
        // Fallback to CJS - though this might need special handling in browser
        const module = await import('https://styx-api.github.io/niwrap/js/index.cjs.js');
        niwrapModule = module;
        return niwrapModule;
      }
    } catch (error) {
      console.error('Failed to load niwrap module:', error);
      throw new Error(`Failed to load niwrap: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      loadingPromise = null;
    }
  })();

  return loadingPromise;
}

/**
 * Preload the niwrap module - call this early in your app lifecycle
 */
export async function preloadNiwrap(): Promise<void> {
  try {
    await loadNiwrap();
    console.log('NiWrap module preloaded successfully');
  } catch (error) {
    console.error('Failed to preload NiWrap module:', error);
  }
}

export function niwrapDeathMessage(): string[] {
  const deathMessages = [
    ['💀', 'NiWrap died of dysentery'],
    ['🪦', 'Here lies NiWrap'],
    ['💥', 'NiWrap spontaneously combusted'],
    ['🔥', 'NiWrap.exe has left the chat'],
    ['⚰️', 'RIP NiWrap (2024-2025)'],
    ['😵', 'NiWrap fainted!'],
    ['👻', 'NiWrap was spooked to death'],
    ['🎭', 'Et tu, config?'],
    ['🌪️', 'NiWrap got sucked into the void'],
    ['⚡', 'NiWrap was struck by lightning'],
    ['🔮', 'The oracle foretells: NiWrap is dead'],
    ['🚀', 'NiWrap launched into orbit'],
    ['🧨', 'NiWrap went out with a bang'],
    ['❄️', 'NiWrap froze to death'],
    ['🌋', 'NiWrap fell into lava']
  ];
  return deathMessages[Math.floor(Math.random() * deathMessages.length)];
}

export async function niwrapExecute(config: object): Promise<
  | {
      success: true;
      cargs: string[];
      outputObject: any;
    }
  | {
      success: false;
      error: string;
    }
> {
  if (!config || !('@type' in config)) {
    return {
      success: false,
      error: 'Invalid config: missing config or @type'
    };
  }

  try {
    // Dynamically load the niwrap module
    const niwrap = await loadNiwrap();
    
    const runner = new styxdefs.DryRunner();
    const outputs = niwrap.execute(config, runner);
    
    return {
      success: true,
      cargs: runner.lastCargs ?? [],
      outputObject: outputs
    };
  } catch (error) {
    const errorString = error instanceof Error ? error.message : String(error);
    console.error(error);
    console.error('NiWrap execution failed:', errorString);
    console.log("niwrap params was:", config)
    
    return {
      success: false,
      error: errorString
    };
  }
}

export async function niwrapVersion() {
    const niwrap = await loadNiwrap();
    return niwrap.version;
}
import * as niwrap from 'niwrap';
import * as styxdefs from 'styxdefs';

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

export function niwrapExecute(config: object):
  | {
    success: true;
    cargs: string[];
    outputFiles: any[];
  }
  | {
    success: false;
    error: string;
  } {
  if (!config || !('@type' in config)) {
    return {
      success: false,
      error: 'Invalid config: missing config or @type'
    };
  }
  try {
    const runner = new styxdefs.DryRunner();
    const outputs = niwrap.execute(config, runner);

    const newOutputs = [];
    for (const [label, path] of Object.entries(outputs)) {
      if (!(path instanceof String)) continue;
      newOutputs.push({
        path: '/outputs/' + path,
        title: 'Title',
        description: 'Description',
        label: label
      });
    }
    return {
      success: true,
      cargs: runner.lastCargs ?? [],
      outputFiles: newOutputs
    };
  } catch (error) {
    const errorString = error instanceof Error ? error.message : String(error);
    console.log(error)
    console.error('NiWrap execution failed:', errorString);
    return {
      success: false,
      error: errorString
    };
  }
}

/** A random tombstone shown (as the "command") when a config fails to execute. */
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

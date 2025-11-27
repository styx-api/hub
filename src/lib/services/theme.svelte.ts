// src/lib/services/theme.svelte.ts
import { browser } from '$app/environment';

class ThemeStore {
	#isDark = $state(false);

	constructor() {
		if (browser) {
			const stored = localStorage.getItem('theme');
			const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
			this.#isDark = stored ? stored === 'dark' : prefersDark;
			this.#apply();
		}
	}

	get isDark(): boolean {
		return this.#isDark;
	}

	toggle() {
		this.#isDark = !this.#isDark;
		if (browser) {
			localStorage.setItem('theme', this.#isDark ? 'dark' : 'light');
			this.#apply();
		}
	}

	#apply() {
		document.documentElement.classList.toggle('dark', this.#isDark);
	}
}

export const theme = new ThemeStore();
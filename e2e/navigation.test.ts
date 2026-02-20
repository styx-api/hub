import { test, expect, type Page } from '@playwright/test';

/** Wait for the app to finish loading packages. */
async function waitForLoad(page: Page) {
	// There may be multiple "Loading packages..." spinners in the DOM;
	// wait until none of them are visible.
	await expect(page.getByText('Loading packages...').first()).toBeHidden({ timeout: 30000 });
}

/** Package cards are buttons inside the grid gallery with a rounded-lg border style. */
function packageCards(page: Page) {
	return page.locator('button.rounded-lg.border');
}

test.describe('Navigation', () => {
	test('page loads and shows NiWrap Hub title', async ({ page }) => {
		await page.goto('/');
		await expect(page).toHaveTitle(/NiWrap Hub/);
	});

	test('package gallery renders with package cards', async ({ page }) => {
		await page.goto('/');
		await waitForLoad(page);
		// Gallery should have at least one package card
		const cards = packageCards(page);
		await expect(cards.first()).toBeVisible({ timeout: 10000 });
		expect(await cards.count()).toBeGreaterThan(0);
	});

	test('clicking a package shows package details', async ({ page }) => {
		await page.goto('/');
		await waitForLoad(page);

		// Click the first package card
		const firstCard = packageCards(page).first();
		await firstCard.click();

		// URL should update to include package parameter
		await expect(page).toHaveURL(/[?&]package=/, { timeout: 10000 });
	});

	test('clicking an app navigates to the app page', async ({ page }) => {
		await page.goto('/');
		await waitForLoad(page);

		// Click the first package
		await packageCards(page).first().click();
		await expect(page).toHaveURL(/[?&]package=/, { timeout: 10000 });

		// Open the app selector combobox (use aria-label to disambiguate from header comboboxes)
		const combobox = page.getByRole('combobox', { name: 'Select app' }).first();
		await expect(combobox).toBeVisible({ timeout: 10000 });
		await combobox.click();

		// Select the first app from the dropdown
		const appItem = page.locator('[role="option"]').first();
		await expect(appItem).toBeVisible({ timeout: 5000 });
		await appItem.click();

		// URL should now include both package and app
		await expect(page).toHaveURL(/[?&]app=/, { timeout: 10000 });
	});

	test('URL reflects current selection', async ({ page }) => {
		await page.goto('/');
		await waitForLoad(page);

		// Initially no query params
		expect(new URL(page.url()).search).toBe('');

		// Click a package card
		await packageCards(page).first().click();

		// Should have package in URL
		await expect(page).toHaveURL(/[?&]package=/, { timeout: 10000 });
	});
});

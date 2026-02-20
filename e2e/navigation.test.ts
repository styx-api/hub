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

	test('switching packages via header clears previous command output', async ({ page }) => {
		// Navigate directly to an app page
		await page.goto('/?package=ants&app=antsRegistration');
		await waitForLoad(page);

		// Wait for the desktop "Results" heading (only rendered when !isMobile)
		await expect(page.getByRole('heading', { name: 'Results' })).toBeVisible({ timeout: 15000 });

		// Switch package via header QuickSelector
		const packageCombobox = page.getByRole('combobox', { name: 'Select package' }).first();
		await packageCombobox.click();

		// Type to filter and select dcm2niix
		const packageInput = page.getByPlaceholder('Search packages...');
		await packageInput.fill('dcm2niix');
		const dcm2niixOption = page.locator('[role="option"]').filter({ hasText: 'dcm2niix' }).first();
		await expect(dcm2niixOption).toBeVisible({ timeout: 5000 });
		await dcm2niixOption.click();

		// Select an app from dcm2niix
		const appCombobox = page.getByRole('combobox', { name: 'Select app' }).first();
		await expect(appCombobox).toBeVisible({ timeout: 10000 });
		await appCombobox.click();
		const appOption = page.locator('[role="option"]').first();
		await expect(appOption).toBeVisible({ timeout: 5000 });
		await appOption.click();

		// Wait for new app page to load with results
		await waitForLoad(page);
		await expect(page.getByRole('heading', { name: 'Results' })).toBeVisible({ timeout: 15000 });

		// URL should reflect the new package (dcm2niix), not the old one (ants)
		await expect(page).toHaveURL(/[?&]package=dcm2niix/, { timeout: 10000 });

		// The terminal should show the new executable, not antsRegistration
		// Use .last() to target the desktop Terminal (mobile is first in DOM but hidden)
		const terminalExecutable = page.locator('.text-cyan-300').last();
		await expect(terminalExecutable).toBeVisible({ timeout: 15000 });
		await expect(terminalExecutable).not.toHaveText('antsRegistration');
	});

	test('browser back button returns to previous state', async ({ page }) => {
		// Start at home
		await page.goto('/');
		await waitForLoad(page);

		// Select a package
		await packageCards(page).first().click();
		await expect(page).toHaveURL(/[?&]package=/, { timeout: 10000 });
		const packageUrl = page.url();

		// Select an app
		const appCombobox = page.getByRole('combobox', { name: 'Select app' }).first();
		await expect(appCombobox).toBeVisible({ timeout: 10000 });
		await appCombobox.click();
		const appOption = page.locator('[role="option"]').first();
		await expect(appOption).toBeVisible({ timeout: 5000 });
		await appOption.click();
		await expect(page).toHaveURL(/[?&]app=/, { timeout: 10000 });

		// Go back — should return to package details (no app param)
		await page.goBack();
		await expect(page).toHaveURL(packageUrl, { timeout: 10000 });

		// Go back again — should return to home (no params)
		await page.goBack();
		await expect(page).toHaveURL(/\/$/, { timeout: 10000 });
		// Gallery should be visible
		await expect(packageCards(page).first()).toBeVisible({ timeout: 10000 });
	});

	test('browser forward button restores state', async ({ page }) => {
		// Start at home, navigate forward
		await page.goto('/');
		await waitForLoad(page);

		// Select a package
		await packageCards(page).first().click();
		await expect(page).toHaveURL(/[?&]package=/, { timeout: 10000 });
		const packageUrl = page.url();

		// Select an app
		const appCombobox = page.getByRole('combobox', { name: 'Select app' }).first();
		await expect(appCombobox).toBeVisible({ timeout: 10000 });
		await appCombobox.click();
		const appOption = page.locator('[role="option"]').first();
		await expect(appOption).toBeVisible({ timeout: 5000 });
		await appOption.click();
		await expect(page).toHaveURL(/[?&]app=/, { timeout: 10000 });
		const appUrl = page.url();

		// Go back twice to home
		await page.goBack();
		await page.goBack();
		await expect(page).toHaveURL(/\/$/, { timeout: 10000 });

		// Go forward — should restore package selection
		await page.goForward();
		await expect(page).toHaveURL(packageUrl, { timeout: 10000 });

		// Go forward again — should restore app selection
		await page.goForward();
		await expect(page).toHaveURL(appUrl, { timeout: 10000 });
	});

	test('direct URL navigation with package param', async ({ page }) => {
		await page.goto('/?package=ants');
		await waitForLoad(page);

		// Package should be selected — we should see the app selector, not the gallery
		const appCombobox = page.getByRole('combobox', { name: 'Select app' }).first();
		await expect(appCombobox).toBeVisible({ timeout: 10000 });

		// Gallery should not be visible
		await expect(packageCards(page).first()).toBeHidden();
	});

	test('direct URL navigation with package and app params', async ({ page }) => {
		await page.goto('/?package=ants&app=antsRegistration');
		await waitForLoad(page);

		// Desktop "Results" heading should be visible (confirms app page is showing)
		await expect(page.getByRole('heading', { name: 'Results' })).toBeVisible({ timeout: 15000 });

		// The terminal executable should be visible in the desktop view
		const terminalExecutable = page.locator('.text-cyan-300').last();
		await expect(terminalExecutable).toBeVisible({ timeout: 15000 });
	});

	test('invalid URL params handled gracefully', async ({ page }) => {
		await page.goto('/?package=nonexistent_package_xyz');
		await waitForLoad(page);

		// Should not crash — gallery should be visible as fallback
		await expect(packageCards(page).first()).toBeVisible({ timeout: 10000 });
	});
});

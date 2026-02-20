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

		// Switch package via unified header QuickSelector
		const quickSelector = page.getByRole('combobox', { name: 'Search packages and apps' });
		await quickSelector.click();

		// Type to filter and select dcm2niix
		await page.getByPlaceholder('Search...').fill('dcm2niix');
		const dcm2niixOption = page.locator('[role="option"]').filter({ hasText: 'dcm2niix' }).first();
		await expect(dcm2niixOption).toBeVisible({ timeout: 5000 });
		await dcm2niixOption.click();

		// Now on dcm2niix package details — select an app via the PackageDetails combobox
		const appCombobox = page.getByRole('combobox', { name: 'Select app' });
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

	test('QuickSelector package switch clears app selection from URL', async ({ page }) => {
		// Start on an app page
		await page.goto('/?package=ants&app=antsRegistration');
		await waitForLoad(page);
		await expect(page).toHaveURL(/[?&]app=antsRegistration/, { timeout: 10000 });

		// Switch package via unified header QuickSelector
		const quickSelector = page.getByRole('combobox', { name: 'Search packages and apps' });
		await quickSelector.click();
		await page.getByPlaceholder('Search...').fill('dcm2niix');
		const option = page.locator('[role="option"]').filter({ hasText: 'dcm2niix' }).first();
		await expect(option).toBeVisible({ timeout: 5000 });
		await option.click();

		// URL should have the new package but no app param
		await expect(page).toHaveURL(/[?&]package=dcm2niix/, { timeout: 10000 });
		expect(page.url()).not.toMatch(/[?&]app=/);
	});

	test('QuickSelector app switch updates URL', async ({ page }) => {
		// Start on a package details page (no app selected)
		await page.goto('/?package=ants');
		await waitForLoad(page);

		// Select an app via the unified header QuickSelector
		// When opened with a package selected, the dropdown shows the package's apps
		const quickSelector = page.getByRole('combobox', { name: 'Search packages and apps' });
		await quickSelector.click();

		// App items have font-mono class; pick the first app (skip package items)
		const appOption = page
			.locator('[role="option"]')
			.filter({ has: page.locator('.font-mono') })
			.first();
		await expect(appOption).toBeVisible({ timeout: 5000 });
		const appName = (await appOption.locator('.font-mono').textContent())?.trim();
		await appOption.click();

		// URL should now include the app parameter
		await expect(page).toHaveURL(/[?&]app=/, { timeout: 10000 });
		if (appName) {
			expect(page.url()).toContain(`app=${appName}`);
		}
	});

	test('multi-step back/forward navigation across 3+ history entries', async ({ page }) => {
		// Home → package → app: creates 3 history entries
		await page.goto('/');
		await waitForLoad(page);
		const homeUrl = page.url();

		// Step 1: select a package
		await packageCards(page).first().click();
		await expect(page).toHaveURL(/[?&]package=/, { timeout: 10000 });
		const packageUrl = page.url();

		// Step 2: select an app
		const appCombobox = page.getByRole('combobox', { name: 'Select app' }).first();
		await expect(appCombobox).toBeVisible({ timeout: 10000 });
		await appCombobox.click();
		const appOption = page.locator('[role="option"]').first();
		await expect(appOption).toBeVisible({ timeout: 5000 });
		await appOption.click();
		await expect(page).toHaveURL(/[?&]app=/, { timeout: 10000 });
		const appUrl = page.url();

		// Back to package details
		await page.goBack();
		await expect(page).toHaveURL(packageUrl, { timeout: 10000 });

		// Back to home
		await page.goBack();
		await expect(page).toHaveURL(homeUrl, { timeout: 10000 });
		await expect(packageCards(page).first()).toBeVisible({ timeout: 10000 });

		// Forward to package details
		await page.goForward();
		await expect(page).toHaveURL(packageUrl, { timeout: 10000 });
		// Gallery should not be visible — we should see package details
		await expect(packageCards(page).first()).toBeHidden({ timeout: 10000 });

		// Forward to app page
		await page.goForward();
		await expect(page).toHaveURL(appUrl, { timeout: 10000 });
		await expect(page.getByRole('heading', { name: 'Results' })).toBeVisible({ timeout: 15000 });

		// Back to package details again (verify repeated traversal works)
		await page.goBack();
		await expect(page).toHaveURL(packageUrl, { timeout: 10000 });
	});

	test('config URL → switch package → back restores config state', async ({ page }) => {
		// Navigate to an app with a config in the URL
		// Use a simple base64-encoded config: {"dimensionality": 3}
		const config = btoa(JSON.stringify({ dimensionality: 3 }));
		await page.goto(`/?package=ants&app=antsRegistration&config=${config}`);
		await waitForLoad(page);
		await expect(page.getByRole('heading', { name: 'Results' })).toBeVisible({ timeout: 15000 });

		// Switch package via unified header QuickSelector
		const quickSelector = page.getByRole('combobox', { name: 'Search packages and apps' });
		await quickSelector.click();
		await page.getByPlaceholder('Search...').fill('dcm2niix');
		const option = page.locator('[role="option"]').filter({ hasText: 'dcm2niix' }).first();
		await expect(option).toBeVisible({ timeout: 5000 });
		await option.click();

		// URL should now be dcm2niix (no app)
		await expect(page).toHaveURL(/[?&]package=dcm2niix/, { timeout: 10000 });

		// Go back — should restore to the ants app page
		await page.goBack();
		await expect(page).toHaveURL(/[?&]package=ants/, { timeout: 10000 });
		await expect(page).toHaveURL(/[?&]app=antsRegistration/, { timeout: 10000 });
	});
});

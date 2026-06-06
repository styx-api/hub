import { test, expect, type Page } from '@playwright/test';

/** Wait for the app to finish loading packages. */
async function waitForLoad(page: Page) {
	await expect(page.getByText('Loading packages...').first()).toBeHidden({ timeout: 30000 });
}

test.describe('H6 hardening', () => {
	test('footer shows the bundled compiler version', async ({ page }) => {
		await page.goto('/');
		await waitForLoad(page);

		// Unobtrusive lockstep indicator in the gallery footer.
		const compiler = page.getByText(/compiled with @styx-api\/core@/i);
		await expect(compiler).toBeVisible({ timeout: 10000 });
	});

	test('warns when the bundled compiler differs from the release (C8)', async ({ page }) => {
		// Force a mismatch by rewriting the manifest's compiler version; the bundled
		// version is whatever this build pinned, so any other value triggers the warning.
		await page.route('**/catalog.json', async (route) => {
			const body = await (await route.fetch()).json();
			body.compiler = { ...body.compiler, version: '0.0.0-mismatch-test' };
			await route.fulfill({ json: body });
		});

		await page.goto('/');
		await waitForLoad(page);

		// Footer surfaces the release version alongside the (matching-by-default) bundled one.
		const footerWarning = page.getByText(/release built with 0\.0\.0-mismatch-test/i);
		await expect(footerWarning).toBeVisible({ timeout: 10000 });
	});
});

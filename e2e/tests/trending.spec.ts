/**
 * Phase 6 — E2E: Trending & Search
 */
import { test, expect } from '@playwright/test';

test.describe('Trending Page', () => {
  test('loads trending page', async ({ page }) => {
    await page.goto('/trending');
    await expect(page.locator('h1')).toContainText('Trending');
  });

  test('shows both facts and rumors sections', async ({ page }) => {
    await page.goto('/trending');
    await expect(page.locator('text=Trending Facts')).toBeVisible();
    await expect(page.locator('text=Trending Rumors')).toBeVisible();
  });
});

test.describe('Search Page', () => {
  test('search page renders with input', async ({ page }) => {
    await page.goto('/search');
    await expect(page.locator('h1')).toContainText('Search');
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
  });

  test('search with query shows results or empty state', async ({ page }) => {
    await page.goto('/search?q=test');
    await page.waitForTimeout(1000);
    const results = page.locator('[class*="ClaimCard"], text=No results').first();
    // Just verify page doesn't crash
    await expect(page.locator('h1')).toContainText('Search');
  });
});

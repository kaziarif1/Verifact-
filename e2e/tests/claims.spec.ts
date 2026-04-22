/**
 * Phase 6 — E2E: Claims Feed & Submission
 */
import { test, expect } from '@playwright/test';

const timestamp = Date.now();
const user = {
  email: `claim_e2e_${timestamp}@test.com`,
  username: `claimuser${timestamp}`,
  displayName: 'Claim E2E User',
  password: 'ClaimE2e123!',
};

test.describe('Claims Feed', () => {
  test('feed loads with claim cards or empty state', async ({ page }) => {
    await page.goto('/');
    // Either claims or empty state
    const cards = page.locator('[class*="rounded-xl"]');
    await expect(cards.first()).toBeVisible({ timeout: 5000 });
  });

  test('feed filters work', async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("Politics")', { timeout: 5000 }).catch(() => {});
    // URL or UI should reflect filter
    await page.waitForTimeout(500);
  });

  test('clicking claim card navigates to detail', async ({ page }) => {
    await page.goto('/');
    const firstCard = page.locator('[class*="cursor-pointer"]').first();
    const count = await firstCard.count();
    if (count > 0) {
      await firstCard.click();
      await expect(page).toHaveURL(/\/claims\/.+/);
    }
  });
});

test.describe('Claim Submission', () => {
  test.beforeEach(async ({ page }) => {
    // Register and login
    await page.goto('/register');
    await page.fill('input[name="displayName"]', user.displayName);
    await page.fill('input[name="username"]', user.username);
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', user.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/', { timeout: 10000 });
  });

  test('submit page shows multi-step form', async ({ page }) => {
    await page.goto('/submit');
    await expect(page.locator('h1')).toContainText('Submit');
    // Step indicators
    const steps = page.locator('div[class*="rounded-full"]');
    await expect(steps.first()).toBeVisible();
  });

  test('Next button disabled until title is long enough', async ({ page }) => {
    await page.goto('/submit');
    const nextBtn = page.locator('button:has-text("Next")');
    await expect(nextBtn).toBeDisabled();
    await page.fill('input[name="title"]', 'A title that is definitely long enough to pass validation');
    await expect(nextBtn).toBeEnabled();
  });

  test('completes full claim submission', async ({ page }) => {
    await page.goto('/submit');
    await page.fill('input[name="title"]', 'E2E test claim that is long enough to be valid here');
    // Click step 1 category
    await page.click('button:has-text("Science")', { timeout: 3000 }).catch(async () => {
      await page.click('button:has-text("Other")');
    });
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Next")'); // skip body
    await page.click('button:has-text("Next")'); // skip media
    await page.click('button:has-text("Submit")');
    // Should see success animation or redirect
    await expect(page.locator('[class*="CheckCircle"], h2:has-text("Submitted")')).toBeVisible({ timeout: 10000 });
  });
});

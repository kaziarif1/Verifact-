/**
 * Phase 6 — E2E: Voting
 */
import { test, expect } from '@playwright/test';

const ts = Date.now();
const user = { email:`vote_e2e_${ts}@test.com`, username:`voteuser${ts}`, displayName:'Vote E2E', password:'VoteE2e123!' };

test.describe('Voting', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
    await page.fill('input[name="displayName"]', user.displayName);
    await page.fill('input[name="username"]', user.username);
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', user.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/', { timeout: 10000 });
  });

  test('vote buttons appear on claim detail when logged in', async ({ page }) => {
    // Navigate to first available claim (not own)
    const res = await page.request.get('/api/v1/claims');
    const claims = await res.json();
    if (!claims.data || claims.data.length === 0) {
      test.skip();
      return;
    }
    const claimId = claims.data[0]._id;
    await page.goto(`/claims/${claimId}`);
    // Vote section should be visible
    await expect(page.locator('text=Cast your vote').or(page.locator('[class*="vote"]'))).toBeVisible({ timeout: 5000 });
  });
});

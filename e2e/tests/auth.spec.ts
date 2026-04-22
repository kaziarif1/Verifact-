/**
 * Phase 6 — E2E: Authentication Flows
 */
import { test, expect } from '@playwright/test';

const timestamp = Date.now();
const testUser = {
  email:       `e2e_${timestamp}@test.com`,
  username:    `e2euser${timestamp}`,
  displayName: 'E2E Test User',
  password:    'E2ePass123!',
};

test.describe('Authentication', () => {
  test('guest can browse feed without login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/');
    await expect(page.locator('h1')).toContainText('Feed');
    // No redirect to login
    await expect(page).not.toHaveURL('/login');
  });

  test('guest is redirected to login when submitting', async ({ page }) => {
    await page.goto('/submit');
    await expect(page).toHaveURL('/login');
  });

  test('register flow', async ({ page }) => {
    await page.goto('/register');
    await page.fill('input[name="displayName"]', testUser.displayName);
    await page.fill('input[name="username"]', testUser.username);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/', { timeout: 10000 });
    await expect(page.locator('h1')).toContainText('Feed');
  });

  test('login flow', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/', { timeout: 10000 });
  });

  test('shows error for wrong credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'nobody@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await expect(page.locator('[data-testid="toast"], [class*="toast"]')).toBeVisible({ timeout: 5000 });
  });

  test('forgot password page renders', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.locator('h2')).toContainText('Forgot');
  });
});

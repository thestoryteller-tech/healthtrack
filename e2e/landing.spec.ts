import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/');

    // Check for main heading or brand
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('should have navigation links', async ({ page }) => {
    await page.goto('/');

    // Check for login/signup links
    const loginLink = page.getByRole('link', { name: /login|sign in/i });
    const signupLink = page.getByRole('link', { name: /sign up|get started|try free/i });

    // At least one of these should be visible
    const hasLogin = await loginLink.isVisible().catch(() => false);
    const hasSignup = await signupLink.isVisible().catch(() => false);

    expect(hasLogin || hasSignup).toBe(true);
  });

  test('should have HIPAA-related content', async ({ page }) => {
    await page.goto('/');

    // Check for HIPAA mention
    const pageContent = await page.textContent('body');
    expect(pageContent?.toLowerCase()).toContain('hipaa');
  });

  test('should have tracking/analytics content', async ({ page }) => {
    await page.goto('/');

    const pageContent = await page.textContent('body');
    const hasTracking = pageContent?.toLowerCase().includes('tracking');
    const hasAnalytics = pageContent?.toLowerCase().includes('analytics');

    expect(hasTracking || hasAnalytics).toBe(true);
  });

  test('should be responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Page should still be visible and not broken
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Test desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});

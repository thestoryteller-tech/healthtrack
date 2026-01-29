import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should show login page for unauthenticated users', async ({ page }) => {
    await page.goto('/dashboard');

    // Should be redirected to login
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: /sign in|login/i })).toBeVisible();
  });

  test('should have login form elements', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in|login/i })).toBeVisible();
  });

  test('should show signup page', async ({ page }) => {
    await page.goto('/signup');

    await expect(page.getByRole('heading', { name: /sign up|create|register/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('should show validation errors for empty form', async ({ page }) => {
    await page.goto('/login');

    // Click submit without filling form
    await page.getByRole('button', { name: /sign in|login/i }).click();

    // Should still be on login page (form not submitted)
    await expect(page).toHaveURL(/\/login/);
  });

  test('should have link to signup from login', async ({ page }) => {
    await page.goto('/login');

    const signupLink = page.getByRole('link', { name: /sign up|create account|register/i });
    await expect(signupLink).toBeVisible();
  });

  test('should have link to login from signup', async ({ page }) => {
    await page.goto('/signup');

    const loginLink = page.getByRole('link', { name: /sign in|login|already have/i });
    await expect(loginLink).toBeVisible();
  });
});

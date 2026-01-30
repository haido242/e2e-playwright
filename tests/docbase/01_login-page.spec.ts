import { test, expect } from '@playwright/test';
import { testCredentials, validateCredentials } from '../helpers/credentials';

test.beforeAll(() => {
    validateCredentials('docbase');
});

test.describe('DOCBASE Login', () => {
    test.beforeEach(async ({ page, context }) => {
        await context.clearCookies();
        await page.goto('/login');
        await page.evaluate(() => localStorage.clear());
    });
    test('should show error for invalid credentials', async ({ page }) => {        
        await page.fill('#email', 'wrong@example.com');
        await page.fill('#password', 'wrongpassword');
        await page.click('button[type="submit"]');
        
        await expect(page.locator('.ant-notification-notice-content')).toBeVisible({ timeout: 5000 });

    });
});

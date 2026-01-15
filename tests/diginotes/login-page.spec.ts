import { test, expect } from '@playwright/test';
import { testCredentials, validateCredentials } from '../helpers/credentials';

test.beforeAll(() => {
    validateCredentials('diginotes');
});

test.describe('DIGINOTES Login', () => {
    test.beforeEach(async ({ page, context }) => {
        await context.clearCookies();
        await page.goto('/login');
        await page.evaluate(() => localStorage.clear());
    });
    test('should show error for invalid credentials', async ({ page }) => {        
        await page.fill('#username', 'wrong@example.com');
        await page.fill('#password', 'wrongpassword');
        await page.click('button[type="submit"]');
        
        await expect(page.locator('.ant-notification-notice-content')).toBeVisible({ timeout: 5000 });

    });

    test('should login successfully', async ({ page }) => {
        await page.fill('#username', testCredentials.diginotes.email);
        await page.fill('#password', testCredentials.diginotes.password);
        await page.click('button[type="submit"]');
        
        await expect(page).toHaveURL(/folders/);
        await expect(page.locator('span.ant-menu-title-content').nth(0)).toContainText('Tài liệu của tôi');
    });
});

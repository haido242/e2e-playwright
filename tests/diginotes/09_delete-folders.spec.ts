import { test, expect } from '@playwright/test';

test.describe('Test tính năng Xóa folder', () => {
    test.beforeEach(async ({ page }) => {
        console.log('\n-----------------------------------------------------------\n');
        await page.goto('/folders', { waitUntil: 'domcontentloaded' });
        console.log('Đã vào trang folders');
    });

    test.afterEach(async ({ page }, testInfo) => {
        if (testInfo.status !== testInfo.expectedStatus) {
        // Test FAILED
        console.log(`❌ Test "${testInfo.title}" failed!`);
        } else {
        // Test PASSED
        console.log('🆗 Test passes successfully');
        }
    });

    test.afterAll(async () => {
        console.log('--------------------------END------------------------------');
    });

    test('TC02: Xóa folder thành công', async ({ page }) => {
        const folderClasses = '.ant-col.ant-col-xs-12.ant-col-sm-8.ant-col-md-6.ant-col-xxl-4';
        const firstFolderSelector = page.locator(folderClasses).first();
        await firstFolderSelector.waitFor({ state: 'visible', timeout: 10000 })
        console.log('👉 ✅ Đã tìm thấy folder đầu tiên');

        const secondIcon = firstFolderSelector.locator('svg.folder-item__icon').nth(1);
        await secondIcon.waitFor({ state: 'visible', timeout: 10000 })
        await secondIcon.click(); // Click vào icon của thư mục đầu tiên
        console.log('👉 Click vào icon của thư mục đầu tiên');

        // Popover opens and choose option
        const popoverLocator = page.locator('div.ant-popover-content');
        await popoverLocator.waitFor({ state: 'visible', timeout: 15000 });
        console.log('👉 Hiển thị Popover');

        const delOptionSelector = '.ant-menu-item:has-text("Xóa thư mục")';
        await page.waitForSelector(delOptionSelector, {timeout: 5000})
        await page.click(delOptionSelector, {timeout: 5000})
        console.log('👉 Chọn option Xóa');

        await popoverLocator.waitFor({ state: 'hidden', timeout: 5000 });
        console.log('👉 Popover đã đóng');

        const modalLocator = page.locator('.ant-modal-content').last();
        await modalLocator.waitFor({ state: 'visible', timeout: 5000 });
        console.log('👉 Modal Xóa đã xuất hiện.')

        await page.fill('#name[placeholder="Nhập"]', 'VBPQ-test');
        const delBtnSelector = page.locator('button:has-text("Xóa")');
        const bgColor = await delBtnSelector.evaluate((el: any) => {
            return window.getComputedStyle(el).backgroundColor;
        });
        console.log(`🎨 Background color: "${bgColor}"`);

        await expect(delBtnSelector).toHaveCSS('background-color', 'rgb(236, 28, 42)', { timeout: 5000 });
        await delBtnSelector.click();
        console.log('👉 Ấn button Xóa và tiến hành Xóa');

        await modalLocator.waitFor({ state: 'hidden', timeout: 5000 });
        console.log('👉 Modal Xóa đã đóng');

        // const folderNameSelector = 'div:has-text("VBPQ-test")';
        await expect(page.locator('.ant-notification-notice-content:has-text("Xóa thư mục thành công")')).toBeVisible({ timeout: 5000 });
    })
})
import { test, expect } from '@playwright/test';

test.describe('Test tính năng Tạo custom form', () => {
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

    test('TC02: Xóa custom form thành công', async ({ page }) => {
        const dropdownIconSelector = page.locator('span.anticon-caret-down[aria-label="caret-down"]').first();
        await dropdownIconSelector.waitFor({state: 'visible', timeout: 10000})
        await dropdownIconSelector.click();
        console.log('👉 Click vào Dropdown icon');

        // Popover opens and choose option
        const popoverLocator = page.locator('div.ant-popover-content').last();
        await popoverLocator.waitFor({ state: 'visible', timeout: 15000 });
        console.log('👉 Popover đã được hiển thị');

        const optSelector = '.org-setting .option:has-text("Loại hồ sơ")';
        await page.waitForSelector(optSelector, {timeout: 5000})
        await page.click(optSelector, {timeout: 5000})
        console.log('👉 Chọn option Loại hồ sơ');

        await popoverLocator.waitFor({ state: 'hidden', timeout: 5000 });
        console.log('👉 Popover đã đóng');

        await page.goto('/organizations/settings/document-types', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('.isoLayoutContentWrapper div.title:has-text("Loại hồ sơ")')).toBeVisible({timeout: 5000})
        console.log('👉 Vào trang Loại hồ sơ');

        const selectedDocTypeLocator = page.locator('.ant-spin-container > div').last();
        await selectedDocTypeLocator.waitFor({state: 'attached', timeout: 10000});
        console.log('👉 Chọn loại tài liệu muốn xóa');

        const moreActionIconLocator = selectedDocTypeLocator.locator('div:nth-child(2) > div > svg');
        await moreActionIconLocator.click({timeout: 15000})
        console.log('👉 Ấn vào icon');

        const actionPopoverLocator = selectedDocTypeLocator.locator('div:nth-child(2) > div .ant-popover-content');
        await expect(actionPopoverLocator).toBeVisible({timeout: 10000});
        console.log('👉 Hiển thị Popover Select Option');

        const delOptLocator = actionPopoverLocator.locator('.ant-menu-item:nth-child(2)');
        await delOptLocator.click({timeout: 10000});
        console.log('👉 Chọn option Xóa và Popover đóng lại');

        const delConfirmModalLocator = page.locator('.ant-modal-content:has-text("Do you Want to delete")');
        await expect(delConfirmModalLocator).toBeVisible({timeout: 15000});
        console.log('👉 Hiển thị Modal Xác nhận Xóa');
        
        const confirmBtnLocator = page.locator('button.ant-btn-primary').getByText('OK', {exact: true});
        await confirmBtnLocator.click({timeout: 10000});
        console.log('👉 Ấn button OK để xác nhận Xóa');
       
        await expect(delConfirmModalLocator).toBeHidden({timeout: 10000});
        console.log('👉 Modal Xác nhận Xóa đã đóng');
    })
})
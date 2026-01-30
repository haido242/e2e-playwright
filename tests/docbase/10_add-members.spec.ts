import { test, expect } from '@playwright/test';

test.describe('Test tính năng Phân quyền', () => {
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

    test('TC02: Thêm người mới thành công', async ({ page }) => {
        const dropdownIconSelector = page.locator('span.anticon-caret-down[aria-label="caret-down"]').first();
        await dropdownIconSelector.waitFor({state: 'visible', timeout: 10000})
        await dropdownIconSelector.click();
        console.log('👉 Click vào Dropdown icon');

        // Popover opens and choose option
        const popoverLocator = page.locator('div.ant-popover-content').last();
        await popoverLocator.waitFor({ state: 'visible', timeout: 15000 });
        console.log('👉 Popover đã được hiển thị');

        const optSelector = '.org-setting .option:has-text("Phân quyền")';
        await page.waitForSelector(optSelector, {timeout: 5000})
        await page.click(optSelector, {timeout: 5000})
        console.log('👉 Chọn option Phân quyền');

        await popoverLocator.waitFor({ state: 'hidden', timeout: 5000 });
        console.log('👉 Popover đã đóng');

        await page.goto('/organizations/settings/users', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('span.title:has-text("TỔ CHỨC")')).toBeVisible({timeout: 5000})
        console.log('👉 Vào trang phân quyền');

        const addBtnSelector = 'button:has-text("Thêm mới")'
        await page.click(addBtnSelector);
        console.log('👉 Ấn vào button thêm mới');

        const modalAddLocator = page.locator('.ant-modal-content:has-text("Thêm mới tài khoản")').last();
        await modalAddLocator.waitFor({ state: 'visible', timeout: 5000 });
        console.log('👉 Modal Thêm tài khoản đã xuất hiện.')

        const roleSelectLocator = page.locator('.ant-select-selector input#role')
        await roleSelectLocator.click({timeout: 5000});
        const optListLocator = page.locator('.rc-virtual-list-holder-inner');
        await optListLocator.waitFor({state: 'visible', timeout: 10000});
        const roleOptSelector = optListLocator.getByTitle('Quản trị', {exact: true});
        await roleOptSelector.click();
        console.log('👉 Chọn role cho các tài khoản sẽ thêm');
        await expect(optListLocator).toBeHidden({timeout: 15000});

        await page.fill('input.ant-input.tag-input', 'VBPQ-test');

        const sendInvitationLocator = page.locator('button:has-text("Gửi lời mời")');
        const bgColor = await sendInvitationLocator.evaluate((el: any) => {
            return window.getComputedStyle(el).backgroundColor;
        });
        console.log(`🎨 Background color: "${bgColor}"`);

        await expect(sendInvitationLocator).toHaveCSS('background-color', 'rgb(236, 28, 42)', { timeout: 5000 });
        await sendInvitationLocator.click();
        console.log('👉 Nhấn button Gửi lời mời');

        await expect(modalAddLocator).toBeHidden({timeout: 15000});
        console.log('👉 Modal Thêm tài khoản đã đóng');
        const modalInvitationLocator = page.locator('.ant-modal-content').getByText('Link lời mời', {exact: true});
        await expect(modalInvitationLocator).toBeVisible({timeout: 15000});
        console.log('👉 Modal Link lời mời đã hiển thị');

        // const folderNameSelector = 'div:has-text("VBPQ-test")';
        await expect(page.locator('.ant-notification-notice-content:has-text("Xóa thư mục thành công")')).toBeVisible({ timeout: 5000 });
    })
})

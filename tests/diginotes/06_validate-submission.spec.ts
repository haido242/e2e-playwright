import { test, expect } from '@playwright/test';

test.describe('Test tính năng Xác nhận Submission', () => {
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

  test('TC02: Xác nhận submission thành công', async ({ page }) => {
    const folderClasses = '.ant-col.ant-col-xs-12.ant-col-sm-8.ant-col-md-6.ant-col-xxl-4';
    const firstFolderSelector = page.locator(folderClasses).nth(0);
    await firstFolderSelector.waitFor({ state: 'visible', timeout: 10000 })
    await firstFolderSelector.click(); // Click vào thư mục đầu tiên
    console.log('👉 Vào thư mục đầu tiên');

    const fileRowSelector = `.ant-table-row:first-child .ant-table-cell:nth-child(2)`;
    await page.waitForSelector(fileRowSelector, { timeout: 10000 });
    console.log('👉 File row đã xuất hiện.');
    await page.click(fileRowSelector);

    // Modal opens and choose document type
    const drawerLocator = page.locator('.ant-drawer-content:has-text("Thông tin hồ sơ")').first();
    await drawerLocator.waitFor({ state: 'visible', timeout: 5000 });
    console.log('👉 Drawer 1 đã được hiển thị');

    const validateSubmissionBtnLocator = page.locator('button:has-text("Kiểm tra")').first();
    await validateSubmissionBtnLocator.waitFor({state: 'visible', timeout: 5000});
    await validateSubmissionBtnLocator.click();
    console.log('👉 Click button Kiểm tra');

    const submissionDrawerLocator = page.locator('.ant-drawer-content:has(img)').last();
    await submissionDrawerLocator.waitFor({ state: 'visible', timeout: 25000 });
    console.log('👉 Drawer Submission đã được hiển thị');

    const validateBtnSelector = 'button:has-text("Xác nhận")';
    await page.waitForSelector(validateBtnSelector, {timeout: 5000})
    await page.click(validateBtnSelector, {timeout: 15000})
    console.log("👉 Click button Xác nhận");

    const successNotiSelector= page.locator('.ant-notification-notice:has-text("Xác nhận thành công")')
    await expect(successNotiSelector).toBeVisible({timeout: 10000});
    console.log("👉 Message thành công được hiển thị");

    const closeSubmissionDrawerIcon = submissionDrawerLocator.locator('span.anticon.anticon-close[aria-label="close"]').last();
    await closeSubmissionDrawerIcon.waitFor({state: 'visible', timeout: 5000});
    await closeSubmissionDrawerIcon.click();
    await expect(submissionDrawerLocator).toBeHidden({timeout: 10000})
    console.log("👉 Đóng drawer Submission");

    const closeDrawerIcon = page.locator('span.anticon.anticon-close[aria-label="close"]').first();
    await closeDrawerIcon.waitFor({state: 'visible', timeout: 5000});
    await closeDrawerIcon.click();
    await drawerLocator.waitFor({ state: 'hidden', timeout: 5000 });
    console.log('👉 Đóng drawer 1');

    const tabSelector = '.ant-menu-overflow-item.ant-menu-item:has-text("Đã xác nhận")';
    await page.waitForSelector(tabSelector, {timeout: 5000});
    await page.click(tabSelector);
    console.log('👉 Chuyển qua tab Đã xác nhận');

    const validatedfileRowSelector = `.ant-table-row:first-child .ant-table-cell:nth-child(2) div`;
    await expect(page.locator(validatedfileRowSelector)).toHaveCSS('background-color', 'rgb(250, 173, 20)', {timeout: 20000})
  })
})
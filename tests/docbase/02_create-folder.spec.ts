import { test, expect } from '@playwright/test';

test.describe('Test tính năng Tạo thư mục', () => {
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

  test('TC02: Thêm folder thành công', async ({ page }) => {
    const addFolderBtnSelector = 'button:has-text("Thêm thư mục")';
    await page.waitForSelector(addFolderBtnSelector, {timeout: 5000})
    await page.click(addFolderBtnSelector)
    console.log('👉 Click Add Folder Button');

    // Modal opens and choose document type
    const modalLocator = page.locator('.ant-modal-content:has-text("Chọn loại tài liệu")');
    await modalLocator.waitFor({ state: 'visible', timeout: 5000 });
    console.log('👉 Modal is visible');

    const vbpqTypeSelector = 'div.ant-col.ant-col-md-8:has-text("Văn bản pháp quy")';
    await page.waitForSelector(vbpqTypeSelector, {timeout: 5000})
    await page.click(vbpqTypeSelector, {timeout: 5000})
    console.log('👉 Select document type: Văn bản pháp quy');

    const continueBtnSelector = 'button:has-text("Tiếp tục")';
    await page.waitForSelector(continueBtnSelector, {timeout: 5000})
    await page.click(continueBtnSelector)
    console.log("👉 Click Continue button to go to next step");

    await modalLocator.waitFor({ state: 'hidden', timeout: 5000 });
    console.log('👉 Modal is close');

    const nameModal = page.locator('.ant-modal-content:has-text("Thư mục mới")');
    await nameModal.waitFor({ state: 'visible', timeout: 5000 });
    console.log('👉 Modal Name is visible');

    await page.fill('#name', 'VBPQ-test')
    console.log('👉 Fill folder\'s name');
    const createButton = page.locator('button:has-text("Tạo")');
    await createButton.click();
    await nameModal.waitFor({ state: 'hidden', timeout: 5000 });

    await expect(page.getByText('VBPQ-test', { exact: true })).toBeVisible({ timeout: 15000 });
  })
})

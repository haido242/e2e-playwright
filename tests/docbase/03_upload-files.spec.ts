import { test, expect } from '@playwright/test';

test.describe('Test tính năng Upload theo files', () => {
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

  const uploadFileTestFunction = async ({ page }: { page: any }) => {
    // Tăng timeout cho test này vì upload có thể mất 2-3 phút
    test.setTimeout(10 * 60 * 1000); // 5 phút
    
    const folderClasses = '.ant-col.ant-col-xs-12.ant-col-sm-8.ant-col-md-6.ant-col-xxl-4';
    const firstFolderSelector = page.locator(folderClasses).nth(0);
    await firstFolderSelector.waitFor({ state: 'visible', timeout: 10000 })
    await firstFolderSelector.click(); // Click vào thư mục đầu tiên
    console.log('👉 Go to first folder page');

    // Chờ nút "Tải Lên" xuất hiện và click
    const dropdownButtonSelector = 'button.ant-btn.ant-btn-primary.ant-btn-icon-only.ant-btn-compact-item.ant-btn-compact-last-item.ant-dropdown-trigger';
    await page.waitForSelector(dropdownButtonSelector, { timeout: 20000 });
    await page.click(dropdownButtonSelector);
    console.log('👉 Click button dropdown');

    const uploadFilesButton = 'li:has-text("Tải tệp lên")'
    await page.waitForSelector(uploadFilesButton, { timeout: 20000 });
    await page.click(uploadFilesButton)
    console.log('👉 Choose Upload files option');

    // Chờ dialog tải lên xuất hiện (lấy modal mới nhất nếu có nhiều modal)
    const dialogLocator = page.locator('.ant-modal-content').last();
    await dialogLocator.waitFor({ state: 'visible', timeout: 5000 });
    console.log('👉 Dialog tải lên đã xuất hiện.');
    
    // Tải file lên
    const filePath = require('path').resolve(__dirname, '../fixtures/790054.pdf');
    const filePaths = [
      require('path').resolve(__dirname, '../fixtures/0b61d882-16c5-492c-a8d9-d71f00686cac (another copy).pdf'),
      require('path').resolve(__dirname, '../fixtures/0e6392ed-ea9e-49f7-8f03-0c84ebbba133 (another copy).pdf'),
      require('path').resolve(__dirname, '../fixtures/0e6392ed-ea9e-49f7-8f03-0c84ebbba133 (copy).pdf')
    ];

    console.log(`👉 File paths: ${JSON.stringify(filePaths)}`);

    
    // Kiểm tra file có tồn tại không
    const fs = require('fs');

    for (const filePath of filePaths) {
      const fileExists = fs.existsSync(filePath);
      console.log(`File exists (${filePath}): ${fileExists}`);
      if (!fileExists) {
          throw new Error(`👉 File not found: ${filePath}`);
      }
    }
    
    // Tìm input file element (có thể bị ẩn)
    const fileInput = dialogLocator.locator('input[type="file"]');
    const inputCount = await fileInput.count();
    console.log(`👉 Found ${inputCount} file input(s)`);
    
    // Set files trực tiếp vào input (không cần click)
    await fileInput.setInputFiles(filePaths);
    console.log(`👉 Đã set ${filePaths.length} files`);

    const uploadBtnSelector = 'button:has-text("Tải lên")'
    await page.click(uploadBtnSelector)
    console.log('👉 Click Upload Button and start uploading');

    const closeModalBtnSelector = 'button:has-text("Xong")'
    await page.waitForSelector(closeModalBtnSelector, { timeout: 10000 * filePaths?.length });
    await page.click(closeModalBtnSelector)
    console.log('👉 Finish uploading & Click Close modal Button');
    
    // Chờ modal đóng lại (check hidden thay vì detached vì Ant Design giữ modal trong DOM)
    await dialogLocator.waitFor({ state: 'hidden', timeout: 15000 });
    console.log('👉 Modal tải lên đã đóng lại.');
    await page.waitForTimeout(5000); // Chờ thêm 5s để file xuất hiện trong danh sách

    // Selector cho cell của file vừa upload (hàng cuối cùng, cột 2)
    const fileRowSelector = `.ant-table-row:first-child .ant-table-cell:nth-child(2)`;
    await page.waitForSelector(fileRowSelector, { timeout: 10000 });
    console.log('👉 File row đã xuất hiện.');
    
    // Kiểm tra state ban đầu
    const initialSpanCount = await page.locator(`${fileRowSelector} span`).count();
    console.log(`👉 Initial state - Span count: ${initialSpanCount}`);
    
    // Đợi transition: span (loading icon) → div (completed)
    console.log('⏳ Đang đợi xử lý tài liệu...');
    
    // Approach 1: Poll để check khi nào span biến mất
    const maxWaitTime = 10 * 60 * 1000; // 10 phút
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      const spanCount = await page.locator(`${fileRowSelector} span`).count();
      
      if (spanCount === 0) {
        console.log('✅ Loading icon đã biến mất!');
        break;
      }
      
      // Log progress mỗi 10s
      if ((Date.now() - startTime) % 10000 < 1000) {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        console.log(`⏱️  Đã đợi ${elapsed}s... (còn loading)`);
      }
      
      await page.waitForTimeout(1000); // Đợi 1s trước khi check lại
    }
    
    // Kiểm tra timeout
    const finalSpanCount = await page.locator(`${fileRowSelector} span.anticon-loading`).count();
    if (finalSpanCount > 0) {
      throw new Error(`👉 Timeout sau ${maxWaitTime / 1000}s, loading icon vẫn chưa biến mất!`);
    }
    
    // Đợi div xuất hiện
    const divLocator = page.locator(`${fileRowSelector} div`);
    await divLocator.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✅ Upload completed.');
    
    // Kiểm tra background color
    const backgroundColor = await divLocator.evaluate((el : any) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    console.log(`📊 Background color: ${backgroundColor}`);
    
    // Assert background color (rgb(250, 173, 20) = #faad14)
    await expect(divLocator).toHaveCSS('background-color', 'rgb(250, 173, 20)');
    console.log('✅ Background color đúng (#2369f6). => ocr processing hoàn tất.');
  };

  test('TC02: Upload theo files thành công', uploadFileTestFunction)
})

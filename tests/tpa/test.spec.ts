import { test, expect } from '@playwright/test';


test('Trang chủ hiển thị tiêu đề đúng', async ({ page }) => {
  // Chờ trang load và kiểm tra response
  const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
  console.log('Response status:', response?.status());
  console.log('Response URL:', response?.url());
  
  // Debug: log title
  const title = await page.title();
  console.log('Page title:', title);
  
  // Chờ thêm một chút để trang render
  await page.waitForLoadState('networkidle');
  
  await expect(page).toHaveTitle(/DocBase.AI/i);
});

// Test đăng nhập sai - Sử dụng context riêng KHÔNG có storageState
test('Đăng nhập sai hiển thị lỗi', async ({ browser }) => {
  const context = await browser.newContext({ 
    storageState: undefined
  });
  const page = await context.newPage();
  
  const baseURL = process.env.TPA_BASE_URL || 'http://localhost:3000';
  await page.goto(`${baseURL}/login`, { waitUntil: 'domcontentloaded' });

  await page.fill('#email', 'wrong-email@example.com');
  await page.fill('#password', 'wrongpassword');
  await page.click('button[type=submit]');

  // Chờ thông báo lỗi xuất hiện
  const errorSelector = '.ant-notification-notice-description'; 
  await page.waitForSelector(errorSelector, { timeout: 5000 });
  const errorMessage = await page.textContent(errorSelector);
  console.log('Error message displayed:', errorMessage);
  expect(errorMessage).toContain('Email hoặc mật khẩu không hợp lệ');
  
  await context.close();
});

test('Thêm thư mục', async ({ page }) => {
  // Đã đăng nhập sẵn qua storageState - không cần login nữa!
  await page.goto('/folders', { waitUntil: 'domcontentloaded' });
  console.log('Đã vào trang folders (đã đăng nhập sẵn qua storageState).');

  // Chờ nút "Thêm Thư Mục" xuất hiện và click
  const addButtonSelector = 'button:has-text("Thêm Thư Mục")';
  await page.waitForSelector(addButtonSelector, { timeout: 20000 });
  await page.click(addButtonSelector);
  console.log('Đã click nút "Thêm Thư Mục".');

  // Chờ drawer xuất hiện
  const drawerSelector = '.ant-drawer-content';
  await page.waitForSelector(drawerSelector, { timeout: 5000 });
  console.log('Drawer thêm thư mục đã xuất hiện.');

  // Điền tên thư mục và submit
  const now = new Date();
  const timestamp = now.toLocaleString('vi-VN', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit', 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  }).replace(/\//g, '-');
  const folderName = `E2E Test Folder ${timestamp}`;
  await page.fill(`${drawerSelector} input[id="name"]`, folderName);
  await page.fill(`${drawerSelector} input[id="maDonVi"]`, '31');
  await page.click(`${drawerSelector} button:has-text("Tạo")`);
  console.log(`Đã điền tên thư mục: "${folderName}" và submit.`);

  // kiểm tra có được điều hướng tới trang thư mục mới không
  await page.waitForURL(/folders\/\d+/, { timeout: 10000 });
  const currentURL = page.url();
  console.log('Đã được điều hướng tới URL:', currentURL);
  expect(currentURL).toMatch(/folders\/\d+/);
  console.log('Thêm thư mục thành công và điều hướng đúng trang thư mục.');
});

test('Tải tài liệu lên', async ({ page }) => {
  // Tăng timeout cho test này vì upload có thể mất 2-3 phút
  test.setTimeout(10 * 60 * 1000); // 5 phút
  
  // Đã đăng nhập sẵn qua storageState - không cần login nữa!
  await page.goto('/folders', { waitUntil: 'domcontentloaded' });
  console.log('Đã vào trang folders (đã đăng nhập sẵn qua storageState).');
  
  const firstFolderSelector = '.ant-table-row:nth-child(1) .ant-table-cell:nth-child(1) .editable-cell-value-wrap';
  await page.waitForSelector(firstFolderSelector, { timeout: 10000 });
  await page.click(firstFolderSelector); // Click vào thư mục đầu tiên
  // Chờ nút "Tải Lên" xuất hiện và click
  const uploadButtonSelector = 'button:has-text("Tải Lên file")';
  await page.waitForSelector(uploadButtonSelector, { timeout: 20000 });
  await page.click(uploadButtonSelector);
  console.log('Đã click nút "Tải Lên file".');
  // Chờ dialog tải lên xuất hiện
  const dialogSelector = '.ant-modal-content';
  await page.waitForSelector(dialogSelector, { timeout: 5000 });
  console.log('Dialog tải lên đã xuất hiện.');
  
  // Tải file lên
  const filePath = require('path').resolve(__dirname, '../fixtures/790054.pdf');
  console.log(`File path resolved: ${filePath}`);
  
  // Kiểm tra file có tồn tại không
  const fs = require('fs');
  const fileExists = fs.existsSync(filePath);
  console.log(`File exists: ${fileExists}`);
  if (!fileExists) {
    throw new Error(`File not found: ${filePath}`);
  }
  
  // Tìm input file element (có thể bị ẩn)
  const fileInput = await page.locator(`${dialogSelector} input[type="file"]`);
  const inputCount = await fileInput.count();
  console.log(`Found ${inputCount} file input(s)`);
  
  // Set files trực tiếp vào input (không cần click)
  await fileInput.setInputFiles(filePath);
  console.log(`Đã set file: ${filePath}`);
  
  // Chờ modal đóng lại (check hidden thay vì detached vì Ant Design giữ modal trong DOM)
  await page.waitForSelector(dialogSelector, { state: 'hidden', timeout: 15000 });
  console.log('Modal tải lên đã đóng lại.');
  await page.waitForTimeout(2000); // Chờ thêm 2s để file xuất hiện trong danh sách
  // Selector cho cell của file vừa upload (hàng cuối cùng, cột 2)
  const fileRowSelector = `.ant-table-row:last-child .ant-table-cell:nth-child(2)`;
  await page.waitForSelector(fileRowSelector, { timeout: 10000 });
  console.log('File row đã xuất hiện.');
  
  // Kiểm tra state ban đầu
  const initialSpanCount = await page.locator(`${fileRowSelector} span`).count();
  console.log(`Initial state - Span count: ${initialSpanCount}`);
  
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
      console.log(`  ⏱️  Đã đợi ${elapsed}s... (còn loading)`);
    }
    
    await page.waitForTimeout(1000); // Đợi 1s trước khi check lại
  }
  
  // Kiểm tra timeout
  const finalSpanCount = await page.locator(`${fileRowSelector} span.anticon-loading`).count();
  if (finalSpanCount > 0) {
    throw new Error(`Timeout sau ${maxWaitTime / 1000}s, loading icon vẫn chưa biến mất!`);
  }
  
  // Đợi div xuất hiện
  const divLocator = page.locator(`${fileRowSelector} div`);
  await divLocator.waitFor({ state: 'visible', timeout: 10000 });
  console.log('✅ Upload completed.');
  
  // Kiểm tra background color
  const backgroundColor = await divLocator.evaluate((el) => {
    return window.getComputedStyle(el).backgroundColor;
  });
  console.log(`📊 Background color: ${backgroundColor}`);
  
  // Assert background color (rgb(35, 105, 246) = #2369f6)
  await expect(divLocator).toHaveCSS('background-color', 'rgb(35, 105, 246)');
  console.log('✅ Background color đúng (#2369f6). => ocr processing hoàn tất.');

});

test('Màn xác nhận', async ({ page }) => {
  test.setTimeout(1 * 60 * 1000); // 1 phút
  
  // Đã đăng nhập sẵn qua storageState - không cần login nữa!
  await page.goto('/folders', { waitUntil: 'domcontentloaded' });
  console.log('Đã vào trang folders (đã đăng nhập sẵn qua storageState).');
  
  const firtsFolderSelector = '.ant-table-row:nth-child(1) .ant-table-cell:nth-child(1) .editable-cell-value-wrap';
  await page.waitForSelector(firtsFolderSelector, { timeout: 10000 });
  await page.click(firtsFolderSelector); // Click vào thư mục đầu tiên
  await page.waitForURL(/folders\/\d+/);
  console.log('Đã vào trang folder chi tiết.');

  const firstDocSelector = '.ant-table-row:nth-child(1)';
  await page.waitForSelector(firstDocSelector, { timeout: 10000 });
  await page.click(firstDocSelector); // Click vào tài liệu đầu tiên
  
  const submissionDrawerHeaderSelector = '.ant-drawer-header button[type="button"]:has-text("Xác nhận")';
  await page.waitForSelector(submissionDrawerHeaderSelector, { timeout: 10000 });
  await page.click(submissionDrawerHeaderSelector);
  await page.waitForURL(/folders\/\d+\/verify\?/);
  console.log('Đã vào màn xác nhận tài liệu.');
});
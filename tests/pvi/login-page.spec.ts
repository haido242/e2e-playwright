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
  
  const baseURL = process.env.PVI_BASE_URL || 'http://localhost:3000';
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
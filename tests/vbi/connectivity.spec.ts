import { test, expect } from '@playwright/test';

/**
 * Test này kiểm tra kết nối cơ bản tới app
 * Chạy đầu tiên để verify app có sẵn sàng không
 */
test.describe('Connectivity Tests', () => {
  test('App có thể kết nối được', async ({ page, baseURL }) => {
    console.log(`🔍 Testing connectivity to: ${baseURL}`);
    
    // Thử kết nối tới base URL
    const response = await page.goto('/', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    // Log response details
    console.log(`📡 Response status: ${response?.status()}`);
    console.log(`📍 Response URL: ${response?.url()}`);
    
    // Assert: response phải thành công (2xx or 3xx)
    const status = response?.status() || 0;
    expect(status).toBeGreaterThanOrEqual(200);
    expect(status).toBeLessThan(400);
    
    console.log('✅ Connectivity test passed!');
  });

  test('Trang chủ có HTML content', async ({ page }) => {
    await page.goto('/');
    
    // Lấy HTML content
    const html = await page.content();
    const title = await page.title();
    
    console.log(`📄 Page title: "${title}"`);
    console.log(`📏 HTML length: ${html.length} chars`);
    
    // Assert: phải có HTML content
    expect(html.length).toBeGreaterThan(0);
    
    // Assert: title không được rỗng
    expect(title.length).toBeGreaterThan(0);
    
    console.log('✅ HTML content test passed!');
  });
});

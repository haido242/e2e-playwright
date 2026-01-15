import { chromium, FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('\n🧹 Running global teardown - Cleaning up test data...');
  
  // Xác định project nào đang chạy từ environment
  const isPVI = process.env.PVI_BASE_URL && process.env.PVI_BASE_URL !== 'http://localhost:3000';
  const isTPA = process.env.TPA_BASE_URL && process.env.TPA_BASE_URL !== 'http://localhost:3000';
  const isDiginotes = process.env.DIGINOTES_BASE_URL && process.env.DIGINOTES_BASE_URL !== 'http://localhost:3000';
  
  const browser = await chromium.launch();
  
  try {
    // Cleanup PVI nếu có chạy PVI tests
    if (isPVI) {
      await cleanupProject(browser, 'PVI', '.auth/pvi-user.json', process.env.PVI_BASE_URL!);
    }
    
    // Cleanup TPA nếu có chạy TPA tests
    if (isTPA) {
      await cleanupProject(browser, 'TPA', '.auth/tpa-user.json', process.env.TPA_BASE_URL!);
    }

    if (isDiginotes) {
      await cleanupProject(browser, 'DIGINOTES', '.auth/diginotes-user.json', process.env.DIGINOTES_BASE_URL!);
    }
  } catch (error) {
    console.error('❌ Cleanup error:', error);
  } finally {
    await browser.close();
  }
  
  console.log('✅ Global teardown completed\n');
}

async function cleanupProject(browser: any, projectName: string, storageStatePath: string, baseURL: string) {
  console.log(`\n🗑️  Cleaning up ${projectName} test data...`);
  
  const context = await browser.newContext({
    storageState: storageStatePath,
    baseURL: baseURL
  });
  
  const page = await context.newPage();
  
  try {
    // Đi đến trang folders
    await page.goto('/folders', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    
    // Lặp để xóa từng folder một (luôn xóa folder đầu tiên)
    let deletedCount = 0;
    const maxAttempts = 20; // Giới hạn số lần xóa để tránh infinite loop
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Reload trang để có danh sách mới
      if (attempt > 0) {
        await page.goto('/folders', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      }
      
      // Tìm folder đầu tiên có tên "E2E Test Folder"
      const testFolder = page.locator('.ant-table-row:has-text("E2E Test Folder")').first();
      
      
      // Kiểm tra còn folder nào không
      const count = await testFolder.count();
      if (count === 0) {
        console.log(`   ✓ No more test folders to delete`);
        break;
      }
      
      try {
        // Click vào icon settings
        const settingIcon = testFolder.locator('span[aria-label="setting"]');
        await settingIcon.click({ timeout: 5000 });
        console.log(`   ${attempt + 1}. Clicked settings icon`);
        
        // Chờ điều hướng đến trang settings
        await page.waitForURL(/folders\/\d+\/general/, { timeout: 10000 });
        
        // Click "Xóa Thư Mục"
        await page.locator('button:has-text("Xóa Thư Mục")').click({ timeout: 5000 });
        
        // Điền tên để confirm (lấy tên folder thực tế)
        const nameInput = page.locator('#name');
        await nameInput.waitFor({ state: 'visible', timeout: 5000 });
        
        // Lấy tên folder từ placeholder hoặc label
        const folderNameMatch = await page.locator('.ant-modal').textContent();
        const folderName = folderNameMatch?.match(/nhập\s+"(.+?)"/)?.[1] || 'E2E Test Folder';
        
        await nameInput.fill(folderName);
        
        // Click confirm
        await page.locator('.ant-modal .ant-btn-primary:has-text("Xóa")').click({ timeout: 5000 });
        
        // Chờ về trang /folders
        await page.waitForURL('/folders', { timeout: 10000 });
        
        deletedCount++;
        console.log(`   ✓ Deleted test folder ${deletedCount}`);
        
        // Đợi một chút trước khi xóa folder tiếp theo
        await page.waitForTimeout(1000);
      } catch (error) {
        console.log(`   ⚠️  Failed to delete folder (attempt ${attempt + 1}): ${error}`);
        // Quay về trang folders nếu có lỗi
        await page.goto('/folders', { waitUntil: 'domcontentloaded' }).catch(() => {});
      }
    }
    
    console.log(`   ✅ ${projectName} cleanup completed - Deleted ${deletedCount} folders`);
  } catch (error) {
    console.error(`   ❌ ${projectName} cleanup failed:`, error);
  } finally {
    await context.close();
  }
}

export default globalTeardown;

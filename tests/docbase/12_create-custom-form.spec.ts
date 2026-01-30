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

    test('TC02: Tạo custom form thành công', async ({ page }) => {
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

        const createBtnSelector = 'button:has-text("Tạo mẫu")'
        await page.click(createBtnSelector, {timeout: 5000});
        console.log('👉 Ấn vào button Tạo mẫu');

        const customFormDrawerLocator = page.locator('.ant-drawer-content:has-text("Xem hướng dẫn")').first();
        await customFormDrawerLocator.waitFor({ state: 'visible', timeout: 25000 });
        console.log('👉 Drawer Thêm mới tài liệu xuất hiện.')

        const filePath = require('path').resolve(__dirname, '../fixtures/custom-form.pdf');
        console.log(`👉 File paths: ${JSON.stringify(filePath)}`);

        // Kiểm tra file có tồn tại không
        const fs = require('fs');
        const fileExists = fs.existsSync(filePath);
        console.log(`👉 File exists: ${fileExists}`);
        if (!fileExists) {
            throw new Error(`👉 File not found: ${filePath}`);
        }
        
        // Tìm input file element (có thể bị ẩn)
        const fileInput = customFormDrawerLocator.locator('input[type="file"]');
        const inputCount = await fileInput.count();
        console.log(`👉 Found ${inputCount} file input(s)`);
        
        // Set files trực tiếp vào input (không cần click)
        await fileInput.setInputFiles(filePath);
        console.log(`👉 Đã set file: ${filePath}`);

        const spinLocator = page.locator('.spinWrapper');
        // Đợi spinner xuất hiện (file đang được upload)
        await spinLocator.waitFor({ state: 'visible', timeout: 5000 });
        console.log('⏳ Bắt đầu loading file...');
        
        const startTime = Date.now();
        let lastLogTime = startTime;
        const logInterval = 10000; // Log mỗi 10 giây

        // Đợi spinner biến mất (upload hoàn tất)
        const maxWaitTime = 5 * 60 * 1000; // Tối đa 5 phút
        
        while (Date.now() - startTime < maxWaitTime) {
            const isVisible = await spinLocator.isVisible();
            
            if (!isVisible) {
                const totalTime = Math.floor((Date.now() - startTime) / 1000);
                console.log(`✅ Loading hoàn tất sau ${totalTime}s`);
                break;
            }
            
            // Log mỗi 10s
            const currentTime = Date.now();
            if (currentTime - lastLogTime >= logInterval) {
                const elapsed = Math.floor((currentTime - startTime) / 1000);
                console.log(`⏳ Loading... ${elapsed}s`);
                lastLogTime = currentTime;
            }
            
            await page.waitForTimeout(1000); // Đợi 1s trước khi check lại
        }
        
        // Kiểm tra timeout
        const finalVisible = await spinLocator.isVisible();
        if (finalVisible) {
            throw new Error(`❌ Timeout sau ${maxWaitTime / 1000}s, loading vẫn chưa hoàn tất!`);
        }

        const continueBtnLocator = page.locator('button:has-text("Tiếp tục")');
        await continueBtnLocator.click();
        console.log('👉 Ấn button Tiếp tục');

        const addDocTypeModalSelector = '.ant-modal-content:has-text("Thêm tài liệu")'
        await page.waitForSelector(addDocTypeModalSelector, {state: 'visible', timeout: 10000});
        console.log('👉 Hiển thị form Thêm tài liệu');

        await page.fill('#name[placeholder="Nhập tiêu đề"]', 'custom-form-test');
        await page.fill('#description[placeholder="Nhập mô tả"]', 'test tạo custom form');
        console.log('👉 Điền tiêu đề và mô tả');

        const selectLocator = page.locator('.ant-select-selector:has-text("Hoạt động")');
        await selectLocator.click();
        await expect(page.locator('.rc-virtual-list-holder-inner')).toBeVisible({timeout: 10000});

        const activeOptLocator = page.locator('.ant-select-item-option[title="Hoạt động"]');
        await activeOptLocator.waitFor({state: 'visible', timeout: 10000})
        await activeOptLocator.click();
        console.log('👉 Đã chọn option Hoạt động trong Select và hoàn thành form'); 

        await activeOptLocator.waitFor({state: 'hidden', timeout: 10000})

        const saveBtnLocator = page.locator('button:has-text("Lưu lại")');
        await saveBtnLocator.click();
        console.log('👉 Click button Lưu lại'); 

        const successMsglocator = page.locator('.ant-message-custom-content.ant-message-success:has-text("Đã tạo mới thành công")');
        await expect(customFormDrawerLocator).toBeHidden({timeout: 10000});
        console.log('👉 Drawer đã đóng');
        await expect(successMsglocator).toBeVisible({timeout: 10000});
        console.log('👉 Hiển thị message thành công tạo mẫu');
    })
})

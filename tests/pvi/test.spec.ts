import { test, expect } from '@playwright/test';

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


  const folderName = `E2E Test Folder`;
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
  await test.step('Vào màn xác nhận', async () => {
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
    
    const submissionDrawerHeaderSelector = '.ant-drawer-header button[type="button"]:has-text("Xem YC")';
    await page.waitForSelector(submissionDrawerHeaderSelector, { timeout: 10000 });
    await page.click(submissionDrawerHeaderSelector);
    await page.waitForURL(/folders\/\d+\/verify\?/);
    await page.waitForTimeout(1000);

    console.log('Đã vào màn xác nhận tài liệu.');
  });
  await test.step('Kiểm tra nội dung màn xác nhận GYC', async () => {
    // Chụp screenshot màn xác nhận
    await page.screenshot({ path: 'artifacts/man-xac-nhan.png', fullPage: true });

    const spinnerSelector = '.ant-spin';
    // sleep 3s
    // Chờ spinner biến mất
    await page.waitForSelector(spinnerSelector, { state: 'detached', timeout: 30000 });
    console.log('Spinner đã biến mất, trang đã load xong.');
    
    // Kiểm tra title các trường
    const expectedTitles = ['Hình thức điều trị', 'Ngày KH yêu cầu', 'Họ và tên NYCTT','Người được bảo hiểm','Người thụ hưởng', 'Ngày xảy ra rủi ro', 'Địa điểm', 'OCR', 'Chuẩn hóa', 'OCR', 'Mã ICD', 'Chuẩn hóa', 'Mô tả nguyên nhân', 'Số tiền KH YCBT', 'Hậu quả', 'Số tiền BHYT chi trả'];
    
    const titleFieldsLocator = page.locator('div[name^="datapoint-"]');
    const count = await titleFieldsLocator.count();
    console.log(`Found ${count} datapoint fields`);
    
    const titleList = [];
    for (let i = 0; i < count; i++) {
      const field = titleFieldsLocator.nth(i);
      const titleDiv = field.locator('div').nth(1);
      const title = await titleDiv.textContent();
      titleList.push(title?.trim());
    }
    expect(titleList).toEqual(expectedTitles);
    console.log('✅ Title fields match expected titles.');
    
    // Assertion: Kiểm tra có đủ fields không
    expect(count).toBeGreaterThan(0);

    // điền họ và tên NYCTT
    const fullNameField = page.locator('div[name^="datapoint-"]').filter({
      has: page.locator('div:has-text("Họ và tên NYCTT")')
    }).first();
    const inputLocator = fullNameField.locator('input[type="text"]');
    await inputLocator.fill('Nguyễn Văn A');
    console.log('Đã điền họ và tên NYCTT.');
    // đợi 3s cho form state update
    await page.waitForTimeout(3000);
    // kiểm tra lại giá trị đã điền
    const filledValue = await inputLocator.inputValue();
    expect(filledValue).toBe('Nguyễn Văn A');
    console.log('✅ Kiểm tra lại giá trị họ và tên NYCTT đã điền đúng.');
    await page.screenshot({ path: 'artifacts/test-results/man-xac-nhan-ho-va-ten-nyctt.png', fullPage: true });


    const chuanhoaField = page.locator('div[name^="datapoint-"]').filter({
      has: page.locator('div:has-text("Chuẩn hóa")')
    }).nth(0);
    const chuanhoaValue = await chuanhoaField.locator('#benhvien').inputValue();
    console.log(`Giá trị Chuẩn hóa: ${chuanhoaValue}`);
    if (chuanhoaValue?.trim() === '') {
      // điền giá trị chuẩn hóa
      const chuanhoaInput = chuanhoaField.locator('#benhvien');
      await chuanhoaInput.fill('Chuẩn hóa Test');
      console.log('Đã điền giá trị Chuẩn hóa.');
      // đợi 3s cho form state update
      await page.waitForTimeout(3000);
      // kiểm tra lại giá trị đã điền
      const filledChuanhoaValue = await chuanhoaInput.inputValue();
      expect(filledChuanhoaValue).toBe('Chuẩn hóa Test');
      console.log('✅ Kiểm tra lại giá trị Chuẩn hóa đã điền đúng.');
    }


    const moTaNguyenNhanField = page.locator('div[name^="datapoint-"]').filter({
      has: page.locator('div:has-text("Mô tả nguyên nhân")')
    }).first();
    const moTaNguyenNhanInput = moTaNguyenNhanField.locator('textarea');
    const moTaNguyenNhanValue = await moTaNguyenNhanInput.inputValue();
    console.log(`Giá trị Mô tả nguyên nhân: ${moTaNguyenNhanValue}`);
    if (moTaNguyenNhanValue.trim() === '') {
      // điền giá trị mô tả nguyên nhân
      await moTaNguyenNhanInput.fill('Mô tả nguyên nhân Test');
      console.log('Đã điền giá trị Mô tả nguyên nhân.');
      // đợi 3s cho form state update
      await page.waitForTimeout(3000);
      // kiểm tra lại giá trị đã điền
      const filledMoTaNguyenNhanValue = await moTaNguyenNhanInput.inputValue();
      expect(filledMoTaNguyenNhanValue).toBe('Mô tả nguyên nhân Test');
      console.log('✅ Kiểm tra lại giá trị Mô tả nguyên nhân đã điền đúng.');
    }


  });
  await test.step(' Kiểm tra nội dung màn chi phí', async () => {
    // đến trang chi phí
    const costTabSelector = 'div[role="tab"]:has-text("Chi Phí")';
    await page.click(costTabSelector);
    await page.waitForTimeout(3000); // chờ trang chi phí load
    console.log('Đã vào tab Chi Phí.');
    const tonghopchiphichungTableSelector = '.ant-table-wrapper.table__tongHopChiPhiChung';
    const scrollContainerSelector = '#scroll-container:nth-child(2)';

    await test.step('Thêm Quyền lợi bảo hiểm', async () => {
      const addBenefitSelector = `${tonghopchiphichungTableSelector} thead.ant-table-thead .ant-table-cell:nth-child(2) .ant-select-selector .ant-select-selection-search input`;
      await page.click(addBenefitSelector);
      const optionSelector = `.rc-virtual-list-holder-inner .ant-select-item-option:first-child`;
      await page.click(optionSelector);
      console.log('Đã click thêm Quyền lợi bảo hiểm.');
      const spinnerSelector = '.ant-select-arrow.ant-select-arrow-loading';
      // sleep 1s
      await page.waitForTimeout(1000);
      // đợi spinner biến mất
      await page.waitForSelector(spinnerSelector, { state: 'detached', timeout: 10000 });
      console.log('Spinner thêm quyền lợi đã biến mất.');
    })

    await test.step('Kiểm tra nhập Tiền YCBT tổng hợp chi phí chung', async () => {
      const inputTienYCBTSelector = `${tonghopchiphichungTableSelector} #field_name`;
      const tienYCBTInput = page.locator(inputTienYCBTSelector).nth(1); // lấy input thứ 2 (cột Số tiền KH YCBT)
      // clear input trước
      await tienYCBTInput.fill('');
      await page.waitForTimeout(2000);
      // điền giá trị 5000000
      await tienYCBTInput.fill('5000000');
      console.log('Đã điền Số tiền KH YCBT.');

      await page.waitForTimeout(3000);

      // kiểm tra lại giá trị đã điền
      const filledTienYCBTValue = await tienYCBTInput.inputValue();
      expect(filledTienYCBTValue).toBe('5.000.000');
      console.log('✅ Kiểm tra lại giá trị Số tiền KH YCBT đã điền đúng.');

      const footerTotalSelector = `${tonghopchiphichungTableSelector} .money:has-text("Số tiền chi trả bồi thường:") .money-content`;
      const totalText = await page.locator(footerTotalSelector).textContent();
      console.log(`Giá trị tổng số tiền chi trả bồi thường ở footer: ${totalText}`);
      expect(totalText?.replace(/\D/g, '')).toBe('5000000');
      console.log('✅ Kiểm tra tổng số tiền chi trả bồi thường ở footer đúng.');

    })

    await test.step('Kiểm tra nhập Hạng mục từ chối ở bảng tổng hợp chi phí chung', async () => {
      const tuchoi = `${tonghopchiphichungTableSelector} #field_name`;
      const hangMucTuChoiInput = page.locator(tuchoi).nth(2); // lấy input thứ 3 (cột Hạng mục từ chối)

      // clear input trước
      await hangMucTuChoiInput.fill('');
      await page.waitForTimeout(2000);
      // điền giá trị "Hạng mục từ chối Test"
      await hangMucTuChoiInput.fill('1000000');
      console.log('Đã điền Hạng mục từ chối.');
      await page.waitForTimeout(3000);
      // kiểm tra lại giá trị đã điền
      const filledHangMucTuChoiValue = await hangMucTuChoiInput.inputValue();
      expect(filledHangMucTuChoiValue).toBe('1.000.000');
      console.log('✅ Kiểm tra lại giá trị Hạng mục từ chối đã điền đúng.');

      // kiểm tra tổng số tiền chi trả bồi thường ở footer có giảm đi 1000000 không
      const footerTotalSelector = `${tonghopchiphichungTableSelector} .money:has-text("Số tiền chi trả bồi thường:") .money-content`;
      const totalText = await page.locator(footerTotalSelector).textContent();
      console.log(`Giá trị tổng số tiền chi trả bồi thường ở footer sau khi từ chối: ${totalText}`);
      expect(totalText?.replace(/\D/g, '')).toBe('4000000');
      console.log('✅ Kiểm tra tổng số tiền chi trả bồi thường ở footer đúng sau khi từ chối.');
    })

    // await test.step('kiểm tra scroll khi click cảnh báo', async () => {
    //   const warningIconSelector = `${tonghopchiphichungTableSelector} .ant-table-footer ul.ul-list li:first-child b:first-child`;
    //   await page.click(warningIconSelector);
    //   console.log('Đã click cảnh báo ở footer bảng tổng hợp chi phí chung.');
    //   // đợi 1s cho scroll hoàn tất
    //   await page.waitForTimeout(1000);
    //   // kiểm tra màn hình có scroll xuống không
    //   const scrollY = await page.evaluate((selector) => {
    //     const element = document.querySelector(selector);
    //     return element ? element.scrollTop : 0;
    //   }, scrollContainerSelector);
    //   expect(scrollY).toBeGreaterThan(0);
    //   console.log('✅ Kiểm tra màn hình đã scroll xuống khi click cảnh báo.');
    // })
    await test.step('Kiểm tra tích từ chối ở bảng tổng hợp chi phí ngoài thuốc', async () => {
      const tonghopchiphingoaithuocTableSelector = '#tonghopchiphingoaithuoc';
      await page.click(`${tonghopchiphingoaithuocTableSelector}`)

      const rejectCheckboxsSelector = `${tonghopchiphingoaithuocTableSelector} tbody .ant-checkbox-input[checked]`;
      //click random 1 checkbox
      const checkboxCount = await page.locator(rejectCheckboxsSelector).count();
      if (checkboxCount === 0) {
        console.log('Không có checkbox nào đã được tích để từ chối.');
      } else {
        const randomIndex = Math.floor(Math.random() * checkboxCount);
        await page.locator(rejectCheckboxsSelector).nth(randomIndex).click();
        console.log(`Đã click từ chối checkbox thứ ${randomIndex + 1} trong tổng số ${checkboxCount} checkbox đã tích.`);
      }
      // kiểm tra có collapse có text là AI DIỄN GIẢI TỪ CHỐI TỰ ĐỘNG trong bảng tổng hợp chi phí chung không
      const collapseSelector = `${tonghopchiphichungTableSelector} .ant-collapse-item .ant-collapse-header:has-text("AI DIỄN GIẢI TỪ CHỐI TỰ ĐỘNG")`;
      await page.waitForSelector(collapseSelector, { timeout: 10000 });
    })


    await test.step('Kiểm tra nút đồng bộ đã enabled', async () => {
      const syncButtonSelector = 'button:has-text("Đồng Bộ")';
      // Kiểm tra nút đồng bộ có đang enabled không
      const isDisabled = await page.locator(syncButtonSelector).getAttribute('disabled');
      expect(isDisabled).toBeNull();
      console.log('✅ Nút Đồng Bộ đang ở trạng thái enabled.');
    });
  });
});


test('Bổ sung hồ sơ', async ({ page }) => {
  test.setTimeout(5 * 60 * 1000); // 5 phút
  // Đã đăng nhập sẵn qua storageState - không cần login nữa!
  await test.step('Vào trang folder chi tiết', async () => {
    await page.goto('/folders', { waitUntil: 'domcontentloaded' });
    console.log('Đã vào trang folders (đã đăng nhập sẵn qua storageState).');
    await page.click('.ant-table-row:nth-child(1) .ant-table-cell:nth-child(1) .editable-cell-value-wrap'); // Click vào thư mục đầu tiên
    await page.waitForURL(/folders\/\d+/);
    console.log('Đã vào trang folder chi tiết.');
  });
  await test.step('Vào chi tiết hồ sơ', async () => {
    await page.click('.ant-table-row:nth-child(1)'); // Click vào tài liệu đầu tiên
    // Chờ drawer chi tiết hồ sơ xuất hiện
    const detailDrawerSelector = '.ant-drawer-content';
    await page.waitForSelector(detailDrawerSelector, { timeout: 10000 });
    console.log('Đã vào chi tiết hồ sơ (drawer chi tiết đã xuất hiện).');
  });
  await test.step('Thêm tài liệu bổ sung', async () => {
    const uploadSupplementButtonSelector = 'button:has-text("Bổ sung hồ sơ")';
    await page.click(uploadSupplementButtonSelector);
    console.log('Đã click nút "Bổ sung hồ sơ".');
    // Chờ dialog tải lên xuất hiện
    const dialogSelector = '.ant-modal-content';
    await page.waitForSelector(dialogSelector, { timeout: 5000 });
    console.log('Dialog tải lên bổ sung hồ sơ đã xuất hiện.');
    // Tải file lên
    const filePath = require('path').resolve(__dirname, '../fixtures/790054_splitted.pdf');
    console.log(`File path resolved: ${filePath}`);
    const fs = require('fs');
    const fileExists = fs.existsSync(filePath);
    console.log(`File exists: ${fileExists}`);
    if (!fileExists) {
      throw new Error(`File not found: ${filePath}`);
    }
    const fileInput = await page.locator(`${dialogSelector} input[type="file"]`);
    await fileInput.setInputFiles(filePath);
    console.log(`Đã set file bổ sung: ${filePath}`);
    // ấn nút bổ sung
    await page.click(`${dialogSelector} button:has-text("Bổ sung")`);
    console.log('Đã click nút "Bổ sung" trong dialog.');
    // Chờ modal đóng lại
    await page.waitForSelector(dialogSelector, { state: 'hidden', timeout: 15000 });
    console.log('Modal bổ sung hồ sơ đã đóng lại.');

    await page.waitForTimeout(5000); // Chờ thêm 5s để file xuất hiện trong danh sách 
  });
  // chờ ocr processing hoàn tất
  await test.step('Chờ OCR processing hoàn tất', async () => {
    // chờ tương tự như trong test tải tài liệu lên
    const fileRowSelector = `.ant-table-row:last-child .ant-table-cell:nth-child(2)`;
    await page.waitForSelector(fileRowSelector, { timeout: 10000 });
    console.log('File bổ sung row đã xuất hiện.');
    console.log('⏳ Đang đợi xử lý tài liệu bổ sung...');
    const maxWaitTime = 10 * 60 * 1000;
    const startTime = Date.now();
    while (Date.now() - startTime < maxWaitTime) {
      const spanCount = await page.locator(`${fileRowSelector} span`).count();
      if (spanCount === 0) {
        console.log('✅ Loading icon đã biến mất cho file bổ sung!');
        break;
      }
      if ((Date.now() - startTime) % 10000 < 1000) {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        console.log(`  ⏱️  Đã đợi ${elapsed}s... (còn loading)`);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    const finalSpanCount = await page.locator(`${fileRowSelector} span.anticon-loading`).count();
    if (finalSpanCount > 0) {
      throw new Error(`Timeout sau ${maxWaitTime / 1000}s, loading icon vẫn chưa biến mất cho file bổ sung!`);
    }
    // kiểm tra màu nền
    const divLocator = page.locator(`${fileRowSelector} div`);
    await divLocator.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✅ Upload bổ sung completed.');
    const backgroundColor = await divLocator.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    console.log(`📊 Background color của file bổ sung: ${backgroundColor}`);
    await expect(divLocator).toHaveCSS('background-color', 'rgb(35, 105, 246)');
    console.log('✅ Background color đúng (#2369f6) cho file bổ sung. => ocr processing hoàn tất.');
  });
});


test('Xóa folder', async ({ page }) => {
  test.setTimeout(2 * 60 * 1000); // 2 phút
  // Đã đăng nhập sẵn qua storageState - không cần login nữa!
  await page.goto('/folders', { waitUntil: 'domcontentloaded' });
  console.log('Đã vào trang folders (đã đăng nhập sẵn qua storageState).');
  const e2e_folder_selector = '.ant-table-row:has-text("E2E Test Folder")';
  await page.waitForSelector(e2e_folder_selector, { timeout: 10000 });
  console.log('Đã tìm thấy folder E2E Test Folder.');
  await page.click(`${e2e_folder_selector} span[aria-label="setting"]`);
  console.log('Đã click nút cài đặt của folder.');
  await page.waitForURL(/folders\/\d+\/general/, { timeout: 10000 });
  console.log('Đã vào trang cài đặt folder.');
  const deleteButtonSelector = 'button:has-text("Xóa Thư Mục")';
  await page.waitForSelector(deleteButtonSelector, { timeout: 10000 });
  await page.click(deleteButtonSelector);
  console.log('Đã click nút "Xóa Thư Mục".');
  const inputNameForDeleteSelector = '#name';
  await page.waitForSelector(inputNameForDeleteSelector, { timeout: 5000 });
  await page.fill(inputNameForDeleteSelector, 'E2E Test Folder');
  console.log('Đã điền tên folder để xác nhận xóa.');
  await page.waitForTimeout(1000); // đợi 1s cho button enabled
  const confirmDeleteButtonSelector = '.ant-btn.ant-btn-primary:has-text("Xóa")';
  await page.click(confirmDeleteButtonSelector);
  console.log('Đã click nút xác nhận xóa folder.');
  // Chờ điều hướng về trang /folders
  await page.waitForURL('/folders', { timeout: 10000 });
  console.log('Đã điều hướng về trang /folders sau khi xóa folder.');
  // Check thông báo thành công
  const successNotificationSelector = '.ant-notification-notice.ant-notification-notice-success.ant-notification-notice-closable';
  await page.waitForSelector(successNotificationSelector, { timeout: 5000 });
  console.log('Đã nhận được thông báo xóa folder thành công.');
});
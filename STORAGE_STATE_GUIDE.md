# 🔐 Authentication với Storage State

Framework này sử dụng Playwright Storage State để quản lý authentication hiệu quả hơn.

## ✨ Ưu điểm

- ✅ **Login 1 lần duy nhất** - Tái sử dụng session cho tất cả tests
- ✅ **Nhanh hơn nhiều** - Không cần login lại mỗi test
- ✅ **An toàn** - Credentials chỉ xuất hiện trong global-setup
- ✅ **Không lộ credentials trong report** - Trace không ghi lại login steps

## 📁 Cấu trúc

```
.auth/
├── .gitkeep          # Giữ folder trong git
├── tpa-user.json     # Storage state cho TPA (gitignored)
└── pvi-user.json     # Storage state cho PVI (gitignored)

global-setup.ts       # Setup login 1 lần trước khi chạy tests
playwright.config.ts  # Config sử dụng storageState
```

## 🚀 Cách hoạt động

### 1. Global Setup (Chạy 1 lần đầu tiên)

`global-setup.ts` sẽ:
1. Launch browser
2. Login với credentials từ `.env`
3. Lưu cookies/localStorage vào `.auth/tpa-user.json`
4. Close browser

### 2. Tests (Tái sử dụng session)

Mỗi test sẽ:
1. Load storage state từ `.auth/tpa-user.json`
2. Đã đăng nhập sẵn - không cần login lại!
3. Chạy test logic

## 📝 Cách sử dụng

### Trong tests đã authenticated

```typescript
test('Thêm thư mục', async ({ page }) => {
  // Đã đăng nhập sẵn! Chỉ cần goto
  await page.goto('/folders');
  
  // Test logic...
});
```

### Trong tests cần test login (không dùng storageState)

```typescript
test('Form đăng nhập hoạt động', async ({ browser }) => {
  // Tạo context MỚI không có storageState
  const context = await browser.newContext({ 
    storageState: undefined 
  });
  const page = await context.newPage();
  
  // Test login
  await page.goto('/login');
  await page.fill('#email', 'test@example.com');
  await page.fill('#password', 'password');
  await page.click('button[type=submit]');
  
  await context.close();
});
```

## 🔄 Refresh Storage State

Storage state có thể hết hạn. Để refresh:

### Option 1: Xóa file và chạy lại

```bash
# Xóa storage state cũ
rm .auth/*.json

# Chạy lại tests - global-setup sẽ tạo lại
docker run --rm -it --env-file .env \
  -v "${PWD}/artifacts:/artifacts" \
  -v "${PWD}/tests:/runner/tests" \
  -v "${PWD}/playwright.config.ts:/runner/playwright.config.ts" \
  -v "${PWD}/.auth:/runner/.auth" \
  -v "${PWD}/global-setup.ts:/runner/global-setup.ts" \
  e2e-playwright-e2e --project=tpa-chrome
```

### Option 2: Force chạy global-setup

```bash
# Global setup sẽ tự động chạy mỗi lần
```

## 🐳 Docker Setup

Khi chạy trong Docker, cần mount thêm volumes:

```bash
docker run --rm -it \
  --env-file .env \
  -v "${PWD}/artifacts:/artifacts" \
  -v "${PWD}/tests:/runner/tests" \
  -v "${PWD}/playwright.config.ts:/runner/playwright.config.ts" \
  -v "${PWD}/.auth:/runner/.auth" \                    # ← Mount .auth
  -v "${PWD}/global-setup.ts:/runner/global-setup.ts" \ # ← Mount global-setup
  e2e-playwright-e2e --project=tpa-chrome
```

## 🔍 Troubleshooting

### Storage state không work

1. **Kiểm tra file tồn tại:**
   ```bash
   ls -la .auth/
   ```

2. **Xem nội dung storage state:**
   ```bash
   cat .auth/tpa-user.json
   ```
   
   Phải có `cookies` và `origins`

3. **Re-generate storage state:**
   ```bash
   rm .auth/*.json
   # Chạy lại tests
   ```

### Test vẫn redirect về /login

- Storage state đã hết hạn
- Cookies domain không match
- Session timeout

**Giải pháp:** Xóa và tạo lại storage state

## 📊 So sánh với cách cũ

### Cách cũ (Login mỗi test)

```typescript
test('Test 1', async ({ page }) => {
  await page.goto('/login');
  await page.fill('#email', '...');  // ← Lộ trong trace
  await page.fill('#password', '...'); // ← Lộ trong trace
  await page.click('button[type=submit]');
  // Test logic
});

test('Test 2', async ({ page }) => {
  await page.goto('/login');
  await page.fill('#email', '...');  // ← Lặp lại
  await page.fill('#password', '...'); // ← Lặp lại
  await page.click('button[type=submit]');
  // Test logic
});
```

**Thời gian:** ~5-10s mỗi test cho login

### Cách mới (Storage State)

```typescript
// global-setup.ts - Chạy 1 lần
async function globalSetup() {
  // Login 1 lần, lưu vào .auth/tpa-user.json
}

// Tests - Đã đăng nhập sẵn
test('Test 1', async ({ page }) => {
  await page.goto('/folders'); // ← Đã đăng nhập!
  // Test logic
});

test('Test 2', async ({ page }) => {
  await page.goto('/folders'); // ← Đã đăng nhập!
  // Test logic
});
```

**Thời gian:** ~0s cho login mỗi test (đã đăng nhập sẵn)

## 🎯 Best Practices

1. **Gitignore storage state files:**
   ```gitignore
   .auth/*.json
   ```

2. **Mount volumes khi dùng Docker:**
   - Mount `.auth/` để persist storage state
   - Mount `global-setup.ts` để chạy setup

3. **Refresh định kỳ:**
   - Xóa `.auth/*.json` trước mỗi build CI/CD
   - Hoặc set expiry time

4. **Separate contexts cho login tests:**
   - Dùng `browser.newContext({ storageState: undefined })`
   - Test login flow độc lập

## 📚 Tài liệu

- [Playwright Authentication Guide](https://playwright.dev/docs/auth)
- [Storage State API](https://playwright.dev/docs/api/class-browsercontext#browser-context-storage-state)

## 1. Cài Đặt Project

### Bước 1: Clone repository

```bash
# Clone về máy
git clone https://github.com/YOUR_USERNAME/e2e-playwright.git

# Di chuyển vào thư mục
cd e2e-playwright
```

### Bước 2: Pull Docker Image (Nhanh nhất)

```bash
# Pull image có sẵn từ Docker Hub
docker pull haido2402/e2e-playwright-e2e:latest

# Đổi tên image cho tiện (optional)
docker tag haido2402/e2e-playwright-e2e:latest e2e-playwright-e2e
```

**HOẶC** Build từ source (nếu muốn tự build):

```powershell
# Windows PowerShell
docker build -f docker/Dockerfile -t e2e-playwright-e2e .

# Linux/Mac
docker build -f docker/Dockerfile -t e2e-playwright-e2e .
```

⏱️ Build mất khoảng 5-10 phút lần đầu.

### Bước 3: Verify image

```bash
docker images | grep e2e-playwright-e2e
# Kết quả: e2e-playwright-e2e   latest   xxxxx   xxx MB
```

---

## 2. Cấu Hình

### Bước 1: Tạo file .env

**Windows PowerShell:**
```powershell
# Nếu có file .env.example
Copy-Item .env.example .env

# Hoặc tạo mới
New-Item -Path .env -ItemType File
```

**Linux/Mac:**
```bash
# Nếu có file .env.example
cp .env.example .env

# Hoặc tạo mới
touch .env
```

### Bước 2: Điền thông tin credentials

Mở file `.env` bằng text editor (VS Code, Notepad++, v.v.) và thêm:

```env
# TPA Application
TPA_BASE_URL=http://192.168.1.23:3000
TPA_TEST_EMAIL=test@example.com
TPA_TEST_PASSWORD=YourPassword123

# PVI Application (nếu có)
PVI_BASE_URL=http://192.168.1.23:4000
PVI_TEST_EMAIL=pvi@example.com
PVI_TEST_PASSWORD=PviPassword456
```

### Bước 3: Tìm địa chỉ IP của máy

**⚠️ Quan trọng:** Không dùng `localhost` khi chạy Docker!

**Windows:**
```powershell
ipconfig

# Tìm dòng "IPv4 Address" của Ethernet hoặc Wi-Fi
# Ví dụ: 192.168.1.23
```

**Linux/Mac:**
```bash
ifconfig

# Hoặc
ip addr show

# Tìm inet của eth0 hoặc wlan0
# Ví dụ: 192.168.1.23
```

**Thay đổi trong .env:**
```env
TPA_BASE_URL=http://192.168.1.23:3000  # ← Thay 192.168.1.23 bằng IP thực của bạn
```

### Bước 4: Kiểm tra ứng dụng đang chạy

```bash
# Test từ máy host
curl http://192.168.1.23:3000

# Hoặc mở trình duyệt
# http://192.168.1.23:3000
```

✅ Nếu thấy nội dung HTML → OK  
❌ Nếu báo lỗi → Kiểm tra lại ứng dụng có đang chạy không

---

## 4. Chạy Test

### 🚀 Cách 1: Chạy với Docker (Khuyến nghị)

#### 4.1. Chạy tất cả tests của 1 project:
**Windows PowerShell:**
```powershell
docker run --rm -it `
  --env-file .env `
  -v "${PWD}/artifacts:/artifacts" `
  -v "${PWD}/tests:/runner/tests" `
  -v "${PWD}/playwright.config.ts:/runner/playwright.config.ts" `
  haido2402/e2e-playwright-e2e:latest --project=tpa-chrome
```

**Linux/Mac:**
```bash
docker run --rm -it \
  --env-file .env \
  -v "$(pwd)/artifacts:/artifacts" \
  -v "$(pwd)/tests:/runner/tests" \
  -v "$(pwd)/playwright.config.ts:/runner/playwright.config.ts" \
  haido2402/e2e-playwright-e2e:latest --project=tpa-chrome
```

**Giải thích:**
- `--rm`: Tự động xóa container sau khi chạy xong
- `-it`: Interactive terminal (xem output realtime)
- `--env-file .env`: Load biến môi trường từ file .env
- `-v`: Mount thư mục từ host vào container
  - `artifacts`: Lưu kết quả test
  - `tests`: Mount code test (có thể sửa test mà không cần rebuild)
  - `playwright.config.ts`: Mount config file
- `--project=tpa-chrome`: Chỉ chạy project tpa-chrome

#### 4.2. Chạy tất cả projects:

```powershell
# Windows
docker run --rm -it `
  --env-file .env `
  -v "${PWD}/artifacts:/artifacts" `
  -v "${PWD}/tests:/runner/tests" `
  -v "${PWD}/playwright.config.ts:/runner/playwright.config.ts" `
  haido2402/e2e-playwright-e2e:latest
```

```bash
# Linux/Mac
docker run --rm -it \
  --env-file .env \
  -v "$(pwd)/artifacts:/artifacts" \
  -v "$(pwd)/tests:/runner/tests" \
  -v "$(pwd)/playwright.config.ts:/runner/playwright.config.ts" \
  haido2402/e2e-playwright-e2e:latest
```

#### 4.3. Chạy 1 test file cụ thể:

```powershell
# Windows
docker run --rm -it `
  --env-file .env `
  -v "${PWD}/artifacts:/artifacts" `
  -v "${PWD}/tests:/runner/tests" `
  -v "${PWD}/playwright.config.ts:/runner/playwright.config.ts" `
  haido2402/e2e-playwright-e2e:latest tests/tpa/test.spec.ts
```

#### 4.4. Chạy với nhiều workers (song song):

```powershell
# Windows - Chạy với 2 workers
docker run --rm -it `
  --env-file .env `
  -v "${PWD}/artifacts:/artifacts" `
  -v "${PWD}/tests:/runner/tests" `
  -v "${PWD}/playwright.config.ts:/runner/playwright.config.ts" `
  haido2402/e2e-playwright-e2e:latest --project=tpa-chrome --workers=2
```

**Lưu ý:** Workers càng nhiều, test chạy càng nhanh, nhưng tốn nhiều tài nguyên hơn.

#### 4.5. Tạo alias cho lệnh dài (Optional)

**Windows PowerShell:**

Tạo file `run-test.ps1`:
```powershell
param(
    [string]$Project = "",
    [int]$Workers = 1
)

$projectArg = if ($Project) { "--project=$Project" } else { "" }
$workersArg = "--workers=$Workers"

docker run --rm -it `
  --env-file .env `
  -v "${PWD}/artifacts:/artifacts" `
  -v "${PWD}/tests:/runner/tests" `
  -v "${PWD}/playwright.config.ts:/runner/playwright.config.ts" `
  haido2402/e2e-playwright-e2e:latest $projectArg $workersArg
```

Sử dụng:
```powershell
.\run-test.ps1 -Project tpa-chrome
.\run-test.ps1 -Project tpa-chrome -Workers 2
.\run-test.ps1  # Chạy tất cả
```

**Linux/Mac:**

Tạo file `run-test.sh`:
```bash
#!/bin/bash

PROJECT=${1:-""}
WORKERS=${2:-1}

docker run --rm -it \
  --env-file .env \
  -v "$(pwd)/artifacts:/artifacts" \
  -v "$(pwd)/tests:/runner/tests" \
  -v "$(pwd)/playwright.config.ts:/runner/playwright.config.ts" \
  haido2402/e2e-playwright-e2e:latest \
  ${PROJECT:+--project=$PROJECT} --workers=$WORKERS
```

```bash
chmod +x run-test.sh
./run-test.sh tpa-chrome
./run-test.sh tpa-chrome 2
./run-test.sh  # Chạy tất cả
```

### 🖥️ Cách 2: Chạy local (Không Docker)

#### Cài đặt dependencies:

```bash
npm install
npx playwright install chromium
```

#### Chạy tests:

```bash
# Chạy tất cả
npx playwright test

# Chạy 1 project
npx playwright test --project=tpa-chrome

# Chạy 1 file
npx playwright test tests/tpa/test.spec.ts

# Chạy với UI mode (debug)
npx playwright test --ui

# Chạy với headed mode (xem trình duyệt)
npx playwright test --headed
```

---

## Kho lịch sử các lần chạy

Mỗi lần `./run-and-host.sh <project>` sẽ lưu kết quả thành một thư mục riêng trong
`artifacts/runs/<YYYY-MM-DD_HHMMSS_project>/` và sinh lại trang danh sách.

- Danh sách mọi lần chạy: `http://<server>:9323/`
- Một lần chạy cụ thể: `http://<server>:9323/<run-id>/` — URL này không bao giờ đổi,
  dán vào ticket được.

Video và trace chỉ giữ cho **20 lần chạy gần nhất** (`KEEP_ATTACHMENTS` trong
`run-and-host.sh`). Các lần cũ hơn vẫn mở được báo cáo — tên test, từng bước, thông báo
lỗi — nhưng bấm video sẽ không ra; trang danh sách đánh dấu "đã dọn bằng chứng".

Quản lý server: `./manage-report.sh start|stop|status|logs|url|reindex`.

Server chạy bằng `nohup` nên không sống qua lần khởi động lại máy; sau khi reboot cần
chạy `./manage-report.sh start`.

---

## 5. Xem Kết Quả

### 📊 Kết quả test lưu trong `artifacts/`:

```
artifacts/
├── results.xml              # JUnit XML report (dùng cho CI/CD)
├── test-results/            # Chi tiết từng test
│   ├── test-name-chromium/
│   │   ├── screenshot.png   # Screenshot khi fail
│   │   ├── video.webm      # Video recording
│   │   └── trace.zip       # Trace file (debug)
└── playwright-report/       # HTML report đẹp
    └── index.html
```

### 5.1. Xem HTML Report (Khuyến nghị)

**Cách 1: Dùng Playwright CLI**
```bash
npx playwright show-report artifacts/playwright-report
```

Trình duyệt sẽ tự động mở report với:
- ✅ Tổng quan: Pass/Fail/Skip
- 🔍 Chi tiết từng test
- 📸 Screenshots, videos
- ⏱️ Thời gian chạy

**Cách 2: Mở trực tiếp file HTML**
```powershell
# Windows
explorer .\artifacts\playwright-report\index.html

# Linux
xdg-open ./artifacts/playwright-report/index.html

# Mac
open ./artifacts/playwright-report/index.html
```

### 5.2. Xem Screenshots và Videos

```powershell
# Windows
explorer .\artifacts\test-results

# Linux
xdg-open ./artifacts/test-results

# Mac
open ./artifacts/test-results
```

### 5.3. Phân tích Trace (Debug chi tiết)

Khi test fail, Playwright tạo file `trace.zip`:

```bash
npx playwright show-trace artifacts/test-results/[test-name]/trace.zip
```

Trace viewer cho phép:
- Xem từng bước test
- Inspect DOM tại mỗi thời điểm
- Xem network requests
- Console logs
---

## 6. Thêm Test Mới

### 6.1. Tạo file test mới

Ví dụ tạo test cho tính năng Upload:

**Tạo file:** `tests/tpa/upload.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { testCredentials, validateCredentials } from '../helpers/credentials';

// Validate credentials trước khi chạy test
test.beforeAll(() => {
    validateCredentials('tpa');
});

test.describe('File Upload Feature', () => {
    
    test.beforeEach(async ({ page }) => {
        // Login trước mỗi test
        await page.goto('/login');
        await page.fill('#email', testCredentials.tpa.email);
        await page.fill('#password', testCredentials.tpa.password);
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(/dashboard/);
    });

    test('should upload file successfully', async ({ page }) => {
        // Tăng timeout nếu upload chậm
        test.setTimeout(5 * 60 * 1000); // 5 phút

        // Navigate to upload page
        await page.goto('/upload');

        // Upload file
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles('path/to/test-file.pdf');

        // Click upload button
        await page.click('button:has-text("Upload")');

        // Wait for success message
        await expect(page.locator('.success-message')).toBeVisible({ timeout: 60000 });
    });

    test('should show error for invalid file type', async ({ page }) => {
        await page.goto('/upload');
        
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles('path/to/test.txt');
        
        await page.click('button:has-text("Upload")');
        
        await expect(page.locator('.error-message')).toContainText('Invalid file type');
    });
});
```

### 6.2. Chạy test mới

```bash
# Chạy chỉ file upload.spec.ts
npx playwright test tests/tpa/upload.spec.ts

# Hoặc với Docker
docker run --rm -it \
  --env-file .env \
  -v "$(pwd)/artifacts:/artifacts" \
  -v "$(pwd)/tests:/runner/tests" \
  -v "$(pwd)/playwright.config.ts:/runner/playwright.config.ts" \
  haido2402/e2e-playwright-e2e:latest tests/tpa/upload.spec.ts
```

---

## 7. Thêm Project Mới

Ví dụ: Thêm project cho ứng dụng "CRM"

### Bước 1: Cập nhật `playwright.config.ts`

```typescript
projects: [
    {
        name: 'pvi-chrome',
        use: { baseURL: process.env.PVI_BASE_URL || 'http://localhost:3000', ...devices['Desktop Chrome'] },
        testDir: 'tests/pvi',
    },
    {   
        name: 'tpa-chrome',
        use: { baseURL: process.env.TPA_BASE_URL || 'http://localhost:3000', ...devices['Desktop Chrome'] },
        testDir: 'tests/tpa',
    },
    // ✅ Thêm project CRM
    {   
        name: 'crm-chrome',
        use: { baseURL: process.env.CRM_BASE_URL || 'http://localhost:3000', ...devices['Desktop Chrome'] },
        testDir: 'tests/crm',
    },
],
```

### Bước 2: Tạo thư mục test

```bash
mkdir tests/crm
```

### Bước 3: Thêm credentials vào `.env`

```env
# CRM Application
CRM_BASE_URL=http://192.168.1.23:5000
CRM_TEST_EMAIL=crm@example.com
CRM_TEST_PASSWORD=CrmPassword789
```

### Bước 4: Cập nhật `tests/helpers/credentials.ts`

```typescript
export const testCredentials = {
    tpa: {
        email: process.env.TPA_TEST_EMAIL || '',
        password: process.env.TPA_TEST_PASSWORD || ''
    },
    pvi: {
        email: process.env.PVI_TEST_EMAIL || '',
        password: process.env.PVI_TEST_PASSWORD || ''
    },
    // ✅ Thêm CRM
    crm: {
        email: process.env.CRM_TEST_EMAIL || '',
        password: process.env.CRM_TEST_PASSWORD || ''
    }
};

export function validateCredentials(project: 'tpa' | 'pvi' | 'crm') {
    const creds = testCredentials[project];
    if (!creds.email || !creds.password) {
        throw new Error(`Missing ${project.toUpperCase()} credentials in environment variables`);
    }
}
```

### Bước 5: Tạo test đầu tiên

**Tạo file:** `tests/crm/login.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { testCredentials, validateCredentials } from '../helpers/credentials';

test.beforeAll(() => {
    validateCredentials('crm');
});

test.describe('CRM Login', () => {
    test('should login successfully', async ({ page }) => {
        await page.goto('/');
        
        await page.fill('#username', testCredentials.crm.email);
        await page.fill('#password', testCredentials.crm.password);
        await page.click('button[type="submit"]');
        
        await expect(page).toHaveURL(/dashboard/);
        await expect(page.locator('h1')).toContainText('Dashboard');
    });

    test('should show error for invalid credentials', async ({ page }) => {
        await page.goto('/');
        
        await page.fill('#username', 'wrong@example.com');
        await page.fill('#password', 'wrongpassword');
        await page.click('button[type="submit"]');
        
        await expect(page.locator('.error')).toContainText('Invalid credentials');
    });
});
```

### Bước 6: Chạy test

```bash
# Chạy CRM project
docker run --rm -it \
  --env-file .env \
  -v "$(pwd)/artifacts:/artifacts" \
  -v "$(pwd)/tests:/runner/tests" \
  -v "$(pwd)/playwright.config.ts:/runner/playwright.config.ts" \
  haido2402/e2e-playwright-e2e:latest --project=crm-chrome
```

---


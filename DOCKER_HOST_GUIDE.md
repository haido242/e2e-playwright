# 🚀 Hướng Dẫn Chạy Test và Host Report với Docker (Không dùng Docker Compose)

## 📦 Files đã tạo

1. **`run-and-host.sh`** - Script chính để chạy test và tự động host report
2. **`manage-report.sh`** - Script quản lý report server

---

## 🔧 Cài Đặt Trên Ubuntu Server

### Bước 1: Cài Docker

```bash
# Cài Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Thêm user vào docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify
docker --version
```

### Bước 2: Clone Project

```bash
# Clone repository
cd /opt
sudo git clone https://github.com/haido242/e2e-playwright.git
cd e2e-playwright

# Chuyển ownership
sudo chown -R $USER:$USER /opt/e2e-playwright
```

### Bước 3: Tạo file .env

```bash
cd /opt/e2e-playwright
nano .env
```

Nội dung:
```env
TPA_BASE_URL=http://192.168.1.23:3000
TPA_TEST_EMAIL=admin@gmail.com
TPA_TEST_PASSWORD=admin321

PVI_BASE_URL=http://192.168.1.23:3001
PVI_TEST_EMAIL=pvi@example.com
PVI_TEST_PASSWORD=pvipass123
```

### Bước 4: Cho phép execute scripts

```bash
chmod +x run-and-host.sh
chmod +x manage-report.sh
```

---

## 🚀 Sử Dụng

### Chạy Test và Host Report (All-in-one)

```bash
./run-and-host.sh
```

**Script sẽ tự động:**
1. ✅ Pull Docker image mới nhất
2. ✅ Stop report server cũ (nếu có)
3. ✅ Chạy E2E tests
4. ✅ Start Nginx container để host report
5. ✅ Hiển thị URL để xem report

**Output mẫu:**
```
=========================================
🚀 E2E Test Runner & Report Host
=========================================

📥 Pulling latest Docker image...
🛑 Stopping old report server (if exists)...
=========================================
🧪 Running E2E Tests
=========================================

[Test output...]

✅ Tests PASSED

=========================================
🌐 Starting Report Server
=========================================
✅ Report server started successfully

=========================================
📊 Test Results Summary
=========================================
  ✅ Passed: 5
  ❌ Failed: 0
  📝 Total:  5

=========================================
✅ Report is now available at:
=========================================
  🌐 http://192.168.1.100:9323
  🌐 http://localhost:9323
=========================================
```

---

## 🎛️ Quản Lý Report Server

### Start server

```bash
./manage-report.sh start
```

### Stop server

```bash
./manage-report.sh stop
```

### Restart server

```bash
./manage-report.sh restart
```

### Kiểm tra trạng thái

```bash
./manage-report.sh status
```

> **Đã đổi:** report không còn host bằng container nginx. Nay dùng
> `npx http-server` trỏ vào `artifacts/runs/`, quản lý bằng `./manage-report.sh`.
> Xem mục "Kho lịch sử các lần chạy" trong readme.md.

Output:
```
✅ Server ĐANG CHẠY (PID 12345)
📦 Số lần chạy trong kho: 3
```

### Xem logs

```bash
./manage-report.sh logs
```

### Hiển thị URL

```bash
./manage-report.sh url
```

---

## ⏰ Setup Auto Run với Cron

### Chạy test định kỳ và tự động update report

```bash
crontab -e
```

Thêm dòng:

```cron
# Chạy test mỗi ngày lúc 2h sáng
0 2 * * * /opt/e2e-playwright/run-and-host.sh >> /var/log/e2e-test.log 2>&1

# Hoặc chạy mỗi 6 tiếng
0 */6 * * * /opt/e2e-playwright/run-and-host.sh >> /var/log/e2e-test.log 2>&1

# Hoặc chạy mỗi giờ
0 * * * * /opt/e2e-playwright/run-and-host.sh >> /var/log/e2e-test.log 2>&1
```

### Xem log

```bash
tail -f /var/log/e2e-test.log
```

---

## 🔧 Docker Commands (Manual)

### Chạy test thủ công

```bash
docker run --rm \
  --env-file .env \
  -v "$(pwd)/artifacts:/artifacts" \
  -v "$(pwd)/tests:/runner/tests" \
  -v "$(pwd)/playwright.config.ts:/runner/playwright.config.ts" \
  haido2402/e2e-playwright-e2e:latest --project=tpa-chrome
```

### Start / stop / xem logs report server

> **Đã đổi:** report không còn host bằng container nginx. Nay dùng
> `npx http-server` trỏ vào `artifacts/runs/`, quản lý bằng `./manage-report.sh`.
> Xem mục "Kho lịch sử các lần chạy" trong readme.md.

```bash
./manage-report.sh start
./manage-report.sh stop
./manage-report.sh logs
./manage-report.sh status
```

---

## 🌐 Truy Cập Report

### Từ server (localhost)

```bash
curl http://localhost:9323
```

### Từ máy khác (LAN)

Mở trình duyệt: `http://SERVER_IP:9323`

Ví dụ: `http://192.168.1.100:9323`

### Tìm IP của server

```bash
# Cách 1
hostname -I

# Cách 2
ip addr show

# Cách 3
ifconfig
```

---

## 🔐 Bảo Mật với Firewall

### Mở port 9323

```bash
# Ubuntu với UFW
sudo ufw allow 9323/tcp
sudo ufw status

# CentOS/RHEL với firewalld
sudo firewall-cmd --permanent --add-port=9323/tcp
sudo firewall-cmd --reload
```

### Chỉ cho phép truy cập từ IP cụ thể

```bash
# Chỉ cho phép từ 192.168.1.0/24
sudo ufw allow from 192.168.1.0/24 to any port 9323
```

---

## 📊 Monitoring

### Kiểm tra server có đang chạy không

```bash
curl -I http://localhost:9323
# HTTP/1.1 200 OK → Server đang chạy
```

### Xem resource usage / logs realtime

> **Đã đổi:** report không còn host bằng container nginx. Nay dùng
> `npx http-server` trỏ vào `artifacts/runs/`, quản lý bằng `./manage-report.sh`.
> Xem mục "Kho lịch sử các lần chạy" trong readme.md.

```bash
./manage-report.sh logs
```

---

## 🐛 Troubleshooting

### Report server không start

> **Đã đổi:** report không còn host bằng container nginx. Nay dùng
> `npx http-server` trỏ vào `artifacts/runs/`, quản lý bằng `./manage-report.sh`.
> Xem mục "Kho lịch sử các lần chạy" trong readme.md.

```bash
# Kiểm tra port có bị chiếm không
sudo lsof -i :9323

# Kiểm tra thư mục kho có tồn tại không
ls -la artifacts/runs/

# Xem logs chi tiết
./manage-report.sh logs
```

### Port bị chiếm

Sửa port trong script:

```bash
nano run-and-host.sh
# Thay REPORT_PORT=9323 thành port khác

nano manage-report.sh
# Thay REPORT_PORT=9323 thành port khác
```

### Report không hiển thị

```bash
# Kiểm tra file index.html có tồn tại
ls -la artifacts/playwright-report/index.html

# Chạy lại test để generate report
./run-and-host.sh
```

---

## 📝 Workflow Hoàn Chỉnh

### Lần đầu setup

```bash
# 1. Clone project
cd /opt
git clone https://github.com/haido242/e2e-playwright.git
cd e2e-playwright

# 2. Tạo .env
nano .env

# 3. Cho phép execute
chmod +x *.sh

# 4. Chạy test lần đầu
./run-and-host.sh
```

### Hàng ngày

```bash
# Chạy test mới
./run-and-host.sh

# Hoặc nếu chỉ cần start lại server
./manage-report.sh restart
```

### Update code test

```bash
# Pull code mới
git pull

# Chạy lại test
./run-and-host.sh
```

---

## 💡 Tips

1. **Report server chạy persistent**: Server sẽ tự động restart khi server reboot (nhờ `--restart unless-stopped`)

2. **Xem report cũ**: Report server luôn serve report mới nhất từ `artifacts/playwright-report/`

3. **Multiple projects**: Sửa script để chạy nhiều projects:
   ```bash
   # Trong run-and-host.sh, thay thế dòng docker run bằng:
   for PROJECT in tpa-chrome pvi-chrome; do
       docker run --rm \
         --env-file .env \
         -v "${PROJECT_DIR}/artifacts:/artifacts" \
         -v "${PROJECT_DIR}/tests:/runner/tests" \
         -v "${PROJECT_DIR}/playwright.config.ts:/runner/playwright.config.ts" \
         "$IMAGE_NAME" --project=$PROJECT
   done
   ```

4. **Notification khi test xong**: Thêm curl để gửi webhook/Telegram:
   ```bash
   # Cuối file run-and-host.sh
   curl -X POST "https://api.telegram.org/bot<TOKEN>/sendMessage" \
     -d chat_id="<CHAT_ID>" \
     -d text="Test completed! View report: http://${SERVER_IP}:${REPORT_PORT}"
   ```

---

## 🎉 Kết Luận

Bạn đã có:
- ✅ Script tự động chạy test và host report
- ✅ Script quản lý report server
- ✅ Setup chạy định kỳ với cron
- ✅ Host report trên port 9323

**Chỉ cần chạy:** `./run-and-host.sh` → Report tự động available tại `http://SERVER_IP:9323` 🚀

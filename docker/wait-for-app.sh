#!/bin/bash
# Script để đợi app sẵn sàng trước khi chạy tests

set -e

URL="${BASE_URL:-http://localhost:5000}"
MAX_ATTEMPTS=30
SLEEP_TIME=2

echo "==> Đang kiểm tra app tại $URL..."

attempt=1
while [ $attempt -le $MAX_ATTEMPTS ]; do
  echo "Thử lần $attempt/$MAX_ATTEMPTS..."
  
  if curl -f -s -o /dev/null "$URL" || curl -s -o /dev/null -w "%{http_code}" "$URL" | grep -q "200\|301\|302\|404"; then
    echo "✓ App đã sẵn sàng tại $URL"
    exit 0
  fi
  
  echo "App chưa sẵn sàng, đợi ${SLEEP_TIME}s..."
  sleep $SLEEP_TIME
  attempt=$((attempt + 1))
done

echo "✗ CẢNH BÁO: Không thể kết nối tới app sau $MAX_ATTEMPTS lần thử"
echo "Vẫn tiếp tục chạy tests (có thể sẽ fail)..."
exit 0

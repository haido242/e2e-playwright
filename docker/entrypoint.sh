#!/bin/bash
set -euo pipefail

: "${ARTIFACT_DIR:=/artifacts}"
: "${BASE_URL:=http://localhost:3000}"
: "${PVI_BASE_URL:=${BASE_URL}}"
: "${TPA_BASE_URL:=${BASE_URL}}"
: "${PW_PROJECTS:=}"

echo "==> PVI_BASE_URL=$PVI_BASE_URL"
echo "==> TPA_BASE_URL=$TPA_BASE_URL"
mkdir -p "$ARTIFACT_DIR"

# Đợi app sẵn sàng cho TPA (hoặc PVI nếu được set)
export BASE_URL="${TPA_BASE_URL:-${PVI_BASE_URL}}"
/usr/local/bin/wait-for-app.sh

cd /runner

if [ -n "${PW_PROJECTS:-}" ]; then
  IFS=',' read -ra _P <<< "$PW_PROJECTS"
  ARGS=()
  for p in "${_P[@]}"; do
    p_trimmed="$(echo "$p" | xargs)"   # bỏ khoảng trắng
    [ -n "$p_trimmed" ] && ARGS+=(--project "$p_trimmed")
  done
  echo "==> Run with projects: ${ARGS[*]}"
  npx playwright test "${ARGS[@]}" || true
else
  # Không set PW_PROJECTS thì Playwright chạy tất cả project đã khai báo trong config
  npx playwright test || true
fi

# Thu thập báo cáo
echo "==> Collecting artifacts..."
if [ -d "./playwright-report" ]; then
  echo "  - Copying playwright-report..."
  cp -r ./playwright-report "$ARTIFACT_DIR"/ || echo "  ⚠ Failed to copy playwright-report"
fi

if [ -d "./test-results" ]; then
  echo "  - Copying test-results..."
  cp -r ./test-results "$ARTIFACT_DIR"/ || echo "  ⚠ Failed to copy test-results"
  # List files để debug
  echo "  - Test results files:"
  find ./test-results -type f | head -20
fi

echo "==> Done. Artifacts => $ARTIFACT_DIR"
ls -la "$ARTIFACT_DIR" 2>/dev/null || true


#!/bin/bash
set -euo pipefail

: "${ARTIFACT_DIR:=/artifacts}"
: "${BASE_URL:=http://localhost:3000}"
: "${PVI_BASE_URL:=${BASE_URL}}"
: "${TPA_BASE_URL:=${BASE_URL}}"
: "${DIGINOTES_BASE_URL:=${BASE_URL}}"
: "${PW_PROJECTS:=}"

echo "==> PVI_BASE_URL=$PVI_BASE_URL"
echo "==> TPA_BASE_URL=$TPA_BASE_URL"
echo "==> DIGINOTES_BASE_URL=$DIGINOTES_BASE_URL"
mkdir -p "$ARTIFACT_DIR"

cd /runner

# Parse arguments để xác định project nào được chọn
SELECTED_PROJECT=""
for arg in "$@"; do
  if [[ "$arg" == "--project="* ]]; then
    SELECTED_PROJECT="${arg#--project=}"
  fi
done

# Nếu có --project trong args, ưu tiên nó
if [ -z "$SELECTED_PROJECT" ] && [ -n "${PW_PROJECTS:-}" ]; then
  # Lấy project đầu tiên từ PW_PROJECTS
  IFS=',' read -r SELECTED_PROJECT _ <<< "$PW_PROJECTS"
  SELECTED_PROJECT="$(echo "$SELECTED_PROJECT" | xargs)"
fi

# Xác định BASE_URL dựa trên project được chọn
if [ -n "$SELECTED_PROJECT" ]; then
  if [[ "$SELECTED_PROJECT" == *"pvi"* ]]; then
    export BASE_URL="$PVI_BASE_URL"
    echo "==> Đang kiểm tra PVI app tại $BASE_URL..."
  elif [[ "$SELECTED_PROJECT" == *"tpa"* ]]; then
    export BASE_URL="$TPA_BASE_URL"
    echo "==> Đang kiểm tra TPA app tại $BASE_URL..."
  elif [[ "$SELECTED_PROJECT" == *"diginotes"* ]]; then
    export BASE_URL="$DIGINOTES_BASE_URL"
    echo "==> Đang kiểm tra Diginotes app tại $BASE_URL..."
  else
    export BASE_URL="${TPA_BASE_URL:-${PVI_BASE_URL}}"
    echo "==> Đang kiểm tra app 1 tại $BASE_URL..."
  fi
else
  # Không chọn project cụ thể, kiểm tra TPA mặc định
  export BASE_URL="${TPA_BASE_URL:-${PVI_BASE_URL}}"
  echo "==> Đang kiểm tra app 2 tại $BASE_URL..."
fi

/usr/local/bin/wait-for-app.sh

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
  # Pass tất cả arguments từ command line (bao gồm --project)
  echo "==> Run with args: $*"
  npx playwright test "$@" || true
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


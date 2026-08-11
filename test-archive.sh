#!/bin/bash
# Self-check cho lib/run-archive.sh và build-index.sh.
# Không framework: dựng dữ liệu giả trong mktemp -d rồi assert.
# Chạy: ./test-archive.sh

set -u
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "${SCRIPT_DIR}/lib/run-archive.sh"

FAILED=0

assert_eq() {
  local actual="$1" expected="$2" label="$3"
  if [ "$actual" = "$expected" ]; then
    echo "  ok   $label"
  else
    echo "  FAIL $label — mong đợi '$expected', nhận '$actual'"
    FAILED=1
  fi
}

assert_file() {
  if [ -f "$1" ]; then echo "  ok   $2"; else echo "  FAIL $2 — không thấy file $1"; FAILED=1; fi
}

assert_no_path() {
  if [ ! -e "$1" ]; then echo "  ok   $2"; else echo "  FAIL $2 — vẫn còn $1"; FAILED=1; fi
}

# Dựng một vùng đệm giả giống hệt cái container để lại
make_staging() {
  local staging="$1" total="$2" failed="$3"
  mkdir -p "${staging}/playwright-report/data"
  echo "<html>báo cáo giả</html>" > "${staging}/playwright-report/index.html"
  echo "video giả" > "${staging}/playwright-report/data/abc.webm"
  {
    echo '<testsuites>'
    local i=0
    while [ "$i" -lt "$total" ]; do echo '  <testcase name="t'"$i"'">'; echo '  </testcase>'; i=$((i + 1)); done
    i=0
    while [ "$i" -lt "$failed" ]; do echo '  <failure message="x"/>'; i=$((i + 1)); done
    echo '</testsuites>'
  } > "${staging}/results.xml"
}

echo "== archive_run =="
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
make_staging "$TMP" 9 2
RUN_DIR="$(archive_run "$TMP" "${TMP}/runs" "2026-08-11_120000_vbi-chrome" "vbi-chrome" "2026-08-11T12:00:00+07:00" 1)"

assert_file "${RUN_DIR}/index.html"   "báo cáo được chuyển vào thư mục lần chạy"
assert_file "${RUN_DIR}/results.xml"  "results.xml được chuyển vào thư mục lần chạy"
assert_file "${RUN_DIR}/meta.env"     "meta.env được ghi ra"
assert_eq "$(get_meta "${RUN_DIR}/meta.env" TOTAL)"      "9"         "TOTAL đếm đúng từ results.xml"
assert_eq "$(get_meta "${RUN_DIR}/meta.env" FAILED)"     "2"         "FAILED đếm đúng từ results.xml"
assert_eq "$(get_meta "${RUN_DIR}/meta.env" PROJECT)"    "vbi-chrome" "PROJECT ghi đúng"
assert_eq "$(get_meta "${RUN_DIR}/meta.env" EXIT_CODE)"  "1"         "EXIT_CODE ghi đúng"
assert_eq "$(get_meta "${RUN_DIR}/meta.env" HAS_REPORT)" "1"         "HAS_REPORT=1 khi có báo cáo"
assert_eq "$(get_meta "${RUN_DIR}/meta.env" HAS_DATA)"   "1"         "HAS_DATA=1 khi có data/"
assert_no_path "${TMP}/playwright-report" "vùng đệm rỗng sau khi lưu trữ"
assert_no_path "${TMP}/results.xml"       "results.xml không còn ở vùng đệm"

echo
if [ "$FAILED" -eq 0 ]; then echo "TẤT CẢ ĐỀU ĐẠT"; else echo "CÓ ASSERT THẤT BẠI"; fi
exit "$FAILED"

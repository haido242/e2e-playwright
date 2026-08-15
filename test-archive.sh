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
echo "== container chết giữa chừng không sinh báo cáo =="
TMP2="$(mktemp -d)"
trap 'rm -rf "$TMP" "$TMP2"' EXIT
# TMP2 rỗng: không có playwright-report/, không có results.xml
RUN_DIR2="$(archive_run "$TMP2" "${TMP2}/runs" "2026-08-11_130000_vbi-chrome" "vbi-chrome" "2026-08-11T13:00:00+07:00" 130)"

assert_file "${RUN_DIR2}/meta.env"     "meta.env được ghi ra dù không có báo cáo"
assert_eq "$(get_meta "${RUN_DIR2}/meta.env" HAS_REPORT)" "0"         "HAS_REPORT=0 khi không có báo cáo"
assert_eq "$(get_meta "${RUN_DIR2}/meta.env" HAS_DATA)"   "0"         "HAS_DATA=0 khi không có data/"
assert_eq "$(get_meta "${RUN_DIR2}/meta.env" TOTAL)"      "0"         "TOTAL=0 khi không có results.xml"
assert_eq "$(get_meta "${RUN_DIR2}/meta.env" FAILED)"     "0"         "FAILED=0 khi không có results.xml"
assert_eq "$(get_meta "${RUN_DIR2}/meta.env" EXIT_CODE)"  "130"       "EXIT_CODE ghi đúng"

echo
echo "== prune_old_runs =="
TMP3="$(mktemp -d)"
trap 'rm -rf "$TMP" "$TMP2" "$TMP3"' EXIT

# 3 lần chạy, giữ 2 → lần cũ nhất phải mất data/
for stamp in 2026-08-01_100000 2026-08-02_100000 2026-08-03_100000; do
  make_staging "$TMP3" 5 0
  archive_run "$TMP3" "${TMP3}/runs" "${stamp}_tpa-chrome" "tpa-chrome" "x" 0 > /dev/null
done

prune_old_runs "${TMP3}/runs" 2

OLDEST="${TMP3}/runs/2026-08-01_100000_tpa-chrome"
MIDDLE="${TMP3}/runs/2026-08-02_100000_tpa-chrome"
NEWEST="${TMP3}/runs/2026-08-03_100000_tpa-chrome"

assert_no_path "${OLDEST}/data" "lần cũ nhất bị xoá data/"
assert_file "${OLDEST}/index.html" "lần cũ nhất vẫn giữ index.html"
assert_eq "$(get_meta "${OLDEST}/meta.env" HAS_DATA)" "0" "HAS_DATA chuyển thành 0 sau khi tỉa"
assert_file "${MIDDLE}/data/abc.webm" "lần ở ranh giới keep vẫn giữ data/"
assert_file "${NEWEST}/data/abc.webm" "lần mới nhất giữ nguyên data/"
assert_eq "$(get_meta "${NEWEST}/meta.env" HAS_DATA)" "1" "HAS_DATA của lần mới vẫn là 1"

echo
echo "== build-index.sh =="
"${SCRIPT_DIR}/build-index.sh" "${TMP3}/runs" > /dev/null

INDEX="${TMP3}/runs/index.html"
assert_file "$INDEX" "index.html được sinh ra"

grep -q "2026-08-03_100000_tpa-chrome" "$INDEX" \
  && echo "  ok   index có lần chạy mới nhất" \
  || { echo "  FAIL index thiếu lần chạy mới nhất"; FAILED=1; }

grep -q "tpa-chrome" "$INDEX" \
  && echo "  ok   index có tên project" \
  || { echo "  FAIL index thiếu tên project"; FAILED=1; }

grep -q "đã dọn bằng chứng" "$INDEX" \
  && echo "  ok   index đánh dấu lần đã bị tỉa" \
  || { echo "  FAIL index không đánh dấu lần đã bị tỉa"; FAILED=1; }

grep -q "5/5" "$INDEX" \
  && echo "  ok   index hiện số pass/tổng" \
  || { echo "  FAIL index thiếu số pass/tổng"; FAILED=1; }

# Dựng lại lần hai phải cho ra file y hệt — index là dữ liệu dẫn xuất
cp "$INDEX" "${TMP3}/index-lan-1.html"
"${SCRIPT_DIR}/build-index.sh" "${TMP3}/runs" > /dev/null
if cmp -s "${TMP3}/index-lan-1.html" "$INDEX"; then
  echo "  ok   dựng index hai lần cho kết quả giống hệt"
else
  echo "  FAIL dựng index hai lần ra kết quả khác nhau"
  FAILED=1
fi

echo
if [ "$FAILED" -eq 0 ]; then echo "TẤT CẢ ĐỀU ĐẠT"; else echo "CÓ ASSERT THẤT BẠI"; fi
exit "$FAILED"

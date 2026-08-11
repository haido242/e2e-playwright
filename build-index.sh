#!/bin/bash
# Sinh trang danh sách các lần chạy từ meta.env của từng lần.
# Index là dữ liệu dẫn xuất, không phải nguồn sự thật: xoá đi dựng lại lúc nào cũng được.
# KHÔNG nhúng thời điểm sinh vào file — dựng lại phải cho ra kết quả giống hệt.
# Usage: ./build-index.sh [RUNS_DIR]

set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "${SCRIPT_DIR}/lib/run-archive.sh"

RUNS_DIR="${1:-${SCRIPT_DIR}/artifacts/runs}"
OUT="${RUNS_DIR}/index.html"

mkdir -p "$RUNS_DIR"

rows=""
while IFS= read -r name; do
  meta="${RUNS_DIR}/${name}/meta.env"
  [ -f "$meta" ] || continue

  project="$(get_meta "$meta" PROJECT)"
  started="$(get_meta "$meta" STARTED_AT)"
  exit_code="$(get_meta "$meta" EXIT_CODE)"
  total="$(get_meta "$meta" TOTAL)"
  failed="$(get_meta "$meta" FAILED)"
  has_report="$(get_meta "$meta" HAS_REPORT)"
  has_data="$(get_meta "$meta" HAS_DATA)"

  passed=$((total - failed))

  if [ "$failed" -gt 0 ] || [ "$exit_code" != "0" ]; then
    status='<span class="badge fail">FAIL</span>'
  else
    status='<span class="badge pass">PASS</span>'
  fi

  if [ "$has_report" = "1" ]; then
    link="<a href=\"./${name}/\">mở báo cáo</a>"
  else
    link='<span class="muted">không có báo cáo</span>'
  fi

  if [ "$has_data" = "1" ]; then
    evidence="video + trace"
  else
    evidence='<span class="muted">đã dọn bằng chứng</span>'
  fi

  rows="${rows}    <tr>
      <td class=\"mono\">${name}</td>
      <td>${project}</td>
      <td class=\"mono\">${started}</td>
      <td>${status}</td>
      <td class=\"mono\">${passed}/${total}</td>
      <td>${evidence}</td>
      <td>${link}</td>
    </tr>
"
done < <(find "$RUNS_DIR" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' 2>/dev/null | sort -r)

if [ -z "$rows" ]; then
  rows='    <tr><td colspan="7" class="muted">Chưa có lần chạy nào.</td></tr>
'
fi

cat > "$OUT" <<EOF
<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Lịch sử chạy e2e</title>
<style>
  body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; margin: 2rem; color: #1c1c1c; background: #fff; }
  h1 { font-size: 1.25rem; margin: 0 0 1.25rem; }
  table { border-collapse: collapse; width: 100%; font-size: 0.9rem; }
  th, td { text-align: left; padding: 0.5rem 0.75rem; border-bottom: 1px solid #e5e5e5; }
  th { font-weight: 600; color: #555; border-bottom: 2px solid #d0d0d0; }
  tr:hover td { background: #fafafa; }
  .mono { font-family: ui-monospace, "Cascadia Code", Consolas, monospace; }
  .muted { color: #999; }
  .badge { display: inline-block; padding: 0.1rem 0.5rem; border-radius: 3px; font-size: 0.78rem; font-weight: 600; }
  .pass { background: #e6f4ea; color: #1a7f37; }
  .fail { background: #fce8e8; color: #c62828; }
  a { color: #0b5cad; }
</style>
</head>
<body>
<h1>Lịch sử chạy e2e</h1>
<table>
  <thead>
    <tr><th>Lần chạy</th><th>Project</th><th>Bắt đầu</th><th>Kết quả</th><th>Pass</th><th>Bằng chứng</th><th></th></tr>
  </thead>
  <tbody>
${rows}  </tbody>
</table>
</body>
</html>
EOF

echo "$OUT"

#!/bin/bash
# Thư viện lưu trữ kết quả e2e.
# Được source bởi run-and-host.sh, manage-report.sh và test-archive.sh.
# Không tự chạy gì khi được source.

# get_meta <meta_file> <key>
# Đọc bằng grep chứ không source file, để một tên project lạ không thể chạy code.
get_meta() {
  grep -m1 "^$2=" "$1" 2>/dev/null | cut -d= -f2-
}

# set_meta <meta_file> <key> <value> — sửa tại chỗ, thêm khoá nếu chưa có
set_meta() {
  local file="$1" key="$2" value="$3"
  [ -f "$file" ] || return 0
  if grep -q "^${key}=" "$file"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$file"
  else
    echo "${key}=${value}" >> "$file"
  fi
}

# archive_run <staging_dir> <runs_dir> <run_id> <project> <started_at> <exit_code>
#
# Chuyển báo cáo từ vùng đệm sang runs/<run_id>/ rồi ghi meta.env.
# Dùng mv chứ không cp: vùng đệm phải rỗng sau mỗi lần, nếu không video của lần
# này sẽ nằm lại và bị lần sau gộp vào — chính là nguyên nhân đống 9.1 GB cũ.
# In ra đường dẫn thư mục lần chạy trên stdout.
archive_run() {
  local staging_dir="$1" runs_dir="$2" run_id="$3" project="$4" started_at="$5" exit_code="$6"
  local run_dir="${runs_dir}/${run_id}"

  mkdir -p "$run_dir"

  local has_report=0
  if [ -f "${staging_dir}/playwright-report/index.html" ]; then
    has_report=1
    mv "${staging_dir}/playwright-report/index.html" "${run_dir}/index.html"
    if [ -d "${staging_dir}/playwright-report/data" ]; then
      mv "${staging_dir}/playwright-report/data" "${run_dir}/data"
    fi
  fi
  rm -rf "${staging_dir}/playwright-report"

  local total=0 failed=0
  if [ -f "${staging_dir}/results.xml" ]; then
    total=$(grep -o '<testcase' "${staging_dir}/results.xml" | wc -l | tr -d ' ')
    failed=$(grep -o '<failure' "${staging_dir}/results.xml" | wc -l | tr -d ' ')
    mv "${staging_dir}/results.xml" "${run_dir}/results.xml"
  fi

  local has_data=0
  [ -d "${run_dir}/data" ] && has_data=1

  cat > "${run_dir}/meta.env" <<EOF
RUN_ID=${run_id}
PROJECT=${project}
STARTED_AT=${started_at}
FINISHED_AT=$(date -Iseconds)
EXIT_CODE=${exit_code}
TOTAL=${total}
FAILED=${failed}
HAS_REPORT=${has_report}
HAS_DATA=${has_data}
EOF

  echo "$run_dir"
}

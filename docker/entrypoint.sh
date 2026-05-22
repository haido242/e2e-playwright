#!/bin/bash
set -euo pipefail

: "${ARTIFACT_DIR:=/artifacts}"
: "${BASE_URL:=http://localhost:3000}"
: "${PVI_BASE_URL:=${BASE_URL}}"
: "${TPA_BASE_URL:=${BASE_URL}}"
: "${DIGINOTES_BASE_URL:=${BASE_URL}}"
: "${BIC_BASE_URL:=${BASE_URL}}"
: "${VBI_BASE_URL:=${BASE_URL}}"
: "${PW_PROJECTS:=}"

echo "==> PVI_BASE_URL=$PVI_BASE_URL"
echo "==> TPA_BASE_URL=$TPA_BASE_URL"
echo "==> DIGINOTES_BASE_URL=$DIGINOTES_BASE_URL"
echo "==> BIC_BASE_URL=$BIC_BASE_URL"
echo "==> VBI_BASE_URL=$VBI_BASE_URL"

mkdir -p "$ARTIFACT_DIR"

cd /runner

# Parse arguments Ä‘á»ƒ xÃ¡c Ä‘á»‹nh project nÃ o Ä‘Æ°á»£c chá»n
SELECTED_PROJECT=""
for arg in "$@"; do
  if [[ "$arg" == "--project="* ]]; then
    SELECTED_PROJECT="${arg#--project=}"
  fi
done

# Náº¿u cÃ³ --project trong args, Æ°u tiÃªn nÃ³
if [ -z "$SELECTED_PROJECT" ] && [ -n "${PW_PROJECTS:-}" ]; then
  # Láº¥y project Ä‘áº§u tiÃªn tá»« PW_PROJECTS
  IFS=',' read -r SELECTED_PROJECT _ <<< "$PW_PROJECTS"
  SELECTED_PROJECT="$(echo "$SELECTED_PROJECT" | xargs)"
fi

# XÃ¡c Ä‘á»‹nh BASE_URL dá»±a trÃªn project Ä‘Æ°á»£c chá»n
if [ -n "$SELECTED_PROJECT" ]; then
  if [[ "$SELECTED_PROJECT" == *"pvi"* ]]; then
    export BASE_URL="$PVI_BASE_URL"
    echo "==> Äang kiá»ƒm tra PVI app táº¡i $BASE_URL..."
  elif [[ "$SELECTED_PROJECT" == *"tpa"* ]]; then
    export BASE_URL="$TPA_BASE_URL"
    echo "==> Äang kiá»ƒm tra TPA app táº¡i $BASE_URL..."
  elif [[ "$SELECTED_PROJECT" == *"diginotes"* ]]; then
    export BASE_URL="$DIGINOTES_BASE_URL"
    echo "==> Äang kiá»ƒm tra Diginotes app táº¡i $BASE_URL..."
  elif [[ "$SELECTED_PROJECT" == *"bic"* ]]; then
    export BASE_URL="$BIC_BASE_URL"
    echo "==> Äang kiá»ƒm tra BIC app táº¡i $BASE_URL..."
  elif [[ "$SELECTED_PROJECT" == *"vbi"* ]]; then
    export BASE_URL="$VBI_BASE_URL"
    echo "==> Äang kiá»ƒm tra VBI app táº¡i $BASE_URL..."
  else
    export BASE_URL="${TPA_BASE_URL:-${PVI_BASE_URL}}"
    echo "==> Äang kiá»ƒm tra app 1 táº¡i $BASE_URL..."
  fi
else
  # KhÃ´ng chá»n project cá»¥ thá»ƒ, kiá»ƒm tra TPA máº·c Ä‘á»‹nh
  export BASE_URL="${TPA_BASE_URL:-${PVI_BASE_URL}}"
  echo "==> Äang kiá»ƒm tra app 2 táº¡i $BASE_URL..."
fi

/usr/local/bin/wait-for-app.sh

if [ -n "${PW_PROJECTS:-}" ]; then
  IFS=',' read -ra _P <<< "$PW_PROJECTS"
  ARGS=()
  for p in "${_P[@]}"; do
    p_trimmed="$(echo "$p" | xargs)"   # bá» khoáº£ng tráº¯ng
    [ -n "$p_trimmed" ] && ARGS+=(--project "$p_trimmed")
  done
  echo "==> Run with projects: ${ARGS[*]}"
  npx playwright test "${ARGS[@]}" || true
else
  # Pass táº¥t cáº£ arguments tá»« command line (bao gá»“m --project)
  echo "==> Run with args: $*"
  npx playwright test "$@" || true
fi

# Thu tháº­p bÃ¡o cÃ¡o
echo "==> Collecting artifacts..."
if [ -d "./playwright-report" ]; then
  echo "  - Copying playwright-report..."
  cp -r ./playwright-report "$ARTIFACT_DIR"/ || echo "  âš  Failed to copy playwright-report"
fi

if [ -d "./test-results" ]; then
  echo "  - Copying test-results..."
  cp -r ./test-results "$ARTIFACT_DIR"/ || echo "  âš  Failed to copy test-results"
  # List files Ä‘á»ƒ debug
  echo "  - Test results files:"
  find ./test-results -type f | head -20
fi

echo "==> Done. Artifacts => $ARTIFACT_DIR"
ls -la "$ARTIFACT_DIR" 2>/dev/null || true


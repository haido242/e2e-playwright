#!/bin/bash
# Script Ä‘á»ƒ Ä‘á»£i app sáºµn sÃ ng trÆ°á»›c khi cháº¡y tests

set -e

URL="${BASE_URL:-http://localhost:5000}"
MAX_ATTEMPTS=30
SLEEP_TIME=2

echo "==> Äang kiá»ƒm tra app táº¡i $URL..."

attempt=1
while [ $attempt -le $MAX_ATTEMPTS ]; do
  echo "Thá»­ láº§n $attempt/$MAX_ATTEMPTS..."
  
  if curl -f -s -o /dev/null "$URL" || curl -s -o /dev/null -w "%{http_code}" "$URL" | grep -q "200\|301\|302\|404"; then
    echo "âœ“ App Ä‘Ã£ sáºµn sÃ ng táº¡i $URL"
    exit 0
  fi
  
  echo "App chÆ°a sáºµn sÃ ng, Ä‘á»£i ${SLEEP_TIME}s..."
  sleep $SLEEP_TIME
  attempt=$((attempt + 1))
done

echo "âœ— Cáº¢NH BÃO: KhÃ´ng thá»ƒ káº¿t ná»‘i tá»›i app sau $MAX_ATTEMPTS láº§n thá»­"
echo "Váº«n tiáº¿p tá»¥c cháº¡y tests (cÃ³ thá»ƒ sáº½ fail)..."
exit 0

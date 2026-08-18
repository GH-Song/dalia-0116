#!/usr/bin/env bash
# CI 게이트 ③ — 용량 예산 (설계 문서 §10)
#
# 코드는 '전송 크기(gzip)'로 잽니다. GitHub Pages 가 텍스트 자산을 항상
# 압축해서 보내므로 하객의 로딩 속도를 정하는 값이 그쪽이기 때문입니다.
# woff2 / 이미지는 이미 압축되어 있어 원본 크기 그대로 잽니다.
set -euo pipefail
cd "$(dirname "$0")/.."

BUDGET_CODE=38912      # 38 KB — 코드 전송 크기 (2026-08-18 재배분: 교통 안내 강화, §10)
BUDGET_FONT=83968      # 82 KB — 서브셋 폰트 4종 (2026-08-18 재배분: 실측 57.9 KB, §10)
BUDGET_FIRST=276480    # 270 KB — 첫 화면 소계
BUDGET_TOTAL=819200    # 800 KB — 전체

gz()  { cat "$@" 2>/dev/null | gzip -9 -c | wc -c | tr -d ' '; }
raw() { cat "$@" 2>/dev/null | wc -c | tr -d ' '; }
kb()  { awk -v b="$1" 'BEGIN{printf "%.1f KB", b/1024}'; }

fail=0
check() { # 이름 실제 예산
  local status="통과"
  if [ "$2" -gt "$3" ]; then status="초과"; fail=1; fi
  printf "  %-22s %10s / %-10s %s\n" "$1" "$(kb "$2")" "$(kb "$3")" "$status"
}

code=$(gz index.html theme.css style.css script.js)
font=$(raw assets/fonts/*.woff2)
img=$(raw assets/img/* 2>/dev/null || echo 0)
first=$((code + font))
total=$((code + font + img))

echo "용량 예산"
check "코드 (gzip)"      "$code"  "$BUDGET_CODE"
check "폰트 (woff2)"     "$font"  "$BUDGET_FONT"
check "첫 화면 소계"     "$first" "$BUDGET_FIRST"
check "전체"             "$total" "$BUDGET_TOTAL"

echo
printf "  참고 — 코드 원본(비압축) %s\n" "$(kb "$(raw index.html theme.css style.css script.js)")"

if [ "$fail" -ne 0 ]; then
  echo "실패 — 예산을 넘겼습니다."
  exit 1
fi
echo "통과"

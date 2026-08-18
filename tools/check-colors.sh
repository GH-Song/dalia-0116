#!/usr/bin/env bash
# CI 게이트 ① — style.css 에 하드코딩된 색상 리터럴이 있으면 배포를 막습니다.
# 팔레트는 theme.css 한 파일에만 존재해야 합니다 (설계 문서 §AD-2).
set -euo pipefail
cd "$(dirname "$0")/.."

hits=$(grep -nE '#[0-9A-Fa-f]{3,8}\b|\brgba?\(|\bhsla?\(' style.css || true)
if [ -n "$hits" ]; then
  echo "실패 — style.css 에 색상 리터럴이 있습니다. theme.css 로 옮기세요."
  echo "$hits"
  exit 1
fi
echo "통과 — style.css 색상 리터럴 0개"

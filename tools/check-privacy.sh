#!/usr/bin/env bash
# CI 게이트 ④ — 개인정보 (설계 문서 §11, 규칙 1)
# 저장소에 커밋된 index.html 에는 자리표시자만 있어야 합니다.
set -euo pipefail
cd "$(dirname "$0")/.."

python3 tools/inject-secrets.py --check
python3 - <<'PY'
import pathlib, re, sys

html = pathlib.Path("index.html").read_text(encoding="utf-8")

# 계좌 섹션만 검사합니다. 웨딩홀 대표전화(043-241-0003)처럼
# 공개된 번호까지 잡으면 게이트가 양치기 소년이 됩니다.
m = re.search(r'<section[^>]*class="[^"]*\baccount\b[^"]*".*?</section>', html, re.S)
if not m:
    print("실패 — 계좌 섹션을 찾지 못했습니다. 검사할 수 없으면 통과시키지 않습니다.")
    sys.exit(1)

block = m.group(0)
suspicious = [
    n for n in re.findall(r'\b[\d-]{9,}\b', block)
    if not re.fullmatch(r'[0-]+', n)          # 더미는 0 과 - 로만 이루어져 있습니다
]
if suspicious:
    print("실패 — 계좌 섹션에 실제 값처럼 보이는 숫자가 있습니다:", ", ".join(suspicious))
    sys.exit(1)

print("통과 — 저장소에 실제 계좌번호 없음")
PY

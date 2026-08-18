#!/usr/bin/env python3
"""
자리표시자 치환 (설계 문서 §11, 규칙 1)

index.html 의 __ACCT_*__ 를 실제 값으로 바꿉니다.
값은 환경변수에서 가져오고, 없으면 accounts.dummy.json 의 더미를 씁니다.

  실제 계좌번호는 저장소·히스토리·에이전트 컨텍스트 어디에도 남지 않습니다.
  Actions 에서 Secrets 를 환경변수로 주입해 배포 시점에만 존재합니다.

  python3 tools/inject-secrets.py            # 제자리 치환 (CI 용)
  python3 tools/inject-secrets.py --check    # 치환 없이 자리표시자만 확인
"""
import json
import os
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
KEYS = ["ACCT_GROOM", "ACCT_GROOM_HOST", "ACCT_BRIDE", "ACCT_BRIDE_HOST"]

# script.js 에 들어가는 자리표시자. 계좌와 달리 없으면 더미 대신 그대로 둡니다
# (그대로면 청첩장이 "미리보기라 저장되지 않습니다"로 동작합니다).
JS_KEYS = ["RSVP_ENDPOINT"]


def main() -> int:
    check_only = "--check" in sys.argv
    html_path = ROOT / "index.html"
    html = html_path.read_text(encoding="utf-8")
    js_path = ROOT / "script.js"
    js = js_path.read_text(encoding="utf-8")

    missing = [k for k in KEYS if f"__{k}__" not in html]
    if missing:
        print(f"실패 — index.html 에 자리표시자가 없습니다: {', '.join(missing)}")
        print("       실제 계좌번호를 직접 써 넣지 마세요 (규칙 1).")
        return 1

    js_missing = [k for k in JS_KEYS if f"__{k}__" not in js]
    if js_missing:
        print(f"실패 — script.js 에 자리표시자가 없습니다: {', '.join(js_missing)}")
        return 1

    if check_only:
        print(f"통과 — 자리표시자 {len(KEYS) + len(JS_KEYS)}개 정상 (실제 계좌번호·엔드포인트 없음)")
        return 0

    dummies = json.loads((ROOT / "accounts.dummy.json").read_text(encoding="utf-8"))
    used_dummy = []

    for k in KEYS:
        value = os.environ.get(k, "").strip()
        if not value:
            value = dummies[k]
            used_dummy.append(k)
        html = html.replace(f"__{k}__", value)

    html_path.write_text(html, encoding="utf-8")

    for k in JS_KEYS:
        value = os.environ.get(k, "").strip()
        if value:
            js = js.replace(f"__{k}__", value)
            print(f"치환 완료 — {k}")
        else:
            print(f"주의 — {k} Secret 이 없습니다. 참석 여부가 미리보기로 동작합니다.")
    js_path.write_text(js, encoding="utf-8")

    if used_dummy:
        print(f"주의 — Secrets 가 없어 더미를 썼습니다: {', '.join(used_dummy)}")
    print(f"치환 완료 — 계좌 {len(KEYS)}개")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

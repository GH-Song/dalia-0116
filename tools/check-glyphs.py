#!/usr/bin/env python3
"""
CI 게이트 ② — 폰트 글리프 커버리지 (설계 문서 §8.3)

고정 텍스트에 쓰인 모든 코드포인트가 서브셋 폰트에 실제로 들어 있는지
대조합니다. 하나라도 빠지면 배포를 막습니다.

두부(□)를 막는 네 겹 중 세 번째 층입니다.

  python3 tools/check-glyphs.py
"""
import pathlib

# subset-fonts.py 는 파일명에 하이픈이 있어 import 가 안 됩니다.
# 문자 수집 규칙을 한 곳에만 두려고 직접 읽어 실행합니다.
_SUBSET = pathlib.Path(__file__).resolve().parent / "subset-fonts.py"
_ns = {"__file__": str(_SUBSET), "__name__": "subset_fonts"}
exec(_SUBSET.read_text(encoding="utf-8").split("if __name__ ==")[0], _ns)

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "fonts"


def cmap_of(path: pathlib.Path) -> set:
    from fontTools.ttLib import TTFont
    with TTFont(str(path)) as f:
        chars = set()
        for table in f["cmap"].tables:
            chars |= set(table.cmap.keys())
        return chars


def main() -> int:
    need = _ns["collect"]()
    hangul = {c for c in need if "가" <= c <= "힣"}
    latin = {c for c in need if ord(c) < 0x2500}
    bold = _ns["collect_face"]("bold")
    script = _ns["collect_face"]("script") | set("&") | set(_ns["ALWAYS_SCRIPT"])

    checks = [
        ("NanumMyeongjo-subset.woff2", need,  "한글·기호 전체"),
        ("NanumMyeongjoBold-subset.woff2", bold, "볼드 표시 텍스트"),
        ("CormorantGaramond-subset.woff2", latin, "라틴·숫자"),
        ("Allura-subset.woff2", script, "스크립트 악센트"),
    ]

    failed = False
    for fname, required, label in checks:
        path = OUT / fname
        if not path.exists():
            print(f"실패 — 폰트가 없습니다: {fname}")
            print("       먼저 python3 tools/subset-fonts.py 를 실행하세요.")
            failed = True
            continue

        have = cmap_of(path)
        missing = sorted(c for c in required if ord(c) not in have)
        if missing:
            failed = True
            shown = "".join(missing[:60])
            print(f"실패 — {fname} 에 {len(missing)}자가 없습니다 ({label})")
            print(f"       빠진 글자: {shown}")
            print("       tools/subset-fonts.py 를 다시 실행하세요.")
        else:
            print(f"통과 — {fname:38s} {len(required)}자 모두 포함 ({label})")

    if not failed:
        print(f"\n고정 텍스트 {len(need)}자 (한글 {len(hangul)}) 전부 커버됨")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())

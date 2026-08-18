#!/usr/bin/env python3
"""
서브셋 폰트 생성 — 설계 문서 §8.2

index.html / script.js 에서 '실제로 쓰인 고정 텍스트'의 문자를 뽑아
그 글자만 담은 woff2 를 만듭니다. 카피를 고치면 서브셋이 자동으로 따라오므로
수동 동기화가 사라집니다.

★ 사용자 문자열(하객 이름 등)은 --font-ui(시스템 폰트)를 쓰므로
  서브셋 대상이 아닙니다. [data-user-content] 안의 텍스트는 제외합니다.

  python3 tools/subset-fonts.py
"""
import html
import pathlib
import re
import subprocess
import sys
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "fonts" / "src"
OUT = ROOT / "assets" / "fonts"

# 서브셋에 항상 포함할 기본 문자 —
# 달력·D-day 처럼 JS 가 실행 중에 만들어내는 글자까지 포함합니다.
ALWAYS = (
    "0123456789"
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    "abcdefghijklmnopqrstuvwxyz"
    " .,·:;'\"()[]-–—/&%?!+~"
    "년월일시분초요일"
    "월화수목금토일"
    "남은일지났습니다오늘"
)


def strip_user_content(markup: str) -> str:
    """[data-user-content] 요소의 내용을 통째로 들어냅니다."""
    return re.sub(
        r"<(\w+)[^>]*\bdata-user-content\b[^>]*>.*?</\1>",
        " ",
        markup,
        flags=re.S | re.I,
    )


def collect_face(face: str) -> set:
    """data-face="bold|script" 요소의 문자만 수집합니다 (설계 문서 §8 v2).

    이 속성은 style.css 의 폰트 지정 셀렉터이기도 해서, 마커 없이는
    해당 폰트가 적용되지 않습니다 — 스타일과 서브셋이 어긋날 수 없습니다.
    """
    markup = strip_user_content((ROOT / "index.html").read_text(encoding="utf-8"))
    markup = re.sub(r"<!--.*?-->", " ", markup, flags=re.S)
    chars = set()
    for m in re.finditer(
        rf'<(\w+)[^>]*\bdata-face="{face}"[^>]*>(.*?)</\1>', markup, re.S | re.I
    ):
        inner = re.sub(r"<[^>]+>", " ", m.group(2))
        chars |= set(html.unescape(inner))
    return {c for c in chars if c.isprintable() and not c.isspace()}


def text_from_html(path: pathlib.Path) -> str:
    s = path.read_text(encoding="utf-8")
    s = re.sub(r"<!--.*?-->", " ", s, flags=re.S)
    s = re.sub(r"<(script|style)\b.*?</\1>", " ", s, flags=re.S | re.I)
    s = strip_user_content(s)
    # 눈에 보이는 속성값도 포함 (alt, aria-label, content, title)
    attrs = " ".join(
        m.group(2)
        for m in re.finditer(
            r'\b(alt|aria-label|title|content|placeholder)\s*=\s*"([^"]*)"', s, re.I
        )
    )
    s = re.sub(r"<[^>]+>", " ", s)
    return html.unescape(s + " " + attrs)


def text_from_js(path: pathlib.Path) -> str:
    """JS 안의 문자열 리터럴 — 토스트·안내 문구 등 화면에 나오는 고정 텍스트."""
    s = path.read_text(encoding="utf-8")
    s = re.sub(r"/\*.*?\*/", " ", s, flags=re.S)
    return " ".join(m.group(1) for m in re.finditer(r"'([^'\n]*)'|\"([^\"\n]*)\"", s) if m.group(1))


def collect() -> set:
    chars = set(ALWAYS)
    chars |= set(text_from_html(ROOT / "index.html"))
    chars |= set(text_from_js(ROOT / "script.js"))
    # 제어문자·공백 정리
    return {c for c in chars if c.isprintable() and not c.isspace()}


# 원본 폰트는 저장소에 넣지 않습니다 (빌드 산출물). 없으면 받아옵니다.
# 전부 OFL 이라 서브셋 재배포가 허용됩니다.
FONT_SOURCES = {
    "NanumMyeongjo-Regular.ttf":
        "https://raw.githubusercontent.com/google/fonts/main/ofl/nanummyeongjo/NanumMyeongjo-Regular.ttf",
    "NanumMyeongjo-Bold.ttf":
        "https://raw.githubusercontent.com/google/fonts/main/ofl/nanummyeongjo/NanumMyeongjo-Bold.ttf",
    "CormorantGaramond[wght].ttf":
        "https://raw.githubusercontent.com/google/fonts/main/ofl/cormorantgaramond/CormorantGaramond%5Bwght%5D.ttf",
    "Allura-Regular.ttf":
        "https://raw.githubusercontent.com/google/fonts/main/ofl/allura/Allura-Regular.ttf",
    "OFL-NanumMyeongjo.txt":
        "https://raw.githubusercontent.com/google/fonts/main/ofl/nanummyeongjo/OFL.txt",
    "OFL-CormorantGaramond.txt":
        "https://raw.githubusercontent.com/google/fonts/main/ofl/cormorantgaramond/OFL.txt",
    "OFL-Allura.txt":
        "https://raw.githubusercontent.com/google/fonts/main/ofl/allura/OFL.txt",
}


def ensure_sources() -> None:
    SRC.mkdir(parents=True, exist_ok=True)
    for name, url in FONT_SOURCES.items():
        dst = SRC / name
        if dst.exists():
            continue
        print(f"  원본 내려받는 중: {name}")
        urllib.request.urlretrieve(url, dst)


def instance_variable(src: pathlib.Path, axes: str) -> pathlib.Path:
    """가변 폰트를 고정 weight 로 굳힙니다. 가변축을 남기면 7KB 가량 손해입니다."""
    out = src.with_name(src.stem + "-static.ttf")
    subprocess.run(
        [sys.executable, "-m", "fontTools.varLib.instancer", str(src), axes, "-o", str(out)],
        check=True, capture_output=True,
    )
    return out


def subset(src: pathlib.Path, dst: pathlib.Path, chars: set, extra_args=()) -> int:
    text = "".join(sorted(chars))
    cmd = [
        sys.executable, "-m", "fontTools.subset", str(src),
        "--text=" + text,
        "--output-file=" + str(dst),
        "--flavor=woff2",
        "--layout-features=kern,liga,calt,lnum,onum,tnum,pnum",
        "--no-hinting",
        "--desubroutinize",
        "--drop-tables+=DSIG",
        "--name-IDs=1,2,3,4,6",
        *extra_args,
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    return dst.stat().st_size


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    ensure_sources()
    chars = collect()

    hangul = {c for c in chars if "가" <= c <= "힣"}
    latin = {c for c in chars if ord(c) < 0x2500}

    print(f"수집한 문자 {len(chars)}자 (한글 {len(hangul)}, 라틴·기호 {len(latin)})")

    # v2 (설계 문서 §8) — 볼드·스크립트는 data-face 마커 요소의 글자만 담습니다.
    bold = collect_face("bold")
    script = collect_face("script") | set("&")

    total = 0
    jobs = [
        # (원본, 결과물, 문자집합, 가변축 고정값)
        ("NanumMyeongjo-Regular.ttf", "NanumMyeongjo-subset.woff2", chars, None),
        ("NanumMyeongjo-Bold.ttf", "NanumMyeongjoBold-subset.woff2", bold, None),
        ("CormorantGaramond[wght].ttf", "CormorantGaramond-subset.woff2", latin, "wght=400"),
        ("Allura-Regular.ttf", "Allura-subset.woff2", script, None),
    ]
    for src_name, dst_name, cs, axes in jobs:
        src = SRC / src_name
        if not src.exists():
            print(f"  건너뜀 — 원본 없음: {src_name}")
            continue
        if axes:
            src = instance_variable(src, axes)
        size = subset(src, OUT / dst_name, cs, ())
        total += size
        print(f"  {dst_name:38s} {size:7,d} B  ({len(cs)}자)")

    budget = 85 * 1024
    print(f"\n폰트 합계 {total:,} B / 예산 {budget:,} B "
          f"({'OK' if total <= budget else '초과!'})")
    return 0 if total <= budget else 1


if __name__ == "__main__":
    raise SystemExit(main())

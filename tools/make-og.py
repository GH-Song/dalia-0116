#!/usr/bin/env python3
"""
카카오톡 미리보기 카드 이미지 (설계 문서 §9, §AD-4)

1200x630. 청첩장 표지와 같은 구성(아치 pane + 이름 + 날짜)으로 그려
링크를 받은 사람이 열기 전에도 같은 인상을 받게 합니다.

  python3 tools/make-og.py
"""
import pathlib
from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "fonts" / "src"
OUT = ROOT / "assets" / "img" / "og.png"

W, H = 1200, 630
BG   = (245, 244, 239)
LINE = (168, 179, 162)
TEXT = (44, 50, 44)
MUTED= (102, 109, 98)
PINE = (63, 78, 60)


def font(name, size):
    return ImageFont.truetype(str(SRC / name), size)


def center(draw, y, text, f, fill, spacing=0):
    if spacing:
        widths = [draw.textlength(c, font=f) for c in text]
        total = sum(widths) + spacing * (len(text) - 1)
        x = (W - total) / 2
        for c, w in zip(text, widths):
            draw.text((x, y), c, font=f, fill=fill)
            x += w + spacing
    else:
        w = draw.textlength(text, font=f)
        draw.text(((W - w) / 2, y), text, font=f, fill=fill)


def main() -> int:
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)

    # 아치 pane — 표지와 같은 모티프
    pane_w, pane_top, arch_h = 470, 40, 150
    x0, x1 = (W - pane_w) // 2, (W + pane_w) // 2
    d.arc([x0, pane_top, x1, pane_top + arch_h * 2], 180, 360, fill=LINE, width=2)
    d.line([x0, pane_top + arch_h, x0, H - 18], fill=LINE, width=2)
    d.line([x1, pane_top + arch_h, x1, H - 18], fill=LINE, width=2)
    # 부채꼴 창살
    cx = W // 2
    d.line([cx, pane_top + 4, cx, pane_top + 44], fill=LINE, width=2)
    d.line([cx + 118, pane_top + 42, cx + 86, pane_top + 72], fill=LINE, width=2)
    d.line([cx - 118, pane_top + 42, cx - 86, pane_top + 72], fill=LINE, width=2)

    ko = lambda s: font("NanumMyeongjo-Regular.ttf", s)
    en = lambda s: font("CormorantGaramond[wght].ttf", s)

    # PIL 에 libraqm 이 없어 OpenType lnum 을 적용할 수 없습니다.
    # Cormorant 기본 숫자는 올드스타일이라 01 이 OI 로 읽혀서,
    # 썸네일에서는 라이닝 숫자인 나눔명조로 날짜를 씁니다.
    center(d, 236, "2027 · 01 · 16", ko(32), MUTED, spacing=8)
    center(d, 296, "송국호", ko(62), TEXT, spacing=6)
    center(d, 378, "와",     ko(26), MUTED)
    center(d, 420, "최은호", ko(62), TEXT, spacing=6)
    center(d, 500, "결혼합니다", ko(34), PINE, spacing=10)

    d.line([cx - 46, 556, cx + 46, 556], fill=LINE, width=1)
    center(d, 570, "메리다웨딩컨벤션 달리아홀", ko(21), MUTED, spacing=2)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT, "PNG", optimize=True)
    print(f"{OUT.relative_to(ROOT)}  {OUT.stat().st_size:,} B  ({W}x{H})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

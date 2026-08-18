#!/usr/bin/env python3
"""
카카오톡 미리보기 카드 이미지 (설계 문서 §9, §AD-4)

1200x630. 청첩장 표지와 같은 구성(스크립트 · 송국호 & 최은호 · 날짜)으로
그려 링크를 받은 사람이 열기 전에도 같은 인상을 받게 합니다.

색은 theme.css(동백 팔레트)와 같은 값입니다. 테마를 교체하면 여기도 바꾸세요.

  python3 tools/make-og.py
"""
import pathlib
from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "fonts" / "src"
OUT = ROOT / "assets" / "img" / "og.png"

W, H = 1200, 630
BG    = (252, 251, 249)   # --color-bg
TEXT  = (62, 46, 44)      # --color-text
CORAL = (189, 113, 107)   # --color-primary
ROSE  = (150, 82, 78)     # --color-accent
GOLD  = (168, 131, 75)    # --color-gold
MUTED = (122, 104, 98)    # --color-muted-strong
BLUSH = (244, 217, 210)   # --color-secondary


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


def camellia(layer, cx, cy, r, petal, core):
    """단순화한 동백 — 꽃잎 원 6개 + 골드 꽃술. 반투명 겹침이 농담을 만듭니다."""
    d = ImageDraw.Draw(layer)
    import math
    for k, (dist, pr, alpha) in enumerate([(0.62, 0.60, 110), (0.34, 0.42, 150)]):
        for i in range(6):
            a = math.radians(i * 60 + k * 30)
            x = cx + math.cos(a) * r * dist
            y = cy + math.sin(a) * r * dist
            rr = r * pr
            d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=petal + (alpha,))
    d.ellipse([cx - r * 0.14, cy - r * 0.14, cx + r * 0.14, cy + r * 0.14],
              fill=core + (255,))
    for i in range(6):
        a = math.radians(i * 60 + 12)
        x = cx + math.cos(a) * r * 0.26
        y = cy + math.sin(a) * r * 0.26
        d.ellipse([x - r * 0.05, y - r * 0.05, x + r * 0.05, y + r * 0.05],
                  fill=core + (230,))


def main() -> int:
    img = Image.new("RGB", (W, H), BG)

    # 코너 동백 — 반투명 레이어를 합성합니다
    deco = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    camellia(deco, 120, 96, 74, CORAL, GOLD)
    camellia(deco, 232, 60, 44, BLUSH, GOLD)
    camellia(deco, 1080, 534, 74, CORAL, GOLD)
    camellia(deco, 968, 572, 44, BLUSH, GOLD)
    img = Image.alpha_composite(img.convert("RGBA"), deco).convert("RGB")
    d = ImageDraw.Draw(img)

    ko = lambda s: font("NanumMyeongjo-Regular.ttf", s)
    kb = lambda s: font("NanumMyeongjo-Bold.ttf", s)
    sc = lambda s: font("Allura-Regular.ttf", s)

    center(d, 64, "We're getting married", sc(58), ROSE)

    # PIL 에 libraqm 이 없어 OpenType lnum 을 적용할 수 없습니다.
    # Cormorant 기본 숫자는 올드스타일이라 01 이 OI 로 읽혀서,
    # 썸네일에서는 라이닝 숫자인 나눔명조로 날짜를 씁니다.
    center(d, 176, "2027 · 01 · 16", ko(30), MUTED, spacing=8)

    # 송국호 & 최은호 — 한 줄
    names_f, amp_f = kb(82), sc(64)
    gap = 34
    w1 = d.textlength("송국호", font=names_f) + 12 * 2   # 자간 포함
    w2 = d.textlength("&", font=amp_f)
    w3 = d.textlength("최은호", font=names_f) + 12 * 2
    x = (W - (w1 + gap + w2 + gap + w3)) / 2
    for c in "송국호":
        d.text((x, 248), c, font=names_f, fill=TEXT)
        x += d.textlength(c, font=names_f) + 12
    x += gap - 12
    d.text((x, 252), "&", font=amp_f, fill=CORAL)
    x += w2 + gap
    for c in "최은호":
        d.text((x, 248), c, font=names_f, fill=TEXT)
        x += d.textlength(c, font=names_f) + 12

    center(d, 396, "결혼합니다", ko(32), ROSE, spacing=12)

    cx = W // 2
    d.line([cx - 52, 480, cx + 52, 480], fill=(203, 174, 147), width=1)
    d.ellipse([cx - 3, 477, cx + 3, 483], fill=GOLD)

    center(d, 512, "2027년 1월 16일 토요일 낮 12시", ko(24), MUTED, spacing=2)
    center(d, 556, "메리다웨딩컨벤션 달리아홀", ko(22), MUTED, spacing=2)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT, "PNG", optimize=True)
    print(f"{OUT.relative_to(ROOT)}  {OUT.stat().st_size:,} B  ({W}x{H})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

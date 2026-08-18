#!/usr/bin/env python3
"""
겨울식물 SVG 라인아트 생성기 — 설계 문서 §AD-3

무료·오픈 라이선스 자산을 먼저 뒤졌으나(2026-08-18: Wikimedia Commons,
Openverse, GitHub, Openclipart) 웨딩 수준의 수채 일러스트가 없어
직접 그립니다. 그렇다면 제대로 그려야 합니다.

평면적으로 보이지 않게 하는 네 가지
  1. 그라데이션  — 잎 하나 안에서 농담이 변합니다. 단색 채움은 스티커로 보입니다
     stop-color="currentColor" 라서 테마 교체를 그대로 따라갑니다
  2. 개체 변이   — 같은 잎이 두 장 없도록 크기·각도·휘어짐에 흔들림을 줍니다
  3. 깊이 3층    — 뒤로 갈수록 옅고 가늘게. 겹침이 공간을 만듭니다
  4. 구도        — 좌우 대칭을 피하고 초점 하나에 무게를 몰아줍니다

난수는 시드 고정입니다. 다시 돌려도 같은 그림이 나와야 합니다.

  python3 tools/make-botanicals.py > /tmp/botanicals.svg
"""
import math
import random

R = lambda v: round(v, 1)
rnd = random.Random(20270116)          # 예식일 = 시드


def jitter(base, pct):
    """개체 변이. 같은 모양이 반복되면 즉시 기계로 보입니다."""
    return base * (1 + rnd.uniform(-pct, pct))


def qbez(p0, p1, p2, t):
    mt = 1 - t
    x = mt * mt * p0[0] + 2 * mt * t * p1[0] + t * t * p2[0]
    y = mt * mt * p0[1] + 2 * mt * t * p1[1] + t * t * p2[1]
    dx = 2 * mt * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0])
    dy = 2 * mt * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1])
    return (x, y), math.degrees(math.atan2(dy, dx))


def stem_points(x0, y0, ang, length, curve):
    a = math.radians(ang)
    dx, dy = math.cos(a), -math.sin(a)
    px, py = -dy, dx
    p0 = (x0, y0)
    p2 = (x0 + dx * length + px * curve, y0 + dy * length + py * curve)
    p1 = (x0 + dx * length * 0.5 + px * curve * 0.35,
          y0 + dy * length * 0.5 + py * curve * 0.35)
    return p0, p1, p2


def leaf(cx, cy, length, width, ang, grad):
    """끝이 뾰족한 잎. 두 개의 이차 베지어를 마주 붙입니다."""
    a = math.radians(ang)
    dx, dy = math.cos(a), math.sin(a)
    px, py = -dy, dx
    tx, ty = cx + dx * length / 2, cy + dy * length / 2
    bx, by = cx - dx * length / 2, cy - dy * length / 2
    c1x, c1y = cx + px * width, cy + py * width
    c2x, c2y = cx - px * width, cy - py * width
    return (f'<path fill="url(#{grad})" d="M{R(bx)} {R(by)}'
            f'Q{R(c1x)} {R(c1y)} {R(tx)} {R(ty)}'
            f'Q{R(c2x)} {R(c2y)} {R(bx)} {R(by)}Z"/>')


def stem(p0, p1, p2):
    return f'<path d="M{R(p0[0])} {R(p0[1])}Q{R(p1[0])} {R(p1[1])} {R(p2[0])} {R(p2[1])}"/>'


def eucalyptus(x0, y0, ang, length, curve, pairs, size, grad):
    """실버달러 유칼립투스 — 둥근 잎이 마주납니다."""
    p0, p1, p2 = stem_points(x0, y0, ang, length, curve)
    out = [stem(p0, p1, p2)]
    for i in range(pairs):
        t = 0.20 + 0.78 * (i / max(pairs - 1, 1))
        (cx, cy), tang = qbez(p0, p1, p2, t)
        taper = 1 - 0.45 * (i / max(pairs - 1, 1))
        for side in (+1, -1):
            s = jitter(size * taper, 0.18)
            off = tang + side * jitter(54, 0.16)
            a = math.radians(off)
            lx = cx + math.cos(a) * s * 1.02
            ly = cy + math.sin(a) * s * 1.02
            out.append(leaf(lx, ly, s * 2.2, s * 0.98, off, grad))
    (tx, ty), tang = qbez(p0, p1, p2, 1.0)
    a = math.radians(tang)
    out.append(leaf(tx + math.cos(a) * 2.4, ty + math.sin(a) * 2.4,
                    size * 1.3, size * 0.55, tang, grad))
    return out


def willow(x0, y0, ang, length, curve, count, size, grad):
    """좁고 긴 잎 — 유칼립투스의 둥근 잎과 대비를 만듭니다."""
    p0, p1, p2 = stem_points(x0, y0, ang, length, curve)
    out = [stem(p0, p1, p2)]
    for i in range(count):
        t = 0.16 + 0.80 * (i / max(count - 1, 1))
        (cx, cy), tang = qbez(p0, p1, p2, t)
        side = 1 if i % 2 == 0 else -1
        s = jitter(size * (1 - 0.35 * i / max(count - 1, 1)), 0.2)
        off = tang + side * jitter(38, 0.2)
        a = math.radians(off)
        out.append(leaf(cx + math.cos(a) * s * 1.3, cy + math.sin(a) * s * 1.3,
                        s * 3.0, s * 0.42, off, grad))
    return out


def pine(x0, y0, ang, length, curve, rows, needle):
    """솔가지 — 채우지 않고 선만. 잎 면과 대비되는 결입니다."""
    p0, p1, p2 = stem_points(x0, y0, ang, length, curve)
    out = [stem(p0, p1, p2)]
    for i in range(rows):
        t = 0.10 + 0.88 * (i / max(rows - 1, 1))
        (cx, cy), tang = qbez(p0, p1, p2, t)
        s = jitter(needle * (1 - 0.5 * (i / max(rows - 1, 1))), 0.22)
        for side in (+1, -1):
            a = math.radians(tang + side * jitter(46, 0.15))
            out.append(f'<path d="M{R(cx)} {R(cy)}L{R(cx + math.cos(a) * s)} {R(cy + math.sin(a) * s)}"/>')
    return out


def cotton(cx, cy, r, stem_len, ang, grad):
    """목화 다래 — 부푼 솜과 마른 꽃받침."""
    out = []
    a = math.radians(ang)
    tipx, tipy = cx - math.cos(a) * stem_len, cy + math.sin(a) * stem_len
    out.append(f'<path d="M{R(cx)} {R(cy)}L{R(tipx)} {R(tipy)}"/>')

    lobes = 5
    inner = r * 0.60
    chord = 2 * inner * math.sin(math.pi / lobes)
    arc = chord * 0.54
    pts = [(cx + math.cos(2 * math.pi * i / lobes - math.pi / 2) * inner,
            cy + math.sin(2 * math.pi * i / lobes - math.pi / 2) * inner)
           for i in range(lobes)]
    d = f"M{R(pts[0][0])} {R(pts[0][1])}"
    for i in range(1, lobes + 1):
        x, y = pts[i % lobes]
        d += f"A{R(arc)} {R(arc)} 0 0 1 {R(x)} {R(y)}"
    out.append(f'<path fill="url(#{grad})" d="{d}Z"/>')

    for dg in (-72, 0, 72):
        a2 = math.radians(90 + dg)
        out.append(f'<path d="M{R(cx)} {R(cy + r * 0.40)}'
                   f'L{R(cx + math.cos(a2) * r * 1.2)} {R(cy + r * 0.40 + math.sin(a2) * r * 1.1)}"/>')
    return out


def berries(cx, cy, ang, length, count, rad, grad):
    """작은 열매 — 잎 사이의 밀도 차이를 만드는 악센트."""
    p0, p1, p2 = stem_points(cx, cy, ang, length, rnd.uniform(-6, 6))
    out = [stem(p0, p1, p2)]
    for i in range(count):
        t = 0.55 + 0.42 * (i / max(count - 1, 1))
        (bx, by), tang = qbez(p0, p1, p2, t)
        side = 1 if i % 2 == 0 else -1
        a = math.radians(tang + side * jitter(70, 0.25))
        rr = jitter(rad, 0.3)
        out.append(f'<circle fill="url(#{grad})" cx="{R(bx + math.cos(a) * rr * 1.6)}"'
                   f' cy="{R(by + math.sin(a) * rr * 1.6)}" r="{R(rr)}"/>')
    return out


def defs(prefix):
    """currentColor 그라데이션 — 테마를 바꿔도 농담 구조가 유지됩니다."""
    g = ""
    for name, (o1, o2) in {
        "back":  (0.16, 0.05),
        "mid":   (0.26, 0.09),
        "front": (0.36, 0.13),
    }.items():
        g += (f'<linearGradient id="{prefix}-{name}" x1="0" y1="0" x2="0.35" y2="1">'
              f'<stop offset="0" stop-color="currentColor" stop-opacity="{o1}"/>'
              f'<stop offset="1" stop-color="currentColor" stop-opacity="{o2}"/>'
              f'</linearGradient>')
    return f"<defs>{g}</defs>"


def layer(paths, sw, opacity):
    return (f'<g fill="none" stroke="currentColor" stroke-width="{sw}"'
            f' stroke-linecap="round" stroke-linejoin="round" opacity="{opacity}">'
            + "".join(paths) + "</g>")


def hero_base():
    """히어로 pane 바닥 — 유리창 안에서 자라 오른 군락.

    줄기를 세로로 나란히 세우면 식물도감의 표본 배열처럼 보입니다.
    실제 다발은 한 지점에서 부챗살로 벌어지며 서로 겹칩니다.
    그래서 밑동 두 곳을 정하고 거기서 각도를 크게 벌려 내보냅니다.
    왼쪽을 크게, 오른쪽을 작게 두어 좌우 대칭을 피합니다.
    """
    P = "bh"
    back, mid, front = [], [], []

    LX, LY = 108, 114        # 주 다발 밑동
    RX, RY = 236, 114        # 보조 다발 밑동

    # --- 뒤층: 넓게 벌어져 실루엣만 ---
    back += willow(LX, LY, 138, 60, -10, 6, 4.2, f"{P}-back")
    back += pine(LX, LY, 118, 68, -8, 8, 10.5)
    back += willow(LX, LY, 58, 58, 11, 6, 4.0, f"{P}-back")
    back += pine(RX, RY, 112, 48, -7, 7, 8.5)
    back += willow(RX, RY, 62, 42, 8, 5, 3.6, f"{P}-back")

    # --- 중간층 ---
    mid += eucalyptus(LX, LY, 126, 62, -9, 5, 5.2, f"{P}-mid")
    mid += eucalyptus(LX, LY, 70, 66, 10, 5, 5.4, f"{P}-mid")
    mid += berries(LX, LY, 148, 40, 4, 1.9, f"{P}-mid")
    mid += eucalyptus(RX, RY, 96, 46, 6, 4, 4.8, f"{P}-mid")

    # --- 앞층: 초점 ---
    front += eucalyptus(LX, LY, 100, 84, -5, 7, 6.4, f"{P}-front")
    front += eucalyptus(LX, LY, 84, 58, 8, 4, 5.6, f"{P}-front")
    # 목화는 긴 맨줄기 끝에 달면 사탕처럼 보입니다. 잎 사이에 낮게 앉힙니다.
    front += cotton(84, 60, 9.6, 22, 108, f"{P}-front")
    front += eucalyptus(RX, RY, 78, 50, 7, 4, 5.0, f"{P}-front")

    return (f'<svg class="botanical botanical-hero" viewBox="0 0 300 114"'
            f' preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">'
            + defs(P)
            + layer(back,  0.7, "0.42")
            + layer(mid,   0.9, "0.72")
            + layer(front, 1.1, "1")
            + "</svg>")


def divider():
    """섹션 디바이더 — 창살 두 줄 사이에 잎 한 쌍.

    작은 크기에서 식물을 빽빽이 그리면 뭉개집니다. 선이 주인공입니다.
    """
    P = "bd"
    p = [
        '<path d="M4 15H72"/>',
        '<path d="M128 15H196"/>',
        leaf(90, 15, 15.5, 4.6, -22, f"{P}-front"),
        leaf(110, 15, 15.5, 4.6, 22, f"{P}-front"),
        '<path d="M100 15v7"/>',
        f'<circle fill="url(#{P}-front)" cx="100" cy="11.4" r="1.9"/>',
    ]
    return (f'<svg class="botanical botanical-divider" viewBox="0 0 200 30"'
            f' aria-hidden="true" focusable="false">'
            + defs(P) + layer(p, 1.0, "1") + "</svg>")


if __name__ == "__main__":
    print("<!-- HERO BASE -->")
    print(hero_base())
    print("<!-- DIVIDER -->")
    print(divider())

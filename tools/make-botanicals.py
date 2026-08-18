#!/usr/bin/env python3
"""
겨울식물 SVG 라인아트 생성기 — 설계 문서 §AD-3

유칼립투스 · 솔가지 · 목화 · 라넌큘러스를 path 로 계산해 뽑습니다.
손으로 베지어를 쓰면 식물처럼 보이지 않아서 줄기 곡선의 접선을 계산해
잎을 붙이는 방식으로 만듭니다.

색은 넣지 않습니다. 전부 currentColor 를 상속받아 테마 교체를 따라갑니다.

  python3 tools/make-botanicals.py > /tmp/botanicals.svg
"""
import math

R = lambda v: round(v, 1)


def qbez(p0, p1, p2, t):
    """이차 베지어 위의 점과 접선 각도."""
    mt = 1 - t
    x = mt * mt * p0[0] + 2 * mt * t * p1[0] + t * t * p2[0]
    y = mt * mt * p0[1] + 2 * mt * t * p1[1] + t * t * p2[1]
    dx = 2 * mt * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0])
    dy = 2 * mt * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1])
    return (x, y), math.degrees(math.atan2(dy, dx))


def stem_points(x0, y0, ang, length, curve):
    """시작점·방향·길이·휘어짐으로 줄기 제어점을 만듭니다."""
    a = math.radians(ang)
    dx, dy = math.cos(a), -math.sin(a)
    px, py = -dy, dx                      # 법선
    p0 = (x0, y0)
    p2 = (x0 + dx * length + px * curve, y0 + dy * length + py * curve)
    p1 = (x0 + dx * length * 0.5 + px * curve * 0.35,
          y0 + dy * length * 0.5 + py * curve * 0.35)
    return p0, p1, p2


def eucalyptus(x0, y0, ang=90, length=60, curve=10, pairs=5,
               leaf=5.2, t_start=0.22, tip=True):
    """유칼립투스 — 둥근 잎이 줄기를 따라 마주납니다."""
    p0, p1, p2 = stem_points(x0, y0, ang, length, curve)
    out = [f'<path d="M{R(p0[0])} {R(p0[1])}Q{R(p1[0])} {R(p1[1])} {R(p2[0])} {R(p2[1])}"/>']
    for i in range(pairs):
        t = t_start + (0.95 - t_start) * (i / max(pairs - 1, 1))
        (cx, cy), tang = qbez(p0, p1, p2, t)
        s_ = leaf * (1 - 0.42 * (i / max(pairs - 1, 1)))
        for side in (+1, -1):
            off = tang + side * 52
            a = math.radians(off)
            lx = cx + math.cos(a) * s_ * 1.05
            ly = cy + math.sin(a) * s_ * 1.05
            out.append(leaf_path(lx, ly, s_ * 2.1, s_ * 0.95, off))
    if tip:
        (tx, ty), tang = qbez(p0, p1, p2, 1.0)
        a = math.radians(tang)
        out.append(leaf_path(tx + math.cos(a) * 2.6, ty + math.sin(a) * 2.6,
                             5.6, 2.2, tang))
    return out


def pine(x0, y0, ang=90, length=54, curve=-6, rows=8, needle=9.5):
    """솔가지 — 잎맥에서 바늘잎이 쌍으로 뻗습니다."""
    p0, p1, p2 = stem_points(x0, y0, ang, length, curve)
    out = [f'<path d="M{R(p0[0])} {R(p0[1])}Q{R(p1[0])} {R(p1[1])} {R(p2[0])} {R(p2[1])}"/>']
    for i in range(rows):
        t = 0.12 + 0.86 * (i / max(rows - 1, 1))
        (cx, cy), tang = qbez(p0, p1, p2, t)
        s = needle * (1 - 0.55 * (i / max(rows - 1, 1)))
        for side in (+1, -1):
            a = math.radians(tang + side * 43)
            out.append(
                f'<path d="M{R(cx)} {R(cy)}L{R(cx + math.cos(a) * s)} {R(cy + math.sin(a) * s)}"/>'
            )
    return out


def cotton(cx, cy, r=9.0, stem_len=18, ang=90, lobes=5):
    """목화 다래 — 솜뭉치.

    호의 반지름이 이웃한 꼭짓점 사이 거리(현)보다 크면 부풀지 않고
    그냥 원이 되어 사탕처럼 보입니다. 현의 절반에 가깝게 잡아야
    바깥으로 확실히 부푼 솜처럼 읽힙니다.
    """
    out = []
    a = math.radians(ang)
    tipx, tipy = cx - math.cos(a) * stem_len, cy + math.sin(a) * stem_len
    out.append(f'<path d="M{R(cx)} {R(cy)}L{R(tipx)} {R(tipy)}"/>')

    # 맨 줄기는 허전해서 마른 잎을 두 장 붙입니다
    for t, side in ((0.42, +1), (0.68, -1)):
        lx, ly = cx + (tipx - cx) * t, cy + (tipy - cy) * t
        la = math.radians(ang + side * 46)
        out.append(f'<path d="M{R(lx)} {R(ly)}l{R(math.cos(la) * r * 0.85)} {R(-math.sin(la) * r * 0.85)}"/>')

    inner = r * 0.62
    chord = 2 * inner * math.sin(math.pi / lobes)
    arc_r = chord * 0.52                      # 현의 절반 ≈ 최대 부풂
    pts = [(cx + math.cos(2 * math.pi * i / lobes - math.pi / 2) * inner,
            cy + math.sin(2 * math.pi * i / lobes - math.pi / 2) * inner)
           for i in range(lobes)]
    d = f"M{R(pts[0][0])} {R(pts[0][1])}"
    for i in range(1, lobes + 1):
        x, y = pts[i % lobes]
        d += f"A{R(arc_r)} {R(arc_r)} 0 0 1 {R(x)} {R(y)}"
    out.append(f'<path d="{d}Z"/>')

    # 마른 꽃받침 — 솜 아래로 벌어진 세 갈래
    for dg in (-70, 0, 70):
        a2 = math.radians(90 + dg)
        out.append(
            f'<path d="M{R(cx)} {R(cy + r * 0.42)}'
            f'L{R(cx + math.cos(a2) * r * 1.25)} {R(cy + r * 0.42 + math.sin(a2) * r * 1.15)}"/>'
        )
    return out


def group(paths, sw=1.0, opacity=None, fill=None):
    """fill 을 주면 면이 있는 층, 안 주면 선만 있는 층이 됩니다."""
    o = f' opacity="{opacity}"' if opacity else ""
    f = f'currentColor" fill-opacity="{fill}' if fill else "none"
    return (f'<g fill="{f}" stroke="currentColor" stroke-width="{sw}"'
            f' stroke-linecap="round" stroke-linejoin="round"{o}>'
            + "".join(paths) + "</g>")


def leaf_path(cx, cy, length, width, ang):
    """끝이 뾰족한 잎 실루엣.

    타원은 잎으로 안 보입니다. 잎은 양 끝이 한 점으로 모이고 가운데가
    부푼 형태라, 두 개의 이차 베지어를 마주 붙여 만듭니다.
    """
    a = math.radians(ang)
    dx, dy = math.cos(a), math.sin(a)
    px, py = -dy, dx
    tipx, tipy = cx + dx * length / 2, cy + dy * length / 2
    basx, basy = cx - dx * length / 2, cy - dy * length / 2
    c1x, c1y = cx + px * width, cy + py * width
    c2x, c2y = cx - px * width, cy - py * width
    return (f'<path d="M{R(basx)} {R(basy)}'
            f'Q{R(c1x)} {R(c1y)} {R(tipx)} {R(tipy)}'
            f'Q{R(c2x)} {R(c2y)} {R(basx)} {R(basy)}Z"/>')


def hero_base():
    """히어로 pane 바닥 — 유리창 한쪽 구석에서 자라 오른 군락.

    좌우 대칭으로 늘어놓으면 클립아트로 읽힙니다. 높이와 각도를 흩고
    왼쪽으로 무게를 몰아 실제로 자란 것처럼 보이게 합니다.
    실제 렌더 크기가 300px 폭이라 요소는 적고 크게 갑니다.
    """
    back, front = [], []
    # 뒤 — 옅은 층
    back += pine(64, 96, ang=79, length=52, curve=-10, rows=7, needle=10.5)
    back += eucalyptus(103, 96, ang=94, length=44, curve=9, pairs=4, leaf=6.2)
    back += eucalyptus(243, 96, ang=99, length=32, curve=7, pairs=3, leaf=5.4)
    # 앞 — 진한 초점
    front += eucalyptus(84, 96, ang=86, length=70, curve=-8, pairs=6, leaf=7.4)
    front += cotton(129, 46, r=10.4, stem_len=44, ang=97)
    front += pine(228, 96, ang=96, length=40, curve=6, rows=6, needle=8.6)
    return (f'<svg class="botanical botanical-hero" viewBox="0 0 300 96"'
            f' preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">'
            # 뒤에서 앞으로 3층. 면의 투명도 차이가 깊이를 만듭니다.
            + group(back, sw=0.8, opacity="0.45", fill="0.10")
            + group(front, sw=1.0, opacity="0.95", fill="0.16")
            + "</svg>")


def divider():
    """섹션 디바이더 — 유리 창살 두 줄 사이에 잎 한 쌍.

    작은 크기에서 식물을 빽빽이 그리면 뭉개집니다. 선이 주인공이고
    식물은 가운데 한 점만 찍습니다.
    """
    p = [
        '<path d="M4 15H74"/>',
        '<path d="M126 15H196"/>',
        '<ellipse cx="92" cy="15" rx="6.4" ry="4.6" transform="rotate(-24 92 15)"/>',
        '<ellipse cx="108" cy="15" rx="6.4" ry="4.6" transform="rotate(24 108 15)"/>',
        '<path d="M100 15v6.5"/>',
    ]
    return (f'<svg class="botanical botanical-divider" viewBox="0 0 200 30"'
            f' aria-hidden="true" focusable="false">' + group(p, sw=1.0) + "</svg>")


if __name__ == "__main__":
    print("<!-- HERO BASE -->")
    print(hero_base())
    print("<!-- DIVIDER -->")
    print(divider())

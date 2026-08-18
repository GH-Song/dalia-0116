#!/usr/bin/env python3
"""
동백 플로럴 SVG 생성기 — 설계 문서 §AD-3 v2

라인아트(make-botanicals.py, 폐기)를 대체합니다. 윤곽선 대신
**반투명 꽃잎을 3겹 겹쳐 쌓아** 수채의 번짐 같은 농담을 만듭니다.
그라데이션 <defs>가 없으므로 id 충돌 없이 인라인 반복이 가능합니다.

다색 규칙 — SVG 안에 색을 직접 찍지 않습니다. 부위별 wrapper 클래스에
style.css 가 color: var(--color-*) 를 배정하고 내부는 전부 currentColor.
  .flora-bloom       큰 꽃 (더스티 코랄)
  .flora-bloom-soft  작은 꽃 (블러시)
  .flora-leaf        잎·줄기 (웜 올리브)
  .flora-stem        안개꽃·잔가지 (뮤트 브라운)
  .flora-stamen      꽃술·베리 (앤티크 골드)

난수는 시드 고정 — 다시 돌려도 같은 그림이 나옵니다.

  python3 tools/make-florals.py            # 자산 4종을 전부 출력
  python3 tools/make-florals.py garland    # 하나만
"""
import math
import random
import sys

_prec = 1                                  # v2.2 신규 자산은 0(정수) — 용량 절감


def R1(v):
    """좌표 반올림. _prec=0 이면 정수 — 122px 렌더에서 ±0.4px 차이라
    안 보이지만 path 데이터가 ~25% 줄어듭니다 (용량 게이트 대응)."""
    r = round(v, _prec)
    return int(r) if _prec == 0 else r


rnd = random.Random(20270116)              # 예식일 = 시드


def jitter(base, pct):
    """개체 변이. 같은 꽃잎이 두 장 있으면 즉시 기계로 보입니다."""
    return base * (1 + rnd.uniform(-pct, pct))


def _dir(deg):
    a = math.radians(deg)
    return math.cos(a), math.sin(a)


def petal(cx, cy, deg, r0, length, width):
    """끝이 둥근 꽃잎 한 장. 밑동(중심 쪽)에서 시작해 밖으로 벌어집니다.

    끝점 양옆에 제어점을 두어 팁이 뾰족해지지 않고 둥글게 말립니다.
    (뾰족하면 동백이 아니라 클레마티스처럼 보입니다.)
    """
    dx, dy = _dir(deg)
    px, py = -dy, dx
    bx, by = cx + dx * r0, cy + dy * r0
    tx, ty = bx + dx * length, by + dy * length
    w = width
    c1 = (bx + px * w * 0.45 + dx * length * 0.10,
          by + py * w * 0.45 + dy * length * 0.10)
    c2 = (tx + px * w * 0.62 + dx * length * 0.03,
          ty + py * w * 0.62 + dy * length * 0.03)
    c3 = (tx - px * w * 0.62 + dx * length * 0.03,
          ty - py * w * 0.62 + dy * length * 0.03)
    c4 = (bx - px * w * 0.45 + dx * length * 0.10,
          by - py * w * 0.45 + dy * length * 0.10)
    return (f'M{R1(bx)} {R1(by)}'
            f'C{R1(c1[0])} {R1(c1[1])} {R1(c2[0])} {R1(c2[1])} {R1(tx)} {R1(ty)}'
            f'C{R1(c3[0])} {R1(c3[1])} {R1(c4[0])} {R1(c4[1])} {R1(bx)} {R1(by)}Z')


def camellia(cx, cy, radius, face_deg=0.0, slim=False):
    """겹동백 — 꽃잎 고리 3겹. 바깥일수록 옅게, 안쪽일수록 진하게.

    반투명 겹침이 수채의 농담을 만드는 핵심입니다 (설계 문서 §AD-3 v2).
    slim=True 는 반지름이 작은 꽃용 2겹 — 좁은 자리에서 꽃잎이 뭉개지지
    않고 path 데이터도 40% 가볍습니다 (v2.2).
    """
    rings = [
        (8, 0.24, 0.74, 0.54, 0.30),   # (장수, 밑동 오프셋, 길이, 폭, 불투명도)
        (6, 0.16, 0.56, 0.46, 0.44),
        (5, 0.08, 0.38, 0.32, 0.58),
    ]
    if slim:
        rings = [
            (6, 0.20, 0.72, 0.56, 0.34),
            (4, 0.10, 0.46, 0.40, 0.54),
        ]
    # 꽃잎 폭 > 꽃잎 간격이어야 서로 겹칩니다. 겹치지 않으면 데이지처럼 보입니다.
    paths = []
    for k, (n, r0f, lf, wf, op) in enumerate(rings):
        base = face_deg + (360 / n) * 0.5 * k          # 고리마다 어긋나게
        ds = []
        for i in range(n):
            deg = base + i * 360 / n + rnd.uniform(-4, 4)
            ds.append(petal(cx, cy, deg,
                            radius * r0f,
                            jitter(radius * lf, 0.08),
                            jitter(radius * wf, 0.08)))
        edge = (' stroke="currentColor" stroke-width="0.5" stroke-opacity="0.5"'
                if k == 0 else '')
        paths.append(f'<path opacity="{op}"{edge} d="{"".join(ds)}"/>')
    return "".join(paths)


def stamens(cx, cy, radius):
    """꽃술 — 중심의 골드 점 무리."""
    dots = [f'<circle cx="{R1(cx)}" cy="{R1(cy)}" r="{R1(radius * 0.07)}"/>']
    for i in range(6):
        deg = i * 60 + rnd.uniform(-14, 14)
        dx, dy = _dir(deg)
        rr = radius * rnd.uniform(0.10, 0.17)
        dots.append(f'<circle cx="{R1(cx + dx * rr)}" cy="{R1(cy + dy * rr)}" '
                    f'r="{R1(radius * 0.045)}"/>')
    return "".join(dots)


def bud(cx, cy, radius, deg):
    """봉오리 — 꽃잎 세 장이 위로 모입니다. 받침잎은 호출부의 잎 그룹에서."""
    ds = [petal(cx, cy, deg + off, radius * 0.05,
                jitter(radius * (0.9 - abs(off) / 90), 0.08),
                jitter(radius * 0.5, 0.10))
          for off in (-24, 26, 0)]
    return f'<path opacity="0.5" d="{"".join(ds)}"/>'


def _qbez(p0, p1, p2, t):
    mt = 1 - t
    x = mt * mt * p0[0] + 2 * mt * t * p1[0] + t * t * p2[0]
    y = mt * mt * p0[1] + 2 * mt * t * p1[1] + t * t * p2[1]
    dx = 2 * mt * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0])
    dy = 2 * mt * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1])
    return (x, y), math.degrees(math.atan2(dy, dx))


def leaf_shape(cx, cy, length, width, deg):
    """끝이 뾰족한 잎 — 이차 베지어 두 장."""
    dx, dy = _dir(deg)
    px, py = -dy, dx
    tx, ty = cx + dx * length / 2, cy + dy * length / 2
    bx, by = cx - dx * length / 2, cy - dy * length / 2
    return (f'M{R1(bx)} {R1(by)}'
            f'Q{R1(cx + px * width)} {R1(cy + py * width)} {R1(tx)} {R1(ty)}'
            f'Q{R1(cx - px * width)} {R1(cy - py * width)} {R1(bx)} {R1(by)}Z')


def spray(x0, y0, deg, length, curve, pairs, size):
    """잎가지 — 줄기를 따라 잎이 어긋나며 답니다. 잎은 2겹(면+맥)."""
    a = math.radians(deg)
    dx, dy = math.cos(a), math.sin(a)
    px, py = -dy, dx
    p0 = (x0, y0)
    p2 = (x0 + dx * length + px * curve, y0 + dy * length + py * curve)
    p1 = (x0 + dx * length * 0.5 + px * curve * 0.35,
          y0 + dy * length * 0.5 + py * curve * 0.35)
    fills, veins = [], []
    stem = (f'M{R1(p0[0])} {R1(p0[1])}Q{R1(p1[0])} {R1(p1[1])} '
            f'{R1(p2[0])} {R1(p2[1])}')
    for i in range(pairs):
        t = 0.18 + 0.8 * (i / max(pairs - 1, 1))
        (cx, cy), tang = _qbez(p0, p1, p2, t)
        taper = 1 - 0.40 * (i / max(pairs - 1, 1))
        for side in (+1, -1):
            if rnd.random() < 0.18:            # 가끔 잎을 건너뜁니다
                continue
            s = jitter(size * taper, 0.16)
            off = tang + side * jitter(52, 0.14)
            ox, oy = _dir(off)
            lx, ly = cx + ox * s * 0.52, cy + oy * s * 0.52
            fills.append(leaf_shape(lx, ly, s, s * 0.34, off))
            vx, vy = _dir(off)
            veins.append(f'M{R1(cx)} {R1(cy)}L{R1(cx + vx * s * 0.86)} '
                         f'{R1(cy + vy * s * 0.86)}')
    return (f'<path fill="none" stroke="currentColor" stroke-width="0.9" '
            f'opacity="0.55" d="{stem}"/>'
            f'<path opacity="0.34" d="{"".join(fills)}"/>'
            f'<path fill="none" stroke="currentColor" stroke-width="0.55" '
            f'opacity="0.38" d="{"".join(veins)}"/>')


def gypso(x0, y0, deg, length, forks):
    """안개꽃 — 가는 가지 끝의 점."""
    lines, dots = [], []
    for _ in range(forks):
        d = deg + rnd.uniform(-34, 34)
        ln = jitter(length, 0.3)
        dx, dy = _dir(d)
        mx, my = x0 + dx * ln * 0.55, y0 + dy * ln * 0.55
        ex, ey = x0 + dx * ln, y0 + dy * ln
        lines.append(f'M{R1(x0)} {R1(y0)}Q{R1(mx + dy * 3)} {R1(my - dx * 3)} '
                     f'{R1(ex)} {R1(ey)}')
        dots.append(f'<circle cx="{R1(ex)}" cy="{R1(ey)}" '
                    f'r="{R1(rnd.uniform(1.1, 1.9))}"/>')
    return (f'<path fill="none" stroke="currentColor" stroke-width="0.6" '
            f'opacity="0.5" d="{"".join(lines)}"/>'
            f'<g opacity="0.55">{"".join(dots)}</g>')


def berries(x0, y0, deg, length, count):
    """열매 가지 — 줄기 끝에 둥근 열매."""
    dx, dy = _dir(deg)
    lines, dots = [], []
    for _ in range(count):
        d = deg + rnd.uniform(-26, 26)
        ln = jitter(length, 0.25)
        bx, by = x0 + _dir(d)[0] * ln, y0 + _dir(d)[1] * ln
        lines.append(f'M{R1(x0)} {R1(y0)}L{R1(bx)} {R1(by)}')
        dots.append(f'<circle cx="{R1(bx)}" cy="{R1(by)}" '
                    f'r="{R1(rnd.uniform(2.0, 2.9))}"/>')
    return (f'<path fill="none" stroke="currentColor" stroke-width="0.7" '
            f'opacity="0.5" d="{"".join(lines)}"/>'
            f'<g opacity="0.6">{"".join(dots)}</g>')


def svg(cls, viewbox, body):
    return (f'<svg class="flora {cls}" viewBox="{viewbox}" '
            f'aria-hidden="true" focusable="false">{body}</svg>')


def grp(cls, body):
    """부위 그룹. fill 을 명시해야 path 기본값(black)에 먹히지 않습니다."""
    return f'<g class="{cls}" fill="currentColor">{body}</g>'


# ---------------------------------------------------------------
# 자산 4종
# ---------------------------------------------------------------

def falling_petals(spots):
    """꽃에서 떨어져 내리는 꽃잎 — garland 아래 여백을 잇는 장치."""
    out = []
    for (cx, cy) in spots:
        d = petal(cx, cy, rnd.uniform(30, 150), 0,
                  rnd.uniform(6.5, 9.5), rnd.uniform(2.6, 3.6))
        out.append(f'<path opacity="{round(rnd.uniform(0.22, 0.4), 2)}" d="{d}"/>')
    return "".join(out)


def garland():
    """히어로 상단 — 중앙 동백에서 좌우로 흘러내리는 garland.

    아래로 길게 늘어지는 잔가지 두 줄이 100svh 히어로의
    상단 여백을 자연스럽게 채웁니다.
    """
    leaves = "".join([
        spray(150, 30, 196, 96, -20, 6, 17),
        spray(212, 32, -18, 92, 22, 6, 16),
        spray(166, 40, 214, 60, -12, 4, 13),
        spray(196, 44, -32, 58, 12, 4, 13),
        spray(118, 52, 206, 52, -8, 4, 11),
        spray(244, 50, -8, 50, 10, 4, 11),
        # 트레일 — 중앙 아래로 흘러내리는 가는 가지. 좌우 길이·곡률을 다르게
        spray(156, 60, 117, 82, -27, 4, 11),
        spray(210, 62, 67, 112, 24, 6, 9),
    ])
    stems = "".join([
        gypso(120, 48, 210, 30, 5),
        gypso(242, 46, -16, 28, 5),
        gypso(180, 26, 250, 22, 4),
        gypso(186, 70, 86, 34, 3),
    ])
    berr = berries(96, 62, 190, 16, 4) + berries(268, 58, -4, 15, 3)
    petals = falling_petals([
        (128, 118), (238, 128), (176, 150), (210, 168), (148, 182), (196, 132),
    ])
    soft = (camellia(126, 44, 22, 40) + camellia(238, 46, 24, -30)
            + bud(88, 60, 15, 208) + bud(276, 54, 14, -18) + petals)
    main = camellia(181, 46, 36, 8)
    stam = (stamens(181, 46, 36) + stamens(126, 44, 22) + stamens(238, 46, 24))
    return svg("flora-garland", "0 0 360 190",
               grp('flora-leaf', leaves)
               + grp('flora-stem', stems)
               + grp('flora-stamen', berr)
               + grp('flora-bloom-soft', soft)
               + grp('flora-bloom', main)
               + grp('flora-stamen', stam))


def corner():
    """섹션 코너 — 좌상단 기준. 오른쪽 코너는 CSS scaleX(-1)로 뒤집습니다."""
    leaves = "".join([
        spray(30, 26, 12, 86, 16, 5, 14),
        spray(26, 30, 78, 84, -14, 5, 13),
        spray(40, 40, 44, 54, 10, 3, 11),
    ])
    stems = gypso(46, 50, 30, 30, 4)
    soft = camellia(64, 26, 15, 20) + bud(24, 74, 12, 96)
    main = camellia(30, 32, 22, 55)
    stam = stamens(30, 32, 22) + stamens(64, 26, 15)
    berr = berries(56, 62, 58, 14, 3)
    return svg("flora-corner", "0 0 150 150",
               grp('flora-leaf', leaves)
               + grp('flora-stem', stems)
               + grp('flora-stamen', berr)
               + grp('flora-bloom-soft', soft)
               + grp('flora-bloom', main)
               + grp('flora-stamen', stam))


def divider():
    """섹션 사이 — 중앙 꽃 한 송이와 좌우로 눕는 잎, 골드 헤어라인."""
    leaves = "".join([
        spray(118, 20, 186, 44, -5, 3, 10),
        spray(142, 20, -6, 44, 5, 3, 10),
    ])
    hair = ('<g class="flora-stamen"><path fill="none" stroke="currentColor" '
            'stroke-width="0.8" opacity="0.55" d="M6 20H64M196 20H254"/>'
            '<circle cx="6" cy="20" r="1.2"/><circle cx="254" cy="20" r="1.2"/></g>')
    main = camellia(130, 19, 12, 90)
    stam = stamens(130, 19, 12)
    return svg("flora-divider", "0 0 260 40",
               hair
               + grp('flora-leaf', leaves)
               + grp('flora-bloom', main)
               + grp('flora-stamen', stam))


def sprig():
    """푸터 — 낮게 눕는 가지 하나."""
    leaves = spray(58, 40, -12, 60, 8, 4, 12) + spray(140, 36, 188, 56, -8, 4, 11)
    stems = gypso(100, 34, -60, 22, 4)
    soft = bud(100, 30, 13, -88)
    stam = berries(74, 40, -30, 13, 3)
    return svg("flora-sprig", "0 0 200 58",
               grp('flora-leaf', leaves)
               + grp('flora-stem', stems)
               + grp('flora-stamen', stam)
               + grp('flora-bloom-soft', soft))


def corner_full():
    """후반 섹션 코너(마음 전하실 곳·공유) — 개화 서사의 크레셴도 (§AD-3 v2.2).

    corner 의 봉오리 자리에 만개 한 송이를 더 얹고 안개꽃·낙화 꽃잎을
    늘립니다. 전반 코너보다 덜 화려하면 안 됩니다 — 서사의 방향은
    '점점 더 핀다'이지 '앞을 아낀다'가 아닙니다.

    독립 시드 — 기존 4종 자산의 난수 스트림을 건드리지 않습니다.
    (현재 HTML 의 corner·divider·sprig 인라인은 과거 스트림 산출물이라
    전량 재실행과 일치하지 않습니다. 기존 자산을 다시 뽑아 붙이지 마세요.)
    """
    global rnd, _prec
    rnd = random.Random(20270116 + 22)
    _prec = 0
    leaves = "".join([
        spray(30, 26, 12, 86, 16, 5, 14),
        spray(26, 30, 78, 84, -14, 5, 13),
        spray(40, 40, 44, 54, 10, 3, 11),
    ])
    stems = gypso(46, 50, 30, 30, 4) + gypso(80, 42, 6, 24, 3)
    petals = falling_petals([(98, 82), (78, 106)])
    soft = camellia(64, 26, 15, 20, slim=True) + camellia(29, 76, 14, 112, slim=True) + petals
    main = camellia(30, 32, 22, 55)
    stam = stamens(30, 32, 22) + stamens(64, 26, 15) + stamens(29, 76, 14)
    berr = berries(56, 62, 58, 14, 3)
    _prec = 1
    return svg("flora-corner", "0 0 150 150",
               grp('flora-leaf', leaves)
               + grp('flora-stem', stems)
               + grp('flora-stamen', berr)
               + grp('flora-bloom-soft', soft)
               + grp('flora-bloom', main)
               + grp('flora-stamen', stam))


def bloom_sprig():
    """푸터 — 만개 동백이 중심에 오는 가지 (§AD-3 v2.2).

    sprig(봉오리 하나)를 대체합니다. 페이지 서사의 도착점:
    '기다리던 봄이 왔습니다'. 곁의 봉오리가 히어로의 기다림과 호응합니다.
    독립 시드 — corner_full 과 같은 이유.
    """
    global rnd, _prec
    rnd = random.Random(20270116 + 44)
    _prec = 0
    leaves = spray(62, 42, -12, 64, 8, 4, 12) + spray(138, 38, 188, 60, -8, 4, 11)
    stems = gypso(72, 30, -104, 20, 4) + gypso(130, 28, -66, 20, 3)
    soft = (bud(64, 30, 12, -96) + camellia(136, 30, 11, 30, slim=True)
            + falling_petals([(44, 50), (160, 48)]))
    main = camellia(100, 30, 19, -90)
    stam = stamens(100, 30, 19) + stamens(136, 30, 11)
    berr = berries(84, 44, -150, 12, 3)
    _prec = 1
    return svg("flora-sprig", "0 0 200 64",
               grp('flora-leaf', leaves)
               + grp('flora-stem', stems)
               + grp('flora-stamen', berr)
               + grp('flora-bloom-soft', soft)
               + grp('flora-bloom', main)
               + grp('flora-stamen', stam))


ASSETS = {"garland": garland, "corner": corner, "divider": divider, "sprig": sprig,
          "corner_full": corner_full, "bloom_sprig": bloom_sprig}


def main() -> int:
    want = sys.argv[1:] or list(ASSETS)
    for name in want:
        if name not in ASSETS:
            print(f"모름: {name} (가능: {', '.join(ASSETS)})", file=sys.stderr)
            return 1
        out = ASSETS[name]()
        print(f"<!-- {name} : {len(out):,} B -->")
        print(out)
        print()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

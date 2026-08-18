/* =============================================================
   script.js — 송국호 · 최은호 청첩장
   프레임워크 없음. 외부 요청 0건.

   구성
     0. 유틸
     1. 진입 모션 (reveal)
     2. 토스트          — 규칙 3 위험 지점
     3. 복사            — 계좌·주소·링크 공용
     4~ 각 섹션 모듈    — 단계별로 채웁니다
   ============================================================= */
(function () {
  'use strict';

  /* ---------------------------------------------------------
     0. 유틸
     --------------------------------------------------------- */
  var $  = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  };

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  function prefersReducedMotion() { return reduceMotion.matches; }

  function haptic(ms) {
    try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {}
  }

  /* ---------------------------------------------------------
     1. 진입 모션 — 스크롤 진입 시 fade-in + translateY
     reduced-motion 이면 관찰하지 않고 즉시 전부 표시합니다.
     --------------------------------------------------------- */
  function initReveal() {
    var targets = $$('.reveal');
    if (!targets.length) return;

    if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
      targets.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });

    targets.forEach(function (el) { io.observe(el); });
  }

  /* ---------------------------------------------------------
     2. 토스트
     ★ 규칙 3 — 하객 이름 같은 사용자 문자열이 여기를 지나갑니다.
       - 요소에 data-user-content 가 붙어 있어야 합니다 (style.css 가 --font-ui 강제)
       - innerHTML 을 쓰지 않습니다. textContent 만.
     --------------------------------------------------------- */
  var toastTimer = null;

  function toast(message) {
    var el = $('.toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('is-shown');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('is-shown'); }, 2600);
  }

  /* ---------------------------------------------------------
     3. 복사 — 계좌·주소·링크 공용
     클립보드 API 는 https 또는 localhost 에서만 동작하고
     카카오톡 인앱 브라우저에서 막히는 경우가 있어 폴백을 둡니다.
     --------------------------------------------------------- */
  function legacyCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }

  function copyText(text, successMessage) {
    function done(ok) {
      if (ok) { haptic(12); toast(successMessage || '복사했습니다.'); }
      else { toast('복사할 수 없습니다. 길게 눌러 직접 복사해 주세요.'); }
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text)
        .then(function () { done(true); })
        .catch(function () { done(legacyCopy(text)); });
    } else {
      done(legacyCopy(text));
    }
  }

  /* ---------------------------------------------------------
     섹션 모듈
     --------------------------------------------------------- */
  /* ---------------------------------------------------------
     4. 눈꽃 · 꽃잎 (설계 문서 §7)

     예전 구현은 단색 원을 뿌렸는데, 작은 원은 그냥 점으로 보여서
     은은하기는커녕 지저분했습니다. 이제 실제 모양을 그립니다.

       눈꽃  — 육각 대칭 결정. 가지에서 곁가지가 뻗는 구조
       꽃잎  — 한쪽이 뾰족한 물방울. 떨어지며 천천히 돕니다

     모양은 시작할 때 오프스크린 캔버스에 한 번만 그려두고(스프라이트)
     매 프레임에는 그 그림을 옮겨 그리기만 합니다. 매번 path 를 새로
     그리면 저사양 폰에서 프레임이 떨어집니다.
     --------------------------------------------------------- */

  /* 크림색 배경에서는 흰색이 거의 안 보입니다. 눈꽃은 흰색에 가깝게,
     꽃잎은 팔레트의 sage/목화빛으로 두어 서로 다른 결로 섞이게 합니다. */
  function cssVar(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  /** 육각 눈꽃 하나를 스프라이트로 굽습니다.
      음영(shade)을 넓은 밑선으로 먼저 긋고 흰 결정을 위에 얹습니다 —
      밝은 배경에서는 음영이, 어두운 배경에서는 흰 코어가 대비를 만듭니다. */
  function makeFlakeSprite(size, color, shade, dpr) {
    var c = document.createElement('canvas');
    c.width = c.height = Math.ceil(size * dpr);
    var x = c.getContext('2d');
    x.scale(dpr, dpr);
    x.translate(size / 2, size / 2);

    /* 음영 밑선이 캔버스에 잘리지 않도록 결정 반지름을 한 뼘 줄입니다 */
    var r = size / 2 - 2;
    var core = Math.max(0.7, size / 22);
    x.lineCap = 'round';
    x.beginPath();

    for (var i = 0; i < 6; i++) {
      var a = (Math.PI / 3) * i;
      var dx = Math.cos(a), dy = Math.sin(a);

      /* 주가지 */
      x.moveTo(0, 0);
      x.lineTo(dx * r, dy * r);

      /* 곁가지 — 뿌리쪽일수록 길게 */
      for (var k = 0; k < 3; k++) {
        var t = 0.34 + k * 0.22;          /* 주가지 위 위치 */
        var len = r * (0.30 - k * 0.07);  /* 곁가지 길이 */
        var bx = dx * r * t, by = dy * r * t;
        for (var side = -1; side <= 1; side += 2) {
          var b = a + side * (Math.PI / 3.1);
          x.moveTo(bx, by);
          x.lineTo(bx + Math.cos(b) * len, by + Math.sin(b) * len);
        }
      }
    }

    x.strokeStyle = shade;
    x.lineWidth = core + 1.5;
    x.stroke();

    x.strokeStyle = color;
    x.lineWidth = core;
    x.stroke();
    return c;
  }

  /** 꽃잎 하나를 스프라이트로 굽습니다. */
  function makePetalSprite(size, color, dpr) {
    var c = document.createElement('canvas');
    c.width = c.height = Math.ceil(size * dpr);
    var x = c.getContext('2d');
    x.scale(dpr, dpr);
    x.translate(size / 2, size / 2);

    /* 좌우 대칭이면 아몬드처럼 보입니다. 한쪽을 더 부풀리고 끝을 살짝
       비틀어야 꽃잎처럼 읽힙니다. */
    var w = size * 0.30, h = size * 0.46;
    x.fillStyle = color;
    x.beginPath();
    x.moveTo(size * 0.04, -h);                                   /* 살짝 기운 끝 */
    x.bezierCurveTo(w * 1.15, -h * 0.35, w * 0.95, h * 0.62, 0, h);
    x.bezierCurveTo(-w * 0.80, h * 0.55, -w * 0.72, -h * 0.30, size * 0.04, -h);
    x.closePath();
    x.fill();
    return c;
  }

  function initSnow() {
    var canvas = $('.snow');
    if (!canvas || prefersReducedMotion()) return;

    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var flakeColor = cssVar('--snow-flake', '#FFFFFF');
    var flakeShade = cssVar('--snow-flake-shade', 'rgba(112,74,55,0.38)');
    var petalColor = cssVar('--snow-petal', 'rgba(207,195,180,0.5)');

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var sprites = null;
    var bits = [];
    var w = 0, h = 0, raf = null, last = 0;

    function bake() {
      sprites = {
        flake: [makeFlakeSprite(26, flakeColor, flakeShade, dpr), makeFlakeSprite(18, flakeColor, flakeShade, dpr)],
        petal: [makePetalSprite(22, petalColor, dpr), makePetalSprite(15, petalColor, dpr)]
      };
    }

    /* 입자 페이드 (설계 문서 §7 v2.3 + v3 연속성) — 눈·꽃잎 혼합은
       모시는 글까지, 그 아래로는 꽃잎 몇 장만. 기준선은 .greeting 하단.

       ★ v3 — 아무리 빠르게 왕복 스크롤해도 점멸·순간이동이 없어야 합니다.
         · 진행도 p 는 프레임마다 한 번 계산해 모두가 공유합니다.
           스폰 시점의 p 를 알파에 구워 두지 않습니다 — 구우면 위로
           되돌아왔을 때 어두운 입자가 남습니다.
         · 컬링은 양방향 페이드 — 사라질 때도, 되살아날 때도 연속으로만.
         · 완전히 잠든 입자만 화면 위에서 재진입합니다. */
    var fadeBase = 0;              /* layout() 에서 잽니다 */
    var KEEP = 4;                  /* 페이드 뒤 남는 꽃잎 수 */
    var FADE_RATE = 0.4;           /* 초당 페이드 변화량 — 약 2.5초에 완주 */

    function progress() {
      if (!fadeBase) return 0;
      var vh = h || 1;
      var y = window.scrollY || document.documentElement.scrollTop || 0;
      /* 모시는 글 하단이 화면 중턱을 지날 때 시작, 1.2 뷰포트에 걸쳐 완료 */
      return Math.min(1, Math.max(0, (y - (fadeBase - vh * 0.6)) / (vh * 1.2)));
    }

    function targetCount() {
      return Math.max(9, Math.min(26, Math.round((w * h) / 34000)));
    }

    /* 지금 스크롤 위치에서 온전히 살아 있어도 되는 입자 수 */
    function quota(p, n) {
      if (p <= 0) return n;
      return Math.max(KEEP, Math.round(n - (n - KEEP) * p));
    }

    function spawn(p, y) {
      /* 모시는 글 아래로 내려갈수록 눈이 그치고 꽃잎만 남습니다 */
      var isFlake = Math.random() < 0.62 * (1 - p);
      var big = Math.random() < 0.4;
      var size = (isFlake ? (big ? 26 : 18) : (big ? 22 : 15)) * (0.7 + Math.random() * 0.5);
      return {
        sprite: isFlake ? sprites.flake[big ? 0 : 1] : sprites.petal[big ? 0 : 1],
        size: size,
        x: Math.random() * w,
        y: y === undefined ? -size : y,
        vy: (isFlake ? 7 : 11) + Math.random() * 12,   /* 초당 낙하 px */
        sway: 10 + Math.random() * 22,
        phase: Math.random() * Math.PI * 2,
        rate: 0.10 + Math.random() * 0.20,
        spin: (Math.random() - 0.5) * 0.6,             /* 초당 회전 rad */
        rot: Math.random() * Math.PI * 2,
        /* 글자 위를 지나가므로 진하면 읽기를 방해합니다 (0.40~0.85).
           스크롤 감쇠는 그리는 순간의 p 로 계산합니다. */
        base: 0.40 + Math.random() * 0.45,
        fade: 1,        /* 컬링 페이드 배율 0~1 — 양방향 연속 변화만 허용 */
        asleep: false
      };
    }

    function seed() {
      var n = targetCount();
      var p = progress();
      var q = quota(p, n);
      bits = [];
      for (var i = 0; i < n; i++) {
        var b = spawn(p, Math.random() * h);
        if (i >= q) { b.fade = 0; b.asleep = true; }
        bits.push(b);
      }
    }

    /* 캔버스 크기·페이드 기준선만 갱신합니다. 입자는 건드리지 않습니다.
       반환 — 폭이 바뀌었는지(회전 등), 아직 잴 수 없으면 null.
       뷰포트는 캔버스 대신 window 에서 읽습니다 — 레이아웃 타이밍에
       따라 clientWidth 가 0 으로 잡히는 경우가 있습니다. */
    function layout() {
      var nw = window.innerWidth || document.documentElement.clientWidth || 0;
      var nh = window.innerHeight || document.documentElement.clientHeight || 0;
      if (!nw || !nh) return null;

      var widthChanged = Math.abs(nw - w) > 1;
      w = nw; h = nh;
      canvas.width  = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (!sprites) bake();
      /* 입자 페이드 기준선 — 모시는 글 하단 (설계 문서 §7 v2.3) */
      var greeting = document.querySelector('.greeting');
      fadeBase = greeting ? greeting.offsetTop + greeting.offsetHeight : 0;
      return widthChanged;
    }

    function frame(now) {
      var dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
      last = now;

      ctx.clearRect(0, 0, w, h);

      var p = progress();
      var q = quota(p, bits.length);
      var dim = 1 - 0.4 * p;     /* 페이드 구간 전역 감쇠 — '정말 은은하게' */

      for (var i = 0; i < bits.length; i++) {
        var b = bits[i];

        /* 잠든 입자 — 쿼터가 회복되면(위로 스크롤) 화면 위에서 재진입 */
        if (b.asleep) {
          if (i < q) { b = bits[i] = spawn(p); b.fade = 0; }
          else continue;
        }

        /* 컬링 페이드 — 목표(살림 1 / 재움 0)를 향해 연속으로만 움직입니다.
           낙하가 느려(초당 7~23px) 화면 밖을 기다리면 1분씩 걸리므로
           2~3초 감쇠로 재우고, 경계에서 왕복해도 알파가 튀지 않습니다. */
        var goal = i < q ? 1 : 0;
        if (b.fade < goal)      b.fade = Math.min(goal, b.fade + dt * FADE_RATE);
        else if (b.fade > goal) b.fade = Math.max(goal, b.fade - dt * FADE_RATE);
        if (goal === 0 && b.fade <= 0.02) { b.asleep = true; continue; }

        b.y += b.vy * dt;
        b.phase += b.rate * dt * Math.PI * 2;
        b.rot += b.spin * dt;

        if (b.y - b.size > h) {
          if (i < q) { bits[i] = spawn(p); }   /* 다음 프레임부터 위에서 다시 */
          else { b.asleep = true; }
          continue;
        }

        var x = b.x + Math.sin(b.phase) * b.sway;

        ctx.save();
        ctx.globalAlpha = b.base * b.fade * dim;
        ctx.translate(x, b.y);
        ctx.rotate(b.rot);
        ctx.drawImage(b.sprite, -b.size / 2, -b.size / 2, b.size, b.size);
        ctx.restore();
      }
      raf = requestAnimationFrame(frame);
    }

    function start() { if (raf === null && w && h) { last = 0; raf = requestAnimationFrame(frame); } }
    function stop()  { if (raf !== null) { cancelAnimationFrame(raf); raf = null; } }

    if (layout() !== null) { seed(); start(); }
    else {
      /* 레이아웃이 아직이면 다음 프레임에 다시 시도합니다 */
      requestAnimationFrame(function () { if (layout() !== null) { seed(); start(); } });
    }

    /* ★ v3 — 모바일 주소창 개폐도 resize 로 들어옵니다. 여기서 재시드하면
       스크롤 도중 입자가 통째로 재배치되어 점멸처럼 보입니다(기존 버그의
       주원인). 재시드는 폭이 바뀌는 회전 때만. 그 외에는 캔버스만 맞추고
       모자란 개수를 위에서 페이드 인으로 늘리기만 합니다. */
    var resizeTimer = null;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        var widthChanged = layout();
        if (widthChanged === null) return;
        if (widthChanged) {
          seed();
        } else {
          var n = targetCount();
          var p = progress();
          while (bits.length < n) {
            var nb = spawn(p);
            nb.fade = 0;
            bits.push(nb);
          }
        }
        start();
      }, 200);
    });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else start();
    });

    var onPref = function () {
      if (prefersReducedMotion()) { stop(); ctx.clearRect(0, 0, w, h); canvas.style.display = 'none'; }
    };
    if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', onPref);
  }

  /* ---------------------------------------------------------
     5. D-day — 예식일까지 남은 날
     한국은 서머타임이 없어 KST = UTC+9 고정입니다. 하객 기기가
     어느 시간대에 있든 '한국 날짜' 기준으로 세도록 자정을 맞춥니다.
     --------------------------------------------------------- */
  var WEDDING_ISO = '2027-01-16T12:00:00+09:00';
  var KST_OFFSET  = 9 * 60 * 60 * 1000;

  function kstMidnight(ts) {
    var d = new Date(ts + KST_OFFSET);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - KST_OFFSET;
  }

  function initCountdown() {
    var box = $('[data-dday]');
    if (!box) return;
    var lead = $('[data-dday-lead]', box);
    var num  = $('[data-dday-num]', box);
    if (!lead || !num) return;

    var days = Math.round(
      (kstMidnight(Date.parse(WEDDING_ISO)) - kstMidnight(Date.now())) / 86400000
    );

    /* 숫자 표기는 Cormorant(라틴·숫자 서브셋)가 그립니다.
       'D - n' 의 글자는 전부 ALWAYS 문자 집합에 있습니다. */
    if (days > 0) {
      num.textContent = 'D - ' + days;
    } else if (days === 0) {
      lead.textContent = '오늘, 저희 두 사람 결혼합니다';
      num.textContent  = 'D - DAY';
    } else {
      lead.textContent = '국호 · 은호의 결혼식으로부터';
      num.textContent  = 'D + ' + (-days);
    }
  }

  /* ---------------------------------------------------------
     6. 라이트박스 (공용) — 갤러리와 약도가 함께 씁니다
     열기 / 좌우 이동 / 스와이프 / 핀치 확대 / 두 번 탭 / 닫기
     --------------------------------------------------------- */
  var lightbox = null;

  function initLightbox() {
    var box = $('[data-lightbox]');
    if (!box) return null;

    var img   = $('[data-lightbox-img]', box);
    var cnt   = $('[data-lightbox-count]', box);
    var nav   = $('.lightbox-nav', box);
    var items = [];
    var idx = 0;
    var lastFocus = null;
    var zoom = 1, panX = 0, panY = 0;

    function applyTransform() {
      img.style.transform = 'translate(' + panX + 'px,' + panY + 'px) scale(' + zoom + ')';
      img.classList.toggle('is-zoomed', zoom > 1);
    }
    function resetZoom() { zoom = 1; panX = panY = 0; applyTransform(); }

    function show(i) {
      idx = (i + items.length) % items.length;
      img.setAttribute('src', items[idx].src);
      img.setAttribute('alt', items[idx].alt || '');
      cnt.textContent = items.length > 1 ? (idx + 1) + ' / ' + items.length : '';
      nav.hidden = items.length < 2;
      resetZoom();
    }

    function close() {
      box.hidden = true;
      document.body.classList.remove('is-locked');
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    $('[data-lightbox-close]', box).addEventListener('click', close);
    $('[data-lightbox-prev]', box).addEventListener('click', function () { show(idx - 1); });
    $('[data-lightbox-next]', box).addEventListener('click', function () { show(idx + 1); });

    box.addEventListener('click', function (e) {
      if (e.target === box || e.target.hasAttribute('data-lightbox-stage')) close();
    });

    document.addEventListener('keydown', function (e) {
      if (box.hidden) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft' && items.length > 1) show(idx - 1);
      else if (e.key === 'ArrowRight' && items.length > 1) show(idx + 1);
    });

    /* --- 터치: 스와이프 이동 · 핀치 확대 · 확대 중 끌기 --- */
    var sx = 0, sy = 0, startDist = 0, startZoom = 1, startPanX = 0, startPanY = 0, moved = false;

    function dist(t) {
      var dx = t[0].clientX - t[1].clientX, dy = t[0].clientY - t[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }

    img.addEventListener('touchstart', function (e) {
      moved = false;
      if (e.touches.length === 2) {
        startDist = dist(e.touches);
        startZoom = zoom;
      } else {
        sx = e.touches[0].clientX; sy = e.touches[0].clientY;
        startPanX = panX; startPanY = panY;
      }
    }, { passive: true });

    img.addEventListener('touchmove', function (e) {
      moved = true;
      if (e.touches.length === 2 && startDist > 0) {
        zoom = Math.max(1, Math.min(6, startZoom * (dist(e.touches) / startDist)));
        applyTransform();
        e.preventDefault();
      } else if (zoom > 1) {
        panX = startPanX + (e.touches[0].clientX - sx);
        panY = startPanY + (e.touches[0].clientY - sy);
        applyTransform();
        e.preventDefault();
      }
    }, { passive: false });

    img.addEventListener('touchend', function (e) {
      if (zoom <= 1 && moved && items.length > 1 && e.changedTouches.length) {
        var dx = e.changedTouches[0].clientX - sx;
        if (Math.abs(dx) > 45) show(idx + (dx < 0 ? 1 : -1));
      }
      if (zoom < 1.05) resetZoom();
      startDist = 0;
    }, { passive: true });

    var lastTap = 0;
    img.addEventListener('click', function () {
      var now = Date.now();
      if (now - lastTap < 320) { zoom = zoom > 1 ? 1 : 2.4; panX = panY = 0; applyTransform(); }
      lastTap = now;
    });

    return {
      open: function (list, i) {
        if (!list.length) return;
        items = list;
        lastFocus = document.activeElement;
        show(i || 0);
        box.hidden = false;
        document.body.classList.add('is-locked');
        $('[data-lightbox-close]', box).focus();
      }
    };
  }

  /* ---------------------------------------------------------
     갤러리 — 가로 스와이프는 CSS scroll-snap 이 담당하고
     JS 는 라이트박스 열기만 맡습니다.
     --------------------------------------------------------- */
  function initGallery() {
    var track = $('[data-gallery]');
    if (!track || !lightbox) return;

    var items = $$('img', track).map(function (im, i) {
      return { src: im.getAttribute('src'), alt: '신랑 신부 사진 ' + (i + 1) };
    });

    $$('[data-gallery-open]', track).forEach(function (btn) {
      btn.addEventListener('click', function () {
        lightbox.open(items, parseInt(btn.getAttribute('data-gallery-open'), 10) || 0);
      });
    });
  }

  /* ---------------------------------------------------------
     7. 오시는 길 — 주소 복사 + 지도앱 딥링크
     API 키를 쓰지 않으려고 좌표/장소ID 대신 '검색' 스킴을 씁니다.
     앱이 없으면 스킴이 조용히 실패하므로, 잠시 뒤에도 화면이
     그대로면 웹 지도로 넘깁니다.
     --------------------------------------------------------- */
  var VENUE_NAME = '메리다웨딩컨벤션';

  var MAP_LINKS = {
    /* 네이버는 커스텀 스킴이 잘 동작하는 것을 실기기에서 확인했습니다. */
    naver: {
      scheme: 'nmap://search?query=' + encodeURIComponent(VENUE_NAME) +
              '&appname=' + encodeURIComponent(location.hostname || 'wedding'),
      web: 'https://map.naver.com/p/search/' + encodeURIComponent(VENUE_NAME)
    },
    /* 카카오는 kakaomap:// 을 쓰면 앱으로 넘어가기 전에 브라우저가
       "주소가 유효하지 않습니다"를 띄웁니다. 공식 https 링크는 스킴이 아니라
       그 경고가 없고, 앱이 깔려 있으면 앱으로 열립니다. */
    kakao: {
      link: 'https://map.kakao.com/link/search/' + encodeURIComponent(VENUE_NAME)
    },
    /* T map 은 https 대체 링크가 없습니다. 스킴을 직접 띄우면 앱이 없을 때
       경고창이 뜨므로 숨긴 iframe 으로 조용히 시도합니다. */
    tmap: {
      scheme: 'tmap://search?name=' + encodeURIComponent(VENUE_NAME),
      quiet: true,
      store: /iPhone|iPad|iPod/i.test(navigator.userAgent)
        ? 'https://apps.apple.com/kr/app/id431589174'
        : 'https://play.google.com/store/apps/details?id=com.skt.tmap.ku'
    }
  };

  function isMobile() {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  }

  /* 숨긴 iframe 으로 스킴을 띄웁니다. 앱이 없어도 브라우저 경고창이 뜨지 않습니다. */
  function quietLaunch(scheme) {
    var frame = document.createElement('iframe');
    frame.style.display = 'none';
    frame.src = scheme;
    document.body.appendChild(frame);
    setTimeout(function () {
      if (frame.parentNode) frame.parentNode.removeChild(frame);
    }, 800);
  }

  function openMap(key) {
    var link = MAP_LINKS[key];
    if (!link) return;

    /* 스킴이 없는 곳(카카오)은 그냥 링크를 엽니다 — PC 든 모바일이든 동작합니다. */
    if (link.link) { window.open(link.link, '_blank', 'noopener'); return; }

    if (!isMobile()) {
      if (link.web) window.open(link.web, '_blank', 'noopener');
      else toast('T map 은 휴대폰에서 열 수 있습니다.');
      return;
    }

    var left = false;
    var onHide = function () { left = true; };
    document.addEventListener('visibilitychange', onHide, { once: true });

    if (link.quiet) quietLaunch(link.scheme);
    else window.location.href = link.scheme;

    setTimeout(function () {
      document.removeEventListener('visibilitychange', onHide);
      if (left || document.hidden) return;      /* 앱이 열렸습니다 */
      if (link.web) window.location.href = link.web;
      else if (link.store) toast('T map 앱이 없습니다. 네이버지도나 카카오맵을 이용해 주세요.');
    }, 1500);
  }

  function initVenue() {
    var mapBtn = $('[data-map-open]');
    if (mapBtn && lightbox) {
      var mapImg = $('img', mapBtn);
      mapBtn.addEventListener('click', function () {
        lightbox.open([{ src: mapImg.getAttribute('src'), alt: mapImg.getAttribute('alt') }], 0);
      });
    }

    var addrEl = $('[data-addr]');
    var copyBtn = $('[data-copy-addr]');
    if (addrEl && copyBtn) {
      copyBtn.addEventListener('click', function () {
        copyText(addrEl.getAttribute('data-addr'), '주소를 복사했습니다.');
      });
    }
    $$('[data-map]').forEach(function (btn) {
      btn.addEventListener('click', function () { openMap(btn.getAttribute('data-map')); });
    });
  }

  /* 교통 안내 탭 — 자가용·주차 / 기차 / 고속·시외버스 (설계 문서 §5-1 v3.1) */
  function initVenueTabs() {
    var tabs = $$('.venue-tab');
    if (!tabs.length) return;
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) {
          var on = t === tab;
          t.setAttribute('aria-selected', on ? 'true' : 'false');
          var panel = document.getElementById(t.getAttribute('aria-controls'));
          if (panel) panel.hidden = !on;
        });
      });
    });
  }

  /* ---------------------------------------------------------
     8. 계좌 복사
     은행명은 빼고 번호만 복사합니다. 뱅킹 앱에 그대로 붙일 수 있어야 합니다.
     --------------------------------------------------------- */
  function initAccount() {
    $$('[data-copy-acct]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var row  = btn.closest('.acct-row');
        var noEl = row && $('[data-acct-no]', row);
        var bank = row && $('.acct-bank', row);
        if (!noEl) return;
        var no = noEl.textContent.trim();
        copyText(no, (bank ? bank.textContent.trim() + ' ' : '') + '계좌번호를 복사했습니다.');
      });
    });
  }

  /* ---------------------------------------------------------
     9. 공유 — 기기 공유 시트가 있으면 그쪽이 낫습니다
     --------------------------------------------------------- */
  function initShare() {
    var btn = $('[data-share]');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var url = location.href;
      if (navigator.share) {
        navigator.share({
          title: '송국호 · 최은호 결혼합니다',
          text: '2027년 1월 16일 토요일 낮 12시 · 메리다웨딩컨벤션 달리아홀',
          url: url
        }).catch(function () { /* 사용자가 취소한 경우 — 조용히 넘어갑니다 */ });
      } else {
        copyText(url, '청첩장 링크를 복사했습니다.');
      }
    });
  }

  /* ---------------------------------------------------------
     10. 첫 방문 참석 의사 팝업 (설계 문서 §6 v3)
     본문 RSVP 폼 DOM 을 팝업 슬롯으로 옮겼다가 닫을 때 제자리로
     되돌립니다 — 리스너가 보존되고 마크업 이중화가 없습니다.
     노출은 기기당 1회. localStorage 가 막힌 인앱 설정에서는
     매번 뜰 수 있지만 기능은 동작합니다 (수용).
     --------------------------------------------------------- */
  var rsvpPopup = null;
  var POPUP_SEEN_KEY = 'rsvp-popup-seen';

  function popupSeen() {
    try { return localStorage.getItem(POPUP_SEEN_KEY) === '1'; } catch (e) { return false; }
  }
  function markPopupSeen() {
    try { localStorage.setItem(POPUP_SEEN_KEY, '1'); } catch (e) {}
  }

  function initRsvpPopup() {
    var pop = $('[data-rsvp-popup]');
    var form = $('[data-rsvp]');
    var slot = pop && $('[data-popup-slot]', pop);
    if (!pop || !form || !slot) return null;

    var home = form.parentNode;        /* 닫을 때 폼이 돌아갈 자리 */
    var homeNext = form.nextSibling;
    var lastFocus = null;
    var closeTimer = null;

    function open() {
      if (!pop.hidden) return;
      lastFocus = document.activeElement;
      slot.appendChild(form);
      pop.hidden = false;
      document.body.classList.add('is-locked');
      var btn = $('[data-popup-close]', pop);
      if (btn) btn.focus();
    }

    function close() {
      if (pop.hidden) return;
      if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
      pop.hidden = true;
      document.body.classList.remove('is-locked');
      home.insertBefore(form, homeNext);
      markPopupSeen();
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    $$('[data-popup-close]', pop).forEach(function (b) {
      b.addEventListener('click', close);
    });
    pop.addEventListener('click', function (e) {
      if (e.target === pop) close();       /* 스크림 탭으로 닫기 */
    });
    document.addEventListener('keydown', function (e) {
      if (!pop.hidden && e.key === 'Escape') close();
    });

    if (!popupSeen()) setTimeout(open, 900);

    return {
      /* 팝업 안에서 제출을 마치면 확인 문구를 읽을 시간을 주고 닫습니다 */
      closeSoon: function (ms) {
        if (pop.hidden) return;
        if (closeTimer) clearTimeout(closeTimer);
        closeTimer = setTimeout(close, ms || 1600);
      }
    };
  }

  /* ---------------------------------------------------------
     11. 참석 여부
     식사 인원 + 답례품 인원 = 총 참석 인원.
     식사는 하지 않고 답례품만 받고 가시는 하객이 있기 때문에
     두 수의 합이 곧 참석 인원이 됩니다.

     ★ 규칙 3 — 접수 확인 문구에 하객 성함이 그대로 들어갑니다.
       [data-user-content] 가 붙은 요소에만 넣고, textContent 만 씁니다.
     --------------------------------------------------------- */
  /* 배포 시 Actions Secret(RSVP_ENDPOINT)으로 치환됩니다.
     공개 저장소라 엔드포인트를 그대로 커밋하면 아무나 시트에 쓸 수 있습니다.
     치환되지 않은 상태면 아래 hasEndpoint() 가 false 가 되어 미리보기로 동작합니다. */
  var RSVP_ENDPOINT = '__RSVP_ENDPOINT__';

  function hasEndpoint() {
    return RSVP_ENDPOINT.indexOf('http') === 0;
  }
  var KAKAO_FALLBACK = '전송이 되지 않았습니다. 번거로우시겠지만 카카오톡으로 알려 주세요.';

  function initRsvp() {
    var form = $('[data-rsvp]');
    if (!form) return;

    var counts    = $('[data-rsvp-counts]', form);
    var totalEl   = $('[data-count-total]', form);
    var resultEl  = $('[data-rsvp-result]', form);
    var submitBtn = $('.rsvp-submit', form);
    var state = { meal: 1, gift: 0 };

    function render() {
      Object.keys(state).forEach(function (k) {
        var out = $('[data-count="' + k + '"]', form);
        if (out) out.textContent = String(state[k]);
      });
      $$('[data-step]', form).forEach(function (b) {
        var k = b.getAttribute('data-step');
        var d = parseInt(b.getAttribute('data-dir'), 10);
        b.disabled = (d < 0 && state[k] <= 0) || (d > 0 && state[k] >= 10);
      });
      var total = state.meal + state.gift;
      totalEl.textContent = total > 0 ? '모두 ' + total + '분 참석' : '인원을 정해 주세요';
    }

    $$('[data-step]', form).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var k = btn.getAttribute('data-step');
        var d = parseInt(btn.getAttribute('data-dir'), 10);
        state[k] = Math.max(0, Math.min(10, state[k] + d));
        render();
        haptic(8);
      });
    });

    function attending() {
      var el = form.querySelector('input[name="attending"]:checked');
      return el ? el.value : '';
    }

    $$('input[name="attending"]', form).forEach(function (r) {
      r.addEventListener('change', function () { counts.hidden = attending() !== 'yes'; });
    });

    function say(message, state_) {
      resultEl.textContent = message;          /* innerHTML 금지 */
      resultEl.setAttribute('data-state', state_);
      resultEl.hidden = false;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var side = form.querySelector('input[name="side"]:checked');
      var name = $('#rsvp-name', form).value.trim();
      var going = attending();

      if (!side)  { say('신랑측인지 신부측인지 골라 주세요.', 'error'); return; }
      if (!name)  { say('성함을 적어 주세요.', 'error'); $('#rsvp-name', form).focus(); return; }
      if (!going) { say('참석 여부를 골라 주세요.', 'error'); return; }

      var yes = going === 'yes';
      var payload = {
        timestamp:  new Date().toISOString(),
        side:       side.value,
        name:       name,
        attending:  going,
        meal_count: yes ? state.meal : 0,
        gift_count: yes ? state.gift : 0,
        /* '전하고 싶은 말'은 방명록으로 이동 (§6 v3.1) — 시트 열은 유지 */
        message:    ''
      };

      var ok = name + '님, 참석 여부를 받았습니다. 고맙습니다.';
      var no = name + '님, 알려 주셔서 고맙습니다. 마음만으로도 충분합니다.';

      if (!hasEndpoint()) {
        /* 아직 시트를 연결하지 않았습니다. 성공한 척하지 않습니다. */
        say((yes ? ok : no) + '\n(현재는 미리보기라 저장되지 않습니다)', 'demo');
        markPopupSeen();
        if (rsvpPopup) rsvpPopup.closeSoon(2600);
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = '보내는 중…';
      submitBtn.classList.add('is-sending');
      say('보내는 중입니다. 잠시만 기다려 주세요.', 'sending');

      /* text/plain 으로 보내 CORS preflight 를 피합니다 (설계 문서 §6).
         Apps Script 는 googleusercontent.com 으로 리다이렉트한 뒤 JSON 을 돌려줍니다. */
      fetch(RSVP_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      })
        .then(function (r) { return r.text(); })
        .then(function (text) {
          var res = null;
          try { res = JSON.parse(text); } catch (err) { /* 파싱 실패는 아래에서 처리 */ }

          /* 서버가 명시적으로 거절한 경우에만 실패로 봅니다.
             응답을 못 읽었다고 실패로 처리하면, 실제로는 저장됐는데
             하객이 다시 보내서 중복이 쌓입니다. */
          if (res && res.ok === false) {
            say('보내지 못했습니다. ' + KAKAO_FALLBACK, 'error');
            return;
          }

          say(yes ? ok : no, 'ok');
          submitBtn.hidden = true;
          haptic(14);
          markPopupSeen();
          if (rsvpPopup) rsvpPopup.closeSoon(1800);
        })
        .catch(function () { say(KAKAO_FALLBACK, 'error'); })
        .then(function () {
          submitBtn.disabled = false;
          submitBtn.classList.remove('is-sending');
          submitBtn.textContent = '참석 여부 보내기';
        });
    });

    render();
  }

  /* ---------------------------------------------------------
     12. 방명록 (설계 문서 §6 v3)
     ★ 규칙 3 — 이름·메시지·날짜가 전부 사용자 문자열입니다.
       data-user-content 안에서 textContent 로만 그립니다.
     같은 Apps Script 웹앱을 씁니다 — 등록은 POST(type:"guestbook"),
     목록은 GET ?view=guestbook (심플 리퀘스트라 preflight 없음).
     --------------------------------------------------------- */
  function initGuestbook() {
    var section = $('.guestbook');
    var form = $('[data-guestbook]');
    var list = $('[data-gb-list]');
    if (!section || !form || !list) return;

    var statusEl = $('[data-gb-status]');
    var pager = $('[data-gb-pager]');
    var prevBtn = $('[data-gb-prev]');
    var nextBtn = $('[data-gb-next]');
    var pageEl = $('[data-gb-page]');
    var resultEl = $('[data-gb-result]', form);
    var submitBtn = $('.gb-submit', form);

    var PER_PAGE = 3;         /* 한 번에 보여줄 개수 — 나머지는 넘겨서 (§6 v3.1) */
    var items = [];           /* {t, name, message, demo} 최신순 */
    var page = 0;
    var loaded = false;

    function pad2(n) { return (n < 10 ? '0' : '') + n; }
    function fmtDate(t) {
      var d = new Date(t);
      if (isNaN(+d)) return '';
      return d.getFullYear() + '.' + pad2(d.getMonth() + 1) + '.' + pad2(d.getDate());
    }

    function setStatus(msg) {
      if (!statusEl) return;
      if (msg) { statusEl.textContent = msg; statusEl.hidden = false; }
      else { statusEl.hidden = true; }
    }

    function render() {
      list.textContent = '';        /* 비우기 — innerHTML 금지 */
      var pages = Math.max(1, Math.ceil(items.length / PER_PAGE));
      if (page > pages - 1) page = pages - 1;
      if (page < 0) page = 0;
      var start = page * PER_PAGE;
      var end = Math.min(items.length, start + PER_PAGE);
      for (var i = start; i < end; i++) {
        var it = items[i];
        var li = document.createElement('li');
        li.className = 'gb-item';

        var head = document.createElement('div');
        head.className = 'gb-item-head';
        var name = document.createElement('span');
        name.className = 'gb-item-name';
        name.textContent = it.name;
        var date = document.createElement('span');
        date.className = 'gb-item-date';
        date.textContent = it.demo ? '미리보기' : fmtDate(it.t);
        head.appendChild(name);
        head.appendChild(date);

        var msg = document.createElement('p');
        msg.className = 'gb-item-msg';
        msg.textContent = it.message;

        li.appendChild(head);
        li.appendChild(msg);
        list.appendChild(li);
      }
      list.hidden = items.length === 0;
      setStatus(items.length === 0
        ? '아직 남겨진 메시지가 없습니다. 첫 번째 축하를 남겨 주세요.'
        : '');
      if (pager) {
        pager.hidden = items.length <= PER_PAGE;
        if (!pager.hidden) {
          pageEl.textContent = (page + 1) + ' / ' + pages;
          prevBtn.disabled = page === 0;
          nextBtn.disabled = page >= pages - 1;
        }
      }
    }

    function load() {
      if (loaded) return;
      loaded = true;
      if (!hasEndpoint()) { render(); return; }

      fetch(RSVP_ENDPOINT + (RSVP_ENDPOINT.indexOf('?') < 0 ? '?' : '&') + 'view=guestbook')
        .then(function (r) { return r.json(); })
        .then(function (res) {
          if (res && res.ok && res.items && res.items.length) {
            items = res.items.map(function (it) {
              return { t: it.t, name: String(it.name || ''), message: String(it.message || '') };
            }).filter(function (it) { return it.name && it.message; });
          }
          render();
        })
        .catch(function () {
          setStatus('메시지를 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.');
        });
    }

    /* 목록은 섹션이 다가올 때 한 번만 — 첫 화면 로딩과 무관하게 둡니다 */
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        if (entries.some(function (en) { return en.isIntersecting; })) {
          io.disconnect();
          load();
        }
      }, { rootMargin: '200px 0px' });
      io.observe(section);
    } else {
      load();
    }

    if (prevBtn && nextBtn) {
      prevBtn.addEventListener('click', function () { page -= 1; render(); });
      nextBtn.addEventListener('click', function () { page += 1; render(); });
    }

    function say(message, state_) {
      resultEl.textContent = message;      /* innerHTML 금지 */
      resultEl.setAttribute('data-state', state_);
      resultEl.hidden = false;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      load();                              /* 목록보다 먼저 제출하는 경우 대비 */

      var nameInput = $('#gb-name', form);
      var msgInput = $('#gb-msg', form);
      var name = nameInput.value.trim();
      var message = msgInput.value.trim();

      if (!name) { say('성함을 적어 주세요.', 'error'); nameInput.focus(); return; }
      if (!message) { say('메시지를 적어 주세요.', 'error'); msgInput.focus(); return; }

      if (!hasEndpoint()) {
        /* 아직 시트를 연결하지 않았습니다. 성공한 척하지 않습니다. */
        items.unshift({ t: null, demo: true, name: name, message: message });
        page = 0;                          /* 새 글이 보이는 첫 페이지로 */
        render();
        say('지금은 미리보기라 저장되지 않습니다.', 'demo');
        form.reset();
        return;
      }

      submitBtn.disabled = true;
      submitBtn.classList.add('is-sending');
      submitBtn.textContent = '남기는 중…';

      fetch(RSVP_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          type: 'guestbook',
          name: name,
          message: message,
          timestamp: new Date().toISOString()
        })
      })
        .then(function (r) { return r.text(); })
        .then(function (text) {
          var res = null;
          try { res = JSON.parse(text); } catch (err) { /* 아래에서 처리 */ }
          if (res && res.ok === false) {
            say('남기지 못했습니다. 잠시 뒤 다시 시도해 주세요.', 'error');
            return;
          }
          items.unshift({ t: new Date().toISOString(), name: name, message: message });
          page = 0;                        /* 새 글이 보이는 첫 페이지로 */
          render();
          say('소중한 축하의 말씀, 감사히 간직하겠습니다.', 'ok');
          form.reset();
          haptic(12);
        })
        .catch(function () { say('남기지 못했습니다. 잠시 뒤 다시 시도해 주세요.', 'error'); })
        .then(function () {
          submitBtn.disabled = false;
          submitBtn.classList.remove('is-sending');
          submitBtn.textContent = '메시지 남기기';
        });
    });
  }

  /* ---------------------------------------------------------
     부트
     --------------------------------------------------------- */
  function boot() {
    initReveal();
    lightbox = initLightbox();
    initSnow();
    initCountdown();
    initGallery();
    initVenue();
    initVenueTabs();
    initAccount();
    initShare();
    rsvpPopup = initRsvpPopup();
    initRsvp();
    initGuestbook();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* 개발 중 콘솔에서 쓰기 위한 최소 노출 */
  window.__inv = { toast: toast, copyText: copyText };
})();

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
     4. 눈 입자 — 히어로 뒤 페이지 전체
     설계 문서 §7: 아주 옅게, 아주 느리게, 밀도 낮게.
     색은 theme.css 의 --snow-color 에서 읽어오므로 테마 교체를 따라갑니다.
     reduced-motion 이면 아예 시작하지 않고, 탭이 가려지면 멈춥니다.
     --------------------------------------------------------- */
  function initSnow() {
    var canvas = $('.snow');
    if (!canvas || prefersReducedMotion()) return;

    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var color = getComputedStyle(document.documentElement)
                  .getPropertyValue('--snow-color').trim();
    var flakes = [];
    var w = 0, h = 0;
    var raf = null;
    var last = 0;

    function seed(n) {
      flakes = [];
      for (var i = 0; i < n; i++) {
        flakes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: 0.7 + Math.random() * 1.6,          /* 반지름 px */
          vy: 4 + Math.random() * 9,             /* 초당 낙하 px — 아주 느리게 */
          sway: 6 + Math.random() * 14,          /* 좌우 흔들림 폭 */
          phase: Math.random() * Math.PI * 2,
          rate: 0.15 + Math.random() * 0.25      /* 흔들림 주기 */
        });
      }
    }

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width  = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      /* 밀도: 화면이 커져도 성기게 유지 */
      seed(Math.max(10, Math.min(38, Math.round((w * h) / 20000))));
    }

    function frame(now) {
      var dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
      last = now;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = color;

      for (var i = 0; i < flakes.length; i++) {
        var f = flakes[i];
        f.y += f.vy * dt;
        f.phase += f.rate * dt * Math.PI * 2;
        var x = f.x + Math.sin(f.phase) * f.sway;

        if (f.y - f.r > h) {          /* 아래로 나가면 위에서 다시 */
          f.y = -f.r;
          f.x = Math.random() * w;
        }

        ctx.beginPath();
        ctx.arc(x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    }

    function start() { if (raf === null) { last = 0; raf = requestAnimationFrame(frame); } }
    function stop()  { if (raf !== null) { cancelAnimationFrame(raf); raf = null; } }

    resize();
    start();

    var resizeTimer = null;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 200);
    });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else start();
    });

    /* 도중에 사용자가 모션 축소로 바꾸면 즉시 끕니다 */
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
    var tail = $('[data-dday-tail]', box);
    if (!lead || !num || !tail) return;

    var days = Math.round(
      (kstMidnight(Date.parse(WEDDING_ISO)) - kstMidnight(Date.now())) / 86400000
    );

    if (days > 0) {
      lead.textContent = '예식일까지';
      num.textContent  = String(days);
      tail.textContent = '일 남았습니다';
      num.hidden = false;
    } else if (days === 0) {
      lead.textContent = '오늘, 예식일입니다';
      num.textContent  = '';
      tail.textContent = '';
      num.hidden = true;
    } else {
      lead.textContent = '예식일로부터';
      num.textContent  = String(-days);
      tail.textContent = '일 지났습니다';
      num.hidden = false;
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
     10. 참석 여부
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
        message:    $('#rsvp-msg', form).value.trim()
      };

      var ok = name + '님, 참석 여부를 받았습니다. 고맙습니다.';
      var no = name + '님, 알려 주셔서 고맙습니다. 마음만으로도 충분합니다.';

      if (!hasEndpoint()) {
        /* 아직 시트를 연결하지 않았습니다. 성공한 척하지 않습니다. */
        say((yes ? ok : no) + '\n(현재는 미리보기라 저장되지 않습니다)', 'demo');
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
     부트
     --------------------------------------------------------- */
  function boot() {
    initReveal();
    lightbox = initLightbox();
    initSnow();
    initCountdown();
    initGallery();
    initVenue();
    initAccount();
    initShare();
    initRsvp();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* 개발 중 콘솔에서 쓰기 위한 최소 노출 */
  window.__inv = { toast: toast, copyText: copyText };
})();

# 핸드오프 — 다음 세션에서 읽을 것

작성: 2026-08-18 (브레인스토밍 세션 종료 시점)

## 현재 상태

**설계 완료, 구현 0%.** 코드는 아직 한 줄도 없습니다.

- `docs/superpowers/specs/2026-08-18-wedding-invitation-design.md` — 승인된 설계 문서. **모든 결정의 근거**
- `CLAUDE.md` — 협상 불가 규칙 4가지

## 먼저 할 일: 참고 레포 다시 클론

이전 세션의 클론은 임시 디렉터리에 있어 사라졌습니다. 코드를 참조해야 하니 다시 받으세요.

```bash
mkdir -p /tmp/wedding-refs && cd /tmp/wedding-refs && git clone --depth 1 https://github.com/juhonamnam/wedding-invitation.git && git clone --depth 1 https://github.com/revfactory/wedding-letter.git
```

- `juhonamnam/wedding-invitation` — **지식만 이식.** 지도앱 딥링크 URL 스킴, 달력 로직,
  계좌 복사 UX, Actions Secrets 주입 패턴. React 코드 자체는 가져오지 않습니다
- `revfactory/wedding-letter` — **구조·미감 참조.** `index.html`/`style.css`/`script.js`와
  `_workspace/`의 컨셉·모션 명세. 단 팔레트는 가을 톤이라 쓰지 않고, PNG 자산(16MB)은 절대 가져오지 않습니다

## 구현 순서 (순차)

각 단계 끝에서 브라우저로 눈으로 확인하고 넘어가세요. 한꺼번에 몰아 만들면 디자인 일관성이 깨집니다.

1. **뼈대** — `index.html` 10개 섹션 골격, `theme.css`(온실 팔레트), `style.css` 토큰·리셋, `script.js` 스켈레톤
2. **히어로 확정** — 여기서 타이포 스케일·여백 리듬이 정해지고 나머지가 따라옵니다. 제일 공들일 곳
3. **겨울식물 SVG 라인아트** — 히어로 프레임, 섹션 디바이더. `currentColor`
4. **본문 섹션** — 모시는 글, 신랑 신부, 예식일(달력 + D-day), 갤러리(스와이프 + 라이트박스)
5. **오시는 길** — SVG 약도(오창IC·구성교차로·구성3리 정류장 표기) + 지도앱 3종 딥링크 + 주소 복사
6. **마음 전하실 곳** — 접이식 4개, 자리표시자, 복사 + 토스트
7. **RSVP** — 폼 + Google Apps Script 웹앱 + 시트. 실패 폴백 문구까지
8. **폰트 파이프라인** — 서브셋 생성·글리프 검증 스크립트, 두부 방지 4층 (설계 문서 §8)
9. **이미지 최적화 + 용량 게이트**
10. **Actions 워크플로** — 서브셋 → 최적화 → Secrets 치환 → 게이트 3종 → Pages 배포
11. **QA** — iOS Safari / Android Chrome / **카톡 인앱**. 설계 문서 §14 체크리스트
12. **슬러그 확정 후 첫 배포**

## 사용자에게 물어야 할 것

구현을 막지는 않습니다. 해당 단계에 도달하면 물으세요.

- 연회장 층수 (분리예식이라 "예식 후 ○층 연회장에서 식사" 안내 필요) — 홀에 확인 필요
- 주차 무료 여부
- 신랑신부 연락처를 `tel:` 링크로 노출할지
- URL 슬러그 (레포 이름 = URL. 12단계 전에 확정)
- RSVP 마감일 표기 여부

## 다음 세션 시작 프롬프트 (복붙용)

```
/Users/gookho/Projects/wedding 에서 모바일 청첩장을 구현한다.

docs/superpowers/specs/2026-08-18-wedding-invitation-design.md 와 CLAUDE.md, HANDOFF.md를
먼저 읽어라. 설계는 이미 승인됐으니 다시 브레인스토밍하지 말고 바로 구현에 들어가라.

HANDOFF.md의 "구현 순서"를 1번부터 순차로 진행한다. 각 단계가 끝나면 브라우저로 실제
렌더링을 확인하고 나에게 보여준 뒤 다음으로 넘어가라. 한꺼번에 몰아서 만들지 마라.

CLAUDE.md의 협상 불가 규칙 4가지(계좌 git 금지 / 색상 하드코딩 금지 /
사용자 입력에 서브셋 폰트 금지 / 용량 예산)를 매 단계 지켜라.

먼저 HANDOFF.md의 참고 레포 클론 명령을 실행하고, 1단계(뼈대)부터 시작해라.
```

2단계 이후 세션이라면 마지막 문장만 `N단계부터 시작해라`로 바꾸면 됩니다.

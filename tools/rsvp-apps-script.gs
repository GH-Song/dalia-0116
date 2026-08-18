/**
 * 참석 여부 접수 + 방명록 — Google Apps Script 웹앱
 * 설계 문서 §6 / §AD-5 (방명록은 §6 v3)
 *
 * 웹앱 하나가 두 가지를 처리합니다.
 *   POST                      → rsvp 시트에 참석 여부 한 줄
 *   POST { type:"guestbook" } → guestbook 시트에 축하 메시지 한 줄
 *   GET  ?view=guestbook      → 최근 방명록 100개 JSON
 *
 * 이 파일은 저장소 보관용입니다. 실제로는 Google 시트에 붙여 배포합니다.
 * 설치 방법은 이 파일 맨 아래 주석을 보세요.
 * ★ 이미 배포해 둔 상태라면 — 이 파일을 붙여넣은 뒤 반드시
 *   [배포] > [배포 관리] > 연필 > 버전 [새 버전] > [배포] 로 갱신하세요.
 *   (새 배포를 만들면 URL 이 바뀌어 Secret 도 바꿔야 합니다.)
 */

/**
 * ★ 여기에 스프레드시트 ID 를 넣으세요.
 *
 * 시트 주소가 이렇게 생겼습니다:
 *   https://docs.google.com/spreadsheets/d/1AbCdEf...XyZ/edit#gid=0
 *                                          └─────┬─────┘
 *                                            이 부분이 ID
 *
 * 스크립트를 시트 안에서(확장 프로그램 > Apps Script) 만들었다면 비워둬도
 * 동작하지만, 넣어두면 어느 쪽이든 확실합니다.
 */
var SHEET_ID = '';

var SHEET_NAME = 'rsvp';
var HEADERS = ['timestamp', 'side', 'name', 'attending', 'meal_count', 'gift_count', 'message'];

var GB_SHEET_NAME = 'guestbook';
var GB_HEADERS = ['timestamp', 'name', 'message'];
var GB_LIST_MAX = 100;   // 목록으로 돌려줄 최대 개수

/** 이름으로 시트를 찾고, 없으면 머리글과 함께 만듭니다. */
function sheetByName_(name, headers) {
  var ss = SHEET_ID
    ? SpreadsheetApp.openById(SHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();

  if (!ss) {
    throw new Error(
      '스프레드시트를 찾을 수 없습니다. 이 스크립트가 시트에 붙어 있지 않습니다. ' +
      '파일 맨 위 SHEET_ID 에 시트 주소의 /d/ 와 /edit 사이 문자열을 넣어 주세요.'
    );
  }

  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getSheet_() { return sheetByName_(SHEET_NAME, HEADERS); }
function getGbSheet_() { return sheetByName_(GB_SHEET_NAME, GB_HEADERS); }

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** 문자열을 다듬고 길이를 자릅니다. 시트가 쓰레기로 차는 것을 막습니다. */
function clean_(v, max) {
  return String(v == null ? '' : v).trim().slice(0, max);
}

function count_(v) {
  var n = parseInt(v, 10);
  if (isNaN(n) || n < 0) return 0;
  return Math.min(n, 20);
}

/**
 * 청첩장에서 보낸 참석 여부를 시트에 한 줄 추가합니다.
 * 청첩장은 CORS preflight 를 피하려고 Content-Type: text/plain 으로 보냅니다.
 * 그래서 e.postData.contents 에 JSON 문자열이 그대로 들어옵니다.
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return json_({ ok: false, error: 'empty body' });
    }

    var d = JSON.parse(e.postData.contents);

    // ── 방명록 (설계 문서 §6 v3) ─────────────────────────
    if (d.type === 'guestbook') {
      var gbName = clean_(d.name, 12);
      var gbMessage = clean_(d.message, 120);
      if (!gbName || !gbMessage) {
        return json_({ ok: false, error: 'missing required field' });
      }
      getGbSheet_().appendRow([new Date(), gbName, gbMessage]);
      return json_({ ok: true });
    }

    // ── 참석 여부 ────────────────────────────────────────
    var name = clean_(d.name, 20);
    var side = d.side === 'groom' || d.side === 'bride' ? d.side : '';
    var attending = d.attending === 'yes' || d.attending === 'no' ? d.attending : '';

    // 필수값이 빠지면 저장하지 않습니다. 나중에 정산할 때 빈 줄이 섞이면 곤란합니다.
    if (!name || !side || !attending) {
      return json_({ ok: false, error: 'missing required field' });
    }

    var going = attending === 'yes';

    getSheet_().appendRow([
      new Date(),
      side,
      name,
      attending,
      going ? count_(d.meal_count) : 0,
      going ? count_(d.gift_count) : 0,
      clean_(d.message, 60)
    ]);

    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

/**
 * GET —
 *   ?view=guestbook : 최근 방명록 100개 (최신순). 청첩장 방명록 목록이 씁니다.
 *     GET 은 심플 리퀘스트라 CORS preflight 가 없고, 최종 googleusercontent
 *     응답에 Access-Control-Allow-Origin: * 이 붙어 fetch 로 읽을 수 있습니다.
 *   그 외        : 살아있는지 확인용.
 */
function doGet(e) {
  try {
    if (e && e.parameter && e.parameter.view === 'guestbook') {
      var sheet = getGbSheet_();
      var lastRow = sheet.getLastRow();
      var count = Math.min(Math.max(0, lastRow - 1), GB_LIST_MAX);
      var items = [];
      if (count > 0) {
        var values = sheet.getRange(lastRow - count + 1, 1, count, 3).getValues();
        for (var i = values.length - 1; i >= 0; i--) {   // 최신순으로 뒤집기
          var row = values[i];
          items.push({
            t: row[0] instanceof Date ? row[0].toISOString() : String(row[0]),
            name: String(row[1]),
            message: String(row[2])
          });
        }
      }
      return json_({ ok: true, items: items });
    }

    return json_({ ok: true, service: 'rsvp', rows: getSheet_().getLastRow() - 1 });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

/**
 * ── 설치 방법 ─────────────────────────────────────────────
 *
 * 1. 스프레드시트를 하나 만들고 엽니다. 이름은 아무거나 (예: 청첩장 참석여부)
 *
 * 2. 시트를 연 상태에서 상단 메뉴 [확장 프로그램] > [Apps Script] 를 엽니다.
 *    (파일 목록 화면에는 이 메뉴가 없습니다. 시트를 열어야 나옵니다.)
 *
 * 2-1. 주소창에서 시트 ID 를 복사해 이 파일 맨 위 SHEET_ID 에 넣습니다.
 *      /d/ 와 /edit 사이의 긴 문자열입니다.
 *
 * 3. 편집기에 있던 내용을 전부 지우고 이 파일 내용을 붙여넣습니다.
 *    (맨 아래 이 주석까지 통째로 붙여도 됩니다.)
 *
 * 4. 저장(디스크 아이콘)합니다.
 *
 * 5. 오른쪽 위 [배포] > [새 배포] 를 누릅니다.
 *    - 톱니바퀴 > 유형 선택 > [웹 앱]
 *    - 설명: 아무거나
 *    - 다음 사용자 인증 정보로 실행: [나]
 *    - 액세스 권한이 있는 사용자: [모든 사용자]   ← 이게 핵심입니다.
 *      '나'로 두면 하객이 보낸 요청이 전부 거부됩니다.
 *    - [배포] 클릭
 *
 * 6. 처음이면 권한 승인 창이 뜹니다.
 *    [액세스 승인] > 계정 선택 > "이 앱은 확인되지 않았습니다" 화면이 나오면
 *    [고급] > [○○(안전하지 않음)으로 이동] > [허용]
 *    (내가 만든 스크립트라 정상입니다. 구글이 검수하지 않은 개인 스크립트에는 항상 뜹니다.)
 *
 * 7. 배포가 끝나면 나오는 [웹 앱 URL] 을 복사합니다.
 *    https://script.google.com/macros/s/AKfycb.../exec 형태입니다.
 *
 * 8. 잘 되는지 확인 — 그 URL 을 브라우저 주소창에 그대로 붙여 넣어보세요.
 *    {"ok":true,"service":"rsvp","rows":0} 이 나오면 성공입니다.
 *
 * 9. 그 URL 을 GitHub 레포 Secret 에 넣습니다.
 *    레포 > Settings > Secrets and variables > Actions > New repository secret
 *    - Name:   RSVP_ENDPOINT
 *    - Secret: 복사한 웹 앱 URL
 *    저장 후 Actions 탭에서 Deploy 를 다시 돌리면 반영됩니다.
 *
 * ── 코드를 고친 뒤에는 ────────────────────────────────────
 * [배포] > [배포 관리] > 연필 아이콘 > 버전을 [새 버전] 으로 바꾸고 [배포].
 * 새 배포를 만들면 URL 이 바뀌니 반드시 '배포 관리'에서 수정하세요.
 */

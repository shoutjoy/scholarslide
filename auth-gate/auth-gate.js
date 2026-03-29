/**
 * ScholarSlide — 지정 사용자 전용 최초 인증 게이트
 * - 인증번호는 코드에 평문으로 두지 않고 SHA-256 해시만 보관합니다.
 * - 생활 보안 수준(클라이언트 전용). 실제 보안은 추후 서버 연동 권장.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'ss_scholar_slide_auth_v1';
  /** UTF-8 "a12ds345adf6xx!adf8as2dccx82c909"의 SHA-256 (hex). 평문 비밀번호는 이 파일에 없습니다. */
  var HASH_HEX_PARTS = [
    '8414ba50', '89ef373d', 'b02a339b', '2331b19b',
    '3514a550', 'f640952e', 'ced0f188', 'ce8dc5b1'
  ];
  var EXPECTED_HASH_HEX = HASH_HEX_PARTS.join('');

  var ADMIN_EMAIL = 'shoutjoy1@yonsei.ac.kr';

  function removeBootLock() {
    var el = document.getElementById('ss-auth-boot');
    if (el) el.remove();
  }

  function grantAccess() {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch (e) {}
    window.SCHOLAR_SLIDE_AUTH_OK = true;
    removeBootLock();
    var ov = document.getElementById('ss-auth-overlay');
    if (ov) ov.remove();
    try {
      window.dispatchEvent(new CustomEvent('scholarSlideAuthGranted'));
    } catch (e2) {}
  }

  function isGranted() {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function hexFromBuffer(buf) {
    var h = '';
    var v = new Uint8Array(buf);
    for (var i = 0; i < v.length; i++) {
      var x = v[i].toString(16);
      h += x.length === 1 ? '0' + x : x;
    }
    return h;
  }

  function sha256HexUtf8(str) {
    var enc = new TextEncoder();
    return crypto.subtle.digest('SHA-256', enc.encode(str)).then(function (buf) {
      return hexFromBuffer(buf);
    });
  }

  function buildMailto() {
    var name = (document.getElementById('ss-auth-req-name') || {}).value || '';
    var org = (document.getElementById('ss-auth-req-org') || {}).value || '';
    var phone = (document.getElementById('ss-auth-req-phone') || {}).value || '';
    var mail = (document.getElementById('ss-auth-req-mail') || {}).value || '';
    var reason = (document.getElementById('ss-auth-req-reason') || {}).value || '';
    var body = [
      '[ScholarSlide 인증 신청]',
      '',
      '이름: ' + name,
      '소속: ' + org,
      '연락처: ' + phone,
      '메일: ' + mail,
      '',
      '신청 사유:',
      reason
    ].join('\n');
    var sub = encodeURIComponent('ScholarSlide 인증 신청');
    return 'mailto:' + ADMIN_EMAIL + '?subject=' + sub + '&body=' + encodeURIComponent(body);
  }

  function showMsg(el, text, cls) {
    if (!el) return;
    el.textContent = text || '';
    el.className = cls || '';
  }

  function attachHandlers(root) {
    var msg = document.getElementById('ss-auth-msg');
    var passEl = document.getElementById('ss-auth-code');

    document.getElementById('ss-auth-submit').addEventListener('click', function () {
      showMsg(msg, '', '');
      var raw = (passEl && passEl.value) ? passEl.value.trim() : '';
      if (!raw) {
        showMsg(msg, '인증번호를 입력하세요.', 'err');
        return;
      }
      if (!window.crypto || !window.crypto.subtle) {
        showMsg(msg, '이 브라우저에서는 Web Crypto를 사용할 수 없습니다.', 'err');
        return;
      }
      sha256HexUtf8(raw).then(function (hex) {
        if (hex === EXPECTED_HASH_HEX) {
          showMsg(msg, '인증되었습니다.', 'ok');
          grantAccess();
        } else {
          showMsg(msg, '인증번호가 올바르지 않습니다.', 'err');
        }
      }).catch(function () {
        showMsg(msg, '인증 처리 중 오류가 발생했습니다.', 'err');
      });
    });

    document.getElementById('ss-auth-mail-btn').addEventListener('click', function () {
      window.location.href = buildMailto();
    });

    if (passEl) {
      passEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') document.getElementById('ss-auth-submit').click();
      });
    }
  }

  function injectOverlay() {
    var wrap = document.createElement('div');
    wrap.id = 'ss-auth-overlay';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.setAttribute('aria-labelledby', 'ss-auth-title');
    wrap.innerHTML =
      '<div class="ss-auth-card">' +
      '<h1 id="ss-auth-title">ScholarSlide 사용 인증</h1>' +
      '<p class="ss-auth-lead">본 앱은 <strong>지정된 사용자</strong>만 이용할 수 있습니다. 인증번호는 개발자 ' +
      '<a href="mailto:' + ADMIN_EMAIL + '">박중희 교수(' + ADMIN_EMAIL + ')</a>에게 문의하세요.</p>' +
      '<label class="ss-auth-lbl" for="ss-auth-code">인증 번호 입력</label>' +
      '<input type="password" id="ss-auth-code" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="발급받은 인증번호" />' +
      '<div class="ss-auth-row-actions">' +
      '<button type="button" class="ss-auth-btn-primary" id="ss-auth-submit">인증하고 시작</button>' +
      '</div>' +
      '<div id="ss-auth-msg"></div>' +
      '<div class="ss-auth-divider">' +
      '<h2>인증 신청</h2>' +
      '<label class="ss-auth-lbl" for="ss-auth-req-name">이름</label>' +
      '<input type="text" id="ss-auth-req-name" autocomplete="name" />' +
      '<label class="ss-auth-lbl" for="ss-auth-req-org">소속</label>' +
      '<input type="text" id="ss-auth-req-org" autocomplete="organization" />' +
      '<label class="ss-auth-lbl" for="ss-auth-req-phone">연락처</label>' +
      '<input type="text" id="ss-auth-req-phone" autocomplete="tel" />' +
      '<label class="ss-auth-lbl" for="ss-auth-req-mail">메일</label>' +
      '<input type="text" id="ss-auth-req-mail" autocomplete="email" />' +
      '<label class="ss-auth-lbl" for="ss-auth-req-reason">신청 사유</label>' +
      '<textarea id="ss-auth-req-reason" placeholder="사용 목적을 간단히 적어 주세요."></textarea>' +
      '<div class="ss-auth-row-actions" style="margin-top:12px">' +
      '<button type="button" class="ss-auth-btn-ghost" id="ss-auth-mail-btn">메일 전송 (Gmail 열기)</button>' +
      '</div>' +
      '<p class="ss-auth-lead" style="margin-top:12px;margin-bottom:0;font-size:11px">「메일 전송」을 누르면 기본 메일 앱(또는 Gmail)이 열리며, 수신인은 <strong>' + ADMIN_EMAIL + '</strong> 으로 설정됩니다.</p>' +
      '</div></div>';
    document.body.appendChild(wrap);
    attachHandlers(wrap);
  }

  function run() {
    if (isGranted()) {
      window.SCHOLAR_SLIDE_AUTH_OK = true;
      removeBootLock();
      return;
    }
    window.SCHOLAR_SLIDE_AUTH_OK = false;
    injectOverlay();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();

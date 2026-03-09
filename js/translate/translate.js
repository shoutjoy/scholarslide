/**
 * ScholarSlide — 번역 관련 (요약/원문 → 한국어)
 * index.js 로드 후 사용. window.callGemini, showToast 등에 의존.
 */
(function () {
  'use strict';

  function getSource(target) {
    if (target === 'summary') return (typeof window.getSummaryText === 'function' ? window.getSummaryText() : window.summaryText) || '';
    if (target === 'raw' && typeof window.getRawTextWithReferences === 'function') return window.getRawTextWithReferences();
    return (typeof window.getRawText === 'function' ? window.getRawText() : window.rawText) || '';
  }
  function getTranslated(target) {
    return target === 'summary' ? (window._translatedSummary || '') : (window._translatedRaw || '');
  }
  function setTranslated(target, text) {
    if (target === 'summary') window._translatedSummary = text;
    else window._translatedRaw = text;
  }

  function askThenTranslate(target) {
    const source = getSource(target);
    if (!source) {
      if (window.showToast) window.showToast('⚠️ 번역할 내용이 없습니다');
      return;
    }
    const label = target === 'summary' ? '요약' : '원문';
    const hasCache = target === 'summary' ? !!getTranslated('summary') : !!getTranslated('raw');
    const cacheNote = hasCache ? '\n\n이미 번역된 결과가 있습니다. 다시 번역하면 덮어씌워집니다.' : '';
    if (window.showConfirm) {
      window.showConfirm(
        '🌐 ' + label + ' 한국어 번역',
        label + ' 내용을 한국어로 번역하시겠습니까?\n원문은 그대로 보존됩니다.' + cacheNote,
        function () { translateContent(target); }
      );
    }
  }

  async function translateContent(target) {
    const source = getSource(target);
    if (!source) {
      if (window.showToast) window.showToast('⚠️ 번역할 내용이 없습니다');
      return;
    }
    const label = target === 'summary' ? '요약' : '원문';

    if (window.showJobProgress) window.showJobProgress('translation', '🌐 ' + label + ' 번역 중...', 10, '🌐');
    let _prog = 10;
    const _pt = setInterval(function () {
      if (_prog < 85) {
        _prog += Math.random() * 4;
        if (window.updateJobProgress) window.updateJobProgress('translation', _prog);
      }
    }, 500);

    try {
      var userPrefix = (typeof window.getPromptOverride === 'function' && window.getPromptOverride('translate_user_prefix')) || '다음 영문 텍스트를 자연스러운 학술 한국어로 번역하세요:\n\n';
      var systemInstruction = (typeof window.getPromptOverride === 'function' && window.getPromptOverride('translate_system_instruction')) || '전문 학술 번역가입니다.';
      const res = await window.callGemini(userPrefix + source, systemInstruction);
      const text = res && res.text ? res.text : res;
      clearInterval(_pt);
      if (window.updateJobProgress) window.updateJobProgress('translation', 100, '✅ ' + label + ' 번역 완료');
      if (window.hideJobProgress) window.hideJobProgress('translation', 1500);

      setTranslated(target, text);
      if (window.renderLeftPanel) window.renderLeftPanel();
      if (typeof window.openTranslationViewer === 'function') {
        window.openTranslationViewer(source, text, target === 'summary' ? '요약' : '원문');
      } else {
        openTranslationWindow(text, target, source);
      }
      if (window.showToast) window.showToast('✅ 번역 완료 — 번역보기 버튼으로 다시 열 수 있습니다');
    } catch (e) {
      clearInterval(_pt);
      if (window.hideJobProgress) window.hideJobProgress('translation', 500);
      if (e.name !== 'AbortError' && window.showToast) window.showToast('❌ 번역 실패: ' + e.message);
    }
  }

  function openTranslationWindow(translatedText, target, originalText) {
    const win = window.open('', '_blank', 'width=900,height=700,scrollbars=yes,resizable=yes');
    if (!win) {
      if (window.showToast) window.showToast('⚠️ 팝업이 차단되었습니다. 팝업 허용 후 다시 시도하세요.');
      return;
    }
    if (typeof window.registerChildWindow === 'function') window.registerChildWindow(win);
    const label = target === 'summary' ? '요약' : '원문';
    const escapeHtml = typeof window.escapeHtml === 'function' ? window.escapeHtml : function (s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
    const esc = escapeHtml;
    const closeScript = '</scr' + 'ipt>';
    win.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>번역 결과 — ' + esc(label) + '</title>\n<style>\n* { box-sizing:border-box; margin:0; padding:0; }\nbody { background:#0c0e13; color:#e8ecf4; font-family:\'Noto Sans KR\',sans-serif; font-size:13px; line-height:1.8; }\n.toolbar { background:#13161d; border-bottom:1px solid #1e2332; padding:10px 20px; display:flex; align-items:center; gap:10px; position:sticky; top:0; z-index:10; flex-wrap:wrap; }\nh2 { font-size:14px; color:#4f8ef7; flex:1; min-width:160px; }\n.tbtn { background:#4f8ef7; color:#fff; border:none; border-radius:6px; padding:6px 14px; font-size:12px; cursor:pointer; white-space:nowrap; }\n.tbtn.ghost { background:#1a1e28; border:1px solid #2e3447; color:#b0bac8; }\n.tbtn:hover { opacity:0.85; }\n.content { padding:24px 28px; white-space:pre-wrap; word-break:break-word; max-width:860px; margin:0 auto; }\n.orig-label { font-size:11px; color:#6e7a90; margin-top:24px; margin-bottom:6px; border-top:1px solid #1e2332; padding-top:12px; }\n.orig-box { display:none; font-family:monospace; font-size:11px; color:#6e7a90; white-space:pre-wrap; word-break:break-word; padding:14px; background:#13161d; border-radius:8px; border-left:3px solid #2e3447; }\n</style></head><body>\n<div class="toolbar">\n  <h2>🌐 번역 결과 — ' + esc(label) + '</h2>\n  <button class="tbtn ghost" onclick="toggleOrig()">원문 보기/숨기기</button>\n  <button class="tbtn" onclick="navigator.clipboard.writeText(document.getElementById(\'translated\').textContent).then(function(){alert(\'복사됨\')})">📋 복사</button>\n  <button class="tbtn ghost" onclick="window.close()">닫기</button>\n</div>\n<div class="content">\n<div id="translated">' + esc(translatedText) + '</div>\n<div class="orig-label">📄 원문 (보존됨)</div>\n<div id="orig-box" class="orig-box">' + esc(originalText || '') + '</div>\n</div>\n<script>\nfunction toggleOrig() {\n  var b = document.getElementById("orig-box");\n  b.style.display = b.style.display === "block" ? "none" : "block";\n}\n' + closeScript + '\n</body></html>');
    win.document.close();
  }

  function viewTranslation(target) {
    const text = getTranslated(target);
    const src = target === 'summary' ? (typeof window.getSummaryText === 'function' ? window.getSummaryText() : window.summaryText || '') : (typeof window.getRawTextWithReferences === 'function' ? window.getRawTextWithReferences() : (typeof window.getRawText === 'function' ? window.getRawText() : window.rawText || ''));
    if (!text) {
      if (window.showToast) window.showToast('⚠️ 아직 번역된 내용이 없습니다. 한국어 번역을 먼저 실행하세요.');
      return;
    }
    if (typeof window.openTranslationViewer === 'function') {
      window.openTranslationViewer(src, text, target === 'summary' ? '요약' : '원문');
    } else {
      openTranslationWindow(text, target, src);
    }
  }

  /** 번역요약 시 사용. 원문(참고문헌 포함)을 한국어로 번역한 텍스트를 반환. 캐시 없으면 API 호출 후 캐시 저장. */
  async function getRawTextForSummary() {
    const raw = (typeof window.getRawTextWithReferences === 'function' ? window.getRawTextWithReferences() : null) || (typeof window.getRawText === 'function' ? window.getRawText() : window.rawText) || '';
    if (!raw) return '';
    if (window._translatedRaw) return window._translatedRaw;
    var userPrefix = (typeof window.getPromptOverride === 'function' && window.getPromptOverride('translate_user_prefix')) || '다음 영문 텍스트를 자연스러운 학술 한국어로 번역하세요:\n\n';
    var systemInstruction = (typeof window.getPromptOverride === 'function' && window.getPromptOverride('translate_system_instruction')) || '전문 학술 번역가입니다.';
    const res = await window.callGemini(userPrefix + raw, systemInstruction);
    const text = res && res.text ? res.text : res;
    window._translatedRaw = text;
    return text || '';
  }

  /** 번역 캐시가 있으면 반환, 없으면 번역 후 캐시 저장하고 반환. (창은 열지 않음) */
  async function ensureTranslated(target) {
    const cached = getTranslated(target);
    if (cached) return cached;
    const source = getSource(target);
    if (!source) return '';
    if (window.showJobProgress) window.showJobProgress('translation', '🌐 한국어 번역 중...', 10, '🌐');
    let _prog = 10;
    const _pt = setInterval(function () {
      if (_prog < 85 && window.updateJobProgress) window.updateJobProgress('translation', _prog += Math.random() * 4);
    }, 500);
    try {
      var userPrefix = (typeof window.getPromptOverride === 'function' && window.getPromptOverride('translate_user_prefix')) || '다음 영문 텍스트를 자연스러운 학술 한국어로 번역하세요:\n\n';
      var systemInstruction = (typeof window.getPromptOverride === 'function' && window.getPromptOverride('translate_system_instruction')) || '전문 학술 번역가입니다.';
      const res = await window.callGemini(userPrefix + source, systemInstruction);
      const text = (res && res.text ? res.text : res) || '';
      setTranslated(target, text);
      if (window.renderLeftPanel) window.renderLeftPanel();
      return text;
    } finally {
      clearInterval(_pt);
      if (window.hideJobProgress) window.hideJobProgress('translation', 0);
    }
  }

  window.askThenTranslate = askThenTranslate;
  window.translateContent = translateContent;
  window.openTranslationWindow = openTranslationWindow;
  window.viewTranslation = viewTranslation;
  window.getRawTextForSummary = getRawTextForSummary;
  window.ensureTranslated = ensureTranslated;
})();

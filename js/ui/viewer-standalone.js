/**
 * ScholarSlide 뷰어 창 전용 스크립트 (새창 about:blank에서 독립 실행)
 * 인라인 스크립트 주입 시 contentHtml 등으로 인한 파싱 오류를 피하기 위해 외부 파일로 분리.
 * 사용 전 반드시 전역 변수 설정: __rawText, __contentType, __mdproDocTitle, _pageZoom, _fontBase
 */
(function () {
  'use strict';
  if (typeof window.__viewerStandaloneLoaded !== 'undefined') return;
  window.__viewerStandaloneLoaded = true;

  var __mdproWin = null, __mdproPendingText = null, __mdproPassword = null, __mdproPasswordTimer = null;
  var __scholarAISelStart = null, __scholarAISelEnd = null, __scholarAICursorPos = null, __scholarAIResultFontSize = 13;
  var __scholarAIHistory = [];
  var __viewerSSPSeedImage = null, __viewerSSPResultImage = null, __viewerSSPRatio = '1:1';
  var __viewerSSPImgHistory = [];
  var LS_SSP_IMG_HISTORY = 'ss_viewer_ssp_img_history';
  var SSP_IMG_HISTORY_MAX = 10;

  function setPageZoom(delta) {
    window._pageZoom = Math.max(30, Math.min(200, (window._pageZoom || 100) + delta));
    var vp = document.getElementById('content-viewport');
    var pz = window._pageZoom || 100;
    if (vp) vp.style.setProperty('--zoom', pz / 100);
    var p = document.getElementById('page');
    if (p) p.style.setProperty('--zoom', pz / 100);
    var zv = document.getElementById('zoom-val');
    if (zv) zv.textContent = (window._pageZoom || 100) + '%';
  }
  function setFontZoom(delta) {
    var isEdit = document.getElementById('content-viewport') && document.getElementById('content-viewport').classList.contains('viewer-edit-active');
    var el = isEdit ? document.getElementById('viewer-edit-ta') : document.getElementById('page-content');
    if (!el) return;
    var fs = parseFloat(getComputedStyle(el).fontSize) || (window._fontBase || 14);
    fs = Math.max(10, Math.min(28, fs + delta * 2));
    el.style.fontSize = fs + 'px';
  }
  function toggleTheme() {
    var b = document.body;
    b.classList.toggle('theme-dark');
    b.classList.toggle('theme-light');
    var btn = document.getElementById('theme-btn');
    if (btn) btn.textContent = b.classList.contains('theme-dark') ? 'Dark/Light' : 'Light/Dark';
  }
  var _viewerMaximized = false;
  var _viewerRestoreRect = { x: 100, y: 100, w: 900, h: 700 };
  function toggleViewerFullscreen() {
    if (_viewerMaximized) {
      try {
        window.moveTo(_viewerRestoreRect.x, _viewerRestoreRect.y);
        window.resizeTo(_viewerRestoreRect.w, _viewerRestoreRect.h);
      } catch (e) {}
      _viewerMaximized = false;
      document.removeEventListener('keydown', _viewerFsEscHandler);
    } else {
      try {
        _viewerRestoreRect = { x: window.screenX, y: window.screenY, w: window.outerWidth, h: window.outerHeight };
        window.moveTo(screen.availLeft, screen.availTop);
        window.resizeTo(screen.availWidth, screen.availHeight);
      } catch (e) {}
      _viewerMaximized = true;
      document.addEventListener('keydown', _viewerFsEscHandler);
    }
  }
  function _viewerFsEscHandler(e) {
    if (e.key === 'Escape' && _viewerMaximized) {
      toggleViewerFullscreen();
    }
  }
  function closeViewerWindow() {
    try {
      window.close();
      if (!window.closed) {
        alert('창을 닫을 수 없습니다. 브라우저 탭 또는 창을 직접 닫아 주세요.');
      }
    } catch (e) {
      alert('창을 닫을 수 없습니다. 브라우저 탭을 닫아 주세요.');
    }
  }
  window.closeViewerWindow = closeViewerWindow;
  function saveAs(ext) {
    var a = document.createElement('a');
    a.href = 'data:text/' + (ext === 'md' ? 'markdown' : 'plain') + ';charset=utf-8,' + encodeURIComponent(window.__rawText || '');
    var t = document.getElementById('viewer-doc-title');
    a.download = (t ? t.textContent : document.title || 'document').replace(/[^a-zA-Z0-9가-힣._-]/g, '_').slice(0, 50) + '.' + ext;
    a.click();
  }
  function viewerSwitchToEdit() {
    var ta = document.getElementById('viewer-edit-ta');
    var vp = document.getElementById('content-viewport');
    var __rawText = window.__rawText || '';
    if (ta) ta.value = __rawText;
    if (vp) {
      vp.classList.add('viewer-edit-active');
      vp.style.setProperty('--zoom', (window._pageZoom || 100) / 100);
    }
    var eb = document.getElementById('viewer-btn-edit');
    var vb = document.getElementById('viewer-btn-view');
    if (eb) eb.style.display = 'none';
    if (vb) vb.style.display = 'inline-block';
    viewerBuildNav();
    if (ta) {
      var onInput = function () { viewerBuildNav(); };
      ta.removeEventListener('input', onInput);
      ta.addEventListener('input', onInput);
      ta.addEventListener('blur', function () { __scholarAICursorPos = ta.selectionStart; });
    }
  }
  function viewerSwitchToView() {
    var ta = document.getElementById('viewer-edit-ta');
    if (ta) window.__rawText = ta.value;
    var __rawText = window.__rawText || '';
    var html = '';
    try {
      if (window.opener && typeof window.opener.getViewerRenderedContent === 'function') {
        html = window.opener.getViewerRenderedContent(__rawText);
      }
    } catch (e) {}
    if (!html && typeof marked !== 'undefined') html = marked.parse(__rawText || '');
    if (!html) html = (__rawText || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
    var pc = document.getElementById('page-content');
    if (pc) pc.innerHTML = html;
    var vp = document.getElementById('content-viewport');
    if (vp) vp.classList.remove('viewer-edit-active');
    var vb = document.getElementById('viewer-btn-view');
    var eb = document.getElementById('viewer-btn-edit');
    if (vb) vb.style.display = 'none';
    if (eb) eb.style.display = 'inline-block';
    if (typeof viewerBuildNav === 'function') requestAnimationFrame(function () { viewerBuildNav(); });
  }
  function viewerSaveToOpener() {
    var ta = document.getElementById('viewer-edit-ta');
    var isEdit = document.getElementById('content-viewport') && document.getElementById('content-viewport').classList.contains('viewer-edit-active');
    var text = (isEdit && ta) ? ta.value : (window.__rawText || '');
    if (isEdit && ta) window.__rawText = ta.value;
    if (window.opener && typeof window.opener.setViewerContent === 'function') {
      window.opener.setViewerContent(text, window.__contentType || 'raw');
      alert('저장되었습니다.');
    } else {
      alert('메인 창을 찾을 수 없습니다.');
    }
  }
  function viewerEditFmt(type) {
    var ta = document.getElementById('viewer-edit-ta');
    if (!ta) return;
    ta.focus();
    var s = ta.selectionStart, e = ta.selectionEnd, sel = ta.value.substring(s, e);
    var ins = '';
    if (type === 'h1') ins = '# ' + (sel || '제목1');
    else if (type === 'h2') ins = '## ' + (sel || '제목2');
    else if (type === 'h3') ins = '### ' + (sel || '제목3');
    else if (type === 'bold') ins = '**' + (sel || '굵게') + '**';
    else if (type === 'italic') ins = '*' + (sel || '기울임') + '*';
    else if (type === 'code') ins = '`' + (sel || '코드') + '`';
    else if (type === 'codeblock') ins = '```\n' + (sel || '코드') + '\n```';
    else if (type === 'comment') {
      var txt = ta.value;
      var nums = [];
      var m;
      var re = /\[\^(\d+)\]/g;
      while ((m = re.exec(txt)) !== null) nums.push(parseInt(m[1], 10));
      var nextNum = nums.length ? Math.max.apply(null, nums) + 1 : 1;
      var footnoteContent = prompt('각주 설명 (문서 끝에 표시됩니다)', sel || '');
      if (footnoteContent === null) return;
      ins = '[^' + nextNum + ']';
      var def = '\n\n[^' + nextNum + ']: ' + (footnoteContent || '각주 설명');
      ta.setRangeText(ins, s, e, 'end');
      ta.value = ta.value + def;
      ta.selectionEnd = s + ins.length;
      ta.selectionStart = ta.selectionEnd;
      return;
    }
    else if (type === 'table') ins = '| 열1 | 열2 | 열3 |\n|-----|-----|-----|\n| A | B | C |';
    else if (type === 'link') {
      var txt = prompt('링크 텍스트', sel || '링크');
      if (txt === null) return;
      var url = prompt('URL', 'https://');
      if (url === null) return;
      ins = '[' + (txt || '링크') + '](' + (url || 'https://') + ')';
    } else if (type === 'img') {
      var alt = prompt('이미지 설명(alt)', sel || '');
      if (alt === null) return;
      var url = prompt('이미지 URL', 'https://');
      if (url === null) return;
      ins = '![' + (alt || '이미지') + '](' + (url || 'https://') + ')';
    } else if (type === 'math') ins = '$' + (sel || 'x^2 + y^2 = z^2') + '$';
    else if (type === 'ul1') ins = '- ' + (sel || '항목');
    else if (type === 'ul2') ins = '  - ' + (sel || '하위항목');
    else if (type === 'ul3') ins = '    - ' + (sel || '하위하위항목');
    if (ins !== '') ta.setRangeText(ins, s, e, 'end');
  }
  function viewerNavSwitch(t) {
    var pageTab = document.getElementById('nav-tab-page');
    var tocTab = document.getElementById('nav-tab-toc');
    var pageList = document.getElementById('nav-list-page');
    var tocList = document.getElementById('nav-list-toc');
    if (t === 'page') {
      if (pageTab) pageTab.classList.add('active');
      if (tocTab) tocTab.classList.remove('active');
      if (pageList) pageList.style.display = 'block';
      if (tocList) tocList.style.display = 'none';
    } else {
      if (tocTab) tocTab.classList.add('active');
      if (pageTab) pageTab.classList.remove('active');
      if (tocList) tocList.style.display = 'block';
      if (pageList) pageList.style.display = 'none';
    }
  }
  function parseMarkdownHeadings(text) {
    var out = [];
    var re = /^(#{1,4})\s+(.+)$/gm;
    var m;
    while ((m = re.exec(text)) !== null) out.push({ level: m[1].length, text: m[2].trim() });
    return out;
  }
  function buildTocFromMarkdown(text) {
    var items = parseMarkdownHeadings(text || '');
    if (items.length === 0) return "<span style='color:#94a3b8'>목차 없음</span>";
    var html = '';
    for (var i = 0; i < items.length; i++) {
      var cls = items[i].level === 1 ? '' : ' toc-h' + items[i].level;
      var txt = items[i].text.replace(/</g, '&lt;').substring(0, 50);
      html += "<span class='toc-item" + cls + "'>" + txt + (items[i].text.length > 50 ? '…' : '') + '</span>';
    }
    return html;
  }
  function viewerScrollToId(id) {
    var target = document.getElementById(id);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function viewerBuildNav() {
    var listPage = document.getElementById('nav-list-page');
    var listToc = document.getElementById('nav-list-toc');
    var root = document.getElementById('page-content');
    var ta = document.getElementById('viewer-edit-ta');
    var isEdit = document.getElementById('content-viewport') && document.getElementById('content-viewport').classList.contains('viewer-edit-active');
    if (isEdit && ta) {
      if (listToc) listToc.innerHTML = buildTocFromMarkdown(ta.value);
      if (listPage) listPage.innerHTML = "<span style='color:#94a3b8'>페이지 구분 없음</span>";
      return;
    }
    if (!root) return;
    var sections = root.querySelectorAll('[id^="page-"]');
    var pageHtml = '';
    for (var i = 0; i < sections.length; i++) {
      var id = sections[i].id;
      var n = id.replace('page-', '');
      var label = /^Slide\s+\d+$/.test(n) ? n : (n + '페이지');
      pageHtml += '<a href="#" onclick="viewerScrollToId(\'' + id.replace(/'/g, "\\'") + '\'); return false">' + label + '</a>';
    }
    if (listPage) listPage.innerHTML = pageHtml || "<span style='color:#94a3b8'>페이지 구분 없음</span>";
    var headings = root.querySelectorAll('h1, h2, h3, h4');
    var tocHtml = '';
    var tocId = 0;
    for (var j = 0; j < headings.length; j++) {
      tocId++;
      var el = headings[j];
      if (!el.id) el.id = 'toc-' + tocId;
      var tag = el.tagName.toLowerCase();
      var cls = tag === 'h1' ? '' : tag === 'h2' ? ' toc-h2' : tag === 'h3' ? ' toc-h3' : ' toc-h4';
      var txt = el.textContent.replace(/</g, '&lt;').substring(0, 50);
      tocHtml += '<a href="#" onclick="viewerScrollToId(\'' + el.id.replace(/'/g, "\\'") + '\'); return false" class="' + cls.trim() + '">' + txt + (el.textContent.length > 50 ? '…' : '') + '</a>';
    }
    if (listToc) listToc.innerHTML = tocHtml || "<span style='color:#94a3b8'>목차 없음</span>";
  }
  function formatForMdpro(txt) {
    if (!txt || typeof txt !== 'string') return '';
    var s = txt.trim();
    s = s.replace(/^(\d+(?:\.\d+)*\.\s+[^\n]+)$/gm, '### $1');
    return 'From ScholarSlide\n\n' + s;
  }
  function showMdproPasswordModal(cb) {
    var isDark = document.body.classList.contains('theme-dark');
    var bg = isDark ? '#0c0e13' : '#f5f6f8';
    var surface = isDark ? '#13161d' : '#fff';
    var border = isDark ? '#2e3447' : '#e2e8f0';
    var text = isDark ? '#e8ecf4' : '#1e293b';
    var accent = '#4f8ef7';
    var overlay = document.createElement('div');
    overlay.id = 'mdpro-pwd-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99999;display:flex;align-items:center;justify-content:center;';
    var box = document.createElement('div');
    box.style.cssText = 'background:' + surface + ';border:1px solid ' + border + ';border-radius:10px;padding:20px;min-width:320px;max-width:90vw;box-shadow:0 8px 32px rgba(0,0,0,0.3);';
    box.innerHTML = '<div style="font-size:14px;font-weight:600;color:' + text + ';margin-bottom:12px">mdlivepro 비밀번호</div>' +
      '<p style="font-size:12px;color:' + (isDark ? '#94a3b8' : '#64748b') + ';margin:0 0 10px 0">mdlivepro 비밀번호를 입력하세요</p>' +
      '<div style="display:flex;align-items:center;gap:6px;margin-bottom:16px">' +
      '<input type="password" id="mdpro-pwd-input" autocomplete="current-password" placeholder="비밀번호" style="flex:1;padding:10px 12px;font-size:14px;border:1px solid ' + border + ';border-radius:6px;background:' + (isDark ? '#0c0e13' : '#f8fafc') + ';color:' + text + ';box-sizing:border-box">' +
      '<button type="button" id="mdpro-pwd-toggle" title="비밀번호 보기/숨기기" style="width:40px;height:40px;padding:0;border:1px solid ' + border + ';border-radius:6px;background:' + (isDark ? '#1a1e28' : '#f1f5f9') + ';color:' + (isDark ? '#94a3b8' : '#64748b') + ';cursor:pointer;font-size:18px;line-height:1">👁</button>' +
      '</div>' +
      '<div style="display:flex;justify-content:flex-end;gap:8px">' +
      '<button type="button" id="mdpro-pwd-cancel" style="padding:8px 16px;border:1px solid ' + border + ';border-radius:6px;background:transparent;color:' + (isDark ? '#94a3b8' : '#64748b') + ';cursor:pointer;font-size:13px">취소</button>' +
      '<button type="button" id="mdpro-pwd-ok" style="padding:8px 16px;border:none;border-radius:6px;background:' + accent + ';color:#fff;cursor:pointer;font-size:13px">확인</button>' +
      '</div>';
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    var input = document.getElementById('mdpro-pwd-input');
    var toggleBtn = document.getElementById('mdpro-pwd-toggle');
    var close = function (result) {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      cb(result);
    };
    toggleBtn.onclick = function () {
      var type = input.type;
      input.type = type === 'password' ? 'text' : 'password';
      toggleBtn.textContent = type === 'password' ? '🙈' : '👁';
      toggleBtn.title = type === 'password' ? '비밀번호 숨기기' : '비밀번호 보기';
    };
    document.getElementById('mdpro-pwd-cancel').onclick = function () { close(null); };
    document.getElementById('mdpro-pwd-ok').onclick = function () {
      var val = (input.value || '').trim();
      if (!val) { alert('비밀번호를 입력해 주세요.'); return; }
      close(val);
    };
    overlay.onclick = function (e) { if (e.target === overlay) close(null); };
    input.focus();
    input.onkeydown = function (e) {
      if (e.key === 'Enter') document.getElementById('mdpro-pwd-ok').click();
      if (e.key === 'Escape') close(null);
    };
  }
  function openMdproWithLogin() {
    var vp = document.getElementById('content-viewport');
    var ta = document.getElementById('viewer-edit-ta');
    var txt = (vp && vp.classList.contains('viewer-edit-active') && ta) ? ta.value : (window.__rawText || '');
    if (!txt || !txt.trim()) { alert('전송할 내용이 없습니다.'); return; }
    showMdproPasswordModal(function (pwd) {
      if (pwd === null) return;
      if (!pwd || !pwd.trim()) { alert('비밀번호를 입력해 주세요.'); return; }
      var w = window.open('https://mdlivepro.vercel.app/', '_blank', 'width=1000,height=700');
      if (!w) { alert('팝업이 차단되었습니다.'); return; }
      window.__mdproPendingText = formatForMdpro(txt);
      window.__mdproPassword = pwd;
      if (window.__mdproPasswordTimer) clearInterval(window.__mdproPasswordTimer);
      window.__mdproPasswordTimer = setInterval(function () {
        if (!w || w.closed) { clearInterval(window.__mdproPasswordTimer); window.__mdproPasswordTimer = null; return; }
        try { w.postMessage({ type: 'mdpro_password', password: window.__mdproPassword }, '*'); } catch (e) {}
      }, 600);
      setTimeout(function () { if (window.__mdproPasswordTimer) { clearInterval(window.__mdproPasswordTimer); window.__mdproPasswordTimer = null; } }, 8000);
    });
  }
  function toggleScholarAI() {
    var el = document.getElementById('scholar-ai-sidebar');
    if (!el) return;
    el.classList.toggle('open');
    if (el.classList.contains('open')) {
      document.addEventListener('selectionchange', scholarAISyncSelection);
      scholarAISyncSelection();
      scholarAIInitResize();
      scholarAILoadPrePrompt();
      scholarAIInitModelSelect();
    } else {
      document.removeEventListener('selectionchange', scholarAISyncSelection);
      el.classList.remove('fullscreen');
    }
  }
  function scholarAIInitResize() {
    var handle = document.getElementById('scholar-ai-resize-handle');
    var sidebar = document.getElementById('scholar-ai-sidebar');
    if (!handle || !sidebar || !sidebar.classList.contains('open')) return;
    var minW = 280, maxW = Math.min(800, window.innerWidth - 200);
    var startX = 0, startW = 0;
    function onMove(e) {
      var w = startW + (startX - e.clientX);
      w = Math.max(minW, Math.min(maxW, w));
      sidebar.style.width = w + 'px';
      sidebar.style.minWidth = w + 'px';
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    handle.onmousedown = function (e) {
      if (sidebar.classList.contains('fullscreen')) return;
      e.preventDefault();
      startX = e.clientX;
      startW = sidebar.offsetWidth;
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    };
  }
  function scholarAIShrink() {
    var el = document.getElementById('scholar-ai-sidebar');
    if (el) {
      el.classList.remove('open');
      el.classList.remove('fullscreen');
      document.removeEventListener('selectionchange', scholarAISyncSelection);
    }
  }
  function toggleScholarAIPrePrompt() {
    var p = document.getElementById('scholar-ai-pre-prompt-panel');
    var btn = document.getElementById('sa-pre-prompt-btn');
    if (p) {
      p.style.display = p.style.display === 'none' ? 'block' : 'none';
      if (btn) btn.classList.toggle('active', p.style.display !== 'none');
      scholarAILoadPrePrompt();
    }
  }
  function toggleScholarAIModelSelect() {
    var p = document.getElementById('scholar-ai-model-panel');
    var btn = document.getElementById('sa-model-btn');
    if (p) {
      p.style.display = p.style.display === 'none' ? 'block' : 'none';
      if (btn) btn.classList.toggle('active', p.style.display !== 'none');
      scholarAIInitModelSelect();
    }
  }
  function scholarAILoadPrePrompt() {
    var el = document.getElementById('scholar-ai-pre-prompt-text');
    if (!el) return;
    var txt = (window.opener && window.opener.getScholarAISystemInstruction && window.opener.getScholarAISystemInstruction()) || '';
    el.value = txt || '';
    if (!el._scholarAISaveOnBlur) {
      el._scholarAISaveOnBlur = true;
      el.addEventListener('blur', function () {
        if (window.opener && typeof window.opener.setScholarAISystemInstruction === 'function') {
          window.opener.setScholarAISystemInstruction(el.value || '');
        }
      });
    }
  }
  function scholarAIInitModelSelect() {
    var sel = document.getElementById('scholar-ai-model-select');
    if (!sel || !window.opener || typeof window.opener.getScholarAIModelId !== 'function') return;
    sel.value = window.opener.getScholarAIModelId();
    sel.onchange = function () {
      if (window.opener && typeof window.opener.setScholarAIModelId === 'function') window.opener.setScholarAIModelId(sel.value);
    };
  }
  function scholarAIFullscreen() {
    var el = document.getElementById('scholar-ai-sidebar');
    if (el) el.classList.toggle('fullscreen');
  }
  function scholarAISyncSelection() {
    var ta = document.getElementById('scholar-ai-selected');
    var editTa = document.getElementById('viewer-edit-ta');
    var isEdit = document.getElementById('content-viewport') && document.getElementById('content-viewport').classList.contains('viewer-edit-active');
    if (!ta) return;
    if (isEdit && editTa && editTa === document.activeElement) {
      var start = editTa.selectionStart, end = editTa.selectionEnd;
      ta.value = editTa.value.slice(start, end);
      __scholarAISelStart = start;
      __scholarAISelEnd = end;
      if (!ta.value.trim() && (window.__contentType || '') === 'summary') ta.value = '텍스트를 선택하시면 자동입력됩니다(from 제작자 박중희 교수).';
      return;
    }
    __scholarAISelStart = __scholarAISelEnd = null;
    var sel = window.getSelection && window.getSelection();
    var target = document.getElementById('page-content');
    if (sel && target && sel.anchorNode && target.contains(sel.anchorNode)) {
      ta.value = sel.toString().trim();
    } else if (!ta.value.trim() && (window.__contentType || '') === 'summary') {
      ta.value = '텍스트를 선택하시면 자동입력됩니다(from 제작자 박중희 교수).';
    }
  }
  function scholarAIHistorySave() {
    try { localStorage.setItem('ss_viewer_scholar_ai_history', JSON.stringify(__scholarAIHistory)); } catch (e) {}
  }
  function scholarAIHistoryAdd(promptSnippet, resultText) {
    __scholarAIHistory.unshift({ id: Date.now(), prompt: promptSnippet || '', result: resultText || '', at: new Date().toISOString() });
    scholarAIHistorySave();
  }
  function scholarAIHistoryRender() {
    var list = document.getElementById('scholar-ai-history-list');
    var search = document.getElementById('scholar-ai-history-search');
    var q = (search && search.value) || '';
    q = q.trim().toLowerCase();
    var items = q ? __scholarAIHistory.filter(function (h) { return (h.prompt + ' ' + h.result).toLowerCase().indexOf(q) >= 0; }) : __scholarAIHistory;
    var html = '';
    for (var i = 0; i < items.length; i++) {
      var idx = __scholarAIHistory.indexOf(items[i]);
      var raw = items[i].prompt || items[i].result || '(빈 항목)';
      var lbl = raw.replace(/</g, '&lt;').substring(0, 36) + (raw.length > 36 ? '…' : '');
      html += '<div class="scholar-ai-history-item" data-idx="' + idx + '"><span class="sa-h-label" onclick="scholarAIHistoryShowResult(' + idx + ')" title="결과창에 표시">' + lbl.replace(/'/g, "\\'") + '</span><button type="button" class="sa-h-save" onclick="scholarAIHistorySaveMd(' + idx + ')" title="MD 저장">저장</button><button type="button" class="sa-h-del" onclick="scholarAIHistoryDelete(' + idx + ')" title="삭제">×</button></div>';
    }
    if (list) list.innerHTML = html || '<span style="font-size:11px;color:#94a3b8">실행한 결과가 여기 쌓입니다.</span>';
  }
  function scholarAIHistoryShowResult(idx) {
    var h = __scholarAIHistory[idx];
    if (!h) return;
    var el = document.getElementById('scholar-ai-result');
    if (el) el.value = h.result;
  }
  function scholarAIHistoryDelete(idx) {
    __scholarAIHistory.splice(idx, 1);
    scholarAIHistorySave();
    scholarAIHistoryRender();
  }
  function scholarAIHistorySaveMd(idx) {
    var h = __scholarAIHistory[idx];
    if (!h || !h.result) { alert('저장할 내용이 없습니다.'); return; }
    var a = document.createElement('a');
    a.href = 'data:text/markdown;charset=utf-8,' + encodeURIComponent(h.result);
    a.download = 'ScholarAI_' + (h.at || '').slice(0, 10) + '_' + idx + '.md';
    a.click();
  }
  function scholarAIHistorySaveAll() {
    if (__scholarAIHistory.length === 0) { alert('저장할 히스토리가 없습니다.'); return; }
    var parts = [];
    for (var i = 0; i < __scholarAIHistory.length; i++) {
      var h = __scholarAIHistory[i];
      parts.push('## ' + (i + 1) + '. ' + (h.at || '').slice(0, 19) + '\n\n' + (h.prompt ? '**질문/지시:** ' + h.prompt + '\n\n' : '') + h.result);
    }
    var a = document.createElement('a');
    a.href = 'data:text/markdown;charset=utf-8,' + encodeURIComponent(parts.join('\n\n---\n\n'));
    a.download = 'ScholarAI_히스토리_전체_' + new Date().toISOString().slice(0, 10) + '.md';
    a.click();
    alert('전체 ' + __scholarAIHistory.length + '건이 하나의 MD 파일로 저장되었습니다.');
  }
  async function scholarAIRun() {
    var sel = document.getElementById('scholar-ai-selected');
    var promptEl = document.getElementById('scholar-ai-prompt');
    var resultEl = document.getElementById('scholar-ai-result');
    var passage = (sel && sel.value) ? sel.value.trim() : '';
    var userQ = (promptEl && promptEl.value) ? promptEl.value.trim() : '';
    if (!passage) { alert('문서에서 텍스트를 선택한 뒤 실행하세요.'); return; }
    if (!window.opener || typeof window.opener.callGemini !== 'function') { alert('메인 창을 찾을 수 없거나 API를 사용할 수 없습니다.'); return; }
    if (resultEl) resultEl.value = '처리 중...';
    try {
      var fullPrompt = passage + '\n\n사용자 질문 또는 지시: ' + (userQ || '위 지문을 요약하거나 핵심을 설명해 주세요.');
      var sys = (window.opener.getScholarAISystemInstruction && window.opener.getScholarAISystemInstruction()) || 'You are a scholarly assistant. Answer concisely in Korean based on the given passage.';
      var modelId = (window.opener.getScholarAIModelId && window.opener.getScholarAIModelId()) || null;
      var res = await window.opener.callGemini(fullPrompt, sys, false, modelId);
      var text = res && res.text ? res.text : (res || '');
      if (resultEl) resultEl.value = typeof text === 'string' ? text : JSON.stringify(text);
      scholarAIHistoryAdd(userQ || passage.substring(0, 80), resultEl ? resultEl.value : '');
      scholarAIHistoryRender();
    } catch (e) {
      if (resultEl) resultEl.value = '오류: ' + (e.message || e);
    }
  }
  function scholarAICopyResult() {
    var el = document.getElementById('scholar-ai-result');
    if (el && el.value) {
      navigator.clipboard.writeText(el.value).then(function () { alert('결과가 복사되었습니다.'); }).catch(function () { alert('복사 실패'); });
    } else {
      alert('복사할 결과가 없습니다.');
    }
  }
  function scholarAIClearResult() {
    var el = document.getElementById('scholar-ai-result');
    if (el) el.value = '';
  }
  function scholarAIResultFont(delta) {
    var el = document.getElementById('scholar-ai-result');
    if (!el) return;
    __scholarAIResultFontSize = Math.max(10, Math.min(24, __scholarAIResultFontSize + delta));
    el.style.fontSize = __scholarAIResultFontSize + 'px';
  }
  function handleScholarAIInsertClick() {
    var isEdit = document.getElementById('content-viewport') && document.getElementById('content-viewport').classList.contains('viewer-edit-active');
    if (!isEdit) { alert('편집창으로 전환합니다'); viewerSwitchToEdit(); return; }
    var ta = document.getElementById('viewer-edit-ta');
    if (ta) __scholarAICursorPos = ta.selectionStart;
    toggleScholarAIInsertMenu();
  }
  function toggleScholarAIInsertMenu() {
    var m = document.getElementById('scholar-ai-insert-menu');
    if (m) m.classList.toggle('open');
  }
  function closeScholarAIInsertMenu() {
    var m = document.getElementById('scholar-ai-insert-menu');
    if (m) m.classList.remove('open');
  }
  function scholarAIInsertDoc(mode) {
    var resultEl = document.getElementById('scholar-ai-result');
    var resultText = resultEl && resultEl.value ? resultEl.value.trim() : '';
    if (!resultText) { alert('삽입할 결과가 없습니다.'); return; }
    var ta = document.getElementById('viewer-edit-ta');
    var isEdit = document.getElementById('content-viewport') && document.getElementById('content-viewport').classList.contains('viewer-edit-active');
    if (!isEdit || !ta) {
      var vp = document.getElementById('content-viewport');
      var wrap = document.getElementById('viewer-edit-wrap');
      if (vp) vp.classList.add('viewer-edit-active');
      if (wrap) wrap.style.display = 'flex';
      ta = document.getElementById('viewer-edit-ta');
      if (ta) { ta.value = window.__rawText || ''; ta.style.display = 'block'; }
      var eb = document.getElementById('viewer-btn-edit');
      var vb = document.getElementById('viewer-btn-view');
      if (eb) eb.style.display = 'none';
      if (vb) vb.style.display = 'inline-block';
      viewerBuildNav();
    }
    ta = document.getElementById('viewer-edit-ta');
    if (!ta) return;
    var start, end, raw = ta.value;
    if (mode === 0) {
      start = end = (__scholarAICursorPos != null ? __scholarAICursorPos : ta.selectionStart);
    } else if (__scholarAISelStart != null && __scholarAISelEnd != null) {
      start = __scholarAISelStart;
      end = __scholarAISelEnd;
    } else {
      var selTa = document.getElementById('scholar-ai-selected');
      var selText = (selTa && selTa.value) ? selTa.value.trim() : '';
      var idx = selText ? raw.indexOf(selText) : -1;
      if (idx >= 0) { start = idx; end = idx + selText.length; } else { start = ta.selectionStart; end = ta.selectionEnd; }
    }
    var before = raw.slice(0, start);
    var after = raw.slice(end);
    var newVal = mode === 1 ? before + raw.slice(start, end) + '\n\n' + resultText + after : before + resultText + after;
    ta.value = newVal;
    window.__rawText = newVal;
    var insertEnd = mode === 1 ? start + (end - start) + 2 + resultText.length : start + resultText.length;
    __scholarAICursorPos = insertEnd;
    ta.focus();
    ta.setSelectionRange(insertEnd, insertEnd);
    var lines = (ta.value.substring(0, insertEnd).match(/\n/g) || []).length;
    var lineHeight = parseInt(getComputedStyle(ta).lineHeight, 10) || 20;
    ta.scrollTop = Math.max(0, lines * lineHeight - ta.clientHeight / 2);
  }
  function toggleViewerSSP() {
    var el = document.getElementById('ssp-ai-sidebar');
    if (!el) return;
    el.classList.toggle('open');
    if (el.classList.contains('open')) {
      document.addEventListener('selectionchange', viewerSSPSyncSelection);
      viewerSSPSyncSelection();
      viewerSSPInit();
    } else {
      document.removeEventListener('selectionchange', viewerSSPSyncSelection);
    }
  }
  function sspAIShrink() {
    var el = document.getElementById('ssp-ai-sidebar');
    if (el) {
      el.classList.remove('open');
      document.removeEventListener('selectionchange', viewerSSPSyncSelection);
    }
  }
  function viewerSSPSyncSelection() {
    var promptEl = document.getElementById('ssp-prompt');
    var sidebar = document.getElementById('ssp-ai-sidebar');
    if (!promptEl || !sidebar || !sidebar.classList.contains('open')) return;
    var sel = window.getSelection && window.getSelection();
    if (!sel || !sel.toString().trim()) return;
    var txt = sel.toString().trim();
    if (!sel.anchorNode) return;
    if (sidebar.contains(sel.anchorNode)) return;
    var pageContent = document.getElementById('page-content');
    var editTa = document.getElementById('viewer-edit-ta');
    var inDoc = (pageContent && pageContent.contains(sel.anchorNode)) || (editTa && editTa.contains(sel.anchorNode));
    if (!inDoc) return;
    promptEl.value = txt;
  }
  function viewerSSPSetUploadZoneContent(dataURL) {
    var uploadZone = document.getElementById('ssp-upload-zone');
    if (!uploadZone) return;
    if (dataURL) {
      uploadZone.innerHTML = '<div class="ssp-seed-loaded"><img src="' + dataURL.replace(/"/g, '&quot;') + '" onclick="viewerSSPOpenFullscreen(this.src); event.stopPropagation()" title="클릭하면 크게 보기"><div class="ssp-seed-actions"><button type="button" class="sa-btn ghost" onclick="viewerSSPClearSeed(); event.stopPropagation()">시드이미지 지우기</button></div><small style="display:block;margin-top:4px;color:#94a3b8">클릭하여 변경</small></div>';
    } else {
      uploadZone.innerHTML = '이미지 업로드 (JPG, PNG, GIF, WebP)<br><small>또는 Ctrl+V 붙여넣기</small>';
    }
  }
  function viewerSSPClearSeed() {
    __viewerSSPSeedImage = null;
    viewerSSPSetUploadZoneContent(null);
  }
  var __viewerFsScale = 1, __viewerFsTx = 0, __viewerFsTy = 0;
  var __viewerFsStartX = 0, __viewerFsStartY = 0, __viewerFsStartTx = 0, __viewerFsStartTy = 0, __viewerFsDragging = false;
  var __viewerFsOnMove = null, __viewerFsOnUp = null;

  function viewerSSPFsApply() {
    var wrap = document.getElementById('viewer-fs-wrap');
    var val = document.getElementById('viewer-fs-zoom-val');
    if (wrap) wrap.style.transform = 'translate(' + __viewerFsTx + 'px,' + __viewerFsTy + 'px) scale(' + __viewerFsScale + ')';
    if (val) val.textContent = Math.round(__viewerFsScale * 100) + '%';
  }
  function viewerSSPFsZoom(d) {
    __viewerFsScale = Math.max(0.25, Math.min(4, __viewerFsScale + d));
    viewerSSPFsApply();
  }
  function viewerSSPFsDownload() {
    var img = document.getElementById('viewer-fs-img');
    if (!img || !img.src) return;
    var dataURL = img.src;
    if (dataURL.indexOf('data:') === 0) {
      try {
        var arr = dataURL.split(',');
        var mime = (arr[0].match(/:(.*?);/) || [])[1] || 'image/png';
        var bstr = atob(arr[1]);
        var n = bstr.length;
        var u8arr = new Uint8Array(n);
        for (var i = 0; i < n; i++) u8arr[i] = bstr.charCodeAt(i);
        var blob = new Blob([u8arr], { type: mime });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'image_' + Date.now() + '.png';
        a.click();
        setTimeout(function () { URL.revokeObjectURL(url); }, 200);
      } catch (e) {
        var a = document.createElement('a');
        a.href = dataURL;
        a.download = 'image_' + Date.now() + '.png';
        a.click();
      }
    } else {
      var a = document.createElement('a');
      a.href = dataURL;
      a.download = 'image_' + Date.now() + '.png';
      a.click();
    }
  }
  function viewerSSPFsInsert() {
    var img = document.getElementById('viewer-fs-img');
    if (!img || !img.src || !window.opener) return;
    try { window.opener.postMessage({ type: 'imgViewerInsert', dataURL: img.src }, '*'); } catch (e) {}
  }
  function viewerSSPFsCrop() {
    var img = document.getElementById('viewer-fs-img');
    if (!img || !img.src) return;
    var base = '';
    try {
      var h = (window.opener && window.opener.location && window.opener.location.href) ? window.opener.location.href : window.location.href;
      if (h && h.indexOf('http') === 0) {
        var i = h.lastIndexOf('/');
        base = i >= 0 ? h.substring(0, i + 1) : h + '/';
      }
    } catch (e) {}
    if (!base) base = './';
    var cropWin = window.open(base + 'crop-editor.html', '_blank', 'width=920,height=720,resizable=yes,scrollbars=yes');
    if (!cropWin) return;
    viewerSSPCloseFullscreen();
    var sendImage = function () {
      try {
        if (cropWin && !cropWin.closed && cropWin.postMessage) {
          cropWin.postMessage({ type: 'cropEditorSetImage', dataURL: img.src }, '*');
        }
      } catch (e) {}
    };
    window.addEventListener('message', function onCropReady(ev) {
      if (ev.data && ev.data.type === 'cropEditorReady' && ev.source === cropWin) {
        window.removeEventListener('message', onCropReady);
        sendImage();
      }
    });
    setTimeout(sendImage, 300);
  }
  function viewerSSPCloseFullscreen() {
    var overlay = document.getElementById('viewer-fs-overlay');
    if (overlay) overlay.classList.remove('open');
    if (__viewerFsOnMove) document.removeEventListener('mousemove', __viewerFsOnMove);
    if (__viewerFsOnUp) document.removeEventListener('mouseup', __viewerFsOnUp);
  }
  function viewerSSPOpenFullscreen(dataURL) {
    if (!dataURL) return;
    var overlay = document.getElementById('viewer-fs-overlay');
    var img = document.getElementById('viewer-fs-img');
    if (!overlay || !img) return;
    img.src = dataURL;
    __viewerFsScale = 1;
    __viewerFsTx = 0;
    __viewerFsTy = 0;
    viewerSSPFsApply();
    overlay.classList.add('open');

    var area = document.getElementById('viewer-fs-area');
    __viewerFsOnMove = function (e) {
      if (!__viewerFsDragging) return;
      __viewerFsTx = __viewerFsStartTx + e.clientX - __viewerFsStartX;
      __viewerFsTy = __viewerFsStartTy + e.clientY - __viewerFsStartY;
      viewerSSPFsApply();
    };
    __viewerFsOnUp = function () {
      __viewerFsDragging = false;
      document.removeEventListener('mousemove', __viewerFsOnMove);
      document.removeEventListener('mouseup', __viewerFsOnUp);
    };
    if (area) {
      area.onmousedown = function (e) {
        if (e.button !== 0) return;
        __viewerFsDragging = true;
        __viewerFsStartX = e.clientX;
        __viewerFsStartY = e.clientY;
        __viewerFsStartTx = __viewerFsTx;
        __viewerFsStartTy = __viewerFsTy;
        document.addEventListener('mousemove', __viewerFsOnMove);
        document.addEventListener('mouseup', __viewerFsOnUp);
      };
    }
  }
  function viewerSSPAbort() {
    if (window.opener && typeof window.opener.abortCurrentTask === 'function') {
      try { window.opener.abortCurrentTask(); } catch (e) {}
    }
  }
  function viewerSSPInit() {
    var fileInput = document.getElementById('ssp-file-input');
    var uploadZone = document.getElementById('ssp-upload-zone');
    if (fileInput) {
      fileInput.onchange = function (e) {
        var f = e.target.files && e.target.files[0];
        if (f) {
          var r = new FileReader();
          r.onload = function () {
            __viewerSSPSeedImage = r.result;
            viewerSSPSetUploadZoneContent(r.result);
          };
          r.readAsDataURL(f);
        }
        fileInput.value = '';
      };
    }
    if (uploadZone) {
      uploadZone.ondragover = function (e) { e.preventDefault(); uploadZone.style.borderColor = '#f59e0b'; };
      uploadZone.ondragleave = function () { uploadZone.style.borderColor = ''; };
      uploadZone.ondrop = function (e) {
        e.preventDefault();
        uploadZone.style.borderColor = '';
        var f = e.dataTransfer.files[0];
        if (f && f.type.indexOf('image') >= 0) {
          var r = new FileReader();
          r.onload = function () {
            __viewerSSPSeedImage = r.result;
            viewerSSPSetUploadZoneContent(r.result);
          };
          r.readAsDataURL(f);
        }
      };
    }
    if (!window.__viewerSSPPasteInit) {
      window.__viewerSSPPasteInit = true;
      document.addEventListener('paste', function (e) {
        var sb = document.getElementById('ssp-ai-sidebar');
        if (!sb || !sb.classList.contains('open')) return;
        var items = e.clipboardData && e.clipboardData.items;
        if (!items) return;
        for (var i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') >= 0) {
            var f = items[i].getAsFile();
            if (f) {
              var r = new FileReader();
              r.onload = function () {
                __viewerSSPSeedImage = r.result;
                viewerSSPSetUploadZoneContent(r.result);
              };
              r.readAsDataURL(f);
              e.preventDefault();
              break;
            }
          }
        }
      });
    }
    document.querySelectorAll('.ssp-ratio-btn').forEach(function (b) {
      b.onclick = function () {
        __viewerSSPRatio = this.getAttribute('data-ratio') || '1:1';
        document.querySelectorAll('.ssp-ratio-btn').forEach(function (x) { x.classList.toggle('active', x === b); });
      };
    });
    var modelSel = document.getElementById('ssp-model');
    if (modelSel && window.opener && typeof window.opener.getImageModelId === 'function') {
      try { modelSel.value = window.opener.getImageModelId() || 'gemini-3.1-flash-image-preview'; } catch (e) {}
    }
    viewerSSPImgHistoryLoad();
    viewerSSPImgHistoryRender();
  }
  async function viewerSSPGenerate() {
    var promptEl = document.getElementById('ssp-prompt');
    var prompt = promptEl && promptEl.value ? promptEl.value.trim() : '';
    var seedImage = __viewerSSPSeedImage;
    var hasSeed = seedImage && typeof seedImage === 'string' && seedImage.indexOf('data:image') === 0;
    if (!hasSeed && !prompt) { alert('이미지를 올리거나 프롬프트를 입력하세요.'); return; }
    if (!window.opener || typeof window.opener.generateImage !== 'function') { alert('메인 창을 찾을 수 없거나 이미지 API를 사용할 수 없습니다.'); return; }
    var statusEl = document.getElementById('ssp-status');
    var resultImg = document.getElementById('ssp-result-img');
    var downloadBtn = document.getElementById('ssp-download-btn');
    var progressWrap = document.getElementById('ssp-progress-wrap');
    var progressFill = document.getElementById('ssp-progress-fill');
    var progressPct = document.getElementById('ssp-progress-pct');
    var modelSel = document.getElementById('ssp-model');
    var modelId = modelSel ? modelSel.value : 'gemini-3.1-flash-image-preview';
    var noText = document.getElementById('ssp-no-text') && document.getElementById('ssp-no-text').checked;

    if (window.opener) window.opener._aiTaskCancelled = false;
    if (progressWrap) { progressWrap.classList.add('visible'); progressWrap.style.display = 'flex'; }
    if (progressFill) progressFill.style.width = '0%';
    if (progressPct) progressPct.textContent = '0%';
    if (statusEl) statusEl.textContent = 'AI 이미지 생성 중...';

    var progressInterval = null;
    var progressVal = 0;
    var progressMax = 95;
    var progressStep = 2;
    var progressMs = 800;
    progressInterval = setInterval(function () {
      progressVal = Math.min(progressMax, progressVal + progressStep);
      if (progressFill) progressFill.style.width = progressVal + '%';
      if (progressPct) progressPct.textContent = progressVal + '%';
      if (progressVal >= progressMax) clearInterval(progressInterval);
    }, progressMs);

    try {
      var dataURL = await window.opener.generateImage(prompt, { seedImage: hasSeed ? seedImage : null, modelId: modelId, aspectRatio: __viewerSSPRatio, noText: noText });
      clearInterval(progressInterval);
      if (progressFill) progressFill.style.width = '100%';
      if (progressPct) progressPct.textContent = '100%';
      if (progressWrap) setTimeout(function () { progressWrap.classList.remove('visible'); progressWrap.style.display = 'none'; }, 500);

      if (dataURL) {
        __viewerSSPResultImage = dataURL;
        if (resultImg) { resultImg.src = dataURL; resultImg.style.display = 'block'; resultImg.title = '클릭하면 크게 보기'; }
        if (downloadBtn) downloadBtn.disabled = false;
        if (statusEl) statusEl.textContent = '✅ 생성 완료!';
        viewerSSPImgHistoryAdd(dataURL, prompt);
      } else {
        if (statusEl) statusEl.textContent = '❌ 생성 실패';
      }
    } catch (e) {
      clearInterval(progressInterval);
      if (progressWrap) { progressWrap.classList.remove('visible'); progressWrap.style.display = 'none'; }
      if (statusEl) statusEl.textContent = (e && e.name === 'AbortError') ? '⏹ 생성 중지됨' : '❌ 오류: ' + (e.message || e);
    }
  }
  function viewerSSPDownload() {
    if (!__viewerSSPResultImage) { alert('다운로드할 이미지가 없습니다.'); return; }
    var a = document.createElement('a');
    a.href = __viewerSSPResultImage;
    a.download = 'ssp_image_' + Date.now() + '.png';
    a.click();
  }
  function viewerSSPImgHistoryLoad() {
    try {
      var raw = localStorage.getItem(LS_SSP_IMG_HISTORY);
      if (raw) __viewerSSPImgHistory = JSON.parse(raw);
      else __viewerSSPImgHistory = [];
    } catch (e) { __viewerSSPImgHistory = []; }
  }
  function viewerSSPImgHistorySave() {
    try { localStorage.setItem(LS_SSP_IMG_HISTORY, JSON.stringify(__viewerSSPImgHistory)); } catch (e) {}
  }
  function viewerSSPImgHistoryAdd(dataURL, prompt) {
    if (!dataURL) return;
    var entry = { id: 'sspih_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9), dataURL: dataURL, prompt: (prompt || '').substring(0, 80), createdAt: new Date().toISOString() };
    __viewerSSPImgHistory.unshift(entry);
    if (__viewerSSPImgHistory.length > SSP_IMG_HISTORY_MAX) __viewerSSPImgHistory = __viewerSSPImgHistory.slice(0, SSP_IMG_HISTORY_MAX);
    viewerSSPImgHistorySave();
    viewerSSPImgHistoryRender();
  }
  function viewerSSPImgHistoryRemove(id) {
    __viewerSSPImgHistory = __viewerSSPImgHistory.filter(function (h) { return h.id !== id; });
    viewerSSPImgHistorySave();
    viewerSSPImgHistoryRender();
  }
  function viewerSSPImgHistoryRender() {
    var list = document.getElementById('ssp-img-history-list');
    if (!list) return;
    if (__viewerSSPImgHistory.length === 0) { list.innerHTML = '<span style="font-size:10px;color:#94a3b8">생성된 이미지가 여기 쌓입니다.</span>'; return; }
    var html = '';
    for (var i = 0; i < __viewerSSPImgHistory.length; i++) {
      var h = __viewerSSPImgHistory[i];
      var lbl = (h.prompt || '(프롬프트 없음)').replace(/</g, '&lt;').substring(0, 30) + ((h.prompt || '').length > 30 ? '…' : '');
      html += '<div class="ssp-img-history-item" data-id="' + h.id + '">';
      html += '<img src="' + (h.dataURL || '').replace(/"/g, '&quot;') + '" onclick="viewerSSPOpenFullscreen(this.src); event.stopPropagation()" title="클릭하면 크게 보기">';
      html += '<span class="ssp-h-label">' + lbl + '</span>';
      html += '<button type="button" class="ssp-h-del" onclick="viewerSSPImgHistoryRemove(\'' + h.id + '\'); event.stopPropagation()" title="삭제">×</button>';
      html += '</div>';
    }
    list.innerHTML = html;
  }

  window.setPageZoom = setPageZoom;
  window.setFontZoom = setFontZoom;
  window.toggleTheme = toggleTheme;
  window.toggleViewerFullscreen = toggleViewerFullscreen;
  window.viewerScrollToId = viewerScrollToId;
  window.saveAs = saveAs;
  window.viewerSwitchToEdit = viewerSwitchToEdit;
  window.viewerSwitchToView = viewerSwitchToView;
  window.viewerSaveToOpener = viewerSaveToOpener;
  window.viewerEditFmt = viewerEditFmt;
  window.viewerNavSwitch = viewerNavSwitch;
  window.viewerBuildNav = viewerBuildNav;
  window.openMdproWithLogin = openMdproWithLogin;
  window.toggleScholarAI = toggleScholarAI;
  window.scholarAIInitResize = scholarAIInitResize;
  window.scholarAIShrink = scholarAIShrink;
  window.toggleScholarAIPrePrompt = toggleScholarAIPrePrompt;
  window.toggleScholarAIModelSelect = toggleScholarAIModelSelect;
  window.scholarAIFullscreen = scholarAIFullscreen;
  window.scholarAISyncSelection = scholarAISyncSelection;
  window.scholarAIHistoryAdd = scholarAIHistoryAdd;
  window.scholarAIHistoryRender = scholarAIHistoryRender;
  window.scholarAIHistoryShowResult = scholarAIHistoryShowResult;
  window.scholarAIHistoryDelete = scholarAIHistoryDelete;
  window.scholarAIHistorySaveMd = scholarAIHistorySaveMd;
  window.scholarAIHistorySaveAll = scholarAIHistorySaveAll;
  window.scholarAIRun = scholarAIRun;
  window.scholarAICopyResult = scholarAICopyResult;
  window.scholarAIClearResult = scholarAIClearResult;
  window.scholarAIResultFont = scholarAIResultFont;
  window.handleScholarAIInsertClick = handleScholarAIInsertClick;
  window.toggleScholarAIInsertMenu = toggleScholarAIInsertMenu;
  window.closeScholarAIInsertMenu = closeScholarAIInsertMenu;
  window.scholarAIInsertDoc = scholarAIInsertDoc;
  window.toggleViewerSSP = toggleViewerSSP;
  window.sspAIShrink = sspAIShrink;
  window.viewerSSPSyncSelection = viewerSSPSyncSelection;
  window.viewerSSPInit = viewerSSPInit;
  window.viewerSSPGenerate = viewerSSPGenerate;
  window.viewerSSPDownload = viewerSSPDownload;
  window.viewerSSPClearSeed = viewerSSPClearSeed;
  window.viewerSSPOpenFullscreen = viewerSSPOpenFullscreen;
  window.viewerSSPCloseFullscreen = viewerSSPCloseFullscreen;
  window.viewerSSPImgHistoryRemove = viewerSSPImgHistoryRemove;
  window.viewerSSPAbort = viewerSSPAbort;

  function viewerSidebarInitResize() {
    var handle = document.getElementById('viewer-sidebar-resize-handle');
    var sidebar = document.getElementById('viewer-sidebar');
    if (!handle || !sidebar) return;
    var minW = 120, maxW = 400;
    var startX = 0, startW = 0;
    function onMove(e) {
      var w = startW + (e.clientX - startX);
      w = Math.max(minW, Math.min(maxW, w));
      sidebar.style.width = w + 'px';
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    handle.onmousedown = function (e) {
      e.preventDefault();
      startX = e.clientX;
      startW = sidebar.offsetWidth;
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    };
  }

  window.viewerInit = function () {
    var vp = document.getElementById('content-viewport');
    var pz = window._pageZoom || 100;
    if (vp) vp.style.setProperty('--zoom', pz / 100);
    if ((window.__contentType || '') === 'refs') {
      var sb = document.getElementById('viewer-btn-save');
      var eb = document.getElementById('viewer-btn-edit');
      if (sb) sb.style.display = 'none';
      if (eb) eb.style.display = 'none';
    }
    try {
      var saved = localStorage.getItem('ss_viewer_scholar_ai_history');
      if (saved) {
        var arr = JSON.parse(saved);
        if (Array.isArray(arr) && arr.length) __scholarAIHistory = arr;
      }
    } catch (e) {}
    viewerBuildNav();
    viewerSidebarInitResize();
    scholarAIHistoryRender();
    var resTa = document.getElementById('scholar-ai-result');
    if (resTa) resTa.style.fontSize = __scholarAIResultFontSize + 'px';
    var histSearch = document.getElementById('scholar-ai-history-search');
    if (histSearch) histSearch.addEventListener('input', scholarAIHistoryRender);
  };

  document.addEventListener('click', function (e) {
    var m = document.getElementById('scholar-ai-insert-menu');
    if (m && m.classList.contains('open') && !m.contains(e.target) && !e.target.onclick) {
      var wrap = document.querySelector('.scholar-ai-insert-wrap');
      if (wrap && !wrap.contains(e.target)) m.classList.remove('open');
    }
  });

  window.addEventListener('message', function (e) {
    if (!e.data) return;
    if (e.data.type === 'imgViewerInsert' && e.data.dataURL && window.opener && !window.opener.closed) {
      try { window.opener.postMessage({ type: 'imgViewerInsert', dataURL: e.data.dataURL }, '*'); } catch (err) {}
      return;
    }
    if (e.data.type !== 'mdpro_ready' || !window.__mdproPendingText) return;
    try {
      if (e.source && !e.source.closed) {
        e.source.postMessage({ type: 'mdpro_document', title: (window.__mdproDocTitle || 'ScholarSlide 문서'), content: window.__mdproPendingText }, '*');
        if (window.__mdproPasswordTimer) { clearInterval(window.__mdproPasswordTimer); window.__mdproPasswordTimer = null; }
        window.__mdproPendingText = null;
        window.__mdproPassword = null;
        alert('전송했습니다. mdlivepro에서 새 탭으로 열렸는지 확인하세요.');
      }
    } catch (err) {}
  });
})();

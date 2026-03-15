/**
 * ScholarSlide — 슬라이드 스타일/문체 설정, 원문·요약·번역 뷰어 창 (setSlideStyle, updateHeaderSlideMode, setWritingStyle,
 *   promoteSectionHeadings, buildViewerContentWithPages, getTextViewerWindowHtml, getTranslationViewerWindowHtml,
 *   openTranslationViewer, openKoreanViewWindow, openFullTextWindow, openSummaryWindow)
 * 전역 의존: getSlideStyle, setSlideStyle, setWritingStyle, getRawText, setRawText, getSummaryText, setSummaryText, getFileName,
 *   getSlides, markdownToHtml, renderLeftPanel, renderSlides, showToast, escapeHtml
 */
(function () {
  'use strict';

  function setSlideStyle(s) {
    if (typeof window._setSlideStyleState === 'function') window._setSlideStyleState(s);
    if (typeof window.updateHeaderSlideMode === 'function') window.updateHeaderSlideMode();
    if (typeof window.renderLeftPanel === 'function') window.renderLeftPanel();
    var slides = typeof window.getSlides === 'function' ? window.getSlides() : [];
    if (slides.length && typeof window.renderSlides === 'function') window.renderSlides();
  }

  function updateHeaderSlideMode() {
    var slideStyle = typeof window.getSlideStyle === 'function' ? window.getSlideStyle() : 'light';
    var lightBtn = document.getElementById('header-slide-mode-light');
    var darkBtn = document.getElementById('header-slide-mode-dark');
    if (lightBtn) lightBtn.classList.toggle('active', slideStyle === 'light');
    if (darkBtn) darkBtn.classList.toggle('active', slideStyle === 'dark');
  }

  function setWritingStyle(s) {
    if (typeof window._setWritingStyleState === 'function') window._setWritingStyleState(s);
    var msg = s === 'academic-da' ? '학술체 (~이다)' : s === 'academic-im' ? '학술체 (~임, ~함)' : '일반체 (존댓말)';
    if (typeof showToast === 'function') showToast('✅ 문체: ' + msg + '으로 설정됨 — 슬라이드 생성 시 적용됩니다');
  }

  function promoteSectionHeadings(text) {
    if (!text || !text.trim()) return text;
    var t = text
      .replace(/^(Abstract|References?|CONCLUSIONS?|INTRODUCTION|참고문헌|결론|초록|서론|General discussion|Limitations, implications and future directions)\s*$/gim, '## $1')
      .replace(/^(\d+(?:\.\d+)*\.\s+[^\n]+)$/gm, '## $1');
    return t;
  }

  function buildViewerContentWithPages(text) {
    var md = typeof window.markdownToHtml === 'function' ? window.markdownToHtml : function (s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
    if (!text || !text.trim()) return md('');
    var re = /---\s*(\d+)\s*페이지\s*---/g;
    var matches = [];
    var m;
    while ((m = re.exec(text)) !== null) matches.push({ num: m[1], startIndex: m.index, endIndex: m.index + m[0].length });
    if (matches.length > 0) {
      var out = [];
      for (var i = 0; i < matches.length; i++) {
        var start = matches[i].endIndex;
        var end = i + 1 < matches.length ? matches[i + 1].startIndex : text.length;
        var segment = text.slice(start, end).trim();
        var html = md(promoteSectionHeadings(segment));
        out.push('<div id="page-' + matches[i].num + '" class="page-section">' + html + '</div>');
      }
      return out.join('');
    }
    var slideRe = /^Slide\s+(\d+)\s*$/gm;
    var slideMatches = [];
    while ((m = slideRe.exec(text)) !== null) slideMatches.push({ num: m[1], startIndex: m.index, endIndex: m.index + m[0].length });
    if (slideMatches.length > 0) {
      var out = [];
      for (var i = 0; i < slideMatches.length; i++) {
        var start = slideMatches[i].startIndex;
        var end = i + 1 < slideMatches.length ? slideMatches[i + 1].startIndex : text.length;
        var segment = text.slice(start, end).trim();
        var html = md(promoteSectionHeadings(segment));
        out.push('<div id="page-Slide ' + slideMatches[i].num + '" class="page-section">' + html + '</div>');
      }
      return out.join('');
    }
    return md(promoteSectionHeadings(text));
  }

  function getTextViewerWindowHtml(opts) {
    var title = opts.title;
    var subtitle = opts.subtitle;
    var contentHtml = opts.contentHtml;
    var rawTextJson = opts.rawTextJson;
    var pageTitle = opts.pageTitle || title;
    var contentType = opts.contentType || 'raw';
    return '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' + pageTitle + '</title><style>'
+ '* { box-sizing: border-box; margin: 0; padding: 0; }'
+ 'body { display: flex; flex-direction: column; height: 100vh; overflow: hidden; font-family: \'JetBrains Mono\', \'Noto Sans KR\', monospace; transition: background 0.2s, color 0.2s; }'
+ 'body.theme-dark { background: #0c0e13; color: #b0bac8; }'
+ 'body.theme-light { background: #f5f6f8; color: #1e293b; }'
+ '.toolbar { flex-shrink: 0; background: #13161d; border-bottom: 1px solid #1e2332; padding: 10px 16px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; z-index: 10; }'
+ 'body.theme-light .toolbar { background: #e2e8f0; border-bottom-color: #cbd5e1; }'
+ '.toolbar h2 { font-size: 14px; color: #4f8ef7; flex: 1; min-width: 120px; }'
+ '.toolbar .tbtn { background: #4f8ef7; color: #fff; border: none; border-radius: 6px; padding: 6px 12px; font-size: 12px; cursor: pointer; white-space: nowrap; }'
+ '.toolbar .tbtn.ghost { background: #1a1e28; border: 1px solid #2e3447; color: #b0bac8; }'
+ 'body.theme-light .tbtn.ghost { background: #fff; border-color: #94a3b8; color: #475569; }'
+ '.toolbar .tbtn:hover { opacity: 0.9; }'
+ '.toolbar .tzoom-val { font-size: 11px; color: #94a3b8; min-width: 40px; text-align: center; font-family: monospace; }'
+ 'body.theme-light .toolbar .tzoom-val { color: #64748b; }'
+ '.main-with-sidebar { display: flex; flex: 1; min-height: 0; }'
+ '.viewer-sidebar { min-width: 120px; max-width: 400px; width: 200px; flex-shrink: 0; background: #13161d; border-right: 1px solid #1e2332; display: flex; flex-direction: column; overflow: hidden; position: relative; }'
+ 'body.theme-light .viewer-sidebar { background: #e2e8f0; border-right-color: #cbd5e1; }'
+ '.viewer-sidebar-tabs { display: flex; border-bottom: 1px solid #1e2332; }'
+ 'body.theme-light .viewer-sidebar-tabs { border-color: #cbd5e1; }'
+ '.viewer-sidebar-tab { flex: 1; padding: 8px 10px; font-size: 12px; cursor: pointer; text-align: center; background: #1a1e28; color: #94a3b8; border: none; }'
+ 'body.theme-light .viewer-sidebar-tab { background: #cbd5e1; color: #475569; }'
+ '.viewer-sidebar-tab.active { background: #252a37; color: #4f8ef7; font-weight: 600; }'
+ 'body.theme-light .viewer-sidebar-tab.active { background: #fff; color: #4f8ef7; }'
+ '.viewer-sidebar-tab:hover:not(.active) { background: #252a37; color: #b0bac8; }'
+ 'body.theme-light .viewer-sidebar-tab:hover:not(.active) { background: #94a3b8; color: #fff; }'
+ '.viewer-sidebar-resize-handle { position: absolute; right: 0; top: 0; bottom: 0; width: 8px; cursor: col-resize; z-index: 20; background: transparent; }'
+ '.viewer-sidebar-resize-handle:hover { background: rgba(79,142,247,0.25); }'
+ '.viewer-sidebar-resize-handle::after { content: ""; position: absolute; right: 3px; top: 50%; transform: translateY(-50%); width: 2px; height: 32px; border-radius: 1px; background: #4f8ef7; opacity: 0.5; }'
+ '.viewer-sidebar-resize-handle:hover::after { opacity: 0.9; }'
+ 'body.theme-light .viewer-sidebar-resize-handle::after { background: #4f8ef7; }'
+ '.viewer-sidebar-list { flex: 1; overflow-y: auto; padding: 10px; font-size: 12px; line-height: 1.5; }'
+ '.viewer-sidebar-list a { display: block; color: #94a3b8; text-decoration: none; padding: 4px 0; border-radius: 4px; padding-left: 4px; }'
+ 'body.theme-light .viewer-sidebar-list a { color: #475569; }'
+ '.viewer-sidebar-list a:hover { color: #4f8ef7; background: rgba(79,142,247,0.1); }'
+ '.viewer-sidebar-list a.toc-h2 { padding-left: 12px; font-size: 11px; }'
+ '.viewer-sidebar-list a.toc-h3 { padding-left: 20px; font-size: 11px; }'
+ '.viewer-sidebar-list a.toc-h4 { padding-left: 28px; font-size: 11px; }'
+ '.viewer-sidebar-list .toc-item { display: block; color: #94a3b8; padding: 4px 0; padding-left: 4px; }'
+ 'body.theme-light .viewer-sidebar-list .toc-item { color: #475569; }'
+ '.viewer-sidebar-list .toc-item.toc-h2 { padding-left: 12px; font-size: 11px; }'
+ '.viewer-sidebar-list .toc-item.toc-h3 { padding-left: 20px; font-size: 11px; }'
+ '.viewer-sidebar-list .toc-item.toc-h4 { padding-left: 28px; font-size: 11px; }'
+ '.content-viewport { flex: 1; overflow: auto; padding: 20px; display: flex; justify-content: center; min-width: 0; }'
+ 'body.theme-light .content-viewport { background: #f1f5f9; }'
+ '.page { max-width: calc(860px * var(--page-zoom, 1)); width: 100%; min-height: min-content; padding: 24px; word-wrap: break-word; box-shadow: 0 4px 24px rgba(0,0,0,0.15); border-radius: 8px; }'
+ 'body.theme-dark .page { background: #13161d; border: 1px solid #1e2332; }'
+ 'body.theme-light .page { background: #fff; border: 1px solid #e2e8f0; }'
+ '.page-content { font-size: 14px; line-height: 1.7; }'
+ '.page-content .page-section { margin-bottom: 2em; }'
+ '.page-content .page-section:last-child { margin-bottom: 0; }'
+ 'body.theme-dark .page-content { color: #b0bac8; }'
+ 'body.theme-light .page-content { color: #334155; }'
+ '.page-content h1,.page-content h2,.page-content h3,.page-content h4 { font-family: sans-serif; color: #4f8ef7; margin-top: 1em; margin-bottom: 0.5em; scroll-margin-top: 16px; }'
+ '.page-content h1 { font-size: 1.4em; }'
+ '.page-content h2 { font-size: 1.2em; border-bottom: 1px solid #252a37; padding-bottom: 6px; }'
+ '.page-content h3,.page-content h4 { font-size: 1.1em; }'
+ 'body.theme-light .page-content h2 { border-color: #e2e8f0; }'
+ '.page-content pre, .page-content code { background: rgba(79,142,247,0.12); border-radius: 4px; font-family: inherit; }'
+ '.page-content pre { padding: 12px; overflow-x: auto; }'
+ '.page-content code { padding: 2px 6px; }'
+ '.page-content ul, .page-content ol { margin: 0.5em 0; padding-left: 1.5em; }'
+ '.page-content a { color: #60a5fa; text-decoration: underline; }'
+ '.page-content p { margin: 0.5em 0; }'
+ '.page-content-pre { white-space: pre-wrap; word-break: break-word; }'
+ '.viewer-edit-wrap { display: none; flex: 1; min-width: 0; min-height: 0; flex-direction: column; padding: 16px; }'
+ '.viewer-edit-wrap.visible { display: flex; }'
+ '.viewer-edit-wrap textarea { flex: 1; min-height: 200px; width: 100%; padding: 16px; font-size: 14px; line-height: 1.7; font-family: \'Noto Sans KR\', \'JetBrains Mono\', monospace; border: 1px solid #1e2332; border-radius: 8px; resize: none; background: #13161d; color: #b0bac8; box-sizing: border-box; }'
+ 'body.theme-light .viewer-edit-wrap textarea { background: #fff; color: #1e293b; border-color: #e2e8f0; }'
+ '.content-viewport.viewer-edit-active .page { display: none !important; }'
+ '.content-viewport.viewer-edit-active .viewer-edit-wrap { display: flex !important; }'
+ '@media print { .toolbar { display: none !important; } .viewer-sidebar { display: none !important; } body { background: #fff; color: #111; } .content-viewport { padding: 0; } .page { box-shadow: none; border: none; } }'
+ '.toolbar { flex-shrink: 0; background: #13161d; border-bottom: 1px solid #1e2332; padding: 8px 16px; display: flex; flex-direction: column; gap: 8px; z-index: 10; }'
+ 'body.theme-light .toolbar { background: #e2e8f0; border-bottom-color: #cbd5e1; }'
+ '.toolbar-row { display: flex; justify-content: flex-end; align-items: center; gap: 8px; flex-wrap: wrap; }'
+ '.toolbar .tzoom-val { font-size: 11px; color: #94a3b8; min-width: 36px; text-align: center; font-family: monospace; }'
+ 'body.theme-light .toolbar .tzoom-val { color: #64748b; }'
+ '.scholar-ai-sidebar { width: 0; min-width: 0; overflow: hidden; flex-shrink: 0; display: flex; flex-direction: column; background: #13161d; border-left: 1px solid #1e2332; transition: min-width 0.2s; position: relative; }'
+ 'body.theme-light .scholar-ai-sidebar { background: #e2e8f0; border-left-color: #cbd5e1; }'
+ '.scholar-ai-sidebar.open { min-width: 280px; width: 380px; max-width: 90vw; }'
+ '.scholar-ai-sidebar.fullscreen { position: fixed; inset: 0; z-index: 9999; min-width: 100%; width: 100%; border: none; }'
+ '.scholar-ai-resize-handle { position: absolute; left: 0; top: 0; bottom: 0; width: 12px; cursor: col-resize; z-index: 10; display: flex; align-items: center; justify-content: center; background: transparent; }'
+ '.scholar-ai-resize-handle:hover { background: rgba(79,142,247,0.25); }'
+ '.scholar-ai-resize-handle::before { content: ""; width: 3px; height: 40px; border-radius: 2px; background: #4f8ef7; opacity: 0.5; }'
+ '.scholar-ai-resize-handle:hover::before { opacity: 0.9; }'
+ 'body.theme-light .scholar-ai-resize-handle::before { background: #4f8ef7; }'
+ '.scholar-ai-sidebar > .scholar-ai-inner { display: flex; flex-direction: column; flex: 1; min-width: 0; min-height: 0; position: relative; }'
+ '.scholar-ai-header { flex-shrink: 0; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e2332; }'
+ 'body.theme-light .scholar-ai-header { border-color: #cbd5e1; }'
+ '.scholar-ai-header h3 { font-size: 13px; color: #4f8ef7; margin: 0; }'
+ '.scholar-ai-header .sa-btn { background: #1a1e28; border: 1px solid #2e3447; color: #b0bac8; border-radius: 6px; padding: 4px 10px; font-size: 11px; cursor: pointer; margin-left: 4px; }'
+ 'body.theme-light .scholar-ai-header .sa-btn { background: #fff; border-color: #94a3b8; color: #475569; }'
+ '.scholar-ai-body { flex: 1; overflow-y: auto; padding: 10px; display: flex; flex-direction: column; gap: 10px; min-height: 0; }'
+ '.scholar-ai-body label { font-size: 11px; color: #94a3b8; display: block; margin-bottom: 4px; }'
+ '.scholar-ai-body textarea { width: 100%; min-height: 60px; padding: 8px; font-size: 12px; line-height: 1.5; border: 1px solid #1e2332; border-radius: 6px; background: #0c0e13; color: #b0bac8; resize: vertical; box-sizing: border-box; }'
+ 'body.theme-light .scholar-ai-body textarea { background: #fff; color: #1e293b; border-color: #e2e8f0; }'
+ '.scholar-ai-result { min-height: 260px; font-size: 13px; flex: 1; }'
+ '.scholar-ai-footer { flex-shrink: 0; padding: 8px 10px; border-top: 1px solid #1e2332; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }'
+ 'body.theme-light .scholar-ai-footer { border-color: #cbd5e1; }'
+ '.scholar-ai-footer .sa-font { font-size: 11px; color: #94a3b8; margin-right: 4px; }'
+ '.scholar-ai-footer .sa-btn { background: #4f8ef7; color: #fff; border: none; border-radius: 6px; padding: 5px 10px; font-size: 11px; cursor: pointer; }'
+ '.scholar-ai-footer .sa-btn.ghost { background: #1a1e28; border: 1px solid #2e3447; color: #b0bac8; }'
+ 'body.theme-light .scholar-ai-footer .sa-btn.ghost { background: #fff; border-color: #94a3b8; color: #475569; }'
+ '.scholar-ai-insert-wrap { position: relative; display: inline-block; }'
+ '.scholar-ai-insert-menu { display: none; position: absolute; bottom: 100%; left: 0; margin-bottom: 4px; background: #13161d; border: 1px solid #2e3447; border-radius: 6px; padding: 4px; min-width: 160px; z-index: 10; }'
+ '.scholar-ai-insert-menu.open { display: block; }'
+ '.scholar-ai-insert-menu button { display: block; width: 100%; text-align: left; padding: 6px 10px; font-size: 12px; border: none; background: none; color: #b0bac8; cursor: pointer; border-radius: 4px; }'
+ '.scholar-ai-insert-menu button:hover { background: #252a37; color: #fff; }'
+ '.scholar-ai-history { flex-shrink: 0; padding: 8px 10px; border-top: 1px solid #1e2332; display: flex; flex-direction: column; gap: 6px; max-height: 200px; min-height: 0; }'
+ 'body.theme-light .scholar-ai-history { border-top-color: #cbd5e1; }'
+ '.scholar-ai-history label { font-size: 11px; color: #94a3b8; margin: 0; }'
+ '.scholar-ai-history-search { width: 100%; padding: 6px 8px; font-size: 11px; border: 1px solid #1e2332; border-radius: 4px; background: #0c0e13; color: #b0bac8; box-sizing: border-box; }'
+ 'body.theme-light .scholar-ai-history-search { background: #fff; border-color: #e2e8f0; color: #1e293b; }'
+ '.scholar-ai-history-list { overflow-y: auto; flex: 1; min-height: 60px; max-height: 120px; }'
+ '.scholar-ai-history-item { display: flex; align-items: center; gap: 6px; padding: 6px 8px; margin-bottom: 4px; background: #1a1e28; border: 1px solid #2e3447; border-radius: 4px; font-size: 11px; color: #b0bac8; }'
+ 'body.theme-light .scholar-ai-history-item { background: #f1f5f9; border-color: #cbd5e1; color: #475569; }'
+ '.scholar-ai-history-item .sa-h-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; }'
+ '.scholar-ai-history-item .sa-h-save { padding: 2px 6px; font-size: 10px; cursor: pointer; border: none; border-radius: 4px; background: #4f8ef7; color: #fff; }'
+ '.scholar-ai-history-item .sa-h-del { padding: 2px 6px; font-size: 10px; cursor: pointer; border: none; border-radius: 4px; background: #64748b; color: #fff; }'
+ '.scholar-ai-history-item .sa-h-del:hover { background: #ef4444; }'
+ '</style><script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script></head><body class="theme-light">'
+ '<span id="viewer-doc-title" style="display:none">' + title + ' — ' + subtitle + '</span>'
+ '<div class="toolbar">'
+ '  <div class="toolbar-row">'
+ (contentType === 'summary' ? '    <button class="tbtn" onclick="openMdproWithLogin()" title="mdlivepro에 요약 전송">mdlivepro 새파일</button>' : '')
+ '    <button class="tbtn" onclick="saveAs(\'md\')">MD 저장</button>'
+ '    <button class="tbtn" onclick="saveAs(\'txt\')">TXT 저장</button>'
+ '    <button class="tbtn" onclick="window.print()" title="PDF로 저장">PDF 저장</button>'
+ '    <button class="tbtn" onclick="viewerSavePage()" title="페이지 저장 (닫았다 열어도 유지)">page 저장</button>'
+ '    <button class="tbtn ghost" id="viewer-btn-edit" onclick="viewerSwitchToEdit()">✏️ 편집</button>'
+ '    <button class="tbtn ghost" id="viewer-btn-view" onclick="viewerSwitchToView()" style="display:none">👁 보기</button>'
+ '    <button class="tbtn ghost" onclick="navigator.clipboard.writeText(__rawText).then(function(){alert(\'복사됨\');})">📋 복사</button>'
+ (contentType === 'refs' || contentType === 'manuscript' ? '' : '    <button class="tbtn" id="viewer-btn-save" onclick="viewerSaveToOpener()" title="메인 화면에 현재 내용 저장">💾 저장</button>')
+ (contentType === 'refs' ? '    <button class="tbtn ghost" onclick="if(window.opener && typeof window.opener.reExtractReferencesFromDocument === \'function\'){ window.opener.reExtractReferencesFromDocument(); if(typeof window.opener.openRefExpWindow === \'function\') window.opener.openRefExpWindow(); window.close(); } else { alert(\'메인 창을 찾을 수 없습니다.\'); }" title="원문 재추출">🔄 원문 재추출</button>  <button class="tbtn ghost" onclick="if(window.opener && typeof window.opener.extractReferencesWithAI === \'function\'){ window.opener.extractReferencesWithAI(function(){ if(window.opener && typeof window.opener.openRefExpWindow === \'function\'){ window.opener.openRefExpWindow(); window.close(); } }); } else { alert(\'메인 창을 찾을 수 없습니다.\'); }" title="AI 추출">🤖 AI 추출</button>' : '')
+ '    <button class="tbtn" onclick="toggleScholarAI()" title="인공지능 추가 기능">ScholarAI</button>'
+ '    <button class="tbtn ghost" onclick="window.close()">닫기</button>'
+ '  </div>'
+ '  <div class="toolbar-row">'
+ '    <span style="font-size:11px;color:#94a3b8">page</span>'
+ '    <span id="page-num" style="font-size:11px;color:#94a3b8">1</span>'
+ '    <span class="tzoom-val" id="zoom-val">100%</span>'
+ '    <button class="tbtn ghost" onclick="setPageZoom(-10)" title="페이지 축소 (Ctrl+7)">−</button>'
+ '    <button class="tbtn ghost" onclick="setPageZoom(10)" title="페이지 확대 (Ctrl+8)">+</button>'
+ '    <span style="font-size:11px;color:#94a3b8;margin-left:8px">font</span>'
+ '    <button class="tbtn ghost" onclick="setFontZoom(-1)" title="폰트 축소 (Ctrl+9)">− 축소</button>'
+ '    <button class="tbtn ghost" onclick="setFontZoom(1)" title="폰트 확대 (Ctrl+0)">+ 확대</button>'
+ '    <button class="tbtn ghost" id="theme-btn" onclick="toggleTheme()" title="다크/라이트">Light/Dark</button>'
+ '  </div>'
+ '</div>'
+ '<div class="main-with-sidebar">'
+ '<aside class="viewer-sidebar" id="viewer-sidebar">'
+ '  <div class="viewer-sidebar-resize-handle" id="viewer-sidebar-resize-handle" title="드래그하여 사이드바 너비 조절"></div>'
+ '  <div class="viewer-sidebar-tabs">'
+ '    <button type="button" class="viewer-sidebar-tab" id="nav-tab-page" onclick="viewerNavSwitch(\'page\')">페이지</button>'
+ '    <button type="button" class="viewer-sidebar-tab active" id="nav-tab-toc" onclick="viewerNavSwitch(\'toc\')">목차</button>'
+ '  </div>'
+ '  <div class="viewer-sidebar-list" id="nav-list-page" style="display:none"></div>'
+ '  <div class="viewer-sidebar-list" id="nav-list-toc"></div>'
+ '</aside>'
+ '<div class="content-viewport" id="content-viewport"><div class="page" id="page">'
+ '<div class="page-content" id="page-content">' + contentHtml + '</div>'
+ '</div>'
+ '<div class="viewer-edit-wrap" id="viewer-edit-wrap"><textarea id="viewer-edit-ta" placeholder="텍스트를 편집하세요. Enter로 줄바꿈 가능."></textarea></div>'
+ '</div>'
+ '<div class="scholar-ai-sidebar" id="scholar-ai-sidebar">'
+ '<div class="scholar-ai-resize-handle" id="scholar-ai-resize-handle" title="드래그하여 창 너비 조절"></div>'
+ '<div class="scholar-ai-inner">'
+ '<div class="scholar-ai-header"><h3>ScholarAI</h3><span><button type="button" class="sa-btn" onclick="scholarAIShrink()" title="축소">&gt;축소</button><button type="button" class="sa-btn" onclick="scholarAIFullscreen()" title="크게 보기">전체화면</button></span></div>'
+ '<div class="scholar-ai-body">'
+ '<label>입력된 지문 (선택한 텍스트)</label><textarea id="scholar-ai-selected" readonly placeholder="문서에서 텍스트를 선택하면 여기에 표시됩니다."></textarea>'
+ '<label>프롬프트 작성 창</label><textarea id="scholar-ai-prompt" placeholder="선택한 지문에 대한 질문이나 지시를 입력하세요."></textarea>'
+ '<button type="button" class="sa-btn" style="background:#4f8ef7;color:#fff;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px" onclick="scholarAIRun()">실행</button>'
+ '<label>결과창</label><textarea id="scholar-ai-result" class="scholar-ai-result" readonly placeholder="실행 후 결과가 표시됩니다."></textarea>'
+ '</div>'
+ '<div class="scholar-ai-footer">'
+ '<div class="scholar-ai-insert-wrap"><button type="button" class="sa-btn ghost" onclick="toggleScholarAIInsertMenu()">문서내 삽입</button><div class="scholar-ai-insert-menu" id="scholar-ai-insert-menu"><button type="button" onclick="scholarAIInsertDoc(1); closeScholarAIInsertMenu()">문서 한줄 아래에 삽입</button><button type="button" onclick="scholarAIInsertDoc(2); closeScholarAIInsertMenu()">선택 내용 대체</button></div></div>'
+ '<span class="sa-font">font</span><button type="button" class="sa-btn ghost" onclick="scholarAIResultFont(-1)">−</button><button type="button" class="sa-btn ghost" onclick="scholarAIResultFont(1)">+</button>'
+ '<button type="button" class="sa-btn" onclick="scholarAICopyResult()">결과복사</button>'
+ '</div>'
+ '<div class="scholar-ai-history">'
+ '<label>히스토리</label>'
+ '<input type="text" id="scholar-ai-history-search" placeholder="히스토리 검색..." class="scholar-ai-history-search">'
+ '<div id="scholar-ai-history-list" class="scholar-ai-history-list"></div>'
+ '<button type="button" class="sa-btn ghost" onclick="scholarAIHistorySaveAll()" style="margin-top:4px">히스토리 전체저장</button>'
+ '</div></div></div>'
+ '</div>'
+ '<script>'
+ 'var __rawText = ' + rawTextJson + ';'
+ 'var __contentType = ' + JSON.stringify(contentType) + ';'
+ 'var __mdproDocTitle = ' + JSON.stringify(title) + ';'
+ 'var _pageZoom = 100; var _fontBase = 14;'
+ 'function setPageZoom(delta) { _pageZoom = Math.max(50, Math.min(200, _pageZoom + delta)); var page = document.getElementById("page"); if(page) page.style.setProperty("--page-zoom", _pageZoom/100); var zv = document.getElementById("zoom-val"); if(zv) zv.textContent = _pageZoom + "%"; }'
+ 'function setFontZoom(delta) { var el = document.getElementById("page-content"); if(!el) return; var fs = parseFloat(getComputedStyle(el).fontSize) || _fontBase; fs = Math.max(10, Math.min(28, fs + delta*2)); el.style.fontSize = fs + "px"; }'
+ 'document.addEventListener("keydown", function(e){ if(!e.ctrlKey) return; if(e.key==="7"){ e.preventDefault(); setPageZoom(-10); } else if(e.key==="8"){ e.preventDefault(); setPageZoom(10); } else if(e.key==="9"){ e.preventDefault(); setFontZoom(-1); } else if(e.key==="0"){ e.preventDefault(); setFontZoom(1); } });'
+ 'function toggleTheme() { var b = document.body; b.classList.toggle("theme-dark"); b.classList.toggle("theme-light"); document.getElementById("theme-btn").textContent = b.classList.contains("theme-dark") ? "Dark/Light" : "Light/Dark"; }'
+ 'function saveAs(ext) { var a = document.createElement("a"); a.href = "data:text/" + (ext==="md"?"markdown":"plain") + ";charset=utf-8," + encodeURIComponent(__rawText); var t = document.getElementById("viewer-doc-title"); a.download = (t ? t.textContent : document.title || "document").replace(/[^a-zA-Z0-9가-힣._-]/g,"_").slice(0,50) + "." + ext; a.click(); }'
+ 'function viewerSwitchToEdit() { var ta = document.getElementById("viewer-edit-ta"); ta.value = __rawText; document.getElementById("content-viewport").classList.add("viewer-edit-active"); document.getElementById("viewer-btn-edit").style.display = "none"; document.getElementById("viewer-btn-view").style.display = "inline-block"; viewerBuildNav(); var onTocInput = function(){ viewerBuildNav(); }; ta.removeEventListener("input", onTocInput); ta.addEventListener("input", onTocInput); }'
+ 'function viewerSwitchToView() { var ta = document.getElementById("viewer-edit-ta"); __rawText = ta.value; var html = ""; try { if (window.opener && typeof window.opener.getViewerRenderedContent === "function") { html = window.opener.getViewerRenderedContent(__rawText); } } catch(e) {} if (!html && typeof marked !== "undefined") { html = marked.parse(__rawText || ""); } if (!html) { html = __rawText.replace(/\\x3C/g,"&lt;").replace(/>/g,"&gt;").replace(/\\n/g,"<br>"); } document.getElementById("content-viewport").classList.remove("viewer-edit-active"); document.getElementById("viewer-btn-view").style.display = "none"; document.getElementById("viewer-btn-edit").style.display = "inline-block"; var pc = document.getElementById("page-content"); if (pc) { pc.innerHTML = html; if (typeof viewerBuildNav === "function") requestAnimationFrame(function(){ viewerBuildNav(); }); } }'
+ 'function viewerSaveToOpener() { var ta = document.getElementById("viewer-edit-ta"); var isEdit = document.getElementById("content-viewport").classList.contains("viewer-edit-active"); var text = isEdit && ta ? ta.value : __rawText; if (isEdit && ta) __rawText = ta.value; if (window.opener && typeof window.opener.setViewerContent === "function") { window.opener.setViewerContent(text, __contentType); alert("저장되었습니다."); } else { alert("메인 창을 찾을 수 없습니다."); } }'
+ 'function viewerSavePage() { var ta = document.getElementById("viewer-edit-ta"); var isEdit = document.getElementById("content-viewport").classList.contains("viewer-edit-active"); var text = isEdit && ta ? ta.value : __rawText; if (isEdit && ta) __rawText = ta.value; try { localStorage.setItem("ss_viewer_page_" + __contentType, text); alert("page 저장되었습니다. 닫았다 열어도 유지됩니다."); } catch(e) { alert("저장 실패: " + (e.message || "")); } }'
+ 'function viewerNavSwitch(t) { var pageTab=document.getElementById("nav-tab-page"); var tocTab=document.getElementById("nav-tab-toc"); var pageList=document.getElementById("nav-list-page"); var tocList=document.getElementById("nav-list-toc"); if(t==="page"){ pageTab.classList.add("active"); tocTab.classList.remove("active"); pageList.style.display="block"; tocList.style.display="none"; } else { tocTab.classList.add("active"); pageTab.classList.remove("active"); tocList.style.display="block"; pageList.style.display="none"; } }'
+ 'function viewerSidebarInitResize() { var handle = document.getElementById("viewer-sidebar-resize-handle"); var sidebar = document.getElementById("viewer-sidebar"); if (!handle || !sidebar) return; var minW = 120, maxW = 400; var startX = 0, startW = 0; function onMove(e) { var w = startW + (e.clientX - startX); w = Math.max(minW, Math.min(maxW, w)); sidebar.style.width = w + "px"; } function onUp() { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); document.body.style.cursor = ""; document.body.style.userSelect = ""; } handle.onmousedown = function(e) { e.preventDefault(); startX = e.clientX; startW = sidebar.offsetWidth; document.addEventListener("mousemove", onMove); document.addEventListener("mouseup", onUp); document.body.style.cursor = "col-resize"; document.body.style.userSelect = "none"; }; }'
+ 'function parseMarkdownHeadings(text) { var out = []; var re = /^(#{1,4})\\s+(.+)$/gm; var m; while((m = re.exec(text)) !== null) { out.push({ level: m[1].length, text: m[2].trim() }); } return out; }'
+ 'function buildTocFromMarkdown(text) { var items = parseMarkdownHeadings(text || ""); if(items.length === 0) return "<span style=\'color:#94a3b8\'>목차 없음</span>"; var html = ""; for(var i = 0; i < items.length; i++) { var cls = items[i].level === 1 ? "" : " toc-h" + items[i].level; var txt = items[i].text.replace(/</g,"&lt;").substring(0,50); html += "<span class=\'toc-item" + cls + "\'>" + txt + (items[i].text.length > 50 ? "…" : "") + "</span>"; } return html; }'
+ 'function buildPageListFromText(text) { var items = []; var re = /---\\s*(\\d+)\\s*페이지\\s*---/g; var m; while((m = re.exec(text || "")) !== null) { items.push({ num: m[1], offset: m.index }); } items.sort(function(a,b){ return parseInt(a.num,10) - parseInt(b.num,10); }); if (items.length > 0 && items[0].num !== "1") { items.unshift({ num: "1", offset: 0 }); } else if (items.length === 0 && text && text.trim()) { items.push({ num: "1", offset: 0 }); } return items; }'
+ 'function scrollToPageInTextarea(offset) { var ta = document.getElementById("viewer-edit-ta"); if (!ta) return; ta.focus(); ta.setSelectionRange(offset, offset); var lines = (ta.value.substring(0, offset).match(/\\n/g) || []).length; var lineHeight = parseInt(getComputedStyle(ta).lineHeight, 10) || 20; ta.scrollTop = Math.max(0, lines * lineHeight - ta.clientHeight / 2); }'
+ 'function viewerBuildNav() { var listPage = document.getElementById("nav-list-page"); var listToc = document.getElementById("nav-list-toc"); var root = document.getElementById("page-content"); var ta = document.getElementById("viewer-edit-ta"); var isEdit = document.getElementById("content-viewport") && document.getElementById("content-viewport").classList.contains("viewer-edit-active"); if(isEdit && ta) { listToc.innerHTML = buildTocFromMarkdown(ta.value); var pageItems = buildPageListFromText(ta.value); if (pageItems.length > 0) { var pageHtml = ""; for (var i = 0; i < pageItems.length; i++) { var n = pageItems[i].num; var off = pageItems[i].offset; var label = /^Slide\\s+\\d+$/.test(n) ? n : (n + "페이지"); pageHtml += "<a href=\'#\' onclick=\'scrollToPageInTextarea(" + off + "); return false;\'>" + label + "</a>"; } listPage.innerHTML = pageHtml; } else { listPage.innerHTML = "<span style=\'color:#94a3b8\'>페이지 구분 없음</span>"; } return; } if(!root) return; var sections = root.querySelectorAll("[id^=\'page-\']"); var pageHtml = ""; for(var i=0;i<sections.length;i++){ var id = sections[i].id; var n = id.replace("page-",""); var label = /^Slide\\s+\\d+$/.test(n) ? n : (n+"페이지"); pageHtml += "<a href=\'#"+id+"\'>"+label+"</a>"; } listPage.innerHTML = pageHtml || "<span style=\'color:#94a3b8\'>페이지 구분 없음</span>"; var headings = root.querySelectorAll("h1, h2, h3, h4"); var tocHtml = ""; var tocId = 0; for(var j=0;j<headings.length;j++){ tocId++; var el = headings[j]; if(!el.id) el.id = "toc-"+tocId; var tag = el.tagName.toLowerCase(); var cls = tag==="h1"?"":tag==="h2"?" toc-h2":tag==="h3"?" toc-h3":" toc-h4"; var txt = el.textContent.replace(/</g,"&lt;").substring(0,50); tocHtml += "<a href=\'#"+el.id+"\' class=\'"+cls.trim()+"\'>"+txt+(el.textContent.length>50?"…":"")+"</a>"; } listToc.innerHTML = tocHtml || "<span style=\'color:#94a3b8\'>목차 없음</span>"; }'
+ 'function formatForMdpro(txt) { if(!txt || typeof txt !== "string") return ""; var s = txt.trim(); s = s.replace(/^(\\d+(?:\\.\\d+)*\\.\\s+[^\\n]+)$/gm, "### $1"); return "From ScholarSlide\\n\\n" + s; }'
+ 'var __mdproWin = null; var __mdproPendingText = null; var __mdproPassword = null; var __mdproPasswordTimer = null;'
+ 'function openMdproWithLogin() { var txt = document.getElementById("content-viewport").classList.contains("viewer-edit-active") && document.getElementById("viewer-edit-ta") ? document.getElementById("viewer-edit-ta").value : __rawText; if(!txt || !txt.trim()) { alert("전송할 내용이 없습니다."); return; } var pwd = prompt("mdlivepro 비밀번호를 입력하세요", ""); if(pwd === null) return; if(!pwd || !pwd.trim()) { alert("비밀번호를 입력해 주세요."); return; } __mdproWin = window.open("https://mdlivepro.vercel.app/", "_blank", "width=1000,height=700"); if(!__mdproWin) { alert("팝업이 차단되었습니다. mdlivepro.vercel.app 팝업을 허용해 주세요."); return; } __mdproPendingText = formatForMdpro(txt); __mdproPassword = pwd; if(__mdproPasswordTimer) clearInterval(__mdproPasswordTimer); __mdproPasswordTimer = setInterval(function(){ if(!__mdproWin || __mdproWin.closed) { clearInterval(__mdproPasswordTimer); __mdproPasswordTimer = null; return; } try { __mdproWin.postMessage({ type: "mdpro_password", password: __mdproPassword }, "*"); } catch(e) {} }, 600); setTimeout(function(){ if(__mdproPasswordTimer) { clearInterval(__mdproPasswordTimer); __mdproPasswordTimer = null; } }, 8000); }'
+ 'window.addEventListener("message", function(e){ if(!e.data || e.data.type !== "mdpro_ready" || !__mdproPendingText) return; try { if(e.source && !e.source.closed) { e.source.postMessage({ type: "mdpro_document", title: __mdproDocTitle || "ScholarSlide 문서", content: __mdproPendingText }, "*"); if(__mdproPasswordTimer) { clearInterval(__mdproPasswordTimer); __mdproPasswordTimer = null; } __mdproPendingText = null; __mdproPassword = null; alert("전송했습니다. mdlivepro에서 새 탭으로 열렸는지 확인하세요."); } } catch(err) {} });'
+ 'function toggleScholarAI() { var el = document.getElementById("scholar-ai-sidebar"); if (el) { el.classList.toggle("open"); if (el.classList.contains("open")) { document.addEventListener("selectionchange", scholarAISyncSelection); scholarAISyncSelection(); scholarAIInitResize(); } else { document.removeEventListener("selectionchange", scholarAISyncSelection); el.classList.remove("fullscreen"); } } }'
+ 'function scholarAIInitResize() { var handle = document.getElementById("scholar-ai-resize-handle"); var sidebar = document.getElementById("scholar-ai-sidebar"); if (!handle || !sidebar || !sidebar.classList.contains("open")) return; var minW = 280, maxW = Math.min(800, window.innerWidth - 200); var startX = 0, startW = 0; function onMove(e) { var w = startW + (startX - e.clientX); w = Math.max(minW, Math.min(maxW, w)); sidebar.style.width = w + "px"; sidebar.style.minWidth = w + "px"; } function onUp() { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); document.body.style.cursor = ""; document.body.style.userSelect = ""; } handle.onmousedown = function(e) { if (sidebar.classList.contains("fullscreen")) return; e.preventDefault(); startX = e.clientX; startW = sidebar.offsetWidth; document.addEventListener("mousemove", onMove); document.addEventListener("mouseup", onUp); document.body.style.cursor = "col-resize"; document.body.style.userSelect = "none"; }; }'
+ 'function scholarAIShrink() { var el = document.getElementById("scholar-ai-sidebar"); if (el) { el.classList.remove("open"); el.classList.remove("fullscreen"); document.removeEventListener("selectionchange", scholarAISyncSelection); } }'
+ 'function scholarAIFullscreen() { var el = document.getElementById("scholar-ai-sidebar"); if (el) { el.classList.toggle("fullscreen"); } }'
+ 'function scholarAISyncSelection() { var sel = window.getSelection && window.getSelection(); var ta = document.getElementById("scholar-ai-selected"); var target = document.getElementById("page-content"); var editTa = document.getElementById("viewer-edit-ta"); var isEdit = document.getElementById("content-viewport") && document.getElementById("content-viewport").classList.contains("viewer-edit-active"); if (!ta) return; if (isEdit && editTa && editTa === document.activeElement) { var start = editTa.selectionStart, end = editTa.selectionEnd; ta.value = editTa.value.slice(start, end); __scholarAISelStart = start; __scholarAISelEnd = end; return; } __scholarAISelStart = __scholarAISelEnd = null; if (sel && target && sel.anchorNode && target.contains(sel.anchorNode)) { ta.value = sel.toString().trim(); } }'
+ 'var __scholarAISelStart = null, __scholarAISelEnd = null; var __scholarAIResultFontSize = 13;'
+ 'var __scholarAIHistory = [];'
+ 'function scholarAIHistoryAdd(promptSnippet, resultText) { __scholarAIHistory.unshift({ id: Date.now(), prompt: promptSnippet || "", result: resultText || "", at: new Date().toISOString() }); }'
+ 'function scholarAIHistoryRender() { var list = document.getElementById("scholar-ai-history-list"); var q = (document.getElementById("scholar-ai-history-search") && document.getElementById("scholar-ai-history-search").value) || ""; q = q.trim().toLowerCase(); var items = __scholarAIHistory; if (q) items = items.filter(function(h){ return (h.prompt + " " + h.result).toLowerCase().indexOf(q) >= 0; }); var html = ""; for (var i = 0; i < items.length; i++) { var idx = __scholarAIHistory.indexOf(items[i]); var raw = items[i].prompt || items[i].result || "(빈 항목)"; var lbl = raw.replace(/</g,"&lt;").substring(0, 36) + (raw.length > 36 ? "…" : ""); html += \'<div class="scholar-ai-history-item" data-idx="\' + idx + \'"><span class="sa-h-label" onclick="scholarAIHistoryShowResult(\' + idx + \')" title="결과창에 표시">\' + lbl.replace(/\'/g, "\\\\\'") + \'</span><button type="button" class="sa-h-save" onclick="scholarAIHistorySaveMd(\' + idx + \')" title="MD 저장">저장</button><button type="button" class="sa-h-del" onclick="scholarAIHistoryDelete(\' + idx + \')" title="삭제">×</button></div>\'; } list.innerHTML = html || \'<span style="font-size:11px;color:#94a3b8">실행한 결과가 여기 쌓입니다.</span>\'; }'
+ 'function scholarAIHistoryShowResult(idx) { var h = __scholarAIHistory[idx]; if (!h) return; var el = document.getElementById("scholar-ai-result"); if (el) el.value = h.result; }'
+ 'function scholarAIHistoryDelete(idx) { __scholarAIHistory.splice(idx, 1); scholarAIHistoryRender(); }'
+ 'function scholarAIHistorySaveMd(idx) { var h = __scholarAIHistory[idx]; if (!h || !h.result) { alert("저장할 내용이 없습니다."); return; } var a = document.createElement("a"); a.href = "data:text/markdown;charset=utf-8," + encodeURIComponent(h.result); a.download = "ScholarAI_" + (h.at || "").slice(0,10) + "_" + idx + ".md"; a.click(); }'
+ 'function scholarAIHistorySaveAll() { if (__scholarAIHistory.length === 0) { alert("저장할 히스토리가 없습니다."); return; } var parts = []; for (var i = 0; i < __scholarAIHistory.length; i++) { var h = __scholarAIHistory[i]; parts.push("## " + (i + 1) + ". " + (h.at || "").slice(0, 19) + "\\n\\n" + (h.prompt ? "**질문/지시:** " + h.prompt + "\\n\\n" : "") + h.result); } var a = document.createElement("a"); a.href = "data:text/markdown;charset=utf-8," + encodeURIComponent(parts.join("\\n\\n---\\n\\n")); a.download = "ScholarAI_히스토리_전체_" + new Date().toISOString().slice(0,10) + ".md"; a.click(); alert("전체 " + __scholarAIHistory.length + "건이 하나의 MD 파일로 저장되었습니다."); }'
+ 'async function scholarAIRun() { var sel = document.getElementById("scholar-ai-selected"); var promptEl = document.getElementById("scholar-ai-prompt"); var resultEl = document.getElementById("scholar-ai-result"); var passage = (sel && sel.value) ? sel.value.trim() : ""; var userQ = (promptEl && promptEl.value) ? promptEl.value.trim() : ""; if (!passage) { alert("문서에서 텍스트를 선택한 뒤 실행하세요."); return; } if (!window.opener || typeof window.opener.callGemini !== "function") { alert("메인 창을 찾을 수 없거나 API를 사용할 수 없습니다."); return; } resultEl.value = "처리 중..."; try { var fullPrompt = passage + "\\n\\n사용자 질문 또는 지시: " + (userQ || "위 지문을 요약하거나 핵심을 설명해 주세요."); var sys = (window.opener.getScholarAISystemInstruction && window.opener.getScholarAISystemInstruction()) || "You are a scholarly assistant. Answer concisely in Korean based on the given passage. If the user asks a question, answer it; otherwise summarize or explain the passage."; var res = await window.opener.callGemini(fullPrompt, sys); var text = res && res.text ? res.text : (res || ""); resultEl.value = typeof text === "string" ? text : JSON.stringify(text); scholarAIHistoryAdd(userQ || passage.substring(0, 80), resultEl.value); scholarAIHistoryRender(); } catch (e) { resultEl.value = "오류: " + (e.message || e); } }'
+ 'function scholarAICopyResult() { var el = document.getElementById("scholar-ai-result"); if (el && el.value) { navigator.clipboard.writeText(el.value).then(function(){ alert("결과가 복사되었습니다."); }).catch(function(){ alert("복사 실패"); }); } else { alert("복사할 결과가 없습니다."); } }'
+ 'function scholarAIResultFont(delta) { var el = document.getElementById("scholar-ai-result"); if (!el) return; __scholarAIResultFontSize = Math.max(10, Math.min(24, __scholarAIResultFontSize + delta)); el.style.fontSize = __scholarAIResultFontSize + "px"; }'
+ 'function toggleScholarAIInsertMenu() { var m = document.getElementById("scholar-ai-insert-menu"); if (m) m.classList.toggle("open"); }'
+ 'function closeScholarAIInsertMenu() { var m = document.getElementById("scholar-ai-insert-menu"); if (m) m.classList.remove("open"); }'
+ 'document.addEventListener("click", function(e) { var m = document.getElementById("scholar-ai-insert-menu"); if (m && m.classList.contains("open") && !m.contains(e.target) && !e.target.onclick) { var wrap = document.querySelector(".scholar-ai-insert-wrap"); if (wrap && !wrap.contains(e.target)) m.classList.remove("open"); } });'
+ 'function scholarAIInsertDoc(mode) { var resultEl = document.getElementById("scholar-ai-result"); var resultText = resultEl && resultEl.value ? resultEl.value.trim() : ""; if (!resultText) { alert("삽입할 결과가 없습니다."); return; } var ta = document.getElementById("viewer-edit-ta"); var isEdit = document.getElementById("content-viewport") && document.getElementById("content-viewport").classList.contains("viewer-edit-active"); if (!isEdit || !ta) { var vp = document.getElementById("content-viewport"); var wrap = document.getElementById("viewer-edit-wrap"); if (vp) vp.classList.add("viewer-edit-active"); if (wrap) wrap.style.display = "flex"; ta = document.getElementById("viewer-edit-ta"); if (ta) { ta.value = __rawText; ta.style.display = "block"; } document.getElementById("viewer-btn-edit").style.display = "none"; document.getElementById("viewer-btn-view").style.display = "inline-block"; } ta = document.getElementById("viewer-edit-ta"); if (!ta) return; var start, end, raw = ta.value; if (__scholarAISelStart != null && __scholarAISelEnd != null) { start = __scholarAISelStart; end = __scholarAISelEnd; } else { var selTa = document.getElementById("scholar-ai-selected"); var selText = (selTa && selTa.value) ? selTa.value.trim() : ""; var idx = selText ? raw.indexOf(selText) : -1; if (idx >= 0) { start = idx; end = idx + selText.length; } else { start = 0; end = 0; } } var before = raw.slice(0, start); var after = raw.slice(end); var newVal = mode === 1 ? before + raw.slice(start, end) + "\\n\\n" + resultText + after : before + resultText + after; ta.value = newVal; __rawText = newVal; alert("문서에 반영되었습니다. 보기 모드에서 확인하세요."); }'
+ 'document.addEventListener("DOMContentLoaded", function(){ var saved = ""; try { saved = localStorage.getItem("ss_viewer_page_" + __contentType) || ""; } catch(e) {} if (saved) { __rawText = saved; var html = ""; try { if (window.opener && typeof window.opener.getViewerRenderedContent === "function") { html = window.opener.getViewerRenderedContent(__rawText); } } catch(e) {} if (!html && typeof marked !== "undefined") { html = marked.parse(__rawText || ""); } if (!html) { html = __rawText.replace(/\\x3C/g,"&lt;").replace(/>/g,"&gt;").replace(/\\n/g,"<br>"); } var pc = document.getElementById("page-content"); if (pc && html) pc.innerHTML = html; } if(__contentType === "refs"){ var sb=document.getElementById("viewer-btn-save"); var eb=document.getElementById("viewer-btn-edit"); if(sb)sb.style.display="none"; if(eb)eb.style.display="none"; } viewerBuildNav(); viewerSidebarInitResize(); var resTa = document.getElementById("scholar-ai-result"); if (resTa) resTa.style.fontSize = __scholarAIResultFontSize + "px"; var histSearch = document.getElementById("scholar-ai-history-search"); if (histSearch) histSearch.addEventListener("input", scholarAIHistoryRender); });'
+ '</script></body></html>';
  }

  function getTranslationViewerWindowHtml(opts) {
    var label = opts.label || '원문';
    return '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>번역 보기 — ' + (label === '요약' ? '요약' : '원문') + '</title><style>'
+ '* { box-sizing: border-box; margin: 0; padding: 0; }'
+ 'body { display: flex; flex-direction: column; height: 100vh; overflow: hidden; font-family: \'Noto Sans KR\', \'JetBrains Mono\', monospace; transition: background 0.2s, color 0.2s; }'
+ 'body.theme-dark { background: #0c0e13; color: #b0bac8; }'
+ 'body.theme-light { background: #f5f6f8; color: #1e293b; }'
+ '.toolbar { flex-shrink: 0; background: #13161d; border-bottom: 1px solid #1e2332; padding: 10px 16px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; z-index: 10; }'
+ 'body.theme-light .toolbar { background: #e2e8f0; border-bottom-color: #cbd5e1; }'
+ '.toolbar h2 { font-size: 14px; color: #4f8ef7; flex: 1; min-width: 120px; }'
+ '.toolbar .tbtn { background: #4f8ef7; color: #fff; border: none; border-radius: 6px; padding: 6px 12px; font-size: 12px; cursor: pointer; white-space: nowrap; }'
+ '.toolbar .tbtn.ghost { background: #1a1e28; border: 1px solid #2e3447; color: #b0bac8; }'
+ 'body.theme-light .toolbar .tbtn.ghost { background: #fff; border-color: #94a3b8; color: #475569; }'
+ '.toolbar .tbtn:hover { opacity: 0.9; }'
+ '.toolbar .view-mode-btn.active { border-color: #4f8ef7; color: #4f8ef7; background: rgba(79,142,247,0.15); }'
+ '.toolbar .tzoom-val { font-size: 11px; color: #94a3b8; min-width: 40px; text-align: center; font-family: monospace; }'
+ 'body.theme-light .toolbar .tzoom-val { color: #64748b; }'
+ '.trans-main-with-sidebar { display: flex; flex: 1; min-height: 0; }'
+ '.trans-viewer-sidebar { min-width: 120px; max-width: 400px; width: 200px; flex-shrink: 0; background: #13161d; border-right: 1px solid #1e2332; display: flex; flex-direction: column; overflow: hidden; position: relative; }'
+ 'body.theme-light .trans-viewer-sidebar { background: #e2e8f0; border-right-color: #cbd5e1; }'
+ '.trans-viewer-sidebar-tabs { display: flex; border-bottom: 1px solid #1e2332; }'
+ 'body.theme-light .trans-viewer-sidebar-tabs { border-color: #cbd5e1; }'
+ '.trans-viewer-sidebar-tab { flex: 1; padding: 8px 10px; font-size: 12px; cursor: pointer; text-align: center; background: #1a1e28; color: #94a3b8; border: none; }'
+ 'body.theme-light .trans-viewer-sidebar-tab { background: #cbd5e1; color: #475569; }'
+ '.trans-viewer-sidebar-tab.active { background: #252a37; color: #4f8ef7; font-weight: 600; }'
+ 'body.theme-light .trans-viewer-sidebar-tab.active { background: #fff; color: #4f8ef7; }'
+ '.trans-viewer-sidebar-tab:hover:not(.active) { background: #252a37; color: #b0bac8; }'
+ 'body.theme-light .trans-viewer-sidebar-tab:hover:not(.active) { background: #94a3b8; color: #fff; }'
+ '.trans-viewer-sidebar-resize-handle { position: absolute; right: 0; top: 0; bottom: 0; width: 8px; cursor: col-resize; z-index: 20; background: transparent; }'
+ '.trans-viewer-sidebar-resize-handle:hover { background: rgba(79,142,247,0.25); }'
+ '.trans-viewer-sidebar-resize-handle::after { content: ""; position: absolute; right: 3px; top: 50%; transform: translateY(-50%); width: 2px; height: 32px; border-radius: 1px; background: #4f8ef7; opacity: 0.5; }'
+ '.trans-viewer-sidebar-resize-handle:hover::after { opacity: 0.9; }'
+ 'body.theme-light .trans-viewer-sidebar-resize-handle::after { background: #4f8ef7; }'
+ '.trans-viewer-sidebar-list { flex: 1; overflow-y: auto; padding: 10px; font-size: 12px; line-height: 1.5; }'
+ '.trans-viewer-sidebar-list a { display: block; color: #94a3b8; text-decoration: none; padding: 4px 0; border-radius: 4px; padding-left: 4px; }'
+ 'body.theme-light .trans-viewer-sidebar-list a { color: #475569; }'
+ '.trans-viewer-sidebar-list a:hover { color: #4f8ef7; background: rgba(79,142,247,0.1); }'
+ '.trans-viewer-sidebar-list a.toc-h2 { padding-left: 12px; font-size: 11px; }'
+ '.trans-viewer-sidebar-list a.toc-h3 { padding-left: 20px; font-size: 11px; }'
+ '.trans-viewport { flex: 1; overflow: auto; padding: 20px; display: flex; justify-content: center; min-width: 0; }'
+ '.trans-viewport .trans-column { flex: 1; min-width: 0; overflow: auto; display: flex; justify-content: center; }'
+ 'body.theme-light .trans-viewport { background: #f1f5f9; }'
+ '.trans-viewport.split { justify-content: stretch; gap: 16px; padding: 16px; }'
+ '.trans-viewport.split .trans-column { flex: 1; min-width: 0; overflow: auto; display: flex; justify-content: center; }'
+ '.trans-page { width: 100%; padding: 24px; word-wrap: break-word; box-shadow: 0 4px 24px rgba(0,0,0,0.15); border-radius: 8px; font-size: 14px; line-height: 1.7; }'
+ 'body.theme-dark .trans-page { background: #13161d; border: 1px solid #1e2332; color: #d8e4f0; }'
+ 'body.theme-light .trans-page { background: #fff; border: 1px solid #e2e8f0; color: #334155; }'
+ '.trans-viewport:not(.split) .trans-page { max-width: calc(860px * var(--page-zoom, 1)); }'
+ '.trans-viewport.split .trans-page { max-width: calc(50vw * var(--page-zoom, 1)); }'
+ '.trans-page .page-content { white-space: normal; }'
+ '.trans-page .page-content h1,.trans-page .page-content h2,.trans-page .page-content h3 { font-family: sans-serif; color: #4f8ef7; margin-top: 1em; margin-bottom: 0.5em; scroll-margin-top: 16px; }'
+ '.trans-page .page-content .page-section { margin-bottom: 2em; }'
+ '@media print { .toolbar { display: none !important; } .trans-viewer-sidebar { display: none !important; } body { background: #fff; color: #111; } .trans-viewport { padding: 0; } .trans-page { box-shadow: none; border: none; } }'
+ '</style></head><body class="theme-light">'
+ '<div class="toolbar">'
+ '  <h2>🌐 번역 보기 — ' + (label === '요약' ? '요약' : '원문') + '</h2>'
+ '  <button class="tbtn ghost view-mode-btn" id="trans-mode-original" onclick="setTransViewMode(\'original\')" title="원문만">원문</button>'
+ '  <button class="tbtn ghost view-mode-btn" id="trans-mode-translated" onclick="setTransViewMode(\'translated\')" title="번역만">번역</button>'
+ '  <button class="tbtn ghost view-mode-btn active" id="trans-mode-split" onclick="setTransViewMode(\'split\')" title="원문 | 번역 양쪽">원문|번역</button>'
+ '  <button class="tbtn ghost" onclick="setPageZoom(-10)" title="페이지 축소 (Ctrl+7)">📐 −</button>'
+ '  <span class="tzoom-val" id="zoom-val">100%</span>'
+ '  <button class="tbtn ghost" onclick="setPageZoom(10)" title="페이지 확대 (Ctrl+8)">📐 +</button>'
+ '  <button class="tbtn ghost" onclick="setFontZoom(-1)" title="폰트 축소 (Ctrl+9)">🔤 −</button>'
+ '  <button class="tbtn ghost" onclick="setFontZoom(1)" title="폰트 확대 (Ctrl+0)">🔤 +</button>'
+ '  <button class="tbtn ghost" id="theme-btn" onclick="toggleTheme()" title="다크/라이트">🌓 Light/Dark</button>'
+ '  <button class="tbtn ghost" onclick="copyTransContent()">📋 복사</button>'
+ '  <button class="tbtn ghost" onclick="window.close()">닫기</button>'
+ '</div>'
+ '<div class="trans-main-with-sidebar">'
+ '<aside class="trans-viewer-sidebar" id="trans-viewer-sidebar">'
+ '  <div class="trans-viewer-sidebar-resize-handle" id="trans-viewer-sidebar-resize-handle" title="드래그하여 사이드바 너비 조절"></div>'
+ '  <div class="trans-viewer-sidebar-tabs">'
+ '    <button type="button" class="trans-viewer-sidebar-tab active" id="trans-nav-tab-page" onclick="transNavSwitch(\'page\')">페이지</button>'
+ '    <button type="button" class="trans-viewer-sidebar-tab" id="trans-nav-tab-toc" onclick="transNavSwitch(\'toc\')">목차</button>'
+ '  </div>'
+ '  <div class="trans-viewer-sidebar-list" id="trans-nav-list-page"></div>'
+ '  <div class="trans-viewer-sidebar-list" id="trans-nav-list-toc" style="display:none"></div>'
+ '</aside>'
+ '<div class="trans-viewport split" id="trans-viewport">'
+ '  <div class="trans-column" id="trans-col-original"><div class="trans-page" id="trans-page-original"></div></div>'
+ '  <div class="trans-column" id="trans-col-translated"><div class="trans-page" id="trans-page-translated"></div></div>'
+ '</div>'
+ '</div>'
+ '<script>'
+ 'var _transMode = "split", _pageZoom = 100, _fontBase = 14;'
+ 'var __original = "", __translated = "", __originalHtml = "", __translatedHtml = "";'
+ 'function loadData() { try { var fn = window.opener && window.opener.getTranslationViewerData; if (fn) { var d = fn(); __original = d && d.original != null ? String(d.original) : ""; __translated = d && d.translated != null ? String(d.translated) : ""; __originalHtml = d && d.originalHtml != null ? d.originalHtml : __original.replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\\n/g,"<br>"); __translatedHtml = d && d.translatedHtml != null ? d.translatedHtml : __translated.replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\\n/g,"<br>"); } } catch(e) {} applyTransContent(); transBuildNav(); }'
+ 'function applyTransContent() { var o = document.getElementById("trans-page-original"); var t = document.getElementById("trans-page-translated"); if (o) o.innerHTML = \'<div class="page-content" id="trans-nav-root-original">\' + (__originalHtml || "").replace(/id="page-/g, \'id="trans-orig-page-\').replace(/id="toc-/g, \'id="trans-orig-toc-\') + \'</div>\'; if (t) t.innerHTML = \'<div class="page-content" id="trans-nav-root-translated">\' + (__translatedHtml || "").replace(/id="page-/g, \'id="trans-trans-page-\').replace(/id="toc-/g, \'id="trans-trans-toc-\') + \'</div>\'; }'
+ 'function getTransNavRoot() { var which = _transMode === "original" ? "original" : "translated"; var el = document.getElementById("trans-nav-root-" + which); return el || document.getElementById("trans-nav-root-translated") || document.getElementById("trans-nav-root-original"); }'
+ 'function transBuildNav() { var root = getTransNavRoot(); var listPage = document.getElementById("trans-nav-list-page"); var listToc = document.getElementById("trans-nav-list-toc"); if (!listPage || !listToc) return; var prefix = root && root.id === "trans-nav-root-original" ? "trans-orig-" : "trans-trans-"; if (!root) { listPage.innerHTML = "<span style=\'color:#94a3b8\'>페이지 구분 없음</span>"; listToc.innerHTML = "<span style=\'color:#94a3b8\'>목차 없음</span>"; return; } var sections = root.querySelectorAll("[id^=\'" + prefix + "page-\']"); var pageHtml = ""; for (var i = 0; i < sections.length; i++) { var id = sections[i].id; var n = id.replace(prefix + "page-", ""); var label = /^Slide\\s+\\d+$/.test(n) ? n : (n + "페이지"); pageHtml += "<a href=\'#" + id + "\' onclick=\'scrollTransTo(\\"" + id.replace(/"/g, "\\\\\\"") + "\\"); return false;\'>" + label + "</a>"; } listPage.innerHTML = pageHtml || "<span style=\'color:#94a3b8\'>페이지 구분 없음</span>"; var headings = root.querySelectorAll("h1, h2, h3"); var tocHtml = ""; var tocId = 0; for (var j = 0; j < headings.length; j++) { tocId++; var el = headings[j]; if (!el.id || el.id.indexOf("toc-") === 0) el.id = prefix + "toc-" + tocId; var tag = el.tagName.toLowerCase(); var cls = tag === "h1" ? "" : tag === "h2" ? " toc-h2" : " toc-h3"; var txt = (el.textContent || "").replace(/\\x3C/g,"&lt;").substring(0, 40); tocHtml += "<a href=\'#" + el.id + "\' class=\'" + cls.trim() + "\' onclick=\'scrollTransTo(\\"" + (el.id || "").replace(/"/g, "\\\\\\"") + "\\"); return false;\'>" + txt + (el.textContent.length > 40 ? "…" : "") + "</a>"; } listToc.innerHTML = tocHtml || "<span style=\'color:#94a3b8\'>목차 없음</span>"; }'
+ 'function scrollTransTo(id) { var idStr = (id || "").replace(/"/g, ""); var target = document.getElementById(idStr); if (target) target.scrollIntoView({ behavior: "smooth", block: "start" }); if (_transMode === "split") { var otherId = idStr.indexOf("trans-orig-") === 0 ? idStr.replace("trans-orig-", "trans-trans-") : idStr.replace("trans-trans-", "trans-orig-"); var other = document.getElementById(otherId); if (other) other.scrollIntoView({ behavior: "smooth", block: "start" }); } }'
+ 'function transNavSwitch(t) { var pageTab = document.getElementById("trans-nav-tab-page"); var tocTab = document.getElementById("trans-nav-tab-toc"); var pageList = document.getElementById("trans-nav-list-page"); var tocList = document.getElementById("trans-nav-list-toc"); if (t === "page") { pageTab.classList.add("active"); tocTab.classList.remove("active"); pageList.style.display = "block"; tocList.style.display = "none"; } else { tocTab.classList.add("active"); pageTab.classList.remove("active"); tocList.style.display = "block"; pageList.style.display = "none"; } }'
+ 'function transViewerSidebarInitResize() { var handle = document.getElementById("trans-viewer-sidebar-resize-handle"); var sidebar = document.getElementById("trans-viewer-sidebar"); if (!handle || !sidebar) return; var minW = 120, maxW = 400; var startX = 0, startW = 0; function onMove(e) { var w = startW + (e.clientX - startX); w = Math.max(minW, Math.min(maxW, w)); sidebar.style.width = w + "px"; } function onUp() { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); document.body.style.cursor = ""; document.body.style.userSelect = ""; } handle.onmousedown = function(e) { e.preventDefault(); startX = e.clientX; startW = sidebar.offsetWidth; document.addEventListener("mousemove", onMove); document.addEventListener("mouseup", onUp); document.body.style.cursor = "col-resize"; document.body.style.userSelect = "none"; }; }'
+ 'function setTransViewMode(mode) { _transMode = mode; var vp = document.getElementById("trans-viewport"); var colOrig = document.getElementById("trans-col-original"); var colTrans = document.getElementById("trans-col-translated"); ["trans-mode-original","trans-mode-translated","trans-mode-split"].forEach(function(id){ var b = document.getElementById(id); if(b) b.classList.toggle("active", id === "trans-mode-" + (mode === "original" ? "original" : mode === "translated" ? "translated" : "split")); }); if (vp && colOrig && colTrans) { vp.classList.toggle("split", mode === "split"); colOrig.style.display = mode === "translated" ? "none" : "flex"; colTrans.style.display = mode === "original" ? "none" : "flex"; } if(vp) vp.style.setProperty("--page-zoom", _pageZoom/100); transBuildNav(); }'
+ 'function setPageZoom(delta) { _pageZoom = Math.max(50, Math.min(200, _pageZoom + delta)); var vp = document.getElementById("trans-viewport"); if(vp) vp.style.setProperty("--page-zoom", _pageZoom/100); var zv = document.getElementById("zoom-val"); if(zv) zv.textContent = _pageZoom + "%"; }'
+ 'function setFontZoom(delta) { var pages = document.querySelectorAll(".trans-page"); var fs = _fontBase; if (pages.length) fs = parseFloat(getComputedStyle(pages[0]).fontSize) || _fontBase; fs = Math.max(10, Math.min(28, fs + delta*2)); pages.forEach(function(p){ p.style.fontSize = fs + "px"; }); }'
+ 'document.addEventListener("keydown", function(e){ if(!e.ctrlKey) return; if(e.key==="7"){ e.preventDefault(); setPageZoom(-10); } else if(e.key==="8"){ e.preventDefault(); setPageZoom(10); } else if(e.key==="9"){ e.preventDefault(); setFontZoom(-1); } else if(e.key==="0"){ e.preventDefault(); setFontZoom(1); } });'
+ 'function toggleTheme() { var b = document.body; b.classList.toggle("theme-dark"); b.classList.toggle("theme-light"); var btn = document.getElementById("theme-btn"); if(btn) btn.textContent = b.classList.contains("theme-dark") ? "🌓 Dark/Light" : "🌓 Light/Dark"; }'
+ 'function copyTransContent() { var text = _transMode === "original" ? __original : _transMode === "translated" ? __translated : __original + "\\n\\n--- 번역 ---\\n\\n" + __translated; navigator.clipboard.writeText(text).then(function(){ alert("복사됨"); }); }'
+ 'if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function(){ loadData(); transViewerSidebarInitResize(); }); else { loadData(); transViewerSidebarInitResize(); }'
+ 'setTransViewMode("split");'
+ '</scr' + 'ipt></body></html>';
  }

  function openTranslationViewer(originalText, translatedText, label) {
    var originalHtml = buildViewerContentWithPages(originalText || '');
    var translatedHtml = buildViewerContentWithPages(translatedText || '');
    window.getTranslationViewerData = function () {
      return { original: originalText || '', translated: translatedText || '', originalHtml: originalHtml, translatedHtml: translatedHtml };
    };
    var win = window.open('', '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
    if (!win) { if (typeof showToast === 'function') showToast('⚠️ 팝업이 차단되었습니다. 팝업 허용 후 다시 시도하세요.'); return; }
    if (typeof window.registerChildWindow === 'function') window.registerChildWindow(win);
    win.document.write(getTranslationViewerWindowHtml({ label: label || '원문' }));
    win.document.close();
  }

  async function openKoreanViewWindow(target) {
    var label = target === 'summary' ? '요약' : '원문';
    var source = target === 'summary' ? (typeof window.getSummaryText === 'function' ? window.getSummaryText() : '') : (typeof window.getRawText === 'function' ? window.getRawText() : '');
    if (!source) { if (typeof showToast === 'function') showToast('⚠️ ' + (target === 'summary' ? '요약' : '원문') + ' 내용이 없습니다.'); return; }
    var koreanText = '';
    if (typeof window.ensureTranslated === 'function') koreanText = await window.ensureTranslated(target);
    else koreanText = target === 'summary' ? (window._translatedSummary || '') : (window._translatedRaw || '');
    if (!koreanText) { if (typeof showToast === 'function') showToast('⚠️ 번역된 내용이 없습니다. 한국어 번역을 먼저 실행하세요.'); return; }
    var win = window.open('', '_blank', 'width=900,height=750,scrollbars=yes,resizable=yes');
    if (!win) { if (typeof showToast === 'function') showToast('⚠️ 팝업이 차단되었습니다. 팝업 허용 후 다시 시도하세요.'); return; }
    if (typeof window.registerChildWindow === 'function') window.registerChildWindow(win);
    var contentRendered = buildViewerContentWithPages(koreanText);
    var escapedHtml = contentRendered.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$').replace(/<\/script>/gi, '<\\/script>');
    var rawJson = JSON.stringify(koreanText);
    var title = (typeof window.getFileName === 'function' ? window.getFileName() : '') || '문서';
    var escapeHtml = typeof window.escapeHtml === 'function' ? window.escapeHtml : function (s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
    var safeTitle = escapeHtml(title);
    win.document.write(getTextViewerWindowHtml({ title: safeTitle, subtitle: '🇰🇷 한국어 보기 (' + label + ')', pageTitle: '한국어 보기 — ' + safeTitle, contentHtml: escapedHtml, rawTextJson: rawJson, contentType: target }));
    win.document.close();
  }

  function openFullTextWindow() {
    var win = window.open('', '_blank', 'width=900,height=750,scrollbars=yes,resizable=yes');
    if (!win) { if (typeof showToast === 'function') showToast('⚠️ 팝업이 차단되었습니다. 팝업 허용 후 다시 시도하세요.'); return; }
    if (typeof window.registerChildWindow === 'function') window.registerChildWindow(win);
    if (typeof window.getViewerRenderedContent !== 'function') window.getViewerRenderedContent = function (text) { return buildViewerContentWithPages(text); };
    if (typeof window.setViewerContent !== 'function') {
      window.setViewerContent = function (text, type) {
        if (type === 'raw' && typeof window.setRawText === 'function') window.setRawText(text);
        else if (type === 'summary' && typeof window.setSummaryText === 'function') {
          window.setSummaryText(text);
          if (typeof window.addSummaryToHistory === 'function' && typeof window.getFileName === 'function') {
            window.addSummaryToHistory({
              fileName: window.getFileName(),
              summaryText: text,
              styleId: 'edited',
              granularity: 'detail'
            });
          }
          try { localStorage.setItem('ss_viewer_page_summary', text); } catch (e) {}
        } else if (type === 'refs') return;
        if (typeof window.renderLeftPanel === 'function') window.renderLeftPanel();
        if (typeof showToast === 'function') showToast('✅ 저장되었습니다');
      };
    }
    var rawText = typeof window.getRawText === 'function' ? window.getRawText() : '';
    var fileName = typeof window.getFileName === 'function' ? window.getFileName() : '';
    var escapeHtml = typeof window.escapeHtml === 'function' ? window.escapeHtml : function (s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
    var contentRendered = buildViewerContentWithPages(rawText);
    var escapedHtml = contentRendered.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$').replace(/<\/script>/gi, '<\\/script>');
    var rawJson = JSON.stringify(rawText);
    var title = escapeHtml(fileName);
    var sizeLabel = (rawText.length / 1000).toFixed(1) + 'k자';
    win.document.write(getTextViewerWindowHtml({ title: title, subtitle: '📄 원문 전체 (' + sizeLabel + ')', pageTitle: '원문 전체 — ' + title, contentHtml: escapedHtml, rawTextJson: rawJson, contentType: 'raw' }));
    win.document.close();
  }

  function openSummaryWindow() {
    var summaryText = typeof window.getSummaryText === 'function' ? window.getSummaryText() : '';
    if (!summaryText) { if (typeof showToast === 'function') showToast('⚠️ 요약 내용이 없습니다'); return; }
    if (typeof window.getViewerRenderedContent !== 'function') window.getViewerRenderedContent = function (text) { return buildViewerContentWithPages(text); };
    if (typeof window.setViewerContent !== 'function') {
      window.setViewerContent = function (text, type) {
        if (type === 'raw' && typeof window.setRawText === 'function') window.setRawText(text);
        else if (type === 'summary' && typeof window.setSummaryText === 'function') {
          window.setSummaryText(text);
          if (typeof window.addSummaryToHistory === 'function' && typeof window.getFileName === 'function') {
            window.addSummaryToHistory({
              fileName: window.getFileName(),
              summaryText: text,
              styleId: 'edited',
              granularity: 'detail'
            });
          }
          try { localStorage.setItem('ss_viewer_page_summary', text); } catch (e) {}
        } else if (type === 'refs') return;
        if (typeof window.renderLeftPanel === 'function') window.renderLeftPanel();
        if (typeof showToast === 'function') showToast('✅ 저장되었습니다');
      };
    }
    var win = window.open('', '_blank', 'width=900,height=750,scrollbars=yes,resizable=yes');
    if (!win) { if (typeof showToast === 'function') showToast('⚠️ 팝업이 차단되었습니다. 팝업 허용 후 다시 시도하세요.'); return; }
    if (typeof window.registerChildWindow === 'function') window.registerChildWindow(win);
    var fileName = typeof window.getFileName === 'function' ? window.getFileName() : '';
    var escapeHtml = typeof window.escapeHtml === 'function' ? window.escapeHtml : function (s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
    var title = escapeHtml(fileName);
    var contentRendered = buildViewerContentWithPages(summaryText);
    var escapedHtml = contentRendered.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$').replace(/<\/script>/gi, '<\\/script>');
    var rawJson = JSON.stringify(summaryText);
    win.document.write(getTextViewerWindowHtml({ title: title, subtitle: '📋 요약 전체', pageTitle: '요약 전체 — ' + title, contentHtml: escapedHtml, rawTextJson: rawJson, contentType: 'summary' }));
    win.document.close();
  }

  window.setSlideStyle = setSlideStyle;
  window.updateHeaderSlideMode = updateHeaderSlideMode;
  window.setWritingStyle = setWritingStyle;
  window.promoteSectionHeadings = promoteSectionHeadings;
  window.buildViewerContentWithPages = buildViewerContentWithPages;
  window.getTextViewerWindowHtml = getTextViewerWindowHtml;
  window.getTranslationViewerWindowHtml = getTranslationViewerWindowHtml;
  window.openTranslationViewer = openTranslationViewer;
  window.openKoreanViewWindow = openKoreanViewWindow;
  window.openFullTextWindow = openFullTextWindow;
  window.openSummaryWindow = openSummaryWindow;
})();

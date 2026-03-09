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
+ '.viewer-sidebar { width: 200px; flex-shrink: 0; background: #13161d; border-right: 1px solid #1e2332; display: flex; flex-direction: column; overflow: hidden; }'
+ 'body.theme-light .viewer-sidebar { background: #e2e8f0; border-right-color: #cbd5e1; }'
+ '.viewer-sidebar-tabs { display: flex; border-bottom: 1px solid #1e2332; }'
+ 'body.theme-light .viewer-sidebar-tabs { border-color: #cbd5e1; }'
+ '.viewer-sidebar-tab { flex: 1; padding: 8px 10px; font-size: 12px; cursor: pointer; text-align: center; background: #1a1e28; color: #94a3b8; border: none; }'
+ 'body.theme-light .viewer-sidebar-tab { background: #cbd5e1; color: #475569; }'
+ '.viewer-sidebar-tab.active { background: #252a37; color: #4f8ef7; font-weight: 600; }'
+ 'body.theme-light .viewer-sidebar-tab.active { background: #fff; color: #4f8ef7; }'
+ '.viewer-sidebar-tab:hover:not(.active) { background: #252a37; color: #b0bac8; }'
+ 'body.theme-light .viewer-sidebar-tab:hover:not(.active) { background: #94a3b8; color: #fff; }'
+ '.viewer-sidebar-list { flex: 1; overflow-y: auto; padding: 10px; font-size: 12px; line-height: 1.5; }'
+ '.viewer-sidebar-list a { display: block; color: #94a3b8; text-decoration: none; padding: 4px 0; border-radius: 4px; padding-left: 4px; }'
+ 'body.theme-light .viewer-sidebar-list a { color: #475569; }'
+ '.viewer-sidebar-list a:hover { color: #4f8ef7; background: rgba(79,142,247,0.1); }'
+ '.viewer-sidebar-list a.toc-h2 { padding-left: 12px; font-size: 11px; }'
+ '.viewer-sidebar-list a.toc-h3 { padding-left: 20px; font-size: 11px; }'
+ '.content-viewport { flex: 1; overflow: auto; padding: 20px; display: flex; justify-content: center; min-width: 0; }'
+ 'body.theme-light .content-viewport { background: #f1f5f9; }'
+ '.page { transform: scale(var(--zoom, 1)); transform-origin: top center; max-width: 860px; width: 100%; min-height: min-content; padding: 24px; word-wrap: break-word; box-shadow: 0 4px 24px rgba(0,0,0,0.15); border-radius: 8px; }'
+ 'body.theme-dark .page { background: #13161d; border: 1px solid #1e2332; }'
+ 'body.theme-light .page { background: #fff; border: 1px solid #e2e8f0; }'
+ '.page-content { font-size: 14px; line-height: 1.7; }'
+ '.page-content .page-section { margin-bottom: 2em; }'
+ '.page-content .page-section:last-child { margin-bottom: 0; }'
+ 'body.theme-dark .page-content { color: #b0bac8; }'
+ 'body.theme-light .page-content { color: #334155; }'
+ '.page-content h1,.page-content h2,.page-content h3 { font-family: sans-serif; color: #4f8ef7; margin-top: 1em; margin-bottom: 0.5em; scroll-margin-top: 16px; }'
+ '.page-content h1 { font-size: 1.4em; }'
+ '.page-content h2 { font-size: 1.2em; border-bottom: 1px solid #252a37; padding-bottom: 6px; }'
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
+ '</style></head><body class="theme-light">'
+ '<div class="toolbar">'
+ '  <h2>' + title + ' — ' + subtitle + '</h2>'
+ '  <button class="tbtn ghost" onclick="setPageZoom(-10)" title="페이지 축소">📐 −</button>'
+ '  <span class="tzoom-val" id="zoom-val">100%</span>'
+ '  <button class="tbtn ghost" onclick="setPageZoom(10)" title="페이지 확대">📐 +</button>'
+ '  <button class="tbtn ghost" onclick="setFontZoom(-1)" title="폰트 축소">🔤 축소</button>'
+ '  <button class="tbtn ghost" onclick="setFontZoom(1)" title="폰트 확대">🔤 확대</button>'
+ '  <button class="tbtn ghost" id="theme-btn" onclick="toggleTheme()" title="다크/라이트 전환">🌓 Light/Dark</button>'
+ '  <button class="tbtn" onclick="saveAs(\'md\')">MD 저장</button>'
+ '  <button class="tbtn" onclick="saveAs(\'txt\')">TXT 저장</button>'
+ '  <button class="tbtn" onclick="window.print()" title="PDF로 저장">PDF 저장</button>'
+ '  <button class="tbtn ghost" onclick="navigator.clipboard.writeText(__rawText).then(function(){alert(\'복사됨\');})">📋 복사</button>'
+ (contentType === 'refs' ? '  <button class="tbtn ghost" onclick="if(window.opener && typeof window.opener.reExtractReferencesFromDocument === \'function\'){ window.opener.reExtractReferencesFromDocument(); if(typeof window.opener.openRefExpWindow === \'function\') window.opener.openRefExpWindow(); window.close(); } else { alert(\'메인 창을 찾을 수 없습니다.\'); }" title="원문 References 섹션을 APA 형식으로 다시 추출">🔄 원문 재추출</button>  <button class="tbtn ghost" onclick="if(window.opener && typeof window.opener.extractReferencesWithAI === \'function\'){ window.opener.extractReferencesWithAI(function(){ if(window.opener && typeof window.opener.openRefExpWindow === \'function\'){ window.opener.openRefExpWindow(); window.close(); } }); } else { alert(\'메인 창을 찾을 수 없습니다.\'); }" title="AI로 원문에서 APA 양식 참고문헌 추출">🤖 AI 추출</button>' : '')
+ '  <button class="tbtn ghost" id="viewer-btn-edit" onclick="viewerSwitchToEdit()">✏️ 편집</button>'
+ '  <button class="tbtn ghost" id="viewer-btn-view" onclick="viewerSwitchToView()" style="display:none">👁 보기</button>'
+ '  <button class="tbtn" id="viewer-btn-save" onclick="viewerSaveToOpener()" title="메인 화면에 현재 내용 저장">💾 현재상태저장</button>'
+ '  <button class="tbtn ghost" onclick="window.close()">닫기</button>'
+ '</div>'
+ '<div class="main-with-sidebar">'
+ '<aside class="viewer-sidebar">'
+ '  <div class="viewer-sidebar-tabs">'
+ '    <button type="button" class="viewer-sidebar-tab active" id="nav-tab-page" onclick="viewerNavSwitch(\'page\')">페이지</button>'
+ '    <button type="button" class="viewer-sidebar-tab" id="nav-tab-toc" onclick="viewerNavSwitch(\'toc\')">목차</button>'
+ '  </div>'
+ '  <div class="viewer-sidebar-list" id="nav-list-page"></div>'
+ '  <div class="viewer-sidebar-list" id="nav-list-toc" style="display:none"></div>'
+ '</aside>'
+ '<div class="content-viewport" id="content-viewport"><div class="page" id="page">'
+ '<div class="page-content" id="page-content">' + contentHtml + '</div>'
+ '</div>'
+ '<div class="viewer-edit-wrap" id="viewer-edit-wrap"><textarea id="viewer-edit-ta" placeholder="텍스트를 편집하세요. Enter로 줄바꿈 가능."></textarea></div>'
+ '</div>'
+ '</div>'
+ '<script>'
+ 'var __rawText = ' + rawTextJson + ';'
+ 'var __contentType = ' + JSON.stringify(contentType) + ';'
+ 'var _pageZoom = 100; var _fontBase = 14;'
+ 'function setPageZoom(delta) { _pageZoom = Math.max(30, Math.min(200, _pageZoom + delta)); document.getElementById("page").style.setProperty("--zoom", _pageZoom/100); var zv = document.getElementById("zoom-val"); if(zv) zv.textContent = _pageZoom + "%"; }'
+ 'function setFontZoom(delta) { var el = document.getElementById("page-content"); if(!el) return; var fs = parseFloat(getComputedStyle(el).fontSize) || _fontBase; fs = Math.max(10, Math.min(28, fs + delta*2)); el.style.fontSize = fs + "px"; }'
+ 'function toggleTheme() { var b = document.body; b.classList.toggle("theme-dark"); b.classList.toggle("theme-light"); document.getElementById("theme-btn").textContent = b.classList.contains("theme-dark") ? "🌓 Dark/Light" : "🌓 Light/Dark"; }'
+ 'function saveAs(ext) { var a = document.createElement("a"); a.href = "data:text/" + (ext==="md"?"markdown":"plain") + ";charset=utf-8," + encodeURIComponent(__rawText); a.download = document.querySelector(".toolbar h2").textContent.replace(/[^a-zA-Z0-9가-힣._-]/g,"_").slice(0,50) + "." + ext; a.click(); }'
+ 'function viewerSwitchToEdit() { var ta = document.getElementById("viewer-edit-ta"); ta.value = __rawText; document.getElementById("content-viewport").classList.add("viewer-edit-active"); document.getElementById("viewer-btn-edit").style.display = "none"; document.getElementById("viewer-btn-view").style.display = "inline-block"; }'
+ 'function viewerSwitchToView() { var ta = document.getElementById("viewer-edit-ta"); __rawText = ta.value; var html = ""; if (window.opener && typeof window.opener.getViewerRenderedContent === "function") { html = window.opener.getViewerRenderedContent(__rawText); } else { html = __rawText.replace(/\\x3C/g,"&lt;").replace(/>/g,"&gt;").replace(/\\n/g,"<br>"); } document.getElementById("page-content").innerHTML = html; if (typeof viewerBuildNav === "function") viewerBuildNav(); document.getElementById("content-viewport").classList.remove("viewer-edit-active"); document.getElementById("viewer-btn-view").style.display = "none"; document.getElementById("viewer-btn-edit").style.display = "inline-block"; }'
+ 'function viewerSaveToOpener() { var ta = document.getElementById("viewer-edit-ta"); var isEdit = document.getElementById("content-viewport").classList.contains("viewer-edit-active"); var text = isEdit && ta ? ta.value : __rawText; if (isEdit && ta) __rawText = ta.value; if (window.opener && typeof window.opener.setViewerContent === "function") { window.opener.setViewerContent(text, __contentType); alert("저장되었습니다."); } else { alert("메인 창을 찾을 수 없습니다."); } }'
+ 'function viewerNavSwitch(t) { var pageTab=document.getElementById("nav-tab-page"); var tocTab=document.getElementById("nav-tab-toc"); var pageList=document.getElementById("nav-list-page"); var tocList=document.getElementById("nav-list-toc"); if(t==="page"){ pageTab.classList.add("active"); tocTab.classList.remove("active"); pageList.style.display="block"; tocList.style.display="none"; } else { tocTab.classList.add("active"); pageTab.classList.remove("active"); tocList.style.display="block"; pageList.style.display="none"; } }'
+ 'function viewerBuildNav() { var root = document.getElementById("page-content"); if(!root) return; var listPage = document.getElementById("nav-list-page"); var listToc = document.getElementById("nav-list-toc"); var sections = root.querySelectorAll("[id^=\'page-\']"); var pageHtml = ""; for(var i=0;i<sections.length;i++){ var id = sections[i].id; var n = id.replace("page-",""); var label = /^Slide\\s+\\d+$/.test(n) ? n : (n+"페이지"); pageHtml += "<a href=\'#"+id+"\'>"+label+"</a>"; } listPage.innerHTML = pageHtml || "<span style=\'color:#94a3b8\'>페이지 구분 없음</span>"; var headings = root.querySelectorAll("h1, h2, h3"); var tocHtml = ""; var tocId = 0; for(var j=0;j<headings.length;j++){ tocId++; var el = headings[j]; if(!el.id) el.id = "toc-"+tocId; var tag = el.tagName.toLowerCase(); var cls = tag==="h1"?"":tag==="h2"?" toc-h2":" toc-h3"; var txt = el.textContent.replace(/\\x3C/g,"&lt;").substring(0,40); tocHtml += "<a href=\'#"+el.id+"\' class=\'"+cls.trim()+"\'>"+txt+(el.textContent.length>40?"…":"")+"</a>"; } listToc.innerHTML = tocHtml || "<span style=\'color:#94a3b8\'>목차 없음</span>"; }'
+ 'document.addEventListener("DOMContentLoaded", function(){ if(__contentType === "refs"){ var sb=document.getElementById("viewer-btn-save"); var eb=document.getElementById("viewer-btn-edit"); if(sb)sb.style.display="none"; if(eb)eb.style.display="none"; } viewerBuildNav(); });'
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
+ '.trans-viewer-sidebar { width: 200px; flex-shrink: 0; background: #13161d; border-right: 1px solid #1e2332; display: flex; flex-direction: column; overflow: hidden; }'
+ 'body.theme-light .trans-viewer-sidebar { background: #e2e8f0; border-right-color: #cbd5e1; }'
+ '.trans-viewer-sidebar-tabs { display: flex; border-bottom: 1px solid #1e2332; }'
+ 'body.theme-light .trans-viewer-sidebar-tabs { border-color: #cbd5e1; }'
+ '.trans-viewer-sidebar-tab { flex: 1; padding: 8px 10px; font-size: 12px; cursor: pointer; text-align: center; background: #1a1e28; color: #94a3b8; border: none; }'
+ 'body.theme-light .trans-viewer-sidebar-tab { background: #cbd5e1; color: #475569; }'
+ '.trans-viewer-sidebar-tab.active { background: #252a37; color: #4f8ef7; font-weight: 600; }'
+ 'body.theme-light .trans-viewer-sidebar-tab.active { background: #fff; color: #4f8ef7; }'
+ '.trans-viewer-sidebar-tab:hover:not(.active) { background: #252a37; color: #b0bac8; }'
+ 'body.theme-light .trans-viewer-sidebar-tab:hover:not(.active) { background: #94a3b8; color: #fff; }'
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
+ '.trans-page { transform: scale(var(--zoom, 1)); transform-origin: top center; max-width: 100%; width: 100%; padding: 24px; word-wrap: break-word; box-shadow: 0 4px 24px rgba(0,0,0,0.15); border-radius: 8px; font-size: 14px; line-height: 1.7; }'
+ 'body.theme-dark .trans-page { background: #13161d; border: 1px solid #1e2332; color: #d8e4f0; }'
+ 'body.theme-light .trans-page { background: #fff; border: 1px solid #e2e8f0; color: #334155; }'
+ '.trans-viewport:not(.split) .trans-page { max-width: 860px; }'
+ '.trans-viewport.split .trans-page { max-width: 100%; }'
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
+ '  <button class="tbtn ghost" onclick="setPageZoom(-10)" title="페이지 축소">📐 −</button>'
+ '  <span class="tzoom-val" id="zoom-val">100%</span>'
+ '  <button class="tbtn ghost" onclick="setPageZoom(10)" title="페이지 확대">📐 +</button>'
+ '  <button class="tbtn ghost" onclick="setFontZoom(-1)" title="폰트 축소">🔤 −</button>'
+ '  <button class="tbtn ghost" onclick="setFontZoom(1)" title="폰트 확대">🔤 +</button>'
+ '  <button class="tbtn ghost" id="theme-btn" onclick="toggleTheme()" title="다크/라이트">🌓 Light/Dark</button>'
+ '  <button class="tbtn ghost" onclick="copyTransContent()">📋 복사</button>'
+ '  <button class="tbtn ghost" onclick="window.close()">닫기</button>'
+ '</div>'
+ '<div class="trans-main-with-sidebar">'
+ '<aside class="trans-viewer-sidebar">'
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
+ 'function setTransViewMode(mode) { _transMode = mode; var vp = document.getElementById("trans-viewport"); var colOrig = document.getElementById("trans-col-original"); var colTrans = document.getElementById("trans-col-translated"); ["trans-mode-original","trans-mode-translated","trans-mode-split"].forEach(function(id){ var b = document.getElementById(id); if(b) b.classList.toggle("active", id === "trans-mode-" + (mode === "original" ? "original" : mode === "translated" ? "translated" : "split")); }); if (vp && colOrig && colTrans) { vp.classList.toggle("split", mode === "split"); colOrig.style.display = mode === "translated" ? "none" : "flex"; colTrans.style.display = mode === "original" ? "none" : "flex"; } document.querySelectorAll(".trans-page").forEach(function(p) { p.style.setProperty("--zoom", _pageZoom/100); }); transBuildNav(); }'
+ 'function setPageZoom(delta) { _pageZoom = Math.max(30, Math.min(200, _pageZoom + delta)); document.querySelectorAll(".trans-page").forEach(function(p){ p.style.setProperty("--zoom", _pageZoom/100); }); var zv = document.getElementById("zoom-val"); if(zv) zv.textContent = _pageZoom + "%"; }'
+ 'function setFontZoom(delta) { var pages = document.querySelectorAll(".trans-page"); var fs = _fontBase; if (pages.length) fs = parseFloat(getComputedStyle(pages[0]).fontSize) || _fontBase; fs = Math.max(10, Math.min(28, fs + delta*2)); pages.forEach(function(p){ p.style.fontSize = fs + "px"; }); }'
+ 'function toggleTheme() { var b = document.body; b.classList.toggle("theme-dark"); b.classList.toggle("theme-light"); var btn = document.getElementById("theme-btn"); if(btn) btn.textContent = b.classList.contains("theme-dark") ? "🌓 Dark/Light" : "🌓 Light/Dark"; }'
+ 'function copyTransContent() { var text = _transMode === "original" ? __original : _transMode === "translated" ? __translated : __original + "\\n\\n--- 번역 ---\\n\\n" + __translated; navigator.clipboard.writeText(text).then(function(){ alert("복사됨"); }); }'
+ 'if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", loadData); else loadData();'
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
        else if (type === 'summary' && typeof window.setSummaryText === 'function') window.setSummaryText(text);
        else if (type === 'refs') return;
        if (typeof window.renderLeftPanel === 'function') window.renderLeftPanel();
        if (typeof showToast === 'function') showToast('✅ 현재 상태 저장됨');
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

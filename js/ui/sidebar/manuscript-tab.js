/**
 * ScholarSlide — 원고 탭 전용 UI (좌측 사이드바)
 * 원고 탭 선택 시에만 사용되는 레이아웃: 발표원고생성/슬라이드 생성, 커스텀 프롬프트, 발표원고 생성/파일선택, 텍스트입력창, 발표원고|슬라이드생성 뷰, 생성내용/생성히스토리/새창보기
 * 전역 의존: askThenGenerateScript, askThenSummary, handleFileUpload, saveContent, renderLeftPanel, openSummaryWindow, getPresentationScript, getSlides, getFileName, escapeHtml, showToast
 */
(function () {
  'use strict';

  window._manuscriptView = window._manuscriptView || 'script'; // 'script' | 'slides'
  window._manuscriptSubView = window._manuscriptSubView || 'content'; // 'content' | 'history'
  window._selectedManuscriptHistoryId = window._selectedManuscriptHistoryId || null;

  /** 슬라이드 비율 값 → CSS aspect-ratio */
  var SLIDE_RATIO_MAP = {
    '16:9': '16/9',
    '4:3': '4/3',
    'a4_landscape': '297/210',
    '3:4': '3/4',
    '9:16': '9/16',
    'a4_portrait': '210/297',
    '1:1': '1'
  };

  window.applySlideAspectRatio = function () {
    var raw = (typeof localStorage !== 'undefined' && localStorage.getItem('ss_slide_aspect_ratio')) || '16:9';
    var ratio = SLIDE_RATIO_MAP[raw] || '16/9';
    var root = document.documentElement || document.body;
    if (root && root.style) root.style.setProperty('--slide-aspect-ratio', ratio);
  };

  /**
   * 슬라이드 배열 → 마크다운 원고 문자열
   */
  window.slidesToMarkdown = function (slides) {
    if (!slides || !slides.length) return '';
    return slides.map(function (s) {
      var title = s.title ? '# ' + s.title + '\n\n' : '';
      var bullets = (s.bullets || []).map(function (b) { return '- ' + b; }).join('\n') + (s.bullets && s.bullets.length ? '\n' : '');
      var notes = s.notes ? '> ' + s.notes : '';
      return title + bullets + notes;
    }).join('\n\n---\n\n');
  };

  function setManuscriptView(view) {
    window._manuscriptView = view;
    if (typeof renderLeftPanel === 'function') renderLeftPanel();
  }

  function setManuscriptSubView(sub) {
    window._manuscriptSubView = sub;
    if (typeof renderLeftPanel === 'function') renderLeftPanel();
  }

  /**
   * 히스토리 항목 선택 (생성히스토리 뷰에서만 선택, 하단 버튼 활성화용)
   */
  window.selectManuscriptHistoryItem = function (id) {
    if (!id) return;
    window._selectedManuscriptHistoryId = id;
    if (typeof renderLeftPanel === 'function') renderLeftPanel();
  };

  /**
   * 히스토리 항목을 생성내용에 표시
   */
  window.loadManuscriptFromHistory = function (id) {
    if (!id) return;
    var item = null;
    if (typeof window.getManuscriptHistory === 'function') {
      item = (window.getManuscriptHistory() || []).find(function (h) { return h.id === id; });
    }
    if (!item && typeof window.getSlideHistory === 'function') {
      item = (window.getSlideHistory() || []).find(function (h) { return h.id === id; });
    }
    if (!item && typeof window.getAllSlideHistory === 'function') {
      item = (window.getAllSlideHistory() || []).find(function (h) { return h.id === id; });
    }
    if (!item) return;
    window._selectedManuscriptHistoryId = id;
    if (typeof window.setManuscriptSubView === 'function') window.setManuscriptSubView('content');
    if (typeof renderLeftPanel === 'function') renderLeftPanel();
  };

  window.showManuscriptInContent = window.loadManuscriptFromHistory;

  /**
   * 히스토리 항목을 슬라이드로 복원
   */
  window.restoreManuscriptToSlides = function (id) {
    if (!id || typeof window.setSlides !== 'function') return;
    var item = null;
    if (typeof window.getManuscriptHistory === 'function') {
      item = (window.getManuscriptHistory() || []).find(function (h) { return h.id === id; });
    }
    if (!item && typeof window.getSlideHistory === 'function') {
      item = (window.getSlideHistory() || []).find(function (h) { return h.id === id; });
    }
    if (!item && typeof window.getAllSlideHistory === 'function') {
      item = (window.getAllSlideHistory() || []).find(function (h) { return h.id === id; });
    }
    if (!item || !item.slides || !item.slides.length) {
      if (typeof showToast === 'function') showToast('⚠️ 저장된 슬라이드가 없습니다.');
      return;
    }
    var restored = [];
    try {
      restored = JSON.parse(JSON.stringify(item.slides || []));
    } catch (e) {
      restored = (item.slides || []).map(function (s, i) { return Object.assign({ id: i }, s || {}); });
    }
    restored = restored.map(function (s, i) {
      return Object.assign({
        id: s && s.id != null ? s.id : i,
        title: '',
        bullets: [],
        notes: '',
        visPrompt: '',
        isCover: false,
        imageUrl: null,
        imageUrl2: null
      }, s || {});
    });
    window.setSlides(restored);
    if (typeof window.setActiveSlideIndex === 'function') window.setActiveSlideIndex(0);
    if (typeof window.afterSlidesCreated === 'function') window.afterSlidesCreated();
    window._selectedManuscriptHistoryId = null;
    if (typeof renderLeftPanel === 'function') renderLeftPanel();
    if (typeof showToast === 'function') showToast('✅ 슬라이드로 복원되었습니다.');
  };

  /**
   * 현재 탭/선택에 따라 전체화면·새창에 쓸 콘텐츠 반환. { text, title, subtitle, fileName } 또는 null
   */
  function getManuscriptContentForViewer() {
    var currentView = window._manuscriptView || 'script';
    var id = window._selectedManuscriptHistoryId || null;
    var item = null;
    if (id && typeof window.getManuscriptHistory === 'function') {
      item = (window.getManuscriptHistory() || []).find(function (h) { return h.id === id; });
    }
    if (!item && id && typeof window.getSlideHistory === 'function') {
      item = (window.getSlideHistory() || []).find(function (h) { return h.id === id; });
    }
    if (item) {
      var fileName = item.fileName || '원고';
      if (item.type === 'slides' && item.manuscriptContent) {
        return { text: item.manuscriptContent, title: '슬라이드 생성', subtitle: '📋 슬라이드생성', fileName: fileName };
      }
      if ((item.type === 'script' || !item.type) && item.presentationScript && item.presentationScript.length) {
        return { text: scriptToMarkdown(item.presentationScript, item.slides), title: '발표 원고', subtitle: '📝 발표원고', fileName: fileName };
      }
    }
    if (currentView === 'slides') {
      var slides = (typeof window.getSlides === 'function' ? window.getSlides() : []) || [];
      if (slides.length) {
        var md = (typeof window.slidesToMarkdown === 'function') ? window.slidesToMarkdown(slides) : '';
        var fileName = (typeof window.getFileName === 'function' ? window.getFileName() : '') || '슬라이드';
        return { text: md, title: '슬라이드 생성', subtitle: '📋 슬라이드생성', fileName: fileName };
      }
    } else {
      var script = (typeof window.getPresentationScript === 'function' ? window.getPresentationScript() : []) || [];
      if (script.length) {
        var slides = (typeof window.getSlides === 'function' ? window.getSlides() : []) || [];
        var fileName = (typeof window.getFileName === 'function' ? window.getFileName() : '') || '발표 원고';
        return { text: scriptToMarkdown(script, slides), title: '발표 원고', subtitle: '📝 발표원고', fileName: fileName };
      }
    }
    return null;
  }

  /**
   * 앱 내 전체화면: 새창보기와 동일한 뷰어 디자인으로 콘텐츠를 크게 표시
   */
  window.openManuscriptFullscreen = function () {
    var opts = getManuscriptContentForViewer();
    if (!opts || !opts.text || !String(opts.text).trim()) {
      if (typeof showToast === 'function') showToast(window._manuscriptView === 'slides' ? '⚠️ 슬라이드를 먼저 생성하세요.' : '⚠️ 발표 원고를 먼저 생성하세요.');
      return;
    }
    var buildViewer = typeof window.buildViewerContentWithPages === 'function' ? window.buildViewerContentWithPages : null;
    var contentHtml = buildViewer ? buildViewer(opts.text) : String(opts.text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
    var escapeHtml = typeof window.escapeHtml === 'function' ? window.escapeHtml : function (s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
    var safeTitle = escapeHtml(opts.fileName || opts.title);
    var subtitle = opts.subtitle || opts.title;

    var overlayId = 'manuscript-fullscreen-overlay';
    var existing = document.getElementById(overlayId);
    if (existing) {
      existing.remove();
    }
    var overlay = document.createElement('div');
    overlay.id = overlayId;
    overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;display:flex;flex-direction:column;background:#0c0e13;font-family:\'JetBrains Mono\',\'Noto Sans KR\',monospace;';
    overlay.innerHTML =
      '<style>#manuscript-fullscreen-overlay .ms-toolbar{flex-shrink:0;background:#13161d;border-bottom:1px solid #1e2332;padding:10px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;}' +
      '#manuscript-fullscreen-overlay .ms-toolbar h2{font-size:14px;color:#4f8ef7;margin:0;}' +
      '#manuscript-fullscreen-overlay .ms-toolbar .ms-close{background:#4f8ef7;color:#fff;border:none;border-radius:6px;padding:8px 16px;font-size:13px;cursor:pointer;font-weight:600;}' +
      '#manuscript-fullscreen-overlay .ms-toolbar .ms-close:hover{opacity:0.9;}' +
      '#manuscript-fullscreen-overlay .ms-viewport{flex:1;overflow:auto;padding:24px;display:flex;justify-content:center;min-height:0;}' +
      '#manuscript-fullscreen-overlay .ms-page{max-width:860px;width:100%;min-height:min-content;padding:28px;word-wrap:break-word;background:#13161d;border:1px solid #1e2332;border-radius:8px;box-shadow:0 4px 24px rgba(0,0,0,0.3);}' +
      '#manuscript-fullscreen-overlay .ms-page-content{font-size:15px;line-height:1.75;color:#b0bac8;}' +
      '#manuscript-fullscreen-overlay .ms-page-content .page-section{margin-bottom:1.5em;}' +
      '#manuscript-fullscreen-overlay .ms-page-content h1,#manuscript-fullscreen-overlay .ms-page-content h2,#manuscript-fullscreen-overlay .ms-page-content h3,#manuscript-fullscreen-overlay .ms-page-content h4{font-family:sans-serif;color:#4f8ef7;margin-top:1em;margin-bottom:0.5em;}' +
      '#manuscript-fullscreen-overlay .ms-page-content h1{font-size:1.4em;}' +
      '#manuscript-fullscreen-overlay .ms-page-content h2{font-size:1.2em;border-bottom:1px solid #252a37;padding-bottom:6px;}' +
      '#manuscript-fullscreen-overlay .ms-page-content h3,#manuscript-fullscreen-overlay .ms-page-content h4{font-size:1.1em;}' +
      '#manuscript-fullscreen-overlay .ms-page-content pre,#manuscript-fullscreen-overlay .ms-page-content code{background:rgba(79,142,247,0.12);border-radius:4px;}' +
      '#manuscript-fullscreen-overlay .ms-page-content pre{padding:12px;overflow-x:auto;}' +
      '#manuscript-fullscreen-overlay .ms-page-content code{padding:2px 6px;}' +
      '#manuscript-fullscreen-overlay .ms-page-content ul,#manuscript-fullscreen-overlay .ms-page-content ol{margin:0.5em 0;padding-left:1.5em;}' +
      '#manuscript-fullscreen-overlay .ms-page-content a{color:#60a5fa;}' +
      '#manuscript-fullscreen-overlay .ms-page-content p{margin:0.5em 0;}</style>' +
      '<div class="ms-toolbar">' +
        '<h2>' + subtitle + ' — ' + safeTitle + '</h2>' +
        '<button type="button" class="ms-close" onclick="document.getElementById(\'manuscript-fullscreen-overlay\').remove()">전체화면 닫기</button>' +
      '</div>' +
      '<div class="ms-viewport">' +
        '<div class="ms-page"><div class="ms-page-content">' + contentHtml + '</div></div>' +
      '</div>';
    document.body.appendChild(overlay);
  };

  /**
   * 발표원고/슬라이드생성 텍스트를 요약 새창보기와 동일한 뷰어 UI로 열기
   */
  function openManuscriptViewerWindow(opts) {
    var text = opts.text;
    var title = opts.title || '원고';
    var subtitle = opts.subtitle || '';
    var fileName = opts.fileName || '';
    if (!text || !String(text).trim()) return false;
    var buildViewer = typeof window.buildViewerContentWithPages === 'function' ? window.buildViewerContentWithPages : null;
    var getViewerHtml = typeof window.getTextViewerWindowHtml === 'function' ? window.getTextViewerWindowHtml : null;
    if (!getViewerHtml) {
      if (typeof showToast === 'function') showToast('⚠️ 뷰어를 사용할 수 없습니다.');
      return false;
    }
    var win = window.open('', '_blank', 'width=900,height=750,scrollbars=yes,resizable=yes');
    if (!win) {
      if (typeof showToast === 'function') showToast('⚠️ 팝업이 차단되었습니다.');
      return false;
    }
    if (typeof window.registerChildWindow === 'function') window.registerChildWindow(win);
    var contentRendered = buildViewer ? buildViewer(text) : String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
    var escapedHtml = contentRendered.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$').replace(/<\/script>/gi, '<\\/script>');
    var rawJson = JSON.stringify(text);
    var escapeHtml = typeof window.escapeHtml === 'function' ? window.escapeHtml : function (s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
    var safeTitle = escapeHtml(fileName || title);
    var pageTitle = (subtitle ? subtitle + ' — ' : '') + safeTitle;
    var html = getViewerHtml({
      title: safeTitle,
      subtitle: subtitle || title,
      pageTitle: pageTitle,
      contentHtml: escapedHtml,
      rawTextJson: rawJson,
      contentType: 'manuscript'
    });
    win.document.write(html);
    win.document.close();
    return true;
  }

  /**
   * 발표원고 배열 → 마크다운 텍스트
   */
  function scriptToMarkdown(scriptArr, slides) {
    if (!scriptArr || !scriptArr.length) return '';
    var parts = [];
    for (var i = 0; i < scriptArr.length; i++) {
      var slideTitle = (slides && slides[i] && slides[i].title) ? slides[i].title : '슬라이드 ' + (i + 1);
      parts.push('## ' + slideTitle + '\n\n' + (scriptArr[i] || ''));
    }
    return parts.join('\n\n---\n\n');
  }

  /**
   * 슬라이드생성 탭: 현재 슬라이드 내용을 새 창에 표시
   */
  window.openSlidesInNewWindow = function () {
    var slides = (typeof window.getSlides === 'function' ? window.getSlides() : []) || [];
    if (!slides.length) {
      if (typeof showToast === 'function') showToast('⚠️ 슬라이드를 먼저 생성하세요.');
      return;
    }
    var md = (typeof window.slidesToMarkdown === 'function') ? window.slidesToMarkdown(slides) : '';
    var fileName = (typeof window.getFileName === 'function' ? window.getFileName() : '') || '슬라이드';
    openManuscriptViewerWindow({ text: md, title: '슬라이드 생성', subtitle: '📋 슬라이드생성', fileName: fileName });
  };

  /**
   * 히스토리 항목을 새 창에 표시 (요약 새창보기와 동일한 UI). 발표원고/슬라이드생성 탭에 따라 선택 항목 또는 현재 내용 표시.
   */
  window.openManuscriptInNewWindow = function (id) {
    var text = '';
    var title = '원고';
    var subtitle = '';
    var fileName = '';
    var item = null;
    var currentView = window._manuscriptView || 'script';
    if (id && typeof window.getManuscriptHistory === 'function') {
      item = (window.getManuscriptHistory() || []).find(function (h) { return h.id === id; });
    }
    if (!item && id && typeof window.getSlideHistory === 'function') {
      item = (window.getSlideHistory() || []).find(function (h) { return h.id === id; });
    }
    if (!item && id && typeof window.getAllSlideHistory === 'function') {
      item = (window.getAllSlideHistory() || []).find(function (h) { return h.id === id; });
    }
    if (item) {
      fileName = item.fileName || '원고';
      if ((item.type === 'slides' || item.type === 'all_slides') && item.manuscriptContent) {
        text = item.manuscriptContent;
        title = item.type === 'all_slides' ? 'All Slide 생성' : '슬라이드 생성';
        subtitle = item.type === 'all_slides' ? '🧠 All Slide생성' : '📋 슬라이드생성';
      } else if ((item.type === 'script' || !item.type) && item.presentationScript && item.presentationScript.length) {
        text = scriptToMarkdown(item.presentationScript, item.slides);
        title = '발표 원고';
        subtitle = '📝 발표원고';
      }
    }
    if (!text || !text.trim()) {
      if (currentView === 'slides' || currentView === 'allslides') {
        window.openSlidesInNewWindow();
        return;
      }
      if (id && typeof showToast === 'function') showToast('⚠️ 저장된 콘텐츠가 없습니다.');
      else window.openScriptInNewWindow();
      return;
    }
    openManuscriptViewerWindow({ text: text, title: title, subtitle: subtitle, fileName: fileName });
  };

  /**
   * 원고 탭에서만 쓰는 새 창 보기 (발표 원고 내용) — 요약 새창보기와 동일한 UI
   */
  window.openScriptInNewWindow = function () {
    var script = (typeof window.getPresentationScript === 'function' ? window.getPresentationScript() : []) || [];
    if (!script.length) {
      if (typeof showToast === 'function') showToast('⚠️ 발표 원고를 먼저 생성하세요.');
      return;
    }
    var slides = (typeof window.getSlides === 'function' ? window.getSlides() : []) || [];
    var fileName = (typeof window.getFileName === 'function' ? window.getFileName() : '') || '발표 원고';
    var text = scriptToMarkdown(script, slides);
    openManuscriptViewerWindow({ text: text, title: '발표 원고', subtitle: '📝 발표원고', fileName: fileName });
  };

  /**
   * 원고 탭 전용 HTML 생성
   * @param {object} opts - { fileName, fileSizeLabel, isPdf, rawTextLength, presentationScript, slides, customInstruction, escapeHtml }
   */
  function buildManuscriptTabContent(opts) {
    var fileName = opts.fileName || '';
    var fileSizeLabel = opts.fileSizeLabel || '0k';
    var isPdf = opts.isPdf !== false && (fileName.toLowerCase().endsWith('.pdf'));
    var script = opts.presentationScript || [];
    var slides = opts.slides || [];
    var customVal = opts.customInstruction || '';
    var slideGenType = (typeof localStorage !== 'undefined' && localStorage.getItem('ss_slide_gen_type')) || 'precision';
    var slideCountVal = (document.getElementById('slide-count-val') && document.getElementById('slide-count-val').value) || (typeof localStorage !== 'undefined' && localStorage.getItem('ss_default_slide_count')) || '15';
    var defaultIncludeCover = (typeof localStorage !== 'undefined' && localStorage.getItem('ss_default_include_cover')) !== 'false';
    var esc = opts.escapeHtml || function (s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); };
    var view = window._manuscriptView || 'script';
    var subView = window._manuscriptSubView || 'content';

    var fileBadge = '<div class="file-badge">'
      + '<span>' + (isPdf ? '📄' : '📝') + '</span>'
      + '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:120px">' + esc(fileName) + '</span>'
      + '<span class="file-size">' + esc(fileSizeLabel) + '</span>'
      + (isPdf ? '<button onclick="openPdfPreview()" style="margin-left:auto;font-size:10px;padding:2px 8px;border-radius:4px;border:1px solid rgba(79,142,247,0.4);background:var(--accent-glow);color:var(--accent);cursor:pointer;font-weight:600;flex-shrink:0">👁 미리보기</button>' : '')
      + '</div>';

    var showSlideGenTypeManuscript = (typeof localStorage !== 'undefined' && localStorage.getItem('ss_show_slide_gen_type_manuscript') === '1');
    var slideGenTypeRow = '<div style="margin-bottom:8px' + (showSlideGenTypeManuscript ? '' : ';display:none') + '"><label class="label">슬라이드 생성 유형</label>'
      + '<select class="control" id="slide-gen-type" style="font-size:11px;width:100%" onchange="if(typeof localStorage!==\'undefined\')localStorage.setItem(\'ss_slide_gen_type\',this.value)">'
      + '<option value="precision" ' + (slideGenType === 'precision' ? 'selected' : '') + '>A. 정밀 요약형 (Precision Archive)</option>'
      + '<option value="presentation" ' + (slideGenType === 'presentation' ? 'selected' : '') + '>B. 발표 최적화형 (Presentation Focus)</option>'
      + '<option value="notebook" ' + (slideGenType === 'notebook' ? 'selected' : '') + '>C. 노트북/학습형 (Concept Mastery)</option>'
      + '<option value="critical" ' + (slideGenType === 'critical' ? 'selected' : '') + '>D. 비판적 검토형 (Critical Analysis)</option>'
      + '<option value="evidence" ' + (slideGenType === 'evidence' ? 'selected' : '') + '>E. 시각적 증거형 (Evidence-Based Claims)</option>'
      + '<option value="logic" ' + (slideGenType === 'logic' ? 'selected' : '') + '>F. 인과관계 도식형 (Logic Flow)</option>'
      + '<option value="quiz" ' + (slideGenType === 'quiz' ? 'selected' : '') + '>G. 상호작용형 (Interactive Quiz)</option>'
      + '<option value="workshop" ' + (slideGenType === 'workshop' ? 'selected' : '') + '>H. 워크숍형 (Practical Action)</option>'
      + '<option value="auto_visual" ' + (slideGenType === 'auto_visual' ? 'selected' : '') + '>I. AII 자동 시각화형 (Auto Visualizer)</option></select></div>';

    var btnGenStyle = 'width:120px;flex-shrink:0;margin-left:auto;justify-content:center;font-size:12px;height:36px;padding:6px 10px';
    var slideCountRow = '<div style="display:flex;gap:6px;align-items:center;margin-bottom:6px;flex-wrap:wrap">'
      + '<label class="label" style="margin:0;white-space:nowrap">PageN</label>'
      + '<input type="number" class="control" id="slide-count-val" value="' + slideCountVal + '" min="5" max="200" style="width:64px;text-align:center"/>'
      + '<button type="button" class="btn btn-primary btn-sm btn-slide-gen-square" style="' + btnGenStyle + '" onclick="askThenSummary(\'slides\')">🗂 슬라이드생성</button>'
      + '</div>'
      + '<div style="margin-bottom:10px"><label style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--text2);cursor:pointer;white-space:nowrap"><input type="checkbox" id="include-cover" ' + (defaultIncludeCover ? 'checked' : '') + ' style="accent-color:var(--accent)"/> 표지 포함</label></div>';
    var slideRangeMin = (typeof localStorage !== 'undefined' && localStorage.getItem('ss_slide_range_default_min')) || '';
    var slideRangeMax = (typeof localStorage !== 'undefined' && localStorage.getItem('ss_slide_range_default_max')) || '';
    var slideRangeDefault = (slideRangeMin && slideRangeMax) ? (slideRangeMin + '-' + slideRangeMax) : '';
    var slideRangeRow = '<div style="display:flex;gap:6px;align-items:center;margin-bottom:10px;flex-wrap:wrap">'
      + '<label class="label" style="margin:0;white-space:nowrap">Range</label>'
      + '<input type="text" class="control" id="slide-range-val" placeholder="12-24" value="' + esc(slideRangeDefault) + '" style="width:64px;font-size:11px;flex:0 0 auto"/>'
      + '<button type="button" class="btn btn-sm btn-slide-gen-auto" style="' + btnGenStyle + '" onclick="askThenSummary(\'slides_auto\')">🧠 All Slide생성</button>'
      + '</div>';

    var showCustomManuscript = (typeof localStorage !== 'undefined' && localStorage.getItem('ss_show_custom_instruction_manuscript') === '1');
    var row2 = showCustomManuscript
      ? '<label class="label" style="margin-bottom:4px">커스텀 프롬프트</label>'
        + '<textarea class="control" id="custom-instruction-manuscript" rows="2" placeholder="예: 통계 방법론 집중, 영어로 출력..." style="width:100%;margin-bottom:10px;resize:vertical">' + esc(customVal) + '</textarea>'
      : '<textarea class="control" id="custom-instruction-manuscript" rows="2" placeholder="" style="display:none">' + esc(customVal) + '</textarea>';

    var row3 = '<div class="manuscript-row" style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">'
      + '<button type="button" class="btn btn-ghost btn-sm" onclick="askThenGenerateScript()">📄 발표원고 생성</button>'
      + '</div>';

    var toggleActiveScript = view === 'script' ? ' active' : '';
    var toggleActiveSlides = view === 'slides' ? ' active' : '';
    var toggleActiveAllSlides = view === 'allslides' ? ' active' : '';
    var row5 = '<div class="manuscript-tab-menu">'
      + '<button type="button" class="manuscript-tab-menu-btn' + toggleActiveScript + '" onclick="setManuscriptView(\'script\')">발표원고</button>'
      + '<button type="button" class="manuscript-tab-menu-btn' + toggleActiveSlides + '" onclick="setManuscriptView(\'slides\')">슬라이드생성</button>'
      + '<button type="button" class="manuscript-tab-menu-btn' + toggleActiveAllSlides + '" onclick="setManuscriptView(\'allslides\')">All Slide생성</button>'
      + '</div>';

    var selectedId = window._selectedManuscriptHistoryId || null;
    var selectedItem = null;
    if (selectedId) {
      if (typeof window.getManuscriptHistory === 'function') {
        selectedItem = (window.getManuscriptHistory() || []).find(function (h) { return h.id === selectedId; });
      }
      if (!selectedItem && typeof window.getSlideHistory === 'function') {
        selectedItem = (window.getSlideHistory() || []).find(function (h) { return h.id === selectedId; });
      }
      if (!selectedItem && typeof window.getAllSlideHistory === 'function') {
        selectedItem = (window.getAllSlideHistory() || []).find(function (h) { return h.id === selectedId; });
      }
    }

    var contentScript = '';
    if (script.length) {
      var scriptParts = [];
      for (var i = 0; i < script.length; i++) {
        var st = script[i];
        var slideTitle = (slides[i] && slides[i].title) ? slides[i].title : '';
        scriptParts.push('<div class="script-slide-section"><div class="script-slide-label">슬라이드 ' + (i + 1) + '</div><div class="script-slide-title">' + esc(slideTitle) + '</div><div class="script-slide-content">' + esc(st) + '</div></div>');
      }
      contentScript = '<div class="translate-row" style="margin-bottom:6px"><button type="button" class="btn btn-ghost btn-xs" onclick="saveContent(\'script\')">💾 원고 저장</button></div>' + scriptParts.join('');
    } else {
      contentScript = '<p style="font-size:12px;color:var(--text3);padding:12px 0">발표 원고를 생성하면 여기에 표시됩니다.</p>';
    }

    var contentSlides = '';
    if (slides.length) {
      var md = (typeof window.slidesToMarkdown === 'function') ? window.slidesToMarkdown(slides) : '';
      contentSlides = '<div style="white-space:pre-wrap;font-size:12px;line-height:1.6">' + esc(md) + '</div>';
    } else {
      contentSlides = '<p style="font-size:12px;color:var(--text3);padding:12px 0">슬라이드 생성 후 여기에서 확인할 수 있습니다. 위의 [슬라이드 생성]을 실행하세요.</p>';
    }

    var contentFromSelected = '';
    if (selectedItem && subView === 'content') {
      if ((selectedItem.type === 'slides' || selectedItem.type === 'all_slides') && selectedItem.manuscriptContent) {
        contentFromSelected = '<div style="white-space:pre-wrap;font-size:12px;line-height:1.6">' + esc(selectedItem.manuscriptContent) + '</div>';
      } else if ((selectedItem.type === 'script' || selectedItem.type === undefined) && selectedItem.presentationScript && selectedItem.presentationScript.length) {
        var scriptPartsSel = [];
        for (var j = 0; j < selectedItem.presentationScript.length; j++) {
          var stSel = selectedItem.presentationScript[j];
          var slideTitleSel = (selectedItem.slides && selectedItem.slides[j]) ? selectedItem.slides[j].title : '';
          scriptPartsSel.push('<div class="script-slide-section"><div class="script-slide-label">슬라이드 ' + (j + 1) + '</div><div class="script-slide-title">' + esc(slideTitleSel) + '</div><div class="script-slide-content">' + esc(stSel) + '</div></div>');
        }
        contentFromSelected = scriptPartsSel.join('');
      } else {
        contentFromSelected = '<p style="font-size:12px;color:var(--text3);padding:12px 0">저장된 콘텐츠가 없습니다.</p>';
      }
    }

    /* 생성내용: 현재 탭(발표원고/슬라이드생성/All Slide생성)에 맞는 것만 표시 */
    var useSelectedForContent = selectedItem && subView === 'content' &&
      (view === 'script' ? (selectedItem.type === 'script' || selectedItem.type === undefined) : (selectedItem.type === 'slides' || selectedItem.type === 'all_slides'));

    var contentHistory = '';
    if (subView === 'history') {
      var historyList = [];
      var clearFn = '';
      var removeFn = '';
      if (view === 'script' && typeof window.getManuscriptHistory === 'function') {
        historyList = window.getManuscriptHistory() || [];
        clearFn = 'clearManuscriptHistory';
        removeFn = 'removeFromManuscriptHistory';
      } else if (view === 'slides' && typeof window.getSlideHistory === 'function') {
        historyList = window.getSlideHistory() || [];
        clearFn = 'clearSlideHistory';
        removeFn = 'removeFromSlideHistory';
      } else if (view === 'allslides' && typeof window.getAllSlideHistory === 'function') {
        historyList = window.getAllSlideHistory() || [];
        clearFn = 'clearAllSlideHistory';
        removeFn = 'removeFromAllSlideHistory';
      }
      if (historyList.length) {
        contentHistory = '<div style="display:flex;justify-content:flex-end;margin-bottom:6px"><button type="button" class="btn btn-ghost btn-xs" onclick="' + clearFn + '(); _selectedManuscriptHistoryId=null; renderLeftPanel();">일괄 지우기</button></div><div style="display:flex;flex-direction:column;gap:6px">';
        for (var hi = 0; hi < historyList.length; hi++) {
          var h = historyList[hi];
          var created = h.createdAt ? new Date(h.createdAt).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' }) : '';
          var displayTitle = h.displayTitle || ((h.fileName || '제목 없음') + (h.type === 'all_slides' ? ' All Slide' : (h.type === 'slides' ? ' 슬라이드' : ' 발표 원고')));
          var badges = '';
          if (h && h.isBackupBeforeRegeneration) badges += '<span style="display:inline-block;margin-left:6px;padding:1px 6px;border-radius:10px;font-size:9px;background:rgba(148,163,184,.25);color:var(--text2)">생성 전 백업</span>';
          if (h && h.isManualSnapshot) badges += '<span style="display:inline-block;margin-left:6px;padding:1px 6px;border-radius:10px;font-size:9px;background:rgba(79,142,247,.2);color:var(--accent)">수동 저장</span>';
          var isSelected = h.id === selectedId;
          var itemStyle = 'padding:8px 10px;background:var(--bg2);border-radius:8px;border:1px solid var(--border);cursor:pointer;display:flex;align-items:center;gap:8px' + (isSelected ? ';border-color:var(--accent);background:var(--accent-glow)' : '');
          var safeId = String(h.id || '').replace(/'/g, "\\'");
          var onClickExpr = (view === 'slides' || view === 'allslides')
            ? "restoreManuscriptToSlides('" + safeId + "')"
            : "selectManuscriptHistoryItem('" + safeId + "')";
          contentHistory += '<div class="manuscript-history-item" data-id="' + esc(h.id) + '" style="' + itemStyle + '" onclick="' + onClickExpr + '"><div style="flex:1;min-width:0"><div style="font-size:11px;color:var(--text2)">' + esc(displayTitle) + badges + '</div><div style="font-size:10px;color:var(--text3);margin-top:2px">' + esc(created) + '</div></div><button type="button" class="btn btn-ghost btn-xs" style="flex-shrink:0;padding:2px 6px" onclick="event.stopPropagation(); ' + removeFn + '(\'' + safeId + '\'); if(_selectedManuscriptHistoryId===\'' + safeId + '\')_selectedManuscriptHistoryId=null; renderLeftPanel();" title="삭제">&#10005;</button></div>';
        }
        contentHistory += '</div>';
        var sel = selectedItem || (selectedId ? historyList.find(function (h) { return h.id === selectedId; }) : null);
        var canRestore = sel && sel.slides && sel.slides.length;
        var canView = sel && (sel.manuscriptContent || (sel.presentationScript && sel.presentationScript.length));
        contentHistory += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;padding-top:8px;border-top:1px solid var(--border)">'
          + '<button type="button" class="btn btn-ghost btn-xs"' + (canRestore ? '' : ' disabled') + ' onclick="restoreManuscriptToSlides(_selectedManuscriptHistoryId)" title="슬라이드로 복원">복원</button>'
          + '<button type="button" class="btn btn-ghost btn-xs"' + (selectedId ? '' : ' disabled') + ' onclick="if(_selectedManuscriptHistoryId)loadManuscriptFromHistory(_selectedManuscriptHistoryId)" title="생성내용에 보이게 하기">보기</button>'
          + '<button type="button" class="btn btn-ghost btn-xs"' + (canView ? '' : ' disabled') + ' onclick="openManuscriptInNewWindow(_selectedManuscriptHistoryId)" title="새창보기에 띄워서 보기">새창보기</button>'
          + '</div>';
      } else {
        contentHistory = '<p style="font-size:12px;color:var(--text3);padding:12px 0">' + (view === 'script' ? '발표 생성' : (view === 'allslides' ? 'All Slide 생성' : '슬라이드 생성')) + ' 히스토리가 없습니다.</p>';
      }
    }

    var mainContent = subView === 'history' ? contentHistory : (useSelectedForContent ? contentFromSelected : (view === 'script' ? contentScript : contentSlides));

    var labelContent = view === 'script' ? '발표 상세 내용' : (view === 'allslides' ? 'All Slide 생성 내용' : '슬라이드 생성 내용');
    var labelHistory = view === 'script' ? '발표 생성 히스토리' : (view === 'allslides' ? 'All Slide 생성히스토리' : '슬라이드 생성히스토리');
    var labelNewWindow = view === 'script' ? '발표 새창보기' : (view === 'allslides' ? 'All Slide 새창보기' : '슬라이드 새창보기');
    var labelFullscreen = view === 'script' ? '발표 전체화면' : (view === 'allslides' ? 'All Slide 전체화면' : '슬라이드 전체화면');

    var row6 = '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">'
      + '<button type="button" class="btn btn-ghost btn-xs' + (subView === 'content' ? ' active' : '') + '" onclick="setManuscriptSubView(\'content\')">' + labelContent + '</button>'
      + '<button type="button" class="btn btn-ghost btn-xs' + (subView === 'history' ? ' active' : '') + '" onclick="setManuscriptSubView(\'history\')">' + labelHistory + '</button>'
      + '<button type="button" class="btn btn-ghost btn-xs" onclick="openManuscriptInNewWindow(_selectedManuscriptHistoryId)" title="' + (view === 'script' ? '선택된 항목 또는 현재 발표 원고를 새 창에 표시' : '선택된 항목 또는 현재 슬라이드 내용을 새 창에 표시') + '">' + labelNewWindow + '</button>'
      + '<button type="button" class="btn btn-ghost btn-xs" onclick="openManuscriptFullscreen()" title="앱 내에서 전체화면으로 보기">' + labelFullscreen + '</button>'
      + '</div>';

    var resultArea = '<div id="manuscript-result-area" style="max-height:280px;overflow-y:auto;font-size:12px;line-height:1.6;color:var(--text2);border:1px solid var(--border2);border-radius:8px;padding:10px;background:var(--surface)">'
      + mainContent
      + '</div>';

    return fileBadge
      + slideGenTypeRow
      + slideCountRow
      + slideRangeRow
      + row2
      + row3
      + row5
      + row6
      + resultArea;
  }

  window.buildManuscriptTabContent = buildManuscriptTabContent;
  window.setManuscriptView = setManuscriptView;
  window.setManuscriptSubView = setManuscriptSubView;

  if (typeof window.applySlideAspectRatio === 'function') window.applySlideAspectRatio();
})();

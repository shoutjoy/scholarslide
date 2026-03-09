/**
 * ScholarSlide — 원고 탭 전용 UI (좌측 사이드바)
 * 원고 탭 선택 시에만 사용되는 레이아웃: 발표원고생성/슬라이드 생성, 커스텀 프롬프트, 슬라이드 원고로 생성/파일선택, 텍스트입력창, 발표원고|슬라이드생성 뷰, 생성내용/생성히스토리/새창보기
 * 전역 의존: askThenGenerateScript, askThenSummary, handleFileUpload, saveContent, renderLeftPanel, openSummaryWindow, getPresentationScript, getSlides, getFileName, escapeHtml, showToast
 */
(function () {
  'use strict';

  window._manuscriptView = window._manuscriptView || 'script'; // 'script' | 'slides'
  window._manuscriptSubView = window._manuscriptSubView || 'content'; // 'content' | 'history'
  window._selectedManuscriptHistoryId = window._selectedManuscriptHistoryId || null;

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
   * 히스토리 항목을 생성내용에 표시
   */
  window.loadManuscriptFromHistory = function (id) {
    if (!id || typeof window.getManuscriptHistory !== 'function') return;
    var list = window.getManuscriptHistory();
    var item = list.find(function (h) { return h.id === id; });
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
    if (!id || typeof window.getManuscriptHistory !== 'function' || typeof window.setSlides !== 'function') return;
    var list = window.getManuscriptHistory();
    var item = list.find(function (h) { return h.id === id; });
    if (!item || !item.slides || !item.slides.length) {
      if (typeof showToast === 'function') showToast('⚠️ 저장된 슬라이드가 없습니다.');
      return;
    }
    var restored = item.slides.map(function (s, i) {
      return { id: s.id != null ? s.id : i, title: s.title || '', bullets: s.bullets || [], notes: s.notes || '', visPrompt: s.visPrompt || '', isCover: s.isCover || false, imageUrl: s.imageUrl || null };
    });
    window.setSlides(restored);
    if (typeof window.setActiveSlideIndex === 'function') window.setActiveSlideIndex(0);
    if (typeof window.afterSlidesCreated === 'function') window.afterSlidesCreated();
    window._selectedManuscriptHistoryId = null;
    if (typeof renderLeftPanel === 'function') renderLeftPanel();
    if (typeof showToast === 'function') showToast('✅ 슬라이드로 복원되었습니다.');
  };

  /**
   * 히스토리 항목을 새 창에 표시
   */
  window.openManuscriptInNewWindow = function (id) {
    var content = '';
    var title = '원고';
    var fileName = '';
    if (id && typeof window.getManuscriptHistory === 'function') {
      var list = window.getManuscriptHistory();
      var item = list.find(function (h) { return h.id === id; });
      if (item) {
        fileName = item.fileName || '원고';
        if (item.type === 'slides' && item.manuscriptContent) {
          content = item.manuscriptContent;
          title = '슬라이드 원고';
        } else if (item.type === 'script' && item.presentationScript && item.presentationScript.length) {
          var esc = typeof window.escapeHtml === 'function' ? window.escapeHtml : function (s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
          var parts = [];
          for (var i = 0; i < item.presentationScript.length; i++) {
            var slideTitle = (item.slides && item.slides[i]) ? item.slides[i].title : '슬라이드 ' + (i + 1);
            parts.push('<div style="margin-bottom:20px"><div style="font-size:11px;color:#71717a;margin-bottom:4px">' + esc(slideTitle) + '</div><div style="font-size:13px;line-height:1.7;white-space:pre-wrap">' + esc(item.presentationScript[i]) + '</div></div>');
          }
          content = parts.join('');
          title = '발표 원고';
        }
      }
    }
    if (!content) {
      if (id && typeof showToast === 'function') showToast('⚠️ 저장된 콘텐츠가 없습니다.');
      else window.openScriptInNewWindow();
      return;
    }
    var win = window.open('', '_blank', 'width=720,height=700,scrollbars=yes,resizable=yes');
    if (!win) {
      if (typeof showToast === 'function') showToast('⚠️ 팝업이 차단되었습니다.');
      return;
    }
    if (typeof window.registerChildWindow === 'function') window.registerChildWindow(win);
    var esc = typeof window.escapeHtml === 'function' ? window.escapeHtml : function (s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
    var bodyContent = content.indexOf('<div') === 0 ? content : '<pre style="white-space:pre-wrap;font-family:system-ui,sans-serif;font-size:13px;line-height:1.7">' + esc(content) + '</pre>';
    var html = '<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>' + esc(title) + ' — ' + esc(fileName) + '</title><style>body{font-family:system-ui,sans-serif;background:#1a1a1e;color:#e4e4e7;margin:0;padding:16px;line-height:1.6}</style></head><body><h2 style="font-size:16px;margin-bottom:16px">' + esc(title) + '</h2>' + bodyContent + '</body></html>';
    win.document.write(html);
    win.document.close();
  };

  /**
   * 원고 탭에서만 쓰는 새 창 보기 (발표 원고 내용)
   */
  window.openScriptInNewWindow = function () {
    var script = (typeof window.getPresentationScript === 'function' ? window.getPresentationScript() : []) || [];
    if (!script.length) {
      if (typeof showToast === 'function') showToast('⚠️ 발표 원고를 먼저 생성하세요.');
      return;
    }
    var win = window.open('', '_blank', 'width=720,height=700,scrollbars=yes,resizable=yes');
    if (!win) {
      if (typeof showToast === 'function') showToast('⚠️ 팝업이 차단되었습니다.');
      return;
    }
    if (typeof window.registerChildWindow === 'function') window.registerChildWindow(win);
    var escapeHtml = typeof window.escapeHtml === 'function' ? window.escapeHtml : function (s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
    var slides = (typeof window.getSlides === 'function' ? window.getSlides() : []) || [];
    var fileName = (typeof window.getFileName === 'function' ? window.getFileName() : '') || '발표 원고';
    var parts = [];
    for (var i = 0; i < script.length; i++) {
      var title = (slides[i] && slides[i].title) ? slides[i].title : '슬라이드 ' + (i + 1);
      parts.push('<div style="margin-bottom:20px"><div style="font-size:11px;color:#71717a;margin-bottom:4px">' + escapeHtml(title) + '</div><div style="font-size:13px;line-height:1.7;white-space:pre-wrap">' + escapeHtml(script[i]) + '</div></div>');
    }
    var html = '<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>발표 원고 — ' + escapeHtml(fileName) + '</title><style>body{font-family:system-ui,sans-serif;background:#1a1a1e;color:#e4e4e7;margin:0;padding:16px;line-height:1.6}</style></head><body><h2 style="font-size:16px;margin-bottom:16px">📝 발표 원고</h2>' + parts.join('') + '</body></html>';
    win.document.write(html);
    win.document.close();
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
    var esc = opts.escapeHtml || function (s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); };
    var view = window._manuscriptView || 'script';
    var subView = window._manuscriptSubView || 'content';

    var fileBadge = '<div class="file-badge">'
      + '<span>' + (isPdf ? '📄' : '📝') + '</span>'
      + '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:120px">' + esc(fileName) + '</span>'
      + '<span class="file-size">' + esc(fileSizeLabel) + '</span>'
      + (isPdf ? '<button onclick="openPdfPreview()" style="margin-left:auto;font-size:10px;padding:2px 8px;border-radius:4px;border:1px solid rgba(79,142,247,0.4);background:var(--accent-glow);color:var(--accent);cursor:pointer;font-weight:600;flex-shrink:0">👁 미리보기</button>' : '')
      + '</div>';

    var slideGenTypeRow = '<div style="margin-bottom:8px"><label class="label">슬라이드 생성 유형</label>'
      + '<select class="control" id="slide-gen-type" style="font-size:11px;width:100%" onchange="if(typeof localStorage!==\'undefined\')localStorage.setItem(\'ss_slide_gen_type\',this.value)">'
      + '<option value="precision" ' + (slideGenType === 'precision' ? 'selected' : '') + '>A. 정밀 요약형 (Precision Archive)</option>'
      + '<option value="presentation" ' + (slideGenType === 'presentation' ? 'selected' : '') + '>B. 발표 최적화형 (Presentation Focus)</option>'
      + '<option value="notebook" ' + (slideGenType === 'notebook' ? 'selected' : '') + '>C. 노트북/학습형 (Concept Mastery)</option>'
      + '<option value="critical" ' + (slideGenType === 'critical' ? 'selected' : '') + '>D. 비판적 검토형 (Critical Analysis)</option>'
      + '<option value="evidence" ' + (slideGenType === 'evidence' ? 'selected' : '') + '>E. 시각적 증거형 (Evidence-Based Claims)</option>'
      + '<option value="logic" ' + (slideGenType === 'logic' ? 'selected' : '') + '>F. 인과관계 도식형 (Logic Flow)</option>'
      + '<option value="quiz" ' + (slideGenType === 'quiz' ? 'selected' : '') + '>G. 상호작용형 (Interactive Quiz)</option>'
      + '<option value="workshop" ' + (slideGenType === 'workshop' ? 'selected' : '') + '>H. 워크숍형 (Practical Action)</option></select></div>';

    var row1 = '<div class="manuscript-row" style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">'
      + '<button type="button" class="btn btn-primary btn-sm" onclick="askThenGenerateScript()">📝 발표원고생성</button>'
      + '<button type="button" class="btn btn-primary btn-sm" onclick="askThenSummary(\'slides\')">🗂 슬라이드 생성</button>'
      + '</div>';

    var row2 = '<label class="label" style="margin-bottom:4px">커스텀 프롬프트</label>'
      + '<textarea class="control" id="custom-instruction-val" rows="2" placeholder="예: 통계 방법론 집중, 영어로 출력..." style="width:100%;margin-bottom:10px;resize:vertical">' + esc(customVal) + '</textarea>';

    var row3 = '<div class="manuscript-row" style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">'
      + '<button type="button" class="btn btn-ghost btn-sm" onclick="askThenGenerateScript()">📄 슬라이드 원고로 생성</button>'
      + '<button type="button" class="btn btn-ghost btn-sm" style="justify-content:center" onclick="document.getElementById(\'file-input-manuscript\').click()">📂 파일선택</button>'
      + '<input type="file" id="file-input-manuscript" style="display:none" accept=".pdf,.docx,.txt" onchange="handleFileUpload(event)"/>'
      + '</div>';

    var row4 = '<label class="label" style="margin-bottom:4px">텍스트입력창</label>'
      + '<textarea class="control" id="manuscript-text-input" rows="3" placeholder="메모 또는 추가 지시사항..." style="width:100%;margin-bottom:10px;resize:vertical"></textarea>';

    var toggleActiveScript = view === 'script' ? ' active' : '';
    var toggleActiveSlides = view === 'slides' ? ' active' : '';
    var row5 = '<div class="translate-row" style="margin-bottom:8px">'
      + '<button type="button" class="btn btn-ghost btn-xs' + toggleActiveScript + '" onclick="setManuscriptView(\'script\')">발표원고</button>'
      + '<button type="button" class="btn btn-ghost btn-xs' + toggleActiveSlides + '" onclick="setManuscriptView(\'slides\')">슬라이드생성</button>'
      + '</div>';

    var selectedId = window._selectedManuscriptHistoryId || null;
    var selectedItem = null;
    if (selectedId && typeof window.getManuscriptHistory === 'function') {
      selectedItem = (window.getManuscriptHistory() || []).find(function (h) { return h.id === selectedId; });
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
      if (selectedItem.type === 'slides' && selectedItem.manuscriptContent) {
        contentFromSelected = '<div style="white-space:pre-wrap;font-size:12px;line-height:1.6">' + esc(selectedItem.manuscriptContent) + '</div>';
      } else if (selectedItem.type === 'script' && selectedItem.presentationScript && selectedItem.presentationScript.length) {
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

    var contentHistory = '';
    if (subView === 'history' && typeof window.getManuscriptHistory === 'function') {
      var historyList = window.getManuscriptHistory() || [];
      if (historyList.length) {
        contentHistory = '<div style="display:flex;justify-content:flex-end;margin-bottom:6px"><button type="button" class="btn btn-ghost btn-xs" onclick="clearManuscriptHistory(); _selectedManuscriptHistoryId=null; renderLeftPanel();">일괄 지우기</button></div><div style="display:flex;flex-direction:column;gap:6px">';
        for (var hi = 0; hi < historyList.length; hi++) {
          var h = historyList[hi];
          var created = h.createdAt ? new Date(h.createdAt).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' }) : '';
          var typeLabel = h.type === 'slides' ? '슬라이드 생성' : h.type === 'script' ? '발표 원고' : (h.type || '');
          var isSelected = h.id === selectedId;
          var itemStyle = 'padding:8px 10px;background:var(--bg2);border-radius:8px;border:1px solid var(--border);cursor:pointer;display:flex;align-items:center;gap:8px' + (isSelected ? ';border-color:var(--accent);background:var(--accent-glow)' : '');
          contentHistory += '<div class="manuscript-history-item" data-id="' + esc(h.id) + '" style="' + itemStyle + '" onclick="loadManuscriptFromHistory(\'' + String(h.id || '').replace(/'/g, "\\'") + '\')"><div style="flex:1;min-width:0"><div style="font-size:11px;color:var(--text2)">' + esc(h.fileName || '제목 없음') + '</div><div style="font-size:10px;color:var(--text3);margin-top:2px">' + esc(created) + (typeLabel ? ' · ' + esc(typeLabel) : '') + '</div></div><button type="button" class="btn btn-ghost btn-xs" style="flex-shrink:0;padding:2px 6px" onclick="event.stopPropagation(); removeFromManuscriptHistory(\'' + String(h.id || '').replace(/'/g, "\\'") + '\'); if(_selectedManuscriptHistoryId===\'' + String(h.id || '').replace(/'/g, "\\'") + '\')_selectedManuscriptHistoryId=null; renderLeftPanel();" title="삭제">&#10005;</button></div>';
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
        contentHistory = '<p style="font-size:12px;color:var(--text3);padding:12px 0">원고/슬라이드 생성 히스토리가 없습니다.</p>';
      }
    } else if (subView === 'history') {
      contentHistory = '<p style="font-size:12px;color:var(--text3);padding:12px 0">원고 히스토리를 불러올 수 없습니다.</p>';
    }

    var mainContent = subView === 'history' ? contentHistory : (contentFromSelected ? contentFromSelected : (view === 'script' ? contentScript : contentSlides));

    var row6 = '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">'
      + '<button type="button" class="btn btn-ghost btn-xs' + (subView === 'content' ? ' active' : '') + '" onclick="setManuscriptSubView(\'content\')">생성내용</button>'
      + '<button type="button" class="btn btn-ghost btn-xs' + (subView === 'history' ? ' active' : '') + '" onclick="setManuscriptSubView(\'history\')">생성히스토리</button>'
      + '<button type="button" class="btn btn-ghost btn-xs" onclick="openManuscriptInNewWindow(_selectedManuscriptHistoryId)" title="선택된 항목 또는 현재 원고를 새 창에 표시">새창보기</button>'
      + '</div>';

    var resultArea = '<div id="manuscript-result-area" style="max-height:280px;overflow-y:auto;font-size:12px;line-height:1.6;color:var(--text2);border:1px solid var(--border2);border-radius:8px;padding:10px;background:var(--surface)">'
      + mainContent
      + '</div>';

    return fileBadge
      + slideGenTypeRow
      + row1
      + row2
      + row3
      + row4
      + row5
      + row6
      + resultArea;
  }

  window.buildManuscriptTabContent = buildManuscriptTabContent;
  window.setManuscriptView = setManuscriptView;
  window.setManuscriptSubView = setManuscriptSubView;
})();

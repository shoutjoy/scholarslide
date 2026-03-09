/**
 * ScholarSlide — 왼쪽 패널 렌더 (원문/요약/원고 탭, 파일 뱃지, 슬라이드 생성 유형 등)
 * 전역 의존: getRawText, getLeftTab, getSummaryText, getPresentationScript, getSlides, getFileName, getWritingStyle, getSlideStyle,
 *   getSummarySubTab, setSummarySubTab, getSummaryHistory, escapeHtml, setWritingStyle, openSummaryWindow, openRefExpWindow,
 *   askThenTranslate, viewTranslation, saveContent, openSummaryOptionsModal, askThenSummary, handleFileUpload, loadSummaryFromHistory, removeSummaryFromHistory, clearSummaryHistory
 */
(function () {
  'use strict';

  function renderLeftPanel() {
    var content = document.getElementById('left-content');
    var rawText = typeof window.getRawText === 'function' ? window.getRawText() : '';
    if (!rawText) {
      content.innerHTML = '<div class="upload-zone" id="upload-drop-zone" onclick="document.getElementById(\'file-input\').click()" ondragover="handleDragOver(event)" ondrop="handleDrop(event)" ondragleave="handleDragLeave()">'
        + '<input type="file" id="file-input" style="display:none" accept=".pdf,.docx,.txt" onchange="handleFileUpload(event)"/>'
        + '<span class="upload-icon">📄</span><h3>논문 업로드</h3><p>PDF, DOCX, TXT · 드래그 앤 드롭</p></div>'
        + '<div class="text-input-zone"><label class="label" style="margin-top:12px">또는 텍스트 직접 붙여넣기</label>'
        + '<textarea id="text-paste-input" placeholder="논문 본문을 여기에 붙여넣으세요..." rows="6"></textarea>'
        + '<button class="btn btn-ghost w-full mt-2" style="justify-content:center" onclick="loadFromTextInput()">✅ 텍스트 로드</button></div>';
      return;
    }
    var customVal = document.getElementById('custom-instruction-val') && document.getElementById('custom-instruction-val').value || '';
    var slideCountVal = document.getElementById('slide-count-val') && document.getElementById('slide-count-val').value || (typeof localStorage !== 'undefined' && localStorage.getItem('ss_default_slide_count')) || '15';
    var defaultIncludeCover = (typeof localStorage !== 'undefined' && localStorage.getItem('ss_default_include_cover')) !== 'false';
    var leftTab = typeof window.getLeftTab === 'function' ? window.getLeftTab() : 'summary';
    var summaryText = typeof window.getSummaryText === 'function' ? window.getSummaryText() : '';
    var presentationScript = typeof window.getPresentationScript === 'function' ? window.getPresentationScript() : [];
    var slides = typeof window.getSlides === 'function' ? window.getSlides() : [];
    var fileName = typeof window.getFileName === 'function' ? window.getFileName() : '';
    var writingStyle = typeof window.getWritingStyle === 'function' ? window.getWritingStyle() : 'academic-da';
    var escapeHtml = typeof window.escapeHtml === 'function' ? window.escapeHtml : function (s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); };
    var displayContent = '';

    if (leftTab === 'script' && typeof window.buildManuscriptTabContent === 'function') {
      var customVal = (document.getElementById('custom-instruction-val') && document.getElementById('custom-instruction-val').value) || '';
      var fileSizeLabel = (rawText.length / 1000).toFixed(1) + 'k';
      var isPdf = fileName.toLowerCase().endsWith('.pdf');
      content.innerHTML = window.buildManuscriptTabContent({
        fileName: fileName,
        fileSizeLabel: fileSizeLabel,
        isPdf: isPdf,
        rawTextLength: rawText.length,
        presentationScript: presentationScript,
        slides: slides,
        customInstruction: customVal,
        escapeHtml: escapeHtml
      });
      return;
    }

    if (leftTab === 'summary') {
      var subTab = (typeof window.getSummarySubTab === 'function' && window.getSummarySubTab()) || 'current';
      var historyList = (typeof window.getSummaryHistory === 'function' && window.getSummaryHistory()) || [];
      var subTabsHtml = '<div class="translate-row" style="margin-bottom:8px"><button type="button" class="btn btn-ghost btn-xs ' + (subTab === 'current' ? 'active' : '') + '" onclick="setSummarySubTab(\'current\'); renderLeftPanel();">현재 요약</button><button type="button" class="btn btn-ghost btn-xs ' + (subTab === 'history' ? 'active' : '') + '" onclick="setSummarySubTab(\'history\'); renderLeftPanel();">요약 히스토리</button></div>';
      if (subTab === 'history') {
        var listHtml = '';
        if (historyList.length) {
          listHtml += '<div style="display:flex;justify-content:flex-end;margin-bottom:6px"><button type="button" class="btn btn-ghost btn-xs" onclick="clearSummaryHistory(); renderLeftPanel();">일괄 지우기</button></div>';
          listHtml += '<div style="display:flex;flex-direction:column;gap:6px;max-height:300px;overflow-y:auto">';
          for (var hi = 0; hi < historyList.length; hi++) {
            var h = historyList[hi];
            var created = h.createdAt ? new Date(h.createdAt).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' }) : '';
            var styleLabel = (h.styleId || '') + (h.granularity ? ' · ' + (h.granularity === 'detail' ? '세밀한' : h.granularity === 'basic' ? '기본' : '핵심') : '');
            listHtml += '<div class="summary-history-item" data-id="' + escapeHtml(h.id) + '" style="padding:8px 10px;background:var(--bg2);border-radius:8px;border:1px solid var(--border);cursor:pointer;display:flex;align-items:center;gap:8px" onclick="loadSummaryFromHistory(\'' + (h.id || '').replace(/'/g, "\\'") + '\')"><div style="flex:1;min-width:0"><div style="font-size:11px;color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escapeHtml(h.fileName || '제목 없음') + '</div><div style="font-size:10px;color:var(--text3);margin-top:2px">' + escapeHtml(created) + (styleLabel ? ' · ' + escapeHtml(styleLabel) : '') + '</div></div><button type="button" class="btn btn-ghost btn-xs" style="flex-shrink:0;padding:2px 6px" onclick="event.stopPropagation(); removeSummaryFromHistory(\'' + (h.id || '').replace(/'/g, "\\'") + '\'); renderLeftPanel();" title="삭제">&#x2715;</button></div>';
          }
          listHtml += '</div>';
        } else {
          listHtml = '<p style="font-size:12px;color:var(--text3);padding:12px 0">저장된 요약이 없습니다.</p>';
        }
        displayContent = subTabsHtml + listHtml;
      } else {
        displayContent = subTabsHtml + '<div class="translate-row">'
          + '<button class="btn btn-ghost btn-xs" onclick="askThenTranslate(\'summary\')">🌐 한국어 번역</button>'
          + (window._translatedSummary ? '<button class="btn btn-xs" style="background:var(--accent);color:#fff;border-radius:6px;padding:2px 8px;font-size:11px;cursor:pointer;border:none" onclick="viewTranslation(\'summary\')">📖 번역보기</button>' : '')
          + '<button class="btn btn-ghost btn-xs" onclick="saveContent(\'summary\')">💾 저장</button>'
          + (summaryText ? '<button class="btn btn-ghost btn-xs" onclick="openSummaryWindow()">🔲 새창보기</button>' : '')
          + '<button class="btn btn-ghost btn-xs" onclick="openRefExpWindow()" title="참고문헌만 추출하여 새 창에 보기">📚 REF EXP</button>'
          + '</div><div style="max-height:340px;overflow-y:auto;font-size:12px;line-height:1.7;color:var(--text2);white-space:pre-wrap;margin-top:6px">' + (summaryText ? escapeHtml(summaryText) : '<span style="color:var(--text3)">요약 버튼을 클릭하세요.</span>') + '</div>';
      }
    } else if (leftTab === 'raw') {
      displayContent = '<div class="translate-row">'
        + '<button class="btn btn-ghost btn-xs" onclick="askThenTranslate(\'raw\')">🌐 한국어 번역</button>'
        + (window._translatedRaw ? '<button class="btn btn-xs" style="background:var(--accent);color:#fff;border-radius:6px;padding:2px 8px;font-size:11px;cursor:pointer;border:none" onclick="viewTranslation(\'raw\')">📖 번역보기</button>' : '')
        + '<button class="btn btn-ghost btn-xs" onclick="saveContent(\'raw\')">💾 저장</button>'
        + (rawText.length > 5000 ? '<button class="btn btn-ghost btn-xs" onclick="openFullTextWindow()">🔲 새창보기</button>' : '')
        + '<button class="btn btn-ghost btn-xs" onclick="openRefExpWindow()" title="참고문헌만 추출하여 새 창에 보기">📚 REF EXP</button>'
        + '</div><div style="font-size:10px;line-height:1.6;color:var(--text2);white-space:pre-wrap;font-family:var(--font-mono);max-height:340px;overflow-y:auto;margin-top:6px">' + escapeHtml(rawText) + '</div>';
    } else if (leftTab === 'script') {
      if (!presentationScript.length) {
        displayContent = '<div style="text-align:center;padding:24px 0"><p style="font-size:12px;color:var(--text2);margin-bottom:12px">슬라이드 원고를 생성하세요.</p><button class="btn btn-primary btn-sm" onclick="askThenGenerateScript()">📝 발표 원고 생성</button></div>';
      } else {
        var scriptParts = [];
        for (var i = 0; i < presentationScript.length; i++) {
          var st = presentationScript[i];
          var slideTitle = slides[i] && slides[i].title ? slides[i].title : '';
          scriptParts.push('<div class="script-slide-section"><div class="script-slide-label">슬라이드 ' + (i + 1) + '</div><div class="script-slide-title">' + escapeHtml(slideTitle) + '</div><div class="script-slide-content">' + escapeHtml(st) + '</div></div>');
        }
        displayContent = '<div class="translate-row"><button class="btn btn-ghost btn-xs" onclick="saveContent(\'script\')">💾 원고 저장</button></div>' + scriptParts.join('');
      }
    }
    var _isPdf = fileName.toLowerCase().endsWith('.pdf');
    content.innerHTML = '<div class="file-badge">'
      + '<span>' + (_isPdf ? '📄' : '📝') + '</span>'
      + '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:120px">' + escapeHtml(fileName) + '</span>'
      + '<span class="file-size">' + (rawText.length / 1000).toFixed(1) + 'k</span>'
      + (_isPdf ? '<button onclick="openPdfPreview()" style="margin-left:auto;font-size:10px;padding:2px 8px;border-radius:4px;border:1px solid rgba(79,142,247,0.4);background:var(--accent-glow);color:var(--accent);cursor:pointer;font-weight:600;flex-shrink:0">👁 미리보기</button>' : '')
      + '</div>'
      + '<div style="margin-bottom:8px"><label class="label">문체 설정</label>'
      + '<select class="control" id="writing-style-val" onchange="setWritingStyle(this.value)" style="font-size:11px">'
      + '<option value="academic-da" ' + (writingStyle === 'academic-da' ? 'selected' : '') + '>학술체 (~이다)</option>'
      + '<option value="academic-im" ' + (writingStyle === 'academic-im' ? 'selected' : '') + '>학술체 (~임, ~함)</option>'
      + '<option value="polite" ' + (writingStyle === 'polite' ? 'selected' : '') + '>일반체 (존댓말)</option></select></div>'
      + '<div style="display:flex;gap:6px;align-items:center;margin-bottom:8px"><label class="label" style="margin:0;white-space:nowrap">슬라이드 수</label>'
      + '<input type="number" class="control" id="slide-count-val" value="' + slideCountVal + '" min="5" max="30" style="width:64px;text-align:center"/>'
      + '<label style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--text2);cursor:pointer;white-space:nowrap;margin-left:4px"><input type="checkbox" id="include-cover" ' + (defaultIncludeCover ? 'checked' : '') + ' style="accent-color:var(--accent)"/> 표지 포함</label></div>'
      + '<div class="action-grid">'
      + '<button class="action-card" onclick="openSummaryOptionsModal()"><span class="action-card-icon">📖</span>전체 요약</button>'
      + '<button class="action-card" onclick="openSummaryOptionsModal()"><span class="action-card-icon">📋</span>슬라이드 요약</button></div>'
      + '<label class="label">커스텀 지시사항</label>'
      + '<textarea class="control" id="custom-instruction-val" rows="2" placeholder="예: 통계 방법론 집중, 영어로 출력...">' + escapeHtml(customVal) + '</textarea>'
      + '<button class="btn btn-ghost w-full mt-2" style="justify-content:center;font-size:11px" onclick="document.getElementById(\'file-input2\').click()">📂 다른 파일 열기<input type="file" id="file-input2" style="display:none" accept=".pdf,.docx,.txt" onchange="handleFileUpload(event)"/></button>'
      + '<hr class="sep"/>' + displayContent;
  }

  window.renderLeftPanel = renderLeftPanel;
})();

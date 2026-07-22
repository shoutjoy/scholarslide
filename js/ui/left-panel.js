/**
 * ScholarSlide — 왼쪽 패널 렌더 (원문/요약/슬라이드 탭, 파일 뱃지, 슬라이드 생성 유형 등)
 * 전역 의존: getRawText, getLeftTab, getSummaryText, getPresentationScript, getSlides, getFileName, getWritingStyle, getSlideStyle,
 *   getSummarySubTab, setSummarySubTab, getSummaryHistory, escapeHtml, setWritingStyle, openSummaryWindow, openRefExpWindow,
 *   askThenTranslate, viewTranslation, saveContent, openSummaryOptionsModal, askThenSummary, handleFileUpload, loadSummaryFromHistory, removeSummaryFromHistory, clearSummaryHistory
 */
(function () {
  'use strict';

  function renderSummarySplitPanel(rawText, escapeHtml) {
    var limit = parseInt((typeof localStorage !== 'undefined' && localStorage.getItem('ss_summary_char_limit')) || '1500000', 10) || 1500000;
    limit = Math.max(10000, Math.min(2000000, limit));
    var source = String(rawText || '').substring(0, limit);
    var live = typeof window.getSummarySplitProcessing === 'function' ? window.getSummarySplitProcessing() : null;
    var calculated = typeof window.getSummaryChunkPlan === 'function' ? window.getSummaryChunkPlan(source) : null;
    if (live && (!calculated || live.sourceFingerprint !== calculated.sourceFingerprint || live.provider !== calculated.provider || live.contextLength !== calculated.contextLength)) live = null;
    var plan = live || calculated;
    if (!plan) return '<p style="font-size:12px;color:var(--text3);padding:12px 0">분할 계획을 계산할 수 없습니다.</p>';

    var stageLabels = {
      planned: '실행 대기', direct: '1회 직접 처리', splitting: '구간별 요약 처리 중',
      merging: '부분 요약 결합 중', reducing: '통합 입력 재압축 중', finalizing: '최종 종합 요약 중',
      complete: '최종 통합 완료', failed: '처리 실패', cancelled: '사용자 중단'
    };
    var statusLabels = { planned: '대기', ready: '직접 처리', processing: '처리 중', complete: '완료', failed: '실패' };
    var providerLabel = plan.provider === 'aistudio' ? 'AI Studio' : (plan.provider === 'lmstudio' ? 'LM Studio' : '자동 · LM Studio 우선');
    var completed = Number(plan.completedParts) || 0;
    var total = Math.max(1, Number(plan.totalParts) || (plan.parts && plan.parts.length) || 1);
    var progress = plan.stage === 'complete' ? 100 : Math.min(99, Math.round((completed / total) * 80) + (/merging|reducing|finalizing/.test(plan.stage || '') ? 15 : 0));
    var html = '<div style="padding:9px 10px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;font-size:10px;color:var(--text2);line-height:1.55">'
      + '<div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><b style="color:var(--text)">📚 추출 텍스트 분할 처리</b><span style="color:' + (plan.stage === 'failed' ? 'var(--danger)' : plan.stage === 'complete' ? 'var(--success)' : 'var(--accent)') + '">' + escapeHtml(stageLabels[plan.stage] || plan.stage || '실행 대기') + '</span></div>'
      + '<div style="margin-top:5px">대상 ' + Number(plan.sourceChars || 0).toLocaleString() + '자 · 약 ' + Number(plan.sourceTokens || 0).toLocaleString() + ' tokens</div>'
      + '<div>' + escapeHtml(providerLabel) + (plan.contextLength ? ' · 컨텍스트 ' + Number(plan.contextLength).toLocaleString() + ' tokens' : '') + '</div>'
      + '<div>구간당 안전 입력 약 ' + Number(plan.safeInputTokens || 0).toLocaleString() + ' tokens · 총 <b>' + total + '개 구간</b></div>'
      + '<div style="height:5px;background:var(--bg);border-radius:999px;overflow:hidden;margin-top:7px"><div style="width:' + progress + '%;height:100%;background:var(--accent);transition:width .2s"></div></div>'
      + '<div style="margin-top:4px">부분 처리 ' + completed + '/' + total + (live ? ' · 아래 결과를 자동으로 하나의 요약으로 합칩니다.' : ' · 요약 실행 시 이 계획대로 처리합니다.') + '</div>'
      + '</div>';

    html += '<div style="display:flex;flex-direction:column;gap:6px;margin-top:8px;max-height:300px;overflow-y:auto;padding-right:2px">';
    var parts = plan.parts || [];
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i] || {};
      var status = statusLabels[part.status] || part.status || '대기';
      var statusColor = part.status === 'complete' ? 'var(--success)' : part.status === 'processing' ? 'var(--accent)' : part.status === 'failed' ? 'var(--danger)' : 'var(--text3)';
      html += '<details ' + (part.status === 'processing' ? 'open' : '') + ' style="background:var(--bg2);border:1px solid var(--border);border-radius:7px;padding:7px 8px">'
        + '<summary style="cursor:pointer;font-size:10px;color:var(--text2);display:flex;align-items:center;gap:6px">'
        + '<b style="color:var(--text);flex:1">구간 ' + (part.index || i + 1) + '/' + total + '</b>'
        + '<span>' + Number(part.chars || 0).toLocaleString() + '자 · 약 ' + Number(part.tokens || 0).toLocaleString() + 't</span>'
        + '<span style="color:' + statusColor + '">' + escapeHtml(status) + '</span></summary>'
        + (part.result
          ? '<div style="margin-top:7px;padding-top:7px;border-top:1px solid var(--border);font-size:10px;line-height:1.55;color:var(--text2);white-space:pre-wrap;max-height:180px;overflow:auto">' + escapeHtml(part.result) + '</div>'
          : '<div style="margin-top:6px;font-size:10px;color:var(--text3)">이 구간의 추출 텍스트를 AI 컨텍스트 범위 안에서 처리합니다.</div>')
        + '</details>';
    }
    html += '</div>';

    if (plan.stage === 'complete') {
      html += '<div style="margin-top:8px;padding:8px 10px;border:1px solid rgba(52,211,153,.4);background:rgba(52,211,153,.08);border-radius:8px;font-size:10px;color:var(--success)">✅ ' + total + '개 구간을 하나의 최종 요약으로 통합했습니다. · 결과 약 ' + Number(plan.finalSummaryTokens || 0).toLocaleString() + ' tokens <button type="button" class="btn btn-ghost btn-xs" style="margin-left:5px" onclick="setSummarySubTab(\'current\'); renderLeftPanel();">최종 요약 보기</button></div>';
    } else if (plan.stage === 'failed' || plan.stage === 'cancelled') {
      html += '<div style="margin-top:8px;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:10px;color:var(--danger)">⚠ ' + escapeHtml(plan.error || stageLabels[plan.stage]) + '</div>';
    } else if (!live) {
      html += '<div style="margin-top:8px;font-size:10px;color:var(--text3);line-height:1.5">원본 파일 자체가 아니라 PDF·DOCX 등에서 <b>추출된 텍스트</b>가 요약 대상입니다. 전문요약 도구에서 실행하면 구간별 결과와 최종 통합 과정이 여기에 표시됩니다.</div>';
    }
    return html;
  }

  function renderTranslationSplitPanel(rawText, escapeHtml) {
    var source = typeof window.getTranslationSource === 'function' ? window.getTranslationSource('raw') : String(rawText || '');
    var calculated = typeof window.getTranslationChunkPlan === 'function' ? window.getTranslationChunkPlan(source, 'raw') : null;
    var live = typeof window.getTranslationSplitProcessing === 'function' ? window.getTranslationSplitProcessing() : null;
    if (live && (live.target !== 'raw' || !calculated || live.sourceFingerprint !== calculated.sourceFingerprint || live.provider !== calculated.provider || live.contextLength !== calculated.contextLength || live.maxOutputTokens !== calculated.maxOutputTokens)) live = null;
    var plan = live || calculated;
    if (!plan) return '<p style="font-size:12px;color:var(--text3);padding:12px 0">번역 분할 계획을 계산할 수 없습니다.</p>';

    var stageLabels = { planned: '실행 대기', translating: '구간별 번역 중', combining: '번역문 결합 중', complete: '전체 번역 완료', failed: '번역 실패', cancelled: '사용자 중단' };
    var statusLabels = { planned: '대기', processing: '번역 중', complete: '완료', failed: '실패' };
    var providerLabel = plan.provider === 'aistudio' ? 'AI Studio' : (plan.provider === 'lmstudio' ? 'LM Studio' : '자동 · LM Studio 우선');
    var completed = Number(plan.completedParts) || 0;
    var total = Math.max(1, Number(plan.totalParts) || (plan.parts && plan.parts.length) || 1);
    var progress = plan.stage === 'complete' ? 100 : Math.min(99, Math.round((completed / total) * 95) + (plan.stage === 'combining' ? 4 : 0));
    var stageColor = plan.stage === 'complete' ? 'var(--success)' : (plan.stage === 'failed' || plan.stage === 'cancelled' ? 'var(--danger)' : 'var(--accent)');
    var html = '<div style="padding:9px 10px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;font-size:10px;color:var(--text2);line-height:1.55">'
      + '<div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><b style="color:var(--text)">🌐 원문 전체 분할 번역</b><span style="color:' + stageColor + '">' + escapeHtml(stageLabels[plan.stage] || plan.stage || '실행 대기') + '</span></div>'
      + '<div style="margin-top:5px">추출 텍스트 ' + Number(plan.sourceChars || 0).toLocaleString() + '자 · 약 ' + Number(plan.sourceTokens || 0).toLocaleString() + ' tokens</div>'
      + '<div>' + escapeHtml(providerLabel) + (plan.contextLength ? ' · 컨텍스트 ' + Number(plan.contextLength).toLocaleString() + ' tokens' : '') + '</div>'
      + '<div>번역 입력 약 ' + Number(plan.safeInputTokens || 0).toLocaleString() + ' tokens/구간' + (plan.maxOutputTokens ? ' · 최대 출력 ' + Number(plan.maxOutputTokens).toLocaleString() + ' tokens' : '') + '</div>'
      + '<div>전체 <b>' + total + '개 구간</b> · 번역 완료 ' + completed + '/' + total + '</div>'
      + '<div style="height:5px;background:var(--bg);border-radius:999px;overflow:hidden;margin-top:7px"><div style="width:' + progress + '%;height:100%;background:var(--accent);transition:width .2s"></div></div>'
      + '</div>';

    if (!live) {
      html += '<button type="button" class="btn btn-primary w-full" style="justify-content:center;margin-top:8px" onclick="askThenTranslate(\'raw\')">🌐 전체 원문 분할 번역 시작</button>';
    }
    html += '<div style="display:flex;flex-direction:column;gap:6px;margin-top:8px;max-height:310px;overflow-y:auto;padding-right:2px">';
    var parts = plan.parts || [];
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i] || {};
      var status = statusLabels[part.status] || part.status || '대기';
      var statusColor = part.status === 'complete' ? 'var(--success)' : part.status === 'processing' ? 'var(--accent)' : part.status === 'failed' ? 'var(--danger)' : 'var(--text3)';
      html += '<details ' + (part.status === 'processing' ? 'open' : '') + ' style="background:var(--bg2);border:1px solid var(--border);border-radius:7px;padding:7px 8px">'
        + '<summary style="cursor:pointer;font-size:10px;color:var(--text2);display:flex;align-items:center;gap:6px"><b style="color:var(--text);flex:1">번역 ' + (part.index || i + 1) + '/' + total + '</b><span>' + Number(part.chars || 0).toLocaleString() + '자 · 약 ' + Number(part.tokens || 0).toLocaleString() + 't</span><span style="color:' + statusColor + '">' + escapeHtml(status) + '</span></summary>'
        + (part.result
          ? '<div style="margin-top:7px;padding-top:7px;border-top:1px solid var(--border);font-size:10px;line-height:1.6;color:var(--text2);white-space:pre-wrap;max-height:210px;overflow:auto">' + escapeHtml(part.result) + '</div>'
          : '<div style="margin-top:6px;font-size:10px;color:var(--text3)">이 구간을 생략하거나 요약하지 않고 한국어로 번역합니다.</div>')
        + '</details>';
    }
    html += '</div>';

    if (plan.stage === 'complete') {
      html += '<div style="margin-top:8px;padding:8px 10px;border:1px solid rgba(52,211,153,.4);background:rgba(52,211,153,.08);border-radius:8px;font-size:10px;color:var(--success)">✅ 번역 ' + total + '개를 원문 순서대로 결합했습니다. · 결과 약 ' + Number(plan.combinedTokens || 0).toLocaleString() + ' tokens <button type="button" class="btn btn-ghost btn-xs" style="margin-left:5px" onclick="viewTranslation(\'raw\')">전체 번역 보기</button></div>';
    } else if (plan.stage === 'failed' || plan.stage === 'cancelled') {
      html += '<div style="margin-top:8px;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:10px;color:var(--danger)">⚠ ' + escapeHtml(plan.error || stageLabels[plan.stage]) + '<div style="color:var(--text3);margin-top:3px">완료된 구간은 위에서 펼쳐 확인할 수 있습니다.</div></div>';
    } else if (!live) {
      html += '<div style="margin-top:8px;font-size:10px;color:var(--text3);line-height:1.5">PDF·DOCX 등에서 추출된 전체 텍스트를 컨텍스트와 최대 출력 토큰에 맞춰 나눕니다. 각 구간을 전부 번역한 후 원래 순서대로 하나의 번역문으로 결합합니다.</div>';
    }
    return html;
  }

  function renderLeftPanel() {
    var content = document.getElementById('left-content');
    var rawText = typeof window.getRawText === 'function' ? window.getRawText() : '';
    var fileSlots = (typeof window.getFileSlots === 'function' ? window.getFileSlots() : []) || [];
    var slideMsOnly = typeof window._slideManuscriptText === 'string' && String(window._slideManuscriptText).trim();
    var hasContent = rawText || fileSlots.length || slideMsOnly;
    if (!hasContent) {
      content.innerHTML = '<div class="upload-zone" id="upload-drop-zone" onclick="document.getElementById(\'file-input\').click()" ondragover="handleDragOver(event)" ondrop="handleDrop(event)" ondragleave="handleDragLeave()">'
        + '<input type="file" id="file-input" style="display:none" accept=".pdf,.docx,.txt,.md" onchange="handleFileUpload(event)"/>'
        + '<span class="upload-icon">📄</span><h3>논문/ 소스파일 업로드</h3><p>PDF, DOCX, TXT, MD · 드래그 앤 드롭</p></div>'
        + '<div class="text-input-zone"><label class="label" style="margin-top:12px">또는 텍스트 직접 붙여넣기</label>'
        + '<textarea id="text-paste-input" placeholder="논문 본문을 여기에 붙여넣으세요..." rows="6"></textarea>'
        + '<button class="btn btn-ghost w-full mt-2" style="justify-content:center" onclick="loadFromTextInput()">✅ 텍스트 로드</button></div>'
        + '<div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border)">'
        + '<p style="font-size:11px;color:var(--text3);margin-bottom:8px;line-height:1.45">메인 논문 없이 <strong>슬라이드 원고</strong>만 올려도 전체 메뉴가 열리고, <b>슬라이드</b> 탭에서 UP Slide 생성을 사용할 수 있습니다.</p>'
        + '<input type="file" id="slide-manuscript-input-landing" accept=".txt,.md,.pdf" style="display:none" onchange="handleSlideManuscriptUpload(event)"/>'
        + '<button type="button" class="btn btn-ghost w-full" style="justify-content:center;font-size:12px;padding:10px 12px;border:1px dashed var(--border2);border-radius:8px" onclick="document.getElementById(\'slide-manuscript-input-landing\').click()">📤 SLIDE 원고 UP <span style="opacity:0.85">(.txt · .md · .pdf)</span></button>'
        + '</div>';
      return;
    }
    var elSum = document.getElementById('custom-instruction-summary');
    var elMan = document.getElementById('custom-instruction-manuscript');
    if (elSum) try { localStorage.setItem('ss_custom_instruction_summary', elSum.value); } catch (e) {}
    if (elMan) try { localStorage.setItem('ss_custom_instruction_manuscript', elMan.value); } catch (e) {}
    var leftTab = typeof window.getLeftTab === 'function' ? window.getLeftTab() : 'summary';
    var summaryText = typeof window.getSummaryText === 'function' ? window.getSummaryText() : '';
    var presentationScript = typeof window.getPresentationScript === 'function' ? window.getPresentationScript() : [];
    var slides = typeof window.getSlides === 'function' ? window.getSlides() : [];
    var fileName = typeof window.getFileName === 'function' ? window.getFileName() : '';
    var writingStyle = typeof window.getWritingStyle === 'function' ? window.getWritingStyle() : 'academic-da';
    var escapeHtml = typeof window.escapeHtml === 'function' ? window.escapeHtml : function (s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); };
    var displayContent = '';

    if (leftTab === 'script' && typeof window.buildManuscriptTabContent === 'function') {
      var customVal = (elMan && elMan.value) || (typeof localStorage !== 'undefined' && localStorage.getItem('ss_custom_instruction_manuscript')) || '';
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
      var subTabsHtml = '<div class="translate-row" style="margin-bottom:8px;flex-wrap:wrap"><button type="button" class="btn btn-ghost btn-xs ' + (subTab === 'current' ? 'active' : '') + '" onclick="setSummarySubTab(\'current\'); renderLeftPanel();">현재 요약</button><button type="button" class="btn btn-ghost btn-xs ' + (subTab === 'split' ? 'active' : '') + '" onclick="setSummarySubTab(\'split\'); renderLeftPanel();">분할 처리</button><button type="button" class="btn btn-ghost btn-xs ' + (subTab === 'history' ? 'active' : '') + '" onclick="setSummarySubTab(\'history\'); renderLeftPanel();">요약 히스토리</button></div>';
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
      } else if (subTab === 'split') {
        displayContent = subTabsHtml + renderSummarySplitPanel(rawText, escapeHtml);
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
      var aiReflowDisabled = !!window._rawAiReflowRunning;
      var aiBtnTitle = window._rawAiReflowRunning
        ? '원문 AI 정리가 진행 중입니다.'
        : '원문 탭에 보이는 텍스트에 AI 가독성 정리(백그라운드). 조건 미충족 시 안내합니다.';
      var rawSubTab = (typeof window.getRawSubTab === 'function' && window.getRawSubTab()) || 'source';
      var rawSubTabsHtml = '<div class="translate-row" style="margin-bottom:8px"><button type="button" class="btn btn-ghost btn-xs ' + (rawSubTab === 'source' ? 'active' : '') + '" onclick="setRawSubTab(\'source\'); renderLeftPanel();">추출 원문</button><button type="button" class="btn btn-ghost btn-xs ' + (rawSubTab === 'translation' ? 'active' : '') + '" onclick="setRawSubTab(\'translation\'); renderLeftPanel();">번역 처리</button></div>';
      if (rawSubTab === 'translation') {
        displayContent = rawSubTabsHtml + renderTranslationSplitPanel(rawText, escapeHtml);
      } else {
        displayContent = rawSubTabsHtml + '<div class="translate-row">'
          + '<button class="btn btn-ghost btn-xs" onclick="askThenTranslate(\'raw\')">🌐 한국어 번역</button>'
          + (window._translatedRaw ? '<button class="btn btn-xs" style="background:var(--accent);color:#fff;border-radius:6px;padding:2px 8px;font-size:11px;cursor:pointer;border:none" onclick="viewTranslation(\'raw\')">📖 번역보기</button>' : '')
          + '<button type="button" class="btn btn-ghost btn-xs" title="' + escapeHtml(aiBtnTitle) + '" onclick="runRawTextAiReflowBackground()" ' + (aiReflowDisabled ? 'disabled' : '') + '>AI 정리</button>'
          + (rawText.length > 5000 ? '<button class="btn btn-ghost btn-xs" onclick="openFullTextWindow()">🔲 새창보기</button>' : '')
          + '<button class="btn btn-ghost btn-xs" onclick="openRefExpWindow()" title="참고문헌만 추출하여 새 창에 보기">📚 REF EXP</button>'
          + '</div><div class="left-panel-raw-text">' + escapeHtml(rawText) + '</div>';
      }
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
        displayContent = '<div class="translate-row"><button class="btn btn-ghost btn-xs" onclick="saveContent(\'script\')">💾 발표 저장</button></div>' + scriptParts.join('');
      }
    }
    var fileSlotsHtml = '';
    if (fileSlots.length) {
      fileSlotsHtml = '<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:10px">';
      for (var si = 0; si < fileSlots.length; si++) {
        var slot = fileSlots[si];
        var sizeK = ((slot.rawText || '').length / 1000).toFixed(1);
        var isPdfSlot = (slot.fileName || '').toLowerCase().endsWith('.pdf');
        fileSlotsHtml += '<div class="file-badge" style="display:flex;align-items:center;gap:8px;padding:8px 10px">'
          + '<label style="display:flex;align-items:center;cursor:pointer;flex-shrink:0"><input type="checkbox" ' + (slot.checked !== false ? 'checked' : '') + ' onchange="toggleFileSlotCheck(\'' + (slot.id || '').replace(/'/g, "\\'") + '\'); renderLeftPanel();" style="accent-color:var(--accent)"/></label>'
          + '<span>' + (isPdfSlot ? '📄' : '📝') + '</span>'
          + '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0">' + escapeHtml(slot.fileName || '제목 없음') + '</span>'
          + '<span class="file-size">' + sizeK + 'k</span>'
          + (isPdfSlot ? '<button onclick="openPdfPreviewForSlot(\'' + (slot.id || '').replace(/'/g, "\\'") + '\')" style="font-size:10px;padding:2px 8px;border-radius:4px;border:1px solid rgba(79,142,247,0.4);background:var(--accent-glow);color:var(--accent);cursor:pointer;font-weight:600;flex-shrink:0">👁 미리보기</button>' : '')
          + '<button type="button" onclick="removeFileSlot(\'' + (slot.id || '').replace(/'/g, "\\'") + '\'); renderLeftPanel();" style="flex-shrink:0;padding:2px 6px;background:transparent;border:none;color:var(--text3);cursor:pointer;font-size:12px" title="삭제">&#10005;</button>'
          + '</div>';
      }
      fileSlotsHtml += '</div>';
      if (leftTab === 'raw') {
        fileSlotsHtml += '<button class="btn btn-ghost w-full mt-2" style="justify-content:center;font-size:11px;margin-bottom:10px" onclick="document.getElementById(\'file-input2\').click()"' + (fileSlots.length >= 10 ? ' disabled title="최대 10개까지 추가 가능"' : '') + '>📂 다른 파일 열기<input type="file" id="file-input2" style="display:none" accept=".pdf,.docx,.txt,.md" onchange="handleFileUpload(event)"/></button>';
      }
    } else {
      var _isPdf = (fileName || '').toLowerCase().endsWith('.pdf');
      fileSlotsHtml = '<div class="file-badge">'
        + '<span>' + (_isPdf ? '📄' : '📝') + '</span>'
        + '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:120px">' + escapeHtml(fileName || '') + '</span>'
        + '<span class="file-size">' + (rawText.length / 1000).toFixed(1) + 'k</span>'
        + (_isPdf ? '<button onclick="openPdfPreview()" style="margin-left:auto;font-size:10px;padding:2px 8px;border-radius:4px;border:1px solid rgba(79,142,247,0.4);background:var(--accent-glow);color:var(--accent);cursor:pointer;font-weight:600;flex-shrink:0">👁 미리보기</button>' : '')
        + '</div>';
      if (leftTab === 'raw') {
        fileSlotsHtml += '<button class="btn btn-ghost w-full mt-2" style="justify-content:center;font-size:11px;margin-bottom:10px" onclick="document.getElementById(\'file-input2\').click()"' + (fileSlots.length >= 10 ? ' disabled title="최대 10개까지 추가 가능"' : '') + '>📂 다른 파일 열기<input type="file" id="file-input2" style="display:none" accept=".pdf,.docx,.txt,.md" onchange="handleFileUpload(event)"/></button>';
      }
    }
    var totalChars = rawText.length;
    var summaryLimit = parseInt((typeof localStorage !== 'undefined' && localStorage.getItem('ss_summary_char_limit')) || '1500000', 10) || 1500000;
    summaryLimit = Math.max(10000, Math.min(2000000, summaryLimit));
    var willTruncate = totalChars > summaryLimit;
    var estimatedTokens = typeof window.estimateAITokens === 'function' ? window.estimateAITokens(rawText) : Math.ceil(totalChars / 2);
    var lmContext = Number(typeof localStorage !== 'undefined' && localStorage.getItem('ss_lm_context_length')) || 0;
    var safeInputTokens = lmContext ? Math.max(768, Math.floor(lmContext * 0.65)) : 3000;
    var tokenRatio = lmContext ? estimatedTokens / lmContext : 0;
    var splitMode = (typeof localStorage !== 'undefined' && localStorage.getItem('ss_lm_split_mode')) || 'auto';
    var minimumParts = splitMode !== 'auto' ? Math.max(1, Number(splitMode) || 1) : 1;
    var estimatedParts = Math.max(minimumParts, Math.ceil(estimatedTokens / safeInputTokens));
    var capacityInfo = '<div class="file-capacity-info" style="margin-bottom:10px;padding:6px 10px;background:var(--surface2);border-radius:8px;border:1px solid var(--border);font-size:10px;color:var(--text2);line-height:1.5">'
      + '<div style="font-weight:600;color:var(--text);margin-bottom:4px">📊 원본 용량</div>'
      + '<div>원문 총 ' + totalChars.toLocaleString() + '자</div>'
      + '<div>추정 토큰 약 ' + estimatedTokens.toLocaleString() + ' tokens</div>'
      + (lmContext ? '<div>LM 컨텍스트 ' + lmContext.toLocaleString() + ' tokens · 원문은 약 <b>' + tokenRatio.toFixed(tokenRatio >= 10 ? 0 : 1) + '배</b></div>' : '<div style="color:var(--warning)">LM 컨텍스트 길이 확인 필요</div>')
      + '<div>예상 처리: <b style="color:var(--accent)">' + estimatedParts + '개 부분 처리 → 최종 통합</b></div>'
      + '<div>요약 한도 ' + (summaryLimit / 1000).toFixed(0) + 'k자 (설정에서 변경 가능)</div>'
      + (willTruncate ? '<div style="margin-top:4px;color:var(--warning)">⚠ 앞 ' + (summaryLimit / 1000).toFixed(0) + 'k자만 요약됩니다</div>' : '<div style="margin-top:4px;color:var(--success)">✓ 전체 원문이 요약 대상입니다</div>')
      + '</div>';
    var showWritingStyle = (typeof localStorage !== 'undefined' && (leftTab === 'raw' ? localStorage.getItem('ss_show_writing_style_raw') : localStorage.getItem('ss_show_writing_style_summary')) === '1');
    var writingStyleHtml = showWritingStyle
      ? '<div style="margin-bottom:8px"><label class="label">문체 설정</label><select class="control" id="writing-style-val" onchange="setWritingStyle(this.value)" style="font-size:11px">'
      + '<option value="academic-da" ' + (writingStyle === 'academic-da' ? 'selected' : '') + '>학술체 (~이다)</option>'
      + '<option value="academic-im" ' + (writingStyle === 'academic-im' ? 'selected' : '') + '>학술체 (~임, ~함)</option>'
      + '<option value="polite" ' + (writingStyle === 'polite' ? 'selected' : '') + '>일반체 (존댓말)</option></select></div>'
      : '<select class="control" id="writing-style-val" onchange="setWritingStyle(this.value)" style="display:none">'
      + '<option value="academic-da" ' + (writingStyle === 'academic-da' ? 'selected' : '') + '>학술체 (~이다)</option>'
      + '<option value="academic-im" ' + (writingStyle === 'academic-im' ? 'selected' : '') + '>학술체 (~임, ~함)</option>'
      + '<option value="polite" ' + (writingStyle === 'polite' ? 'selected' : '') + '>일반체 (존댓말)</option></select>';
    content.innerHTML = fileSlotsHtml + capacityInfo
      + writingStyleHtml
      + '<div class="action-grid">'
      + '<button class="action-card" onclick="openSummaryOptionsModal()"><span class="action-card-icon">📖</span>전문요약 도구</button>'
      + '<button class="action-card" onclick="openSummaryOptionsModal()"><span class="action-card-icon">📋</span>슬라이드 초안제작</button></div>'
      + (function () {
        var showCustom = leftTab === 'raw' ? (localStorage.getItem('ss_show_custom_instruction_raw') === '1') : (localStorage.getItem('ss_show_custom_instruction_summary') === '1');
        if (typeof localStorage === 'undefined') showCustom = false;
        return showCustom
          ? '<label class="label">커스텀 지시사항</label><textarea class="control" id="custom-instruction-summary" rows="2" placeholder="예: supplement·information theory까지 요약, 20페이지 분량 괜찮음...">' + escapeHtml((elSum && elSum.value) || (typeof localStorage !== 'undefined' && localStorage.getItem('ss_custom_instruction_summary')) || '') + '</textarea>'
          : '<textarea class="control" id="custom-instruction-summary" rows="2" placeholder="" style="display:none">' + escapeHtml((elSum && elSum.value) || (typeof localStorage !== 'undefined' && localStorage.getItem('ss_custom_instruction_summary')) || '') + '</textarea>';
      }())
      + '<hr class="sep"/>' + displayContent;
  }

  window.renderLeftPanel = renderLeftPanel;
})();

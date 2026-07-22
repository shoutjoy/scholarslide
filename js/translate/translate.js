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

  let translationRenderTimer = null;
  function estimateTokens(text) {
    return typeof window.estimateAITokens === 'function'
      ? window.estimateAITokens(String(text || ''))
      : Math.ceil(String(text || '').length / 4);
  }
  function sourceFingerprint(text) {
    text = String(text || '');
    const sample = text.slice(0, 600) + '|' + text.slice(-600);
    let hash = 2166136261;
    for (let i = 0; i < sample.length; i++) {
      hash ^= sample.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return text.length + ':' + (hash >>> 0).toString(16);
  }
  function getLmMaxOutputTokens(contextLength) {
    let configured = 8192;
    try {
      if (window.LocalAI && typeof window.LocalAI.loadConfig === 'function') {
        configured = Number(window.LocalAI.loadConfig(localStorage).maxTokens) || configured;
      }
    } catch (e) {}
    return contextLength
      ? Math.max(512, Math.min(configured, Math.floor(contextLength * 0.25)))
      : Math.min(configured, 2048);
  }
  function splitAtNaturalBoundaries(text, targetChars, minimumParts) {
    text = String(text || '');
    if (!text) return [];
    const required = Math.max(minimumParts || 1, Math.ceil(text.length / Math.max(1, targetChars)));
    if (required <= 1) return [text];
    const chunks = [];
    let start = 0;
    for (let index = 0; index < required - 1 && start < text.length; index++) {
      const remainingParts = required - index;
      const ideal = start + Math.ceil((text.length - start) / remainingParts);
      const lower = start + Math.floor((ideal - start) * 0.72);
      const upper = Math.min(text.length, ideal + Math.min(1800, Math.floor((ideal - start) * 0.15)));
      let cut = text.lastIndexOf('\n\n', upper);
      if (cut < lower) cut = text.lastIndexOf('\n', upper);
      if (cut < lower) cut = text.lastIndexOf(' ', upper);
      if (cut < lower || cut <= start) cut = ideal;
      else if (text.slice(cut, cut + 2) === '\n\n') cut += 2;
      else cut += 1;
      chunks.push(text.slice(start, cut));
      start = cut;
    }
    if (start < text.length) chunks.push(text.slice(start));
    return chunks.filter(function (chunk) { return !!chunk; });
  }
  function getTranslationChunkPlan(text, target) {
    text = String(text || '');
    const providerSetting = (typeof localStorage !== 'undefined' && localStorage.getItem('ss_scholar_ai_provider')) || 'auto';
    const useAIStudio = providerSetting === 'aistudio'
      && !!(typeof localStorage !== 'undefined' && localStorage.getItem('ss_active_key'));
    const contextLength = Number(typeof localStorage !== 'undefined' && localStorage.getItem('ss_lm_context_length')) || 0;
    const maxOutputTokens = useAIStudio ? 0 : getLmMaxOutputTokens(contextLength);
    const sample = text.slice(0, Math.min(text.length, 12000));
    const latinCount = (sample.match(/[A-Za-z]/g) || []).length;
    const latinRatio = sample.length ? latinCount / sample.length : 0;
    // English-to-Korean output generally consumes considerably more tokens
    // than its English input. Keep the input below the available output cap.
    const outputSafeRatio = latinRatio > 0.45 ? 0.42 : 0.72;
    const contextInputBudget = contextLength ? Math.floor(contextLength * 0.42) : 2400;
    const safeInputTokens = useAIStudio
      ? 7000
      : Math.max(384, Math.min(contextInputBudget, Math.floor(maxOutputTokens * outputSafeRatio)));
    const sourceTokens = estimateTokens(text);
    const charsPerToken = sourceTokens > 0 ? text.length / sourceTokens : 2;
    const targetChars = Math.max(900, Math.min(1000000, Math.floor(safeInputTokens * charsPerToken)));
    const splitSetting = typeof localStorage !== 'undefined' ? localStorage.getItem('ss_lm_split_mode') : 'auto';
    const minimumParts = splitSetting && splitSetting !== 'auto' ? Math.max(1, Number(splitSetting) || 1) : 1;
    const chunks = splitAtNaturalBoundaries(text, targetChars, minimumParts);
    return {
      target: target || 'raw',
      sourceChars: text.length,
      sourceTokens: sourceTokens,
      sourceFingerprint: sourceFingerprint(text),
      provider: useAIStudio ? 'aistudio' : (providerSetting === 'lmstudio' ? 'lmstudio' : 'auto'),
      contextLength: useAIStudio ? 0 : contextLength,
      maxOutputTokens: maxOutputTokens,
      safeInputTokens: safeInputTokens,
      totalParts: chunks.length || 1,
      completedParts: 0,
      stage: 'planned',
      active: false,
      chunks: chunks,
      parts: chunks.map(function (chunk, index) {
        return { index: index + 1, chars: chunk.length, tokens: estimateTokens(chunk), status: 'planned', result: '' };
      })
    };
  }
  function scheduleTranslationRender() {
    if (translationRenderTimer) clearTimeout(translationRenderTimer);
    translationRenderTimer = setTimeout(function () {
      translationRenderTimer = null;
      if (typeof window.renderLeftPanel === 'function'
          && (!window.getLeftTab || window.getLeftTab() === 'raw')) window.renderLeftPanel();
    }, 50);
  }
  function setTranslationState(state) {
    const stored = Object.assign({}, state || {}, { updatedAt: Date.now() });
    delete stored.chunks;
    window._translationSplitProcessing = stored;
    scheduleTranslationRender();
    return stored;
  }
  function updateTranslationState(patch) {
    const state = window._translationSplitProcessing || {};
    Object.keys(patch || {}).forEach(function (key) { state[key] = patch[key]; });
    state.updatedAt = Date.now();
    window._translationSplitProcessing = state;
    scheduleTranslationRender();
    return state;
  }
  function isTranslationCancelled() {
    return !!(window._aiTaskCancelled || window._bgJobCancelled);
  }
  async function translateInContextChunks(source, target, onProgress) {
    const plan = getTranslationChunkPlan(source, target);
    const chunks = plan.chunks.slice();
    plan.active = true;
    plan.stage = 'translating';
    if (target === 'raw' && typeof window.setRawSubTab === 'function') window.setRawSubTab('translation');
    setTranslationState(plan);
    const userPrefix = (typeof window.getPromptOverride === 'function' && window.getPromptOverride('translate_user_prefix')) || '다음 영문 텍스트를 자연스러운 학술 한국어로 번역하세요:\n\n';
    const baseSystem = (typeof window.getPromptOverride === 'function' && window.getPromptOverride('translate_system_instruction')) || '전문 학술 번역가입니다.';
    const translations = [];
    try {
      for (let i = 0; i < chunks.length; i++) {
        if (isTranslationCancelled()) throw new Error('TASK_CANCELLED');
        const state = window._translationSplitProcessing;
        if (state && state.parts[i]) state.parts[i].status = 'processing';
        scheduleTranslationRender();
        if (onProgress) onProgress(i, chunks.length, 'translating');
        const prompt = userPrefix
          + '[전체 문서 중 번역 구간 ' + (i + 1) + '/' + chunks.length + ']\n'
          + '요약하거나 생략하지 말고 제목, 문단, 목록, 표기와 페이지 구분을 가능한 한 유지하세요. 번역문만 출력하세요.\n\n'
          + chunks[i];
        const res = await window.callGemini(
          prompt,
          baseSystem + ' 전체 문서의 한 구간을 번역합니다. 내용을 요약·축약·추가하지 말고 원문의 순서와 의미를 보존하세요.'
        );
        const translatedPart = String(res && res.text ? res.text : res || '').trim();
        translations.push(translatedPart);
        if (state && state.parts[i]) {
          state.parts[i].status = 'complete';
          state.parts[i].result = translatedPart;
          state.completedParts = i + 1;
        }
        scheduleTranslationRender();
        if (onProgress) onProgress(i + 1, chunks.length, 'translating');
      }
    } catch (error) {
      const failedState = window._translationSplitProcessing;
      if (failedState && failedState.parts) {
        failedState.parts.forEach(function (part) { if (part.status === 'processing') part.status = 'failed'; });
      }
      updateTranslationState({
        active: false,
        stage: error && (error.name === 'AbortError' || error.message === 'TASK_CANCELLED') ? 'cancelled' : 'failed',
        error: error && error.message ? error.message : String(error || '')
      });
      throw error;
    }
    updateTranslationState({ stage: 'combining', active: true });
    const combined = translations.join('\n\n');
    updateTranslationState({
      stage: 'complete', active: false, completedParts: chunks.length,
      combinedChars: combined.length, combinedTokens: estimateTokens(combined), error: ''
    });
    if (onProgress) onProgress(chunks.length, chunks.length, 'complete');
    return combined;
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
    const plan = getTranslationChunkPlan(source, target);
    const planNote = '\n\n컨텍스트에 맞춰 ' + plan.totalParts + '개 구간으로 나누어 전부 번역한 후 하나로 합칩니다.';
    if (window.showConfirm) {
      window.showConfirm(
        '🌐 ' + label + ' 한국어 번역',
        label + ' 내용을 한국어로 번역하시겠습니까?\n원문은 그대로 보존됩니다.' + planNote + cacheNote,
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

    if (typeof window !== 'undefined') window._aiTaskCancelled = false;
    if (window.showJobProgress) window.showJobProgress('translation', '🌐 ' + label + ' 분할 번역 준비 중...', 3, '🌐');

    try {
      const text = await translateInContextChunks(source, target, function (done, total, stage) {
        const value = stage === 'complete' ? 100 : 5 + Math.round((done / Math.max(1, total)) * 90);
        if (window.updateJobProgress) window.updateJobProgress(
          'translation', value,
          stage === 'complete' ? '✅ ' + label + ' 번역 결합 완료' : '🌐 ' + label + ' 분할 번역 중... (' + Math.min(done + 1, total) + '/' + total + ')'
        );
      });
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
      const state = window._translationSplitProcessing;
      if (state && state.parts) {
        state.parts.forEach(function (part) { if (part.status === 'processing') part.status = 'failed'; });
      }
      updateTranslationState({
        active: false,
        stage: e && (e.name === 'AbortError' || e.message === 'TASK_CANCELLED') ? 'cancelled' : 'failed',
        error: e && e.message ? e.message : String(e || '')
      });
      if (window.hideJobProgress) window.hideJobProgress('translation', 500);
      if (e && (e.name === 'AbortError' || e.message === 'TASK_CANCELLED')) {
        if (window.showToast) window.showToast('⏹ 번역이 중단되었습니다. 완료된 구간 번역은 번역 처리 탭에서 확인할 수 있습니다.');
      } else if (window.showToast) window.showToast('❌ 번역 실패: ' + e.message);
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
    const text = await translateInContextChunks(raw, 'raw', function (done, total, stage) {
      if (window.updateJobProgress) window.updateJobProgress(
        'translation', stage === 'complete' ? 100 : 5 + Math.round((done / Math.max(1, total)) * 90),
        stage === 'complete' ? '✅ 원문 분할 번역 결합 완료' : '🌐 원문 분할 번역 중... (' + Math.min(done + 1, total) + '/' + total + ')'
      );
    });
    window._translatedRaw = text;
    return text || '';
  }

  /** 번역 캐시가 있으면 반환, 없으면 번역 후 캐시 저장하고 반환. (창은 열지 않음) */
  async function ensureTranslated(target) {
    const cached = getTranslated(target);
    if (cached) return cached;
    const source = getSource(target);
    if (!source) return '';
    if (typeof window !== 'undefined') window._aiTaskCancelled = false;
    if (window.showJobProgress) window.showJobProgress('translation', '🌐 한국어 분할 번역 준비 중...', 3, '🌐');
    try {
      const text = await translateInContextChunks(source, target, function (done, total, stage) {
        if (window.updateJobProgress) window.updateJobProgress(
          'translation', stage === 'complete' ? 100 : 5 + Math.round((done / Math.max(1, total)) * 90),
          stage === 'complete' ? '✅ 한국어 번역 결합 완료' : '🌐 분할 번역 중... (' + Math.min(done + 1, total) + '/' + total + ')'
        );
      });
      setTranslated(target, text);
      if (window.renderLeftPanel) window.renderLeftPanel();
      return text;
    } finally {
      if (window.hideJobProgress) window.hideJobProgress('translation', 0);
    }
  }

  window.askThenTranslate = askThenTranslate;
  window.translateContent = translateContent;
  window.openTranslationWindow = openTranslationWindow;
  window.viewTranslation = viewTranslation;
  window.getRawTextForSummary = getRawTextForSummary;
  window.ensureTranslated = ensureTranslated;
  window.getTranslationSource = getSource;
  window.getTranslationChunkPlan = getTranslationChunkPlan;
  window.getTranslationSplitProcessing = function () { return window._translationSplitProcessing || null; };
})();

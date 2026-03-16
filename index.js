

// =====================================================
// V3.1 FIX APPLIED
// CSS 기반 이미지 잘림 문제 해결 (object-fit: contain + overflow 수정)
// =====================================================

// STATE, ReferenceStore, _exposeSlideGenGlobals, getSavedRefList/saveRefList/addToSavedList → js/core/state.js

// formatAPA, formatInTextAPA, formatChicago, formatMLA, formatCitation, formatInText, addParsedRef, parseAPA → js/features/references.js
// switchRefTab, renderSavedRefList, filterSavedRefList, clearSavedRefList, loadFromSavedList, deleteSavedRef → js/features/references.js
// removeRef, clearAllReferences, saveRefToLocalList, _trackFocus, insertInTextCitation, makeRefSlide, addReferenceFromModal, addRefsSlide, renderRefsPanel → js/features/references.js

/* =========================================================
   SCHOLAR AI SEARCH (req. 8)
   ========================================================= */
async function searchScholarAI() {
  const query = document.getElementById('scholar-search-input').value.trim();
  if (!query) { showToast('⚠️ 검색어를 입력하세요'); return; }
  const container = document.getElementById('scholar-results');
  container.innerHTML = '<p style="font-size:11px;color:var(--text2)">🔍 AI Scholar 검색 중...</p>';
  try {
    const promptTemplate = (typeof window.getPromptOverride === 'function' && window.getPromptOverride('scholar_search_prompt')) || `다음 주제와 관련된 실제 학술 논문 5편을 JSON 배열로만 응답하세요 (코드블록, 마크다운 없이 순수 JSON만):\n[{"authors":"Last, F., & Last2, F2.","year":"2023","title":"논문 제목","journal":"저널명","volume":"15","issue":"2","pages":"100-120","doi":""}]\n주제: {{query}}`;
    const prompt = promptTemplate.replace(/\{\{query\}\}/g, query);
    const systemInstruction = (typeof window.getPromptOverride === 'function' && window.getPromptOverride('scholar_search_system')) || 'You are a scholar database. Return ONLY valid JSON array, no markdown.';
    const { text } = await callGemini(prompt, systemInstruction, false);
    const clean = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
    const match = clean.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('응답에서 JSON을 찾을 수 없음');
    const results = JSON.parse(match[0]);
    if (!results.length) throw new Error('검색 결과 없음');
    container.innerHTML = results.map(r => `
      <div class="scholar-item">
        <div class="scholar-item-title">${escapeHtml(r.title)}</div>
        <div class="scholar-item-meta">${escapeHtml(r.authors)} (${escapeHtml(r.year)}) — ${escapeHtml(r.journal)}</div>
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:6px">
          <button class="scholar-add-btn" onclick='scholarAddRef(${JSON.stringify(r).replace(/</g, "&lt;").replace(/>/g, "&gt;")},this)'>+ 참고문헌 추가</button>
          <button class="scholar-list-btn" onclick='scholarSaveList(${JSON.stringify(r).replace(/</g, "&lt;").replace(/>/g, "&gt;")},this)'>📌 목록에 저장</button>
        </div>
      </div>`).join('');
  } catch (e) {
    container.innerHTML = `<p style="font-size:11px;color:var(--danger)">검색 실패: ${escapeHtml(e.message)}</p>`;
  }
}

function scholarAddRef(data, btn) {
  ReferenceStore.add({ ...data });
  renderRefsPanel();
  btn.textContent = '✅ 추가됨';
  btn.disabled = true;
  btn.style.opacity = '0.6';
  showToast('✅ 참고문헌에 추가됨');
}

function scholarSaveList(data, btn) {
  addToSavedList(data);
  btn.textContent = '✅ 저장됨';
  btn.disabled = true;
  btn.style.opacity = '0.6';
  showToast('✅ 로컬 목록에 저장됨');
}

/* =========================================================
   SOURCES PANEL (req. 7)
   ========================================================= */
function renderSources() {
  const el = document.getElementById('sources-list');
  if (!el) return;
  if (!sources.length) { el.innerHTML = '<p class="placeholder-msg">출처를 찾지 못했습니다.</p>'; return; }
  el.innerHTML = sources.filter(s => s.uri && s.title).map(s => `
    <div class="source-card">
      <div class="source-title">${escapeHtml(s.title)}</div>
      <a href="${escapeHtml(s.uri)}" target="_blank" rel="noopener" class="source-link">🔗 링크 보기</a>
      <div style="margin-top:5px">
        <button class="ref-insert-btn" onclick='scholarAddRef(${JSON.stringify({ authors: "", year: "", title: s.title, journal: "", volume: "", issue: "", pages: "", doi: "" }).replace(/</g, "&lt;").replace(/>/g, "&gt;")},this)'>📚 참고문헌 추가</button>
      </div>
    </div>`).join('');
}

/* =========================================================
   IMAGE UPLOAD & CROP (req. 1)
   ========================================================= */
// [V3.1: openImageModal, loadImageForCrop, applyCrop, resetCrop replaced by patch]
// Patch openModal to setup crop events after modal opens
const _origOpenModal_crop = typeof openModal !== 'undefined' ? openModal : null;

// showConfirm, askThenSummary, askThenFetchSources, askThenGenerateScript, askThenGenerateImages, askThenRewrite → js/core/helpers.js
// showGlobalProgress, updateGlobalProgress, hideGlobalProgress, showLoading, setProgress, hideLoading, abortCurrentTask, showToast, escapeHtml, autoResize, switchTab, switchRightTab → js/core/helpers.js
// openIDB, idbPut, idbGet, idbGetAll, idbGetAllKeys, idbDelete, buildWorkspaceSnapshot, autoSaveNow, scheduleAutosave, updateAutosaveIndicator, restoreAutosave, applyWorkspaceSnapshot, _markDirty → js/core/storage.js
// openProjectModal, exportProjectFile, importProjectFile, switchLoadTab, renderAutosaveTab, restoreAutosaveAndClose, clearAutosave, saveSession, loadSessions, openLoadModal, renderSessionsList, loadSession, renameSession, deleteSession → js/core/storage.js

/* =========================================================
   GEMINI API
   ========================================================= */
async function callGemini(prompt, systemInstruction = '', useSearch = false) {
  let key; try { key = getApiKey(); } catch { showToast('⚠️ API 키를 먼저 설정하세요'); openApiModal(); throw new Error('No API key'); }
  _abortController = new AbortController();
  const payload = { contents: [{ parts: [{ text: prompt }] }], systemInstruction: { parts: [{ text: systemInstruction }] } };
  if (useSearch) payload.tools = [{ "google_search": {} }];
  const modelId = typeof getTextModelId === 'function' ? getTextModelId() : 'gemini-2.5-pro';
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${key}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload), signal: _abortController.signal
  });
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err?.error?.message || `HTTP ${res.status}`); }
  const result = await res.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const srcs = result.candidates?.[0]?.groundingMetadata?.groundingAttributions?.map(a => ({ uri: a.web?.uri, title: a.web?.title })) || [];
  return { text, sources: srcs };
}

function _extractImageFromGeminiResponse(data) {
  const cand = data.candidates?.[0];
  if (!cand) return null;
  const parts = cand.content?.parts || [];
  for (const p of parts) {
    const inline = p.inlineData || p.inline_data;
    if (inline && inline.data) return `data:${inline.mimeType || inline.mime_type || 'image/png'};base64,${inline.data}`;
  }
  return null;
}

async function generateImage(prompt, options = {}) {
  const aspectRatio = options.aspectRatio || (typeof getImageAspectRatio === 'function' ? getImageAspectRatio() : '1:1');
  const seedImage = options.seedImage || null;
  const modelOverride = options.modelId || null;
  let key;
  try { key = getImageApiKey(); } catch (e) { if (e && e.message === 'NO_API_KEY') throw e; return null; }
  if (window._aiTaskCancelled) throw new DOMException('Aborted', 'AbortError');
  if (!_abortController) _abortController = new AbortController();
  const signal = _abortController.signal;
  const modelId = modelOverride || (typeof getImageModelId === 'function' ? getImageModelId() : 'gemini-3.1-flash-image-preview');
  const hasSeed = seedImage && typeof seedImage === 'string' && seedImage.startsWith('data:image');
  const faceHint = hasSeed ? ' When the image contains a face, preserve and reference facial features in the output.' : '';
  const textPrompt = hasSeed
    ? (prompt ? `${prompt}.${faceHint}` : `Use this image as reference. Generate a professional variation while preserving the main subject and composition.${faceHint}`)
    : `Create a professional academic diagram for a presentation slide: ${prompt}. Clean minimal style, blue-grey tones. Aspect ratio: ${aspectRatio}.`;
  const seedMime = seedImage && seedImage.match(/data:image\/(\w+);/)?.[1];
  const seedBase64 = seedImage && seedImage.split(',')[1];
  const parts = hasSeed
    ? [{ text: textPrompt }, { inlineData: { mimeType: seedMime ? 'image/' + seedMime : 'image/png', data: seedBase64 } }]
    : [{ text: textPrompt }];
  const partsSnake = hasSeed
    ? [{ text: textPrompt }, { inline_data: { mime_type: seedMime ? 'image/' + seedMime : 'image/png', data: seedBase64 } }]
    : null;

  const isImagen = /^imagen-4\.0-(generate|ultra-generate|fast-generate)-001$/.test(modelId);
  const effectiveModelId = (hasSeed && isImagen) ? 'gemini-3.1-flash-image-preview' : modelId;
  if (isImagen && !hasSeed) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelId}:predict?key=${key}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instances: [{ prompt: `Professional academic diagram, clean minimal style, blue-grey tones, ${aspectRatio}, white background: ${prompt}` }], parameters: { sampleCount: 1 } }),
        signal: signal
      });
      const data = res.ok ? await res.json() : null;
      if (res.ok && data?.predictions?.[0]?.bytesBase64Encoded) return `data:image/png;base64,${data.predictions[0].bytesBase64Encoded}`;
      if (!res.ok) { const err = await res.json().catch(() => ({})); lastErr = err?.error?.message || `HTTP ${res.status}`; }
    } catch (e) { lastErr = e.message || String(e); console.warn('[' + modelId + ']', e.message); }
  } else {
    const genConfigs = [
      { responseModalities: ['TEXT', 'IMAGE'], imageConfig: { aspectRatio: aspectRatio, imageSize: '2K' } },
      { responseModalities: ['TEXT', 'IMAGE'], aspectRatio: aspectRatio }
    ];
    const partsVariants = partsSnake ? [parts, partsSnake] : [parts];
    for (let vi = 0; vi < partsVariants.length; vi++) {
      const useParts = partsVariants[vi];
      for (let ci = 0; ci < genConfigs.length; ci++) {
        try {
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${effectiveModelId}:generateContent?key=${key}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ role: 'user', parts: useParts }], generationConfig: genConfigs[ci] }),
            signal: signal
          });
          const data = res.ok ? await res.json() : null;
          if (res.ok && data) {
            const img = _extractImageFromGeminiResponse(data);
            if (img) return img;
            if (data.candidates?.[0]?.finishReason) lastErr = data.candidates[0].finishReason;
          }
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            lastErr = err?.error?.message || `HTTP ${res.status}`;
            console.warn('[generateImage]', effectiveModelId, lastErr, err?.error?.details);
          }
        } catch (e) { lastErr = e.message || String(e); console.warn('[' + effectiveModelId + ']', e.message); }
      }
    }
  }

  const geminiFallbacks = ['gemini-2.0-flash-exp-image-generation', 'gemini-2.5-flash-image', 'gemini-3.1-flash-image-preview', 'gemini-3-pro-image-preview'];
  const fallbackConfig = { responseModalities: ['TEXT', 'IMAGE'], imageConfig: { aspectRatio: aspectRatio, imageSize: '2K' } };
  const fallbackPartsList = partsSnake ? [parts, partsSnake] : [parts];
  for (const fallback of geminiFallbacks) {
    if (fallback === modelId) continue;
    for (const fallbackParts of fallbackPartsList) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${fallback}:generateContent?key=${key}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ role: 'user', parts: fallbackParts }], generationConfig: fallbackConfig }),
          signal: signal
        });
        const data = res.ok ? await res.json() : null;
        if (res.ok && data) {
          const img = _extractImageFromGeminiResponse(data);
          if (img) return img;
        }
        if (!res.ok) { const err = await res.json().catch(() => ({})); lastErr = err?.error?.message || `HTTP ${res.status}`; }
      } catch (e) { lastErr = e.message || String(e); console.warn('[' + fallback + ']', e.message); }
    }
  }
  const imagenFallbacks = hasSeed ? [] : ['imagen-4.0-generate-001', 'imagen-4.0-fast-generate-001', 'imagen-4.0-ultra-generate-001'];
  for (const fb of imagenFallbacks) {
    if (fb === modelId) continue;
    try {
      const res3 = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${fb}:predict?key=${key}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instances: [{ prompt: `Professional academic diagram, clean minimal style, blue-grey tones, ${aspectRatio}, white background: ${prompt}` }], parameters: { sampleCount: 1 } }),
        signal: signal
      });
      if (res3.ok) { const data3 = await res3.json(); if (data3.predictions?.[0]?.bytesBase64Encoded) return `data:image/png;base64,${data3.predictions[0].bytesBase64Encoded}`; }
      if (!res3.ok) { const err = await res3.json().catch(() => ({})); lastErr = err?.error?.message || `HTTP ${res3.status}`; }
    } catch (e3) { lastErr = e3.message || String(e3); console.warn('[' + fb + ' fallback]', e3.message); }
  }
  if (lastErr) {
    console.warn('[generateImage] 모든 시도 실패:', lastErr);
    try { window._lastGenerateImageError = lastErr; } catch (e) {}
  }
  return null;
}

async function refineImageAPI(base64, instruction) {
  let key; try { key = getApiKey(); } catch { return null; }
  if (!base64) return null;
  if (window._aiTaskCancelled) throw new DOMException('Aborted', 'AbortError');
  if (!_abortController) _abortController = new AbortController();
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-image-generation:generateContent?key=${key}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: `Refine this academic diagram: ${instruction}. Keep professional style.` }, { inlineData: { mimeType: 'image/png', data: base64.split(',')[1] } }] }], generationConfig: { responseModalities: ['TEXT', 'IMAGE'] } }),
      signal: _abortController.signal
    });
    if (!res.ok) return null;
    const data = await res.json(); const imgPart = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (imgPart?.inlineData?.data) return `data:image/png;base64,${imgPart.inlineData.data}`;
  } catch (e) { console.error('[refineImage]', e); }
  return null;
}

// ensurePDFWorker, getPageTextWithLineBreaks, normalizeSentenceLineBreaks, handleFileUpload, loadFromTextInput, enableMainBtns,
// extractReferencesSectionFromRawText, getReferencesOnlyText, getReferencesExpCount, openRefExpWindow → js/upload/file-upload.js
// getRawTextWithReferences, resetTranslationCache, saveContent, _bgJobStart, _bgJobTick, _bgJobEnd, _cancelBgJob → js/features/refs-viewer.js

// Slide zoom / font scale / external presentation → js/ui/zoom-pres.js (changeSlideZoom, applySlideZoom, applySlideFontScale, openExternalPresentation, _setSlideZoom, _setSlideFontScale, getSlideFontScale)
// 텍스트/이미지 비율: 일괄 적용(툴바) + 개별 저장(디바이더 드래그). 기본 45:55(텍스트:이미지)
let _slideTextRatioPct = 45;
let _slideSyncEnabled = false;
let _syncGuard = false;

function updateSlidesCountLabel() {
  const cnt = document.getElementById('slides-count');
  if (!cnt) return;
  cnt.textContent = slides.length + ' 슬라이드';
  cnt.style.display = slides.length ? 'inline' : 'none';
  cnt.title = '현재 슬라이드 수';
  // 슬라이드가 있으면 왼쪽 패널 버튼(일괄시각화 등) 활성화
  const ids = ['export-btn', 'pptx-preview-btn', 'visualize-btn', 'slide-reset-btn', 'save-session-btn', 'gen-script-btn', 'present-btn', 'present-from-current-btn', 'slide-sync-btn', 'apply-layout-all-btn', 'save-slide-history-btn'];
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.disabled = !slides.length; });
  if (slides.length && typeof updateSlideSyncButton === 'function') updateSlideSyncButton();
}

function updateSlideSyncButton() {
  const btn = document.getElementById('slide-sync-btn');
  if (!btn) return;
  btn.textContent = _slideSyncEnabled ? '🔗 동기화 ON' : '🔗 동기화 OFF';
  btn.style.color = _slideSyncEnabled ? 'var(--accent)' : '';
  btn.title = _slideSyncEnabled
    ? '클릭: 내부/외부 슬라이드 번호 동기화 끄기'
    : '클릭: 내부/외부 슬라이드 번호 동기화 켜기';
}

function sendSlideSyncToExternal(index) {
  if (!_slideSyncEnabled) return;
  const w = window._extPresWindow;
  if (!w || w.closed) return;
  try {
    w.postMessage({ type: 'ss_sync_slide', index: index, origin: 'internal' }, '*');
  } catch (e) { /* noop */ }
}

function toggleSlideSync() {
  if (!slides || !slides.length) {
    if (typeof showToast === 'function') showToast('⚠️ 슬라이드가 없습니다');
    return;
  }
  _slideSyncEnabled = !_slideSyncEnabled;
  updateSlideSyncButton();
  if (_slideSyncEnabled) {
    if (!window._extPresWindow || window._extPresWindow.closed) {
      if (typeof window.openExternalPresentation === 'function') window.openExternalPresentation();
    }
    setTimeout(function () { sendSlideSyncToExternal(activeSlideIndex); }, 200);
    if (typeof showToast === 'function') showToast('🔗 내부/외부 슬라이드 동기화 ON');
  } else {
    if (typeof showToast === 'function') showToast('🔗 내부/외부 슬라이드 동기화 OFF');
  }
}

// ⑨ Image API key: 메인 설정의 API 키 사용 (별도 이미지 전용 키 없음)
function getImageApiKey() {
  if (_activeApiKey) return _activeApiKey;
  if (typeof localStorage !== 'undefined') {
    const k = localStorage.getItem(LS_ACTIVE_KEY) || '';
    if (k) return k;
  }
  throw new Error('NO_API_KEY');
}

const LS_IMAGE_MODEL = 'ss_image_model';
const LS_IMAGE_ASPECT_RATIO = 'ss_image_aspect_ratio';
const LS_TEXT_MODEL = 'ss_text_model';
const LS_SCHOLARAI_PRESET = 'ss_scholara_i_preset';
function getImageModelId() { return (typeof localStorage !== 'undefined' && localStorage.getItem(LS_IMAGE_MODEL)) || 'gemini-3.1-flash-image-preview'; }
function setDesignImageModel(modelId) { if (modelId && typeof localStorage !== 'undefined') localStorage.setItem(LS_IMAGE_MODEL, modelId); }
function getImageAspectRatio() { return (typeof localStorage !== 'undefined' && localStorage.getItem(LS_IMAGE_ASPECT_RATIO)) || '1:1'; }
function getTextModelId() { return (typeof localStorage !== 'undefined' && localStorage.getItem(LS_TEXT_MODEL)) || 'gemini-2.5-pro'; }
function getScholarAISystemInstruction() {
  const preset = (typeof localStorage !== 'undefined' && localStorage.getItem(LS_SCHOLARAI_PRESET)) || 'none';
  const defaultShort = 'You are a scholarly assistant. Answer concisely in Korean based on the given passage. If the user asks a question, answer it; otherwise summarize or explain the passage.';
  if (preset === 'none' || !preset) return defaultShort;
  const getOverride = typeof window.getPromptOverride === 'function' ? window.getPromptOverride : function () { return null; };
  const getDefaults = typeof window.getDefaultPrompts === 'function' ? window.getDefaultPrompts : function () { return {}; };
  if (preset === 'scholar_ai') {
    const v = getOverride('scholarai_prompt');
    if (v) return v;
    const d = getDefaults();
    return (d.scholarai_prompt && d.scholarai_prompt.value) || defaultShort;
  }
  if (preset === 'apa_search') {
    const v = getOverride('apa_search_prompt');
    if (v) return v;
    const d = getDefaults();
    return (d.apa_search_prompt && d.apa_search_prompt.value) || defaultShort;
  }
  return defaultShort;
}

/* =========================================================
   DRAG & DROP
   ========================================================= */
function handleDragOver(e) { e.preventDefault(); document.getElementById('upload-drop-zone')?.classList.add('drag-over'); }
function handleDragLeave() { document.getElementById('upload-drop-zone')?.classList.remove('drag-over'); }
function handleDrop(e) { e.preventDefault(); document.getElementById('upload-drop-zone')?.classList.remove('drag-over'); const file = e.dataTransfer.files[0]; if (!file) return; handleFileUpload({ target: { files: [file], value: '' } }); }

/* =========================================================
   LEFT PANEL → js/ui/left-panel.js (renderLeftPanel)
   ========================================================= */

/* =========================================================
   VIEWERS → js/ui/viewers.js (setSlideStyle, updateHeaderSlideMode, setWritingStyle, promoteSectionHeadings,
     buildViewerContentWithPages, getTextViewerWindowHtml, getTranslationViewerWindowHtml, openTranslationViewer,
     openKoreanViewWindow, openFullTextWindow, openSummaryWindow)
   ========================================================= */

/* =========================================================
   GENERATE SUMMARY / SLIDES — 구현은 js/slide-gen/slide-gen.js
   ========================================================= */

/** 원문/요약 뷰어용 HTML 생성: "--- N페이지 ---"가 있으면 섹션별로 id="page-N" 부여. 슬라이드 요약(Slide 1, Slide 2...)이면 id="page-Slide N"으로 구분하고 좌측 페이지는 슬라이드 번호로 표시 */
function buildViewerContentWithPages(text) {
  if (!text || !text.trim()) return markdownToHtml('');
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
      var html = markdownToHtml(promoteSectionHeadings(segment));
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
      var html = markdownToHtml(promoteSectionHeadings(segment));
      out.push('<div id="page-Slide ' + slideMatches[i].num + '" class="page-section">' + html + '</div>');
    }
    return out.join('');
  }
  return markdownToHtml(promoteSectionHeadings(text));
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
+ 'body.theme-light .toolbar .tbtn.ghost { background: #fff; border-color: #94a3b8; color: #475569; }'
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
+ '.toolbar { flex-shrink: 0; padding: 8px 16px; display: flex; flex-direction: column; gap: 8px; }'
+ '.toolbar-row { display: flex; justify-content: flex-end; align-items: center; gap: 8px; flex-wrap: wrap; }'
+ '.viewer-sidebar-list a.toc-h4 { padding-left: 28px; font-size: 11px; }'
+ '.viewer-sidebar-list .toc-item { display: block; color: #94a3b8; padding: 4px 0; padding-left: 4px; }'
+ 'body.theme-light .viewer-sidebar-list .toc-item { color: #475569; }'
+ '.viewer-sidebar-list .toc-item.toc-h2 { padding-left: 12px; font-size: 11px; }'
+ '.viewer-sidebar-list .toc-item.toc-h3 { padding-left: 20px; font-size: 11px; }'
+ '.viewer-sidebar-list .toc-item.toc-h4 { padding-left: 28px; font-size: 11px; }'
+ '.page-content h4 { font-family: sans-serif; color: #4f8ef7; margin-top: 1em; margin-bottom: 0.5em; font-size: 1.1em; }'
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
+ '    <button class="tbtn ghost" id="viewer-btn-edit" onclick="viewerSwitchToEdit()">✏️ 편집</button>'
+ '    <button class="tbtn ghost" id="viewer-btn-view" onclick="viewerSwitchToView()" style="display:none">👁 보기</button>'
+ '    <button class="tbtn ghost" onclick="navigator.clipboard.writeText(__rawText).then(function(){alert(\'복사됨\');})">📋 복사</button>'
+ (contentType === 'refs' ? '' : '    <button class="tbtn" id="viewer-btn-save" onclick="viewerSaveToOpener()" title="메인 화면에 현재 내용 저장">💾 저장</button>')
+ (contentType === 'refs' ? '    <button class="tbtn ghost" onclick="if(window.opener && typeof window.opener.reExtractReferencesFromDocument === \'function\'){ window.opener.reExtractReferencesFromDocument(); if(typeof window.opener.openRefExpWindow === \'function\') window.opener.openRefExpWindow(); window.close(); } else { alert(\'메인 창을 찾을 수 없습니다.\'); }" title="원문 재추출">🔄 원문 재추출</button>  <button class="tbtn ghost" onclick="if(window.opener && typeof window.opener.extractReferencesWithAI === \'function\'){ window.opener.extractReferencesWithAI(function(){ if(window.opener && typeof window.opener.openRefExpWindow === \'function\'){ window.opener.openRefExpWindow(); window.close(); } }); } else { alert(\'메인 창을 찾을 수 없습니다.\'); }" title="AI 추출">🤖 AI 추출</button>' : '')
+ '    <button class="tbtn" onclick="toggleScholarAI()" title="인공지능 추가 기능">ScholarAI</button>'
+ '    <button class="tbtn ghost" onclick="window.close()">닫기</button>'
+ '  </div>'
+ '  <div class="toolbar-row">'
+ '    <span style="font-size:11px;color:#94a3b8">page</span>'
+ '    <span id="page-num" style="font-size:11px;color:#94a3b8">1</span>'
+ '    <span class="tzoom-val" id="zoom-val">100%</span>'
+ '    <button class="tbtn ghost" onclick="setPageZoom(-10)" title="축소">−</button>'
+ '    <button class="tbtn ghost" onclick="setPageZoom(10)" title="확대">+</button>'
+ '    <span style="font-size:11px;color:#94a3b8;margin-left:8px">font</span>'
+ '    <button class="tbtn ghost" onclick="setFontZoom(-1)" title="폰트 축소">− 축소</button>'
+ '    <button class="tbtn ghost" onclick="setFontZoom(1)" title="폰트 확대">+ 확대</button>'
+ '    <button class="tbtn ghost" id="theme-btn" onclick="toggleTheme()" title="다크/라이트">Light/Dark</button>'
+ '  </div>'
+ '</div>'
+ '<div class="main-with-sidebar">'
+ '<aside class="viewer-sidebar">'
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
+ 'function setPageZoom(delta) { _pageZoom = Math.max(30, Math.min(200, _pageZoom + delta)); document.getElementById("page").style.setProperty("--zoom", _pageZoom/100); var zv = document.getElementById("zoom-val"); if(zv) zv.textContent = _pageZoom + "%"; }'
+ 'function setFontZoom(delta) { var el = document.getElementById("page-content"); if(!el) return; var fs = parseFloat(getComputedStyle(el).fontSize) || _fontBase; fs = Math.max(10, Math.min(28, fs + delta*2)); el.style.fontSize = fs + "px"; }'
+ 'function toggleTheme() { var b = document.body; b.classList.toggle("theme-dark"); b.classList.toggle("theme-light"); document.getElementById("theme-btn").textContent = b.classList.contains("theme-dark") ? "Dark/Light" : "Light/Dark"; }'
+ 'function saveAs(ext) { var a = document.createElement("a"); a.href = "data:text/" + (ext==="md"?"markdown":"plain") + ";charset=utf-8," + encodeURIComponent(__rawText); var t = document.getElementById("viewer-doc-title"); a.download = (t ? t.textContent : document.title || "document").replace(/[^a-zA-Z0-9가-힣._-]/g,"_").slice(0,50) + "." + ext; a.click(); }'
+ 'function viewerSwitchToEdit() { var ta = document.getElementById("viewer-edit-ta"); ta.value = __rawText; document.getElementById("content-viewport").classList.add("viewer-edit-active"); document.getElementById("viewer-btn-edit").style.display = "none"; document.getElementById("viewer-btn-view").style.display = "inline-block"; viewerBuildNav(); var onTocInput = function(){ viewerBuildNav(); }; ta.removeEventListener("input", onTocInput); ta.addEventListener("input", onTocInput); }'
+ 'function viewerSwitchToView() { var ta = document.getElementById("viewer-edit-ta"); __rawText = ta.value; var html = ""; try { if (window.opener && typeof window.opener.getViewerRenderedContent === "function") { html = window.opener.getViewerRenderedContent(__rawText); } } catch(e) {} if (!html && typeof marked !== "undefined") { html = marked.parse(__rawText || ""); } if (!html) { html = (__rawText || "").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\\n/g,"<br>"); } var pc = document.getElementById("page-content"); if (pc) pc.innerHTML = html; document.getElementById("content-viewport").classList.remove("viewer-edit-active"); document.getElementById("viewer-btn-view").style.display = "none"; document.getElementById("viewer-btn-edit").style.display = "inline-block"; if (typeof viewerBuildNav === "function") requestAnimationFrame(function(){ viewerBuildNav(); }); }'
+ 'function viewerSaveToOpener() { var ta = document.getElementById("viewer-edit-ta"); var isEdit = document.getElementById("content-viewport").classList.contains("viewer-edit-active"); var text = isEdit && ta ? ta.value : __rawText; if (isEdit && ta) __rawText = ta.value; if (window.opener && typeof window.opener.setViewerContent === "function") { window.opener.setViewerContent(text, __contentType); alert("저장되었습니다."); } else { alert("메인 창을 찾을 수 없습니다."); } }'
+ 'function viewerNavSwitch(t) { var pageTab=document.getElementById("nav-tab-page"); var tocTab=document.getElementById("nav-tab-toc"); var pageList=document.getElementById("nav-list-page"); var tocList=document.getElementById("nav-list-toc"); if(t==="page"){ pageTab.classList.add("active"); tocTab.classList.remove("active"); pageList.style.display="block"; tocList.style.display="none"; } else { tocTab.classList.add("active"); pageTab.classList.remove("active"); tocList.style.display="block"; pageList.style.display="none"; } }'
+ 'function parseMarkdownHeadings(text) { var out = []; var re = /^(#{1,4})\\s+(.+)$/gm; var m; while((m = re.exec(text)) !== null) { out.push({ level: m[1].length, text: m[2].trim() }); } return out; }'
+ 'function buildTocFromMarkdown(text) { var items = parseMarkdownHeadings(text || ""); if(items.length === 0) return "<span style=\'color:#94a3b8\'>목차 없음</span>"; var html = ""; for(var i = 0; i < items.length; i++) { var cls = items[i].level === 1 ? "" : " toc-h" + items[i].level; var txt = items[i].text.replace(/</g,"&lt;").substring(0,50); html += "<span class=\'toc-item" + cls + "\'>" + txt + (items[i].text.length > 50 ? "…" : "") + "</span>"; } return html; }'
+ 'function viewerBuildNav() { var listPage = document.getElementById("nav-list-page"); var listToc = document.getElementById("nav-list-toc"); var root = document.getElementById("page-content"); var ta = document.getElementById("viewer-edit-ta"); var isEdit = document.getElementById("content-viewport") && document.getElementById("content-viewport").classList.contains("viewer-edit-active"); if(isEdit && ta) { listToc.innerHTML = buildTocFromMarkdown(ta.value); listPage.innerHTML = "<span style=\'color:#94a3b8\'>페이지 구분 없음</span>"; return; } if(!root) return; var sections = root.querySelectorAll("[id^=\'page-\']"); var pageHtml = ""; for(var i=0;i<sections.length;i++){ var id = sections[i].id; var n = id.replace("page-",""); var label = /^Slide\\s+\\d+$/.test(n) ? n : (n+"페이지"); pageHtml += "<a href=\'#"+id+"\'>"+label+"</a>"; } listPage.innerHTML = pageHtml || "<span style=\'color:#94a3b8\'>페이지 구분 없음</span>"; var headings = root.querySelectorAll("h1, h2, h3, h4"); var tocHtml = ""; var tocId = 0; for(var j=0;j<headings.length;j++){ tocId++; var el = headings[j]; if(!el.id) el.id = "toc-"+tocId; var tag = el.tagName.toLowerCase(); var cls = tag==="h1"?"":tag==="h2"?" toc-h2":tag==="h3"?" toc-h3":" toc-h4"; var txt = el.textContent.replace(/</g,"&lt;").substring(0,50); tocHtml += "<a href=\'#"+el.id+"\' class=\'"+cls.trim()+"\'>"+txt+(el.textContent.length>50?"…":"")+"</a>"; } listToc.innerHTML = tocHtml || "<span style=\'color:#94a3b8\'>목차 없음</span>"; }'
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
+ 'document.addEventListener("DOMContentLoaded", function(){ if(__contentType === "refs"){ var sb=document.getElementById("viewer-btn-save"); var eb=document.getElementById("viewer-btn-edit"); if(sb)sb.style.display="none"; if(eb)eb.style.display="none"; } viewerBuildNav(); var resTa = document.getElementById("scholar-ai-result"); if (resTa) resTa.style.fontSize = __scholarAIResultFontSize + "px"; var histSearch = document.getElementById("scholar-ai-history-search"); if (histSearch) histSearch.addEventListener("input", scholarAIHistoryRender); });'
+ '</script></body></html>';
}

/** 번역 보기 창: 원문/번역/원문|번역 모드, 전체보기·요약보기와 동일한 툴바(확대·다크라이트)·전체 내용 + 페이지/목차 사이드바 */
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
  var originalHtml = typeof buildViewerContentWithPages === 'function' ? buildViewerContentWithPages(originalText || '') : (originalText || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
  var translatedHtml = typeof buildViewerContentWithPages === 'function' ? buildViewerContentWithPages(translatedText || '') : (translatedText || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
  window.getTranslationViewerData = function () {
    return {
      original: originalText || '',
      translated: translatedText || '',
      originalHtml: originalHtml,
      translatedHtml: translatedHtml
    };
  };
  var win = window.open('', '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
  if (!win) { if (typeof showToast === 'function') showToast('⚠️ 팝업이 차단되었습니다. 팝업 허용 후 다시 시도하세요.'); return; }
  if (typeof registerChildWindow === 'function') registerChildWindow(win);
  win.document.write(getTranslationViewerWindowHtml({ label: label || '원문' }));
  win.document.close();
}

/** 전체 보기와 동일한 뷰어에 전체 내용의 한국어 번역본 표시 (캐시 없으면 번역 후 표시) */
async function openKoreanViewWindow(target) {
  var label = target === 'summary' ? '요약' : '원문';
  var source = target === 'summary' ? (typeof summaryText !== 'undefined' ? summaryText : (typeof window.getSummaryText === 'function' ? window.getSummaryText() : '')) : (typeof rawText !== 'undefined' ? rawText : (typeof window.getRawText === 'function' ? window.getRawText() : ''));
  if (!source) {
    if (typeof showToast === 'function') showToast('⚠️ ' + (target === 'summary' ? '요약' : '원문') + ' 내용이 없습니다.');
    return;
  }
  var koreanText = '';
  if (typeof window.ensureTranslated === 'function') {
    koreanText = await window.ensureTranslated(target);
    } else {
    koreanText = target === 'summary' ? (window._translatedSummary || '') : (window._translatedRaw || '');
  }
  if (!koreanText) {
    if (typeof showToast === 'function') showToast('⚠️ 번역된 내용이 없습니다. 한국어 번역을 먼저 실행하세요.');
    return;
  }
  var win = window.open('', '_blank', 'width=900,height=750,scrollbars=yes,resizable=yes');
  if (!win) {
    if (typeof showToast === 'function') showToast('⚠️ 팝업이 차단되었습니다. 팝업 허용 후 다시 시도하세요.');
    return;
  }
  if (typeof registerChildWindow === 'function') registerChildWindow(win);
  var contentRendered = buildViewerContentWithPages(koreanText);
  var escapedHtml = contentRendered.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$').replace(/<\/script>/gi, '<\\/script>');
  var rawJson = JSON.stringify(koreanText);
  var title = (typeof fileName !== 'undefined' ? fileName : (typeof window.getFileName === 'function' ? window.getFileName() : '')) || '문서';
  var safeTitle = typeof escapeHtml === 'function' ? escapeHtml(title) : String(title).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  win.document.write(getTextViewerWindowHtml({
    title: safeTitle,
    subtitle: '🇰🇷 한국어 보기 (' + label + ')',
    pageTitle: '한국어 보기 — ' + safeTitle,
    contentHtml: escapedHtml,
    rawTextJson: rawJson,
    contentType: target
  }));
  win.document.close();
}

function openFullTextWindow() {
  var win = window.open('', '_blank', 'width=900,height=750,scrollbars=yes,resizable=yes');
  if (!win) { showToast('⚠️ 팝업이 차단되었습니다. 팝업 허용 후 다시 시도하세요.'); return; }
  if (typeof registerChildWindow === 'function') registerChildWindow(win);
  if (typeof window.getViewerRenderedContent !== 'function') window.getViewerRenderedContent = function (text) { return buildViewerContentWithPages(text); };
  if (typeof window.setViewerContent !== 'function') window.setViewerContent = function (text, type) { if (type === 'raw') rawText = text; else if (type === 'summary') { summaryText = text; if (typeof window.addSummaryToHistory === 'function' && fileName) window.addSummaryToHistory({ fileName: fileName, summaryText: text, styleId: 'edited', granularity: 'detail' }); try { localStorage.setItem('ss_viewer_page_summary', text); } catch (e) {} } else if (type === 'refs') return; if (typeof renderLeftPanel === 'function') renderLeftPanel(); if (typeof showToast === 'function') showToast('✅ 저장되었습니다'); };
  var contentRendered = buildViewerContentWithPages(rawText);
  var escapedHtml = contentRendered.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$').replace(/<\/script>/gi, '<\\/script>');
  var rawJson = JSON.stringify(rawText);
  var title = escapeHtml(fileName);
  var sizeLabel = (rawText.length / 1000).toFixed(1) + 'k자';
  win.document.write(getTextViewerWindowHtml({
    title: title,
    subtitle: '📄 원문 전체 (' + sizeLabel + ')',
    pageTitle: '원문 전체 — ' + title,
    contentHtml: escapedHtml,
    rawTextJson: rawJson,
    contentType: 'raw'
  }));
  win.document.close();
}

function openSummaryWindow() {
  if (!summaryText) { showToast('⚠️ 요약 내용이 없습니다'); return; }
  if (typeof window.setViewerContent !== 'function') {
    window.setViewerContent = function (text, type) {
      if (type === 'raw') rawText = text;
      else if (type === 'summary') {
        summaryText = text;
        if (typeof window.addSummaryToHistory === 'function' && fileName) window.addSummaryToHistory({ fileName: fileName, summaryText: text, styleId: 'edited', granularity: 'detail' });
        try { localStorage.setItem('ss_viewer_page_summary', text); } catch (e) {}
      } else if (type === 'refs') return;
      if (typeof renderLeftPanel === 'function') renderLeftPanel();
      if (typeof showToast === 'function') showToast('✅ 저장되었습니다');
    };
  }
  var win = window.open('', '_blank', 'width=900,height=750,scrollbars=yes,resizable=yes');
  if (!win) { showToast('⚠️ 팝업이 차단되었습니다. 팝업 허용 후 다시 시도하세요.'); return; }
  if (typeof registerChildWindow === 'function') registerChildWindow(win);
  var title = escapeHtml(fileName);
  var contentRendered = buildViewerContentWithPages(summaryText);
  var escapedHtml = contentRendered.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$').replace(/<\/script>/gi, '<\\/script>');
  var rawJson = JSON.stringify(summaryText);
  win.document.write(getTextViewerWindowHtml({
    title: title,
    subtitle: '📋 요약 전체',
    pageTitle: '요약 전체 — ' + title,
    contentHtml: escapedHtml,
    rawTextJson: rawJson,
    contentType: 'summary'
  }));
  win.document.close();
}

/* =========================================================
   GENERATE SUMMARY / SLIDES — 구현은 js/slide-gen/slide-gen.js
   ========================================================= */

function afterSlidesCreated() {
  normalizeImageSlideRatios();
  renderSlides(); renderThumbs();
  updateSlidesCountLabel();
  ['export-btn', 'pptx-preview-btn', 'visualize-btn', 'slide-reset-btn', 'save-session-btn', 'gen-script-btn', 'present-btn', 'present-from-current-btn', 'slide-sync-btn', 'apply-layout-all-btn', 'save-slide-history-btn']
    .forEach(id => { const el = document.getElementById(id); if (el) el.disabled = false; });
  updateSlideSyncButton();
  const extBtn = document.getElementById('ext-present-btn');
  if (extBtn) extBtn.style.display = '';
  const footer = document.getElementById('slide-footer'); if (footer) footer.style.display = 'flex';
  const es = document.getElementById('empty-state'); if (es) es.style.display = 'none';
}

/* =========================================================
   RENDER SLIDES (req. 2, 4)
   ========================================================= */
// [V3.1: renderSlides replaced by patch]

function renderThumbs() {
  const container = document.getElementById('thumbs-container');
  if (!container) return;
  container.innerHTML = slides.map((s, i) => `
    <div class="thumb ${i === activeSlideIndex ? 'active' : ''}" onclick="selectSlide(${i}, true)" title="${escapeHtml((s.title || ('Slide ' + (i + 1))).trim())}">
      ${s.imageUrl ? `<img src="${s.imageUrl}" alt=""/>` : `<span style="font-family:var(--font-mono);font-size:10px;color:var(--text2)">${i + 1}</span>`}
    </div>`).join('');
}

function selectSlide(index, fromThumb, syncSource) {
  activeSlideIndex = index;
  document.querySelectorAll('.slide-wrapper').forEach((el, i) => el.classList.toggle('active', i === index));
  document.querySelectorAll('.thumb').forEach((el, i) => el.classList.toggle('active', i === index));
  updateDesignPanel();
  const el = document.getElementById(`sw-${index}`);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });

  // 하단 썸네일에서 선택 시 디자인 탭으로 전환
  if (fromThumb && rightTab !== 'design') {
    switchRightTab('design');
  }
  if (_slideSyncEnabled && syncSource !== 'external') {
    sendSlideSyncToExternal(index);
  }
}

window.addEventListener('message', function (event) {
  var data = event && event.data;
  if (!data || data.type !== 'ss_sync_slide') return;
  if (!_slideSyncEnabled) return;
  var idx = parseInt(data.index, 10);
  if (!isFinite(idx) || idx < 0 || idx >= slides.length) return;
  if (_syncGuard) return;
  if (idx === activeSlideIndex) return;
  _syncGuard = true;
  try {
    selectSlide(idx, false, 'external');
  } finally {
    setTimeout(function () { _syncGuard = false; }, 0);
  }
});

/** 크게 보기 창 ↔ 메인 창 연동 (삽입/자르기/지우기/이미지 전달) */
window.addEventListener('message', function (event) {
  var data = event && event.data;
  if (!data || typeof data !== 'object') return;
  if (data.type === 'imgViewerReady' && window._imgViewerPending && event.source) {
    try {
      event.source.postMessage({
        type: 'setImage',
        dataURL: window._imgViewerPending.dataURL,
        fromImgBank: window._imgViewerPending.fromImgBank
      }, '*');
    } catch (e) { }
    window._imgViewerPending = null;
    return;
  }
  if (data.type === 'imgViewerInsert' && data.dataURL) {
    insertImgBankImageToSlide(data.dataURL);
    if (typeof showToast === 'function') showToast('✅ 슬라이드에 삽입했습니다');
    return;
  }
  if (data.type === 'imgViewerCrop' && data.dataURL) {
    openImageModalWithDataURL(data.dataURL);
    return;
  }
  if (data.type === 'imgViewerDelete' && data.id != null && typeof imgBankDelete === 'function') {
    imgBankDelete(data.id).then(function () {
      if (typeof showToast === 'function') showToast('🗑 imgBank에서 삭제됨');
    }).catch(function () {
      if (typeof showToast === 'function') showToast('❌ 삭제 실패');
    });
    return;
  }
});

/** 텍스트 레이어(제목·불릿·텍스트창) 내용 전체 지우기 */
function clearSlideTextLayer(slideIndex) {
  if (!slides[slideIndex]) return;
  if (typeof pushSlideUndoState === 'function') pushSlideUndoState();
  var s = slides[slideIndex];
  s.title = '새 슬라이드';
  s.bullets = [];  /* 불릿 완전 제거 — 빈 placeholder도 안 보이게 */
  s.extraText = '';
  renderSlides();
  selectSlide(slideIndex);
  if (typeof _markDirty === 'function') _markDirty();
}

function updateSlideTitle(i, val) { if (slides[i]) slides[i].title = val; }

/** 슬라이드 제목 폰트 크기 변경 (A+/A−). 전역 폰트 스케일도 반영 */
function changeTitleFontSize(slideIndex, delta) {
  if (!slides[slideIndex]) return;
  if (typeof pushSlideUndoState === 'function') pushSlideUndoState();
  var s = slides[slideIndex];
  var current = (s.titleFontSize != null && s.titleFontSize > 0) ? s.titleFontSize : 24;
  var next = Math.max(14, Math.min(72, current + delta));
  s.titleFontSize = next;
  var wrap = document.getElementById('slide-title-wrap-' + slideIndex);
  if (wrap) {
    var ta = wrap.querySelector('.slide-title-input');
    if (ta) {
      var scale = getComputedStyle(document.getElementById('slides-canvas') || document.documentElement).getPropertyValue('--slide-font-scale').trim() || '1';
      ta.style.fontSize = 'calc(' + next + 'px * var(--slide-font-scale, 1))';
    }
  }
  if (typeof showToast === 'function') showToast('제목 크기 ' + next + 'px');
}
function updateSlideBullet(i, bi, val) { if (slides[i]) slides[i].bullets[bi] = val; }
function updateSlideNotes(i, val) { if (slides[i]) slides[i].notes = val; }
function removeSlideImage(i) {
  if (!slides[i]) return;
  if (typeof pushSlideUndoState === 'function') pushSlideUndoState();
  slides[i].imageUrl = null; renderSlides(); renderThumbs(); renderGallery();
}
function removeSlideImage2(i) {
  if (!slides[i]) return;
  if (typeof pushSlideUndoState === 'function') pushSlideUndoState();
  slides[i].imageUrl2 = null; renderSlides(); renderThumbs(); updateDesignPanel(); showToast('🗑 두 번째 이미지 제거됨');
}
// ── 슬라이드 실행 취소/다시 실행 (Ctrl+Z, Ctrl+Shift+Z) ─────────────────────
const MAX_SLIDE_UNDO = 50;
let slideUndoStack = [];
let slideRedoStack = [];

function pushSlideUndoState() {
  if (!slides || !slides.length) return;
  try {
    const copy = JSON.parse(JSON.stringify(slides));
    const last = slideUndoStack[slideUndoStack.length - 1];
    if (last && JSON.stringify(last) === JSON.stringify(copy)) return;
    slideUndoStack.push(copy);
    if (slideUndoStack.length > MAX_SLIDE_UNDO) slideUndoStack.shift();
    slideRedoStack.length = 0;
  } catch (e) { /* ignore */ }
}
window.pushSlideUndoState = pushSlideUndoState;

function slideUndo() {
  if (!slideUndoStack.length) return;
  try {
    const current = JSON.parse(JSON.stringify(slides));
    slideRedoStack.push(current);
    const prev = slideUndoStack.pop();
    slides = prev;
    activeSlideIndex = Math.min(activeSlideIndex, Math.max(0, slides.length - 1));
    renderSlides(); renderThumbs(); if (typeof renderGallery === 'function') renderGallery();
    if (typeof updateDesignPanel === 'function') updateDesignPanel();
    if (typeof mdUpdatePageIndicators === 'function') mdUpdatePageIndicators();
    updateSlidesCountLabel();
    showToast('↩ 실행 취소');
  } catch (e) { showToast('❌ 실행 취소 실패'); }
}

function slideRedo() {
  if (!slideRedoStack.length) return;
  try {
    const current = JSON.parse(JSON.stringify(slides));
    slideUndoStack.push(current);
    const next = slideRedoStack.pop();
    slides = next;
    activeSlideIndex = Math.min(activeSlideIndex, Math.max(0, slides.length - 1));
    renderSlides(); renderThumbs(); if (typeof renderGallery === 'function') renderGallery();
    if (typeof updateDesignPanel === 'function') updateDesignPanel();
    if (typeof mdUpdatePageIndicators === 'function') mdUpdatePageIndicators();
    updateSlidesCountLabel();
    showToast('↪ 다시 실행');
  } catch (e) { showToast('❌ 다시 실행 실패'); }
}
window.slideUndo = slideUndo;
window.slideRedo = slideRedo;

// 슬라이드 창: Ctrl+Z 실행 취소, Ctrl+Shift+Z 다시 실행, Ctrl+Y 다시 실행 (전방위 적용)
document.addEventListener('keydown', function (e) {
  if (e.target.id === 'md-editor-ta') return;
  var isEditable = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || (e.target.closest && e.target.closest('[contenteditable="true"]'));
  if (isEditable) return;
  if (e.ctrlKey && e.key === 'z' && !e.shiftKey) { e.preventDefault(); slideUndo(); return; }
  if (e.ctrlKey && (e.key === 'z' && e.shiftKey || e.key === 'y')) { e.preventDefault(); slideRedo(); return; }
});

// 슬라이드 제목/불릿/노트 편집 후 포커스 나갈 때 실행 취소용 스냅샷
document.addEventListener('focusout', function (e) {
  var t = e.target;
  if (t && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT') && t.closest('#slides-canvas') && t.closest('.slide-wrapper')) {
    if (typeof pushSlideUndoState === 'function') pushSlideUndoState();
  }
});

function openImageModal2(slideIdx) {
  const idx = slideIdx !== undefined ? slideIdx : activeSlideIndex;
  window._applyAsSecondImage = true;
  // 두 번째 이미지 추가는 항상 빈 상태에서 시작 (기존 첫 번째 이미지 프리로드 금지)
  openImageModal(idx, { asSecondImage: true, preloadExisting: false });
}

function deleteSlide(i) {
  if (slides.length <= 1) { showToast('⚠️ 슬라이드가 하나만 남았습니다'); return; }
  if (typeof pushSlideUndoState === 'function') pushSlideUndoState();
  slides.splice(i, 1);
  if (activeSlideIndex >= slides.length) activeSlideIndex = slides.length - 1;
  renderSlides(); renderThumbs();
  updateSlidesCountLabel();
}

function addNewSlide() { addSlideAfter(activeSlideIndex, 'blank'); }

/* =========================================================
   IMAGE GENERATION
   ========================================================= */
/** 이미지 슬라이드 기본 비율: 텍스트 45% / 이미지 55% (강제 적용) */
const DEFAULT_IMAGE_SLIDE_TEXT_PCT = 45;

/** AI 생성 이미지에 완전 채우기 레이아웃 적용 (innerSize 45% 텍스트 / 55% 이미지) */
function applyFullFillImageLayout(slide) {
  if (!slide || !slide.imageUrl) return;
  slide.innerSize = slide.innerSize || {};
  slide.innerSize.widthPct = DEFAULT_IMAGE_SLIDE_TEXT_PCT;
  slide.slideImage1 = null;
  slide.slideImage2 = null;
}

/** 이미지가 있는 슬라이드에 기본 비율 적용 (비율이 없을 때만. 사용자/배치 적용 값은 절대 덮어쓰지 않음) */
function normalizeImageSlideRatios() {
  if (!slides || !slides.length) return;
  var changed = false;
  slides.forEach(function (s) {
    if (!s || !s.imageUrl) return;
    var pct = s.innerSize && s.innerSize.widthPct != null ? s.innerSize.widthPct : null;
    if (pct == null) {
      s.innerSize = s.innerSize || {};
      s.innerSize.widthPct = DEFAULT_IMAGE_SLIDE_TEXT_PCT;
      changed = true;
    }
    if (s.slideImage1 && (s.slideImage1.w || s.slideImage1.h)) {
      s.slideImage1 = null;
      changed = true;
    }
    if (s.slideImage2 && (s.slideImage2.w || s.slideImage2.h)) {
      s.slideImage2 = null;
      changed = true;
    }
  });
  if (changed && typeof _markDirty === 'function') _markDirty();
}

// ─── Visualize all images: background mode with confirm modal ────────────
function askThenVisualizeAll() {
  if (!slides.length) { showToast('⚠️ 슬라이드가 없습니다'); return; }
  if (window._bgJob && window._bgJob.running) { showToast('⚠️ 이미 이미지 생성이 진행 중입니다'); return; }
  // visPrompt가 없는 슬라이드(2장 이후, 이미지 없음)에 기본 시각 프롬프트 부여
  slides.forEach((s, idx) => {
    if (idx > 0 && !s.imageUrl && !(s.visPrompt && s.visPrompt.trim())) {
      s.visPrompt = 'Academic visual for: ' + (s.title || ('Slide ' + (idx + 1)));
    }
  });
  const toGen = slides.filter((s, idx) => idx > 0 && s.visPrompt && !s.imageUrl).length;
  const hasImg = slides.filter(s => s.imageUrl).length;
  if (!toGen) { showToast(hasImg ? `ℹ️ 모든 슬라이드에 이미 이미지가 있습니다` : '⚠️ 시각화할 슬라이드가 없습니다'); return; }

  // Open custom visualize confirm modal
  openVisualizeModal(toGen, hasImg);
}

function openVisualizeModal(toGen, hasImg) {
  // Remove old if exists
  let old = document.getElementById('visualize-modal');
  if (old) old.remove();
  const m = document.createElement('div');
  m.id = 'visualize-modal';
  m.className = 'modal-backdrop open';
  m.onclick = e => { if (e.target === m) m.remove(); };
  m.innerHTML = `
  <div class="modal-box" onclick="event.stopPropagation()" style="max-width:480px">
    <div class="modal-header">
      <div class="modal-title">✨ AI 이미지 일괄 생성</div>
      <button class="modal-close" onclick="document.getElementById('visualize-modal').remove()">✕</button>
    </div>
    <div class="modal-body" style="display:flex;flex-direction:column;gap:12px">
      <div style="font-size:12px;color:var(--text2);line-height:1.7">
        <b>${toGen}개</b> 슬라이드에 AI 이미지를 생성합니다.
        ${hasImg ? `<br><span style="color:var(--warning)">⚠️ 이미지가 있는 슬라이드 ${hasImg}개는 기본적으로 건너뜁니다.</span>` : ''}
        <br>생성은 <b>백그라운드</b>로 조용히 실행됩니다.
      </div>
      <label style="display:flex;align-items:center;gap:8px;font-size:12px;cursor:pointer">
        <input type="checkbox" id="viz-overwrite" style="width:14px;height:14px"/>
        기존 이미지가 있어도 새로 생성 (덮어쓰기)
      </label>
      <div>
        <label class="label">이미지 비율</label>
        <div class="viz-ratio-row" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px">
          <button type="button" class="btn btn-ghost btn-sm viz-ratio-btn" data-ratio="1:1" title="정사각형">1:1</button>
          <button type="button" class="btn btn-ghost btn-sm viz-ratio-btn" data-ratio="3:4" title="세로형">3:4</button>
          <button type="button" class="btn btn-ghost btn-sm viz-ratio-btn" data-ratio="4:3" title="가로형">4:3</button>
          <button type="button" class="btn btn-ghost btn-sm viz-ratio-btn" data-ratio="9:16" title="세로형">9:16</button>
          <button type="button" class="btn btn-ghost btn-sm viz-ratio-btn" data-ratio="16:9" title="가로형">16:9</button>
        </div>
        <input type="hidden" id="viz-aspect-ratio" value="1:1"/>
      </div>
      <div>
        <label class="label">추가 스타일 지시 (선택, 영어 권장)</label>
        <textarea id="viz-extra-prompt" class="control" rows="2" style="resize:vertical;min-height:50px;max-height:150px" placeholder="예: in flat illustration style, pastel colors, minimal, academic"></textarea>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost btn-sm" onclick="document.getElementById('visualize-modal').remove()">취소</button>
      <button class="btn btn-primary btn-sm" onclick="startVisualizeAll()">🎨 생성 시작</button>
    </div>
  </div>`;
  document.body.appendChild(m);
  const curRatio = (typeof getImageAspectRatio === 'function' ? getImageAspectRatio() : '1:1');
  const ratioInput = document.getElementById('viz-aspect-ratio');
  if (ratioInput) ratioInput.value = curRatio;
  m.querySelectorAll('.viz-ratio-btn').forEach(btn => {
    const r = btn.getAttribute('data-ratio') || '1:1';
    if (r === curRatio) btn.classList.add('active');
    btn.addEventListener('click', () => {
      m.querySelectorAll('.viz-ratio-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (ratioInput) ratioInput.value = r;
      if (typeof localStorage !== 'undefined') localStorage.setItem(LS_IMAGE_ASPECT_RATIO, r);
    });
  });
}

async function startVisualizeAll() {
  window._aiTaskCancelled = false;
  const overwrite = document.getElementById('viz-overwrite')?.checked;
  const extraPrompt = document.getElementById('viz-extra-prompt')?.value?.trim() || '';
  const aspectRatio = document.getElementById('viz-aspect-ratio')?.value || (typeof getImageAspectRatio === 'function' ? getImageAspectRatio() : '1:1');
  document.getElementById('visualize-modal')?.remove();

  const targets = slides.filter((s, idx) => idx > 0 && (s.visPrompt && s.visPrompt.trim()) && (overwrite ? true : !s.imageUrl));
  if (!targets.length) { showToast('⚠️ 생성할 슬라이드가 없습니다'); return; }

  if (typeof window._bgJobStart === 'function') window._bgJobStart(targets.length, '준비 중...');

  let successCount = 0;
  for (let j = 0; j < targets.length; j++) {
    if (window._bgJobCancelled || window._aiTaskCancelled) break;
    const s = targets[j];
    const i = slides.indexOf(s);
    const basePrompt = (s.visPrompt && s.visPrompt.trim()) ? s.visPrompt.trim() : ('Academic visual for: ' + (s.title || ('Slide ' + (i + 1))));
    const prompt = extraPrompt ? basePrompt + '. ' + extraPrompt : basePrompt;
    if (typeof window._bgJobTick === 'function') window._bgJobTick(j, `슬라이드 ${i + 1}: ${prompt.substring(0, 50)}`);

    let img = null;
    try {
      img = await generateImage(prompt, { aspectRatio });
    } catch (e) {
      if (e && e.name === 'AbortError') break;
      if (e && e.message === 'NO_API_KEY' && typeof showToast === 'function') showToast('⚠️ API 키를 설정해주세요');
      img = null;
    }
    if (img) {
      if (typeof pushSlideUndoState === 'function') pushSlideUndoState();
      slides[i].imageUrl = img;
      applyFullFillImageLayout(slides[i]);
      if (typeof imgBankAdd === 'function') { try { imgBankAdd({ dataURL: img, name: 'batch_' + Date.now() + '_' + i, prompt: prompt }); } catch (e) {} }
      successCount++;
      renderSlides(); renderThumbs(); renderGallery();
    }
    if (typeof window._bgJobTick === 'function') window._bgJobTick(j + 1, `슬라이드 ${i + 1} 완료`);
  }

  let endMsg;
  if (window._bgJobCancelled || window._aiTaskCancelled) {
    endMsg = `⏹ 중단됨 — ${(window._bgJob && window._bgJob.done) || 0}/${(window._bgJob && window._bgJob.total) || 0}개 생성`;
  } else if (successCount === 0 && targets.length > 0) {
    endMsg = `⚠️ 이미지 생성 실패 (0/${targets.length}개). API 키·설정 확인 후 F12 콘솔 로그를 확인하세요.`;
  } else if (successCount < targets.length) {
    endMsg = `✅ ${successCount}/${targets.length}개 생성 완료 (일부 실패)`;
  } else {
    endMsg = `✅ 이미지 생성 완료 (${targets.length}개)`;
  }
  if (typeof window._bgJobEnd === 'function') window._bgJobEnd(endMsg);
  renderSlides(); renderThumbs(); renderGallery();
}

async function generateAllImages() { askThenVisualizeAll(); } // backward compat

// [V3.1: generateSingleImage replaced]

async function refineImage() {
  const slide = slides[activeSlideIndex]; if (!slide || !slide.imageUrl) return;
  const instruction = document.getElementById('refine-input')?.value; if (!instruction) return;
  if (showJobProgress) showJobProgress('refineImg', '백그라운드에서 이미지 수정 중...', 0, '🎨');
  refineImageAPI(slide.imageUrl, instruction).then(function (newImg) {
    if (hideJobProgress) hideJobProgress('refineImg', 0);
    if (newImg) {
      if (typeof pushSlideUndoState === 'function') pushSlideUndoState();
      slides[activeSlideIndex].imageUrl = newImg;
      applyFullFillImageLayout(slides[activeSlideIndex]);
      renderSlides(); renderThumbs(); renderGallery(); showToast('✅ 이미지 수정 완료');
    } else showToast('❌ 이미지 수정 실패');
  }).catch(function () {
    if (hideJobProgress) hideJobProgress('refineImg', 0);
    showToast('❌ 이미지 수정 실패');
  });
}

/* =========================================================
   GALLERY with download (req. 11)
   ========================================================= */
function renderGallery() {
  const grid = document.getElementById('gallery-grid');
  const placeholder = document.getElementById('gallery-placeholder');
  const imaged = slides.filter(s => s.imageUrl);
  if (!imaged.length) { if (placeholder) placeholder.style.display = 'block'; if (grid) grid.innerHTML = ''; return; }
  if (placeholder) placeholder.style.display = 'none';
  if (grid) grid.innerHTML = imaged.map(s => {
    const idx = slides.indexOf(s);
    return `<div class="gallery-item">
      <img src="${s.imageUrl}" alt="" onclick="selectSlide(${idx})" style="cursor:pointer"/>
      <div class="gallery-item-num">슬라이드 ${idx + 1}</div>
      <button class="gallery-item-dl" onclick="event.stopPropagation();downloadGalleryImage(${idx})" title="이미지 다운로드">⬇</button>
    </div>`;
  }).join('');
}

function downloadGalleryImage(idx) {
  const slide = slides[idx]; if (!slide || !slide.imageUrl) return;
  const a = document.createElement('a');
  a.href = slide.imageUrl; a.download = `slide_${idx + 1}_image.png`; a.click();
  showToast(`✅ 슬라이드 ${idx + 1} 이미지 다운로드`);
}

/* =========================================================
   DESIGN PANEL
   ========================================================= */
// [V3.1: updateDesignPanel replaced by patch]
/* =========================================================
   SOURCES (req. 7)
   ========================================================= */
async function fetchSources() {
  const query = document.getElementById('source-search-input')?.value?.trim();
  if (!query) { showToast('⚠️ 검색어를 입력하세요'); return; }
  showLoading('학술 출처 검색 중...', query, 30, true);
  try {
    const result = await callGemini(`다음 주제에 대한 학술 출처를 검색하고 찾아주세요: ${query}`, 'Search for academic citations and sources.', true);
    sources = result.sources || [];
    renderSources(); switchRightTab('sources');
    showToast(sources.length ? `✅ ${sources.length}개 출처 발견` : '⚠️ 출처를 찾지 못했습니다');
  } catch (e) { if (e.name !== 'AbortError') showToast('❌ 출처 검색 실패: ' + e.message); }
  finally { hideLoading(); }
}

/* =========================================================
   PRESENTATION MODE (req. 12)
   ========================================================= */
function updatePresLeftLabel() {
  const el = document.getElementById('pres-left-label');
  if (!el) return;
  if (_presFromCurrent) el.classList.add('show');
  else el.classList.remove('show');
}

function startPresentation() {
  if (!slides.length) return;
  presIndex = 0;
  _presFromCurrent = false;
  presNotesVisible = false;
  _presZoom = (typeof window.getSlideZoom === 'function' ? window.getSlideZoom() : 100);
  _presZoom = Math.max(30, Math.min(300, _presZoom));
  updatePresLeftLabel();
  document.getElementById('presentation-mode').classList.add('show');
  renderPresSlide();
  document.addEventListener('keydown', handlePresKey);
  document.addEventListener('wheel', handlePresWheel, { passive: false });
  setupPresCanvasResize();
  setTimeout(fitPresZoom, 80); // 초기 자동 맞춤
}

function startPresentationFromCurrent() {
  if (!slides.length) return;
  presIndex = activeSlideIndex;
  _presFromCurrent = true;
  presNotesVisible = false;
  _presZoom = (typeof window.getSlideZoom === 'function' ? window.getSlideZoom() : 100);
  _presZoom = Math.max(30, Math.min(300, _presZoom));
  updatePresLeftLabel();
  document.getElementById('presentation-mode').classList.add('show');
  renderPresSlide();
  document.addEventListener('keydown', handlePresKey);
  document.addEventListener('wheel', handlePresWheel, { passive: false });
  setupPresCanvasResize();
  setTimeout(fitPresZoom, 80);
}

function setupPresCanvasResize() {
  resizePresCanvas();
  window.addEventListener('resize', () => { resizePresCanvas(); fitPresZoom(); });
}

function resizePresCanvas() {
  const slideEl = document.getElementById('pres-slide-container');
  const canvas = document.getElementById('pres-canvas');
  if (!slideEl || !canvas) return;
  canvas.width = slideEl.clientWidth;
  canvas.height = slideEl.clientHeight;
  canvas.style.position = 'absolute';
  canvas.style.top = '0'; canvas.style.left = '0';
  _presCtx = canvas.getContext('2d');
  if (_presCtx) { _presCtx.lineJoin = 'round'; _presCtx.lineCap = 'round'; }
}

function exitPresentation() {
  document.getElementById('presentation-mode').classList.remove('show');
  document.removeEventListener('keydown', handlePresKey);
  document.removeEventListener('wheel', handlePresWheel);
  window.removeEventListener('resize', resizePresCanvas);
  _presFromCurrent = false;
  updatePresLeftLabel();
  clearPresCanvas();
}

function handlePresWheel(e) {
  if (!document.getElementById('presentation-mode')?.classList.contains('show')) return;
  e.preventDefault();
  if (e.deltaY > 0) presNav(1);
  else if (e.deltaY < 0) presNav(-1);
}

function handlePresKey(e) {
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') { e.preventDefault(); presNav(1); }
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); presNav(-1); }
  else if (e.ctrlKey && e.key === 'ArrowRight') { e.preventDefault(); presNav(1); }
  else if (e.ctrlKey && e.key === 'ArrowLeft') { e.preventDefault(); presNav(-1); }
  else if (e.key === 'Escape') exitPresentation();
  else if (e.key === 'n' || e.key === 'N') togglePresNotes();
  else if (e.key === '+' || e.key === '=') changePresZoom(+10);
  else if (e.key === '-') changePresZoom(-10);
  else if (e.key === 'f' || e.key === 'F') fitPresZoom();
  else if (e.ctrlKey && e.key === '9') { e.preventDefault(); changePresZoom(-10); }
  else if (e.ctrlKey && e.key === '0') { e.preventDefault(); changePresZoom(+10); }
}

function presNav(dir) {
  presIndex = Math.max(0, Math.min(slides.length - 1, presIndex + dir));
  clearPresCanvas(); renderPresSlide();
}
function promptPresJump() {
  if (!slides || !slides.length) return;
  const v = window.prompt(`이동할 페이지 번호를 입력하세요 (1-${slides.length})`, String(presIndex + 1));
  if (v === null) return;
  const n = parseInt(v, 10);
  if (!isFinite(n) || n < 1 || n > slides.length) {
    if (typeof showToast === 'function') showToast('⚠️ 유효한 페이지 번호를 입력하세요.');
    return;
  }
  presIndex = n - 1;
  clearPresCanvas();
  renderPresSlide();
}

let _presZoom = 100;
window._syncPresZoomFromSlide = function (v) {
  _presZoom = v;
  applyPresZoom();
};

function changePresZoom(delta) {
  _presZoom = Math.max(30, Math.min(300, _presZoom + delta));
  applyPresZoom();
  // #slides-canvas에도 동일 줌 적용 (외부발표/발표와 동기화)
  const clamped = Math.max(50, Math.min(200, _presZoom));
  if (typeof window._setSlideZoom === 'function') window._setSlideZoom(clamped);
  if (typeof window.applySlideZoom === 'function') window.applySlideZoom();
}

function applyPresZoom() {
  const container = document.getElementById('pres-slide-container');
  if (!container) return;
  container.style.transform = `scale(${_presZoom / 100})`;
  container.style.transformOrigin = 'center center';
  const zv = document.getElementById('pres-zoom-val');
  if (zv) zv.textContent = _presZoom + '%';
  // 캔버스 리사이즈 동기화
  resizePresCanvas();
}

function fitPresZoom() {
  const mode = document.getElementById('presentation-mode');
  const container = document.getElementById('pres-slide-container');
  if (!mode || !container) return;
  // 일시적으로 스케일 1 로 복원하여 실제 크기 측정
  container.style.transform = 'scale(1)';
  const mw = mode.clientWidth - 40;
  const mh = mode.clientHeight - 100; // controls bar 공간 확보
  const cw = container.offsetWidth || 900;
  const ch = container.offsetHeight || 506;
  const scale = Math.min(mw / cw, mh / ch);
  _presZoom = Math.round(Math.max(30, Math.min(200, scale * 100)));
  applyPresZoom();
  // #slides-canvas에도 동일 줌 적용
  const clamped = Math.max(50, Math.min(200, _presZoom));
  if (typeof window._setSlideZoom === 'function') window._setSlideZoom(clamped);
  if (typeof window.applySlideZoom === 'function') window.applySlideZoom();
}

function togglePresNotes() {
  presNotesVisible = !presNotesVisible;
  document.getElementById('pres-notes-bar').classList.toggle('show', presNotesVisible);
}

function renderPresSlide() {
  const slide = slides[presIndex]; if (!slide) return;
  const container = document.getElementById('pres-slide-container');
  const isCover = slide.isCover;
  const isDark = slideStyle === 'dark' || isCover;
  const hasSideImage = !!slide.imageUrl && !isCover;
  var rawPct = hasSideImage && slide.innerSize && slide.innerSize.widthPct != null ? slide.innerSize.widthPct : (typeof DEFAULT_IMAGE_SLIDE_TEXT_PCT !== 'undefined' ? DEFAULT_IMAGE_SLIDE_TEXT_PCT : 45);
  const textPct = hasSideImage ? Math.max(10, Math.min(90, rawPct)) : 0;
  const imgPct = 100 - textPct;
  const rightPadPct = hasSideImage ? Math.max(24, Math.min(60, imgPct + 4)) : 6;
  const rootPadding = hasSideImage ? ('5% ' + rightPadPct + '% 5% 6%') : '5% 6%';
  const bgCss = isCover ? 'background:linear-gradient(135deg,#0f2027,#203a43,#2c5364)'
    : isDark ? 'background:linear-gradient(135deg,#1a1a2e,#16213e)' : 'background:#fff';
  const titleColor = isDark ? 'color:#e8f4fd' : 'color:#1a1a2e';
  const bulletColor = isCover ? 'color:#d8e4f0' : (isDark ? 'color:#b8d4f0' : 'color:#333');
  const dotBg = isCover ? 'display:none' : (isDark ? 'background:#4f8ef7' : 'background:#4f8ef7');

  const fs = (typeof getSlideFontScale === 'function' ? getSlideFontScale() : 100) / 100;
  const tMin = Math.round(20 * fs), tMax = Math.round(44 * fs), tVw = (3.5 * fs).toFixed(1);
  const bMin = Math.round(11 * fs), bMax = Math.round(21 * fs), bVw = (1.7 * fs).toFixed(1);
  const titleSizePx = (slide.titleFontSize != null && slide.titleFontSize > 0) ? slide.titleFontSize : null;
  const titleStyle = titleSizePx ? ('font-size:' + titleSizePx + 'px') : ('font-size:clamp(' + tMin + 'px,' + tVw + 'vw,' + tMax + 'px)');
  const titlePosStyle = (slide.titlePosition && (slide.titlePosition.left != null || slide.titlePosition.top != null))
    ? ('position:absolute;left:' + (slide.titlePosition.left || 0) + 'px;top:' + (slide.titlePosition.top || 0) + 'px') : '';

  const innerHTML = `
    <div style="position:absolute;inset:0;padding:${rootPadding};display:flex;flex-direction:column;overflow:hidden;${bgCss};${isCover ? 'align-items:center;justify-content:center;text-align:center' : ''}">
      <div style="position:absolute;left:0;top:0;bottom:0;width:0.6%;background:#4f8ef7;${isCover ? 'display:none' : ''}"></div>
      <div style="${titleStyle};font-weight:700;line-height:1.2;margin-bottom:4%;font-family:var(--font-head);${titleColor};${titlePosStyle}${isCover ? ';border-bottom:2px solid rgba(79,142,247,0.5);padding-bottom:20px;margin-bottom:16px' : ''};min-width:0;overflow:hidden;word-break:break-word;">${markdownToHtml(slide.title)}</div>
      <div style="flex:1;min-width:0;overflow:hidden;">
        ${slide.bullets.map(b => `<div style="display:flex;gap:12px;margin-bottom:2%;align-items:flex-start;min-width:0;">
          <div style="width:8px;height:8px;border-radius:50%;flex-shrink:0;margin-top:0.5em;${dotBg}"></div>
          <div style="font-size:clamp(${bMin}px,${bVw}vw,${bMax}px);line-height:1.5;${bulletColor};min-width:0;overflow:hidden;word-break:break-word;">${markdownToHtml(b)}</div>
        </div>`).join('')}
      </div>
    </div>
    ${slide.imageUrl ? `<img style="position:absolute;right:0;top:0;bottom:0;width:${imgPct}%;object-fit:cover;object-position:center center;background:#f8fbff;" src="${slide.imageUrl}" alt=""/>` : ''}
  `;
  container.innerHTML = innerHTML;

  // Re-append and setup canvas
  const canvas = document.createElement('canvas');
  canvas.id = 'pres-canvas'; canvas.style.position = 'absolute'; canvas.style.inset = '0';
  if (_penTool !== 'pointer') canvas.style.pointerEvents = 'all';
  container.appendChild(canvas);
  resizePresCanvas();
  setupPenEventsOnCanvas(canvas);

  document.getElementById('pres-counter').textContent = `${presIndex + 1} / ${slides.length}`;
  const presFontEl = document.getElementById('pres-font-val');
  if (presFontEl) presFontEl.textContent = (typeof getSlideFontScale === 'function' ? getSlideFontScale() : 100) + '%';
  const notesBar = document.getElementById('pres-notes-bar');
  if (notesBar) { notesBar.textContent = presentationScript[presIndex] || slide.notes || ''; if (presNotesVisible) notesBar.classList.add('show'); }
  updatePenToolUI();
}

/* =========================================================
   PEN TOOLS (req. 12) — 도구별 굵기·농도 각각 적용
   ========================================================= */
function _savePenToolUIToSettings() {
  if (_penTool === 'pointer') return;
  const s = _penToolSettings[_penTool];
  if (!s) return;
  const sizeEl = document.getElementById('pen-size');
  if (sizeEl) s.size = Math.max(1, Math.min(40, parseInt(sizeEl.value) || 3));
  if (_penTool === 'pen' || _penTool === 'highlight') {
    const opacityEl = document.getElementById('pen-opacity');
    if (opacityEl) s.opacity = Math.max(0.01, Math.min(1, parseInt(opacityEl.value) / 100));
  }
}

function _loadPenToolSettingsToUI(tool) {
  const s = _penToolSettings[tool];
  if (!s) return;
  const sizeEl = document.getElementById('pen-size');
  if (sizeEl) { sizeEl.value = s.size; }
  const opacityEl = document.getElementById('pen-opacity');
  const opacityVal = document.getElementById('pen-opacity-val');
  if (tool === 'eraser') {
    if (opacityEl) { opacityEl.value = 100; opacityEl.disabled = true; }
    if (opacityVal) opacityVal.textContent = '100%';
    _penOpacity = 1;
  } else {
    if (opacityEl) { opacityEl.value = Math.round(s.opacity * 100); opacityEl.disabled = false; }
    if (opacityVal) opacityVal.textContent = Math.round(s.opacity * 100) + '%';
    _penOpacity = s.opacity;
  }
}

function setPenTool(tool) {
  _savePenToolUIToSettings();
  _penTool = tool;
  if (tool !== 'pointer') _loadPenToolSettingsToUI(tool);
  const canvas = document.getElementById('pres-canvas');
  if (canvas) {
    canvas.style.pointerEvents = tool === 'pointer' ? 'none' : 'all';
    canvas.style.cursor = tool === 'pointer' ? 'default' : tool === 'eraser' ? 'cell' : 'crosshair';
  }
  updatePenToolUI();
}

function updatePenToolUI() {
  ['pointer', 'pen', 'highlight', 'eraser'].forEach(t => {
    const btn = document.getElementById('tool-' + t);
    if (btn) btn.classList.toggle('active', _penTool === t);
  });
}

function setPenColor(color, dot) {
  _penColor = color;
  document.querySelectorAll('.pen-color-dot').forEach(d => d.classList.remove('active'));
  if (dot) dot.classList.add('active');
}

function setupPenEventsOnCanvas(canvas) {
  if (!canvas) return;
  canvas.addEventListener('mousedown', penDown);
  canvas.addEventListener('mousemove', penMove);
  canvas.addEventListener('mouseup', () => { _penDrawing = false; });
  canvas.addEventListener('mouseleave', () => { _penDrawing = false; });
  // Touch
  canvas.addEventListener('touchstart', e => { e.preventDefault(); const t = e.touches[0]; penDown({ clientX: t.clientX, clientY: t.clientY, target: canvas }); }, { passive: false });
  canvas.addEventListener('touchmove', e => { e.preventDefault(); const t = e.touches[0]; penMove({ clientX: t.clientX, clientY: t.clientY, target: canvas }); }, { passive: false });
  canvas.addEventListener('touchend', () => { _penDrawing = false; });
}

function getPresCanvasPos(e) {
  const canvas = document.getElementById('pres-canvas');
  if (!canvas) return { x: 0, y: 0 };
  const rect = canvas.getBoundingClientRect();
  // 화면상 클릭 위치(디스플레이 픽셀)
  const displayX = e.clientX - rect.left;
  const displayY = e.clientY - rect.top;
  // 캔버스 내부 좌표계로 변환 (줌/스케일 시 rect와 canvas 크기가 다를 수 있음)
  const scaleX = rect.width > 0 ? canvas.width / rect.width : 1;
  const scaleY = rect.height > 0 ? canvas.height / rect.height : 1;
  return {
    x: displayX * scaleX,
    y: displayY * scaleY
  };
}

function penDown(e) {
  if (_penTool === 'pointer') return;
  _penDrawing = true;
  const pos = getPresCanvasPos(e);
  _penLastX = pos.x; _penLastY = pos.y;
}

function penMove(e) {
  if (!_penDrawing || _penTool === 'pointer') return;
  const canvas = document.getElementById('pres-canvas');
  if (!canvas || !_presCtx) return;
  const pos = getPresCanvasPos(e);
  const s = _penToolSettings[_penTool];
  const size = s ? s.size : 3;
  _presCtx.save();
  if (_penTool === 'eraser') {
    _presCtx.globalCompositeOperation = 'destination-out';
    _presCtx.strokeStyle = 'rgba(0,0,0,1)';
    _presCtx.lineWidth = size * 4;
    _presCtx.globalAlpha = 1;
  } else if (_penTool === 'highlight') {
    _presCtx.globalCompositeOperation = 'source-over';
    _presCtx.strokeStyle = _penColor;
    _presCtx.lineWidth = size * 8;
    _presCtx.globalAlpha = s ? s.opacity : _penOpacity;
  } else {
    _presCtx.globalCompositeOperation = 'source-over';
    _presCtx.strokeStyle = _penColor;
    _presCtx.lineWidth = size;
    const op = s ? s.opacity : _penOpacity;
    _presCtx.globalAlpha = op * 2 > 1 ? 1 : Math.max(op * 2, 0.05);
  }
  _presCtx.lineJoin = 'round'; _presCtx.lineCap = 'round';
  _presCtx.beginPath(); _presCtx.moveTo(_penLastX, _penLastY); _presCtx.lineTo(pos.x, pos.y); _presCtx.stroke();
  _presCtx.restore();
  _penLastX = pos.x; _penLastY = pos.y;
}

function clearPresCanvas() {
  const canvas = document.getElementById('pres-canvas');
  if (canvas && _presCtx) _presCtx.clearRect(0, 0, canvas.width, canvas.height);
}

/* =========================================================
   EXPORT PPTX
   ========================================================= */
/** HTML/마크다운을 렌더링한 뒤 순수 텍스트로 변환 (PPTX 등 내보내기용) */
function renderTextForExport(text) {
  if (text == null || text === '') return '';
  const html = markdownToHtml(String(text));
  const div = document.createElement('div');
  div.innerHTML = html;
  return (div.textContent || div.innerText || '').trim().replace(/\s+/g, ' ') || '';
}

/** 여러 줄/블록이 있는 텍스트를 렌더링해 줄바꿈 유지한 순수 텍스트로 변환 */
function renderMultilineForExport(text) {
  if (text == null || text === '') return '';
  const html = markdownToHtml(String(text));
  const div = document.createElement('div');
  div.innerHTML = html;
  const raw = div.textContent || div.innerText || '';
  return raw.replace(/\u00A0/g, ' ').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
}

function openExportModal() { if (!slides.length) return; openModal('export-modal'); }

/** PPTX 미리보기: IndexedDB에 payload 저장 후 전용 HTML(pptx-preview.html)을 열어 blob URL 오류 회피 */
function openPptxPreviewWindow() {
  if (!slides || !slides.length) {
    if (typeof showToast === 'function') showToast('⚠️ 슬라이드가 없습니다');
    return;
  }
  if (!window.pptxPreviewOverrides) window.pptxPreviewOverrides = null;
  var newSlides = slides.map(function (s) {
    var bullets = s.bullets || [];
    return {
      title: s.title,
      bullets: bullets,
      titleHtml: typeof markdownToHtml === 'function' ? markdownToHtml(s.title) : (typeof escapeHtml === 'function' ? escapeHtml(s.title) : String(s.title || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')),
      bulletsHtml: bullets.map(function (b) { return typeof markdownToHtml === 'function' ? markdownToHtml(b) : (typeof escapeHtml === 'function' ? escapeHtml(b) : String(b || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')); }),
      imageUrl: s.imageUrl || '',
      isCover: !!s.isCover
    };
  });
  var store = 'snapshots';
  var key = 'pptx_preview';
  function buildPayload(saved) {
    var overridesBySlide = (saved && saved.overridesBySlide && typeof saved.overridesBySlide === 'object') ? saved.overridesBySlide : {};
    if (window.pptxPreviewOverrides && window.pptxPreviewOverrides.overridesBySlide) {
      overridesBySlide = window.pptxPreviewOverrides.overridesBySlide;
    } else if (window.pptxPreviewOverrides && !Object.keys(overridesBySlide).length) {
      overridesBySlide = { _global: window.pptxPreviewOverrides };
    }
    return { slides: newSlides, overridesBySlide: overridesBySlide };
  }
  function openPreview() {
    var path = (window.location.pathname || '').replace(/[^/]+$/, '') || '/';
    var previewUrl = (window.location.origin || '') + path + (path.charAt(path.length - 1) === '/' ? '' : '') + 'pptx-preview.html';
    if (window.location.protocol === 'file:') previewUrl = 'pptx-preview.html';
    var w = window.open(previewUrl, 'pptx-preview', 'width=900,height=700,scrollbars=yes');
    if (w) {
      window._pptxPreviewWin = w;
      window.addEventListener('beforeunload', function () {
        try { if (window._pptxPreviewWin && !window._pptxPreviewWin.closed) window._pptxPreviewWin.close(); } catch (e) {}
      });
      window.addEventListener('message', function onPptxPreviewMessage(e) {
        if (!e.data || !e.data.type) return;
        if (e.data.type === 'pptx-preview-overrides') {
          window.pptxPreviewOverrides = e.data.data || null;
          return;
        }
        if (e.data.type === 'pptx-preview-request-export') {
          var payload = (e.data.data && e.data.data.overridesBySlide)
            ? { overridesBySlide: e.data.data.overridesBySlide }
            : null;
          window.pptxPreviewOverrides = payload;
          if (typeof idbGet === 'function' && typeof idbPut === 'function') {
            idbGet(store, key).then(function (saved) {
              var toSave = saved && typeof saved === 'object' ? Object.assign({}, saved) : {};
              toSave.overridesBySlide = (payload && payload.overridesBySlide) ? payload.overridesBySlide : (toSave.overridesBySlide || {});
              return idbPut(store, key, toSave);
            }).then(function () {
              if (typeof exportPPT === 'function') exportPPT();
            }).catch(function () {
              if (typeof exportPPT === 'function') exportPPT();
            });
          } else {
            if (typeof exportPPT === 'function') exportPPT();
          }
          return;
        }
      });
    } else {
      if (typeof showToast === 'function') showToast('⚠️ 팝업이 차단되었을 수 있습니다. 팝업 허용 후 다시 시도하세요.');
    }
  }
  if (typeof idbPut === 'function') {
    var doPut = function (saved) { return idbPut(store, key, buildPayload(saved)); };
    if (typeof idbGet === 'function') {
      idbGet(store, key).then(doPut).then(openPreview).catch(function (err) {
        console.warn('PPTX preview idbPut failed', err);
        doPut(null).then(openPreview).catch(function () { openPreview(); });
      });
    } else {
      doPut(null).then(openPreview).catch(function () { openPreview(); });
    }
  } else {
    openPreview();
  }
}

function openSummaryOptionsModal() {
  if (!rawText) { showToast('⚠️ 먼저 텍스트를 로드하세요'); return; }
  var modal = document.getElementById('summary-options-modal');
  var slideCountRow = document.getElementById('summary-slide-count-row');
  var slideCountInput = document.getElementById('summary-options-slide-count');
  var mainSlideCount = document.getElementById('slide-count-val');
  var customInModal = document.getElementById('summary-options-custom-instruction');
  var customInPanel = document.getElementById('custom-instruction-val');
  if (slideCountInput && mainSlideCount && mainSlideCount.value) slideCountInput.value = mainSlideCount.value;
  if (customInModal) customInModal.value = (customInPanel && customInPanel.value) ? customInPanel.value : '';
  function updateSlideCountVisibility() {
    var styleRadios = document.querySelectorAll('input[name="summary-style"]');
    var styleId = 'research';
    for (var i = 0; i < styleRadios.length; i++) { if (styleRadios[i].checked) { styleId = styleRadios[i].value; break; } }
    if (slideCountRow) slideCountRow.style.display = styleId === 'slide' ? 'block' : 'none';
  }
  updateSlideCountVisibility();
  modal.querySelectorAll('input[name="summary-style"]').forEach(function (r) {
    r.removeEventListener('change', updateSlideCountVisibility);
    r.addEventListener('change', updateSlideCountVisibility);
  });
  openModal('summary-options-modal');
}

function loadSummaryFromHistory(id) {
  if (!id || typeof window.getSummaryHistory !== 'function' || typeof window.setSummaryText !== 'function') return;
  var list = window.getSummaryHistory();
  var item = list.find(function (h) { return h.id === id; });
  if (!item || !item.summaryText) return;
  window.setSummaryText(item.summaryText);
  if (typeof window.setSummarySubTab === 'function') window.setSummarySubTab('current');
  renderLeftPanel();
}

function confirmSummaryOptions() {
  var modeEl = document.querySelector('input[name="summary-mode"]:checked');
  var styleEl = document.querySelector('input[name="summary-style"]:checked');
  var granularityEl = document.querySelector('input[name="summary-granularity"]:checked');
  var mode = (modeEl && modeEl.value) || 'original';
  var styleId = (styleEl && styleEl.value) || 'detail';
  var granularity = (granularityEl && granularityEl.value) || 'detail';
  var slideCount = 12;
  if (styleId === 'slide') {
    var sc = document.getElementById('summary-options-slide-count');
    if (sc && sc.value) slideCount = parseInt(sc.value, 10) || 12;
  }
  var customInstruction = '';
  var customInModal = document.getElementById('summary-options-custom-instruction');
  if (customInModal && customInModal.value) customInstruction = customInModal.value.trim();
  var customInPanel = document.getElementById('custom-instruction-val');
  if (customInPanel) customInPanel.value = customInstruction;
  closeModal('summary-options-modal');
  generateSummary('full', { mode: mode, styleId: styleId, slideCount: slideCount, granularity: granularity, customInstruction: customInstruction });
}


async function exportPPT() {
  closeModal('export-modal');
  showLoading('PPTX 생성 중...', 'PptxGenJS 로드 및 변환', 20);
  const includeNotes = document.getElementById('export-notes')?.checked !== false;
  const includeImages = document.getElementById('export-images')?.checked !== false;
  const includeRefs = document.getElementById('export-refs')?.checked;
  const fontKo = document.getElementById('export-font-ko')?.value || '맑은 고딕';
  const fontEn = document.getElementById('export-font-en')?.value || 'Times New Roman';

  // IndexedDB에 저장된 PPTX 미리보기 편집이 있으면 사용, 없으면 window.pptxPreviewOverrides 사용
  let overridesBySlide = null;
  if (typeof idbGet === 'function') {
    try {
      const saved = await idbGet('snapshots', 'pptx_preview');
      if (saved && saved.overridesBySlide && typeof saved.overridesBySlide === 'object') {
        overridesBySlide = saved.overridesBySlide;
      } else if (saved && saved.overrides) {
        overridesBySlide = { _global: saved.overrides };
      }
    } catch (e) { /* ignore */ }
  }
  if (!overridesBySlide && window.pptxPreviewOverrides && window.pptxPreviewOverrides.overridesBySlide) {
    overridesBySlide = window.pptxPreviewOverrides.overridesBySlide;
  } else if (!overridesBySlide && window.pptxPreviewOverrides) {
    overridesBySlide = { _global: window.pptxPreviewOverrides };
  }

  // 이미지 비율 유지(contain)로 넣기 위한 헬퍼
  async function getImgSize(dataUrl) {
    return await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth || img.width, h: img.naturalHeight || img.height });
      img.onerror = () => resolve({ w: 1, h: 1 });
      img.src = dataUrl;
    });
  }
  async function addImageContain(pptxSlide, dataUrl, box) {
    const { x, y, w, h } = box;
    const s = await getImgSize(dataUrl);
    const imgAR = s.w / s.h;
    const boxAR = w / h;
    let dw = w, dh = h, dx = x, dy = y;
    if (imgAR > boxAR) { // fit width
      dh = w / imgAR;
      dy = y + (h - dh) / 2;
    } else { // fit height
      dw = h * imgAR;
      dx = x + (w - dw) / 2;
    }
    try { pptxSlide.addImage({ data: dataUrl, x: dx, y: dy, w: dw, h: dh }); } catch (e) { }
  }

  try {
    if (!window.PptxGenJS) {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/gh/gitbrent/pptxgenjs@3.12.0/dist/pptxgen.bundle.js';
        s.onload = resolve; s.onerror = reject;
        document.head.appendChild(s);
      });
    }

    const pptx = new window.PptxGenJS();
    pptx.layout = 'LAYOUT_16x9';

    const exportSlides = [...slides];
    if (includeRefs && ReferenceStore.getAll().length) {
      const style = document.getElementById('citation-style')?.value || 'APA';
      const refs = ReferenceStore.getAll()
        .sort((a, b) => a.authors.localeCompare(b.authors))
        .map(r => renderTextForExport(formatCitation(r, style)));
      exportSlides.push({ title: 'References', bullets: refs, notes: '', imageUrl: null, imageUrl2: null, isCover: false });
    }

    for (let idx = 0; idx < exportSlides.length; idx++) {
      const slide = exportSlides[idx];
      setProgress(20 + Math.round((idx / exportSlides.length) * 70));

      const s = pptx.addSlide();
      const isDark = slide.isCover || (slideStyle === 'dark');
      s.background = { color: isDark ? '1a1a2e' : 'f8f9ff' };
      const titleColor = isDark ? 'e8f4fd' : '1a1a2e';
      const bodyColor = isDark ? 'b8d4f0' : '444455';

      const fontScale = (typeof getSlideFontScale === 'function' ? getSlideFontScale() : 100) / 100;
      let ov = overridesBySlide ? (overridesBySlide[idx] || overridesBySlide._global || null) : null;
      if (ov && (ov.imgX != null || ov.imgY != null) && !ov.imageBox) {
        const scale = (ov.imageScale != null ? ov.imageScale : 100) / 100;
        ov = {
          textBox: ov.textX != null ? { x: ov.textX, y: ov.textY, w: ov.textW || 5, h: ov.textH || 4 } : null,
          textW: ov.textW,
          imageBox: { x: ov.imgX ?? 5.55, y: ov.imgY ?? 1, w: (ov.imgW || 3.95) * scale, h: (ov.imgH || 3.25) * scale },
          titleFontSize: ov.titleFs ?? ov.titleFontSize,
          bodyFontSize: ov.bodyFs ?? ov.bodyFontSize
        };
      }
      const titleFontSize = (ov && (ov.titleFontSize != null || ov.titleFs != null)) ? (ov.titleFontSize ?? ov.titleFs) : ((slide.titleFontSize != null && slide.titleFontSize > 0) ? slide.titleFontSize : Math.round(28 * fontScale));
      const bodyFontSize = (ov && (ov.bodyFontSize != null || ov.bodyFs != null)) ? (ov.bodyFontSize ?? ov.bodyFs) : Math.round(14 * fontScale);

      // left accent bar
      s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.1, h: 5.63, fill: { color: '4f8ef7' }, line: { type: 'none' } });

      const hasImg1 = !!(slide.imageUrl && includeImages);
      const hasImg2 = !!(slide.imageUrl2 && includeImages);
      const textBox = (ov && ov.textBox && typeof ov.textBox.x === 'number') ? { x: ov.textBox.x, y: ov.textBox.y, w: Math.max(1, Math.min(9, ov.textBox.w || 5)), h: Math.max(1.5, Math.min(5.5, ov.textBox.h || 4)) } : (ov && ov.textX != null) ? { x: ov.textX, y: ov.textY, w: ov.textW || 5, h: ov.textH || 4 } : null;
      const textW = textBox ? textBox.w : ((ov && ov.textW != null) ? Math.max(1, Math.min(9, ov.textW)) : ((hasImg1 || hasImg2) ? 5.0 : 9.1));
      const textX = textBox ? textBox.x : 0.4;
      const textY = textBox ? textBox.y : 0.3;
      const textH = textBox ? textBox.h : 4.0;

      const titleText = renderTextForExport(slide.title);
      s.addText(titleText || '', { x: textX, y: textY, w: textW, h: 1.0, fontSize: titleFontSize, bold: true, color: titleColor, fontFace: fontKo });

      const bullets = (slide.bullets || []).map(b => ({
        text: renderMultilineForExport(b),
        options: { bullet: true, fontSize: bodyFontSize, color: bodyColor, paraSpaceAfter: 7, fontFace: fontKo }
      }));
      s.addText(bullets, { x: textX, y: textY + 1.1, w: textW, h: Math.max(1.5, textH - 1.1), valign: 'top', fontFace: fontKo, fontSize: bodyFontSize, color: bodyColor });

      // ✅ 이미지: 미리보기 overrides 또는 기본 레이아웃
      const box1 = (ov && ov.imageBox) ? { x: ov.imageBox.x, y: ov.imageBox.y, w: ov.imageBox.w, h: ov.imageBox.h } : { x: 5.55, y: 1.0, w: 3.95, h: 3.25 };
      const box2a = (ov && ov.imageBox) ? { x: ov.imageBox.x, y: 0.95, w: ov.imageBox.w, h: Math.max(0.5, (ov.imageBox.h || 3.25) * 0.63) } : { x: 5.55, y: 0.95, w: 3.95, h: 2.05 };
      const box2b = (ov && ov.imageBox) ? { x: ov.imageBox.x, y: 0.95 + (ov.imageBox.h || 3.25) * 0.63, w: ov.imageBox.w, h: Math.max(0.5, (ov.imageBox.h || 3.25) * 0.37) } : { x: 5.55, y: 3.10, w: 3.95, h: 2.05 };
      if (hasImg1 && !hasImg2) {
        await addImageContain(s, slide.imageUrl, box1);
      }
      if (hasImg1 && hasImg2) {
        await addImageContain(s, slide.imageUrl, box2a);
        await addImageContain(s, slide.imageUrl2, box2b);
      }

      s.addText(String(idx + 1), { x: 9.2, y: 5.1, w: 0.5, h: 0.3, fontSize: 9, color: 'aaaaaa', align: 'right' });

      if (includeNotes) {
        const noteRaw = presentationScript[idx] || slide.notes || '';
        const noteText = noteRaw ? renderMultilineForExport(noteRaw) : '';
        if (noteText) s.addNotes(noteText);
      }
    }

    setProgress(95);
    const srcName = (typeof window.getFileName === 'function' ? window.getFileName() : fileName) || '';
    const baseName = (typeof srcName === 'string' && srcName.trim() && !/^여러 파일/.test(srcName))
      ? srcName.replace(/\.[^.]+$/, '').replace(/[/\\:*?"<>|]/g, '_').trim() || 'ScholarSlide'
      : 'ScholarSlide';
    const dateStr = new Date().toISOString().slice(0, 10);
    const exportName = `${baseName}_ssp_${dateStr}.pptx`;
    await pptx.writeFile({ fileName: exportName });
    showToast('✅ PPTX 다운로드 완료');
  } catch (e) {
    console.error(e);
    showToast('❌ PPTX 내보내기 실패: ' + e.message);
  } finally {
    hideLoading();
  }
}


/* =========================================================
   SLIDE RESET — 슬라이드 창만 초기화 (문서·요약·참고문헌 유지)
   ========================================================= */
function slideReset() {
  if (!slides.length) { showToast('ℹ️ 초기화할 슬라이드가 없습니다'); return; }
  if (!confirm('슬라이드를 모두 초기화하시겠습니까?\n(문서·요약·참고문헌은 유지됩니다)')) return;
  slides = [];
  activeSlideIndex = 0;
  presentationScript = [];
  if (typeof slideUndoStack !== 'undefined') slideUndoStack = [];
  if (typeof slideRedoStack !== 'undefined') slideRedoStack = [];
  const footer = document.getElementById('slide-footer');
  if (footer) footer.style.display = 'none';
  const cntEl = document.getElementById('slides-count');
  if (cntEl) cntEl.style.display = 'none';
  const extBtn = document.getElementById('ext-present-btn');
  if (extBtn) extBtn.style.display = 'none';
  ['export-btn', 'pptx-preview-btn', 'visualize-btn', 'slide-reset-btn', 'save-session-btn', 'gen-script-btn', 'present-btn', 'present-from-current-btn', 'slide-sync-btn', 'apply-layout-all-btn', 'save-slide-history-btn']
    .forEach(id => { const el = document.getElementById(id); if (el) el.disabled = true; });
  _slideSyncEnabled = false;
  updateSlideSyncButton();
  renderSlides();
  renderThumbs();
  if (typeof renderLeftPanel === 'function') renderLeftPanel();
  showToast('🔄 슬라이드 초기화 완료');
}

/* =========================================================
   CLEAR ALL
   ========================================================= */
function clearAll() {
  if (!confirm('모든 데이터를 초기화하시겠습니까?\n(자동저장도 함께 삭제됩니다)')) return;
  if (typeof window.setFileSlots === 'function') window.setFileSlots([]);
  rawText = ''; fileName = ''; slides = []; sources = []; summaryText = ''; presentationScript = []; activeSlideIndex = 0;
  if (typeof slideUndoStack !== 'undefined') slideUndoStack = [];
  if (typeof slideRedoStack !== 'undefined') slideRedoStack = [];
  window._translatedSummary = ''; window._translatedRaw = '';
  // Clear autosave
  idbDelete(IDB_STORE, IDB_KEY).catch(() => { });
  if (_autosaveTimer) clearTimeout(_autosaveTimer);
  _autosaveDirty = false;
  updateAutosaveIndicator('');
  const footer = document.getElementById('slide-footer'); if (footer) footer.style.display = 'none';
  const cntEl = document.getElementById('slides-count'); if (cntEl) cntEl.style.display = 'none';
  const extBtn = document.getElementById('ext-present-btn'); if (extBtn) extBtn.style.display = 'none';
  ['export-btn', 'pptx-preview-btn', 'visualize-btn', 'slide-reset-btn', 'save-session-btn', 'gen-script-btn', 'present-btn', 'slide-sync-btn', 'apply-layout-all-btn', 'save-slide-history-btn']
    .forEach(id => { const el = document.getElementById(id); if (el) el.disabled = true; });
  _slideSyncEnabled = false;
  updateSlideSyncButton();
  const canvas = document.getElementById('slides-canvas');
  if (canvas) canvas.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🎞</div><p>슬라이드가 없습니다</p></div>`;
  const srcList = document.getElementById('sources-list');
  if (srcList) srcList.innerHTML = '<p class="placeholder-msg">검색어를 입력하고 출처 검색을 실행하세요.</p>';
  renderRefsPanel(); renderLeftPanel(); showToast('🗑 초기화 완료');
}

/* =========================================================
   INIT
   ========================================================= */

/* =========================================================
   PDF PREVIEW VIEWER
   ========================================================= */
let _pdfDoc = null;
let _pdfCurrentPage = 1;
let _pdfTotalPages = 0;
let _pdfScale = 2.0;
let _pdfRendering = false;
let _pdfPendingPage = null;
let _pdfThumbsRendered = false;

// ── Open / Close (팝업: 오른쪽 하단, 헤더 드래그로 이동) ──
let _pdfPanelDragInited = false;
let _pdfPanelDrag = { active: false, startX: 0, startY: 0, startLeft: 0, startTop: 0 };

function initPdfPanelDrag() {
  const panel = document.getElementById('pdf-preview-panel');
  const header = panel && panel.querySelector('.pdf-preview-header');
  if (!panel || !header) return;
  header.addEventListener('mousedown', function (e) {
    if (e.button !== 0 || e.target.closest('.pdf-nav-btn')) return;
    e.preventDefault();
    var rect = panel.getBoundingClientRect();
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
    panel.style.left = rect.left + 'px';
    panel.style.top = rect.top + 'px';
    _pdfPanelDrag.active = true;
    _pdfPanelDrag.startX = e.clientX;
    _pdfPanelDrag.startY = e.clientY;
    _pdfPanelDrag.startLeft = rect.left;
    _pdfPanelDrag.startTop = rect.top;
    panel.classList.add('pdf-dragging');
  });
  document.addEventListener('mousemove', function onPdfDragMove(e) {
    if (!_pdfPanelDrag.active) return;
    var w = panel.offsetWidth;
    var h = panel.offsetHeight;
    var left = _pdfPanelDrag.startLeft + (e.clientX - _pdfPanelDrag.startX);
    var top = _pdfPanelDrag.startTop + (e.clientY - _pdfPanelDrag.startY);
    left = Math.max(0, Math.min(window.innerWidth - w, left));
    top = Math.max(0, Math.min(window.innerHeight - h, top));
    panel.style.left = left + 'px';
    panel.style.top = top + 'px';
  });
  document.addEventListener('mouseup', function onPdfDragUp() {
    if (_pdfPanelDrag.active) {
      _pdfPanelDrag.active = false;
      panel.classList.remove('pdf-dragging');
    }
  });
}

function openPdfPreview() {
  const panel = document.getElementById('pdf-preview-panel');
  const toggle = document.getElementById('pdf-preview-toggle');
  if (panel) {
    panel.classList.add('open');
    if (!_pdfPanelDragInited) {
      initPdfPanelDrag();
      _pdfPanelDragInited = true;
    }
  }
  if (toggle) toggle.style.display = 'flex';
}

function closePdfPreview() {
  const panel = document.getElementById('pdf-preview-panel');
  if (panel) panel.classList.remove('open');
}

function togglePdfPreview() {
  const panel = document.getElementById('pdf-preview-panel');
  if (panel) panel.classList.toggle('open');
  if (panel && panel.classList.contains('open') && !_pdfPanelDragInited) {
    initPdfPanelDrag();
    _pdfPanelDragInited = true;
  }
}

// ── PDF 패널 상하 리사이즈 (캔버스 영역 vs 썸네일 스트립) ──
let _pdfResizeActive = false;
let _pdfResizeStartY = 0;
let _pdfResizeStartH = 0;

function startPdfPanelResize(e) {
  e.preventDefault();
  const strip = document.getElementById('pdf-thumb-strip');
  if (!strip) return;
  _pdfResizeActive = true;
  _pdfResizeStartY = e.clientY;
  _pdfResizeStartH = strip.offsetHeight;
  document.body.classList.add('pdf-panel-resizing');
  document.addEventListener('mousemove', doPdfPanelResize);
  document.addEventListener('mouseup', stopPdfPanelResize);
}

function doPdfPanelResize(e) {
  if (!_pdfResizeActive) return;
  const strip = document.getElementById('pdf-thumb-strip');
  if (!strip) return;
  const dy = e.clientY - _pdfResizeStartY;
  let h = Math.max(48, Math.min(200, _pdfResizeStartH + dy));
  strip.style.height = h + 'px';
}

function stopPdfPanelResize() {
  _pdfResizeActive = false;
  document.body.classList.remove('pdf-panel-resizing');
  document.removeEventListener('mousemove', doPdfPanelResize);
  document.removeEventListener('mouseup', stopPdfPanelResize);
}

// ── Load PDF for preview (called from handleFileUpload) ──
async function loadPdfPreview(arrayBuffer, name) {
  ensurePDFWorker();
  try {
    const pdfjsLib = window.pdfjsLib;
    _pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise;
    _pdfTotalPages = _pdfDoc.numPages;
    _pdfCurrentPage = 1;
    _pdfThumbsRendered = false;

    // Update UI
    const fnEl = document.getElementById('pdf-preview-filename');
    if (fnEl) fnEl.textContent = name || 'PDF 미리보기';
    const totalEl = document.getElementById('pdf-total-pages');
    if (totalEl) totalEl.textContent = _pdfTotalPages;

    openPdfPreview();
    await pdfRenderPage(_pdfCurrentPage);
    pdfRenderAllThumbs();
  } catch (e) {
    console.error('[PDF Preview]', e);
    showToast('❌ PDF 미리보기 로드 실패: ' + e.message);
  }
}

// ── Render a page onto main canvas ──────────────────────
async function pdfRenderPage(pageNum) {
  if (!_pdfDoc) return;
  if (_pdfRendering) { _pdfPendingPage = pageNum; return; }
  _pdfRendering = true;

  const loadingEl = document.getElementById('pdf-page-loading');
  if (loadingEl) loadingEl.style.display = 'flex';

  try {
    const page = await _pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: _pdfScale });
    const canvas = document.getElementById('pdf-main-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport }).promise;

    // Update page counter
    const curEl = document.getElementById('pdf-cur-page');
    if (curEl) curEl.textContent = pageNum;
    _pdfCurrentPage = pageNum;

    // Nav button states
    const prevBtn = document.getElementById('pdf-prev-btn');
    const nextBtn = document.getElementById('pdf-next-btn');
    if (prevBtn) prevBtn.disabled = pageNum <= 1;
    if (nextBtn) nextBtn.disabled = pageNum >= _pdfTotalPages;

    // Active thumbnail
    document.querySelectorAll('.pdf-thumb').forEach((el, i) => {
      el.classList.toggle('active', i + 1 === pageNum);
    });
    // Scroll active thumb into view
    const activeThumb = document.querySelector(`.pdf-thumb[data-page="${pageNum}"]`);
    if (activeThumb) activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });

    // Zoom label
    const zoomEl = document.getElementById('pdf-zoom-val');
    if (zoomEl) zoomEl.textContent = Math.round(_pdfScale * 100) + '%';

  } catch (e) {
    console.error('[PDF render page]', e);
  } finally {
    _pdfRendering = false;
    if (loadingEl) loadingEl.style.display = 'none';
    if (_pdfPendingPage !== null) {
      const pending = _pdfPendingPage;
      _pdfPendingPage = null;
      pdfRenderPage(pending);
    }
  }
}

// ── Render all thumbnails ────────────────────────────────
async function pdfRenderAllThumbs() {
  if (!_pdfDoc || _pdfThumbsRendered) return;
  const strip = document.getElementById('pdf-thumb-strip');
  if (!strip) return;
  strip.innerHTML = '';

  const THUMB_SCALE = 0.18;

  for (let i = 1; i <= _pdfTotalPages; i++) {
    // Create thumb container immediately
    const wrapper = document.createElement('div');
    wrapper.className = 'pdf-thumb' + (i === _pdfCurrentPage ? ' active' : '');
    wrapper.dataset.page = i;
    wrapper.title = `페이지 ${i}`;
    wrapper.onclick = () => pdfRenderPage(i);

    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.style.width = '100%';
    thumbCanvas.style.height = '100%';

    const numLabel = document.createElement('div');
    numLabel.className = 'pdf-thumb-num';
    numLabel.textContent = i;

    wrapper.appendChild(thumbCanvas);
    wrapper.appendChild(numLabel);
    strip.appendChild(wrapper);

    // Render async (non-blocking — use requestIdleCallback / setTimeout)
    ((pageNum, cvs) => {
      setTimeout(async () => {
        try {
          const pg = await _pdfDoc.getPage(pageNum);
          const vp = pg.getViewport({ scale: THUMB_SCALE });
          cvs.width = vp.width;
          cvs.height = vp.height;
          await pg.render({ canvasContext: cvs.getContext('2d'), viewport: vp }).promise;
        } catch { }
      }, (pageNum - 1) * 80); // stagger to avoid janking
    })(i, thumbCanvas);
  }
  _pdfThumbsRendered = true;
}

// ── Navigation ───────────────────────────────────────────
function pdfNavPage(dir) {
  const target = _pdfCurrentPage + dir;
  if (target < 1 || target > _pdfTotalPages) return;
  pdfRenderPage(target);
}

// ── Zoom ─────────────────────────────────────────────────
function pdfZoom(delta) {
  _pdfScale = Math.max(0.4, Math.min(4.0, _pdfScale + delta));
  pdfRenderPage(_pdfCurrentPage);
}

function pdfFitWidth() {
  const wrap = document.getElementById('pdf-canvas-wrap');
  if (!wrap || !_pdfDoc) return;
  const availW = wrap.clientWidth - 32; // 16px padding each side
  _pdfDoc.getPage(_pdfCurrentPage).then(page => {
    const baseVP = page.getViewport({ scale: 1 });
    _pdfScale = availW / baseVP.width;
    pdfRenderPage(_pdfCurrentPage);
  });
}

// ── Keyboard navigation (only when panel is open) ────────
document.addEventListener('keydown', e => {
  const panel = document.getElementById('pdf-preview-panel');
  if (!panel || !panel.classList.contains('open') || !_pdfDoc) return;
  if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); pdfNavPage(1); }
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); pdfNavPage(-1); }
  else if (e.key === '+' || e.key === '=') pdfZoom(0.2);
  else if (e.key === '-') pdfZoom(-0.2);
});

// ── Extract text from current page for copy ──────────────
async function extractCurrentPageText() {
  if (!_pdfDoc) return;
  try {
    const page = await _pdfDoc.getPage(_pdfCurrentPage);
    const content = await page.getTextContent();
    const text = content.items.map(it => it.str).join(' ');
    await navigator.clipboard.writeText(text);
    showToast(`📋 ${_pdfCurrentPage}페이지 텍스트 복사됨 (${text.length}자)`);
  } catch (e) {
    showToast('❌ 텍스트 추출 실패: ' + e.message);
  }
}

/* =========================================================
   V3.1 — PATCH 1: IMAGE UPLOAD & CROP OVERHAUL
   ========================================================= */

// ── State ────────────────────────────────────────────────
let _cropRatio = 'free';           // current crop ratio preset
let _origImageDataURL = null;      // current base image (upload or AI-generated)
let _initialUploadDataURL = null;  // first upload only (never overwritten by AI)
let _imgPasteZoneActive = false;   // true after user clicks paste zone (Ctrl+V 붙여넣기용)

// ── Open image modal ─────────────────────────────────────
function openImageModal(slideIdx, options) {
  const opts = options || {};
  _targetSlideForImage = slideIdx !== undefined ? slideIdx : activeSlideIndex;
  const isSecondImageMode = !!(opts.asSecondImage || window._applyAsSecondImage);
  if (!isSecondImageMode) window._applyAsSecondImage = false;
  _finalCroppedDataURL = null;
  _currentCropImg = null;
  _origImageDataURL = null;
  _initialUploadDataURL = null;
  _cropEventsAttached = false;
  _imgPasteZoneActive = false;

  const row = document.getElementById('img-upload-paste-row');
  const dropZone = document.getElementById('img-drop-zone');
  const cropArea = document.getElementById('crop-area');

  // 두 번째 이미지 모드에서는 기본적으로 빈 상태로 시작
  const shouldPreload = opts.preloadExisting !== false;
  const existingImg = shouldPreload
    ? (isSecondImageMode ? slides[_targetSlideForImage]?.imageUrl2 : slides[_targetSlideForImage]?.imageUrl)
    : null;

  if (existingImg) {
    if (row) row.style.display = 'none';
    if (cropArea) cropArea.style.display = 'block';
  } else {
    if (row) row.style.display = 'flex';
    if (dropZone) dropZone.style.display = 'flex';
    if (cropArea) cropArea.style.display = 'none';
  }

  const applyBtn = document.getElementById('img-apply-btn');
  if (applyBtn) applyBtn.disabled = false;
  const aiPromptEl = document.getElementById('img-ai-prompt');
  const aiStatusEl = document.getElementById('img-ai-status');
  if (aiPromptEl) aiPromptEl.value = '';
  if (aiStatusEl) aiStatusEl.textContent = '';

  // Setup drag-drop (업로드 박스에만)
  if (dropZone) {
    dropZone.ondragover = e => { e.preventDefault(); dropZone.classList.add('drag-over'); };
    dropZone.ondragleave = () => dropZone.classList.remove('drag-over');
    dropZone.ondrop = e => {
      e.preventDefault(); dropZone.classList.remove('drag-over');
      const f = e.dataTransfer.files[0];
      if (f) loadImageForCrop({ target: { files: [f], value: '' } });
    };
    dropZone.onclick = () => { _imgPasteZoneActive = false; document.getElementById('img-file-input').click(); };
  }

  // 붙여넣기 영역 클릭 시 포커스 + 플래그
  const pasteZone = document.getElementById('img-paste-zone');
  if (pasteZone) {
    pasteZone.onclick = function () { _imgPasteZoneActive = true; this.focus(); };
    pasteZone.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); _imgPasteZoneActive = true; } };
  }

  openModal('img-modal');

  const imgModelSel = document.getElementById('img-ai-model-select');
  if (imgModelSel && typeof getImageModelId === 'function') imgModelSel.value = getImageModelId() || 'gemini-3.1-flash-image-preview';

  const curRatio = (typeof getImageAspectRatio === 'function' ? getImageAspectRatio() : '1:1');
  document.querySelectorAll('.img-ai-ratio-btn').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-ratio') === curRatio); });

  if (opts.prefillPrompt && slides[_targetSlideForImage]) {
    const promptEl = document.getElementById('img-ai-prompt');
    if (promptEl) promptEl.value = slides[_targetSlideForImage].visPrompt || '';
  }

  // ✅ 모달이 완전히 열린 뒤 이미지 로드 (DOM 렌더링 보장)
  if (existingImg) {
    setTimeout(() => {
      const img = new Image();
      img.onload = () => {
        _currentCropImg = img;
        _origImageDataURL = existingImg;
        _finalCroppedDataURL = existingImg;
        _initialUploadDataURL = existingImg;
        _cropSelection = { x: 0, y: 0, w: img.naturalWidth || img.width, h: img.naturalHeight || img.height };
        _cropEventsAttached = false; // 이벤트 재연결 보장

        const origPrev = document.getElementById('orig-preview-img');
        const curPrev = document.getElementById('crop-result-img');
        const wrap = document.getElementById('crop-result-wrap');
        if (origPrev) origPrev.src = existingImg;
        if (curPrev) curPrev.src = existingImg;
        if (wrap) wrap.style.display = 'block';

        _cropRatio = 'free';
        document.querySelectorAll('.crop-ratio-btn').forEach(b => b.classList.remove('active'));
        const freeBtn = document.querySelector('.crop-ratio-btn');
        if (freeBtn) freeBtn.classList.add('active');

        drawCropCanvas();
      };
      img.src = existingImg;
    }, 120); // 모달 애니메이션 후 실행
  }
}

// ── 이미지 모달: 붙여넣기 영역 클릭 후 Ctrl+V 처리 ─────────
document.addEventListener('paste', function imgModalPaste(e) {
  const modal = document.getElementById('img-modal');
  if (!modal || !modal.classList.contains('open') || !_imgPasteZoneActive) return;
  if (!e.clipboardData || !e.clipboardData.items) return;
  let file = null;
  for (let i = 0; i < e.clipboardData.items.length; i++) {
    const item = e.clipboardData.items[i];
    if (item.type.indexOf('image') !== -1) { file = item.getAsFile(); break; }
  }
  if (!file) return;
  e.preventDefault();
  loadImageForCrop({ target: { files: [file], value: '' } });
});

// ── Load image — immediately activate insert ─────────────
function loadImageForCrop(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const img = new Image();
    img.onload = () => {
      _currentCropImg = img;
      _origImageDataURL = ev.target.result;
      _finalCroppedDataURL = ev.target.result; // default: full image
      _initialUploadDataURL = ev.target.result;
      _cropSelection = { x: 0, y: 0, w: img.width, h: img.height };

      // Show crop area
      const row = document.getElementById('img-upload-paste-row');
      const dropZone = document.getElementById('img-drop-zone');
      const cropArea = document.getElementById('crop-area');
      if (row) row.style.display = 'none';
      if (dropZone) dropZone.style.display = 'none';
      if (cropArea) cropArea.style.display = 'block';

      // Show original + current previews
      const origPrev = document.getElementById('orig-preview-img');
      const curPrev = document.getElementById('crop-result-img');
      if (origPrev) origPrev.src = _origImageDataURL;
      if (curPrev) curPrev.src = _origImageDataURL;

      // Reset scale
      const scaleEl = document.getElementById('img-scale');
      const scaleVal = document.getElementById('img-scale-val');
      if (scaleEl) scaleEl.value = '100';
      if (scaleVal) scaleVal.textContent = '100%';

      // Draw crop canvas
      _cropRatio = 'free';
      document.querySelectorAll('.crop-ratio-btn').forEach(b => b.classList.remove('active'));
      const freeBtn = document.querySelector('.crop-ratio-btn');
      if (freeBtn) freeBtn.classList.add('active');

      drawCropCanvas();
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
  if (e.target) e.target.value = '';
}

/** dataURL로 이미지 모달·크롭 UI 열기 (크게 보기 → 자르기 연동) */
function openImageModalWithDataURL(dataURL) {
  if (!dataURL) return;
  _targetSlideForImage = activeSlideIndex;
  const row = document.getElementById('img-upload-paste-row');
  const dropZone = document.getElementById('img-drop-zone');
  const cropArea = document.getElementById('crop-area');
  if (row) row.style.display = 'none';
  if (dropZone) dropZone.style.display = 'none';
  if (cropArea) cropArea.style.display = 'block';
  openModal('img-modal');
  const curRatio = (typeof getImageAspectRatio === 'function' ? getImageAspectRatio() : '1:1');
  document.querySelectorAll('.img-ai-ratio-btn').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-ratio') === curRatio); });
  const img = new Image();
  img.onload = () => {
    _currentCropImg = img;
    _origImageDataURL = dataURL;
    _finalCroppedDataURL = dataURL;
    _cropSelection = { x: 0, y: 0, w: img.width, h: img.height };
    const origPrev = document.getElementById('orig-preview-img');
    const curPrev = document.getElementById('crop-result-img');
    if (origPrev) origPrev.src = dataURL;
    if (curPrev) curPrev.src = dataURL;
    _cropRatio = 'free';
    document.querySelectorAll('.crop-ratio-btn').forEach(b => b.classList.remove('active'));
    const freeBtn = document.querySelector('.crop-ratio-btn');
    if (freeBtn) freeBtn.classList.add('active');
    if (typeof drawCropCanvas === 'function') setTimeout(drawCropCanvas, 80);
  };
  img.src = dataURL;
}

/* ──────────────────────────────────────────────────────────
   CROP ENGINE  — complete rewrite
   ────────────────────────────────────────────────────────── */

function drawCropCanvas() {
  if (!_currentCropImg) return;

  // Wait one frame so the DOM has rendered (crop-area just became visible)
  requestAnimationFrame(() => {
    const canvas = document.getElementById('crop-canvas');
    const overlay = document.getElementById('crop-overlay-canvas');
    const wrapper = document.getElementById('crop-canvas-wrapper');
    if (!canvas || !overlay || !wrapper) return;

    const iw = _currentCropImg.naturalWidth || _currentCropImg.width || 1;
    const ih = _currentCropImg.naturalHeight || _currentCropImg.height || 1;

    // Available display width (wrapper always visible now — no <details> wrapping canvas)
    const maxW = wrapper.clientWidth || 640;
    const maxH = 440;
    const scale = Math.min(maxW / iw, maxH / ih, 1);
    const dw = Math.max(1, Math.round(iw * scale));
    const dh = Math.max(1, Math.round(ih * scale));

    _cropDispScale = scale;
    _cropDisplayW = dw;
    _cropDisplayH = dh;

    // Set intrinsic canvas size (pixel buffer)
    canvas.width = dw; canvas.height = dh;
    overlay.width = dw; overlay.height = dh;

    // Match CSS dimensions to pixel buffer
    canvas.style.width = dw + 'px'; canvas.style.height = dh + 'px';
    overlay.style.width = dw + 'px'; overlay.style.height = dh + 'px';

    // Draw image
    canvas.getContext('2d').drawImage(_currentCropImg, 0, 0, dw, dh);

    // Initial selection = entire image
    if (!_cropSelection || !_cropSelection.w) {
      _cropSelection = { x: 0, y: 0, w: iw, h: ih };
    }

    drawCropOverlay();
    attachCropEvents();
  });
}

function drawCropOverlay() {
  const overlay = document.getElementById('crop-overlay-canvas');
  if (!overlay || !_cropDisplayW) return;
  const dw = _cropDisplayW, dh = _cropDisplayH, sc = _cropDispScale;
  const ctx = overlay.getContext('2d');
  ctx.clearRect(0, 0, dw, dh);

  // Dark mask
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, dw, dh);

  // Selection in display coords
  const sx = Math.round(_cropSelection.x * sc);
  const sy = Math.round(_cropSelection.y * sc);
  const sw = Math.max(1, Math.round(_cropSelection.w * sc));
  const sh = Math.max(1, Math.round(_cropSelection.h * sc));

  // Clear selection area (show image through)
  ctx.clearRect(sx, sy, sw, sh);

  // Border
  ctx.strokeStyle = '#4f8ef7';
  ctx.lineWidth = 2;
  ctx.strokeRect(sx + 1, sy + 1, sw - 2, sh - 2);

  // Corner handles
  const hs = 10;
  ctx.fillStyle = '#4f8ef7';
  [[sx, sy], [sx + sw - hs, sy], [sx, sy + sh - hs], [sx + sw - hs, sy + sh - hs]]
    .forEach(([x, y]) => ctx.fillRect(x, y, hs, hs));

  // Rule-of-thirds
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 0.5;
  for (let k = 1; k < 3; k++) {
    ctx.beginPath(); ctx.moveTo(sx + sw * k / 3, sy); ctx.lineTo(sx + sw * k / 3, sy + sh); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx, sy + sh * k / 3); ctx.lineTo(sx + sw, sy + sh * k / 3); ctx.stroke();
  }

  // Size label badge
  const iw = _currentCropImg ? (_currentCropImg.naturalWidth || _currentCropImg.width) : 0;
  const ih = _currentCropImg ? (_currentCropImg.naturalHeight || _currentCropImg.height) : 0;
  const labelW = Math.round(_cropSelection.w), labelH = Math.round(_cropSelection.h);
  const label = `${labelW}×${labelH}`;
  ctx.font = 'bold 11px monospace';
  const tw = ctx.measureText(label).width + 10;
  const labelX = Math.min(sx, dw - tw - 4);
  const labelY = Math.max(sy - 20, 0);
  ctx.fillStyle = 'rgba(79,142,247,0.9)';
  ctx.fillRect(labelX, labelY, tw, 18);
  ctx.fillStyle = '#fff';
  ctx.fillText(label, labelX + 5, labelY + 13);
}

let _cropEventsAttached = false;
function attachCropEvents() {
  if (_cropEventsAttached) return;
  _cropEventsAttached = true;

  const overlay = document.getElementById('crop-overlay-canvas');
  if (!overlay) return;

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  let dragging = false, startX = 0, startY = 0;
  let fixedW = 0, fixedH = 0; // for aspect-ratio locked dragging

  const getPos = (clientX, clientY) => {
    const rect = overlay.getBoundingClientRect();
    const scaleX = _cropDisplayW / rect.width;  // CSS vs buffer ratio
    const scaleY = _cropDisplayH / rect.height;
    return {
      x: (clientX - rect.left) * scaleX / _cropDispScale,
      y: (clientY - rect.top) * scaleY / _cropDispScale
    };
  };

  const applyRatioConstraint = (w, h) => {
    if (_cropRatio === '1:1') h = w;
    if (_cropRatio === '4:3') h = w * 3 / 4;
    if (_cropRatio === '3:4') w = h * 3 / 4;
    if (_cropRatio === '16:9') h = w * 9 / 16;
    if (_cropRatio === '9:16') w = h * 9 / 16;
    return { w, h };
  };

  const onStart = (clientX, clientY) => {
    const pos = getPos(clientX, clientY);
    startX = pos.x; startY = pos.y;
    dragging = true;
    _cropSelection = { x: startX, y: startY, w: 0, h: 0 };
  };

  const onMove = (clientX, clientY) => {
    if (!dragging || !_currentCropImg) return;
    const iw = _currentCropImg.naturalWidth || _currentCropImg.width;
    const ih = _currentCropImg.naturalHeight || _currentCropImg.height;
    const pos = getPos(clientX, clientY);

    let x = Math.min(startX, pos.x);
    let y = Math.min(startY, pos.y);
    let w = Math.abs(pos.x - startX);
    let h = Math.abs(pos.y - startY);

    const constrained = applyRatioConstraint(w, h);
    w = constrained.w; h = constrained.h;

    x = clamp(x, 0, iw - w);
    y = clamp(y, 0, ih - h);
    w = clamp(w, 0, iw - x);
    h = clamp(h, 0, ih - y);

    _cropSelection = { x, y, w, h };
    drawCropOverlay();
  };

  const onEnd = () => { dragging = false; };

  // Mouse
  overlay.addEventListener('mousedown', e => { onStart(e.clientX, e.clientY); e.preventDefault(); });
  overlay.addEventListener('mousemove', e => { if (dragging) onMove(e.clientX, e.clientY); });
  overlay.addEventListener('mouseup', onEnd);
  overlay.addEventListener('mouseleave', onEnd);

  // Touch
  overlay.addEventListener('touchstart', e => {
    onStart(e.touches[0].clientX, e.touches[0].clientY);
    e.preventDefault();
  }, { passive: false });
  overlay.addEventListener('touchmove', e => {
    onMove(e.touches[0].clientX, e.touches[0].clientY);
    e.preventDefault();
  }, { passive: false });
  overlay.addEventListener('touchend', onEnd);
}

function setupCropEvents() { /* legacy — attachCropEvents handles deduplication */ }

function updateCropPreview() {
  const scaleEl = document.getElementById('img-scale');
  const scaleVal = document.getElementById('img-scale-val');
  if (!scaleEl) return;
  const pct = parseInt(scaleEl.value);
  if (scaleVal) scaleVal.textContent = pct + '%';
  if (_cropDisplayW) {
    const sc = pct / 100;
    const cvs = document.getElementById('crop-canvas');
    const ovl = document.getElementById('crop-overlay-canvas');
    if (cvs) { cvs.style.width = Math.round(_cropDisplayW * sc) + 'px'; cvs.style.height = Math.round(_cropDisplayH * sc) + 'px'; }
    if (ovl) { ovl.style.width = Math.round(_cropDisplayW * sc) + 'px'; ovl.style.height = Math.round(_cropDisplayH * sc) + 'px'; }
  }
}

// ── Crop ratio presets ────────────────────────────────────
function setCropRatio(ratio, btn) {
  _cropRatio = ratio;
  document.querySelectorAll('.crop-ratio-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  if (!_currentCropImg) return;

  const iw = _currentCropImg.width, ih = _currentCropImg.height;
  if (ratio === 'full') {
    _cropSelection = { x: 0, y: 0, w: iw, h: ih };
  } else if (ratio === '1:1') {
    const s = Math.min(iw, ih);
    _cropSelection = { x: (iw - s) / 2, y: (ih - s) / 2, w: s, h: s };
  } else if (ratio === '4:3') {
    const w = Math.min(iw, ih * (4 / 3)), h = w * (3 / 4);
    _cropSelection = { x: (iw - w) / 2, y: (ih - h) / 2, w, h };
  } else if (ratio === '3:4') {
    const h = Math.min(ih, iw * (4 / 3)), w = h * (3 / 4);
    _cropSelection = { x: (iw - w) / 2, y: (ih - h) / 2, w, h };
  } else if (ratio === '16:9') {
    const w = Math.min(iw, ih * (16 / 9)), h = w * (9 / 16);
    _cropSelection = { x: (iw - w) / 2, y: (ih - h) / 2, w, h };
  } else if (ratio === '9:16') {
    const h = Math.min(ih, iw * (16 / 9)), w = h * (9 / 16);
    _cropSelection = { x: (iw - w) / 2, y: (ih - h) / 2, w, h };
  } else {
    // free — keep existing selection (or full if none)
    if (!_cropSelection.w) _cropSelection = { x: 0, y: 0, w: iw, h: ih };
  }
  drawCropOverlay();
}

// ── Reset to full (crop selection만 전체로, 현재 이미지 유지) ────────────────────────────────
function resetCropFull() {
  if (!_currentCropImg) return;
  const iw = _currentCropImg.naturalWidth || _currentCropImg.width;
  const ih = _currentCropImg.naturalHeight || _currentCropImg.height;
  _cropSelection = { x: 0, y: 0, w: iw, h: ih };
  // AI 생성 이미지 등 현재 이미지를 유지 (원본으로 되돌리지 않음)
  const out = document.createElement('canvas');
  out.width = iw; out.height = ih;
  out.getContext('2d').drawImage(_currentCropImg, 0, 0, iw, ih, 0, 0, iw, ih);
  _finalCroppedDataURL = out.toDataURL('image/png');
  document.querySelectorAll('.crop-ratio-btn').forEach(b => b.classList.remove('active'));
  const freeBtn = document.querySelector('.crop-ratio-btn');
  if (freeBtn) freeBtn.classList.add('active');
  _cropRatio = 'free';
  const wrap = document.getElementById('crop-result-wrap');
  const curPrev = document.getElementById('crop-result-img');
  if (wrap) wrap.style.display = 'block';
  if (curPrev) curPrev.src = _finalCroppedDataURL;
  drawCropCanvas();
  showToast('↺ 전체 선택으로 초기화됨');
}

function resetToOriginal() {
  if (!_initialUploadDataURL) { resetCropFull(); return; }
  const img = new Image();
  img.onload = function () {
    _currentCropImg = img;
    _origImageDataURL = _initialUploadDataURL;
    _finalCroppedDataURL = _initialUploadDataURL;
    _cropSelection = { x: 0, y: 0, w: img.naturalWidth || img.width, h: img.naturalHeight || img.height };
    document.querySelectorAll('.crop-ratio-btn').forEach(b => b.classList.remove('active'));
    const freeBtn = document.querySelector('.crop-ratio-btn');
    if (freeBtn) freeBtn.classList.add('active');
    _cropRatio = 'free';
    const wrap = document.getElementById('crop-result-wrap');
    const curPrev = document.getElementById('crop-result-img');
    const origPrev = document.getElementById('orig-preview-img');
    if (wrap) wrap.style.display = 'block';
    if (curPrev) curPrev.src = _initialUploadDataURL;
    if (origPrev) origPrev.src = _initialUploadDataURL;
    drawCropCanvas();
    showToast('↺ 원본 이미지로 복원됨');
  };
  img.src = _initialUploadDataURL;
}

// ── Apply crop → update preview & _finalCroppedDataURL ───
function applyCrop() {
  if (!_currentCropImg) return;
  let { x, y, w, h } = _cropSelection;
  if (!w || !h || w < 4 || h < 4) {
    // No selection drawn — use full image
    x = 0; y = 0;
    w = _currentCropImg.naturalWidth || _currentCropImg.width;
    h = _currentCropImg.naturalHeight || _currentCropImg.height;
  }
  const out = document.createElement('canvas');
  out.width = Math.round(w); out.height = Math.round(h);
  out.getContext('2d').drawImage(_currentCropImg, x, y, w, h, 0, 0, w, h);
  _finalCroppedDataURL = out.toDataURL('image/png');

  const curPrev = document.getElementById('crop-result-img');
  const wrap = document.getElementById('crop-result-wrap');
  if (curPrev) curPrev.src = _finalCroppedDataURL;
  if (wrap) wrap.style.display = 'block';
  showToast('✅ 크롭 적용됨 — 슬라이드에 삽입 버튼을 누르세요');
}

// ── Download cropped image ────────────────────────────────
function downloadCroppedImage() {
  const dataURL = _finalCroppedDataURL || _origImageDataURL;
  if (!dataURL) { showToast('⚠️ 이미지를 먼저 업로드하세요'); return; }
  const a = document.createElement('a');
  a.href = dataURL;
  a.download = `scholarslide_image_${Date.now()}.png`;
  a.click();
  showToast('✅ 이미지 저장됨');
}

// ── Apply image to slide (uses _finalCroppedDataURL if set, else original) ──
function applyImageToSlide() {
  const dataURL = _finalCroppedDataURL || _origImageDataURL;
  if (!dataURL) { showToast('⚠️ 이미지를 먼저 업로드하세요'); return; }
  if (_targetSlideForImage === null || !slides[_targetSlideForImage]) { showToast('⚠️ 슬라이드를 선택하세요'); return; }
  if (typeof pushSlideUndoState === 'function') pushSlideUndoState();
  const slide = slides[_targetSlideForImage];
  if (window._applyAsSecondImage) {
    slide.imageUrl2 = dataURL;
    slide.slideImage2 = null;
    window._applyAsSecondImage = false;
    showToast('✅ 두 번째 이미지 삽입 완료');
  } else {
    slide.imageUrl = dataURL;
    slide.slideImage1 = null;
    applyFullFillImageLayout(slide);
    // 이미지 레이어는 뒤에, 텍스트 레이어는 앞에 (텍스트가 이미지 위에 보이도록)
    slide.layerOrder = ['image', 'text'];
    showToast('✅ 이미지 삽입 완료');
  }
  renderSlides();
  renderThumbs();
  renderGallery();
  closeModal('img-modal');
  updateDesignPanel();
}


/* =========================================================
   V3.1 — PATCH 2: AI IMAGE HISTORY
   ========================================================= */
let _aiImgHistory = [];   // [{prompt, dataURL, slideIdx, time}]
const LS_AI_IMG_HIST = 'ss_ai_img_history_v3';

function loadAiImgHistory() {
  try {
    const d = localStorage.getItem(LS_AI_IMG_HIST);
    if (d) _aiImgHistory = JSON.parse(d);
  } catch { }
}
function saveAiImgHistory() {
  try {
    // keep max 30 entries, cap dataURL size
    const trimmed = _aiImgHistory.slice(0, 30);
    localStorage.setItem(LS_AI_IMG_HIST, JSON.stringify(trimmed));
  } catch (e) {
    // quota exceeded — drop oldest
    _aiImgHistory = _aiImgHistory.slice(0, 15);
    try { localStorage.setItem(LS_AI_IMG_HIST, JSON.stringify(_aiImgHistory)); } catch { }
  }
}
window._setAiImgHistory = function (v) { _aiImgHistory = v; saveAiImgHistory(); };

function clearAiImgHistory() {
  if (!confirm('AI 이미지 생성 이력을 전체 삭제하시겠습니까?')) return;
  _aiImgHistory = [];
  localStorage.removeItem(LS_AI_IMG_HIST);
  renderAiImgHistory();
  showToast('🗑 이력 삭제됨');
}

function addToAiImgHistory(prompt, dataURL, slideIdx) {
  _aiImgHistory.unshift({
    prompt, dataURL: dataURL ? dataURL.substring(0, 200000) : null,
    slideIdx, time: new Date().toISOString()
  });
  saveAiImgHistory();
  renderAiImgHistory();
}

function _buildHistoryHTML() {
  if (!_aiImgHistory.length) return '<p class="placeholder-msg">이미지 생성 이력이 없습니다.<br>이미지를 생성하면 여기에 쌓입니다.</p>';
  return `<div class="ai-hist-grid">${_aiImgHistory.map((item, i) => `
    <div class="ai-hist-card" title="${escapeHtml(item.prompt)}">
      <div class="ai-hist-thumb-wrap" onclick="openImageFullscreen('${item.dataURL || ''}')">
        ${item.dataURL
      ? `<img class="ai-hist-thumb" src="${item.dataURL}" alt=""/>`
      : `<div class="ai-hist-thumb ai-hist-thumb-empty">❌<br><span>생성 실패</span></div>`}
        <div class="ai-hist-overlay">🔍 크게 보기</div>
      </div>
      <div class="ai-hist-info">
        <div class="ai-hist-prompt">${escapeHtml(item.prompt)}</div>
        <div class="ai-hist-meta">슬라이드 ${(item.slideIdx || 0) + 1} · ${new Date(item.time).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
      </div>
      <div class="ai-hist-actions">
        ${item.dataURL ? `
          <button class="btn btn-primary btn-xs" style="flex:1;justify-content:center" onclick="insertHistoryImage(${i})">✓ 현재 슬라이드에 적용</button>
          <button class="btn btn-ghost btn-xs" onclick="downloadGenImage('${item.dataURL}')" title="저장">⬇</button>
          <button class="btn btn-ghost btn-xs" style="color:var(--danger)" onclick="deleteHistoryImage(${i})" title="삭제">🗑</button>
        ` : `<button class="btn btn-ghost btn-xs" style="color:var(--danger)" onclick="deleteHistoryImage(${i})">삭제</button>`}
      </div>
    </div>`).join('')}
  </div>`;
}
function renderAiImgHistory() {
  // Render into design panel inner list (when history subtab active)
  renderAiImgHistoryInner();
}
function renderAiImgHistoryInner() {
  const el = document.getElementById('ai-img-history-list-inner');
  if (el) el.innerHTML = _buildHistoryHTML();
}

function insertHistoryImage(idx) {
  const item = _aiImgHistory[idx];
  if (!item || !item.dataURL) { showToast('⚠️ 이미지 데이터 없음'); return; }
  if (!slides[activeSlideIndex]) { showToast('⚠️ 슬라이드를 선택하세요'); return; }
  if (typeof pushSlideUndoState === 'function') pushSlideUndoState();
  slides[activeSlideIndex].imageUrl = item.dataURL;
  applyFullFillImageLayout(slides[activeSlideIndex]);
  renderSlides(); renderThumbs(); updateDesignPanel();
  showToast(`✅ 슬라이드 ${activeSlideIndex + 1}에 삽입됨`);
}

function deleteHistoryImage(idx) {
  _aiImgHistory.splice(idx, 1);
  saveAiImgHistory();
  renderAiImgHistoryInner();
  showToast('🗑 이력 항목 삭제됨');
}

/** imgBank 슬라이드 삽입 모달 열기 */
function openImgBankInsertModal(dataURL) {
  if (!dataURL) return;
  if (!slides || !slides.length) {
    if (typeof showToast === 'function') showToast('⚠️ 슬라이드가 없습니다. 먼저 슬라이드를 생성하세요.');
    return;
  }
  window._imgBankPendingInsert = dataURL;
  const cur = (typeof activeSlideIndex !== 'undefined' ? activeSlideIndex : (window.activeSlideIndex || 0)) + 1;
  const max = (typeof slides !== 'undefined' && slides && slides.length) ? slides.length : 1;
  const elCur = document.getElementById('imgbank-insert-current');
  const elTarget = document.getElementById('imgbank-insert-target');
  if (elCur) elCur.textContent = cur + '번 슬라이드';
  if (elTarget) { elTarget.value = String(cur); elTarget.max = max; }
  if (typeof openModal === 'function') openModal('imgbank-insert-modal');
  else document.getElementById('imgbank-insert-modal').classList.add('open');
}

function closeImgBankInsertModal() {
  if (typeof closeModal === 'function') closeModal('imgbank-insert-modal');
  else document.getElementById('imgbank-insert-modal').classList.remove('open');
  window._imgBankPendingInsert = null;
}

function confirmImgBankInsertToSlide() {
  const dataURL = window._imgBankPendingInsert;
  if (!dataURL) { closeImgBankInsertModal(); return; }
  const elTarget = document.getElementById('imgbank-insert-target');
  let targetNum = elTarget ? parseInt(elTarget.value, 10) : 1;
  if (isNaN(targetNum) || targetNum < 1) targetNum = 1;
  const max = (typeof slides !== 'undefined' && slides && slides.length) ? slides.length : 1;
  targetNum = Math.min(targetNum, max);
  const targetIdx = targetNum - 1;
  closeImgBankInsertModal();
  insertImgBankImageToSlide(dataURL, targetIdx);
}

/** imgBank/슬라이드에서 선택한 이미지를 지정 슬라이드에 삽입 (targetIdx: 0-based, 없으면 현재 슬라이드) */
function insertImgBankImageToSlide(dataURL, targetIdx) {
  if (!dataURL || !slides.length) return;
  const idx = targetIdx !== undefined ? targetIdx : activeSlideIndex;
  if (idx < 0 || idx >= slides.length) return;
  if (!slides[idx]) return;
  if (typeof pushSlideUndoState === 'function') pushSlideUndoState();
  const slide = slides[idx];
  slide.imageUrl = dataURL;
  slide.slideImage1 = null;
  slide.layerOrder = ['image', 'text'];
  applyFullFillImageLayout(slide);
  renderSlides();
  renderThumbs();
  renderGallery();
  updateDesignPanel();
  if (targetIdx !== undefined && targetIdx !== activeSlideIndex && typeof selectSlide === 'function') selectSlide(targetIdx);
  if (typeof showToast === 'function') showToast('✅ 슬라이드 ' + (idx + 1) + '번에 삽입 완료');
}

/** 크게 보기 창: 우측 상단 툴바(줌/다운로드/문서삽입/자르기/지우기/닫기) */
function openImageFullscreen(dataURL, opts) {
  opts = opts || {};
  const fromImgBank = opts.fromImgBank != null ? opts.fromImgBank : null;
  window._imgViewerPending = { dataURL: dataURL, fromImgBank: fromImgBank };
  const w = window.open('', '_blank');
  if (!w) return;
  if (typeof registerChildWindow === 'function') registerChildWindow(w);
  const html = buildImageViewerHtml();
  w.document.write(html);
  w.document.close();
}

function buildImageViewerHtml() {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>이미지 크게 보기</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#383838;color:#e0e0e0;font-family:'Segoe UI',sans-serif;min-height:100vh;overflow:hidden}
.fs-toolbar{position:fixed;top:12px;right:12px;z-index:100;display:flex;flex-wrap:wrap;gap:6px;align-items:center;background:#323234;padding:8px 12px;border-radius:10px;border:1px solid #555}
.fs-toolbar button{padding:6px 10px;border-radius:6px;border:1px solid #555;background:#454545;color:#ddd;cursor:pointer;font-size:12px}
.fs-toolbar button:hover{background:#555;color:#fff;border-color:#4f8ef7}
.fs-toolbar .fs-zoom-val{min-width:40px;text-align:center;font-size:12px}
.fs-area{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;cursor:grab;background:#383838;padding:60px 16px 16px}
.fs-area:active{cursor:grabbing}
.fs-wrap{transform-origin:center center;transition:transform 0.08s ease-out;line-height:0;display:flex;align-items:center;justify-content:center}
.fs-wrap img{max-width:min(95vw,calc(100vw - 32px));max-height:min(95vh,calc(100vh - 80px));width:auto;height:auto;object-fit:contain;display:block;pointer-events:none;border-radius:8px;box-shadow:0 8px 40px rgba(0,0,0,0.4);background:#fff}
</style></head><body>
<div class="fs-toolbar">
  <button type="button" onclick="fsZoom(-0.25)" title="축소">−</button>
  <span class="fs-zoom-val" id="fs-zoom-val">100%</span>
  <button type="button" onclick="fsZoom(0.25)" title="확대">+</button>
  <button type="button" onclick="fsDownload()" title="다운로드">⬇ 다운로드</button>
  <button type="button" onclick="fsInsert()" title="문서에 삽입">문서에 삽입</button>
  <button type="button" onclick="fsCrop()" title="자르기">✂ 자르기</button>
  <button type="button" id="fs-btn-delete" style="display:none;color:#f87171" onclick="fsDelete()" title="imgBank에서 삭제">지우기</button>
  <button type="button" onclick="window.close()" title="닫기">닫기</button>
</div>
<div class="fs-area" id="fs-area">
  <div class="fs-wrap" id="fs-wrap"><img id="fs-img" alt=""/></div>
</div>
<script>
(function(){
  var scale=1,tx=0,ty=0,startX=0,startY=0,startTx=0,startTy=0,dragging=false;
  var wrap=document.getElementById('fs-wrap');
  var img=document.getElementById('fs-img');
  var fromImgBank=null;
  function apply(){if(wrap){wrap.style.transform='translate('+tx+'px,'+ty+'px) scale('+scale+')';} var v=document.getElementById('fs-zoom-val'); if(v) v.textContent=Math.round(scale*100)+'%';}
  window.fsZoom=function(d){scale=Math.max(0.25,Math.min(4,scale+d)); apply();};
  window.fsDownload=function(){if(!img.src) return; var a=document.createElement('a'); a.href=img.src; a.download='image_'+Date.now()+'.png'; a.click();};
  window.fsInsert=function(){if(!img.src||!window.opener) return; try{ window.opener.postMessage({type:'imgViewerInsert',dataURL:img.src},'*'); }catch(e){}};
  window.fsCrop=function(){if(!img.src||!window.opener) return; try{ window.opener.postMessage({type:'imgViewerCrop',dataURL:img.src},'*'); window.close(); }catch(e){}};
  window.fsDelete=function(){if(fromImgBank==null||!window.opener) return; try{ window.opener.postMessage({type:'imgViewerDelete',id:fromImgBank},'*'); window.close(); }catch(e){}};
  document.getElementById('fs-area').addEventListener('mousedown',function(e){if(e.button!==0) return; dragging=true; startX=e.clientX; startY=e.clientY; startTx=tx; startTy=ty;});
  document.addEventListener('mousemove',function(e){if(!dragging) return; tx=startTx+e.clientX-startX; ty=startTy+e.clientY-startY; apply();});
  document.addEventListener('mouseup',function(){dragging=false;});
  window.addEventListener('message',function(e){if(!e.data||e.data.type!=='setImage') return; img.src=e.data.dataURL||''; fromImgBank=e.data.fromImgBank!= null?e.data.fromImgBank:null; var btn=document.getElementById('fs-btn-delete'); if(btn) btn.style.display=fromImgBank!=null?'inline-block':'none'; scale=1; tx=0; ty=0; apply();});
  if(window.opener) window.opener.postMessage({type:'imgViewerReady'},'*');
})();
<\/script>
</body></html>`;
}

// ── AI로 시각 프롬프트 작성 (슬라이드 내용 기반) ──
async function generateVisPromptFromMdEditor() {
  const slide = slides[activeSlideIndex];
  if (!slide) { showToast('⚠️ 슬라이드를 선택하세요'); return; }
  const mdContent = (slide.title ? '# ' + slide.title + '\n\n' : '') +
    (slide.bullets && slide.bullets.length ? slide.bullets.map(b => '- ' + b).join('\n') + '\n' : '') +
    (slide.notes ? '> ' + slide.notes : '');
  if (!mdContent.trim()) { showToast('⚠️ 슬라이드에 제목·불릿·노트를 입력하세요'); return; }
  const inst = typeof getImggenVisPromptInstruction === 'function' ? getImggenVisPromptInstruction(mdContent) : null;
  if (!inst) { showToast('⚠️ prompt-store 로드 필요'); return; }
  const inputEl = document.getElementById('vis-prompt-input');
  if (inputEl) inputEl.placeholder = 'AI가 프롬프트 작성 중...';
  try {
    const { text } = await callGemini(inst.user, inst.system, false);
    const prompt = (text || '').replace(/```\w*\s*/g, '').replace(/```/g, '').trim();
    if (prompt && inputEl) { inputEl.value = prompt; inputEl.placeholder = 'Describe the diagram in English...'; slide.visPrompt = prompt; showToast('✅ 시각 프롬프트 생성됨'); }
    else { showToast('⚠️ 생성된 프롬프트가 비어 있습니다'); if (inputEl) inputEl.placeholder = 'Describe the diagram in English...'; }
  } catch (err) {
    if (inputEl) inputEl.placeholder = 'Describe the diagram in English...';
    showToast('❌ 프롬프트 생성 실패: ' + (err && err.message || ''));
  }
}

// ── Patched generateSingleImage — runs in background, shows result below, records history ──
async function generateSingleImage(idx) {
  const i = (idx !== undefined) ? idx : activeSlideIndex;
  const slide = slides[i]; if (!slide) return;
  const p = document.getElementById('vis-prompt-input')?.value || slide.visPrompt;
  slide.visPrompt = p;
  if (!p) { showToast('⚠️ 시각 프롬프트를 입력하세요'); return; }

  if (showJobProgress) showJobProgress('aiImg', '백그라운드에서 이미지 생성 중...', 0, '🎨');
  const resultArea = document.getElementById('ai-img-inline-result');
  if (resultArea) { resultArea.innerHTML = `<div style="text-align:center;padding:12px;color:var(--text2);font-size:11px">🎨 생성 중... 백그라운드에서 실행됩니다</div>`; resultArea.style.display = 'block'; }

  generateImage(p).then(function (img) {
    if (hideJobProgress) hideJobProgress('aiImg', 0);
  if (img) {
    addToAiImgHistory(p, img, i);
    if (typeof imgBankAdd === 'function') { try { imgBankAdd({ dataURL: img, name: 'slide_' + Date.now() + '_' + i, prompt: p }); } catch (e) {} }
    if (resultArea) {
      resultArea.innerHTML = `
        <div class="ai-img-result-card">
          <img src="${img}" onclick="openImageFullscreen('${img}')" title="클릭하면 크게 보기"/>
          <div class="ai-img-result-actions">
            <button class="btn btn-primary btn-xs" onclick="applyHistoryImageNow('${img}',${i})">✓ 이 슬라이드에 적용</button>
            <button class="btn btn-ghost btn-xs" onclick="openImageFullscreen('${img}')">🔍 크게 보기</button>
            <button class="btn btn-ghost btn-xs" onclick="downloadGenImage('${img}')">⬇</button>
          </div>
          <div style="font-size:9px;color:var(--accent);padding:4px 8px">✅ 적용 버튼을 눌러 슬라이드에 삽입하세요</div>
        </div>`;
      resultArea.style.display = 'block';
    }
    showToast('✅ 이미지 생성 완료');
    if (typeof window.showJobCompleteBadge === 'function') window.showJobCompleteBadge('이미지 생성 완료');
  } else {
    if (resultArea) { resultArea.innerHTML = `<div style="text-align:center;padding:12px;color:var(--danger);font-size:11px">❌ 생성 실패 — 프롬프트 수정 후 재시도하세요</div>`; }
    showToast('❌ 이미지 생성 실패');
  }
  }).catch(function (err) {
    if (hideJobProgress) hideJobProgress('aiImg', 0);
    const msg = (err && err.message === 'NO_API_KEY') ? 'API 키를 설정해주세요 (설정 또는 상단 🔑)' : (err && err.message || '이미지 생성 실패');
    if (resultArea) { resultArea.innerHTML = `<div style="text-align:center;padding:12px;color:var(--danger);font-size:11px">❌ ${escapeHtml(msg)}</div>`; }
    showToast('❌ ' + msg);
  });
}

function applyHistoryImageNow(dataURL, slideIdx) {
  if (!slides[slideIdx]) return;
  if (typeof pushSlideUndoState === 'function') pushSlideUndoState();
  slides[slideIdx].imageUrl = dataURL;
  applyFullFillImageLayout(slides[slideIdx]);
  renderSlides(); renderThumbs(); renderGallery();
  updateDesignPanel();
  showToast(`✅ 슬라이드 ${slideIdx + 1}에 이미지 적용됨`);
}

function insertInlineAiImage(dataURL, idx) {
  if (!slides[idx]) return;
  if (typeof pushSlideUndoState === 'function') pushSlideUndoState();
  slides[idx].imageUrl = dataURL;
  applyFullFillImageLayout(slides[idx]);
  renderSlides(); renderThumbs(); renderGallery();
  showToast(`✅ 슬라이드 ${idx + 1}에 삽입됨`);
}

function downloadGenImage(dataURL) {
  const a = document.createElement('a');
  a.href = dataURL; a.download = `ai_image_${Date.now()}.png`; a.click();
  showToast('✅ 이미지 저장됨');
}


/* =========================================================
   V3.1 — PATCH 3: REFERENCE LOCAL SAVE (Export JSON)
   ========================================================= */
function exportRefsToLocalFile() {
  const refs = ReferenceStore.getAll();
  if (!refs.length) { showToast('⚠️ 저장할 참고문헌이 없습니다'); return; }
  const style = document.getElementById('citation-style')?.value || 'APA';
  const data = {
    exported: new Date().toISOString(),
    style,
    count: refs.length,
    references: refs
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `scholarslide_refs_${Date.now()}.json`;
  a.click();
  showToast(`✅ ${refs.length}개 참고문헌 저장됨`);
}

function exportSavedListToFile() {
  const list = getSavedRefList();
  if (!list.length) { showToast('⚠️ 저장된 목록이 없습니다'); return; }
  const blob = new Blob([JSON.stringify({ exported: new Date().toISOString(), count: list.length, references: list }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `scholarslide_saved_refs_${Date.now()}.json`; a.click();
  showToast(`✅ 저장 목록 ${list.length}개 내보내기 완료`);
}

function importRefsFromFile(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      const refs = data.references || data;
      if (!Array.isArray(refs)) throw new Error('유효하지 않은 형식');
      let added = 0;
      refs.forEach(r => { if (r.title && r.authors) { ReferenceStore.add(r); added++; } });
      renderRefsPanel(); renderSavedRefList();
      showToast(`✅ ${added}개 참고문헌 불러오기 완료`);
    } catch (err) { showToast('❌ 파일 파싱 실패: ' + err.message); }
  };
  reader.readAsText(file);
  if (e.target) e.target.value = '';
}


/* =========================================================
   V3.1 — PATCH 4: BOLD MARKDOWN IN BULLETS
   ========================================================= */

/** YouTube URL에서 비디오 ID 추출 (watch / v= / youtu.be / embed 형식, 11자리 ID) */
function extractYoutubeId(url) {
  if (!url) return null;
  const trimmed = String(url).replace(/\s+/g, '').trim();
  if (!trimmed) return null;
  const reg = /(?:youtube\.com\/watch\?v=|youtube\.com\/v=|\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = trimmed.match(reg);
  return match ? match[1] : null;
}

/** 동일한 embed HTML을 미리보기·슬라이드 렌더에 공통 사용. 슬라이드에서는 왼쪽 상단 이동 핸들 + 8방향 리사이즈 핸들 제공 */
function buildYoutubeEmbedHtml(videoId) {
  var src = 'https://www.youtube-nocookie.com/embed/' + videoId + '?rel=0';
  var handles = [
    { edge: 'nw', cursor: 'nw-resize', title: '좌상단 크기 조절' },
    { edge: 'n', cursor: 'n-resize', title: '상하 조절' },
    { edge: 'ne', cursor: 'ne-resize', title: '우상단 크기 조절' },
    { edge: 'e', cursor: 'e-resize', title: '좌우 조절' },
    { edge: 'se', cursor: 'se-resize', title: '우하단 크기 조절' },
    { edge: 's', cursor: 's-resize', title: '상하 조절' },
    { edge: 'sw', cursor: 'sw-resize', title: '좌하단 크기 조절' },
    { edge: 'w', cursor: 'w-resize', title: '좌우 조절' }
  ];
  var handleHtml = handles.map(function (h) {
    return '<div class="youtube-resize-handle youtube-resize-' + h.edge + '" data-edge="' + h.edge + '" title="' + h.title + '" style="cursor:' + h.cursor + '"></div>';
  }).join('');
  var moveHandle = '<div class="youtube-move-handle" title="드래그하여 영상 위치 이동" style="cursor:move">⋮⋮</div>';
  return '<div class="slide-youtube-wrap youtube-resizable"><iframe src="' + src + '" title="YouTube video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>' + moveHandle + handleHtml + '</div>';
}

/** 8방향 리사이즈 + 이동 핸들 HTML (슬라이드 내부 이미지 등 공통) */
function buildResizeMoveHandlesHtml() {
  var handles = [
    { edge: 'nw', cursor: 'nw-resize', title: '좌상단 크기 조절' },
    { edge: 'n', cursor: 'n-resize', title: '상하 조절' },
    { edge: 'ne', cursor: 'ne-resize', title: '우상단 크기 조절' },
    { edge: 'e', cursor: 'e-resize', title: '좌우 조절' },
    { edge: 'se', cursor: 'se-resize', title: '우하단 크기 조절' },
    { edge: 's', cursor: 's-resize', title: '상하 조절' },
    { edge: 'sw', cursor: 'sw-resize', title: '좌하단 크기 조절' },
    { edge: 'w', cursor: 'w-resize', title: '좌우 조절' }
  ];
  var resizeHtml = handles.map(function (h) {
    return '<div class="youtube-resize-handle youtube-resize-' + h.edge + '" data-edge="' + h.edge + '" title="' + h.title + '" style="cursor:' + h.cursor + '"></div>';
  }).join('');
  var moveHandle = '<div class="youtube-move-handle" title="드래그하여 위치 이동" style="cursor:move">⋮⋮</div>';
  return moveHandle + resizeHtml;
}

/** 슬라이드 이미지 래퍼용 인라인 스타일 (저장된 크기/위치가 있을 때) */
function buildSlideImageWrapStyle(slideImage) {
  if (!slideImage || (!slideImage.w && !slideImage.h && slideImage.left == null && slideImage.top == null)) return '';
  var parts = [];
  if (slideImage.w > 0) parts.push('width:' + slideImage.w + 'px');
  if (slideImage.h > 0) parts.push('height:' + slideImage.h + 'px');
  if (slideImage.left != null || slideImage.top != null) {
    parts.push('position:absolute');
    parts.push('left:' + (slideImage.left != null ? slideImage.left : 0) + 'px');
    parts.push('top:' + (slideImage.top != null ? slideImage.top : 0) + 'px');
  }
  return parts.length ? (' style="' + parts.join(';') + '"') : '';
}

function markdownToHtml(text) {
  if (!text) return '';
  const t = text.trim();
  // 단일 줄 youtube:URL → embed URL로 변환 후 iframe 렌더 (오류 153 방지)
  if (/^youtube:\s*.+/i.test(t)) {
    const url = t.replace(/^youtube:/i, '').trim();
    const vid = extractYoutubeId(url);
    if (vid) return buildYoutubeEmbedHtml(vid);
  }
  if (/\n\n|\n```|```/.test(text)) return parseMdFull(text);
  if (/\n/.test(text) && /youtube:/i.test(text)) return parseMdFull(text);
  return inlineMd(text);
}


/* =========================================================
   V3.1 — PATCH 5: PER-SLIDE EXTRA TEXT with formatting
   ========================================================= */
let _extraTextColors = ['#e8f4fd', '#f87171', '#60a5fa', '#34d399', '#fbbf24', '#c084fc'];

function initExtraText(slideIdx) {
  if (!slides[slideIdx].extraText) slides[slideIdx].extraText = '';
}

/** 현재 슬라이드에 텍스트창(extra 영역) 추가 */
function addSlideExtraText(slideIndex) {
  if (!slides[slideIndex]) return;
  if (typeof pushSlideUndoState === 'function') pushSlideUndoState();
  slides[slideIndex].extraText = slides[slideIndex].extraText || '';
  if (!slides[slideIndex].extraText.trim()) slides[slideIndex].extraText = '<p>새 텍스트를 입력하세요</p>';
  renderSlides();
  selectSlide(slideIndex);
  if (typeof _markDirty === 'function') _markDirty();
}

/** 현재 슬라이드의 텍스트창(extra 영역) 제거 */
function removeSlideExtraText(slideIndex) {
  if (!slides[slideIndex]) return;
  if (!slides[slideIndex].extraText) return;
  if (typeof pushSlideUndoState === 'function') pushSlideUndoState();
  slides[slideIndex].extraText = '';
  renderSlides();
  selectSlide(slideIndex);
  if (typeof _markDirty === 'function') _markDirty();
}

function toggleExtraTextEditor(slideIdx) {
  const editorEl = document.getElementById(`extra-text-editor-${slideIdx}`);
  const renderedEl = document.getElementById(`extra-text-rendered-${slideIdx}`);
  if (!editorEl || !renderedEl) return;
  const isEditing = editorEl.style.display !== 'none';
  if (isEditing) {
    // save & render
    if (typeof pushSlideUndoState === 'function') pushSlideUndoState();
    slides[slideIdx].extraText = editorEl.value;
    renderedEl.innerHTML = renderExtraText(editorEl.value);
    editorEl.style.display = 'none';
    renderedEl.style.display = 'block';
  } else {
    editorEl.value = slides[slideIdx].extraText || '';
    editorEl.style.display = 'block';
    renderedEl.style.display = 'none';
    editorEl.focus();
  }
}

function renderExtraText(text) {
  if (!text) return '<span style="color:var(--text3);font-style:italic">텍스트를 입력하세요...</span>';
  return parseMdFull(text);
}

/**
 * Full markdown parser supporting:
 * - Fenced code blocks  ```lang ... ```
 * - H1–H6 (#–######)
 * - **bold**, *italic*, ~~strike~~
 * - Inline `code`
 * - Unordered lists (- / *)
 * - Ordered lists (1. 2. ...)
 * - Links [text](url) and [text](url){target=_blank}
 * - YouTube embeds  youtube:URL
 * - HTML spans (color/size) — sanitized
 */
function parseMdFull(text) {
  if (!text) return '';
  // Sanitize dangerous HTML first
  const sanitized = text
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/javascript:/gi, '');

  const lines = sanitized.split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // ── Fenced code block  ```lang
    if (/^```/.test(line)) {
      const lang = line.slice(3).trim() || '';
      const codeLines = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      const code = codeLines.join('\n')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      out.push(`<code class="slide-code-block"${lang ? ` data-lang="${lang}"` : ''}>${code}</code>`);
      continue;
    }

    // ── Unordered list
    if (/^[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push('<li>' + inlineMd(lines[i].replace(/^[-*]\s+/, '')) + '</li>');
        i++;
      }
      out.push('<ul style="margin:3px 0 3px 16px;padding:0">' + items.join('') + '</ul>');
      continue;
    }

    // ── Ordered list
    if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push('<li>' + inlineMd(lines[i].replace(/^\d+\.\s+/, '')) + '</li>');
        i++;
      }
      out.push('<ol style="margin:3px 0 3px 16px;padding:0">' + items.join('') + '</ol>');
      continue;
    }

    // ── Headings H1–H6
    const hm = line.match(/^(#{1,6})\s+(.+)$/);
    if (hm) {
      const lvl = hm[1].length;
      const sizes = ['22px', '18px', '15px', '13px', '12px', '11px'];
      const margins = ['6px', '5px', '4px', '3px', '2px', '2px'];
      out.push(`<h${lvl} style="font-size:${sizes[lvl - 1]};color:inherit;margin:${margins[lvl - 1]} 0;line-height:1.3">${inlineMd(hm[2])}</h${lvl}>`);
      i++;
      continue;
    }

    // ── YouTube embed line (여러 줄 지원: 한 줄에 하나씩 모두 임베드)
    if (/^youtube:/i.test(line)) {
      const url = line.replace(/^youtube:/i, '').trim();
      const vid = extractYoutubeId(url);
      if (vid) out.push(buildYoutubeEmbedHtml(vid));
      i++;
      continue;
    }
    // [youtube:URL] 또는 (youtube:URL){_blank} 형식도 임베드
    const ytBracket = line.match(/^\[youtube:\s*([^\]]+)\]\s*$/i);
    if (ytBracket) {
      const vid = extractYoutubeId(ytBracket[1].trim());
      if (vid) out.push(buildYoutubeEmbedHtml(vid));
      i++;
      continue;
    }
    const ytParen = line.match(/^\(youtube:\s*([^)]+)\)\s*(\{_blank\})?\s*$/i);
    if (ytParen) {
      const vid = extractYoutubeId(ytParen[1].trim());
      if (vid) out.push(buildYoutubeEmbedHtml(vid));
      i++;
      continue;
    }

    // ── 이미지 한 줄 ![alt](url) → 리사이즈 가능 래퍼
    const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)\s*$/);
    if (imgMatch) {
      const alt = imgMatch[1] || '';
      const src = imgMatch[2].trim().replace(/^javascript:/i, '').replace(/["'<>]/g, '');
      if (src) out.push('<div class="slide-extra-img-wrap slide-resizable-media"><img src="' + src + '" alt="' + (alt.replace(/"/g, '&quot;')) + '" style="max-width:100%;height:auto;display:block;border-radius:6px"/><div class="youtube-resize-handle" title="드래그하여 크기 조절"></div></div>');
      i++;
      continue;
    }

    // ── Empty line
    if (line.trim() === '') { out.push('<br>'); i++; continue; }

    // ── Normal paragraph
    out.push('<p style="margin:1px 0">' + inlineMd(line) + '</p>');
    i++;
  }
  return out.join('');
}

function inlineMd(text) {
  return text
    // **bold** → <b></b> (특수문자 <(,./? 등 및 줄바꿈 포함 허용)
    .replace(/\*\*([\s\S]*?)\*\*/g, '<b>$1</b>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    .replace(/`(.+?)`/g, '<code style="background:rgba(79,142,247,0.15);padding:1px 5px;border-radius:3px;font-family:monospace;font-size:0.88em">$1</code>')
    // Link with optional target: [text](url) or [text](url){_blank}
    .replace(/\[([^\]]+)\]\(([^)]+)\)(\{_blank\})?/g, (_, t, u, nb) =>
      `<a href="${u}" ${nb ? 'target="_blank" rel="noopener"' : ''} style="color:#60a5fa;text-decoration:underline">${t}</a>`)
    // Allowed HTML pass-through (span with style only)
    ;
}

function insertExtraTextFmt(slideIdx, tag, val) {
  const ta = document.getElementById(`extra-text-editor-${slideIdx}`);
  if (!ta) return;
  const start = ta.selectionStart, end = ta.selectionEnd;
  const sel = ta.value.substring(start, end);
  let ins = '';
  if (tag === 'bold') ins = `**${sel || '굵은 텍스트'}**`;
  else if (tag === 'italic') ins = `*${sel || '기울임'}*`;
  else if (tag === 'h1') ins = `# ${sel || '제목1'}`;
  else if (tag === 'h2') ins = `## ${sel || '제목2'}`;
  else if (tag === 'h3') ins = `### ${sel || '제목3'}`;
  else if (tag === 'code') ins = `\`${sel || '코드'}\``;
  else if (tag === 'color') ins = `<span style="color:${val}">${sel || '색상 텍스트'}</span>`;
  else if (tag === 'size') ins = `<span style="font-size:${val}">${sel || '텍스트'}</span>`;
  else if (tag === 'br') ins = '\n';
  ta.value = ta.value.substring(0, start) + ins + ta.value.substring(end);
  ta.selectionStart = ta.selectionEnd = start + ins.length;
  ta.focus();
}

function updateDesignPanel(subtab) {
  const panel = document.getElementById('design-panel');
  if (!panel) return;
  const slide = slides[activeSlideIndex];
  if (!slide) { panel.innerHTML = `<p class="placeholder-msg">슬라이드를 선택하세요.</p>`; return; }

  const st = 'imggen'; // 이미지 이력 탭 비활성화 (오류 다수)
  panel.dataset.subtab = st;

  const extraText = slide.extraText || '';
  const colorDots = _extraTextColors.map(col =>
    `<div class="ext-color-dot" style="background:${col}" onclick="insertExtraTextFmt(${activeSlideIndex},'color','${col}')" title="${col}"></div>`
  ).join('');

  panel.innerHTML = `
    <div class="design-subtabs" style="display:none">
      <button class="design-subtab active" onclick="updateDesignPanel('imggen')">🎨 이미지생성</button>
    </div>
    <div class="design-panel-body" style="overflow-y:auto;flex:1 1 0;min-height:0;display:flex;flex-direction:column;gap:0">

    <section id="design-section-imggen" class="design-section">
    <div style="margin-bottom:14px">
      <span class="design-label">슬라이드 ${activeSlideIndex + 1} 시각 프롬프트</span>
      <p style="font-size:10px;color:var(--text3);margin:0 0 4px">MDeditor 창의 슬라이드 내용을 참고하면 더 세밀한 프롬프트가 만들어집니다. 설정 → 프롬프트 설정에서 지시문을 수정할 수 있습니다.</p>
      <textarea class="control" id="vis-prompt-input" style="resize:vertical;min-height:70px;max-height:500px" placeholder="Describe the diagram in English...">${escapeHtml(slide.visPrompt || '')}</textarea>
      <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">
        <button class="btn btn-ghost btn-sm" style="flex:1;min-width:120px;justify-content:center" onclick="generateVisPromptFromMdEditor()" title="MDeditor 내용을 참고해 세밀한 시각 프롬프트 자동 작성">✏️ AI로 프롬프트 작성</button>
      </div>
      <div style="margin-top:8px">
        <span class="design-label" style="font-size:10px;display:block;margin-bottom:4px">이미지 비율</span>
        <div style="display:flex;gap:4px;flex-wrap:wrap">
          ${['1:1','3:4','4:3','9:16','16:9'].map(r=>{const cur=getImageAspectRatio();return`<button type="button" class="btn btn-ghost btn-xs img-ratio-btn ${r===cur?'active':''}" onclick="localStorage.setItem(LS_IMAGE_ASPECT_RATIO,'${r}');updateDesignPanel('imggen')" title="${r}">${r}</button>`}).join('')}
        </div>
      </div>
      <div style="display:flex;gap:6px;margin-top:8px">
        <button class="btn btn-primary btn-sm" style="flex:1;justify-content:center" onclick="openImageModal(${activeSlideIndex},{prefillPrompt:true})" title="공통 도구를 열고 현재 프롬프트를 채웁니다">🎨 AI 이미지 생성</button>
        <button class="btn btn-ghost btn-sm" onclick="openImageModal(${activeSlideIndex},{prefillPrompt:true})" title="같은 도구로 열기">↗</button>
        <button class="btn btn-ghost btn-sm" style="flex:1;justify-content:center" onclick="openImageModal(${activeSlideIndex})">📁 이미지 업로드</button>
      </div>
      <div id="ai-img-inline-result" style="display:none;margin-top:10px"></div>
    </div>
    <div style="margin-bottom:10px">
      <label class="design-label" style="font-size:11px;margin-bottom:4px;display:block">🖼 이미지 생성 모델</label>
      <select id="design-img-model-select" class="control" style="font-size:11px;padding:6px 10px" onchange="setDesignImageModel(this.value)">
        <option value="gemini-2.0-flash-exp-image-generation">Gemini 2.0 Flash (Image)</option>
        <option value="gemini-2.5-flash-image">Nano Banana (Gemini 2.5 Flash)</option>
        <option value="gemini-3.1-flash-image-preview">Nano Banana 2 (Gemini 3.1 Flash)</option>
        <option value="gemini-3-pro-image-preview">Nano Banana Pro (Gemini 3 Pro)</option>
        <option value="imagen-4.0-generate-001">Imagen 4</option>
        <option value="imagen-4.0-ultra-generate-001">Imagen 4 Ultra</option>
        <option value="imagen-4.0-fast-generate-001">Imagen 4 Fast</option>
      </select>
    </div>
    <hr class="sep"/>
    <div style="margin-bottom:8px">
      <span class="design-label">✂️ 이미지 Crop / 수정</span>
      <p style="font-size:10px;color:var(--text3);margin:0 0 4px">이미지가 없어도 이 버튼으로 도구를 열어 프롬프트만으로 생성할 수 있습니다.</p>
      <button class="btn btn-primary w-full mt-1" style="justify-content:center" onclick="openImageModal(${activeSlideIndex})">🖼️ seed이미지이용 AI생성</button>
    </div>
    ${slide.imageUrl ? `
      <div style="margin-bottom:8px;border-radius:var(--radius);overflow:hidden;cursor:zoom-in" onclick="openImageFullscreen('${slide.imageUrl}')">
        <img src="${slide.imageUrl}" style="width:100%;max-height:130px;object-fit:cover;display:block"/>
        <div style="font-size:9px;color:var(--text3);padding:2px 6px;background:var(--surface2)">클릭하여 크게 보기 ↗</div>
      </div>
      <div style="margin-bottom:14px">
        <span class="design-label">🤖 AI 피드백으로 수정</span>
        <input class="control" id="refine-input" placeholder="예: 파란색으로 변경, 더 심플하게..."/>
        <button class="btn btn-ghost w-full mt-2" style="justify-content:center;display:none" onclick="refineImage()">🔄 AI이미지 수정 메뉴</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:10px">
        <button class="btn btn-ghost btn-xs w-full" style="justify-content:center" onclick="openImageFullscreen('${slide.imageUrl}')">🔍 새창에서 크게 보기</button>
        <button class="btn btn-ghost btn-xs w-full" style="justify-content:center" onclick="downloadGalleryImage(${activeSlideIndex})">⬇ 이미지 다운로드</button>
        ${!slide.imageUrl2 ? `<button class="btn btn-ghost btn-xs w-full" style="justify-content:center;color:var(--accent2)" onclick="openImageModal2(${activeSlideIndex})">➕ 두 번째 이미지 추가</button>` : `<button class="btn btn-ghost btn-xs w-full" style="justify-content:center;color:var(--warning)" onclick="removeSlideImage2(${activeSlideIndex})">🗑 두 번째 이미지 제거</button>`}
        <button class="btn btn-ghost btn-xs w-full" style="justify-content:center;color:var(--danger)" onclick="removeSlideImage(${activeSlideIndex})">🗑 이미지 제거</button>
      </div>` : ''}
    </section>

    </div>
  `;
  const imgModelSel = document.getElementById('design-img-model-select');
  if (imgModelSel) imgModelSel.value = getImageModelId() || 'gemini-2.5-flash-image';
}

function renderExtraTextInSlide(slideIdx) {
  const el = document.getElementById(`slide-extra-rendered-${slideIdx}`);
  if (el) el.innerHTML = renderExtraText(slides[slideIdx].extraText || '');
}


/* =========================================================
   V3.1 — PATCH: renderSlides with extra text + bold bullets
   ========================================================= */
function renderSlides() {
  const canvas = document.getElementById('slides-canvas');
  if (!slides.length) {
    canvas.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🎞</div><p>슬라이드가 없습니다</p></div>`;
    updateSlidesCountLabel();
    applySlideZoom();
    applySlideFontScale();
    applySlideTextImgRatio();
    return;
  }
  canvas.innerHTML = slides.map((slide, index) => {
    const coverStyle = slide.isCover ? 'style-cover' : ('style-' + slideStyle);
    const extraHtml = slide.extraText ? renderExtraText(slide.extraText) : '';
    const layerOrder = slide.layerOrder || (slide.imageUrl ? ['image', 'text'] : ['text', 'image']);
    const textZ = layerOrder.indexOf('text');
    const imageZ = layerOrder.indexOf('image');
    const layerStyleText = 'position:relative;z-index:' + (textZ >= 0 ? textZ : 0);
    const layerStyleImage = 'position:relative;z-index:' + (imageZ >= 0 ? imageZ : 1);
    const TEXT_IMAGE_MIN = 10, TEXT_IMAGE_MAX = 90;
    const defImgPct = typeof DEFAULT_IMAGE_SLIDE_TEXT_PCT !== 'undefined' ? DEFAULT_IMAGE_SLIDE_TEXT_PCT : 45;
    var rawPct = slide.imageUrl && slide.innerSize && slide.innerSize.widthPct != null ? slide.innerSize.widthPct : defImgPct;
    const textPct = slide.imageUrl ? Math.max(TEXT_IMAGE_MIN, Math.min(TEXT_IMAGE_MAX, rawPct)) : 0;
    const innerSizeStyle = slide.imageUrl
      ? ('flex: 0 1 ' + textPct + '%; min-width: 0;' + (slide.innerSize && slide.innerSize.heightPct != null ? ' height:' + Math.min(100, Math.max(20, slide.innerSize.heightPct)) + '%; min-height:0;' : ''))
      : '';
    const imagePaneFlexStyle = slide.imageUrl ? ('flex: 0 1 ' + (100 - textPct) + '%; min-width: 0;') : '';
    const layerStyleTextWithInner = layerStyleText + (innerSizeStyle ? ' ' + innerSizeStyle : '');
    const layerStyleImageWithFlex = layerStyleImage + (imagePaneFlexStyle ? ' ' + imagePaneFlexStyle : '');
    const extraAreaStyle = [];
    if (slide.extraAreaHeight) extraAreaStyle.push('height:' + slide.extraAreaHeight + 'px');
    if (slide.extraAreaPosition) {
      extraAreaStyle.push('position:relative', 'left:' + (slide.extraAreaPosition.left || 0) + 'px', 'top:' + (slide.extraAreaPosition.top || 0) + 'px');
    }
    const extraAreaStyleStr = extraAreaStyle.length ? (' style="' + extraAreaStyle.join(';') + '"') : '';
    const bulletPositionStyle = [];
    if (slide.bulletPosition && (slide.bulletPosition.left != null || slide.bulletPosition.top != null)) {
      bulletPositionStyle.push('position:relative', 'left:' + (slide.bulletPosition.left || 0) + 'px', 'top:' + (slide.bulletPosition.top || 0) + 'px');
    }
    if (slide.bulletSize && (slide.bulletSize.w > 0 || slide.bulletSize.h > 0)) {
      if (slide.bulletSize.w > 0) bulletPositionStyle.push('width:' + slide.bulletSize.w + 'px');
      if (slide.bulletSize.h > 0) bulletPositionStyle.push('height:' + slide.bulletSize.h + 'px');
    }
    const bulletPositionStyleStr = bulletPositionStyle.length ? (' style="' + bulletPositionStyle.join(';') + '"') : '';
    const bulletResizeHandles = '<div class="bullet-resize-handle bullet-resize-n" data-edge="n" title="상하 조절" style="cursor:n-resize"></div><div class="bullet-resize-handle bullet-resize-s" data-edge="s" title="상하 조절" style="cursor:s-resize"></div><div class="bullet-resize-handle bullet-resize-e" data-edge="e" title="좌우 조절" style="cursor:e-resize"></div><div class="bullet-resize-handle bullet-resize-w" data-edge="w" title="좌우 조절" style="cursor:w-resize"></div>';
    const titleWrapStyle = [];
    if (slide.titlePosition && (slide.titlePosition.left != null || slide.titlePosition.top != null)) {
      titleWrapStyle.push('position:relative', 'left:' + (slide.titlePosition.left || 0) + 'px', 'top:' + (slide.titlePosition.top || 0) + 'px');
    }
    const titleWrapStyleStr = titleWrapStyle.length ? (' style="' + titleWrapStyle.join(';') + '"') : '';
    const titleFontSize = (slide.titleFontSize != null && slide.titleFontSize > 0) ? slide.titleFontSize : 24;
    return `
    <div class="slide-wrapper ${index === activeSlideIndex ? 'active' : ''}" id="sw-${index}" onclick="selectSlide(${index})">
      <div class="slide-number">${index + 1}</div>
      <div class="slide-actions-bar">
        <button class="slide-action-btn" onclick="event.stopPropagation();askThenRewrite(${index})">🤖 AI재작성</button>
        <button class="slide-action-btn" onclick="event.stopPropagation();openImageModal(${index})">📁 이미지업로드</button>
        <button class="slide-action-btn" onclick="event.stopPropagation();addSlideExtraText(${index})" title="슬라이드에 텍스트/미디어 영역 추가">📝 텍스트창 추가</button>
        ${slide.extraText ? `<button class="slide-action-btn" onclick="event.stopPropagation();removeSlideExtraText(${index})" title="텍스트창(extra 영역) 제거">🗑 텍스트창 삭제</button>` : ''}
        <button class="slide-action-btn" onclick="event.stopPropagation();openAiImageWindow(${index})">🎨 AI이미지생성</button>
        <button class="slide-action-btn danger" onclick="event.stopPropagation();deleteSlide(${index})">🗑 지우기</button>
        <div style="position:relative;display:inline-block">
          <button class="slide-action-btn add-slide" onclick="toggleAddDropdown(${index},this.parentElement,event)">＋슬라이드 추가 ▾</button>
          <div class="add-slide-dropdown" onclick="event.stopPropagation()">
            <div class="add-slide-option" onclick="addSlideAfter(${index},'blank')">📄 빈 페이지 추가</div>
            <div class="add-slide-option" onclick="addSlideAfter(${index},'ai')">🤖 인공지능 작성 추가</div>
          </div>
        </div>
        <button class="slide-action-btn" onclick="event.stopPropagation();saveCurrentSlidesOnly()" title="편집한 슬라이드만 저장 (히스토리 미생성)">💾 편집 슬라이드 저장</button>
      </div>
      <div class="slide-card ${coverStyle}">
        <div class="slide-inner${slide.imageUrl ? ' has-image' : ''}" data-slide-index="${index}" data-layer="text" style="${layerStyleTextWithInner || layerStyleText}">
          <div class="slide-title-wrap" id="slide-title-wrap-${index}" data-slide-index="${index}"${titleWrapStyleStr}>
            <div class="title-position-handle" title="드래그하여 제목 위치 조절">T</div>
            <span class="title-size-handle title-size-down" title="제목 크기 줄이기" onclick="event.stopPropagation();changeTitleFontSize(${index},-2)">A−</span>
            <span class="title-size-handle title-size-up" title="제목 크기 키우기" onclick="event.stopPropagation();changeTitleFontSize(${index},2)">A+</span>
            <div class="title-rendered" onclick="event.stopPropagation();showTitleEditor(${index})" style="font-size:calc(${titleFontSize}px * var(--slide-font-scale, 1));line-height:1.2;word-break:break-word;cursor:text">${markdownToHtml(slide.title)}</div>
            <textarea class="slide-title-input" rows="2" style="display:none;font-size:calc(${titleFontSize}px * var(--slide-font-scale, 1))"
              onclick="event.stopPropagation()" onmousedown="event.stopPropagation()"
              onfocus="_trackFocus(this,'title',${index})"
              onblur="hideTitleEditor(${index},this.value)"
              oninput="updateSlideTitle(${index},this.value);autoResize(this)"
            >${escapeHtml(slide.title)}</textarea>
          </div>
          ${extraHtml ? `<div class="slide-extra-text-area slide-extra-above" id="slide-extra-area-${index}" data-slide-index="${index}"${extraAreaStyleStr}><div class="slide-extra-area-toolbar"><span class="slide-extra-position-handle" title="드래그하여 영역 위치 조절">⋮⋮</span><button type="button" class="slide-extra-move-btn" title="클릭 후 드래그하여 영상/이미지 영역 이동">위치 이동</button></div><div class="slide-extra-text-rendered" id="slide-extra-rendered-${index}" onclick="event.stopPropagation();switchRightTab('design');selectSlide(${index})">${extraHtml}</div><div class="slide-extra-resize-handle" title="드래그하여 영역 높이 조절"></div></div>` : ''}
          <div class="slide-bullets-wrap ${(slide.bulletSize && (slide.bulletSize.w > 0 || slide.bulletSize.h > 0)) ? 'bullet-resized' : ''}" id="slide-bullets-wrap-${index}" data-slide-index="${index}"${bulletPositionStyleStr}><div class="bullet-position-handle" title="드래그하여 본문 위치 조절">H</div>${bulletResizeHandles}<div class="slide-bullets">
            ${slide.bullets.map((b, bi) => `
              <div class="slide-bullet">
                <div class="bullet-dot"></div>
                <div class="bullet-content">
                  <div class="bullet-rendered" onclick="event.stopPropagation();showBulletEditor(${index},${bi})">${markdownToHtml(b)}</div>
                  <textarea class="bullet-text" rows="1" style="display:none"
                    data-slide-index="${index}" data-bullet-index="${bi}"
                    onclick="event.stopPropagation()" onmousedown="event.stopPropagation()"
                    onfocus="showBulletEditor(${index},${bi});_trackFocus(this,'bullet',${index},${bi})"
                    onblur="hideBulletEditor(${index},${bi},this.value)"
                    oninput="updateSlideBullet(${index},${bi},this.value);autoResize(this)"
                  >${escapeHtml(b)}</textarea>
                </div>
              </div>`).join('')}
          </div>
        </div>
        </div>
        ${slide.imageUrl ? `<div class="slide-layer-divider" id="slide-layer-divider-${index}" data-slide-index="${index}" title="드래그하여 텍스트/이미지 비율 조절"></div><div class="slide-image-pane${slide.imageUrl2 ? ' dual-image' : ''}" data-slide-index="${index}" data-layer="image" style="${layerStyleImageWithFlex}">
          <div class="slide-img-slot"><div class="slide-img-wrap ${(slide.slideImage1 && (slide.slideImage1.w || slide.slideImage1.h)) ? 'slide-resized' : ''}" id="slide-img-wrap-${index}-1" data-slide-index="${index}" data-slot="1"${buildSlideImageWrapStyle(slide.slideImage1)}><img src="${slide.imageUrl}" alt=""/><button class="slide-image-remove" onclick="removeSlideImage(${index});event.stopPropagation()" title="제거">✕</button>${buildResizeMoveHandlesHtml()}</div></div>
          ${slide.imageUrl2 ? `<div class="slide-img-slot"><div class="slide-img-wrap ${(slide.slideImage2 && (slide.slideImage2.w || slide.slideImage2.h)) ? 'slide-resized' : ''}" id="slide-img-wrap-${index}-2" data-slide-index="${index}" data-slot="2"${buildSlideImageWrapStyle(slide.slideImage2)}><img src="${slide.imageUrl2}" alt=""/><button class="slide-image-remove" onclick="removeSlideImage2(${index});event.stopPropagation()" title="제거">✕</button>${buildResizeMoveHandlesHtml()}</div></div>` : ''}
        </div>` : ''}

        <div class="slide-whitespace-badge" id="wsb-${index}" title="남는 여백(대략)">여백 -</div>
      </div>
      <div class="speaker-notes">
        <span class="speaker-notes-icon">💬</span>
        <textarea class="speaker-notes-text" rows="2" placeholder="발표자 노트..."
          onclick="event.stopPropagation()" onmousedown="event.stopPropagation()"
          onfocus="_trackFocus(this,'notes',${index})"
          oninput="updateSlideNotes(${index},this.value)"
        >${escapeHtml(slide.notes || '')}</textarea>
      </div>
    </div>`;
  }).join('');
  setTimeout(() => document.querySelectorAll('.slide-title-input,.speaker-notes-text').forEach(autoResize), 60);
  updateSlidesCountLabel();
  updateDesignPanel();

  // 슬라이드 폰트(보기) 확대율 유지
  applySlideZoom();
  applySlideFontScale();
  applySlideTextImgRatio();

  // 여백/페이지 표시 동기화
  try { mdUpdatePageIndicators(); } catch (e) { }
  try { setTimeout(() => updateWhitespaceBadges(), 80); } catch (e) { }

  // 저장된 YouTube 크기 적용
  applyYoutubeResizedStyles();
}

/** 슬라이드별로 저장된 YouTube 영상 크기 적용 */
function applyYoutubeResizedStyles() {
  if (!slides || !slides.length) return;
  slides.forEach(function (slide, index) {
    if (slide.youtubeSize && slide.youtubeSize.w) {
      var wrapper = document.getElementById('sw-' + index);
      if (wrapper) {
        var wrap = wrapper.querySelector('.slide-youtube-wrap.youtube-resizable');
        if (wrap) {
          wrap.classList.add('youtube-resized');
          wrap.style.width = slide.youtubeSize.w + 'px';
          wrap.style.height = slide.youtubeSize.h + 'px';
          if (slide.youtubeSize.left != null && slide.youtubeSize.top != null) {
            wrap.style.position = 'absolute';
            wrap.style.left = slide.youtubeSize.left + 'px';
            wrap.style.top = slide.youtubeSize.top + 'px';
          }
        }
      }
    }
    if (slide.extraAreaHeight) {
      var area = document.getElementById('slide-extra-area-' + index);
      if (area) {
        area.style.height = slide.extraAreaHeight + 'px';
        area.classList.add('has-fixed-height');
      }
    }
    if (slide.extraAreaPosition) {
      var area = document.getElementById('slide-extra-area-' + index);
      if (area) {
        area.style.position = 'relative';
        area.style.left = (slide.extraAreaPosition.left || 0) + 'px';
        area.style.top = (slide.extraAreaPosition.top || 0) + 'px';
      }
    }
    if (slide.bulletPosition && (slide.bulletPosition.left != null || slide.bulletPosition.top != null)) {
      var wrap = document.getElementById('slide-bullets-wrap-' + index);
      if (wrap) {
        wrap.style.position = 'relative';
        wrap.style.left = (slide.bulletPosition.left || 0) + 'px';
        wrap.style.top = (slide.bulletPosition.top || 0) + 'px';
      }
    }
    if (slide.titlePosition && (slide.titlePosition.left != null || slide.titlePosition.top != null)) {
      var titleWrap = document.getElementById('slide-title-wrap-' + index);
      if (titleWrap) {
        titleWrap.style.position = 'relative';
        titleWrap.style.left = (slide.titlePosition.left || 0) + 'px';
        titleWrap.style.top = (slide.titlePosition.top || 0) + 'px';
      }
    }
    if (slide.titleFontSize != null && slide.titleFontSize > 0) {
      var titleWrap = document.getElementById('slide-title-wrap-' + index);
      if (titleWrap) {
        var ta = titleWrap.querySelector('.slide-title-input');
        var rd = titleWrap.querySelector('.title-rendered');
        if (ta) ta.style.fontSize = 'calc(' + slide.titleFontSize + 'px * var(--slide-font-scale, 1))';
        if (rd) rd.style.fontSize = 'calc(' + slide.titleFontSize + 'px * var(--slide-font-scale, 1))';
      }
    }
    if (slide.bulletSize && (slide.bulletSize.w > 0 || slide.bulletSize.h > 0)) {
      var wrap = document.getElementById('slide-bullets-wrap-' + index);
      if (wrap) {
        wrap.classList.add('bullet-resized');
        if (slide.bulletSize.w > 0) wrap.style.width = slide.bulletSize.w + 'px';
        if (slide.bulletSize.h > 0) wrap.style.height = slide.bulletSize.h + 'px';
      }
    }
    if (slide.extraImageSize && slide.extraImageSize.w) {
      var wrapper = document.getElementById('sw-' + index);
      if (wrapper) {
        var imgWrap = wrapper.querySelector('.slide-extra-img-wrap');
        if (imgWrap) {
          imgWrap.classList.add('slide-resized');
          imgWrap.style.width = slide.extraImageSize.w + 'px';
          imgWrap.style.height = slide.extraImageSize.h + 'px';
        }
      }
    }
    if (slide.slideImage1 && (slide.slideImage1.w > 0 || slide.slideImage1.h > 0 || slide.slideImage1.left != null || slide.slideImage1.top != null)) {
      var wrap1 = document.getElementById('slide-img-wrap-' + index + '-1');
      if (wrap1) {
        wrap1.classList.add('slide-resized');
        if (slide.slideImage1.w > 0) wrap1.style.width = slide.slideImage1.w + 'px';
        if (slide.slideImage1.h > 0) wrap1.style.height = slide.slideImage1.h + 'px';
        if (slide.slideImage1.left != null || slide.slideImage1.top != null) {
          wrap1.style.position = 'absolute';
          wrap1.style.left = (slide.slideImage1.left != null ? slide.slideImage1.left : 0) + 'px';
          wrap1.style.top = (slide.slideImage1.top != null ? slide.slideImage1.top : 0) + 'px';
        }
      }
    }
    if (slide.slideImage2 && (slide.slideImage2.w > 0 || slide.slideImage2.h > 0 || slide.slideImage2.left != null || slide.slideImage2.top != null)) {
      var wrap2 = document.getElementById('slide-img-wrap-' + index + '-2');
      if (wrap2) {
        wrap2.classList.add('slide-resized');
        if (slide.slideImage2.w > 0) wrap2.style.width = slide.slideImage2.w + 'px';
        if (slide.slideImage2.h > 0) wrap2.style.height = slide.slideImage2.h + 'px';
        if (slide.slideImage2.left != null || slide.slideImage2.top != null) {
          wrap2.style.position = 'absolute';
          wrap2.style.left = (slide.slideImage2.left != null ? slide.slideImage2.left : 0) + 'px';
          wrap2.style.top = (slide.slideImage2.top != null ? slide.slideImage2.top : 0) + 'px';
        }
      }
    }
  });
}

// ── YouTube 영상 마우스 드래그 크기 조절 (모서리+상하좌우 8방향, 드래그 중에만 적용) ─────────────────────
(function () {
  var MIN_W = 200, MIN_H = 120;
  var _resize = { active: false, wrap: null, edge: '', startX: 0, startY: 0, startLeft: 0, startTop: 0, startW: 0, startH: 0, isImg: false, isSlideImg: false, slot: '1', hasMoved: false };

  function onMouseMove(e) {
    if (!_resize.active || !_resize.wrap) return;
    if (!_resize.hasMoved) {
      _resize.hasMoved = true;
      var isImg = _resize.wrap.classList.contains('slide-extra-img-wrap');
      var isSlideImg = _resize.wrap.classList.contains('slide-img-wrap');
      if (!_resize.wrap.classList.contains('youtube-resized') && !_resize.wrap.classList.contains('slide-resized')) {
        if (isImg) _resize.wrap.classList.add('slide-resized');
        else if (isSlideImg) {
          _resize.wrap.classList.add('slide-resized');
          _resize.wrap.style.position = 'absolute';
          _resize.wrap.style.width = _resize.startW + 'px';
          _resize.wrap.style.height = _resize.startH + 'px';
          _resize.wrap.style.left = _resize.startLeft + 'px';
          _resize.wrap.style.top = _resize.startTop + 'px';
        } else {
          _resize.wrap.classList.add('youtube-resized');
          _resize.wrap.style.position = 'absolute';
          _resize.wrap.style.left = _resize.startLeft + 'px';
          _resize.wrap.style.top = _resize.startTop + 'px';
        }
      }
    }
    var dx = e.clientX - _resize.startX;
    var dy = e.clientY - _resize.startY;
    var edge = _resize.edge;
    var L = _resize.startLeft, T = _resize.startTop, W = _resize.startW, H = _resize.startH;
    if (_resize.isImg && !_resize.isSlideImg) {
      W = Math.max(MIN_W, _resize.startW + dx);
      H = Math.max(MIN_H, _resize.startH + dy);
    } else {
      if (edge.indexOf('e') !== -1) W = Math.max(MIN_W, W + dx);
      if (edge.indexOf('w') !== -1) { W = Math.max(MIN_W, W - dx); L = _resize.startLeft + dx; }
      if (edge.indexOf('s') !== -1) H = Math.max(MIN_H, H + dy);
      if (edge.indexOf('n') !== -1) { H = Math.max(MIN_H, H - dy); T = _resize.startTop + dy; }
      _resize.wrap.style.left = L + 'px';
      _resize.wrap.style.top = T + 'px';
    }
    _resize.wrap.style.width = W + 'px';
    _resize.wrap.style.height = H + 'px';
  }
  function onMouseUp() {
    if (!_resize.active || !_resize.wrap) return;
    var didMove = _resize.hasMoved;
    _resize.active = false;
    _resize.hasMoved = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    if (didMove) {
      var sw = _resize.wrap.closest('.slide-wrapper');
      if (sw && typeof slides !== 'undefined') {
        var id = sw.id;
        var idx = id && id.indexOf('sw-') === 0 ? parseInt(id.slice(3), 10) : -1;
        if (idx >= 0 && slides[idx]) {
          if (_resize.isSlideImg) {
            var key = 'slideImage' + (_resize.slot || '1');
            slides[idx][key] = {
              w: _resize.wrap.offsetWidth,
              h: _resize.wrap.offsetHeight,
              left: parseInt(_resize.wrap.style.left, 10) || 0,
              top: parseInt(_resize.wrap.style.top, 10) || 0
            };
          } else if (_resize.isImg) {
            slides[idx].extraImageSize = { w: _resize.wrap.offsetWidth, h: _resize.wrap.offsetHeight };
          } else {
            var yt = { w: _resize.wrap.offsetWidth, h: _resize.wrap.offsetHeight };
            if (_resize.wrap.style.position === 'absolute') {
              yt.left = parseInt(_resize.wrap.style.left, 10) || 0;
              yt.top = parseInt(_resize.wrap.style.top, 10) || 0;
            }
            slides[idx].youtubeSize = yt;
          }
        }
      }
    }
    _resize.wrap = null;
  }
  document.addEventListener('mousedown', function (e) {
    if (e.button !== 0) return; // 왼쪽 버튼 드래그로 사이즈 조절
    var handle = e.target && e.target.closest('.youtube-resize-handle');
    if (!handle) return;
    var wrap = handle.closest('.slide-img-wrap');
    if (!wrap) wrap = handle.closest('.slide-youtube-wrap');
    if (!wrap) wrap = handle.closest('.slide-extra-img-wrap');
    if (!wrap) return;
    e.preventDefault();
    e.stopPropagation();
    if (typeof pushSlideUndoState === 'function') pushSlideUndoState();
    var isImg = wrap.classList.contains('slide-extra-img-wrap');
    var isSlideImg = wrap.classList.contains('slide-img-wrap');
    var slot = isSlideImg ? (wrap.getAttribute('data-slot') || '1') : '';
    var edge = handle.getAttribute('data-edge') || 'se';
    var rect = wrap.getBoundingClientRect();
    var parent = wrap.parentElement;
    var parentRect = parent ? parent.getBoundingClientRect() : rect;
    _resize.startW = rect.width;
    _resize.startH = isImg ? rect.height : (rect.width * (9 / 16));
    if (isSlideImg) _resize.startH = rect.height;
    _resize.startLeft = rect.left - parentRect.left;
    _resize.startTop = rect.top - parentRect.top;
    if (wrap.classList.contains('youtube-resized') || wrap.classList.contains('slide-resized')) {
      _resize.startW = wrap.offsetWidth;
      _resize.startH = wrap.offsetHeight;
      _resize.startLeft = parseInt(wrap.style.left, 10) || 0;
      _resize.startTop = parseInt(wrap.style.top, 10) || 0;
    }
    _resize.active = true;
    _resize.wrap = wrap;
    _resize.isImg = isImg;
    _resize.isSlideImg = isSlideImg;
    _resize.slot = slot;
    _resize.edge = edge;
    _resize.hasMoved = false;
    _resize.startX = e.clientX;
    _resize.startY = e.clientY;
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, true);
  document.addEventListener('contextmenu', function (e) {
    if (e.target && (e.target.closest('.youtube-resize-handle') || e.target.closest('.youtube-move-handle') || e.target.closest('.bullet-resize-handle') || e.target.closest('.bullet-position-handle') || e.target.closest('.title-position-handle'))) e.preventDefault();
  }, true);
})();

// ── YouTube 영상 왼쪽 상단 이동 핸들 (드래그 시 위치만 변경, 크기 유지) ─────────────────────
(function () {
  var _move = { active: false, wrap: null, startX: 0, startY: 0, startLeft: 0, startTop: 0, hasMoved: false, isSlideImg: false, slot: '1' };

  function onMove(e) {
    if (!_move.active || !_move.wrap) return;
    if (!_move.hasMoved) {
      _move.hasMoved = true;
      if (_move.wrap.classList.contains('slide-img-wrap')) {
        if (!_move.wrap.classList.contains('slide-resized')) {
          _move.wrap.classList.add('slide-resized');
          _move.wrap.style.position = 'absolute';
          _move.wrap.style.width = _move.wrap.offsetWidth + 'px';
          _move.wrap.style.height = _move.wrap.offsetHeight + 'px';
          _move.wrap.style.left = _move.startLeft + 'px';
          _move.wrap.style.top = _move.startTop + 'px';
        }
      } else if (!_move.wrap.classList.contains('youtube-resized')) {
        _move.wrap.classList.add('youtube-resized');
        _move.wrap.style.position = 'absolute';
        _move.wrap.style.width = _move.wrap.offsetWidth + 'px';
        _move.wrap.style.height = _move.wrap.offsetHeight + 'px';
        _move.wrap.style.left = _move.startLeft + 'px';
        _move.wrap.style.top = _move.startTop + 'px';
      }
    }
    var dx = e.clientX - _move.startX;
    var dy = e.clientY - _move.startY;
    _move.wrap.style.left = (_move.startLeft + dx) + 'px';
    _move.wrap.style.top = (_move.startTop + dy) + 'px';
  }
  function onUp() {
    if (!_move.active || !_move.wrap) return;
    var didMove = _move.hasMoved;
    _move.active = false;
    _move.hasMoved = false;
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    if (didMove) {
      var sw = _move.wrap.closest('.slide-wrapper');
      if (sw && typeof slides !== 'undefined') {
        var idx = parseInt(sw.id && sw.id.indexOf('sw-') === 0 ? sw.id.slice(3) : '-1', 10);
        if (idx >= 0 && slides[idx]) {
          if (_move.isSlideImg) {
            var key = 'slideImage' + (_move.slot || '1');
            slides[idx][key] = {
              w: _move.wrap.offsetWidth,
              h: _move.wrap.offsetHeight,
              left: parseInt(_move.wrap.style.left, 10) || 0,
              top: parseInt(_move.wrap.style.top, 10) || 0
            };
          } else {
            slides[idx].youtubeSize = {
              w: _move.wrap.offsetWidth,
              h: _move.wrap.offsetHeight,
              left: parseInt(_move.wrap.style.left, 10) || 0,
              top: parseInt(_move.wrap.style.top, 10) || 0
            };
          }
        }
      }
    }
    _move.wrap = null;
  }
  document.addEventListener('mousedown', function (e) {
    if (e.button !== 0) return; // 왼쪽 버튼 드래그로 이동
    var wrap = null;
    var handle = e.target && e.target.closest('.youtube-move-handle');
    if (handle) {
      wrap = handle.closest('.slide-img-wrap');
      if (!wrap) wrap = handle.closest('.slide-youtube-wrap');
    } else {
      // 이미지 영역을 직접 클릭·드래그해도 이동 가능 (핸들/제거 버튼 제외)
      var imgWrap = e.target && e.target.closest('.slide-img-wrap');
      if (imgWrap && !e.target.closest('.youtube-resize-handle') && !e.target.closest('.slide-image-remove')) {
        wrap = imgWrap;
      } else {
        // 유튜브 영역(iframe 포함)을 클릭·드래그해도 이동 가능 (리사이즈 핸들 제외)
        var ytWrap = e.target && e.target.closest('.slide-youtube-wrap');
        if (ytWrap && !e.target.closest('.youtube-resize-handle')) {
          wrap = ytWrap;
        }
      }
    }
    if (!wrap) return;
    e.preventDefault();
    e.stopPropagation();
    if (typeof pushSlideUndoState === 'function') pushSlideUndoState();
    var rect = wrap.getBoundingClientRect();
    var parent = wrap.parentElement;
    var parentRect = parent ? parent.getBoundingClientRect() : rect;
    _move.active = true;
    _move.wrap = wrap;
    _move.isSlideImg = wrap.classList.contains('slide-img-wrap');
    _move.slot = _move.isSlideImg ? (wrap.getAttribute('data-slot') || '1') : '';
    _move.hasMoved = false;
    _move.startX = e.clientX;
    _move.startY = e.clientY;
    _move.startLeft = rect.left - parentRect.left;
    _move.startTop = rect.top - parentRect.top;
    if (wrap.classList.contains('youtube-resized') || wrap.classList.contains('slide-resized')) {
      _move.startLeft = parseInt(wrap.style.left, 10) || 0;
      _move.startTop = parseInt(wrap.style.top, 10) || 0;
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, true);
})();

// ── slide-extra-text-area 하단 드래그로 높이 조절 ─────────────────────
(function () {
  var _areaResize = { active: false, area: null, startY: 0, startH: 0 };

  function onAreaMouseMove(e) {
    if (!_areaResize.active || !_areaResize.area) return;
    var dy = e.clientY - _areaResize.startY;
    var h = Math.max(60, Math.min(500, _areaResize.startH + dy));
    _areaResize.area.style.height = h + 'px';
    _areaResize.area.classList.add('has-fixed-height');
  }
  function onAreaMouseUp() {
    if (!_areaResize.active || !_areaResize.area) return;
    _areaResize.active = false;
    document.removeEventListener('mousemove', onAreaMouseMove);
    document.removeEventListener('mouseup', onAreaMouseUp);
    var idx = parseInt(_areaResize.area.getAttribute('data-slide-index'), 10);
    if (idx >= 0 && typeof slides !== 'undefined' && slides[idx]) {
      slides[idx].extraAreaHeight = _areaResize.area.offsetHeight;
    }
    _areaResize.area = null;
  }
  document.addEventListener('mousedown', function (e) {
    var handle = e.target && e.target.closest('.slide-extra-resize-handle');
    if (!handle) return;
    var area = handle.closest('.slide-extra-text-area');
    if (!area) return;
    e.preventDefault();
    e.stopPropagation();
    if (typeof pushSlideUndoState === 'function') pushSlideUndoState();
    _areaResize.active = true;
    _areaResize.area = area;
    _areaResize.startY = e.clientY;
    _areaResize.startH = area.offsetHeight || 120;
    document.addEventListener('mousemove', onAreaMouseMove);
    document.addEventListener('mouseup', onAreaMouseUp);
  }, true);
})();

// ── slide-extra-text-area 위치 드래그 (⋮⋮ 핸들) ─────────────────────
(function () {
  var _pos = { active: false, area: null, startX: 0, startY: 0, startLeft: 0, startTop: 0 };

  function onMove(e) {
    if (!_pos.active || !_pos.area) return;
    var dx = e.clientX - _pos.startX;
    var dy = e.clientY - _pos.startY;
    _pos.area.style.position = 'relative';
    _pos.area.style.left = (_pos.startLeft + dx) + 'px';
    _pos.area.style.top = (_pos.startTop + dy) + 'px';
  }
  function onUp() {
    if (!_pos.active || !_pos.area) return;
    _pos.active = false;
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    var idx = parseInt(_pos.area.getAttribute('data-slide-index'), 10);
    if (idx >= 0 && typeof slides !== 'undefined' && slides[idx]) {
      slides[idx].extraAreaPosition = {
        left: parseInt(_pos.area.style.left, 10) || 0,
        top: parseInt(_pos.area.style.top, 10) || 0
      };
    }
    _pos.area = null;
  }
  document.addEventListener('mousedown', function (e) {
    var handle = e.target && e.target.closest('.slide-extra-position-handle');
    if (!handle) handle = e.target && e.target.closest('.slide-extra-move-btn');
    if (!handle) return;
    var area = handle.closest('.slide-extra-text-area');
    if (!area) return;
    e.preventDefault();
    e.stopPropagation();
    if (typeof pushSlideUndoState === 'function') pushSlideUndoState();
    _pos.active = true;
    _pos.area = area;
    _pos.startX = e.clientX;
    _pos.startY = e.clientY;
    _pos.startLeft = parseInt(area.style.left, 10) || 0;
    _pos.startTop = parseInt(area.style.top, 10) || 0;
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, true);
})();

// ── 본문(불릿) 영역 위치 드래그 (H 핸들) ─────────────────────
(function () {
  var _pos = { active: false, wrap: null, startX: 0, startY: 0, startLeft: 0, startTop: 0 };

  function onMove(e) {
    if (!_pos.active || !_pos.wrap) return;
    var dx = e.clientX - _pos.startX;
    var dy = e.clientY - _pos.startY;
    _pos.wrap.style.position = 'relative';
    _pos.wrap.style.left = (_pos.startLeft + dx) + 'px';
    _pos.wrap.style.top = (_pos.startTop + dy) + 'px';
  }
  function onUp() {
    if (!_pos.active || !_pos.wrap) return;
    _pos.active = false;
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    var idx = parseInt(_pos.wrap.getAttribute('data-slide-index'), 10);
    if (idx >= 0 && typeof slides !== 'undefined' && slides[idx]) {
      slides[idx].bulletPosition = {
        left: parseInt(_pos.wrap.style.left, 10) || 0,
        top: parseInt(_pos.wrap.style.top, 10) || 0
      };
    }
    _pos.wrap = null;
  }
  document.addEventListener('mousedown', function (e) {
    if (e.button !== 0) return;
    var handle = e.target && e.target.closest('.bullet-position-handle');
    if (!handle) return;
    var wrap = handle.closest('.slide-bullets-wrap');
    if (!wrap) return;
    e.preventDefault();
    e.stopPropagation();
    if (typeof pushSlideUndoState === 'function') pushSlideUndoState();
    _pos.active = true;
    _pos.wrap = wrap;
    _pos.startX = e.clientX;
    _pos.startY = e.clientY;
    _pos.startLeft = parseInt(wrap.style.left, 10) || 0;
    _pos.startTop = parseInt(wrap.style.top, 10) || 0;
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, true);
})();

// ── 제목 위치 드래그 (T 핸들) ─────────────────────────────────────────
(function () {
  var _pos = { active: false, wrap: null, startX: 0, startY: 0, startLeft: 0, startTop: 0 };
  function onMove(e) {
    if (!_pos.active || !_pos.wrap) return;
    var dx = e.clientX - _pos.startX;
    var dy = e.clientY - _pos.startY;
    var L = _pos.startLeft + dx;
    var T = _pos.startTop + dy;
    _pos.wrap.style.position = 'relative';
    _pos.wrap.style.left = L + 'px';
    _pos.wrap.style.top = T + 'px';
  }
  function onUp() {
    if (!_pos.active || !_pos.wrap) return;
    _pos.active = false;
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    var idx = parseInt(_pos.wrap.getAttribute('data-slide-index'), 10);
    if (idx >= 0 && typeof slides !== 'undefined' && slides[idx]) {
      slides[idx].titlePosition = {
        left: parseInt(_pos.wrap.style.left, 10) || 0,
        top: parseInt(_pos.wrap.style.top, 10) || 0
      };
    }
    _pos.wrap = null;
  }
  document.addEventListener('mousedown', function (e) {
    if (e.button !== 0) return;
    var handle = e.target && e.target.closest('.title-position-handle');
    if (!handle) return;
    var wrap = handle.closest('.slide-title-wrap');
    if (!wrap) return;
    e.preventDefault();
    e.stopPropagation();
    if (typeof pushSlideUndoState === 'function') pushSlideUndoState();
    _pos.active = true;
    _pos.wrap = wrap;
    _pos.startX = e.clientX;
    _pos.startY = e.clientY;
    _pos.startLeft = parseInt(wrap.style.left, 10) || 0;
    _pos.startTop = parseInt(wrap.style.top, 10) || 0;
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, true);
})();

// ── 본문(불릿) 영역 좌우/상하 크기 조절 — 텍스트 레이어 내 불릿 영역만 조절 (데이터 레이어 slide-inner 전체는 조절하지 않음) ─────────────────────
(function () {
  var MIN_W = 120, MIN_H = 60;
  var _resize = { active: false, wrap: null, edge: '', startX: 0, startY: 0, startLeft: 0, startTop: 0, startW: 0, startH: 0, hasMoved: false };

  function onMouseMove(e) {
    if (!_resize.active || !_resize.wrap) return;
    var dx = e.clientX - _resize.startX;
    var dy = e.clientY - _resize.startY;
    var edge = _resize.edge;

    if (!_resize.hasMoved) {
      _resize.hasMoved = true;
      if (!_resize.wrap.classList.contains('bullet-resized')) {
        _resize.wrap.classList.add('bullet-resized');
        _resize.wrap.style.position = 'relative';
        _resize.wrap.style.left = _resize.startLeft + 'px';
        _resize.wrap.style.top = _resize.startTop + 'px';
        _resize.wrap.style.width = _resize.startW + 'px';
        _resize.wrap.style.height = _resize.startH + 'px';
      }
    }
    var L = _resize.startLeft, T = _resize.startTop, W = _resize.startW, H = _resize.startH;
    if (edge.indexOf('e') !== -1) W = Math.max(MIN_W, W + dx);
    if (edge.indexOf('w') !== -1) { W = Math.max(MIN_W, W - dx); L = _resize.startLeft + dx; }
    if (edge.indexOf('s') !== -1) H = Math.max(MIN_H, H + dy);
    if (edge.indexOf('n') !== -1) { H = Math.max(MIN_H, H - dy); T = _resize.startTop + dy; }
    _resize.wrap.style.left = L + 'px';
    _resize.wrap.style.top = T + 'px';
    _resize.wrap.style.width = W + 'px';
    _resize.wrap.style.height = H + 'px';
  }
  function onMouseUp() {
    if (!_resize.active || !_resize.wrap) return;
    var didMove = _resize.hasMoved;
    _resize.active = false;
    _resize.hasMoved = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    if (didMove) {
      var idx = parseInt(_resize.wrap.getAttribute('data-slide-index'), 10);
      if (idx >= 0 && typeof slides !== 'undefined' && slides[idx]) {
        slides[idx].bulletSize = { w: _resize.wrap.offsetWidth, h: _resize.wrap.offsetHeight };
        if (_resize.wrap.style.left || _resize.wrap.style.top) {
          slides[idx].bulletPosition = slides[idx].bulletPosition || {};
          slides[idx].bulletPosition.left = parseInt(_resize.wrap.style.left, 10) || 0;
          slides[idx].bulletPosition.top = parseInt(_resize.wrap.style.top, 10) || 0;
        }
        if (typeof _markDirty === 'function') _markDirty();
      }
    }
    _resize.wrap = null;
  }
  document.addEventListener('mousedown', function (e) {
    if (e.button !== 0) return;
    var handle = e.target && e.target.closest('.bullet-resize-handle');
    if (!handle) return;
    var wrap = handle.closest('.slide-bullets-wrap');
    if (!wrap) return;
    e.preventDefault();
    e.stopPropagation();
    if (typeof pushSlideUndoState === 'function') pushSlideUndoState();
    var edge = handle.getAttribute('data-edge') || 'e';
    var rect = wrap.getBoundingClientRect();
    var parent = wrap.parentElement;
    var parentRect = parent ? parent.getBoundingClientRect() : rect;
    _resize.startW = rect.width;
    _resize.startH = rect.height;
    _resize.startLeft = parseInt(wrap.style.left, 10);
    _resize.startTop = parseInt(wrap.style.top, 10);
    if (isNaN(_resize.startLeft)) _resize.startLeft = rect.left - parentRect.left;
    if (isNaN(_resize.startTop)) _resize.startTop = rect.top - parentRect.top;
    _resize.active = true;
    _resize.wrap = wrap;
    _resize.edge = edge;
    _resize.hasMoved = false;
    _resize.startX = e.clientX;
    _resize.startY = e.clientY;
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, true);
})();

// ── 텍스트/이미지 레이어 구분 디바이더 드래그로 비율 조절 ─────────────────────
(function () {
  var _div = { active: false, slideIndex: -1, card: null, inner: null, startX: 0, cardWidth: 0, startPct: 0 };
  var MIN_PCT = 10, MAX_PCT = 90;

  function onMove(e) {
    if (!_div.active || !_div.card || !_div.inner) return;
    var cardRect = _div.card.getBoundingClientRect();
    var cardW = cardRect.width;
    if (cardW <= 0) return;
    var pct = ((e.clientX - cardRect.left) / cardW) * 100;
    pct = Math.max(MIN_PCT, Math.min(MAX_PCT, pct));
    _div.inner.style.flex = '0 0 ' + pct + '%';
    var imagePane = _div.card.querySelector('.slide-layer-divider + .slide-image-pane');
    if (imagePane) imagePane.style.flex = '0 0 ' + (100 - pct) + '%';
  }

  function onUp() {
    if (!_div.active) return;
    if (_div.slideIndex >= 0 && typeof slides !== 'undefined' && slides[_div.slideIndex]) {
      var flexMatch = (_div.inner.style.flex || '').match(/([\d.]+)%/);
      var pct = flexMatch ? parseFloat(flexMatch[1]) : 50;
      pct = Math.max(MIN_PCT, Math.min(MAX_PCT, pct));
      if (pct > 0 && pct < 100) {
        slides[_div.slideIndex].innerSize = slides[_div.slideIndex].innerSize || {};
        slides[_div.slideIndex].innerSize.widthPct = pct;
        _slideTextRatioPct = pct;
        if (typeof applySlideTextImgRatio === 'function') applySlideTextImgRatio();
        if (typeof _markDirty === 'function') _markDirty();
      }
    }
    _div.active = false;
    _div.slideIndex = -1;
    _div.card = null;
    _div.inner = null;
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  }

  document.addEventListener('mousedown', function (e) {
    if (e.button !== 0) return;
    var div = e.target && e.target.closest('.slide-layer-divider');
    if (!div) return;
    var slideIndex = parseInt(div.getAttribute('data-slide-index'), 10);
    if (isNaN(slideIndex) || slideIndex < 0) return;
    var card = div.closest('.slide-card');
    var inner = card && card.querySelector('.slide-inner[data-layer="text"]');
    if (!card || !inner) return;
    e.preventDefault();
    e.stopPropagation();
    if (typeof pushSlideUndoState === 'function') pushSlideUndoState();
    _div.active = true;
    _div.slideIndex = slideIndex;
    _div.card = card;
    _div.inner = inner;
    _div.startX = e.clientX;
    _div.cardWidth = card.getBoundingClientRect().width;
    var flexMatch = (inner.style.flex || '').match(/([\d.]+)%/);
    _div.startPct = flexMatch ? parseFloat(flexMatch[1]) : 50;
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, true);
})();

/** 텍스트/이미지 비율: 툴바 −/+ 클릭 시 모든 이미지 슬라이드에 일괄 적용. 개별 슬라이드는 디바이더 드래그로 저장됨 */
function changeSlideTextImgRatio(delta) {
  const MIN = 10, MAX = 90;
  _slideTextRatioPct = Math.max(MIN, Math.min(MAX, _slideTextRatioPct + delta));
  var sl = (typeof window.getSlides === 'function' ? window.getSlides() : null) || slides || [];
  if (!sl.length) {
    applySlideTextImgRatio();
    return;
  }
  var changed = false;
  sl.forEach(function (s) {
    if (s.imageUrl) {
      s.innerSize = s.innerSize || {};
      s.innerSize.widthPct = _slideTextRatioPct;
      changed = true;
    }
  });
  if (!changed) {
    applySlideTextImgRatio();
    return;
  }
  if (typeof _markDirty === 'function') _markDirty();
  if (typeof renderSlides === 'function') renderSlides();
  if (typeof renderThumbs === 'function') renderThumbs();
  applySlideTextImgRatio();
}
function promptSlideTextImgRatio() {
  const MIN = 10, MAX = 90;
  var current = Math.round(_slideTextRatioPct);
  var raw = window.prompt('TEXT 비율을 입력하세요 (10~90).\nIMG는 100%에서 자동 계산됩니다.', String(current));
  if (raw === null) return;
  var n = parseInt(String(raw).trim(), 10);
  if (!isFinite(n) || n < MIN || n > MAX) {
    if (typeof showToast === 'function') showToast('⚠️ 10~90 사이 숫자를 입력하세요.');
    return;
  }
  changeSlideTextImgRatio(n - current);
}
function applySlideTextImgRatio() {
  const defPct = typeof DEFAULT_IMAGE_SLIDE_TEXT_PCT !== 'undefined' ? DEFAULT_IMAGE_SLIDE_TEXT_PCT : 45;
  if (slides && slides.length) {
    var first = slides.find(function (s) { return s && s.imageUrl; });
    if (first && first.innerSize && first.innerSize.widthPct != null) _slideTextRatioPct = Math.max(10, Math.min(90, first.innerSize.widthPct));
    else _slideTextRatioPct = defPct;
  } else {
    _slideTextRatioPct = defPct;
  }
  var lbl = document.getElementById('slide-text-ratio-val');
  var imgLbl = document.getElementById('slide-img-ratio-val');
  var textPct = Math.max(10, Math.min(90, Math.round(_slideTextRatioPct)));
  var imgPct = 100 - textPct;
  if (lbl) lbl.textContent = textPct + '%';
  if (imgLbl) imgLbl.textContent = imgPct + '%';
}

/** 배치 일괄적용: 기준 페이지 선택 모달 열기 */
function openLayoutRefModal() {
  if (!Array.isArray(slides) || !slides.length) { showToast('⚠️ 슬라이드가 없습니다'); return; }
  var sel = document.getElementById('layout-ref-page-select');
  var track = document.getElementById('layout-ref-ratio-track');
  var trackInner = track && track.querySelector('.layout-ref-ratio-track-inner');
  var handle = document.getElementById('layout-ref-ratio-handle');
  var handlePctEl = document.getElementById('layout-ref-handle-pct');
  var ratioResultEl = document.getElementById('layout-ref-ratio-result');
  if (!sel || !track || !trackInner || !handle) return;
  sel.innerHTML = '<option value="all">전체</option>' + slides.map(function (s, i) {
    var label = (i + 1) + '페이지';
    if (i === activeSlideIndex) label += ' (현재 선택)';
    return '<option value="' + i + '">' + label + '</option>';
  }).join('');
  sel.value = String(activeSlideIndex);

  function setHandlePosition(pct) {
    pct = Math.max(10, Math.min(90, Math.round(pct)));
    if (handle) handle.style.left = pct + '%';
    if (handlePctEl) handlePctEl.textContent = pct;
    if (ratioResultEl) ratioResultEl.textContent = 'text: ' + pct + '% : image: ' + (100 - pct) + '%';
    return pct;
  }
  function updateRatioFromPage() {
    var val = sel.value;
    if (val === 'all') return;
    var idx = parseInt(val, 10);
    var s = slides[idx];
    var pct = (s && s.imageUrl && s.innerSize && s.innerSize.widthPct != null)
      ? Math.round(s.innerSize.widthPct) : (typeof DEFAULT_IMAGE_SLIDE_TEXT_PCT !== 'undefined' ? DEFAULT_IMAGE_SLIDE_TEXT_PCT : 45);
    setHandlePosition(pct);
  }
  // 저장된 비율(고정값) 복원 — 있으면 슬라이더 초기값으로 사용
  var savedPct = null;
  try {
    var v = localStorage.getItem('scholarslide_layout_ref_default_pct');
    if (v !== null && v !== '') { var n = parseInt(v, 10); if (isFinite(n)) savedPct = Math.max(10, Math.min(90, n)); }
  } catch (e) {}
  if (savedPct != null) setHandlePosition(savedPct);
  else updateRatioFromPage();
  var _drag = { active: false };
  function getPctFromEvent(e) {
    var rect = trackInner.getBoundingClientRect();
    if (rect.width <= 0) return 45;
    return ((e.clientX - rect.left) / rect.width) * 100;
  }
  function onTrackMouseDown(e) {
    if (e.button !== 0) return;
    if (e.target.closest && e.target.closest('.layout-ref-ratio-handle')) return;
    e.preventDefault();
    e.stopPropagation();
    setHandlePosition(getPctFromEvent(e));
  }
  function onHandleMouseDown(e) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    _drag.active = true;
    try { if (handle.setCapture) handle.setCapture(); } catch (e) {}
    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', onDragUp);
  }
  function onDragMove(e) {
    if (!_drag.active) return;
    e.preventDefault();
    setHandlePosition(getPctFromEvent(e));
  }
  function onDragUp() {
    _drag.active = false;
    try { if (document.releaseCapture) document.releaseCapture(); } catch (e) {}
    document.removeEventListener('mousemove', onDragMove);
    document.removeEventListener('mouseup', onDragUp);
  }
  sel.onchange = updateRatioFromPage;
  trackInner.onmousedown = onTrackMouseDown;
  handle.onmousedown = onHandleMouseDown;

  var applyBtn = document.getElementById('layout-ref-apply-btn');
  if (applyBtn) {
    applyBtn.onclick = function () {
      var val = sel.value;
      var refIdx = (val === 'all') ? 0 : parseInt(val, 10);
      if (val !== 'all' && (!isFinite(refIdx) || refIdx < 0 || refIdx >= slides.length)) {
        showToast('⚠️ 기준 페이지를 선택하세요');
        return;
      }
      var flexMatch = (handle && handle.style.left || '').match(/([\d.]+)/);
      var textPct = flexMatch ? parseFloat(flexMatch[1]) : 45;
      textPct = Math.max(10, Math.min(90, textPct));
      try { localStorage.setItem('scholarslide_layout_ref_default_pct', String(Math.round(textPct))); } catch (e) {}
      closeModal('layout-ref-modal');
      applyLayoutFromReferencePage(refIdx, textPct, val === 'all');
    };
  }
  openModal('layout-ref-modal');
}

/** 지정한 기준 페이지의 창(배치) 크기·구조를 모든 슬라이드에 일괄 적용. textPct: 텍스트 비율(20~80). applyAll: true면 비율만 전체 적용(레이아웃 복사 없음) */
function applyLayoutFromReferencePage(refIndex, textPct, applyAll) {
  if (!Array.isArray(slides) || !slides.length) return;
  var src = slides[refIndex];
  if (!src && !applyAll) { showToast('⚠️ 기준 슬라이드를 찾을 수 없습니다'); return; }

  var useTextPct = (textPct != null && !isNaN(textPct)) ? Math.max(10, Math.min(90, Math.round(textPct))) : (typeof DEFAULT_IMAGE_SLIDE_TEXT_PCT !== 'undefined' ? DEFAULT_IMAGE_SLIDE_TEXT_PCT : 45);

  function cloneObj(o) {
    if (o == null || typeof o !== 'object') return o;
    if (Array.isArray(o)) return o.slice();
    var c = {};
    for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) c[k] = cloneObj(o[k]);
    return c;
  }

  if (typeof pushSlideUndoState === 'function') pushSlideUndoState();

  var layoutKeys = ['innerSize', 'bulletSize', 'bulletPosition', 'slideImage1', 'slideImage2', 'extraAreaHeight', 'extraAreaPosition', 'extraImageSize', 'titlePosition', 'titleFontSize', 'layerOrder'];
  var template = {};
  if (!applyAll && src) {
    layoutKeys.forEach(function (k) {
      if (src[k] != null) template[k] = cloneObj(src[k]);
    });
  }
  if (template.innerSize) template.innerSize = cloneObj(template.innerSize);
  else template.innerSize = {};
  template.innerSize.widthPct = useTextPct;

  var applied = 0;
  slides.forEach(function (s, i) {
    if (!s) return;
    if (!applyAll && i === refIndex) return;
    if (!applyAll && src) {
      layoutKeys.forEach(function (k) {
        if (template[k] !== undefined) {
          s[k] = cloneObj(template[k]);
        }
      });
      applied++;
    }
    if (s.imageUrl) {
      s.innerSize = s.innerSize || {};
      s.innerSize.widthPct = useTextPct;
      s.slideImage1 = null;
      s.slideImage2 = null;
      if (applyAll) applied++;
    }
  });

  _slideTextRatioPct = useTextPct;
  if (typeof _markDirty === 'function') _markDirty();
  if (typeof renderSlides === 'function') renderSlides();
  if (typeof renderThumbs === 'function') renderThumbs();
  if (typeof renderGallery === 'function') renderGallery();
  if (typeof applySlideTextImgRatio === 'function') applySlideTextImgRatio();
  if (typeof updateWhitespaceBadges === 'function') updateWhitespaceBadges();
  showToast(applyAll ? '✅ 전체 ' + applied + '개 이미지 슬라이드에 비율을 적용했습니다 (텍스트 ' + useTextPct + '% : 이미지 ' + (100 - useTextPct) + '%)' : '✅ ' + (refIndex + 1) + '페이지 기준으로 ' + applied + '개 슬라이드에 창 크기·배치를 일괄 적용했습니다 (텍스트 ' + useTextPct + '% : 이미지 ' + (100 - useTextPct) + '%)');
}

/** 현재 슬라이드의 창(배치) 크기·구조를 모든 슬라이드에 일괄 적용 — 기준 페이지 선택 모달을 연다 */
function applyCurrentSlideLayoutToAll() {
  openLayoutRefModal();
}

/** 현재 편집 중인 슬라이드를 사용자가 수동으로 생성 히스토리에 저장 */
function saveCurrentSlidesToHistory() {
  if (!Array.isArray(slides) || !slides.length) { showToast('⚠️ 저장할 슬라이드가 없습니다'); return; }
  if (typeof window.addToSlideHistory !== 'function') { showToast('⚠️ 히스토리 기능을 사용할 수 없습니다'); return; }
  var cloned = [];
  try {
    cloned = JSON.parse(JSON.stringify(slides));
  } catch (e) {
    cloned = slides.map(function (s, i) { return Object.assign({ id: i }, s || {}); });
  }
  var baseName = (typeof window.getFileName === 'function' ? window.getFileName() : '') || '슬라이드';
  var entry = {
    fileName: baseName + ' (수동 저장)',
    slides: cloned,
    manuscriptContent: (typeof window.slidesToMarkdown === 'function') ? window.slidesToMarkdown(cloned) : '',
    isManualSnapshot: true
  };
  var savedId = window.addToSlideHistory(entry);
  if (typeof window._selectedManuscriptHistoryId !== 'undefined') window._selectedManuscriptHistoryId = savedId || null;
  if (typeof window.setManuscriptView === 'function') window.setManuscriptView('slides');
  if (typeof window.setManuscriptSubView === 'function') window.setManuscriptSubView('history');
  if (typeof renderLeftPanel === 'function') renderLeftPanel();
  showToast('📜 편집한 슬라이드를 슬라이드 히스토리에 저장했습니다');
}

/** 편집한 슬라이드만 저장 (히스토리 미생성, 자동저장 슬롯에 반영) */
function saveCurrentSlidesOnly() {
  if (!Array.isArray(slides) || !slides.length) { showToast('⚠️ 저장할 슬라이드가 없습니다'); return; }
  if (typeof autoSaveNow !== 'function') { showToast('⚠️ 저장 기능을 사용할 수 없습니다'); return; }
  autoSaveNow(true);
  showToast('💾 편집한 슬라이드가 저장되었습니다');
}

// Bullet edit helpers (click rendered → show textarea)
function showTitleEditor(si) {
  const wrap = document.querySelector(`#sw-${si} .slide-title-wrap`);
  if (!wrap) return;
  const rendered = wrap.querySelector('.title-rendered');
  const editor = wrap.querySelector('.slide-title-input');
  if (rendered) rendered.style.display = 'none';
  if (editor) {
    editor.style.display = 'block';
    autoResize(editor);
    editor.focus();
    const len = editor.value.length;
    editor.selectionStart = editor.selectionEnd = len;
    _trackFocus(editor, 'title', si);
  }
}
function hideTitleEditor(si, val) {
  updateSlideTitle(si, val);
  const wrap = document.querySelector(`#sw-${si} .slide-title-wrap`);
  if (!wrap) return;
  const rendered = wrap.querySelector('.title-rendered');
  const editor = wrap.querySelector('.slide-title-input');
  if (rendered) {
    rendered.innerHTML = markdownToHtml(val);
    rendered.style.display = 'block';
  }
  if (editor) editor.style.display = 'none';
}
function showBulletEditor(si, bi) {
  const bulletEl = document.querySelectorAll(`#sw-${si} .slide-bullet`)[bi];
  if (!bulletEl) return;
  const rendered = bulletEl.querySelector('.bullet-rendered');
  const editor = bulletEl.querySelector('.bullet-text');
  if (rendered) rendered.style.display = 'none';
  if (editor) {
    editor.style.display = 'block';
    autoResize(editor);
    editor.focus();
    // Place cursor at end
    const len = editor.value.length;
    editor.selectionStart = editor.selectionEnd = len;
    _trackFocus(editor, 'bullet', si, bi);
  }
}
function hideBulletEditor(si, bi, val) {
  updateSlideBullet(si, bi, val);
  const rendered = document.querySelectorAll(`#sw-${si} .slide-bullet`)[bi]?.querySelector('.bullet-rendered');
  const editor = document.querySelectorAll(`#sw-${si} .slide-bullet`)[bi]?.querySelector('.bullet-text');
  if (rendered) { rendered.innerHTML = markdownToHtml(val); rendered.style.display = 'block'; }
  if (editor) editor.style.display = 'none';
}

// 편집창 선택 영역에 마크다운 서식 적용 (Ctrl+B / Ctrl+I)
function wrapSelectionWith(ta, before, after) {
  if (!ta || typeof ta.selectionStart === 'undefined') return false;
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const val = ta.value;
  let newStart = start;
  let newEnd = end;
  if (start === end) {
    // 선택 없으면 단어 단위 선택 시도
    const re = /[\w\uac00-\ud7a3]+/g;
    let m;
    while ((m = re.exec(val)) !== null) {
      if (m.index <= start && m.index + m[0].length >= start) {
        newStart = m.index;
        newEnd = m.index + m[0].length;
        break;
      }
    }
  }
  const newText = val.slice(0, newStart) + before + val.slice(newStart, newEnd) + after + val.slice(newEnd);
  ta.value = newText;
  ta.selectionStart = newStart + before.length;
  ta.selectionEnd = newEnd + before.length;
  ta.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
}

// ── MD 에디터 실행 취소/다시 실행 (Ctrl+Z 실행 취소, Ctrl+Shift+Z 다시 실행, Ctrl+Y 다시 실행) ─────────────
const MAX_MD_UNDO = 80;
let mdEditorUndoStack = [];
let mdEditorRedoStack = [];

function pushMdEditorUndoState(ta) {
  if (!ta || ta.id !== 'md-editor-ta') return;
  const v = ta.value;
  const s = ta.selectionStart;
  const e = ta.selectionEnd;
  const last = mdEditorUndoStack[mdEditorUndoStack.length - 1];
  if (last && last.value === v && last.start === s && last.end === e) return;
  mdEditorUndoStack.push({ value: v, start: s, end: e });
  if (mdEditorUndoStack.length > MAX_MD_UNDO) mdEditorUndoStack.shift();
  mdEditorRedoStack.length = 0;
}

function mdEditorUndo(ta) {
  if (!ta || ta.id !== 'md-editor-ta' || !mdEditorUndoStack.length) return;
  mdEditorRedoStack.push({ value: ta.value, start: ta.selectionStart, end: ta.selectionEnd });
  const state = mdEditorUndoStack.pop();
  ta.value = state.value;
  ta.selectionStart = state.start;
  ta.selectionEnd = state.end;
  ta.dispatchEvent(new Event('input', { bubbles: true }));
}

function mdEditorRedo(ta) {
  if (!ta || ta.id !== 'md-editor-ta' || !mdEditorRedoStack.length) return;
  mdEditorUndoStack.push({ value: ta.value, start: ta.selectionStart, end: ta.selectionEnd });
  const state = mdEditorRedoStack.pop();
  ta.value = state.value;
  ta.selectionStart = state.start;
  ta.selectionEnd = state.end;
  ta.dispatchEvent(new Event('input', { bubbles: true }));
}

// ── MD 에디터 줄 단위 유틸 (줄 위/아래 이동, 복제, 현재 줄 삭제) ─────────────
function mdEditorGetLineBounds(ta) {
  const val = ta.value;
  const pos = ta.selectionStart;
  const lineStart = val.lastIndexOf('\n', pos - 1) + 1;
  let lineEnd = val.indexOf('\n', lineStart);
  if (lineEnd === -1) lineEnd = val.length;
  const lineIndex = (val.substring(0, lineStart).match(/\n/g) || []).length;
  const lines = val.split('\n');
  const selEnd = ta.selectionEnd;
  let lineEndSel = val.indexOf('\n', selEnd);
  if (lineEndSel === -1) lineEndSel = val.length;
  const lineIndexEnd = (val.substring(0, lineEndSel).match(/\n/g) || []).length;
  return { lineStart, lineEnd, lineIndex, lines, lineIndexEnd };
}

function mdEditorMoveLineUp(ta) {
  const b = mdEditorGetLineBounds(ta);
  if (b.lineIndex <= 0) return;
  const lines = b.lines.slice();
  const lineText = lines[b.lineIndex];
  lines[b.lineIndex] = lines[b.lineIndex - 1];
  lines[b.lineIndex - 1] = lineText;
  const newVal = lines.join('\n');
  let newStart = 0;
  for (let i = 0; i < b.lineIndex - 1; i++) newStart += lines[i].length + 1;
  ta.value = newVal;
  ta.selectionStart = newStart;
  ta.selectionEnd = newStart + lineText.length;
  ta.dispatchEvent(new Event('input', { bubbles: true }));
}

function mdEditorMoveLineDown(ta) {
  const b = mdEditorGetLineBounds(ta);
  if (b.lineIndex >= b.lines.length - 1) return;
  const lines = b.lines.slice();
  const lineText = lines[b.lineIndex];
  lines[b.lineIndex] = lines[b.lineIndex + 1];
  lines[b.lineIndex + 1] = lineText;
  const newVal = lines.join('\n');
  let newStart = 0;
  for (let i = 0; i < b.lineIndex + 1; i++) newStart += lines[i].length + 1;
  ta.value = newVal;
  ta.selectionStart = newStart;
  ta.selectionEnd = newStart + lineText.length;
  ta.dispatchEvent(new Event('input', { bubbles: true }));
}

function mdEditorDupLine(ta) {
  const b = mdEditorGetLineBounds(ta);
  const lines = b.lines.slice();
  const from = b.lineIndex;
  const to = b.lineIndexEnd;
  const toCopy = lines.slice(from, to + 1);
  const insertIdx = to + 1;
  const newLines = lines.slice(0, insertIdx).concat(toCopy).concat(lines.slice(insertIdx));
  const newVal = newLines.join('\n');
  let newStart = 0;
  for (let i = 0; i < insertIdx; i++) newStart += newLines[i].length + 1;
  const len = toCopy.join('\n').length;
  ta.value = newVal;
  ta.selectionStart = newStart;
  ta.selectionEnd = newStart + len;
  ta.dispatchEvent(new Event('input', { bubbles: true }));
}

function mdEditorDeleteLine(ta) {
  const b = mdEditorGetLineBounds(ta);
  const lines = b.lines.slice();
  const from = b.lineIndex;
  const to = b.lineIndexEnd;
  lines.splice(from, to - from + 1);
  const newVal = lines.length ? lines.join('\n') : '';
  let newStart = 0;
  for (let i = 0; i < from && i < lines.length; i++) newStart += lines[i].length + 1;
  if (newStart > newVal.length) newStart = newVal.length;
  ta.value = newVal;
  ta.selectionStart = newStart;
  ta.selectionEnd = newStart;
  ta.dispatchEvent(new Event('input', { bubbles: true }));
}

// ── Pen opacity (현재 선택된 펜/형광펜에만 적용) ─────────────
function setPenOpacity(val) {
  const v = parseInt(val) / 100;
  _penOpacity = v;
  if (_penTool === 'pen' || _penTool === 'highlight') {
    const s = _penToolSettings[_penTool];
    if (s) s.opacity = v;
  }
  const lbl = document.getElementById('pen-opacity-val');
  if (lbl) lbl.textContent = val + '%';
}

// ── Pen size (현재 선택된 도구에만 적용) ─────────────────────
function setPenSize(val) {
  const n = Math.max(1, Math.min(40, parseInt(val) || 3));
  if (_penTool !== 'pointer' && _penToolSettings[_penTool]) _penToolSettings[_penTool].size = n;
}

// ── MD Editor ────────────────────────────────────────────
let _mdFontSize = 12; // current font size pt

function mdLoadFromSlide() {
  const footer = document.getElementById('slide-footer');
  const activeThumb = footer ? footer.querySelector('.thumb.active') : null;
  let loadIndex = activeSlideIndex;
  if (activeThumb && activeThumb.parentElement) {
    const thumbs = Array.from(activeThumb.parentElement.querySelectorAll('.thumb'));
    const idx = thumbs.indexOf(activeThumb);
    if (idx >= 0) loadIndex = idx;
  }

  const slide = slides[loadIndex];
  const ta = document.getElementById('md-editor-ta');
  if (!ta) return;
  if (!slide) { ta.value = ''; return; }

  if (loadIndex !== activeSlideIndex) {
    activeSlideIndex = loadIndex;
    document.querySelectorAll('.slide-wrapper').forEach((el, i) => el.classList.toggle('active', i === loadIndex));
    document.querySelectorAll('.thumb').forEach((el, i) => el.classList.toggle('active', i === loadIndex));
    updateDesignPanel();
    const el = document.getElementById(`sw-${loadIndex}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  let md = (slide.title ? '# ' + slide.title + '\n\n' : '');
  if (slide.bullets && slide.bullets.length) md += slide.bullets.map(b => '- ' + b).join('\n') + '\n';
  if (slide.extraText && slide.extraText.trim()) md += (md ? '\n' : '') + slide.extraText.trim();
  if (slide.notes && slide.notes.trim()) md += (md ? '\n\n' : '') + '> ' + slide.notes.trim() + '\n';
  ta.value = md;
  if (slide.mdContent !== undefined) slide.mdContent = md;
  mdEditorUndoStack.length = 0;
  mdEditorRedoStack.length = 0;
  mdUpdatePreview();
  try { if (typeof window.mdUpdatePageIndicators === 'function') window.mdUpdatePageIndicators(); if (typeof window.updateWhitespaceBadges === 'function') window.updateWhitespaceBadges(); } catch (e) { }
}

function mdApplyToSlide() {
  const slide = slides[activeSlideIndex];
  const ta = document.getElementById('md-editor-ta');
  if (!slide || !ta) { showToast('⚠️ 슬라이드를 선택하세요'); return; }
  const md = ta.value;

  if (typeof pushSlideUndoState === 'function') pushSlideUndoState();
  slide.mdContent = md;

  const titleM = md.match(/^#\s+(.+)/m);
  if (titleM) slide.title = titleM[1].trim();

  const noteM = md.match(/^>\s+(.+)/m);
  if (noteM) slide.notes = noteM[1].trim();

  const lines = md.split('\n');
  const bullets = [];
  let preamble = [];
  let currentBullet = null;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (/^#\s+/.test(line)) { i++; continue; }
    if (/^>\s+/.test(line)) { i++; continue; }
    const bulletMatch = line.match(/^(?:[-*]|\d+\.)\s+(.*)$/);
    if (bulletMatch) {
      if (currentBullet !== null) bullets.push(currentBullet.trim());
      currentBullet = bulletMatch[1] || '';
      i++;
      continue;
    }
    if (/^```/.test(line)) {
      const codeBlock = [line];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) {
        codeBlock.push(lines[i]);
        i++;
      }
      if (i < lines.length) codeBlock.push(lines[i]);
      i++;
      const blockStr = codeBlock.join('\n');
      if (currentBullet !== null) currentBullet += '\n\n' + blockStr;
      else preamble.push(blockStr);
      continue;
    }
    if (currentBullet !== null) currentBullet += '\n' + line;
    else preamble.push(line);
    i++;
  }

  if (currentBullet !== null) bullets.push(currentBullet.trim());
  slide.bullets = bullets.length ? bullets : (slide.bullets || []);
  const extraContent = preamble.join('\n').trim();
  slide.extraText = extraContent || '';

  renderSlides();
  renderThumbs();
}

let _mdLiveTimer = null;
function mdLiveApply() {
  clearTimeout(_mdLiveTimer);
  _mdLiveTimer = setTimeout(() => {
    mdApplyToSlide();
  }, 600);
}

function mdFmt(type, val) {
  const ta = document.getElementById('md-editor-ta');
  if (!ta) return;
  const s = ta.selectionStart, e = ta.selectionEnd;
  const sel = ta.value.substring(s, e);
  let ins = '';
  if (type === 'bold') ins = '**' + (sel || '굵게') + '**';
  else if (type === 'italic') ins = '*' + (sel || '기울임') + '*';
  else if (type === 'strike') ins = '~~' + (sel || '취소선') + '~~';
  else if (type === 'h1') ins = '# ' + (sel || '제목1');
  else if (type === 'h2') ins = '## ' + (sel || '제목2');
  else if (type === 'h3') ins = '### ' + (sel || '제목3');
  else if (type === 'ul') ins = '- ' + (sel || '항목');
  else if (type === 'ol') ins = '1. ' + (sel || '항목');
  else if (type === 'code') ins = '`' + (sel || '코드') + '`';
  else if (type === 'codeblock') ins = '```js\n' + (sel || '코드') + '\n```';
  else if (type === 'link') ins = '[' + (sel || '링크') + '](https://)';
  else if (type === 'color') ins = '<span style="color:' + val + '">' + (sel || '텍스트') + '</span>';
  else if (type === 'size') ins = '<span style="font-size:' + val + '">' + (sel || '텍스트') + '</span>';
  ta.setRangeText(ins, s, e, 'end');
  ta.focus();
  mdLiveApply();
}

function mdAdjustFontSize(delta) {
  _mdFontSize = Math.max(7, Math.min(80, _mdFontSize + delta));
  document.getElementById('md-size-display').textContent = _mdFontSize;
}
function mdSelectFontSize(val) {
  if (!val) return;
  _mdFontSize = parseInt(val);
  document.getElementById('md-size-display').textContent = _mdFontSize;
}
function mdApplyFontSize() {
  mdFmt('size', _mdFontSize + 'px');
}
function mdSizeInputMode() {
  const disp = document.getElementById('md-size-display');
  const inp = document.getElementById('md-size-input');
  if (!disp || !inp) return;
  disp.style.display = 'none';
  inp.style.display = 'inline-block';
  inp.value = _mdFontSize;
  inp.focus(); inp.select();
}
function mdSizeConfirm() {
  const inp = document.getElementById('md-size-input');
  const disp = document.getElementById('md-size-display');
  if (!inp || !disp) return;
  _mdFontSize = Math.max(7, Math.min(80, parseInt(inp.value) || 12));
  disp.textContent = _mdFontSize;
  inp.style.display = 'none';
  disp.style.display = '';
}

function openLinkModal() {
  const ta = document.getElementById('md-editor-ta');
  const sel = ta ? ta.value.substring(ta.selectionStart, ta.selectionEnd) : '';
  const li = document.getElementById('link-text-input');
  if (li) li.value = sel || '';
  const lu = document.getElementById('link-url-input');
  if (lu) lu.value = '';
  openModal('link-modal');
  setTimeout(function () {
    var urlInp = document.getElementById('link-url-input');
    if (urlInp) urlInp.focus();
  }, 100);
}
function insertLinkFromModal() {
  const text = (document.getElementById('link-text-input')?.value || '링크').trim();
  const url = (document.getElementById('link-url-input')?.value || '').trim();
  const newTab = document.getElementById('link-newtab')?.checked;
  const ta = document.getElementById('md-editor-ta');
  if (!ta || !url) { showToast('⚠️ URL을 입력하세요'); return; }
  const ins = `[${text}](${url})${newTab ? '{_blank}' : ''}`;
  const s = ta.selectionStart, e = ta.selectionEnd;
  ta.setRangeText(ins, s, e, 'end');
  ta.focus();
  closeModal('link-modal');
  if (typeof mdLiveApply === 'function') mdLiveApply();
  showToast('✅ 링크가 삽입되었습니다. [적용]을 누르면 슬라이드에 반영됩니다.');
}

let _youtubeDebounceTimer = null;
function openYoutubeModal() {
  const modal = document.getElementById('youtube-modal');
  const inp = document.getElementById('youtube-url-input');
  const wrap = document.getElementById('youtube-preview-wrap');
  const area = document.getElementById('youtube-preview-area');
  if (inp) inp.value = '';
  if (area) area.innerHTML = '';
  if (wrap) wrap.style.display = 'none';
  openModal('youtube-modal');
  if (modal && inp) setTimeout(function () { inp.focus(); }, 100);
}
function normalizeYoutubeUrl(url) {
  if (url == null) return '';
  return String(url).replace(/\s+/g, '').trim();
}
function previewYoutubeOnInput() {
  clearTimeout(_youtubeDebounceTimer);
  _youtubeDebounceTimer = setTimeout(function () {
    updateYoutubePreview(document.getElementById('youtube-url-input')?.value);
  }, 400);
}
function updateYoutubePreview(url) {
  const normalized = normalizeYoutubeUrl(url);
  const videoId = extractYoutubeId(normalized);
  const wrap = document.getElementById('youtube-preview-wrap');
  const area = document.getElementById('youtube-preview-area');
  if (!wrap || !area) return;
  if (!videoId) {
    area.innerHTML = '';
    wrap.style.display = 'none';
    return;
  }
  wrap.style.display = 'block';
  area.innerHTML = buildYoutubeEmbedHtml(videoId);
}
function previewYoutube() {
  var url = document.getElementById('youtube-url-input')?.value;
  updateYoutubePreview(url);
  if (!extractYoutubeId(normalizeYoutubeUrl(url))) showToast('⚠️ 유효한 YouTube URL을 입력하세요');
}
function insertYoutubeFromModal() {
  var url = document.getElementById('youtube-url-input')?.value;
  var normalized = normalizeYoutubeUrl(url);
  var vid = extractYoutubeId(normalized);
  var ta = document.getElementById('md-editor-ta');
  if (!vid) {
    showToast('⚠️ 유효한 YouTube URL을 입력하세요 (예: https://www.youtube.com/watch?v=영상ID)');
    return;
  }
  if (!ta) return;
  var ins = '\nyoutube:' + normalized + '\n';
  var s = ta.selectionStart, e = ta.selectionEnd;
  ta.setRangeText(ins, s, e, 'end');
  ta.focus();
  closeModal('youtube-modal');
  if (typeof mdUpdatePreview === 'function') mdUpdatePreview();
  showToast('✅ YouTube 링크가 삽입되었습니다. 아래 [적용]을 누르면 슬라이드에 동영상이 표시됩니다.');
}
function mdPreviewUpdate() { /* preview removed */ }

function setImgAiRatio(r, btn) {
  if (r && typeof localStorage !== 'undefined') localStorage.setItem(LS_IMAGE_ASPECT_RATIO, r);
  document.querySelectorAll('.img-ai-ratio-btn').forEach(function (x) { x.classList.remove('active'); });
  if (btn) btn.classList.add('active');
}

// ── AI Image Edit (시드 이미지 기반 재생성) ───────────────
async function aiEditImage() {
  const prompt = document.getElementById('img-ai-prompt')?.value?.trim();
  const seedImage = _finalCroppedDataURL || _origImageDataURL;
  const hasSeed = seedImage && typeof seedImage === 'string' && seedImage.startsWith('data:image');
  if (!hasSeed && !prompt) { showToast('⚠️ 이미지를 올리거나 프롬프트를 입력하세요'); return; }
  try { getImageApiKey(); } catch { showToast('⚠️ API 키를 먼저 설정하세요'); openApiModal(); return; }
  const statusEl = document.getElementById('img-ai-status');
  const genBtn = document.getElementById('img-ai-gen-btn');
  const modelSel = document.getElementById('img-ai-model-select');
  const modelId = modelSel ? modelSel.value : 'gemini-3.1-flash-image-preview';
  const aspectRatio = (typeof getImageAspectRatio === 'function' ? getImageAspectRatio() : '1:1');

  if (statusEl) {
    statusEl.innerHTML = '<div class="img-ai-progress-wrap" style="display:flex;flex-direction:column;gap:4px"><div style="font-size:10px;color:var(--text3)">AI 이미지 생성 중</div><div style="height:8px;background:var(--surface2);border-radius:4px;overflow:hidden"><div id="img-ai-progress-bar" style="height:100%;width:0%;background:var(--accent);transition:width 0.3s ease"></div></div><span id="img-ai-progress-pct" style="font-size:10px;color:var(--text2)">0%</span></div>';
  }
  if (genBtn) genBtn.disabled = true;

  let progress = 0;
  const progressBar = document.getElementById('img-ai-progress-bar');
  const progressPct = document.getElementById('img-ai-progress-pct');
  const tickProgress = function () {
    if (progress < 85) progress += Math.random() * 8 + 4;
    if (progress > 85) progress = 85;
    if (progressBar) progressBar.style.width = progress + '%';
    if (progressPct) progressPct.textContent = Math.round(progress) + '%';
  };
  const iv = setInterval(tickProgress, 400);

  let dataURL = null;
  try {
    dataURL = await generateImage(prompt || '', { seedImage: hasSeed ? seedImage : null, modelId: modelId, aspectRatio: aspectRatio });
  } catch (e) {
    clearInterval(iv);
    if (e && e.message === 'NO_API_KEY') {
      if (statusEl) statusEl.innerHTML = '<span style="color:var(--danger)">❌ API 키를 설정해주세요 (설정 또는 상단 🔑)</span>';
      if (typeof showToast === 'function') showToast('⚠️ API 키를 설정해주세요');
    } else {
      if (statusEl) statusEl.innerHTML = '<span style="color:var(--danger)">❌ 이미지 생성 실패 — ' + (e && e.message || '') + '</span>';
    }
  }

  clearInterval(iv);
  if (progressBar) progressBar.style.width = '100%';
  if (progressPct) progressPct.textContent = '100%';

  if (dataURL) {
    const img = new Image();
    img.onload = () => {
      _currentCropImg = img;
      _origImageDataURL = dataURL;
      _finalCroppedDataURL = dataURL;
      _cropSelection = { x: 0, y: 0, w: img.naturalWidth || img.width, h: img.naturalHeight || img.height };
      const row = document.getElementById('img-upload-paste-row');
      const dropZone = document.getElementById('img-drop-zone');
      const cropArea = document.getElementById('crop-area');
      if (row) row.style.display = 'none';
      if (dropZone) dropZone.style.display = 'none';
      if (cropArea) cropArea.style.display = 'block';
      const wrap = document.getElementById('crop-result-wrap');
      const origPrev = document.getElementById('orig-preview-img');
      const curPrev = document.getElementById('crop-result-img');
      if (origPrev) { origPrev.src = dataURL; }
      if (curPrev) { curPrev.src = dataURL; }
      if (wrap) { wrap.style.display = 'block'; }
      drawCropCanvas();
      if (statusEl) statusEl.innerHTML = '✅ AI 이미지 생성 완료! 크롭 후 삽입하세요.';
      if (typeof imgBankAdd === 'function') { try { imgBankAdd({ dataURL: dataURL, name: 'crop_ai_' + Date.now(), prompt: prompt }); } catch (e) {} }
    };
    img.src = dataURL;
  } else {
    const errDetail = (typeof window !== 'undefined' && window._lastGenerateImageError) ? String(window._lastGenerateImageError) : '';
    if (statusEl) statusEl.innerHTML = '<span style="color:var(--danger)">❌ 이미지 생성 실패' + (errDetail ? ': ' + errDetail : ' — API 키 확인 또는 다른 프롬프트를 시도해보세요') + '</span>';
  }
  if (genBtn) genBtn.disabled = false;
}

// ── 슬라이드 AI 이미지 생성: 공통 도구(이미지 업로드 & 편집 모달)로 통합 ──
function openAiImageWindow(idx) {
  const i = (idx !== undefined) ? idx : activeSlideIndex;
  const slide = slides[i];
  if (!slide) { showToast('\u26a0\ufe0f \uc2ac\ub77c\uc774\ub4dc\ub97c \uc120\ud0dd\ud558\uc138\uc694'); return; }
  openImageModal(i, { prefillPrompt: true });
  return;
  // 아래는 새창 방식(폴백용) — 통합 도구 사용으로 대체됨
  const defaultPrompt = slide.visPrompt || ('Academic visual for: ' + slide.title);
  const w = window.open('', '_blank', 'width=680,height=580,resizable=yes,scrollbars=yes');
  if (!w) { showToast('\u26a0\ufe0f \ud31d\uc5c5 \ucc28\ub2e8\ub428 \u2014 \ud31d\uc5c5\uc744 \ud5c8\uc6a9\ud574\uc8fc\uc138\uc694'); return; }
  if (typeof registerChildWindow === 'function') registerChildWindow(w);
  let apiKey = '';
  try { apiKey = getApiKey(); } catch (e) { }
  const esc = s => s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>AI \uc774\ubbf8\uc9c0 \uc0dd\uc131</title>
<style>
body{margin:0;padding:16px;background:#0c0e13;color:#e8ecf4;font-family:sans-serif;font-size:13px}
h3{font-size:15px;margin:0 0 12px;color:#4f8ef7}
textarea{width:100%;background:#13161d;border:1px solid #252a37;color:#e8ecf4;padding:10px;border-radius:8px;font-size:12px;resize:vertical;outline:none;box-sizing:border-box;min-height:90px}
textarea:focus{border-color:#4f8ef7}
.btn{display:inline-flex;padding:8px 16px;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;border:none;margin:3px}
.bp{background:#4f8ef7;color:#fff}.bp:hover{background:#6fa3f9}
.bg{background:#1a1e28;border:1px solid #2e3447;color:#b0bac8}.bg:hover{border-color:#4f8ef7;color:#e8ecf4}
#result{margin-top:12px;text-align:center}
#result img{max-width:100%;border-radius:8px;box-shadow:0 4px 24px rgba(0,0,0,.6);cursor:zoom-in;max-height:260px;object-fit:contain}
.st{color:#b0bac8;font-size:12px;padding:10px;text-align:center}
.acts{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;justify-content:center}
</style></head><body>
<h3>\ud83c\udfa8 AI \uc774\ubbf8\uc9c0 \uc0dd\uc131 \u2014 \uc2ac\ub77c\uc774\ub4dc ${i + 1}: ${escapeHtml(slide.title || '')}</h3>
<label style="font-size:11px;color:#6e7a90;display:block;margin-bottom:4px">\ud504\ub86c\ud504\ud2b8 (\uc601\uc5b4 \uad8c\uc7a5)</label>
<textarea id="pt">${escapeHtml(defaultPrompt)}</textarea>
<div style="margin-top:8px">
  <button class="btn bp" id="gb" onclick="gen()">\ud83c\udfa8 \uc774\ubbf8\uc9c0 \uc0dd\uc131</button>
  <button class="btn bg" onclick="window.close()">\u2715 \ub2eb\uae30</button>
</div>
<div id="result"><div id="st" class="st"></div></div>
<script>
var KEY="${esc(apiKey)}";
var SIDX=${i};
var _url=null;

// Try imagen-4 first, fallback to gemini-flash-image
async function tryGenerate(prompt) {
  // Attempt 1: gemini-2.0-flash-exp (more stable)
  try {
    var r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key='+KEY, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        contents:[{parts:[{text:'Generate a professional academic diagram or illustration: '+prompt}]}],
        generationConfig:{responseModalities:['TEXT','IMAGE']}
      })
    });
    if (r.ok) {
      var d = await r.json();
      var img = d.candidates?.[0]?.content?.parts?.find(function(x){return x.inlineData;});
      if (img) return 'data:'+img.inlineData.mimeType+';base64,'+img.inlineData.data;
    }
  } catch(e) { console.warn('[model1]', e.message); }
  // Attempt 2: gemini-2.5-flash-preview-image-generation
  try {
    var r2 = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-image-generation:generateContent?key='+KEY, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        contents:[{parts:[{text:'Generate a professional academic diagram or illustration: '+prompt}]}],
        generationConfig:{responseModalities:['TEXT','IMAGE']}
      })
    });
    if (r2.ok) {
      var d2 = await r2.json();
      var img2 = d2.candidates?.[0]?.content?.parts?.find(function(x){return x.inlineData;});
      if (img2) return 'data:'+img2.inlineData.mimeType+';base64,'+img2.inlineData.data;
    } else {
      var errBody = await r2.json().catch(function(){return {};});
      throw new Error('HTTP ' + r2.status + (errBody.error?.message ? ': ' + errBody.error.message : ''));
    }
  } catch(e2) { throw e2; }
  throw new Error('\uc774\ubbf8\uc9c0\ub97c \ubc1b\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4');
}

async function gen(){
  var p=document.getElementById('pt').value.trim();
  if(!p){alert('\ud504\ub86c\ud504\ud2b8\ub97c \uc785\ub825\ud558\uc138\uc694');return;}
  if(!KEY){alert('\uba54\uc778 \uc2dc\uc2a4\ud15c\uc5d0\uc11c API \ud0a4\ub97c \uc124\uc815\ud558\uc138\uc694');return;}
  var gb=document.getElementById('gb');
  gb.disabled=true;gb.textContent='\u23f3 \uc0dd\uc131 \uc911...';
  document.getElementById('st').textContent='\uc774\ubbf8\uc9c0 \uc0dd\uc131 \uc911... (\uc2dc\uac04\uc774 \uac78\ub9b4 \uc218 \uc788\uc2b5\ub2c8\ub2e4)';
  try {
    _url = await tryGenerate(p);
    document.getElementById('result').innerHTML='<img src="'+_url+'" onclick="viewFull()"/>'
      +'<div class="acts">'
      +'<button class="btn bp" onclick="apply()">\u2713 \uc2ac\ub77c\uc774\ub4dc\uc5d0 \uc801\uc6a9</button>'
      +'<button class="btn bg" onclick="addToHist()">\uc774\ub825\uc5d0 \uc800\uc7a5</button>'
      +'<button class="btn bg" onclick="dl()">\u2b07 \ub2e4\uc6b4\ub85c\ub4dc</button>'
      +'<button class="btn bg" onclick="viewFull()">\ud83d\udd0d \ud06c\uac8c \ubcf4\uae30</button>'
      +'</div>';
    document.getElementById('st').textContent='';
    addToHist();
  } catch(err){
    document.getElementById('st').innerHTML='<span style="color:#f87171">\u274c \uc624\ub958: '+err.message+'</span>';
  }
  gb.disabled=false;gb.textContent='\ud83c\udfa8 \uc774\ubbf8\uc9c0 \uc0dd\uc131';
}
function addToHist(){
  if(!_url)return;
  if(window.opener&&window.opener.addToAiImgHistory){
    var p=document.getElementById('pt').value.trim();
    window.opener.addToAiImgHistory(p,_url,SIDX);
  }
  if(window.opener&&typeof window.opener.imgBankAdd==='function'){try{window.opener.imgBankAdd({dataURL:_url,name:'popup_'+Date.now()+'_'+SIDX,prompt:document.getElementById('pt')?document.getElementById('pt').value.trim():''});}catch(e){}}
}
function apply(){
  if(!_url)return;
  if(window.opener&&window.opener.applyAiImageFromPopup){
    window.opener.applyAiImageFromPopup(SIDX,_url);
    document.getElementById('st').textContent='\u2705 \uc2ac\ub77c\uc774\ub4dc '+(SIDX+1)+'\uc5d0 \uc801\uc6a9\ub428';
  }
}
function dl(){if(!_url)return;var a=document.createElement('a');a.href=_url;a.download='ai_img_slide'+(SIDX+1)+'_'+Date.now()+'.png';a.click();}
function viewFull(){if(!_url)return;var w=window.open('','_blank');if(w&&window.opener&&typeof window.opener.registerChildWindow==='function')window.opener.registerChildWindow(w);w.document.write('<body style="margin:0;background:#111"><img src="'+_url+'" style="max-width:100vw;max-height:100vh;display:block;margin:auto"></body>');}
<\/script></body></html>`;
  w.document.write(html);
  w.document.close();
}

function applyAiImageFromPopup(slideIdx, dataURL) {
  if (!slides[slideIdx]) return;
  if (typeof pushSlideUndoState === 'function') pushSlideUndoState();
  slides[slideIdx].imageUrl = dataURL;
  applyFullFillImageLayout(slides[slideIdx]);
  renderSlides(); renderThumbs(); renderGallery();
  if (rightTab === 'design') updateDesignPanel();
  showToast('\u2705 \uc2ac\ub77c\uc774\ub4dc ' + (slideIdx + 1) + '\uc5d0 \uc774\ubbf8\uc9c0 \uc801\uc6a9\ub428');
}

// ── PDF new window ────────────────────────────────────────
function openPdfNewWindow() {
  if (!_pdfDoc) { showToast('\u26a0\ufe0f PDF\uac00 \ub85c\ub4dc\ub418\uc9c0 \uc54a\uc558\uc2b5\ub2c8\ub2e4'); return; }
  const w = window.open('', '_blank', 'width=1200,height=900,resizable=yes,scrollbars=yes');
  if (!w) { showToast('\u26a0\ufe0f \ud31d\uc5c5 \ucc28\ub2e8\ub428'); return; }
  if (typeof registerChildWindow === 'function') registerChildWindow(w);
  w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>PDF \ubbf8\ub9ac\ubcf4\uae30</title>'
    + '<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"><\/script>'
    + '<style>body{margin:0;padding:16px;background:#1a1d24;display:flex;flex-direction:column;align-items:center;gap:12px}'
    + 'canvas{box-shadow:0 4px 24px rgba(0,0,0,.5);border-radius:4px;max-width:100%}'
    + 'h3{color:#4f8ef7;font-family:sans-serif;font-size:14px;margin:0 0 8px;align-self:flex-start}'
    + '</style></head><body>'
    + '<h3>\ud83d\udcc4 ' + escapeHtml(fileName) + '</h3>'
    + '<div id="pages"></div>'
    + '<script>'
    + 'pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";'
    + 'var buf = ' + JSON.stringify(Array.from(new Uint8Array(window._pdfArrayBuffer || []))) + ';'
    + 'var data = new Uint8Array(buf);'
    + 'pdfjsLib.getDocument({data:data}).promise.then(function(doc){'
    + '  var pg=document.getElementById("pages");'
    + '  var render=function(n){if(n>doc.numPages)return;'
    + '    doc.getPage(n).then(function(page){'
    + '      var vp=page.getViewport({scale:2.5});'
    + '      var cv=document.createElement("canvas");'
    + '      cv.width=vp.width;cv.height=vp.height;pg.appendChild(cv);'
    + '      page.render({canvasContext:cv.getContext("2d"),viewport:vp}).promise.then(function(){render(n+1);});'
    + '    });'
    + '  };render(1);'
    + '}).catch(function(e){document.body.innerHTML+=\'<p style="color:#f87171">\ub80c\ub354\ub9c1 \uc2e4\ud328: \'+e.message+\'</p>\';});'
    + '<\/script></body></html>');
  w.document.close();
}

// ── Resizable panels ──────────────────────────────────────
let _rsActive = null, _rsStartX = 0, _rsStartW = 0;
function startResize(e, which) {
  _rsActive = which; _rsStartX = e.clientX;
  const el = which === 'lc' ? document.querySelector('.panel-left') : document.getElementById('panel-right');
  _rsStartW = el ? el.offsetWidth : 300;
  document.getElementById('rh-' + which)?.classList.add('active');
  document.addEventListener('mousemove', doResize);
  document.addEventListener('mouseup', stopResize);
  e.preventDefault();
}
function doResize(e) {
  if (!_rsActive) return;
  const dx = e.clientX - _rsStartX;
  if (_rsActive === 'lc') {
    const el = document.querySelector('.panel-left');
    if (el) el.style.width = Math.max(180, Math.min(480, _rsStartW + dx)) + 'px';
  } else {
    const el = document.getElementById('panel-right');
    if (el) el.style.width = Math.max(200, Math.min(520, _rsStartW - dx)) + 'px';
  }
}
function stopResize() {
  if (_rsActive) { document.getElementById('rh-' + _rsActive)?.classList.remove('active'); _rsActive = null; }
  document.removeEventListener('mousemove', doResize);
  document.removeEventListener('mouseup', stopResize);
}

/* =========================================================
   V3.1 — INIT ADDITIONS
   ========================================================= */
// V4.1.1 BOOTSTRAP (DOM ready)
document.addEventListener('DOMContentLoaded', () => {
  try { loadAiImgHistory(); } catch (e) { console.warn(e); }
  try { initApiKey(); } catch (e) { console.warn(e); }
  try { renderLeftPanel(); } catch (e) { console.warn(e); }
  try { if (typeof window.applySlideAspectRatio === 'function') window.applySlideAspectRatio(); } catch (e) { }
  try { renderRefsPanel(); } catch (e) { console.warn(e); }
  try { renderThumbs?.(); } catch (e) { }
  try { renderSlides?.(); } catch (e) { }
  try { updateSlidesCountLabel?.(); } catch (e) { }
  try { updateSlideSyncButton?.(); } catch (e) { }
  try { initMdSplitter(); } catch (e) { }
  try { mdUpdatePageIndicators(); } catch (e) { }
  try { setTimeout(() => updateWhitespaceBadges(), 80); } catch (e) { }
  const extPresentBtn = document.getElementById('ext-present-btn');
  if (extPresentBtn && typeof window.openExternalPresentation === 'function') {
    extPresentBtn.addEventListener('click', function (e) {
      e.preventDefault();
      var w = window.openExternalPresentation();
      if (w) window._extPresWindow = w;
      if (_slideSyncEnabled) setTimeout(function () { sendSlideSyncToExternal(activeSlideIndex); }, 200);
    });
  }
  if (!window.opener && typeof closeAllChildWindows === 'function') {
    window.addEventListener('beforeunload', function () { closeAllChildWindows(); });
  }
});

/* ── Auto-save: check for recovery on startup ── */
(async () => {
  try {
    const snap = await idbGet(IDB_STORE, IDB_KEY);
    if (!snap || (!snap.rawText && !snap.slides?.length)) return;
    const savedDate = new Date(snap.savedAt).toLocaleString('ko-KR');
    const slideCount = snap.slides?.length || 0;
    const imgCount = snap.slides?.filter(s => s.imageUrl).length || 0;
    // Show recovery notification
    const toastEl = document.createElement('div');
    toastEl.style.cssText = `position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:9999;
      background:var(--surface2);border:1px solid var(--accent);border-radius:12px;
      padding:14px 20px;max-width:440px;box-shadow:0 8px 32px rgba(0,0,0,0.4);
      display:flex;flex-direction:column;gap:10px;font-size:12px;color:var(--text)`;
    toastEl.innerHTML = `
      <div style="font-weight:700;font-size:13px;color:var(--accent)">🔄 자동저장된 작업이 있습니다</div>
      <div style="color:var(--text2)">
        <b>${escapeHtml(snap.fileName || snap.projectName || '이름 없음')}</b><br>
        저장 시각: ${savedDate} &nbsp;|&nbsp; 슬라이드 ${slideCount}개 &nbsp;|&nbsp; 이미지 ${imgCount}장
      </div>
      <div style="display:flex;gap:8px">
        <button id="autosave-restore-btn" style="flex:1;padding:7px;border-radius:8px;background:var(--accent);color:#fff;border:none;font-size:12px;font-weight:600;cursor:pointer">🔄 복구하기</button>
        <button id="autosave-dismiss-btn" style="padding:7px 14px;border-radius:8px;background:var(--surface2);border:1px solid var(--border2);color:var(--text2);font-size:12px;cursor:pointer">무시</button>
      </div>`;
    document.body.appendChild(toastEl);
    document.getElementById('autosave-restore-btn').onclick = async () => {
      document.body.removeChild(toastEl);
      await restoreAutosave();
    };
    document.getElementById('autosave-dismiss-btn').onclick = () => {
      document.body.removeChild(toastEl);
    };
    // Auto-dismiss after 15s
    setTimeout(() => { if (document.body.contains(toastEl)) document.body.removeChild(toastEl); }, 15000);
  } catch (e) { console.warn('[startup autosave check]', e); }
})();

/* ── Periodic auto-save every 30s when dirty ── */
setInterval(() => {
  if (_autosaveDirty) autoSaveNow(true);
}, 30000);

/* ── Hook major state changes to trigger dirty mark ── */
// Wrap renderSlides to call _markDirty after slide renders
const _origRenderSlidesFn = window.renderSlides;
if (typeof renderSlides === 'function') {
  const __rs = renderSlides;
  window.renderSlides = function () {
    __rs.apply(this, arguments);
    _markDirty();
  };
}
// Hook renderLeftPanel similarly
const _origRenderLeftPanelFn = window.renderLeftPanel;
if (typeof renderLeftPanel === 'function') {
  const __rlp = renderLeftPanel;
  window.renderLeftPanel = function () {
    __rlp.apply(this, arguments);
    if (rawText || summaryText || slides.length) _markDirty();
  };
}

// =====================================================
// V3.2 FIX — 엔터 입력 시 텍스트 사라짐 문제 해결
// =====================================================

function updateSlideBullet(slideIndex, bulletIndex, value) {
  if (!slides[slideIndex]) return;
  slides[slideIndex].bullets[bulletIndex] = value; // trim 제거
  if (typeof scheduleAutosave === 'function') scheduleAutosave();
}

function hideBulletEditor(slideIndex, bulletIndex, value) {
  if (!slides[slideIndex]) return;
  slides[slideIndex].bullets[bulletIndex] = value; // 빈 줄 삭제 금지
  renderSlides();
}



// =====================================================
// V3.3 FIX — textarea 자동 확장
// =====================================================

function autoResizeTextarea(el) {
  el.style.height = "auto";
  el.style.height = el.scrollHeight + "px";
}

document.addEventListener("input", function (e) {
  if (e.target.classList.contains("bullet-text") ||
    e.target.classList.contains("slide-title-input")) {
    autoResizeTextarea(e.target);
    const wrapper = e.target.closest(".slide-wrapper");
    if (wrapper) wrapper.classList.add("editing");
  }
});



// =====================================================
// V3.4 Enter / Shift+Enter 분리
// =====================================================

document.addEventListener("keydown", function (e) {
  if (!e.target.classList.contains("bullet-text")) return;

  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();

    const textarea = e.target;
    const slideIndex = parseInt(textarea.dataset.slideIndex);
    const bulletIndex = parseInt(textarea.dataset.bulletIndex);

    if (!slides[slideIndex]) return;

    slides[slideIndex].bullets.splice(bulletIndex + 1, 0, "");
    renderSlides();

    setTimeout(() => {
      const next = document.querySelector(
        `.bullet-text[data-slide-index="${slideIndex}"][data-bullet-index="${bulletIndex + 1}"]`
      );
      if (next) next.focus();
    }, 0);
  }
  // Shift+Enter 기본 줄바꿈 유지
});

// 편집창(불릿/MD에디터) Ctrl+B 볼드, Ctrl+I 이탤릭
document.addEventListener("keydown", function (e) {
  const isBullet = e.target.classList && e.target.classList.contains("bullet-text");
  const isMdEditor = e.target.id === "md-editor-ta";
  if (!isBullet && !isMdEditor) return;
  if (!e.ctrlKey) return;
  if (e.key === "b") {
    e.preventDefault();
    if (isMdEditor) pushMdEditorUndoState(e.target);
    wrapSelectionWith(e.target, "**", "**");
  } else if (e.key === "i") {
    e.preventDefault();
    if (isMdEditor) pushMdEditorUndoState(e.target);
    wrapSelectionWith(e.target, "*", "*");
  }
});

// MD 에디터 전용: 실행 취소/다시 실행, 줄 이동·복제·삭제, 타이핑 시 undo push
document.addEventListener("keydown", function (e) {
  if (e.target.id !== "md-editor-ta") return;
  const ta = e.target;

  if (e.ctrlKey && e.key === "z" && !e.shiftKey) {
    e.preventDefault();
    mdEditorUndo(ta);
    return;
  }
  if (e.ctrlKey && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
    e.preventDefault();
    mdEditorRedo(ta);
    return;
  }
  if (e.altKey && e.key === "ArrowUp") {
    e.preventDefault();
    pushMdEditorUndoState(ta);
    mdEditorMoveLineUp(ta);
    return;
  }
  if (e.altKey && e.key === "ArrowDown" && !e.shiftKey) {
    e.preventDefault();
    pushMdEditorUndoState(ta);
    mdEditorMoveLineDown(ta);
    return;
  }
  if (e.altKey && e.shiftKey && e.key === "ArrowDown") {
    e.preventDefault();
    pushMdEditorUndoState(ta);
    mdEditorDupLine(ta);
    return;
  }
  if (e.altKey && e.key.toLowerCase() === "y") {
    e.preventDefault();
    pushMdEditorUndoState(ta);
    mdEditorDeleteLine(ta);
    return;
  }

  // 타이핑/삭제/엔터 시 실행 취소용 상태 저장 (키 적용 직전 상태를 스택에)
  const isTyping = e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey;
  const isDelete = e.key === "Backspace" || e.key === "Delete" || e.key === "Enter";
  if (isTyping || isDelete) pushMdEditorUndoState(ta);
});

// MD 에디터 붙여넣기/잘라내기 전에 실행 취소용 상태 저장 + YouTube URL 자동 변환
document.addEventListener("paste", function (e) {
  if (e.target.id !== "md-editor-ta") return;
  pushMdEditorUndoState(e.target);
  var text = (e.clipboardData && e.clipboardData.getData('text')) || '';
  var normalized = normalizeYoutubeUrl(text);
  if (!normalized) return;
  if (/^youtube:\s*/i.test(normalized)) return;
  var vid = extractYoutubeId(normalized);
  if (!vid) return;
  e.preventDefault();
  var ta = e.target;
  var s = ta.selectionStart, end = ta.selectionEnd;
  var ins = 'youtube:' + normalized;
  ta.setRangeText(ins, s, end, 'end');
  ta.focus();
  if (typeof mdUpdatePreview === 'function') mdUpdatePreview();
}, true);
document.addEventListener("cut", function (e) {
  if (e.target.id === "md-editor-ta") pushMdEditorUndoState(e.target);
}, true);

// =====================================================
// V4.1 DEFAULT RIGHT TAB
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
  try { switchRightTab('design'); } catch (e) { }
});

// =====================================================
// V4.1 MD PREVIEW/APPLY (라이브 적용 제거)
// =====================================================
function mdUpdatePreview() {
  const ta = document.getElementById('md-editor-ta');
  const pv = document.getElementById('md-preview');
  if (!ta || !pv) return;
  pv.textContent = ta.value || '';
}

// ── 현재 페이지(슬라이드) 표시 (MD 에디터 상단/하단 2곳) ─────────
function mdUpdatePageIndicators() {
  const top = document.getElementById('md-page-indicator-top');
  const bot = document.getElementById('md-page-indicator-bottom');
  if (!top && !bot) return;
  const cur = slides?.length ? (activeSlideIndex + 1) : 0;
  const total = slides?.length || 0;
  const txt = `${cur}/${total}`;
  if (top) top.textContent = txt;
  if (bot) bot.textContent = txt;
}
window.mdUpdatePageIndicators = mdUpdatePageIndicators;

// ── 슬라이드 남는 여백(공백) 계산 & 표시 ─────────────────────────
function calcSlideWhitespacePx(i) {
  const inner = document.querySelector(`#sw-${i} .slide-inner`);
  if (!inner) return null;
  const ch = inner.clientHeight || 0;
  const sh = inner.scrollHeight || 0;
  const unused = Math.max(0, ch - sh);
  const overflow = Math.max(0, sh - ch);
  const pct = ch ? Math.round((unused / ch) * 100) : 0;
  return { unused, overflow, pct, ch };
}

function updateWhitespaceBadges() {
  if (!slides || !slides.length) return;
  for (let i = 0; i < slides.length; i++) {
    const badge = document.getElementById(`wsb-${i}`);
    const m = calcSlideWhitespacePx(i);
    if (!badge || !m) continue;
    if (m.overflow > 0) {
      badge.textContent = `넘침 ${m.overflow}px`;
      badge.style.borderColor = 'rgba(248,113,113,0.45)';
      badge.style.background = 'rgba(248,113,113,0.12)';
      badge.style.color = '#b91c1c';
      badge.title = `콘텐츠가 박스 높이를 ${m.overflow}px 초과합니다.`;
    } else {
      badge.textContent = `여백 ${m.pct}%`;
      badge.style.borderColor = 'rgba(251,191,36,0.35)';
      badge.style.background = 'rgba(251,191,36,0.10)';
      badge.style.color = '#b45309';
      badge.title = `남는 여백: 약 ${m.unused}px (약 ${m.pct}%)`;
    }
  }
  const ws = document.getElementById('md-ws-indicator');
  if (ws) {
    const m = calcSlideWhitespacePx(activeSlideIndex);
    if (!m) ws.textContent = '여백 -';
    else if (m.overflow > 0) ws.textContent = `넘침 ${m.overflow}px`;
    else ws.textContent = `여백 ${m.pct}% (${m.unused}px)`;
  }
}
window.updateWhitespaceBadges = updateWhitespaceBadges;

// ── MD 에디터/미리보기 높이 리사이즈(드래그) ────────────────────
function initMdSplitter() {
  const splitter = document.getElementById('md-splitter');
  const ta = document.getElementById('md-editor-ta');
  const wrap = document.getElementById('md-preview-wrap');
  const panel = document.getElementById('mdeditor-panel');
  if (!splitter || !ta || !wrap || !panel) return;

  try {
    const saved = parseInt(localStorage.getItem('md_split_px') || '0', 10);
    if (saved && saved > 80) {
      ta.style.flex = `0 0 ${saved}px`;
      wrap.style.flex = '1 1 auto';
    }
  } catch (e) { }

  let dragging = false;
  splitter.addEventListener('mousedown', (e) => {
    dragging = true;
    e.preventDefault();
  });
  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const panelRect = panel.getBoundingClientRect();
    const taRect = ta.getBoundingClientRect();
    const y = e.clientY;
    let newH = y - taRect.top;
    const maxH = panelRect.height - 260;
    newH = Math.max(140, Math.min(maxH, newH));
    ta.style.flex = `0 0 ${Math.round(newH)}px`;
    wrap.style.flex = '1 1 auto';
    try { localStorage.setItem('md_split_px', String(Math.round(newH))); } catch (err) { }
  });
  document.addEventListener('mouseup', () => { dragging = false; });
}

// 기존 mdLiveApply를 '미리보기 업데이트'로 전환
(function () {
  try {
    const _old = window.mdLiveApply;
    window.mdLiveApply = function () { mdUpdatePreview(); };
  } catch (e) { }
})();

// 탭 전환/로드 시 미리보기 동기화
(function () {
  const _orig = window.mdLoadFromSlide;
  if (typeof _orig === 'function') {
    window.mdLoadFromSlide = function () {
      _orig();
      mdUpdatePreview();
      try { mdUpdatePageIndicators(); } catch (e) { }
      try { setTimeout(() => updateWhitespaceBadges(), 60); } catch (e) { }
    };
  }
})();

// =====================================================
// V4.1 APPLY HOOK
// =====================================================
(function () {
  const _orig = window.mdApplyToSlide;
  if (typeof _orig === 'function') {
    window.mdApplyToSlide = function () {
      _orig();
      mdUpdatePreview();
    };
  }
})();

/* ===== V3 Feature Patch ===== */

// Slide Indicator
function updateMdSlideIndicator() {
  if (!window.slides) return;
  let cur = (window.activeSlideIndex || 0) + 1;
  let total = window.slides.length || 0;
  let el = document.getElementById("mdSlideIndicator");
  if (!el) {
    const toolbar = document.querySelector(".center-toolbar-title");
    if (toolbar) {
      el = document.createElement("div");
      el.id = "mdSlideIndicator";
      el.className = "md-slide-indicator";
      toolbar.appendChild(el);
    }
  }
  if (el) el.innerText = cur + " / " + total;
}
document.addEventListener("click", updateMdSlideIndicator);

// External Presentation — handled above (openExternalPresentation)

// Background Summary — handled in generateSummary() above

// Zoom Hotkeys: Ctrl+9 = 축소, Ctrl+0 = 확대
document.addEventListener("keydown", function (e) {
  if (!e.ctrlKey) return;
  if (e.key === "9") {
    e.preventDefault();
    changeSlideZoom(-10);
  } else if (e.key === "0") {
    e.preventDefault();
    changeSlideZoom(10);
  }
});

// 슬라이드 메뉴(썸네일) 포커스 시 ← / → : 이전/다음 슬라이드
document.addEventListener("keydown", function (e) {
  if (e.ctrlKey || !slides || !slides.length) return;
  const panel = document.getElementById('pdf-preview-panel');
  if (panel && panel.classList.contains('open')) return;
  const tc = document.getElementById('thumbs-container');
  if (!tc || !tc.contains(document.activeElement)) return;
  if (e.key === "ArrowLeft") {
    e.preventDefault();
    const next = Math.max(0, activeSlideIndex - 1);
    if (next !== activeSlideIndex) selectSlide(next);
  } else if (e.key === "ArrowRight") {
    e.preventDefault();
    const next = Math.min(slides.length - 1, activeSlideIndex + 1);
    if (next !== activeSlideIndex) selectSlide(next);
  }
});

// Ctrl+← / Ctrl+→ : 이전/다음 슬라이드 (포커스 무관)
document.addEventListener("keydown", function (e) {
  if (!e.ctrlKey || !slides || !slides.length) return;
  const panel = document.getElementById('pdf-preview-panel');
  if (panel && panel.classList.contains('open')) return;
  if (e.key === "ArrowLeft") {
    e.preventDefault();
    const next = Math.max(0, activeSlideIndex - 1);
    if (next !== activeSlideIndex) selectSlide(next);
  } else if (e.key === "ArrowRight") {
    e.preventDefault();
    const next = Math.min(slides.length - 1, activeSlideIndex + 1);
    if (next !== activeSlideIndex) selectSlide(next);
  }
});

// 하단 슬라이드바: 마우스 휠로 가로 스크롤
(function () {
  const tc = document.getElementById('thumbs-container');
  const footer = document.getElementById('slide-footer');
  if (!tc || !footer) return;
  footer.addEventListener('wheel', function (e) {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      tc.scrollLeft += e.deltaY;
    }
  }, { passive: false });
})();

// F5 = 처음부터 발표, Shift+F5 = 현재부터 발표
document.addEventListener("keydown", function (e) {
  if (e.key !== "F5") return;
  const presMode = document.getElementById("presentation-mode");
  if (presMode && presMode.classList.contains("show")) return;
  if (document.activeElement && (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA")) return;
  e.preventDefault();
  if (!slides || !slides.length) return;
  if (e.shiftKey) startPresentationFromCurrent();
  else startPresentation();
});

// Simple Crop Hook (if Cropper loaded)
let activeCropper = null;
document.addEventListener("click", function (e) {
  if (e.target.classList.contains("slide-image") && window.Cropper) {
    if (activeCropper) activeCropper.destroy();
    activeCropper = new Cropper(e.target, { viewMode: 1, autoCropArea: 1 });
  }
});



/* =========================================================
   IMAGE GENERATION — STABLE VERSION (V3.2)
   단일 모델 / role 필수 / 에러 상세 출력
   ========================================================= */
async function generateImageFromPrompt(prompt) {
  try {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API 키가 설정되지 않았습니다.");

    showToast("🖼 이미지 생성 요청 중...");

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=" + apiKey,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"]
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("IMAGE ERROR:", response.status, errorText);
      alert(
        "이미지 생성 실패\n\n" +
        "Status: " + response.status + "\n\n" +
        errorText
      );
      return null;
    }

    const data = await response.json();
    const candidate = data?.candidates?.[0];

    if (!candidate) {
      alert("❌ 응답에 candidates 없음");
      console.error("IMAGE STRUCTURE:", data);
      return null;
    }

    let imageBase64 = null;
    const parts = candidate?.content?.parts || [];

    for (const part of parts) {
      if (part.inlineData?.data) {
        imageBase64 = part.inlineData.data;
        break;
      }
      if (part.image?.inlineData?.data) {
        imageBase64 = part.image.inlineData.data;
        break;
      }
    }

    if (!imageBase64) {
      alert("❌ 이미지 데이터 추출 실패\n\n콘솔을 확인하세요.");
      console.error("IMAGE STRUCTURE:", data);
      return null;
    }

    const imageUrl = "data:image/png;base64," + imageBase64;

    showToast("✅ 이미지 생성 완료");
    return imageUrl;

  } catch (err) {
    console.error("IMAGE EXCEPTION:", err);
    alert("❌ 이미지 생성 중 예외 발생\n\n" + err.message);
    return null;
  }
}


// =====================================================
// mdpro 연동 — postMessage 수신 v2
// 수신 즉시 ready 응답 → mdpro가 텍스트 재전송 → 자동 로드
// =====================================================
(function () {
  function _handleMdproText(text) {
    try {
      // 왼쪽 패널 텍스트 붙여넣기 영역에 주입
      const ta = document.getElementById('text-paste-input');
      if (ta) {
        ta.value = text;
        ta.dispatchEvent(new Event('input', { bubbles: true }));
      }
      // 텍스트 로드 함수 실행 (setTimeout 0으로 DOM 준비 보장)
      setTimeout(() => {
        if (typeof loadFromTextInput === 'function') {
          loadFromTextInput();
        }
      }, 0);
    } catch (err) {
      console.warn('[mdpro] 텍스트 처리 오류:', err);
    }
  }

  window.addEventListener('message', (e) => {
    try {
      if (!e.data || typeof e.data !== 'object') return;

      // mdpro 텍스트 수신
      if (e.data.type === 'mdpro_text') {
        const text = e.data.text;
        if (!text || typeof text !== 'string') return;
        _handleMdproText(text);
        // 처리 완료 응답 (mdpro 추가 재시도 중단용)
        try { e.source && e.source.postMessage({ type: 'mdpro_ack' }, '*'); } catch (ex) { }
        return;
      }
    } catch (err) {
      console.warn('[mdpro postMessage] 오류:', err);
    }
  });

  // 페이지 로드 완료 시 opener(mdpro)에게 ready 신호 전송
  // → mdpro가 ready 신호를 받으면 즉시 텍스트 전송
  window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      try {
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage({ type: 'mdpro_ready' }, '*');
        }
      } catch (e) { }
    }, 200);
  });
})();

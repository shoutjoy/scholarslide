// =========================================================
// helpers.js — UI 공통 (confirm, ask-then, progress, toast, tabs)
// (index.js 리사이즈 Phase 1.3, 1.4)
// =========================================================

/* =========================================================
   CONFIRM DIALOG — for all AI operations (req. 5, 6)
   ========================================================= */
function showConfirm(title, msg, okFn) {
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-msg').textContent = msg;
  const okBtn = document.getElementById('confirm-ok-btn');
  okBtn.onclick = () => { closeModal('confirm-modal'); okFn(); };
  openModal('confirm-modal');
}

/* =========================================================
   ASK-THEN WRAPPERS (req. 5, 6)
   ========================================================= */
function askThenSummary(type) {
  if (!(typeof window.getRawText === 'function' ? window.getRawText() : rawText)) { showToast('⚠️ 먼저 텍스트를 로드하세요'); return; }
  if (type === 'full') {
    const label = '전체 요약 생성';
    showConfirm(label + ' 실행', `AI를 사용하여 ${label}을 실행하시겠습니까?\n시간이 다소 걸릴 수 있습니다.`, () => generateSummary(type));
    return;
  }
  const isAllSlide = type === 'slides_auto';
  const label = isAllSlide ? 'All Slide생성' : '슬라이드 생성';
  const slideRatio = (typeof localStorage !== 'undefined' && localStorage.getItem('ss_slide_aspect_ratio')) || '16:9';
  const imageRatio = (typeof localStorage !== 'undefined' && localStorage.getItem('ss_image_aspect_ratio')) || '1:1';
  const lastUseSummary = (typeof localStorage !== 'undefined' && localStorage.getItem('ss_slide_gen_use_summary') === '1');
  const slideGenType = (document.getElementById('slide-gen-type') && document.getElementById('slide-gen-type').value) || (typeof localStorage !== 'undefined' && localStorage.getItem('ss_slide_gen_type')) || 'precision';
  const customPromptVal = (document.getElementById('custom-instruction-manuscript') && document.getElementById('custom-instruction-manuscript').value) || (typeof localStorage !== 'undefined' && localStorage.getItem('ss_custom_instruction_manuscript')) || '';
  const writingStyleVal = (document.getElementById('writing-style-val') && document.getElementById('writing-style-val').value) || (typeof window.getWritingStyle === 'function' ? window.getWritingStyle() : 'academic-da');
  const writingStyleHtml = '<div><label class="label" style="font-size:12px;display:block;margin-bottom:6px">문체 설정</label>'
    + '<select id="slide-gen-modal-writing-style" class="control" style="font-size:12px;width:100%;padding:8px 10px">'
    + '<option value="academic-da"' + (writingStyleVal === 'academic-da' ? ' selected' : '') + '>학술체 (~이다)</option>'
    + '<option value="academic-im"' + (writingStyleVal === 'academic-im' ? ' selected' : '') + '>학술체 (~임, ~함)</option>'
    + '<option value="polite"' + (writingStyleVal === 'polite' ? ' selected' : '') + '>일반체 (존댓말)</option></select></div>';
  let old = document.getElementById('slide-gen-confirm-modal');
  if (old) old.remove();
  const m = document.createElement('div');
  m.id = 'slide-gen-confirm-modal';
  m.className = 'modal-backdrop open';
  m.onclick = function (e) { if (e.target === m) m.remove(); };
  const sourceSummaryActive = lastUseSummary ? ' active' : '';
  const sourceRawActive = lastUseSummary ? '' : ' active';
  const sourceHintText = lastUseSummary ? '요약된 내용을 기준으로 슬라이드를 생성합니다. (요약이 없으면 먼저 요약을 생성하세요.)' : '원문 텍스트를 기준으로 슬라이드를 생성합니다.';
  const slideGenTypeOptions = [
    { v: 'precision', l: 'A. 정밀 요약형 (Precision Archive)' },
    { v: 'presentation', l: 'B. 발표 최적화형 (Presentation Focus)' },
    { v: 'notebook', l: 'C. 노트북/학습형 (Concept Mastery)' },
    { v: 'critical', l: 'D. 비판적 검토형 (Critical Analysis)' },
    { v: 'evidence', l: 'E. 시각적 증거형 (Evidence-Based Claims)' },
    { v: 'logic', l: 'F. 인과관계 도식형 (Logic Flow)' },
    { v: 'quiz', l: 'G. 상호작용형 (Interactive Quiz)' },
    { v: 'workshop', l: 'H. 워크숍형 (Practical Action)' },
    { v: 'auto_visual', l: 'I. AII 자동 시각화형 (Auto Visualizer)' }
  ];
  const slideGenTypeSelectHtml = isAllSlide
    ? '<div style="font-size:12px;color:var(--text2);line-height:1.5;padding:8px 10px;background:var(--surface2);border-radius:6px;border:1px solid var(--border)">'
    + '<span style="color:var(--text3)">슬라이드 생성 유형</span><br><strong>I. AII 자동 시각화형 (Auto Visualizer)</strong> — All Slide 전용 고정'
    + '</div>'
    : '<div><label class="label" style="font-size:12px;display:block;margin-bottom:6px">슬라이드 생성 유형</label>'
    + '<select id="slide-gen-modal-type" class="control" style="font-size:12px;width:100%;padding:8px 10px">'
    + slideGenTypeOptions.map(function (o) { return '<option value="' + o.v + '"' + (slideGenType === o.v ? ' selected' : '') + '>' + o.l + '</option>'; }).join('')
    + '</select></div>';
  const escVal = function (s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  const customPromptHtml = '<div><label class="label" style="font-size:12px;display:block;margin-bottom:6px">커스텀 프롬프트</label>'
    + '<textarea id="slide-gen-modal-custom" class="control" rows="2" placeholder="예: 통계 방법론 집중, 영어로 출력..." style="width:100%;resize:vertical;min-height:3em;font-size:12px">' + escVal(customPromptVal) + '</textarea></div>';
  const imageRatioHtml = isAllSlide
    ? '<div style="margin-top:12px"><label class="label" style="font-size:12px;display:block;margin-bottom:6px">이미지 생성 비율</label>'
    + '<style>.img-ratio-modal-btn.active{background:var(--primary,#4f8ef7)!important;color:#fff!important;border-color:var(--primary,#4f8ef7)!important;}</style>'
    + '<div style="display:flex;gap:6px;flex-wrap:wrap">'
    + ['1:1','3:4','4:3','9:16','16:9'].map(function(r){ return '<button type="button" class="btn btn-ghost btn-xs img-ratio-modal-btn' + (r===imageRatio?' active':'') + '" data-ratio="'+r+'" style="padding:6px 12px">'+r+'</button>'; }).join('')
    + '</div>'
    + '<p id="slide-gen-modal-img-ratio-label" style="font-size:12px;color:var(--primary,#4f8ef7);margin-top:8px;font-weight:600">선택됨: ' + imageRatio + '</p></div>'
    : '';
  m.innerHTML = '<div class="modal-box" onclick="event.stopPropagation()" style="max-width:420px">'
    + '<div class="modal-header"><div class="modal-title">' + label + ' 실행</div><button class="modal-close" onclick="document.getElementById(\'slide-gen-confirm-modal\').remove()">&#x2715;</button></div>'
    + '<div class="modal-body" style="display:flex;flex-direction:column;gap:12px">'
    + '<p style="font-size:13px;color:var(--text2);line-height:1.6">AI를 사용하여 ' + label + '을 실행하시겠습니까? 시간이 다소 걸릴 수 있습니다.</p>'
    + '<div><label class="label" style="font-size:12px;display:block;margin-bottom:6px">생성 소스</label>'
    + '<style>.slide-gen-source-btn.active{background:var(--primary,#4f8ef7)!important;color:#fff!important;border-color:var(--primary,#4f8ef7)!important;}</style>'
    + '<div style="display:flex;gap:8px;flex-wrap:wrap">'
    + '<button type="button" class="btn btn-ghost btn-sm slide-gen-source-btn' + sourceRawActive + '" data-source="raw" style="padding:6px 12px;font-size:12px">원문으로 생성</button>'
    + '<button type="button" class="btn btn-ghost btn-sm slide-gen-source-btn' + sourceSummaryActive + '" data-source="summary" style="padding:6px 12px;font-size:12px">요약자료로 생성</button>'
    + '</div><p id="slide-gen-source-hint" style="font-size:11px;color:var(--text3);margin-top:4px">' + sourceHintText + '</p></div>'
    + '<div><label class="label" style="font-size:12px;display:block;margin-bottom:6px">슬라이드 비율</label>'
    + '<select id="slide-gen-modal-ratio" class="control" style="font-size:12px;width:100%;padding:8px 10px">'
    + '<option value="16:9"' + (slideRatio==='16:9'?' selected':'') + '>16:9</option>'
    + '<option value="4:3"' + (slideRatio==='4:3'?' selected':'') + '>4:3</option>'
    + '<option value="a4_landscape"' + (slideRatio==='a4_landscape'?' selected':'') + '>A4 가로</option>'
    + '<option value="3:4"' + (slideRatio==='3:4'?' selected':'') + '>3:4</option>'
    + '<option value="9:16"' + (slideRatio==='9:16'?' selected':'') + '>9:16</option>'
    + '<option value="a4_portrait"' + (slideRatio==='a4_portrait'?' selected':'') + '>A4 세로</option>'
    + '<option value="1:1"' + (slideRatio==='1:1'?' selected':'') + '>1:1</option>'
    + '</select></div>'
    + slideGenTypeSelectHtml
    + writingStyleHtml
    + customPromptHtml
    + imageRatioHtml
    + '</div>'
    + '<div class="modal-footer" style="justify-content:flex-end;gap:8px">'
    + '<button class="btn btn-ghost btn-sm" onclick="document.getElementById(\'slide-gen-confirm-modal\').remove()">취소</button>'
    + '<button class="btn btn-primary btn-sm" id="slide-gen-modal-exec">&#x2713; 실행</button>'
    + '</div></div>';
  document.body.appendChild(m);
  m.querySelectorAll('.slide-gen-source-btn').forEach(function (btn) {
    btn.onclick = function () {
      m.querySelectorAll('.slide-gen-source-btn').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      var hint = m.querySelector('#slide-gen-source-hint');
      if (hint) hint.textContent = btn.getAttribute('data-source') === 'summary' ? '요약된 내용을 기준으로 슬라이드를 생성합니다. (요약이 없으면 먼저 요약을 생성하세요.)' : '원문 텍스트를 기준으로 슬라이드를 생성합니다.';
    };
  });
  if (isAllSlide) {
    var updateImgRatioLabel = function (ratio) {
      var lbl = m.querySelector('#slide-gen-modal-img-ratio-label');
      if (lbl) lbl.textContent = '선택됨: ' + ratio;
    };
    m.querySelectorAll('.img-ratio-modal-btn').forEach(function(btn){
      btn.onclick = function(){
        var r = btn.getAttribute('data-ratio') || '1:1';
        m.querySelectorAll('.img-ratio-modal-btn').forEach(function(b){ b.classList.remove('active'); });
        btn.classList.add('active');
        updateImgRatioLabel(r);
        if (typeof showToast === 'function') showToast('이미지 비율 ' + r + ' 적용됨');
      };
    });
  }
  document.getElementById('slide-gen-modal-exec').onclick = function(){
    const ratioSel = document.getElementById('slide-gen-modal-ratio');
    const slideVal = ratioSel ? ratioSel.value : '16:9';
    const typeSel = document.getElementById('slide-gen-modal-type');
    const slideTypeVal = isAllSlide ? 'auto_visual' : ((typeSel && typeSel.value) || 'precision');
    const customTa = document.getElementById('slide-gen-modal-custom');
    const customVal = (customTa && customTa.value) ? customTa.value.trim() : '';
    const writingStyleSel = document.getElementById('slide-gen-modal-writing-style');
    const writingStyleModalVal = (writingStyleSel && writingStyleSel.value) || 'academic-da';
    if (typeof window.setWritingStyle === 'function') window.setWritingStyle(writingStyleModalVal);
    var elWriting = document.getElementById('writing-style-val');
    if (elWriting) elWriting.value = writingStyleModalVal;
    const sourceBtn = m.querySelector('.slide-gen-source-btn.active');
    const useSummary = sourceBtn && sourceBtn.getAttribute('data-source') === 'summary';
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('ss_slide_aspect_ratio', slideVal);
      localStorage.setItem('ss_slide_gen_use_summary', useSummary ? '1' : '0');
      if (!isAllSlide) localStorage.setItem('ss_slide_gen_type', slideTypeVal);
      localStorage.setItem('ss_custom_instruction_manuscript', customVal);
      if (isAllSlide) {
        const imgBtn = m.querySelector('.img-ratio-modal-btn.active');
        const imgVal = imgBtn ? (imgBtn.getAttribute('data-ratio') || '1:1') : '1:1';
        localStorage.setItem('ss_image_aspect_ratio', imgVal);
      }
    }
    var elMan = document.getElementById('custom-instruction-manuscript');
    if (elMan) elMan.value = customVal;
    var elType = document.getElementById('slide-gen-type');
    if (elType && !isAllSlide) elType.value = slideTypeVal;
    if (typeof window.applySlideAspectRatio === 'function') window.applySlideAspectRatio();
    m.remove();
    generateSummary(type, { useSummaryForSlides: useSummary, customInstruction: customVal, slideGenType: slideTypeVal, writingStyle: writingStyleModalVal });
  };
}
function askThenFetchSources() {
  const query = document.getElementById('source-search-input')?.value?.trim();
  if (!query && !(typeof window.getRawText === 'function' ? window.getRawText() : rawText)) { showToast('⚠️ 검색어를 입력하세요'); switchRightTab('sources'); return; }
  if (!query) { showToast('⚠️ 출처 검색창에 검색어를 입력하세요'); switchRightTab('sources'); return; }
  showConfirm('출처 검색 실행', `"${query}" 에 대한 학술 출처를 AI로 검색하시겠습니까?`, () => fetchSources());
}
function askThenUpSlideGenerate() {
  var text = typeof window._slideManuscriptText === 'string' ? window._slideManuscriptText : '';
  if (!String(text).trim()) { showToast('⚠️ 먼저 SLIDE 원고를 업로드하세요'); return; }
  showConfirm('UP Slide 생성', '업로드한 슬라이드 원고만 사용해 슬라이드를 생성합니다. API 호출이 여러 번 이어질 수 있습니다. 진행할까요?', function () {
    var maxEl = document.getElementById('up-slide-max-pages');
    var maxP = maxEl && maxEl.value ? parseInt(maxEl.value, 10) : 0;
    if (typeof window.generateSlidesFromUploadedManuscript === 'function') {
      window.generateSlidesFromUploadedManuscript({ maxManuscriptPages: maxP > 0 ? maxP : null });
    }
  });
}
function askThenGenerateScript() {
  if (!slides.length) { showToast('⚠️ 슬라이드가 없습니다'); return; }
  var old = document.getElementById('script-gen-confirm-modal');
  if (old) old.remove();
  var savedMemo = (typeof localStorage !== 'undefined' && localStorage.getItem('ss_manuscript_script_memo')) || '';
  var inlineRg = document.getElementById('script-slide-range-val');
  var savedRange = (inlineRg && inlineRg.value && String(inlineRg.value).trim())
    ? String(inlineRg.value).trim()
    : ((typeof localStorage !== 'undefined' && localStorage.getItem('ss_script_gen_slide_range')) || '');
  var n = slides.length;
  var defaultRangeHint = n ? ('1-' + n + ' (비우면 전체)') : '';
  var m = document.createElement('div');
  m.id = 'script-gen-confirm-modal';
  m.className = 'modal-backdrop open';
  m.onclick = function (e) { if (e.target === m) m.remove(); };
  m.innerHTML = '<div class="modal-box" onclick="event.stopPropagation()" style="max-width:420px">'
    + '<div class="modal-header"><div class="modal-title">발표 원고 생성</div><button class="modal-close" onclick="document.getElementById(\'script-gen-confirm-modal\').remove()">&#x2715;</button></div>'
    + '<div class="modal-body" style="display:flex;flex-direction:column;gap:12px">'
    + '<p style="font-size:13px;color:var(--text2);line-height:1.6">현재 ' + n + '개 슬라이드가 있습니다. 범위를 지정하면 해당 슬라이드만 발표 원고를 생성·갱신합니다. 비우면 전체 슬라이드에 대해 생성합니다.</p>'
    + '<div><label class="label" style="font-size:12px;display:block;margin-bottom:6px">슬라이드 범위 (선택)</label>'
    + '<input type="text" class="control" id="script-gen-range-input" placeholder="' + defaultRangeHint + '" style="width:100%;font-size:12px" title="예: 1-10 또는 15 (1번~15번 슬라이드)"/>'
    + '<p style="font-size:11px;color:var(--text3);margin-top:4px">기본값은 전체입니다. 숫자만 입력 시 1번부터 해당 번호까지입니다.</p></div>'
    + '<div><label class="label" style="font-size:12px;display:block;margin-bottom:6px">메모 또는 추가 지시사항</label>'
    + '<textarea class="control" id="script-gen-memo-input" rows="3" placeholder="메모 또는 추가 지시사항..." style="width:100%;resize:vertical;min-height:3.5em"></textarea></div>'
    + '</div>'
    + '<div class="modal-footer" style="justify-content:flex-end;gap:8px">'
    + '<button class="btn btn-ghost btn-sm" onclick="document.getElementById(\'script-gen-confirm-modal\').remove()">취소</button>'
    + '<button class="btn btn-primary btn-sm" id="script-gen-modal-exec">&#x2713; 실행</button>'
    + '</div></div>';
  document.body.appendChild(m);
  var ta = m.querySelector('#script-gen-memo-input');
  var rangeInp = m.querySelector('#script-gen-range-input');
  if (ta) ta.value = savedMemo;
  if (rangeInp) rangeInp.value = savedRange;
  document.getElementById('script-gen-modal-exec').onclick = function () {
    var memo = (ta && ta.value) ? ta.value.trim() : '';
    var rangeVal = (rangeInp && rangeInp.value) ? rangeInp.value.trim() : '';
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('ss_manuscript_script_memo', memo);
        localStorage.setItem('ss_script_gen_slide_range', rangeVal);
      }
    } catch (e) {}
    var inlineRg2 = document.getElementById('script-slide-range-val');
    if (inlineRg2) inlineRg2.value = rangeVal;
    m.remove();
    generatePresentationScript(memo, { slideRange: rangeVal });
  };
}
function askThenGenerateImages() { askThenVisualizeAll(); }
function askThenRewrite(index) {
  showConfirm(`슬라이드 ${index + 1} AI 재작성`, '이 슬라이드를 AI로 재작성하시겠습니까?', () => aiRewriteSlide(index));
}

/* =========================================================
   UI HELPERS — 전역 진행률 (다중 작업), 로딩, 토스트, 탭
   ========================================================= */
let _globalProgressTimer = null;
/** 작업별 진행 상태. id -> { label, pct, icon, onCancel? } */
let _globalProgressJobs = {};

function renderGlobalProgress() {
  const bar = document.getElementById('global-progress-bar');
  const jobsEl = document.getElementById('global-progress-jobs');
  if (!bar || !jobsEl) return;
  const ids = Object.keys(_globalProgressJobs);
  if (ids.length === 0) {
    bar.style.display = 'none';
    jobsEl.innerHTML = '';
    var abortBtn0 = document.getElementById('global-progress-abort-btn');
    if (abortBtn0) abortBtn0.style.display = 'none';
    return;
  }
  bar.style.display = 'flex';
  const escapeHtml = function (s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  jobsEl.innerHTML = ids.map(function (id) {
    const j = _globalProgressJobs[id];
    const pct = Math.min(100, Math.round(j.pct));
    const safeId = id.replace(/["'<>]/g, '');
    return '<div class="global-progress-row" data-job-id="' + safeId + '">' +
      '<span class="global-progress-icon">' + (j.icon || '⏳') + '</span>' +
      '<div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:4px">' +
      '<span class="global-progress-label">' + escapeHtml(j.label) + '</span>' +
      '<div style="width:100%;height:8px;background:var(--border2);border-radius:4px;overflow:hidden">' +
      '<div class="global-progress-fill" style="width:' + pct + '%"></div></div></div>' +
      '<span class="global-progress-pct">' + pct + '%</span>' +
      (typeof j.onCancel === 'function'
        ? '<button type="button" class="global-progress-stop-btn" title="이 작업만 중지" onclick="cancelGlobalProgressJobRow(\'' + safeId + '\')">중지</button>'
        : '') +
      '</div>';
  }).join('');
}

/** 행의 「중지」: onCancel 호출 (원문 AI 정리 등) */
function cancelGlobalProgressJobRow(jobId) {
  if (!jobId) return;
  var j = _globalProgressJobs[jobId];
  if (j && typeof j.onCancel === 'function') {
    try { j.onCancel(); } catch (e) { console.warn(e); }
  }
}

/** 진행 중인 Gemini fetch만 끊기 (UI 전체 초기화 없음) */
function requestAbortInFlightAiFetch() {
  if (typeof window !== 'undefined') window._aiTaskCancelled = true;
  try {
    if (typeof _abortController !== 'undefined' && _abortController) _abortController.abort();
  } catch (e) { /* noop */ }
}

/** 작업 ID별 진행 표시 (요약/번역 등 동시에 여러 개 표시). onCancel: 행 「중지」 버튼 */
function showJobProgress(id, label, pct, icon, onCancel) {
  var prev = _globalProgressJobs[id];
  _globalProgressJobs[id] = {
    label: label || '처리 중...',
    pct: pct == null ? 0 : pct,
    icon: icon || '⏳',
    onCancel: typeof onCancel === 'function' ? onCancel : (prev && typeof prev.onCancel === 'function' ? prev.onCancel : null)
  };
  var abortBtn1 = document.getElementById('global-progress-abort-btn');
  if (abortBtn1) abortBtn1.style.display = 'inline-block';
  renderGlobalProgress();
}

function updateJobProgress(id, pct, label) {
  if (!_globalProgressJobs[id]) return;
  _globalProgressJobs[id].pct = pct != null ? pct : _globalProgressJobs[id].pct;
  if (label != null) _globalProgressJobs[id].label = label;
  const row = document.querySelector('.global-progress-row[data-job-id="' + id.replace(/["'<>]/g, '') + '"]');
  if (row) {
    const fill = row.querySelector('.global-progress-fill');
    const pctEl = row.querySelector('.global-progress-pct');
    const lbl = row.querySelector('.global-progress-label');
    var p = Math.min(100, Math.round(_globalProgressJobs[id].pct));
    if (fill) fill.style.width = p + '%';
    if (pctEl) pctEl.textContent = p + '%';
    if (lbl && label != null) lbl.textContent = label;
  } else {
    renderGlobalProgress();
  }
}

function hideJobProgress(id, delay) {
  if (delay == null || delay > 0) {
    setTimeout(function () {
      delete _globalProgressJobs[id];
      renderGlobalProgress();
    }, delay || 0);
  } else {
    delete _globalProgressJobs[id];
    renderGlobalProgress();
  }
}

function showGlobalProgress(label, pct, icon) {
  showJobProgress('default', label, pct, icon);
}

function updateGlobalProgress(pct, label) {
  updateJobProgress('default', pct, label);
}

function hideGlobalProgress(delay) {
  if (_globalProgressTimer) clearTimeout(_globalProgressTimer);
  _globalProgressTimer = setTimeout(function () {
    hideJobProgress('default', 0);
  }, delay == null ? 1200 : delay);
}

if (typeof window !== 'undefined') {
  window.showJobProgress = showJobProgress;
  window.updateJobProgress = updateJobProgress;
  window.hideJobProgress = hideJobProgress;
  window.cancelGlobalProgressJobRow = cancelGlobalProgressJobRow;
  window.requestAbortInFlightAiFetch = requestAbortInFlightAiFetch;
}

/** 백그라운드 진행: 전체화면 오버레이 없이 상단 global-progress-bar만 표시 */
function showLoading(msg, sub = '', progress = 30, showAbort = false) {
  var label = sub ? msg + ' — ' + sub : msg;
  showGlobalProgress(label, progress);
  var abortBtn = document.getElementById('global-progress-abort-btn');
  if (abortBtn) abortBtn.style.display = showAbort ? 'inline-block' : 'none';
}
function setProgress(pct) {
  updateGlobalProgress(pct);
}
function hideLoading() {
  var abortBtn = document.getElementById('global-progress-abort-btn');
  if (abortBtn) abortBtn.style.display = 'none';
  hideGlobalProgress(1000);
}
function abortCurrentTask() {
  if (typeof window !== 'undefined') {
    window._aiTaskCancelled = true;
    window._rawReflowStopSource = 'global';
  }
  if (_abortController) _abortController.abort();
  if (typeof window._cancelBgJob === 'function' && window._bgJob && window._bgJob.running) window._cancelBgJob();
  Object.keys(_globalProgressJobs).forEach(function (id) { delete _globalProgressJobs[id]; });
  renderGlobalProgress();
  hideLoading();
  showToast('⏹ AI 작업 중단됨');
}

/** 작업 완료 알림: header-current-filename 우측에 빨간딱지로 표시. 클릭 시 확인(색 제거) */
function showJobCompleteBadge(label) {
  var el = document.getElementById('job-complete-badge');
  if (!el) return;
  el.textContent = (label || '작업 완료') + ' · 확인하세요';
  el.style.display = 'inline-flex';
  el.classList.remove('job-complete-seen');
  el.title = '요청하신 업무를 마무리했습니다. 클릭하면 확인됨';
}
function clearJobCompleteBadge() {
  var el = document.getElementById('job-complete-badge');
  if (!el) return;
  el.style.display = 'none';
}
if (typeof window !== 'undefined') {
  window.showJobCompleteBadge = showJobCompleteBadge;
  window.clearJobCompleteBadge = clearJobCompleteBadge;
}

function showToast(msg, duration = 3200) {
  const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}
function escapeHtml(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
function autoResize(el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }

function switchTab(tab) {
  if (typeof window.setLeftTab === 'function') window.setLeftTab(tab);
  document.querySelectorAll('.panel-left .panel-tab').forEach(el => el.classList.remove('active'));
  const btn = document.getElementById('tab-' + tab); if (btn) btn.classList.add('active');
  renderLeftPanel();
}
function switchRightTab(tab) {
  rightTab = tab;
  document.querySelectorAll('.panel-right .panel-tab').forEach(el => el.classList.remove('active'));
  const activeBtn = document.getElementById('rtab-' + tab); if (activeBtn) activeBtn.classList.add('active');
  ['mdeditor-panel', 'refs-panel', 'design-panel', 'gallery-panel', 'layer-order-panel', 'imgbank-panel'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
  if (tab === 'sources') { switchRightTab('design'); return; }
  if (tab === 'imgbank') { const p = document.getElementById('imgbank-panel'); if (p) { p.style.display = 'flex'; } if (typeof renderImgBankPanel === 'function') renderImgBankPanel(); return; }
  if (tab === 'layerorder') { const p = document.getElementById('layer-order-panel'); if (p) p.style.display = 'flex'; if (typeof updateLayerOrderPanel === 'function') updateLayerOrderPanel(); return; }
  if (tab === 'mdeditor') {
    const panel = document.getElementById('mdeditor-panel');
    if (panel) panel.style.display = 'flex';
    if (typeof mdLoadFromSlide === 'function') mdLoadFromSlide();
    if (typeof mdUpdatePreview === 'function') mdUpdatePreview();
    if (typeof mdUpdatePageIndicators === 'function') mdUpdatePageIndicators();
    try { if (typeof initMdSplitter === 'function') initMdSplitter(); } catch (e) { }
    try { if (typeof updateWhitespaceBadges === 'function') updateWhitespaceBadges(); } catch (e) { }
  } else if (tab === 'refs') { document.getElementById('refs-panel').style.display = 'block'; if (typeof renderRefsPanel === 'function') renderRefsPanel(); }
  else if (tab === 'design') { document.getElementById('design-panel').style.display = 'flex'; if (typeof updateDesignPanel === 'function') updateDesignPanel(); }
  else if (tab === 'gallery') { document.getElementById('gallery-panel').style.display = 'block'; if (typeof renderGallery === 'function') renderGallery(); }
}

/* =========================================================
   CHILD WINDOWS — 앱이 연 새 창을 등록하고, 메인 창 종료 시 모두 닫기 (보안)
   ========================================================= */
let _childWindows = [];
function registerChildWindow(win) {
  if (win && typeof win.close === 'function' && !_childWindows.includes(win)) _childWindows.push(win);
}
function closeAllChildWindows() {
  _childWindows.forEach(function (w) {
    try { if (w && !w.closed && typeof w.close === 'function') w.close(); } catch (e) {}
  });
  _childWindows.length = 0;
}
function getViewerAIDataFromChildWindows() {
  var scholarAI = [];
  var sspImg = [];
  try {
    _childWindows.forEach(function (w) {
      if (!w || w.closed) return;
      try {
        if (w.__scholarAIHistory && Array.isArray(w.__scholarAIHistory) && w.__scholarAIHistory.length) {
          scholarAI.push.apply(scholarAI, w.__scholarAIHistory);
        }
        if (w.__viewerSSPImgHistory && Array.isArray(w.__viewerSSPImgHistory) && w.__viewerSSPImgHistory.length) {
          sspImg.push.apply(sspImg, w.__viewerSSPImgHistory);
        }
      } catch (e) {}
    });
  } catch (e) {}
  return { scholarAIHistory: scholarAI, sspImgHistory: sspImg };
}
if (typeof window !== 'undefined') {
  window.registerChildWindow = registerChildWindow;
  window.closeAllChildWindows = closeAllChildWindows;
  window.getViewerAIDataFromChildWindows = getViewerAIDataFromChildWindows;
}

/* =========================================================
   USER INFO FOR SUMMARY — 설정에서 저장한 사용자 정보 (체크된 항목만)
   ========================================================= */
function getUserInfoForSummary() {
  try {
    var raw = localStorage.getItem('ss_user_info');
    if (!raw) return '';
    var data = JSON.parse(raw);
    var parts = [];
    if (data.checkName && data.name) parts.push(data.name);
    if (data.checkAffiliation && data.affiliation) parts.push(data.affiliation);
    if (data.checkEmail && data.email) parts.push(data.email);
    if (data.checkPhone && data.phone) parts.push(data.phone);
    return parts.length ? parts.join(' | ') : '';
  } catch (e) { return ''; }
}
if (typeof window !== 'undefined') window.getUserInfoForSummary = getUserInfoForSummary;

/* =========================================================
   IMGSAVE URL — 설정에서 저장한 이미지 업로드 사이트 주소
   ========================================================= */
function getImgSaveUrl() {
  try {
    var url = (localStorage.getItem('ss_imgsave_url') || '').trim();
    return url || 'https://imgbb.com/';
  } catch (e) { return 'https://imgbb.com/'; }
}
if (typeof window !== 'undefined') window.getImgSaveUrl = getImgSaveUrl;

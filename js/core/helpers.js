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
  let old = document.getElementById('slide-gen-confirm-modal');
  if (old) old.remove();
  const m = document.createElement('div');
  m.id = 'slide-gen-confirm-modal';
  m.className = 'modal-backdrop open';
  m.onclick = function (e) { if (e.target === m) m.remove(); };
  const imageRatioHtml = isAllSlide
    ? '<div style="margin-top:12px"><label class="label" style="font-size:12px;display:block;margin-bottom:6px">이미지 생성 비율</label>'
    + '<div style="display:flex;gap:6px;flex-wrap:wrap">'
    + ['1:1','3:4','4:3','9:16','16:9'].map(function(r){ return '<button type="button" class="btn btn-ghost btn-xs img-ratio-modal-btn' + (r===imageRatio?' active':'') + '" data-ratio="'+r+'" style="padding:6px 12px">'+r+'</button>'; }).join('')
    + '</div></div>'
    : '';
  m.innerHTML = '<div class="modal-box" onclick="event.stopPropagation()" style="max-width:420px">'
    + '<div class="modal-header"><div class="modal-title">' + label + ' 실행</div><button class="modal-close" onclick="document.getElementById(\'slide-gen-confirm-modal\').remove()">&#x2715;</button></div>'
    + '<div class="modal-body" style="display:flex;flex-direction:column;gap:12px">'
    + '<p style="font-size:13px;color:var(--text2);line-height:1.6">AI를 사용하여 ' + label + '을 실행하시겠습니까? 시간이 다소 걸릴 수 있습니다.</p>'
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
    + imageRatioHtml
    + '</div>'
    + '<div class="modal-footer" style="justify-content:flex-end;gap:8px">'
    + '<button class="btn btn-ghost btn-sm" onclick="document.getElementById(\'slide-gen-confirm-modal\').remove()">취소</button>'
    + '<button class="btn btn-primary btn-sm" id="slide-gen-modal-exec">&#x2713; 실행</button>'
    + '</div></div>';
  document.body.appendChild(m);
  if (isAllSlide) {
    m.querySelectorAll('.img-ratio-modal-btn').forEach(function(btn){
      btn.onclick = function(){ m.querySelectorAll('.img-ratio-modal-btn').forEach(function(b){b.classList.remove('active');}); btn.classList.add('active'); };
    });
  }
  document.getElementById('slide-gen-modal-exec').onclick = function(){
    const ratioSel = document.getElementById('slide-gen-modal-ratio');
    const slideVal = ratioSel ? ratioSel.value : '16:9';
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('ss_slide_aspect_ratio', slideVal);
      if (isAllSlide) {
        const imgBtn = m.querySelector('.img-ratio-modal-btn.active');
        const imgVal = imgBtn ? (imgBtn.getAttribute('data-ratio') || '1:1') : '1:1';
        localStorage.setItem('ss_image_aspect_ratio', imgVal);
      }
    }
    if (typeof window.applySlideAspectRatio === 'function') window.applySlideAspectRatio();
    m.remove();
    generateSummary(type);
  };
}
function askThenFetchSources() {
  const query = document.getElementById('source-search-input')?.value?.trim();
  if (!query && !(typeof window.getRawText === 'function' ? window.getRawText() : rawText)) { showToast('⚠️ 검색어를 입력하세요'); switchRightTab('sources'); return; }
  if (!query) { showToast('⚠️ 출처 검색창에 검색어를 입력하세요'); switchRightTab('sources'); return; }
  showConfirm('출처 검색 실행', `"${query}" 에 대한 학술 출처를 AI로 검색하시겠습니까?`, () => fetchSources());
}
function askThenGenerateScript() {
  if (!slides.length) { showToast('⚠️ 슬라이드가 없습니다'); return; }
  showConfirm('발표 원고 생성', `${slides.length}개 슬라이드의 발표 원고를 생성하시겠습니까?\n슬라이드 수에 따라 시간이 걸릴 수 있습니다.`, () => generatePresentationScript());
}
function askThenGenerateImages() { askThenVisualizeAll(); }
function askThenRewrite(index) {
  showConfirm(`슬라이드 ${index + 1} AI 재작성`, '이 슬라이드를 AI로 재작성하시겠습니까?', () => aiRewriteSlide(index));
}

/* =========================================================
   UI HELPERS — 전역 진행률 (다중 작업), 로딩, 토스트, 탭
   ========================================================= */
let _globalProgressTimer = null;
/** 작업별 진행 상태. id -> { label, pct, icon } */
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
      '</div>';
  }).join('');
}

/** 작업 ID별 진행 표시 (요약/번역 등 동시에 여러 개 표시) */
function showJobProgress(id, label, pct, icon) {
  _globalProgressJobs[id] = { label: label || '처리 중...', pct: pct == null ? 0 : pct, icon: icon || '⏳' };
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
  if (typeof window !== 'undefined') window._aiTaskCancelled = true;
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
  ['mdeditor-panel', 'refs-panel', 'design-panel', 'gallery-panel'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
  if (tab === 'sources') { switchRightTab('design'); return; }
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
if (typeof window !== 'undefined') {
  window.registerChildWindow = registerChildWindow;
  window.closeAllChildWindows = closeAllChildWindows;
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

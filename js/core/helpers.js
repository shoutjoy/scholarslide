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
  const label = type === 'full' ? '전체 요약 생성' : (type === 'slides_auto' ? 'AII Slide생성' : '슬라이드 생성');
  showConfirm(label + ' 실행', `AI를 사용하여 ${label}을 실행하시겠습니까?\n시간이 다소 걸릴 수 있습니다.`, () => generateSummary(type));
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
    return;
  }
  bar.style.display = 'flex';
  const escapeHtml = function (s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  jobsEl.innerHTML = ids.map(function (id) {
    const j = _globalProgressJobs[id];
    const pct = Math.min(100, Math.round(j.pct));
    const safeId = id.replace(/["'<>]/g, '');
    return '<div class="global-progress-row" data-job-id="' + safeId + '" style="display:flex;align-items:center;gap:6px;padding:2px 0">' +
      '<span class="global-progress-icon" style="font-size:12px;flex-shrink:0">' + (j.icon || '⏳') + '</span>' +
      '<span class="global-progress-label" style="font-size:11px;color:var(--accent);font-weight:600;white-space:nowrap;max-width:160px;overflow:hidden;text-overflow:ellipsis">' + escapeHtml(j.label) + '</span>' +
      '<div style="width:56px;height:4px;background:var(--border2);border-radius:2px;flex-shrink:0;overflow:hidden">' +
      '<div class="global-progress-fill" style="height:4px;background:linear-gradient(90deg,var(--accent),var(--accent2));border-radius:2px;width:' + pct + '%;transition:width 0.3s"></div></div>' +
      '<span class="global-progress-pct" style="font-size:10px;color:var(--text3);min-width:24px;text-align:right">' + pct + '%</span>' +
      '</div>';
  }).join('');
}

/** 작업 ID별 진행 표시 (요약/번역 등 동시에 여러 개 표시) */
function showJobProgress(id, label, pct, icon) {
  _globalProgressJobs[id] = { label: label || '처리 중...', pct: pct == null ? 0 : pct, icon: icon || '⏳' };
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
function abortCurrentTask() { if (_abortController) _abortController.abort(); hideLoading(); showToast('⏹ 작업 중단됨'); }

/** 작업 완료 알림: header-current-filename 우측에 빨간딱지로 표시. 클릭 시 확인(색 제거) */
function showJobCompleteBadge(label) {
  var el = document.getElementById('job-complete-badge');
  if (!el) return;
  el.textContent = (label || '작업 완료') + ' · 확인하게';
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
  if (tab === 'mdeditor') { document.getElementById('mdeditor-panel').style.display = 'flex'; mdLoadFromSlide(); }
  else if (tab === 'sources') { switchRightTab('mdeditor'); return; }
  else if (tab === 'refs') { document.getElementById('refs-panel').style.display = 'block'; renderRefsPanel(); }
  else if (tab === 'design') { document.getElementById('design-panel').style.display = 'block'; updateDesignPanel(); }
  else if (tab === 'gallery') { document.getElementById('gallery-panel').style.display = 'block'; renderGallery(); }
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

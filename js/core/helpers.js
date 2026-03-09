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
  if (!rawText) { showToast('⚠️ 먼저 텍스트를 로드하세요'); return; }
  const label = type === 'full' ? '전체 요약 생성' : '슬라이드 생성';
  showConfirm(label + ' 실행', `AI를 사용하여 ${label}을 실행하시겠습니까?\n시간이 다소 걸릴 수 있습니다.`, () => generateSummary(type));
}
function askThenFetchSources() {
  const query = document.getElementById('source-search-input')?.value?.trim();
  if (!query && !rawText) { showToast('⚠️ 검색어를 입력하세요'); switchRightTab('sources'); return; }
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
   UI HELPERS — 전역 진행률, 로딩, 토스트, 탭
   ========================================================= */
let _globalProgressTimer = null;

function showGlobalProgress(label, pct = 0, icon = '⏳') {
  const bar = document.getElementById('global-progress-bar');
  const lbl = document.getElementById('global-progress-label');
  const fill = document.getElementById('global-progress-fill');
  const pctEl = document.getElementById('global-progress-pct');
  const ico = document.getElementById('global-progress-icon');
  if (!bar) return;
  bar.style.display = 'flex';
  if (lbl) lbl.textContent = label;
  if (fill) fill.style.width = pct + '%';
  if (pctEl) pctEl.textContent = pct + '%';
  if (ico) ico.textContent = icon;
}

function updateGlobalProgress(pct, label) {
  const fill = document.getElementById('global-progress-fill');
  const pctEl = document.getElementById('global-progress-pct');
  const lbl = document.getElementById('global-progress-label');
  if (fill) fill.style.width = Math.min(100, pct) + '%';
  if (pctEl) pctEl.textContent = Math.min(100, Math.round(pct)) + '%';
  if (label && lbl) lbl.textContent = label;
}

function hideGlobalProgress(delay = 1200) {
  const bar = document.getElementById('global-progress-bar');
  if (_globalProgressTimer) clearTimeout(_globalProgressTimer);
  _globalProgressTimer = setTimeout(() => {
    if (bar) bar.style.display = 'none';
  }, delay);
}

function showLoading(msg, sub = '', progress = 30, showAbort = false) {
  document.getElementById('loading-overlay').classList.add('show');
  document.getElementById('loading-msg').textContent = msg;
  document.getElementById('loading-sub').textContent = sub;
  document.getElementById('loading-progress').style.width = progress + '%';
  const abortBtn = document.getElementById('loading-abort-btn');
  if (abortBtn) abortBtn.style.display = showAbort ? '' : 'none';
  showGlobalProgress(msg, progress);
}
function setProgress(pct) {
  document.getElementById('loading-progress').style.width = pct + '%';
  updateGlobalProgress(pct);
}
function hideLoading() {
  document.getElementById('loading-overlay').classList.remove('show');
  const abortBtn = document.getElementById('loading-abort-btn');
  if (abortBtn) abortBtn.style.display = 'none';
  hideGlobalProgress(1000);
}
function abortCurrentTask() { if (_abortController) _abortController.abort(); hideLoading(); showToast('⏹ 작업 중단됨'); }
function showToast(msg, duration = 3200) {
  const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}
function escapeHtml(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
function autoResize(el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }

function switchTab(tab) {
  leftTab = tab;
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

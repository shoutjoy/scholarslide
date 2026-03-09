/* =========================================================
   UI PROGRESS / LOADING
   ========================================================= */

/* ── 전역 백그라운드 진행률 표시 (헤더 왼쪽) ────────────────────── */

function showGlobalProgress(label, pct = 0, icon = '⏳') {
    const el = document.getElementById('global-progress-bar');
    const lbl = document.getElementById('global-progress-label');
    const fill = document.getElementById('global-progress-fill');
    const pText = document.getElementById('global-progress-pct');
    const iEl = document.getElementById('global-progress-icon');
    if (!el) return;
    if (_globalProgressTimer) { clearTimeout(_globalProgressTimer); _globalProgressTimer = null; }
    el.style.display = 'flex';
    lbl.textContent = label;
    iEl.textContent = icon;
    fill.style.width = pct + '%';
    pText.textContent = Math.round(pct) + '%';
}

function updateGlobalProgress(pct, label) {
    const fill = document.getElementById('global-progress-fill');
    const pText = document.getElementById('global-progress-pct');
    if (fill) fill.style.width = pct + '%';
    if (pText) pText.textContent = Math.round(pct) + '%';
    if (label) { const lbl = document.getElementById('global-progress-label'); if (lbl) lbl.textContent = label; }
}

function hideGlobalProgress(delay = 1200) {
    const el = document.getElementById('global-progress-bar');
    if (!el) return;
    if (_globalProgressTimer) clearTimeout(_globalProgressTimer);
    _globalProgressTimer = setTimeout(() => { el.style.display = 'none'; }, delay);
}

function showLoading(msg, sub = '', progress = 30, showAbort = false) {
    const overlay = document.getElementById('loading-overlay');
    if (!overlay) return;
    document.getElementById('loading-msg').textContent = msg;
    document.getElementById('loading-sub').textContent = sub;
    document.getElementById('loading-progress').style.width = progress + '%';
    overlay.classList.add('active');
    document.getElementById('loading-abort-btn').style.display = showAbort ? 'inline-block' : 'none';
}

function setProgress(pct) {
    const fill = document.getElementById('loading-progress');
    if (fill) fill.style.width = pct + '%';
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.remove('active');
}

function abortCurrentTask() {
    if (_abortController) { _abortController.abort(); _abortController = null; }
    if (_bgJob.running) { _cancelBgJob(); }
}

function showToast(msg, duration = 3200) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg; toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), duration);
}

// Background image generation job state display helpers
function _bgJobStart(total, label) {
    _bgJob = { running: true, total, done: 0, label };
    _bgJobCancelled = false;
    _bgBarUpdate();
}
function _bgJobTick(done, label) {
    if (!_bgJob.running) return;
    _bgJob.done = done; if (label) _bgJob.label = label;
    _bgBarUpdate();
}
function _bgJobEnd(msg) {
    _bgJob.running = false;
    const bar = document.getElementById('bg-job-bar');
    if (bar) { bar.innerHTML = `<span style="color:var(--accent)">✓</span> ${msg}`; setTimeout(() => { bar.style.display = 'none'; }, 3000); }
}
function _bgBarUpdate() {
    const bar = document.getElementById('bg-job-bar'); if (!bar) return;
    if (!_bgJob.running) { bar.style.display = 'none'; return; }
    bar.style.display = 'flex';
    const pct = _bgJob.total > 0 ? (_bgJob.done / _bgJob.total) * 100 : 0;
    bar.innerHTML = `
    <span class="spinner" style="width:12px;height:12px;border-width:2px;display:inline-block"></span>
    <span style="color:var(--text2)">${_bgJob.label} (${_bgJob.done}/${_bgJob.total})</span>
    <div style="flex:1;height:4px;background:var(--border);border-radius:2px;margin:0 8px;overflow:hidden">
      <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--accent),var(--accent2));transition:width 0.3s"></div>
    </div>
    <span style="color:var(--text3)">${Math.round(pct)}%</span>
    <button class="btn btn-ghost btn-xs" style="color:var(--danger)" onclick="_cancelBgJob()">중단</button>
  `;
}
function _cancelBgJob() {
    _bgJobCancelled = true;
    _bgJobEnd('작업이 중단되었습니다.');
    showToast('⚠️ 백그라운드 작업 취소됨');
}

// =========================================================
// storage.js — IDB·자동저장·프로젝트·로드 모달
// (index.js 리사이즈 Phase 1.5, 1.6)
// =========================================================

const IDB_NAME = 'ScholarSlide_v3';
const IDB_STORE = 'autosave';
const IDB_KEY = 'current_workspace';
const IDB_SNAPSHOTS = 'snapshots';
let _idb = null;
let _autosaveTimer = null;
let _autosaveDirty = false;
let _autosaveLastAt = null;

function openIDB() {
  return new Promise((resolve, reject) => {
    if (_idb) { resolve(_idb); return; }
    const req = indexedDB.open(IDB_NAME, 2);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
      if (!db.objectStoreNames.contains(IDB_SNAPSHOTS)) db.createObjectStore(IDB_SNAPSHOTS);
    };
    req.onsuccess = e => { _idb = e.target.result; resolve(_idb); };
    req.onerror = e => reject(e.target.error);
  });
}

async function idbPut(store, key, value) {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(value, key);
    tx.oncomplete = resolve;
    tx.onerror = e => reject(e.target.error);
  });
}

async function idbGet(store, key) {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e.target.error);
  });
}

async function idbGetAll(store) {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = e => resolve(e.target.result || []);
    req.onerror = e => reject(e.target.error);
  });
}

async function idbGetAllKeys(store) {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAllKeys();
    req.onsuccess = e => resolve(e.target.result || []);
    req.onerror = e => reject(e.target.error);
  });
}

async function idbDelete(store, key) {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(key);
    tx.oncomplete = resolve;
    tx.onerror = e => reject(e.target.error);
  });
}

function buildWorkspaceSnapshot() {
  var slots = (typeof window.getFileSlots === 'function' && window.getFileSlots()) || [];
  var rt = (typeof window.getRawText === 'function' ? window.getRawText() : rawText) || '';
  var fn = (typeof window.getFileName === 'function' ? window.getFileName() : fileName) || '';
  var snap = {
    version: 3,
    savedAt: new Date().toISOString(),
    fileName: fn, rawText: rt, summaryText,
    _translatedSummary: window._translatedSummary, _translatedRaw: window._translatedRaw,
    slideStyle, writingStyle, activeSlideIndex,
    _slideZoom: typeof _slideZoom !== 'undefined' ? _slideZoom : 100,
    _slideFontScale: typeof _slideFontScale !== 'undefined' ? _slideFontScale : 100,
    slides: slides.map(s => ({ ...s })),
    sources, presentationScript,
    references: ReferenceStore.getAll(),
    aiImgHistory: typeof _aiImgHistory !== 'undefined' ? _aiImgHistory : [],
    pdfData: (typeof window !== 'undefined' && window._pdfArrayBuffer && fn && fn.toLowerCase().endsWith('.pdf'))
      ? Array.from(new Uint8Array(window._pdfArrayBuffer)) : undefined,
  };
  if (slots && slots.length) snap.fileSlots = slots;
  return snap;
}

async function autoSaveNow(quiet = false) {
  if (!rawText && !slides.length) return;
  try {
    const snap = buildWorkspaceSnapshot();
    await idbPut(IDB_STORE, IDB_KEY, snap);
    _autosaveLastAt = new Date();
    _autosaveDirty = false;
    updateAutosaveIndicator('saved');
    if (!quiet) showToast('💾 자동저장 완료');
  } catch (e) {
    updateAutosaveIndicator('error');
    console.warn('[autosave]', e);
  }
}

function scheduleAutosave() {
  _autosaveDirty = true;
  updateAutosaveIndicator('pending');
  if (_autosaveTimer) clearTimeout(_autosaveTimer);
  _autosaveTimer = setTimeout(() => autoSaveNow(true), 30000);
}

function updateAutosaveIndicator(state) {
  const el = document.getElementById('autosave-indicator');
  if (!el) return;
  if (state === 'saved') {
    const t = _autosaveLastAt ? _autosaveLastAt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '';
    el.innerHTML = `<span style="color:var(--accent2)">●</span> 저장됨 ${t}`;
    el.title = '자동저장 완료 — IndexedDB';
  } else if (state === 'pending') {
    el.innerHTML = `<span style="color:var(--warning)">●</span> 저장 대기`;
    el.title = '30초 후 자동저장';
  } else if (state === 'error') {
    el.innerHTML = `<span style="color:var(--danger)">●</span> 저장 실패`;
    el.title = '자동저장 실패 — 파일로 내보내기 권장';
  } else {
    el.innerHTML = '';
  }
}

async function restoreAutosave() {
  try {
    const snap = await idbGet(IDB_STORE, IDB_KEY);
    if (!snap) return false;
    applyWorkspaceSnapshot(snap);
    _autosaveLastAt = new Date(snap.savedAt);
    updateAutosaveIndicator('saved');
    showToast(`✅ 자동저장 복구: ${new Date(snap.savedAt).toLocaleString('ko-KR')}`);
    return true;
  } catch (e) {
    console.warn('[restore]', e);
    return false;
  }
}

function applyWorkspaceSnapshot(snap) {
  if (snap.fileSlots && snap.fileSlots.length) {
    if (typeof window.setFileSlots === 'function') window.setFileSlots(snap.fileSlots);
  } else if (snap.rawText) {
    if (typeof window.setFileSlots === 'function') {
      window.setFileSlots([{ id: 'fs_legacy_' + Date.now(), fileName: snap.fileName || '문서', rawText: snap.rawText, checked: true }]);
    } else {
      rawText = snap.rawText || '';
      fileName = snap.fileName || '';
    }
  } else {
    if (typeof window.setFileSlots === 'function') window.setFileSlots([]);
  }
  rawText = (typeof window.getRawText === 'function' ? window.getRawText() : null) || snap.rawText || '';
  fileName = (typeof window.getFileName === 'function' ? window.getFileName() : null) || snap.fileName || '';
  summaryText = snap.summaryText || '';
  window._translatedSummary = snap._translatedSummary || '';
  window._translatedRaw = snap._translatedRaw || '';
  slideStyle = snap.slideStyle || 'light';
  writingStyle = snap.writingStyle || 'academic-da';
  activeSlideIndex = snap.activeSlideIndex || 0;
  slides = snap.slides || [];
  if (typeof slideUndoStack !== 'undefined') slideUndoStack = [];
  if (typeof slideRedoStack !== 'undefined') slideRedoStack = [];
  if (snap._slideZoom != null && typeof window._setSlideZoom === 'function') window._setSlideZoom(snap._slideZoom);
  if (snap._slideFontScale != null && typeof window._setSlideFontScale === 'function') window._setSlideFontScale(snap._slideFontScale);
  sources = snap.sources || [];
  presentationScript = snap.presentationScript || [];
  if (snap.references && snap.references.length) {
    ReferenceStore.clear();
    snap.references.forEach(r => ReferenceStore.add(r));
  }
  if (snap.aiImgHistory && typeof window._setAiImgHistory === 'function') window._setAiImgHistory(snap.aiImgHistory);
  else if (snap.aiImgHistory && typeof _aiImgHistory !== 'undefined') {
    _aiImgHistory = snap.aiImgHistory;
    if (typeof saveAiImgHistory === 'function') saveAiImgHistory();
  }
  if (slides.length && typeof afterSlidesCreated === 'function') afterSlidesCreated();
  if (rawText && typeof enableMainBtns === 'function') enableMainBtns();
  if (typeof applySlideZoom === 'function') applySlideZoom();
  if (typeof applySlideFontScale === 'function') applySlideFontScale();
  if (typeof renderLeftPanel === 'function') renderLeftPanel();
  if (typeof renderRefsPanel === 'function') renderRefsPanel();
  if (typeof window.updateHeaderSlideMode === 'function') window.updateHeaderSlideMode();
  if (typeof window.updateHeaderFileName === 'function') window.updateHeaderFileName();
  if (snap.pdfData && snap.pdfData.length && snap.fileName && snap.fileName.toLowerCase().endsWith('.pdf')) {
    try {
      const arr = new Uint8Array(snap.pdfData);
      window._pdfArrayBuffer = arr.slice(0).buffer;
      if (typeof loadPdfPreview === 'function') loadPdfPreview(arr.slice(0).buffer, snap.fileName);
    } catch (err) { console.warn('[restore PDF]', err); }
  }
}

function _markDirty() { if (rawText || slides.length) scheduleAutosave(); }

/* =========================================================
   PROJECT FILE EXPORT / IMPORT
   ========================================================= */
function openProjectModal() {
  const nameInput = document.getElementById('project-save-name');
  if (nameInput && !nameInput.value) {
    nameInput.value = fileName ? fileName.replace(/\.[^.]+$/, '') : `ScholarSlide_${new Date().toLocaleDateString('ko-KR').replace(/\./g, '-')}`;
  }
  const statusEl = document.getElementById('project-save-status');
  if (statusEl) statusEl.textContent = '';
  openModal('project-modal');
}

async function exportProjectFile() {
  const nameInput = document.getElementById('project-save-name');
  const projectName = nameInput?.value?.trim() || fileName || 'ScholarSlide_Project';
  const statusEl = document.getElementById('project-save-status');
  if (statusEl) statusEl.textContent = '⏳ 파일 생성 중...';
  try {
    const snap = buildWorkspaceSnapshot();
    snap.projectName = projectName;
    const json = JSON.stringify(snap);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = projectName.replace(/[\\/:*?"<>|]/g, '_') + '.ssp';
    a.click();
    URL.revokeObjectURL(url);
    const sizeMB = (blob.size / 1024 / 1024).toFixed(1);
    if (statusEl) statusEl.textContent = `✅ 저장됨 (${sizeMB} MB) — 이미지 ${slides.filter(s => s.imageUrl).length}장 포함`;
    await idbPut(IDB_SNAPSHOTS, 'proj_' + Date.now(), { ...snap, projectName });
    showToast(`📦 "${projectName}.ssp" 파일 저장 완료 (${sizeMB}MB)`);
  } catch (e) {
    if (statusEl) statusEl.textContent = '❌ 실패: ' + e.message;
    showToast('❌ 프로젝트 파일 저장 실패: ' + e.message);
  }
}

async function importProjectFile(e) {
  const file = e.target.files[0]; if (!file) return;
  try {
    showLoading('프로젝트 파일 불러오는 중...', file.name, 30);
    const text = await file.text();
    const snap = JSON.parse(text);
    if (!snap.version || !snap.savedAt) throw new Error('유효하지 않은 프로젝트 파일입니다');
    window._translatedSummary = ''; window._translatedRaw = '';
    applyWorkspaceSnapshot(snap);
    await idbPut(IDB_STORE, IDB_KEY, snap);
    _autosaveLastAt = new Date();
    updateAutosaveIndicator('saved');
    closeModal('load-modal');
    hideLoading();
    const imgCount = snap.slides?.filter(s => s.imageUrl).length || 0;
    showToast(`✅ "${snap.projectName || file.name}" 불러오기 완료 (이미지 ${imgCount}장)`);
  } catch (err) {
    hideLoading();
    showToast('❌ 파일 불러오기 실패: ' + err.message);
  }
  e.target.value = '';
}

/* =========================================================
   LOAD MODAL — TABBED (autosave / sessions / file)
   ========================================================= */
function switchLoadTab(tab) {
  ['autosave', 'sessions', 'file'].forEach(t => {
    const btn = document.getElementById('ltab-' + t);
    const body = document.getElementById('ltab-' + t + '-body');
    if (btn) btn.classList.toggle('active', t === tab);
    if (body) body.style.display = t === tab ? '' : 'none';
  });
  if (tab === 'autosave') renderAutosaveTab();
  if (tab === 'sessions') renderSessionsList();
}

async function renderAutosaveTab() {
  const el = document.getElementById('autosave-recovery-area');
  if (!el) return;
  el.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text2);font-size:12px">⏳ 불러오는 중...</div>`;
  try {
    const snap = await idbGet(IDB_STORE, IDB_KEY);
    if (!snap) {
      el.innerHTML = `<div style="text-align:center;padding:32px;color:var(--text2)"><div style="font-size:32px;margin-bottom:8px">💤</div>자동저장된 작업이 없습니다.<br><span style="font-size:11px;color:var(--text3)">작업 시작 후 30초마다 자동저장됩니다.</span></div>`;
      return;
    }
    const savedDate = new Date(snap.savedAt).toLocaleString('ko-KR');
    const slideCount = snap.slides?.length || 0;
    const imgCount = snap.slides?.filter(s => s.imageUrl).length || 0;
    const hasRaw = !!snap.rawText;
    const hasSum = !!snap.summaryText;
    const hasTrans = !!(snap._translatedSummary || snap._translatedRaw);
    const sizeMB = (JSON.stringify(snap).length / 1024 / 1024).toFixed(1);
    el.innerHTML = `
      <div class="session-card" style="margin:0">
        <div class="session-card-header">
          <div class="session-card-name">🔄 ${escapeHtml(snap.fileName || snap.projectName || '자동저장 작업')}</div>
          <span style="font-size:10px;color:var(--accent2);background:rgba(79,200,150,0.1);padding:2px 8px;border-radius:10px">자동저장</span>
        </div>
        <div class="session-card-meta">
          <span>📅 ${savedDate}</span>
          <span>📊 슬라이드 ${slideCount}개</span>
          <span>🖼 이미지 ${imgCount}장</span>
          <span>💾 ${sizeMB}MB</span>
        </div>
        <div style="display:flex;gap:6px;margin:8px 0 4px;flex-wrap:wrap">
          ${hasRaw ? '<span style="font-size:10px;background:var(--surface2);padding:2px 8px;border-radius:10px;color:var(--text2)">✓ 원문</span>' : ''}
          ${hasSum ? '<span style="font-size:10px;background:var(--surface2);padding:2px 8px;border-radius:10px;color:var(--text2)">✓ 요약</span>' : ''}
          ${hasTrans ? '<span style="font-size:10px;background:var(--surface2);padding:2px 8px;border-radius:10px;color:var(--text2)">✓ 번역</span>' : ''}
          ${imgCount ? `<span style="font-size:10px;background:rgba(79,142,247,0.1);padding:2px 8px;border-radius:10px;color:var(--accent)">✓ 이미지 ${imgCount}장</span>` : ''}
        </div>
        <div class="session-card-actions">
          <button class="btn btn-primary btn-sm" onclick="restoreAutosaveAndClose()">🔄 이 작업 복구하기</button>
          <button class="btn btn-ghost btn-sm" onclick="clearAutosave()">🗑 삭제</button>
        </div>
      </div>`;
  } catch (e) {
    el.innerHTML = `<div style="color:var(--danger);padding:16px;font-size:12px">❌ 자동저장 읽기 실패: ${e.message}</div>`;
  }
}

async function restoreAutosaveAndClose() {
  await restoreAutosave();
  closeModal('load-modal');
}

async function clearAutosave() {
  if (!confirm('자동저장된 작업을 삭제하시겠습니까?')) return;
  await idbDelete(IDB_STORE, IDB_KEY);
  renderAutosaveTab();
  showToast('🗑 자동저장 삭제됨');
}

/* =========================================================
   EXISTING SESSION SAVE/LOAD (localStorage)
   ========================================================= */
function saveSession() {
  var rt = (typeof window.getRawText === 'function' ? window.getRawText() : rawText) || '';
  var fn = (typeof window.getFileName === 'function' ? window.getFileName() : fileName) || '';
  if (!slides.length && !rt) { showToast('⚠️ 저장할 내용이 없습니다'); return; }
  const name = fn ? fn.replace(/\.[^.]+$/, '') : `작업_${new Date().toLocaleDateString('ko-KR')}`;
  const session = {
    id: Date.now(), name, savedAt: new Date().toISOString(), fileName: fn, summaryText, slideStyle,
    slides: slides.map(s => ({ ...s, imageUrl: s.imageUrl && s.imageUrl.length < 500000 ? s.imageUrl : null })),
    activeSlideIndex, presentationScript, references: ReferenceStore.getAll()
  };
  try {
    const sessions = loadSessions(); const idx = sessions.findIndex(s => s.name === name);
    if (idx >= 0) { if (!confirm(`"${name}" 세션이 있습니다. 덮어쓰시겠습니까?`)) return; sessions[idx] = session; }
    else { sessions.unshift(session); if (sessions.length > 20) sessions.pop(); }
    localStorage.setItem(LS_SESSIONS, JSON.stringify(sessions));
    showToast(`💾 "${name}" 세션 저장 완료`);
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      session.slides = session.slides.map(s => ({ ...s, imageUrl: null }));
      try { const sessions = loadSessions(); sessions.unshift(session); localStorage.setItem(LS_SESSIONS, JSON.stringify(sessions)); showToast(`💾 저장됨 (이미지 제외)`); } catch { showToast('❌ 저장 실패'); }
    } else { showToast('❌ 저장 실패: ' + e.message); }
  }
}
function loadSessions() { try { return JSON.parse(localStorage.getItem(LS_SESSIONS) || '[]'); } catch { return []; } }
function openLoadModal() {
  openModal('load-modal');
  switchLoadTab('autosave');
}
function renderSessionsList() {
  const sessions = loadSessions(); const el = document.getElementById('saved-sessions-list');
  if (!el) return;
  if (!sessions.length) { el.innerHTML = '<div style="text-align:center;color:var(--text2);padding:32px 0">&#128194; 저장된 세션이 없습니다.<br><span style="font-size:11px;color:var(--text3)">"💼 세션으로 저장"으로 추가하세요.</span></div>'; return; }
  el.innerHTML = sessions.map((s, i) => `
    <div class="session-card">
      <div class="session-card-header"><div class="session-card-name">&#128196; ${escapeHtml(s.name || '이름 없음')}</div></div>
      <div class="session-card-meta"><span>&#128197; ${new Date(s.savedAt).toLocaleString('ko-KR')}</span><span>&#128221; ${s.slides?.length || 0}개</span><span>📚 ${s.references?.length || 0}개 참고문헌</span></div>
      <div class="session-card-actions">
        <button class="btn btn-primary btn-xs" onclick="loadSession(${i})">&#8617; 불러오기</button>
        <button class="btn btn-ghost btn-xs" onclick="renameSession(${i})">&#9998; 이름</button>
        <button class="btn btn-danger btn-xs" onclick="deleteSession(${i})">&#10005; 삭제</button>
      </div>
    </div>`).join('');
}
function loadSession(i) {
  const sessions = loadSessions(); const s = sessions[i]; if (!s) return;
  fileName = s.fileName || ''; summaryText = s.summaryText || ''; slides = s.slides || [];
  if (typeof slideUndoStack !== 'undefined') slideUndoStack = [];
  if (typeof slideRedoStack !== 'undefined') slideRedoStack = [];
  activeSlideIndex = s.activeSlideIndex || 0; slideStyle = s.slideStyle || 'light';
  presentationScript = s.presentationScript || [];
  if (s.references) { ReferenceStore.clear(); s.references.forEach(r => ReferenceStore.add(r)); }
  if (slides.length && typeof afterSlidesCreated === 'function') afterSlidesCreated();
  if (typeof window.setFileSlots === 'function') window.setFileSlots([]);
  rawText = ''; fileName = '';
  if (typeof renderLeftPanel === 'function') renderLeftPanel(); if (typeof renderRefsPanel === 'function') renderRefsPanel(); closeModal('load-modal');
  if (typeof window.updateHeaderSlideMode === 'function') window.updateHeaderSlideMode();
  if (typeof window.updateHeaderFileName === 'function') window.updateHeaderFileName();
  showToast(`✅ "${s.name}" 불러오기 완료`);
}
function renameSession(i) { const sessions = loadSessions(); const n = prompt('새 이름:', sessions[i].name); if (!n?.trim()) return; sessions[i].name = n.trim(); localStorage.setItem(LS_SESSIONS, JSON.stringify(sessions)); renderSessionsList(); showToast('✏ 이름 변경됨'); }
function deleteSession(i) { const sessions = loadSessions(); const name = sessions[i].name; if (!confirm(`"${name}" 삭제하시겠습니까?`)) return; sessions.splice(i, 1); localStorage.setItem(LS_SESSIONS, JSON.stringify(sessions)); renderSessionsList(); showToast(`🗑 "${name}" 삭제됨`); }

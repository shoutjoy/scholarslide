/* =========================================================
   INDEXEDDB AUTO-SAVE ENGINE
   ========================================================= */
const IDB_NAME = 'ScholarSlide_v3';
const IDB_STORE = 'autosave';
const IDB_KEY = 'current_workspace';
const IDB_SNAPSHOTS = 'snapshots'; // named project snapshots
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
    return {
        version: 3,
        savedAt: new Date().toISOString(),
        fileName, rawText, summaryText,
        _translatedSummary, _translatedRaw,
        slideStyle, writingStyle, activeSlideIndex,
        slides: slides.map(s => ({ ...s })), // includes imageUrl, imageUrl2
        sources, presentationScript,
        references: ReferenceStore.getAll(),
        aiImgHistory: typeof _aiImgHistory !== 'undefined' ? _aiImgHistory : [],
    };
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
    _autosaveTimer = setTimeout(() => autoSaveNow(true), 30000); // 30s debounce
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
    rawText = snap.rawText || '';
    fileName = snap.fileName || '';
    summaryText = snap.summaryText || '';
    _translatedSummary = snap._translatedSummary || '';
    _translatedRaw = snap._translatedRaw || '';
    slideStyle = snap.slideStyle || 'light';
    writingStyle = snap.writingStyle || 'academic-da';
    activeSlideIndex = snap.activeSlideIndex || 0;
    slides = snap.slides || [];
    sources = snap.sources || [];
    presentationScript = snap.presentationScript || [];
    if (snap.references && snap.references.length) {
        ReferenceStore.clear();
        snap.references.forEach(r => ReferenceStore.add(r));
    }
    if (snap.aiImgHistory) {
        if (typeof _aiImgHistory !== 'undefined') {
            _aiImgHistory = snap.aiImgHistory;
        }
        if (typeof saveAiImgHistory === 'function') saveAiImgHistory();
    }
    if (slides.length && typeof afterSlidesCreated === 'function') afterSlidesCreated();
    if (rawText && typeof enableMainBtns === 'function') enableMainBtns();
    if (typeof renderLeftPanel === 'function') renderLeftPanel();
    if (typeof renderRefsPanel === 'function') renderRefsPanel();
}

function _markDirty() { if (rawText || slides.length) scheduleAutosave(); }

/* =========================================================
   PROJECT FILE EXPORT / IMPORT & SESSIONS
   ========================================================= */

function saveSession() {
    if (!slides.length && !rawText) { showToast('⚠️ 저장할 내용이 없습니다'); return; }
    const name = fileName ? fileName.replace(/\.[^.]+$/, '') : `작업_${new Date().toLocaleDateString('ko-KR')}`;
    const session = {
        id: Date.now(), name, savedAt: new Date().toISOString(), fileName, summaryText, slideStyle,
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
            const sessions = loadSessions(); sessions.unshift(session);
            try { localStorage.setItem(LS_SESSIONS, JSON.stringify(sessions)); showToast(`💾 "${name}" 용량 부족으로 이미지 제외 후 저장됨`); }
            catch { showToast('오류: 브라우저 용량이 가득 찼습니다. 필요 없는 세션을 지워주세요.'); }
        } else { showToast('저장 중 알 수 없는 오류 발생'); }
    }
}

function loadSessions() {
    try { const data = localStorage.getItem(LS_SESSIONS); return data ? JSON.parse(data) : []; }
    catch { return []; }
}

function openLoadModal() {
    openModal('load-modal');
    switchLoadTab('autosave'); // default to autosave tab
}

function renderSessionsList() {
    const el = document.getElementById('saved-sessions-list'); if (!el) return;
    const sessions = loadSessions();
    if (sessions.length === 0) {
        el.innerHTML = '<div style="text-align:center;padding:32px;color:var(--text3);font-size:13px">저장된 세션이 없습니다</div>';
        return;
    }
    let html = '';
    sessions.forEach((s, idx) => {
        const dt = new Date(s.savedAt).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
        const c = s.slides ? s.slides.length : 0;
        html += `
    <div class="session-card">
      <div class="session-card-header">
        <div class="session-card-name">${escapeHtml(s.name)}</div>
      </div>
      <div class="session-card-meta"><span>📅 ${dt}</span><span>📊 슬라이드 ${c}개</span></div>
      <div class="session-card-actions">
        <button class="btn btn-secondary btn-sm" onclick="renameSession(${idx})">✏️ 이름변경</button>
        <button class="btn btn-primary btn-sm" onclick="loadSession(${idx})">📂 불러오기</button>
        <button class="btn btn-ghost btn-sm" onclick="deleteSession(${idx})">🗑 삭제</button>
      </div>
    </div>`;
    });
    el.innerHTML = html;
}

function loadSession(i) {
    const sessions = loadSessions(); const s = sessions[i]; if (!s) return;
    fileName = s.fileName; summaryText = s.summaryText; slideStyle = s.slideStyle || 'light';
    slides = s.slides || []; activeSlideIndex = s.activeSlideIndex || 0;
    presentationScript = s.presentationScript || [];
    if (s.references) { ReferenceStore.clear(); s.references.forEach(r => ReferenceStore.add(r)); }

    if (slides.length && typeof afterSlidesCreated === 'function') afterSlidesCreated();
    if (typeof enableMainBtns === 'function') enableMainBtns();
    if (typeof renderLeftPanel === 'function') renderLeftPanel();
    if (typeof renderRefsPanel === 'function') renderRefsPanel();

    closeModal('load-modal');
    showToast(`📂 "${s.name}" 불러오기 완료`);
}

function renameSession(i) {
    const sessions = loadSessions(); const s = sessions[i]; if (!s) return;
    const newName = prompt('새 이름을 입력하세요', s.name);
    if (newName && newName.trim()) { s.name = newName.trim(); localStorage.setItem(LS_SESSIONS, JSON.stringify(sessions)); renderSessionsList(); }
}

function deleteSession(i) {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    const sessions = loadSessions(); sessions.splice(i, 1);
    localStorage.setItem(LS_SESSIONS, JSON.stringify(sessions)); renderSessionsList();
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
        // Also save as snapshot in IDB
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
        // Clear current state before applying
        _translatedSummary = ''; _translatedRaw = '';
        applyWorkspaceSnapshot(snap);
        // Save as autosave so it persists
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

/* =========================================================
   UI MODALS & TABS
   ========================================================= */

function openModal(id) {
    document.getElementById(id).classList.add('open');
    if (id === 'img-modal' && typeof setupCropEvents === 'function') setTimeout(setupCropEvents, 100);
}

function closeModal(id) {
    document.getElementById(id).classList.remove('open');
}

function handleModalBackdropClick(e, id) {
    if (e.target === document.getElementById(id)) closeModal(id);
}

function switchTab(tab) {
    leftTab = tab;
    ['summary', 'raw', 'script'].forEach(t => { const b = document.getElementById('tab-' + t); if (b) b.classList.toggle('active', t === tab); });
    if (typeof renderLeftPanel === 'function') renderLeftPanel();
}

function switchRightTab(tab) {
    rightTab = tab;
    ['mdeditor', 'refs', 'design', 'gallery'].forEach(t => {
        const btn = document.getElementById('rtab-' + t);
        const panel = document.getElementById(t + '-panel');
        if (btn) btn.classList.toggle('active', t === tab);
        if (panel) panel.style.display = t === tab ? 'flex' : 'none';
    });
    if (tab === 'refs' && typeof renderRefsPanel === 'function') renderRefsPanel();
    if (tab === 'gallery' && typeof renderGalleryPanel === 'function') renderGalleryPanel();
    if (tab === 'design' && typeof renderDesignPanel === 'function') renderDesignPanel();
}

function switchLoadTab(tab) {
    ['autosave', 'sessions', 'file'].forEach(t => {
        const btn = document.getElementById('ltab-' + t);
        const body = document.getElementById('ltab-' + t + '-body');
        if (btn) btn.classList.toggle('active', t === tab);
        if (body) body.style.display = t === tab ? '' : 'none';
    });
    if (tab === 'autosave' && typeof renderAutosaveTab === 'function') renderAutosaveTab();
    if (tab === 'sessions' && typeof renderSessionsList === 'function') renderSessionsList();
}

function switchRefTab(tab) {
    ['add', 'apa', 'search', 'list'].forEach(t => {
        const btn = document.getElementById('reftab-' + t);
        const body = document.getElementById('refbody-' + t);
        if (btn) btn.classList.toggle('active', t === tab);
        if (body) body.style.display = t === tab ? 'block' : 'none';
    });
    const addBtn = document.getElementById('ref-add-btn');
    const hint = document.getElementById('ref-modal-hint');
    if (tab === 'add') {
        if (addBtn) addBtn.style.display = '';
        if (hint) hint.textContent = 'APA 형식으로 자동 저장됩니다';
    } else if (tab === 'list') {
        if (addBtn) addBtn.style.display = 'none';
        if (hint) hint.textContent = '저장된 참고문헌 라이브러리';
        if (typeof renderSavedRefList === 'function') renderSavedRefList();
    } else {
        if (addBtn) addBtn.style.display = 'none';
        if (hint) hint.textContent = '';
    }
}

function showConfirm(title, msg, okFn) {
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-msg').textContent = msg;
    const okBtn = document.getElementById('confirm-ok-btn');
    okBtn.onclick = () => { closeModal('confirm-modal'); okFn(); };
    openModal('confirm-modal');
}

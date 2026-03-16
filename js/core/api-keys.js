// =========================================================
// api-keys.js — API 키·모달·Help 모달
// (index.js 리사이즈 Phase 1.2)
// =========================================================

/* =========================================================
   API KEY HELPERS
   ========================================================= */
function getApiKey() { if (_activeApiKey) return _activeApiKey; throw new Error('NO_API_KEY'); }
function loadSavedKeys() { try { return JSON.parse(localStorage.getItem(LS_KEYS_LIST) || '[]'); } catch { return []; } }
function saveKeysList(list) { localStorage.setItem(LS_KEYS_LIST, JSON.stringify(list)); }
function maskKey(k) { if (!k || k.length < 12) return k; return k.slice(0, 6) + '••••••••' + k.slice(-4); }
function updateHeaderKeyStatus() {
  const btn = document.getElementById('api-key-btn');
  const icon = document.getElementById('api-key-status-icon');
  const lbl = document.getElementById('api-key-status-text');
  if (_activeApiKey) { btn.classList.add('has-key'); icon.textContent = '✅'; lbl.textContent = maskKey(_activeApiKey); }
  else { btn.classList.remove('has-key'); icon.textContent = '🔑'; lbl.textContent = 'API 키 설정'; }
}
function initApiKey() {
  const saved = localStorage.getItem(LS_ACTIVE_KEY);
  if (saved) { _activeApiKey = saved; updateHeaderKeyStatus(); }
  else { setTimeout(() => openApiModal(), 500); }
}
function openApiModal() { openModal('api-modal'); const f = document.getElementById('api-key-field'); f.value = _activeApiKey || ''; f.type = 'password'; const btn = document.getElementById('key-toggle'); if (btn) btn.innerHTML = '&#128065;'; updateApiKeyStrength(f.value); renderSavedKeysList(); }
function openModal(id) { document.getElementById(id).classList.add('open'); if (id === 'img-modal') setTimeout(setupCropEvents, 100); }
function closeModal(id) { const el = document.getElementById(id); if (el) { el.classList.remove('open'); if (id === 'img-modal') el.classList.remove('img-modal-sidebar'); } }
function handleModalBackdropClick(e, id) { if (e.target === document.getElementById(id)) closeModal(id); }

// Help 모달: 단축키 목록 렌더 후 열기
const HELP_HOTKEYS = [
  { section: '전역', items: [
    { desc: '앱 다크/라이트 모드 전환', keys: 'Alt + 4' },
  ]},
  { section: '전역 · 슬라이드', items: [
    { desc: '보기 축소', keys: 'Ctrl + 9' },
    { desc: '보기 확대', keys: 'Ctrl + 0' },
    { desc: '이전 슬라이드', keys: 'Ctrl + ←' },
    { desc: '다음 슬라이드', keys: 'Ctrl + →' },
  ]},
  { section: '편집', items: [
    { desc: '슬라이드 실행 취소 (삭제·추가·편집 복구)', keys: 'Ctrl + Z' },
    { desc: '슬라이드 다시 실행', keys: 'Ctrl + Shift + Z / Ctrl + Y' },
    { desc: '불릿 굵게', keys: 'Ctrl + B' },
    { desc: '불릿 기울임', keys: 'Ctrl + I' },
  ]},
  { section: '불릿 편집', items: [
    { desc: '새 불릿', keys: 'Enter' },
    { desc: '줄바꿈', keys: 'Shift + Enter' },
  ]},
  { section: '발표 모드', items: [
    { desc: '처음부터 발표', keys: 'F5' },
    { desc: '현재부터 발표', keys: 'Shift + F5' },
    { desc: '다음 슬라이드', keys: '→ / ↓ / Space' },
    { desc: '이전 슬라이드', keys: '← / ↑' },
    { desc: '종료', keys: 'Esc' },
    { desc: '노트 토글', keys: 'N' },
    { desc: '확대 / 축소', keys: '+ / −' },
    { desc: '화면에 맞추기', keys: 'F' },
  ]},
  { section: '새창보기 (요약·원문·번역 등)', items: [
    { desc: '페이지 축소', keys: 'Ctrl + 7' },
    { desc: '페이지 확대', keys: 'Ctrl + 8' },
    { desc: '폰트 축소', keys: 'Ctrl + 9' },
    { desc: '폰트 확대', keys: 'Ctrl + 0' },
  ]},
];
function renderHelpModal() {
  const el = document.getElementById('help-modal-body');
  if (!el) return;
  el.innerHTML = HELP_HOTKEYS.map(s => `
    <div class="help-section" style="margin-bottom:16px">
      <div style="font-size:11px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">${s.section}</div>
      <table class="help-table" style="width:100%;font-size:12px;border-collapse:collapse">
        ${s.items.map(i => `
          <tr style="border-bottom:1px solid var(--border2)">
            <td style="padding:6px 10px 6px 0;color:var(--text2);vertical-align:top">${i.desc}</td>
            <td style="padding:6px 0;color:var(--text3);white-space:nowrap;text-align:right"><kbd style="font-size:10px;padding:2px 6px;background:var(--surface2);border-radius:4px;border:1px solid var(--border2)">${i.keys}</kbd></td>
          </tr>
        `).join('')}
      </table>
    </div>
  `).join('');
}
function openHelpModal() {
  renderHelpModal();
  openModal('help-modal');
}

function toggleKeyVisibility() { const f = document.getElementById('api-key-field'); const btn = document.getElementById('key-toggle'); if (f.type === 'password') { f.type = 'text'; btn.innerHTML = '&#128683;'; } else { f.type = 'password'; btn.innerHTML = '&#128065;'; } }
function updateApiKeyStrength(val) {
  const bar = document.getElementById('key-strength-bar'); const fill = document.getElementById('key-strength-fill'); const lbl = document.getElementById('key-strength-label');
  const wrap = document.getElementById('api-key-field-wrap'); const check = document.getElementById('api-key-check'); const field = document.getElementById('api-key-field');
  if (wrap) { wrap.classList.remove('has-key'); if (check) check.style.display = 'none'; }
  if (field) field.classList.remove('api-key-valid');
  if (!val) { if (bar) bar.style.display = 'none'; return; }
  if (bar) bar.style.display = 'block';
  let s = 0;
  if (val.startsWith('AIza')) s += 50; if (val.length >= 35) s += 30; if (val.length >= 39) s += 20;
  if (fill) fill.style.width = s + '%';
  if (s >= 100) {
    if (fill) fill.style.background = 'linear-gradient(90deg,#34d399,#10b981)';
    if (lbl) { lbl.textContent = '✓ 유효한 형식'; lbl.style.color = '#34d399'; }
    if (wrap) wrap.classList.add('has-key'); if (check) check.style.display = 'block'; if (field) field.classList.add('api-key-valid');
  } else if (s >= 50) {
    if (fill) fill.style.background = 'linear-gradient(90deg,var(--warning),#f59e0b)'; if (lbl) { lbl.textContent = '⚠ 확인 필요'; lbl.style.color = 'var(--warning)'; }
  } else {
    if (fill) fill.style.background = 'linear-gradient(90deg,var(--danger),#ef4444)'; if (lbl) { lbl.textContent = '✗ AIza로 시작'; lbl.style.color = 'var(--danger)'; }
  }
}
function renderSavedKeysList() {
  const keys = loadSavedKeys(); const section = document.getElementById('saved-keys-section'); const list = document.getElementById('saved-keys-list');
  if (!keys.length) { section.style.display = 'none'; return; }
  section.style.display = 'block';
  list.innerHTML = keys.map((k, i) => `<div class="saved-key-item"><span class="saved-key-label">${maskKey(k)}</span>${k === _activeApiKey ? '<span class="saved-key-active">사용 중</span>' : ''}<button class="saved-key-select" onclick="selectSavedKey(${i})">선택</button><button class="saved-key-delete" onclick="deleteSavedKey(${i})">&#10005;</button></div>`).join('');
}
function selectSavedKey(i) { const keys = loadSavedKeys(); if (!keys[i]) return; _activeApiKey = keys[i]; localStorage.setItem(LS_ACTIVE_KEY, _activeApiKey); document.getElementById('api-key-field').value = _activeApiKey; updateApiKeyStrength(_activeApiKey); renderSavedKeysList(); updateHeaderKeyStatus(); if (typeof showToast === 'function') showToast('✅ 키 선택됨'); }
function deleteSavedKey(i) { const keys = loadSavedKeys(); const del = keys[i]; keys.splice(i, 1); saveKeysList(keys); if (del === _activeApiKey) { _activeApiKey = keys[0] || ''; localStorage.setItem(LS_ACTIVE_KEY, _activeApiKey); updateHeaderKeyStatus(); } renderSavedKeysList(); }
function applyApiKey() { const val = document.getElementById('api-key-field').value.trim(); if (!val) { if (typeof showToast === 'function') showToast('⚠️ API 키를 입력하세요'); return; } _activeApiKey = val; localStorage.setItem(LS_ACTIVE_KEY, val); if (document.getElementById('save-key-checkbox').checked) { const keys = loadSavedKeys(); if (!keys.includes(val)) { keys.unshift(val); if (keys.length > 5) keys.pop(); saveKeysList(keys); } } updateHeaderKeyStatus(); closeModal('api-modal'); if (typeof showToast === 'function') showToast('✅ API 키 적용됨'); }

function syncApiKeyFromStorage() {
  _activeApiKey = localStorage.getItem(LS_ACTIVE_KEY) || '';
  updateHeaderKeyStatus();
}
if (typeof window !== 'undefined') window.syncApiKeyFromStorage = syncApiKeyFromStorage;

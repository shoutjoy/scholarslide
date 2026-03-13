// =========================================================
// references.js — 인용·참고문헌·패널·저장목록 (Phase 2.1, 2.2, 2.3)
// =========================================================

/* =========================================================
   CITATION FORMATTERS
   ========================================================= */
function formatAPA(c) {
  const doi = c.doi ? ` https://doi.org/${c.doi}` : '';
  const vol = c.volume ? `, ${c.volume}` : '';
  const iss = c.issue ? `(${c.issue})` : '';
  const pages = c.pages ? `, ${c.pages}` : '';
  return `${c.authors} (${c.year}). ${c.title}. ${c.journal}${vol}${iss}${pages}.${doi}`;
}
function formatInTextAPA(c) {
  const first = (c.authors || '').split(',')[0].trim();
  return `(${first} et al., ${c.year})`;
}
function formatChicago(c) { return `${c.authors}. ${c.year}. "${c.title}." ${c.journal} ${c.volume || ''}, no. ${c.issue || ''}: ${c.pages || ''}.`; }
function formatMLA(c) { return `${c.authors}. "${c.title}." ${c.journal}, vol. ${c.volume || ''}, no. ${c.issue || ''}, ${c.year}, pp. ${c.pages || ''}.`; }
function formatCitation(c, style) {
  if (style === 'Chicago') return formatChicago(c);
  if (style === 'MLA') return formatMLA(c);
  return formatAPA(c);
}
function formatInText(c) { return formatInTextAPA(c); }

function addParsedRef(result) {
  ReferenceStore.add(result);
  renderRefsPanel();
  document.getElementById('apa-parse-result').innerHTML = '<p style="font-size:11px;color:var(--accent)">✅ 참고문헌에 추가되었습니다.</p>';
  showToast('✅ 참고문헌 추가 완료');
}

/** APA 형식 한 줄(또는 한 문단)을 파싱해 { authors, year, title, journal, volume, issue, pages, doi } 반환. 실패 시 null */
function parseOneAPA(raw) {
  if (!raw || typeof raw !== 'string') return null;
  var str = raw.trim();
  if (str.length < 15) return null;
  var yearMatch = str.match(/\((\d{4}[a-z]?)\)\.?/);
  if (!yearMatch) return null;
  var year = yearMatch[1];
  var yearIdx = str.indexOf(yearMatch[0]);
  var authors = str.substring(0, yearIdx).trim().replace(/\.\s*$/, '');
  if (!authors) return null;
  var afterYear = str.substring(yearIdx + yearMatch[0].length).trim();
  var titleEnd = afterYear.indexOf('.');
  var title = titleEnd > -1 ? afterYear.substring(0, titleEnd).trim() : afterYear;
  if (!title) return null;
  var rest = titleEnd > -1 ? afterYear.substring(titleEnd + 1).trim() : '';
  var parts = rest.split(',');
  var journal = (parts[0] || '').trim();
  var volIssue = (parts[1] || '').trim();
  var pagesRaw = (parts[2] || '').trim();
  var volMatch = volIssue.match(/(\d+)\((\d+)\)/);
  var volume = volMatch ? volMatch[1] : volIssue.replace(/\D/g, '');
  var issue = volMatch ? volMatch[2] : '';
  var pages = pagesRaw.replace(/\s*\..*$/, '').trim();
  var doiMatch = str.match(/https?:\/\/doi\.org\/([^\s\)]+)|doi:\s*([^\s\)]+)/i);
  var doi = doiMatch ? (doiMatch[1] || doiMatch[2] || '').trim() : '';
  return { authors, year, title, journal, volume, issue, pages, doi };
}

/** 원문에서 References 섹션을 정규식으로 추출한 뒤, APA 형식에 맞는 항목만 파싱해 참고문헌 목록으로 대체 */
function reExtractReferencesFromDocument() {
  var raw = typeof window.getRawText === 'function' ? window.getRawText() : (typeof rawText !== 'undefined' ? rawText : '');
  if (!raw || !raw.trim()) { showToast('⚠️ 먼저 원문을 로드하세요'); return; }
  var extractFn = typeof window.extractReferencesSectionFromRawText === 'function' ? window.extractReferencesSectionFromRawText : null;
  if (!extractFn) { showToast('⚠️ 추출 함수를 찾을 수 없습니다'); return; }
  var result = extractFn(raw);
  if (!result.text || result.count === 0) {
    showToast('⚠️ 원문에서 참고문헌 섹션을 찾지 못했습니다. References/참고문헌 제목 아래에 APA 형식(저자, 연도. 제목. 저널...)이 있는지 확인하세요.');
    return;
  }
  var entries = result.text.split(/\n\s*\n+/).map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 15; });
  var refs = [];
  for (var i = 0; i < entries.length; i++) {
    var obj = parseOneAPA(entries[i]);
    if (obj && obj.authors && obj.year && obj.title) refs.push(obj);
  }
  if (refs.length === 0) {
    showToast('⚠️ APA 형식에 맞는 항목을 추출하지 못했습니다. 저자 (연도). 제목. 저널,... 형식인지 확인하세요.');
    return;
  }
  if (!confirm('원문에서 ' + refs.length + '개 항목을 추출했습니다. 기존 참고문헌을 이 목록으로 대체하시겠습니까?')) return;
  ReferenceStore.clear();
  for (var j = 0; j < refs.length; j++) ReferenceStore.add(refs[j]);
  renderRefsPanel();
  showToast('✅ 원문에서 ' + refs.length + '개 참고문헌으로 재추출했습니다.');
}

/** AI로 원문 전체에서 참고문헌을 APA 양식에 맞게 추출해 목록으로 대체. 완료 후 콜백 호출(REF EXP 창 새로고침용). autoApply: true면 확인 없이 자동 적용 */
async function extractReferencesWithAI(doneCallback, options) {
  var raw = typeof window.getRawText === 'function' ? window.getRawText() : (typeof rawText !== 'undefined' ? rawText : '');
  if (!raw || !raw.trim()) { showToast('⚠️ 먼저 원문을 로드하세요'); if (doneCallback) doneCallback(); return; }
  var defaults = (typeof window.getDefaultPrompts === 'function' && window.getDefaultPrompts()) || {};
  var promptTpl = (typeof window.getPromptOverride === 'function' && window.getPromptOverride('ref_extract_prompt')) || (defaults.ref_extract_prompt && defaults.ref_extract_prompt.value) || 'Extract every reference from the following document in APA 7th edition format. Focus on the END of the document where reference sections typically appear (Reference, References, 참고문헌, 참고, Bibliography). Return ONLY a JSON array of objects with keys: authors, year, title, journal, volume, issue, pages, doi.\n\nDocument text:\n{{TEXT}}';
  var systemTpl = (typeof window.getPromptOverride === 'function' && window.getPromptOverride('ref_extract_system')) || (defaults.ref_extract_system && defaults.ref_extract_system.value) || 'You are an expert in APA 7th edition. Return ONLY a valid JSON array of reference objects. No markdown.';
  var textSnippet = raw.length > 50000 ? raw.substring(0, 50000) + '\n\n[... 이하 생략 ...]' : raw;
  var prompt = promptTpl.replace(/\{\{TEXT\}\}/g, textSnippet);
  var autoApply = options && options.autoApply === true;
  if (typeof showToast === 'function') showToast('참고문헌 AI 추출 중... (백그라운드)');
  try {
    var res = await window.callGemini(prompt, systemTpl);
    var text = res && res.text ? res.text : (res || '');
    var clean = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
    var match = clean.match(/\[[\s\S]*\]/);
    if (!match) { showToast('❌ AI 응답에서 JSON 배열을 찾을 수 없습니다'); if (doneCallback) doneCallback(); return; }
    var arr = JSON.parse(match[0]);
    if (!Array.isArray(arr) || arr.length === 0) { showToast('⚠️ 추출된 참고문헌이 없습니다'); if (doneCallback) doneCallback(); return; }
    var refs = arr.map(function (item) {
      return {
        authors: (item.authors || item.author || '').toString().trim(),
        year: (item.year || item.date || '').toString().trim().replace(/\D/g, '').slice(0, 4) || '',
        title: (item.title || '').toString().trim(),
        journal: (item.journal || item.journalName || '').toString().trim(),
        volume: (item.volume != null ? item.volume : '').toString().trim(),
        issue: (item.issue != null ? item.issue : '').toString().trim(),
        pages: (item.pages || '').toString().trim(),
        doi: (item.doi || '').toString().trim().replace(/^https?:\/\/doi\.org\//i, '')
      };
    }).filter(function (r) { return r.authors && r.year && r.title; });
    if (refs.length === 0) { showToast('⚠️ 저자·연도·제목이 있는 항목이 없습니다'); if (doneCallback) doneCallback(); return; }
    if (!autoApply && !confirm('AI가 ' + refs.length + '개 참고문헌을 추출했습니다. 기존 목록을 이 목록으로 대체하시겠습니까?')) { if (doneCallback) doneCallback(); return; }
    ReferenceStore.clear();
    for (var i = 0; i < refs.length; i++) ReferenceStore.add(refs[i]);
    renderRefsPanel();
    showToast('✅ AI 추출로 ' + refs.length + '개 참고문헌을 반영했습니다.');
  } catch (e) {
    if (e.name !== 'AbortError') { console.error(e); showToast('❌ 참고문헌 AI 추출 실패: ' + (e.message || e)); }
  }
  if (doneCallback) doneCallback();
}

function parseAPA() {
  const raw = document.getElementById('apa-parse-input')?.value?.trim();
  if (!raw) { showToast('⚠️ APA 인용문을 입력하세요'); return; }
  const yearMatch = raw.match(/\((\d{4}[a-z]?)\)\./);
  if (!yearMatch) { showToast('❌ 연도를 찾을 수 없습니다 — (YYYY). 형식 확인'); return; }
  const year = yearMatch[1];
  const yearIdx = raw.indexOf(yearMatch[0]);
  const authors = raw.substring(0, yearIdx).trim().replace(/\.$/, '');
  const afterYear = raw.substring(yearIdx + yearMatch[0].length).trim();
  const titleEnd = afterYear.indexOf('.');
  const title = titleEnd > -1 ? afterYear.substring(0, titleEnd).trim() : afterYear;
  const rest = titleEnd > -1 ? afterYear.substring(titleEnd + 1).trim() : '';
  const parts = rest.split(',');
  const journal = (parts[0] || '').trim();
  const volIssue = (parts[1] || '').trim();
  const pagesRaw = (parts[2] || '').trim();
  const volMatch = volIssue.match(/(\d+)\((\d+)\)/);
  const volume = volMatch ? volMatch[1] : volIssue.replace(/\D/g, '');
  const issue = volMatch ? volMatch[2] : '';
  const pages = pagesRaw.replace(/\s*\..*/, '').trim();
  const doiMatch = raw.match(/https?:\/\/doi\.org\/([^\s]+)|doi:\s*([^\s]+)/i);
  const doi = doiMatch ? (doiMatch[1] || doiMatch[2]) : '';
  const result = { authors, year, title, journal, volume, issue, pages, doi };
  const el = document.getElementById('apa-parse-result');
  if (!el) return;
  el.innerHTML = `
    <div style="background:var(--surface3);border:1px solid var(--border2);border-radius:var(--radius);padding:12px;font-size:11px;line-height:1.8;color:var(--text2)">
      <b style="color:var(--accent)">파싱 결과</b><br>
      <b>저자:</b> ${escapeHtml(authors)}<br>
      <b>연도:</b> ${escapeHtml(year)}<br>
      <b>제목:</b> ${escapeHtml(title)}<br>
      <b>저널:</b> ${escapeHtml(journal)}<br>
      <b>Vol/Issue/Pages:</b> ${escapeHtml(volume)} / ${escapeHtml(issue)} / ${escapeHtml(pages)}<br>
      <b>DOI:</b> ${escapeHtml(doi) || '없음'}
    </div>
    <button class="btn btn-primary btn-sm mt-2" onclick='addParsedRef(${JSON.stringify(result).replace(/</g, "&lt;").replace(/>/g, "&gt;")})'>✅ 이 정보로 추가</button>
  `;
}

/* =========================================================
   REF MODAL TABS / SAVED REF LIST
   ========================================================= */
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
    renderSavedRefList();
  } else {
    if (addBtn) addBtn.style.display = 'none';
    if (hint) hint.textContent = '';
  }
}

function renderSavedRefList(filter) {
  const list = getSavedRefList();
  const el = document.getElementById('saved-ref-list-container');
  if (!el) return;
  const filtered = filter ? list.filter(r => (r.title + r.authors).toLowerCase().includes(filter.toLowerCase())) : list;
  if (!filtered.length) { el.innerHTML = '<p class="placeholder-msg">저장된 참고문헌이 없습니다.</p>'; return; }
  el.innerHTML = filtered.map(r => `
    <div class="ref-card">
      <div class="ref-card-title">${escapeHtml(r.title)}</div>
      <div class="ref-card-authors">${escapeHtml(r.authors)} (${escapeHtml(r.year)})</div>
      <div class="ref-card-meta">${escapeHtml(r.journal)}</div>
      <div class="ref-card-actions">
        <button class="ref-insert-btn" onclick='loadFromSavedList(${JSON.stringify(r).replace(/</g, "&lt;").replace(/>/g, "&gt;")})'>+ 목록에 추가</button>
        <button class="ref-delete-btn" onclick="deleteSavedRef('${escapeHtml(r.title)}','${escapeHtml(r.authors)}')">삭제</button>
      </div>
    </div>`).join('');
}

function filterSavedRefList(val) { renderSavedRefList(val); }
function clearSavedRefList() { if (!confirm('저장된 목록을 전체 삭제하시겠습니까?')) return; saveRefList([]); renderSavedRefList(); showToast('🗑 저장 목록 삭제됨'); }
function loadFromSavedList(data) { const { savedAt, id, ...ref } = data; ReferenceStore.add(ref); renderRefsPanel(); showToast('✅ 참고문헌에 추가됨'); }
function deleteSavedRef(title, authors) { let list = getSavedRefList(); list = list.filter(r => !(r.title === title && r.authors === authors)); saveRefList(list); renderSavedRefList(); showToast('🗑 삭제됨'); }

/* =========================================================
   REFERENCES PANEL / IN-TEXT CITATION / REF SLIDE
   ========================================================= */
function removeRef(id) { ReferenceStore.remove(id); renderRefsPanel(); showToast('🗑 삭제됨'); }
function clearAllReferences() { if (!confirm('모든 참고문헌을 삭제하시겠습니까?')) return; ReferenceStore.clear(); renderRefsPanel(); showToast('🗑 전체 삭제'); }

function saveRefToLocalList(id) {
  const ref = ReferenceStore.getAll().find(r => r.id === id);
  if (!ref) return;
  addToSavedList(ref);
  showToast('✅ 로컬 저장 완료');
}

let _lastFocusedEl = null;
let _lastFocusedType = null;
let _lastFocusedSlide = null;
let _lastFocusedBullet = null;

function _trackFocus(el, type, slideIdx, bulletIdx) {
  _lastFocusedEl = el;
  _lastFocusedType = type;
  _lastFocusedSlide = slideIdx;
  _lastFocusedBullet = bulletIdx !== undefined ? bulletIdx : null;
}

function insertInTextCitation(id) {
  const ref = ReferenceStore.getAll().find(r => r.id === id);
  if (!ref) return;
  const cite = formatInText(ref);

  if (_lastFocusedEl && document.body.contains(_lastFocusedEl)) {
    const ta = _lastFocusedEl;
    const start = ta.selectionStart ?? ta.value.length;
    const end = ta.selectionEnd ?? ta.value.length;
    const before = ta.value.substring(0, start);
    const after = ta.value.substring(end);
    const newVal = before + ' ' + cite + ' ' + after;
    ta.value = newVal;
    const newPos = start + cite.length + 2;
    ta.selectionStart = ta.selectionEnd = newPos;

    const si = _lastFocusedSlide ?? activeSlideIndex;
    if (_lastFocusedType === 'bullet' && _lastFocusedBullet !== null) {
      updateSlideBullet(si, _lastFocusedBullet, newVal);
      hideBulletEditor(si, _lastFocusedBullet, newVal);
    } else if (_lastFocusedType === 'notes') {
      updateSlideNotes(si, newVal);
    } else if (_lastFocusedType === 'title') {
      updateSlideTitle(si, newVal);
    } else if (_lastFocusedType === 'extra') {
      if (slides[si]) slides[si].extraText = newVal;
      renderExtraTextInSlide(si);
    }
    ta.focus();
    ta.selectionStart = ta.selectionEnd = newPos;
    showToast(`✅ 인용 삽입: ${cite}`);
    return;
  }

  const si = activeSlideIndex;
  if (!slides[si]) { showToast('⚠️ 슬라이드를 먼저 선택하고 커서를 클릭하세요'); return; }
  const lastIdx = slides[si].bullets.length - 1;
  slides[si].bullets[lastIdx] = (slides[si].bullets[lastIdx] || '') + ' ' + cite;
  renderSlides();
  showToast(`✅ 인용 삽입 (마지막 bullet): ${cite} — 원하는 위치에 커서를 두고 삽입하면 해당 위치에 추가됩니다`);
}

function makeRefSlide(id) {
  const ref = ReferenceStore.getAll().find(r => r.id === id);
  if (!ref) return;
  const style = document.getElementById('citation-style')?.value || 'APA';
  const newSlide = {
    id: Date.now(), title: ref.title,
    bullets: [
      `저자: ${ref.authors} (${ref.year})`,
      `저널: ${ref.journal}${ref.volume ? `, ${ref.volume}(${ref.issue}), ${ref.pages}` : ''}`,
      `인용: ${formatCitation(ref, style)}`
    ],
    notes: `참고문헌: ${formatCitation(ref, style)}`,
    visPrompt: '', imageUrl: null
  };
  if (typeof pushSlideUndoState === 'function') pushSlideUndoState();
  slides.splice(activeSlideIndex + 1, 0, newSlide);
  activeSlideIndex = activeSlideIndex + 1;
  renderSlides(); renderThumbs();
  document.getElementById('slides-count').textContent = slides.length + ' 슬라이드';
  showToast('✅ 참고문헌 슬라이드 추가됨');
}

function addReferenceFromModal() {
  const authors = document.getElementById('ref-authors').value.trim();
  const year = document.getElementById('ref-year').value.trim();
  const title = document.getElementById('ref-title').value.trim();
  const journal = document.getElementById('ref-journal').value.trim();
  const volume = document.getElementById('ref-volume').value.trim();
  const issue = document.getElementById('ref-issue').value.trim();
  const pages = document.getElementById('ref-pages').value.trim();
  const doi = document.getElementById('ref-doi').value.trim();
  if (!authors || !title || !year) { showToast('⚠️ 저자, 연도, 제목은 필수입니다'); return; }
  ReferenceStore.add({ authors, year, title, journal, volume, issue, pages, doi });
  renderRefsPanel();
  closeModal('ref-modal');
  showToast('✅ 참고문헌 추가 완료');
  ['ref-authors', 'ref-year', 'ref-title', 'ref-journal', 'ref-volume', 'ref-issue', 'ref-pages', 'ref-doi']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
}

function addRefsSlide() {
  const refs = ReferenceStore.getAll();
  if (!refs.length) { showToast('⚠️ 참고문헌이 없습니다'); return; }
  const style = document.getElementById('citation-style')?.value || 'APA';
  const sorted = [...refs].sort((a, b) => a.authors.localeCompare(b.authors));
  const refSlide = { id: Date.now(), title: 'References', bullets: sorted.map(r => formatCitation(r, style)), notes: '', visPrompt: '', imageUrl: null };
  if (typeof pushSlideUndoState === 'function') pushSlideUndoState();
  slides.push(refSlide); renderSlides(); renderThumbs();
  document.getElementById('slides-count').textContent = slides.length + ' 슬라이드';
  showToast('✅ 참고문헌 슬라이드 추가됨');
}

function renderRefsPanel() {
  const refs = ReferenceStore.getAll();
  const el = document.getElementById('refs-list');
  if (!el) return;

  const barHtml = `
    <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid var(--border)">
      <button class="btn btn-ghost btn-xs" onclick="reExtractReferencesFromDocument()" title="원문 References 섹션을 APA 형식으로 파싱해 목록으로 대체">🔄 원문 재추출</button>
      <button class="btn btn-ghost btn-xs" onclick="extractReferencesWithAI()" title="AI로 원문에서 참고문헌을 APA 양식에 맞게 추출">🤖 AI 추출</button>
      <button class="btn btn-ghost btn-xs" onclick="exportRefsToLocalFile()" title="JSON 파일로 내보내기">💾 로컬 저장</button>
      <button class="btn btn-ghost btn-xs" onclick="exportSavedListToFile()" title="저장 목록 JSON">📥 목록 저장</button>
      <button class="btn btn-ghost btn-xs" style="position:relative;overflow:hidden" title="JSON 파일 불러오기">
        📂 불러오기<input type="file" accept=".json" onchange="importRefsFromFile(event)" style="position:absolute;inset:0;opacity:0;cursor:pointer"/>
      </button>
      <button class="btn btn-ghost btn-xs" onclick="clearAllReferences()" style="color:var(--danger)">🗑 전체삭제</button>
    </div>`;

  if (!refs.length) {
    el.innerHTML = barHtml + '<p class="placeholder-msg">참고문헌을 추가하세요.</p>';
    return;
  }
  const style = document.getElementById('citation-style')?.value || 'APA';
  el.innerHTML = barHtml + refs.map(r => `
    <div class="ref-card">
      <div class="ref-card-title">${escapeHtml(r.title)}</div>
      <div class="ref-card-authors">${escapeHtml(r.authors)} (${escapeHtml(r.year)})</div>
      <div class="ref-card-meta">${escapeHtml(r.journal)}</div>
      <div class="ref-card-actions">
        <button class="ref-insert-btn" onclick="insertInTextCitation('${r.id}')">인용 삽입</button>
        <button class="ref-insert-btn" style="border-color:rgba(52,211,153,0.4);color:var(--success);background:rgba(52,211,153,0.07)" onclick="saveRefToLocalList('${r.id}')">로컬 저장</button>
        <button class="ref-insert-btn" style="border-color:rgba(124,90,247,0.4);color:var(--accent2);background:rgba(124,90,247,0.07)" onclick="makeRefSlide('${r.id}')">슬라이드화</button>
        <button class="ref-delete-btn" onclick="removeRef('${r.id}')">삭제</button>
      </div>
    </div>`).join('');
}

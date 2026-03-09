/* =========================================================
   SCHOLAR AI SEARCH
   ========================================================= */

async function searchScholarAI() {
    const query = document.getElementById('scholar-search-input').value.trim();
    if (!query) { showToast('⚠️ 검색어를 입력하세요'); return; }
    const container = document.getElementById('scholar-results');
    container.innerHTML = '<p style="font-size:11px;color:var(--text2)">🔍 AI Scholar 검색 중...</p>';
    try {
        const prompt = `다음 주제와 관련된 실제 학술 논문 5편을 JSON 배열로만 응답하세요 (코드블록, 마크다운 없이 순수 JSON만):\n[{"authors":"Last, F., & Last2, F2.","year":"2023","title":"논문 제목","journal":"저널명","volume":"15","issue":"2","pages":"100-120","doi":""}]\n주제: ${query}`;
        const { text } = await callGemini(prompt, 'You are a scholar database. Return ONLY valid JSON array, no markdown.', false);
        const clean = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
        const match = clean.match(/\[[\s\S]*\]/);
        if (!match) throw new Error('응답에서 JSON을 찾을 수 없음');
        const results = JSON.parse(match[0]);
        if (!results.length) throw new Error('검색 결과 없음');
        container.innerHTML = results.map(r => `
      <div class="scholar-item">
        <div class="scholar-item-title">${escapeHtml(r.title)}</div>
        <div class="scholar-item-meta">${escapeHtml(r.authors)} (${escapeHtml(r.year)}) — ${escapeHtml(r.journal)}</div>
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:6px">
          <button class="scholar-add-btn" onclick='scholarAddRef(${JSON.stringify(r).replace(/</g, "&lt;").replace(/>/g, "&gt;")},this)'>+ 참고문헌 추가</button>
          <button class="scholar-list-btn" onclick='scholarSaveList(${JSON.stringify(r).replace(/</g, "&lt;").replace(/>/g, "&gt;")},this)'>📌 목록에 저장</button>
        </div>
      </div>`).join('');
    } catch (e) {
        container.innerHTML = `<p style="font-size:11px;color:var(--danger)">검색 실패: ${escapeHtml(e.message)}</p>`;
    }
}

function scholarAddRef(data, btn) {
    ReferenceStore.add({ ...data });
    renderRefsPanel();
    btn.textContent = '✅ 추가됨';
    btn.disabled = true;
    btn.style.opacity = '0.6';
    showToast('✅ 참고문헌에 추가됨');
}

function scholarSaveList(data, btn) {
    addToSavedList(data);
    btn.textContent = '✅ 저장됨';
    btn.disabled = true;
    btn.style.opacity = '0.6';
    showToast('✅ 로컬 목록에 저장됨');
}

function renderSources() {
    const el = document.getElementById('sources-list');
    if (!el) return;
    if (!sources.length) { el.innerHTML = '<p class="placeholder-msg">출처를 찾지 못했습니다.</p>'; return; }
    el.innerHTML = sources.filter(s => s.uri && s.title).map(s => `
    <div class="source-card">
      <div class="source-title">${escapeHtml(s.title)}</div>
      <a href="${escapeHtml(s.uri)}" target="_blank" rel="noopener" class="source-link">🔗 링크 보기</a>
      <div style="margin-top:5px">
        <button class="ref-insert-btn" onclick='scholarAddRef(${JSON.stringify({ authors: "", year: "", title: s.title, journal: "", volume: "", issue: "", pages: "", doi: "" }).replace(/</g, "&lt;").replace(/>/g, "&gt;")},this)'>📚 참고문헌 추가</button>
      </div>
    </div>`).join('');
}

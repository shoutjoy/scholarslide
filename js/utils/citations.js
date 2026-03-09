/* =========================================================
   CITATION FORMATTERS (from index.js)
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

/* =========================================================
   APA PARSER (req. 10)
   ========================================================= */
function parseAPA() {
    const raw = document.getElementById('apa-parse-input').value.trim();
    if (!raw) { showToast('⚠️ APA 인용문을 입력하세요'); return; }

    // Authors (Year). Title. Journal, Vol(Issue), Pages. [DOI]
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
    const safeJson = JSON.stringify(result).replace(/'/g, "\\'");
    document.getElementById('apa-parse-result').innerHTML = `
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

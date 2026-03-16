/**
 * ScholarSlide — MDeditor (마크다운 슬라이드 편집)
 * index.js에서 분리. 전역(window)에 함수 노출.
 */
(function () {
  'use strict';
  if (typeof window.slides === 'undefined') { console.warn('MDeditor: index.js must load first'); return; }

  const MAX_MD_UNDO = 80;
  let mdEditorUndoStack = [];
  let mdEditorRedoStack = [];

  function pushMdEditorUndoState(ta) {
  if (!ta || ta.id !== 'md-editor-ta') return;
  const v = ta.value;
  const s = ta.selectionStart;
  const e = ta.selectionEnd;
  const last = mdEditorUndoStack[mdEditorUndoStack.length - 1];
  if (last && last.value === v && last.start === s && last.end === e) return;
  mdEditorUndoStack.push({ value: v, start: s, end: e });
  if (mdEditorUndoStack.length > MAX_MD_UNDO) mdEditorUndoStack.shift();
  mdEditorRedoStack.length = 0;
}

function mdEditorUndo(ta) {
  if (!ta || ta.id !== 'md-editor-ta' || !mdEditorUndoStack.length) return;
  mdEditorRedoStack.push({ value: ta.value, start: ta.selectionStart, end: ta.selectionEnd });
  const state = mdEditorUndoStack.pop();
  ta.value = state.value;
  ta.selectionStart = state.start;
  ta.selectionEnd = state.end;
  ta.dispatchEvent(new Event('input', { bubbles: true }));
}

function mdEditorRedo(ta) {
  if (!ta || ta.id !== 'md-editor-ta' || !mdEditorRedoStack.length) return;
  mdEditorUndoStack.push({ value: ta.value, start: ta.selectionStart, end: ta.selectionEnd });
  const state = mdEditorRedoStack.pop();
  ta.value = state.value;
  ta.selectionStart = state.start;
  ta.selectionEnd = state.end;
  ta.dispatchEvent(new Event('input', { bubbles: true }));
}

// ?? MD ?먮뵒??以??⑥쐞 ?좏떥 (以????꾨옒 ?대룞, 蹂듭젣, ?꾩옱 以???젣) ?????????????
function mdEditorGetLineBounds(ta) {
  const val = ta.value;
  const pos = ta.selectionStart;
  const lineStart = val.lastIndexOf('\n', pos - 1) + 1;
  let lineEnd = val.indexOf('\n', lineStart);
  if (lineEnd === -1) lineEnd = val.length;
  const lineIndex = (val.substring(0, lineStart).match(/\n/g) || []).length;
  const lines = val.split('\n');
  const selEnd = ta.selectionEnd;
  let lineEndSel = val.indexOf('\n', selEnd);
  if (lineEndSel === -1) lineEndSel = val.length;
  const lineIndexEnd = (val.substring(0, lineEndSel).match(/\n/g) || []).length;
  return { lineStart, lineEnd, lineIndex, lines, lineIndexEnd };
}

function mdEditorMoveLineUp(ta) {
  const b = mdEditorGetLineBounds(ta);
  if (b.lineIndex <= 0) return;
  const lines = b.lines.slice();
  const lineText = lines[b.lineIndex];
  lines[b.lineIndex] = lines[b.lineIndex - 1];
  lines[b.lineIndex - 1] = lineText;
  const newVal = lines.join('\n');
  let newStart = 0;
  for (let i = 0; i < b.lineIndex - 1; i++) newStart += lines[i].length + 1;
  ta.value = newVal;
  ta.selectionStart = newStart;
  ta.selectionEnd = newStart + lineText.length;
  ta.dispatchEvent(new Event('input', { bubbles: true }));
}

function mdEditorMoveLineDown(ta) {
  const b = mdEditorGetLineBounds(ta);
  if (b.lineIndex >= b.lines.length - 1) return;
  const lines = b.lines.slice();
  const lineText = lines[b.lineIndex];
  lines[b.lineIndex] = lines[b.lineIndex + 1];
  lines[b.lineIndex + 1] = lineText;
  const newVal = lines.join('\n');
  let newStart = 0;
  for (let i = 0; i < b.lineIndex + 1; i++) newStart += lines[i].length + 1;
  ta.value = newVal;
  ta.selectionStart = newStart;
  ta.selectionEnd = newStart + lineText.length;
  ta.dispatchEvent(new Event('input', { bubbles: true }));
}

function mdEditorDupLine(ta) {
  const b = mdEditorGetLineBounds(ta);
  const lines = b.lines.slice();
  const from = b.lineIndex;
  const to = b.lineIndexEnd;
  const toCopy = lines.slice(from, to + 1);
  const insertIdx = to + 1;
  const newLines = lines.slice(0, insertIdx).concat(toCopy).concat(lines.slice(insertIdx));
  const newVal = newLines.join('\n');
  let newStart = 0;
  for (let i = 0; i < insertIdx; i++) newStart += newLines[i].length + 1;
  const len = toCopy.join('\n').length;
  ta.value = newVal;
  ta.selectionStart = newStart;
  ta.selectionEnd = newStart + len;
  ta.dispatchEvent(new Event('input', { bubbles: true }));
}

function mdEditorDeleteLine(ta) {
  const b = mdEditorGetLineBounds(ta);
  const lines = b.lines.slice();
  const from = b.lineIndex;
  const to = b.lineIndexEnd;
  lines.splice(from, to - from + 1);
  const newVal = lines.length ? lines.join('\n') : '';
  let newStart = 0;
  for (let i = 0; i < from && i < lines.length; i++) newStart += lines[i].length + 1;
  if (newStart > newVal.length) newStart = newVal.length;
  ta.value = newVal;
  ta.selectionStart = newStart;
  ta.selectionEnd = newStart;
  ta.dispatchEvent(new Event('input', { bubbles: true }));
}


// renderRefsPanel ??js/features/references.js

/* =========================================================
   NEW FEATURES v3.3
   ========================================================= */
function mdLoadFromSlide() {
  // ?섎떒 硫붾돱(#slide-footer)?먯꽌 ?좏깮???섏씠吏(?몃꽕?? 湲곗??쇰줈 濡쒕뱶
  const footer = document.getElementById('slide-footer');
  const activeThumb = footer ? footer.querySelector('.thumb.active') : null;
  let loadIndex = activeSlideIndex;
  if (activeThumb && activeThumb.parentElement) {
    const thumbs = Array.from(activeThumb.parentElement.querySelectorAll('.thumb'));
    const idx = thumbs.indexOf(activeThumb);
    if (idx >= 0) loadIndex = idx;
  }

  const slide = slides[loadIndex];
  const ta = document.getElementById('md-editor-ta');
  if (!ta) return;
  if (!slide) { ta.value = ''; return; }

  if (loadIndex !== activeSlideIndex) {
    activeSlideIndex = loadIndex;
    document.querySelectorAll('.slide-wrapper').forEach((el, i) => el.classList.toggle('active', i === loadIndex));
    document.querySelectorAll('.thumb').forEach((el, i) => el.classList.toggle('active', i === loadIndex));
    updateDesignPanel();
    const el = document.getElementById(`sw-${loadIndex}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // ?щ씪?대뱶 ?꾩옱 ?곹깭(?쒕ぉ쨌遺덈┸쨌異붽??띿뒪?맞룸끂??瑜?湲곗??쇰줈 留덊겕?ㅼ슫 ?ш뎄????遺덈┸???먮뵒?곗뿉 ??긽 蹂댁씠?꾨줉 ??  let md = (slide.title ? '# ' + slide.title + '\n\n' : '');
  if (slide.bullets && slide.bullets.length) md += slide.bullets.map(b => '- ' + b).join('\n') + '\n';
  if (slide.extraText && slide.extraText.trim()) md += (md ? '\n' : '') + slide.extraText.trim();
  if (slide.notes && slide.notes.trim()) md += (md ? '\n\n' : '') + '> ' + slide.notes.trim() + '\n';
  ta.value = md;
  if (slide.mdContent !== undefined) slide.mdContent = md;
  mdEditorUndoStack.length = 0;
  mdEditorRedoStack.length = 0;
  mdUpdatePreview();
  try { if (typeof window.mdUpdatePageIndicators === 'function') window.mdUpdatePageIndicators(); if (typeof window.updateWhitespaceBadges === 'function') window.updateWhitespaceBadges(); } catch (e) { }
}

function mdApplyToSlide() {
  const slide = slides[activeSlideIndex];
  const ta = document.getElementById('md-editor-ta');
  if (!slide || !ta) { showToast('?좑툘 ?щ씪?대뱶瑜??좏깮?섏꽭??); return; }
  const md = ta.value;

  if (typeof pushSlideUndoState === 'function') pushSlideUndoState();
  slide.mdContent = md;

  const titleM = md.match(/^#\s+(.+)/m);
  if (titleM) slide.title = titleM[1].trim();

  const noteM = md.match(/^>\s+(.+)/m);
  if (noteM) slide.notes = noteM[1].trim();

  // ?쒖감 ?뚯떛: 遺덈┸怨?洹??ъ씠??肄붾뱶 釉붾줉/臾몃떒???낅젰 ?쒖꽌?濡??좎?
  const lines = md.split('\n');
  const bullets = [];
  let preamble = [];
  let currentBullet = null;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // H1(?쒕ぉ) / ?명듃(>) 嫄대꼫?곌린
    if (/^#\s+/.test(line)) { i++; continue; }
    if (/^>\s+/.test(line)) { i++; continue; }

    // 遺덈┸ ?쇱씤: ?댁쟾 遺덈┸ ???????遺덈┸ ?쒖옉
    const bulletMatch = line.match(/^(?:[-*]|\d+\.)\s+(.*)$/);
    if (bulletMatch) {
      if (currentBullet !== null) bullets.push(currentBullet.trim());
      currentBullet = bulletMatch[1] || '';
      i++;
      continue;
    }

    // 肄붾뱶 釉붾줉: ?꾩옱 遺덈┸??洹몃?濡?遺숈뿬??以묎컙??肄붾뱶媛 ?ㅼ뼱媛寃???    if (/^```/.test(line)) {
      const codeBlock = [line];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) {
        codeBlock.push(lines[i]);
        i++;
      }
      if (i < lines.length) codeBlock.push(lines[i]); // ?ル뒗 ```
      i++;
      const blockStr = codeBlock.join('\n');
      if (currentBullet !== null) currentBullet += '\n\n' + blockStr;
      else preamble.push(blockStr);
      continue;
    }

    // 洹????쇱씤: ?꾩옱 遺덈┸??遺숈씠嫄곕굹 preamble??    if (currentBullet !== null) currentBullet += '\n' + line;
    else preamble.push(line);
    i++;
  }

  if (currentBullet !== null) bullets.push(currentBullet.trim());
  slide.bullets = bullets.length ? bullets : (slide.bullets || []);

  // ?쒕ぉ/遺덈┸/?명듃媛 ?꾨땶 ?좊몢 ?댁슜留?extraText濡?(?좏깮??
  const extraContent = preamble.join('\n').trim();
  slide.extraText = extraContent || '';

  renderSlides();
  renderThumbs();
}

// Live apply as user types ??debounced
let _mdLiveTimer = null;
function mdLiveApply() {
  clearTimeout(_mdLiveTimer);
  _mdLiveTimer = setTimeout(() => {
    mdApplyToSlide();
  }, 600);
}

function mdFmt(type, val) {
  const ta = document.getElementById('md-editor-ta');
  if (!ta) return;
  const s = ta.selectionStart, e = ta.selectionEnd;
  const sel = ta.value.substring(s, e);
  let ins = '';
  if (type === 'bold') ins = '**' + (sel || '援듦쾶') + '**';
  else if (type === 'italic') ins = '*' + (sel || '湲곗슱??) + '*';
  else if (type === 'strike') ins = '~~' + (sel || '痍⑥냼??) + '~~';
  else if (type === 'h1') ins = '# ' + (sel || '?쒕ぉ1');
  else if (type === 'h2') ins = '## ' + (sel || '?쒕ぉ2');
  else if (type === 'h3') ins = '### ' + (sel || '?쒕ぉ3');
  else if (type === 'ul') ins = '- ' + (sel || '??ぉ');
  else if (type === 'ol') ins = '1. ' + (sel || '??ぉ');
  else if (type === 'code') ins = '`' + (sel || '肄붾뱶') + '`';
  else if (type === 'codeblock') ins = '```js\n' + (sel || '肄붾뱶') + '\n```';
  else if (type === 'link') ins = '[' + (sel || '留곹겕') + '](https://)';
  else if (type === 'color') ins = '<span style="color:' + val + '">' + (sel || '?띿뒪??) + '</span>';
  else if (type === 'size') ins = '<span style="font-size:' + val + '">' + (sel || '?띿뒪??) + '</span>';
  ta.setRangeText(ins, s, e, 'end');
  ta.focus();
  mdLiveApply();
}

// ?? Font size controls ????????????????????????????????????
function mdAdjustFontSize(delta) {
  _mdFontSize = Math.max(7, Math.min(80, _mdFontSize + delta));
  document.getElementById('md-size-display').textContent = _mdFontSize;
}
function mdSelectFontSize(val) {
  if (!val) return;
  _mdFontSize = parseInt(val);
  document.getElementById('md-size-display').textContent = _mdFontSize;
}
function mdApplyFontSize() {
  mdFmt('size', _mdFontSize + 'px');
}
function mdSizeInputMode() {
  const disp = document.getElementById('md-size-display');
  const inp = document.getElementById('md-size-input');
  if (!disp || !inp) return;
  disp.style.display = 'none';
  inp.style.display = 'inline-block';
  inp.value = _mdFontSize;
  inp.focus(); inp.select();
}
function mdSizeConfirm() {
  const inp = document.getElementById('md-size-input');
  const disp = document.getElementById('md-size-display');
  if (!inp || !disp) return;
  _mdFontSize = Math.max(7, Math.min(80, parseInt(inp.value) || 12));
  disp.textContent = _mdFontSize;
  inp.style.display = 'none';
  disp.style.display = '';
}

// ?? Link modal ????????????????????????????????????????????
function openLinkModal() {
  const ta = document.getElementById('md-editor-ta');
  const sel = ta ? ta.value.substring(ta.selectionStart, ta.selectionEnd) : '';
  const li = document.getElementById('link-text-input');
  if (li) li.value = sel || '';
  const lu = document.getElementById('link-url-input');
  if (lu) lu.value = '';
  openModal('link-modal');
  setTimeout(function () {
    var urlInp = document.getElementById('link-url-input');
    if (urlInp) urlInp.focus();
  }, 100);
}
function insertLinkFromModal() {
  const text = (document.getElementById('link-text-input')?.value || '留곹겕').trim();
  const url = (document.getElementById('link-url-input')?.value || '').trim();
  const newTab = document.getElementById('link-newtab')?.checked;
  const ta = document.getElementById('md-editor-ta');
  if (!ta || !url) { showToast('?좑툘 URL???낅젰?섏꽭??); return; }
  const ins = `[${text}](${url})${newTab ? '{_blank}' : ''}`;
  const s = ta.selectionStart, e = ta.selectionEnd;
  ta.setRangeText(ins, s, e, 'end');
  ta.focus();
  closeModal('link-modal');
  if (typeof mdLiveApply === 'function') mdLiveApply();
  showToast('??留곹겕媛 ?쎌엯?섏뿀?듬땲?? [?곸슜]???꾨Ⅴ硫??щ씪?대뱶??諛섏쁺?⑸땲??');
}

// ?? YouTube modal (URL ?뺢퇋?? ?붾컮?댁뒪 誘몃━蹂닿린, embed innerHTML, 紐⑤떖 ?ъ빱?? ???
let _youtubeDebounceTimer = null;

function openYoutubeModal() {
  const modal = document.getElementById('youtube-modal');
  const inp = document.getElementById('youtube-url-input');
  const wrap = document.getElementById('youtube-preview-wrap');
  const area = document.getElementById('youtube-preview-area');
  if (inp) inp.value = '';
  if (area) area.innerHTML = '';
  if (wrap) wrap.style.display = 'none';
  openModal('youtube-modal');
  if (modal && inp) setTimeout(function () { inp.focus(); }, 100);
}

/** URL ?뺢퇋?? 怨듬갚/以꾨컮轅??쒓굅 */
function normalizeYoutubeUrl(url) {
  if (url == null) return '';
  return String(url).replace(/\s+/g, '').trim();
}

/** ?붾컮?댁뒪(400ms) ??誘몃━蹂닿린 媛깆떊 */
function previewYoutubeOnInput() {
  clearTimeout(_youtubeDebounceTimer);
  _youtubeDebounceTimer = setTimeout(function () {
    updateYoutubePreview(document.getElementById('youtube-url-input')?.value);
  }, 400);
}

/** 誘몃━蹂닿린: embed URL 蹂?????숈씪??buildYoutubeEmbedHtml濡?innerHTML ?ㅼ젙 (?ㅻ쪟 153 諛⑹?) */
function updateYoutubePreview(url) {
  const normalized = normalizeYoutubeUrl(url);
  const videoId = extractYoutubeId(normalized);
  const wrap = document.getElementById('youtube-preview-wrap');
  const area = document.getElementById('youtube-preview-area');
  if (!wrap || !area) return;
  if (!videoId) {
    area.innerHTML = '';
    wrap.style.display = 'none';
    return;
  }
  wrap.style.display = 'block';
  area.innerHTML = buildYoutubeEmbedHtml(videoId);
}

function previewYoutube() {
  var url = document.getElementById('youtube-url-input')?.value;
  updateYoutubePreview(url);
  if (!extractYoutubeId(normalizeYoutubeUrl(url))) showToast('?좑툘 ?좏슚??YouTube URL???낅젰?섏꽭??);
}

/** ?쎌엯: ?щ씪?대뱶?먮뒗 youtube:URL ??以꾨줈 ???*/
function insertYoutubeFromModal() {
  var url = document.getElementById('youtube-url-input')?.value;
  var normalized = normalizeYoutubeUrl(url);
  var vid = extractYoutubeId(normalized);
  var ta = document.getElementById('md-editor-ta');
  if (!vid) {
    showToast('?좑툘 ?좏슚??YouTube URL???낅젰?섏꽭??(?? https://www.youtube.com/watch?v=?곸긽ID)');
    return;
  }
  if (!ta) return;
  var ins = '\nyoutube:' + normalized + '\n';
  var s = ta.selectionStart, e = ta.selectionEnd;
  ta.setRangeText(ins, s, e, 'end');
  ta.focus();
  closeModal('youtube-modal');
  if (typeof mdUpdatePreview === 'function') mdUpdatePreview();
  const cur = slides?.length ? (activeSlideIndex + 1) : 0;
  const total = slides?.length || 0;
  // 媛꾩냼?? 5/13 ?뺤떇
  const txt = `${cur}/${total}`;
  if (top) top.textContent = txt;
  if (bot) bot.textContent = txt;
}
window.mdUpdatePageIndicators = mdUpdatePageIndicators;

// ?? ?щ씪?대뱶 ?⑤뒗 ?щ갚(怨듬갚) 怨꾩궛 & ?쒖떆 ?????????????????????????
function calcSlideWhitespacePx(i) {
  const inner = document.querySelector(`#sw-${i} .slide-inner`);
  if (!inner) return null;
  const ch = inner.clientHeight || 0;
  const sh = inner.scrollHeight || 0;
  const unused = Math.max(0, ch - sh);
  const overflow = Math.max(0, sh - ch);
  const pct = ch ? Math.round((unused / ch) * 100) : 0;
  return { unused, overflow, pct, ch };
}

function updateWhitespaceBadges() {
  if (!slides || !slides.length) return;
  for (let i = 0; i < slides.length; i++) {
    const badge = document.getElementById(`wsb-${i}`);
    const m = calcSlideWhitespacePx(i);
    if (!badge || !m) continue;
    if (m.overflow > 0) {
      badge.textContent = `?섏묠 ${m.overflow}px`;
      badge.style.borderColor = 'rgba(248,113,113,0.45)';
      badge.style.background = 'rgba(248,113,113,0.12)';
      badge.style.color = '#b91c1c';
      badge.title = `肄섑뀗痢좉? 諛뺤뒪 ?믪씠瑜?${m.overflow}px 珥덇낵?⑸땲??`;
    } else {
      badge.textContent = `?щ갚 ${m.pct}%`;
      badge.style.borderColor = 'rgba(251,191,36,0.35)';
      badge.style.background = 'rgba(251,191,36,0.10)';
      badge.style.color = '#b45309';
      badge.title = `?⑤뒗 ?щ갚: ??${m.unused}px (??${m.pct}%)`;
    }
  }
  // MD ?섎떒 ?쒖떆???④퍡 ?낅뜲?댄듃
  const ws = document.getElementById('md-ws-indicator');
  if (ws) {
    const m = calcSlideWhitespacePx(activeSlideIndex);
    if (!m) ws.textContent = '?щ갚 -';
    else if (m.overflow > 0) ws.textContent = `?섏묠 ${m.overflow}px`;
    else ws.textContent = `?щ갚 ${m.pct}% (${m.unused}px)`;
  }
}
window.updateWhitespaceBadges = updateWhitespaceBadges;

// ?? MD ?먮뵒??誘몃━蹂닿린 ?믪씠 由ъ궗?댁쫰(?쒕옒洹? ????????????????????
function initMdSplitter() {
  const splitter = document.getElementById('md-splitter');
  const ta = document.getElementById('md-editor-ta');
  const wrap = document.getElementById('md-preview-wrap');
  const panel = document.getElementById('mdeditor-panel');
  if (!splitter || !ta || !wrap || !panel) return;

  // restore
  try {
    const saved = parseInt(localStorage.getItem('md_split_px') || '0', 10);
    if (saved && saved > 80) {
      ta.style.flex = `0 0 ${saved}px`;
      wrap.style.flex = '1 1 auto';
    }
  } catch (e) { }

  let dragging = false;
  splitter.addEventListener('mousedown', (e) => {
    dragging = true;
    e.preventDefault();
  });
  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const panelRect = panel.getBoundingClientRect();
    const taRect = ta.getBoundingClientRect();
    const y = e.clientY;
    let newH = y - taRect.top;
    const maxH = panelRect.height - 260; // toolbar/labels ?ъ쑀
    newH = Math.max(140, Math.min(maxH, newH));
    ta.style.flex = `0 0 ${Math.round(newH)}px`;
    wrap.style.flex = '1 1 auto';
    try { localStorage.setItem('md_split_px', String(Math.round(newH))); } catch (err) { }
  });
  document.addEventListener('mouseup', () => { dragging = false; });
}

// 湲곗〈 mdLiveApply瑜?'誘몃━蹂닿린 ?낅뜲?댄듃'濡??꾪솚
(function () {
  try {
    const _old = window.mdLiveApply;
    window.mdLiveApply = function () { mdUpdatePreview(); };
  } catch (e) { }
})();

  // 전역 노출 (index.js 키보드/이벤트·modals 등에서 사용)
  window.pushMdEditorUndoState = pushMdEditorUndoState;
  window.mdEditorUndo = mdEditorUndo;
  window.mdEditorRedo = mdEditorRedo;
  window.mdEditorGetLineBounds = mdEditorGetLineBounds;
  window.mdEditorMoveLineUp = mdEditorMoveLineUp;
  window.mdEditorMoveLineDown = mdEditorMoveLineDown;
  window.mdEditorDupLine = mdEditorDupLine;
  window.mdEditorDeleteLine = mdEditorDeleteLine;
  window.mdLoadFromSlide = mdLoadFromSlide;
  window.mdApplyToSlide = mdApplyToSlide;
  window.mdLiveApply = mdLiveApply;
  window.mdFmt = mdFmt;
  window.mdAdjustFontSize = mdAdjustFontSize;
  window.mdSelectFontSize = mdSelectFontSize;
  window.mdApplyFontSize = mdApplyFontSize;
  window.mdSizeInputMode = mdSizeInputMode;
  window.mdSizeConfirm = mdSizeConfirm;
  window.openLinkModal = openLinkModal;
  window.insertLinkFromModal = insertLinkFromModal;
  window.openYoutubeModal = openYoutubeModal;
  window.normalizeYoutubeUrl = normalizeYoutubeUrl;
  window.previewYoutubeOnInput = previewYoutubeOnInput;
  window.updateYoutubePreview = updateYoutubePreview;
  window.previewYoutube = previewYoutube;
  window.insertYoutubeFromModal = insertYoutubeFromModal;
  window.mdPreviewUpdate = mdPreviewUpdate;
  window.mdUpdatePreview = mdUpdatePreview;
  window.mdUpdatePageIndicators = mdUpdatePageIndicators;
  window.calcSlideWhitespacePx = calcSlideWhitespacePx;
  window.updateWhitespaceBadges = updateWhitespaceBadges;
  window.initMdSplitter = initMdSplitter;

  // 탭 전환/로드 시 미리보기 동기화
  (function () {
    const _orig = window.mdLoadFromSlide;
    if (typeof _orig === 'function') {
      window.mdLoadFromSlide = function () {
        _orig();
        mdUpdatePreview();
        try { mdUpdatePageIndicators(); } catch (e) { }
        try { setTimeout(() => updateWhitespaceBadges(), 60); } catch (e) { }
      };
    }
  })();

  // V4.1 APPLY HOOK
  (function () {
    const _orig = window.mdApplyToSlide;
    if (typeof _orig === 'function') {
      window.mdApplyToSlide = function () {
        _orig();
        mdUpdatePreview();
      };
    }
  })();

  // paste/cut: 실행 취소 상태 저장 + YouTube URL 자동 변환
  document.addEventListener('paste', function (e) {
    if (e.target.id !== 'md-editor-ta') return;
    pushMdEditorUndoState(e.target);
    var text = (e.clipboardData && e.clipboardData.getData('text')) || '';
    var normalized = normalizeYoutubeUrl(text);
    if (!normalized) return;
    if (/^youtube:\s*/i.test(normalized)) return;
    var vid = typeof extractYoutubeId === 'function' ? extractYoutubeId(normalized) : null;
    if (!vid) return;
    e.preventDefault();
    var ta = e.target;
    var s = ta.selectionStart, end = ta.selectionEnd;
    var ins = 'youtube:' + normalized;
    ta.setRangeText(ins, s, end, 'end');
    ta.focus();
    if (typeof mdUpdatePreview === 'function') mdUpdatePreview();
  }, true);
  document.addEventListener('cut', function (e) {
    if (e.target.id === 'md-editor-ta') pushMdEditorUndoState(e.target);
  }, true);
})();

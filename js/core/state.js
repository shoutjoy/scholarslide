// =========================================================
// state.js — 전역 상수·상태·ReferenceStore·_exposeSlideGenGlobals
// (index.js 리사이즈 Phase 1.1)
// =========================================================

/* =========================================================
   STATE
   ========================================================= */
const LS_ACTIVE_KEY = 'ss_active_key', LS_KEYS_LIST = 'ss_keys', LS_SESSIONS = 'ss_sessions_v3', LS_SAVED_REF_LIST = 'ss_saved_ref_list', LS_SUMMARY_HISTORY = 'ss_summary_history', LS_MANUSCRIPT_HISTORY = 'ss_manuscript_history', LS_SLIDE_HISTORY = 'ss_slide_history', LS_ALL_SLIDE_HISTORY = 'ss_all_slide_history';
let rawText = '', fileName = '', slides = [], sources = [], activeSlideIndex = 0;
let fileSlots = []; // [{ id, fileName, rawText, checked }] — 다중 파일 슬롯
const FILE_SLOTS_MAX = 10;
let leftTab = 'summary', rightTab = 'design', summaryText = '', presentationScript = [];
let slideStyle = 'light', presIndex = 0, presNotesVisible = false;
let _presFromCurrent = false;
let writingStyle = 'academic-da';
let summarySubTab = 'current'; // 'current' | 'history'
let summaryHistory = [];
let manuscriptHistory = []; // 발표 원고 전용 (script 타입만)
let slideHistory = []; // 슬라이드 생성 전용 (slides 타입)
let allSlideHistory = []; // All Slide 생성 전용 (한번에 전체 생성)
const SUMMARY_HISTORY_MAX = 100;
const MANUSCRIPT_HISTORY_MAX = 50;
const SLIDE_HISTORY_MAX = 50;
const ALL_SLIDE_HISTORY_MAX = 50;
let _abortController = null;
if (typeof window !== 'undefined') {
  window._translatedSummary = '';
  window._translatedRaw = '';
}
let _currentCropImg = null, _cropDragging = false, _cropDragStart = null, _cropSelection = { x: 0, y: 0, w: 0, h: 0 }, _cropDispScale = 1, _cropDisplayW = 0, _cropDisplayH = 0, _finalCroppedDataURL = null, _targetSlideForImage = null;
let _penTool = 'pointer', _penColor = '#f87171', _penDrawing = false, _penOpacity = 0.05, _penLastX = 0, _penLastY = 0, _presCtx = null;
/** 도구별 굵기·농도 (펜/형광펜/지우개 각각 적용) */
let _penToolSettings = {
  pen: { size: 3, opacity: 0.05 },
  highlight: { size: 5, opacity: 0.01 },
  eraser: { size: 20 }
};
let _activeApiKey = '';

const ReferenceStore = (function () {
  let refs = [];
  const KEY = 'ScholarRefs_v3';
  function genId() { return 'ref_' + Date.now() + '_' + Math.floor(Math.random() * 1000); }
  function add(c) { c.id = genId(); refs.push(c); save(); return c.id; }
  function remove(id) { refs = refs.filter(r => r.id !== id); save(); }
  function getAll() { return refs; }
  function clear() { refs = []; save(); }
  function save() { localStorage.setItem(KEY, JSON.stringify(refs)); }
  function load() { try { const d = localStorage.getItem(KEY); if (d) refs = JSON.parse(d); } catch { } }
  load();
  return { add, remove, getAll, clear };
})();

// slide-gen.js / translate.js 에서 사용하는 전역 접근자
function _exposeSlideGenGlobals() {
  window.getSlides = function () { return slides; };
  window.setSlides = function (s) { slides = s; if (typeof afterSlidesCreated === 'function') afterSlidesCreated(); };
  window.getRawText = function () {
    if (fileSlots && fileSlots.length) {
      var checked = fileSlots.filter(function (s) { return s.checked !== false; });
      if (!checked.length) return '';
      return checked.map(function (s) { return s.rawText || ''; }).join('\n\n---\n\n');
    }
    return rawText;
  };
  window.setRawText = function (t) {
    rawText = t || '';
    if (fileSlots && fileSlots.length === 1) fileSlots[0].rawText = rawText;
  };
  window.getSummaryText = function () { return summaryText; };
  window.setSummaryText = function (t) { summaryText = t; };
  window.getFileName = function () {
    if (fileSlots && fileSlots.length) {
      var checked = fileSlots.filter(function (s) { return s.checked !== false; });
      if (checked.length === 0) return fileName || '';
      if (checked.length === 1) return checked[0].fileName || '';
      return '여러 파일 (' + checked.length + '개)';
    }
    return fileName;
  };
  function updateHeaderFileName() {
    var el = document.getElementById('header-current-filename');
    if (el) el.textContent = (typeof window.getFileName === 'function' ? window.getFileName() : '') || '';
  }
  window.updateHeaderFileName = updateHeaderFileName;
  window.setFileName = function (name) { fileName = name || ''; updateHeaderFileName(); };
  window.getFileSlots = function () { return fileSlots.slice(); };
  window.setFileSlots = function (slots) {
    fileSlots = Array.isArray(slots) ? slots.slice() : [];
    if (fileSlots.length) { rawText = window.getRawText(); var f = fileSlots.find(function (s) { return s.checked !== false; }); fileName = f ? f.fileName : ''; }
    else { rawText = ''; fileName = ''; }
    updateHeaderFileName();
  };
  window.addFileToSlot = function (entry) {
    if (!entry || !entry.fileName) return;
    entry.id = 'fs_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
    entry.checked = entry.checked !== false;
    if (!fileSlots) fileSlots = [];
    if (fileSlots.length >= FILE_SLOTS_MAX) return;
    fileSlots.push(entry);
    rawText = window.getRawText();
    fileName = entry.fileName;
    updateHeaderFileName();
  };
  window.removeFileSlot = function (id) {
    fileSlots = fileSlots.filter(function (s) { return s.id !== id; });
    if (fileSlots.length) { rawText = window.getRawText(); var f = fileSlots.find(function (s) { return s.checked !== false; }); fileName = f ? f.fileName : ''; }
    else { rawText = ''; fileName = ''; }
    updateHeaderFileName();
  };
  window.toggleFileSlotCheck = function (id) {
    var s = fileSlots.find(function (x) { return x.id === id; });
    if (s) { s.checked = !s.checked; rawText = window.getRawText(); var f = fileSlots.find(function (x) { return x.checked !== false; }); fileName = f ? f.fileName : ''; }
    updateHeaderFileName();
  };
  window.getLeftTab = function () { return leftTab; };
  window.setLeftTab = function (t) { leftTab = t; };
  window.getPresentationScript = function () { return presentationScript; };
  window.setPresentationScript = function (p) { presentationScript = p; };
  window.getActiveSlideIndex = function () { return activeSlideIndex; };
  window.setActiveSlideIndex = function (i) { activeSlideIndex = i; };
  window.getSlideStyle = function () { return slideStyle; };
  window._setSlideStyleState = function (s) { slideStyle = s || 'light'; };
  window.getWritingStyle = function () { return writingStyle; };
  window._setWritingStyleState = function (s) { writingStyle = s || 'academic-da'; };
  window.getSummarySubTab = function () { return summarySubTab; };
  window.setSummarySubTab = function (t) { summarySubTab = t; };
  window.getSummaryHistory = function () { return summaryHistory.slice(); };
  window.addSummaryToHistory = function (entry) {
    entry.id = 'sh_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
    entry.createdAt = typeof entry.createdAt === 'string' ? entry.createdAt : new Date().toISOString();
    summaryHistory.unshift(entry);
    if (summaryHistory.length > SUMMARY_HISTORY_MAX) summaryHistory = summaryHistory.slice(0, SUMMARY_HISTORY_MAX);
    try { localStorage.setItem(LS_SUMMARY_HISTORY, JSON.stringify(summaryHistory)); } catch (e) {}
  };
  window.removeSummaryFromHistory = function (id) {
    summaryHistory = summaryHistory.filter(function (h) { return h.id !== id; });
    try { localStorage.setItem(LS_SUMMARY_HISTORY, JSON.stringify(summaryHistory)); } catch (e) {}
  };
  window.clearSummaryHistory = function () {
    summaryHistory = [];
    try { localStorage.setItem(LS_SUMMARY_HISTORY, '[]'); } catch (e) {}
  };
  window.getManuscriptHistory = function () { return manuscriptHistory.slice(); };
  window.addToManuscriptHistory = function (entry) {
    entry.type = 'script';
    entry.displayTitle = (entry.fileName || '제목 없음') + ' 발표 원고';
    entry.id = 'mh_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
    entry.createdAt = typeof entry.createdAt === 'string' ? entry.createdAt : new Date().toISOString();
    manuscriptHistory.unshift(entry);
    if (manuscriptHistory.length > MANUSCRIPT_HISTORY_MAX) manuscriptHistory = manuscriptHistory.slice(0, MANUSCRIPT_HISTORY_MAX);
    try { localStorage.setItem(LS_MANUSCRIPT_HISTORY, JSON.stringify(manuscriptHistory)); } catch (e) {}
    return entry.id;
  };
  window.removeFromManuscriptHistory = function (id) {
    manuscriptHistory = manuscriptHistory.filter(function (h) { return h.id !== id; });
    try { localStorage.setItem(LS_MANUSCRIPT_HISTORY, JSON.stringify(manuscriptHistory)); } catch (e) {}
  };
  window.clearManuscriptHistory = function () {
    manuscriptHistory = [];
    try { localStorage.setItem(LS_MANUSCRIPT_HISTORY, '[]'); } catch (e) {}
  };
  window.getSlideHistory = function () { return slideHistory.slice(); };
  window.addToSlideHistory = function (entry) {
    entry.type = 'slides';
    entry.displayTitle = (entry.fileName || '제목 없음') + ' 슬라이드';
    entry.id = 'sh_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
    entry.createdAt = typeof entry.createdAt === 'string' ? entry.createdAt : new Date().toISOString();
    slideHistory.unshift(entry);
    if (slideHistory.length > SLIDE_HISTORY_MAX) slideHistory = slideHistory.slice(0, SLIDE_HISTORY_MAX);
    try { localStorage.setItem(LS_SLIDE_HISTORY, JSON.stringify(slideHistory)); } catch (e) {}
    return entry.id;
  };
  window.removeFromSlideHistory = function (id) {
    slideHistory = slideHistory.filter(function (h) { return h.id !== id; });
    try { localStorage.setItem(LS_SLIDE_HISTORY, JSON.stringify(slideHistory)); } catch (e) {}
  };
  window.clearSlideHistory = function () {
    slideHistory = [];
    try { localStorage.setItem(LS_SLIDE_HISTORY, '[]'); } catch (e) {}
  };
  window.getAllSlideHistory = function () { return allSlideHistory.slice(); };
  window.addToAllSlideHistory = function (entry) {
    entry.type = 'all_slides';
    entry.displayTitle = (entry.fileName || '제목 없음') + ' All Slide';
    entry.id = 'ash_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
    entry.createdAt = typeof entry.createdAt === 'string' ? entry.createdAt : new Date().toISOString();
    allSlideHistory.unshift(entry);
    if (allSlideHistory.length > ALL_SLIDE_HISTORY_MAX) allSlideHistory = allSlideHistory.slice(0, ALL_SLIDE_HISTORY_MAX);
    try { localStorage.setItem(LS_ALL_SLIDE_HISTORY, JSON.stringify(allSlideHistory)); } catch (e) {}
  };
  window.removeFromAllSlideHistory = function (id) {
    allSlideHistory = allSlideHistory.filter(function (h) { return h.id !== id; });
    try { localStorage.setItem(LS_ALL_SLIDE_HISTORY, JSON.stringify(allSlideHistory)); } catch (e) {}
  };
  window.clearAllSlideHistory = function () {
    allSlideHistory = [];
    try { localStorage.setItem(LS_ALL_SLIDE_HISTORY, '[]'); } catch (e) {}
  };
}
_exposeSlideGenGlobals();
if (typeof window.updateHeaderFileName === 'function') window.updateHeaderFileName();

(function loadSummaryHistory() {
  try {
    var raw = localStorage.getItem(LS_SUMMARY_HISTORY);
    if (raw) summaryHistory = JSON.parse(raw);
  } catch (e) {}
})();
(function loadManuscriptHistory() {
  try {
    var raw = localStorage.getItem(LS_MANUSCRIPT_HISTORY);
    if (raw) {
      var parsed = JSON.parse(raw);
      manuscriptHistory = parsed.filter(function (h) { return h.type !== 'slides'; });
      var slidesFromManuscript = parsed.filter(function (h) { return h.type === 'slides'; });
      if (slidesFromManuscript.length) {
        var slideRaw = localStorage.getItem(LS_SLIDE_HISTORY);
        var existing = slideRaw ? JSON.parse(slideRaw) : [];
        slideHistory = slidesFromManuscript.concat(existing).slice(0, 50);
        try { localStorage.setItem(LS_SLIDE_HISTORY, JSON.stringify(slideHistory)); } catch (e) {}
        try { localStorage.setItem(LS_MANUSCRIPT_HISTORY, JSON.stringify(manuscriptHistory)); } catch (e) {}
      }
    }
  } catch (e) {}
})();
(function loadSlideHistory() {
  try {
    var raw = localStorage.getItem(LS_SLIDE_HISTORY);
    if (raw) slideHistory = JSON.parse(raw);
  } catch (e) {}
})();
(function loadAllSlideHistory() {
  try {
    var raw = localStorage.getItem(LS_ALL_SLIDE_HISTORY);
    if (raw) allSlideHistory = JSON.parse(raw);
  } catch (e) {}
})();

// Saved Reference Library (persistent)
function getSavedRefList() { try { return JSON.parse(localStorage.getItem(LS_SAVED_REF_LIST) || '[]'); } catch { return []; } }
function saveRefList(list) { localStorage.setItem(LS_SAVED_REF_LIST, JSON.stringify(list)); }
function addToSavedList(data) {
  const list = getSavedRefList();
  if (!list.find(r => r.title === data.title && r.authors === data.authors)) {
    list.unshift({ ...data, savedAt: new Date().toISOString() });
    saveRefList(list);
  }
}

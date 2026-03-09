// =========================================================
// state.js — 전역 상수·상태·ReferenceStore·_exposeSlideGenGlobals
// (index.js 리사이즈 Phase 1.1)
// =========================================================

/* =========================================================
   STATE
   ========================================================= */
const LS_ACTIVE_KEY = 'ss_active_key', LS_KEYS_LIST = 'ss_keys', LS_SESSIONS = 'ss_sessions_v3', LS_SAVED_REF_LIST = 'ss_saved_ref_list';
let rawText = '', fileName = '', slides = [], sources = [], activeSlideIndex = 0;
let leftTab = 'summary', rightTab = 'mdeditor', summaryText = '', presentationScript = [];
let slideStyle = 'light', presIndex = 0, presNotesVisible = false;
let _presFromCurrent = false;
let writingStyle = 'academic-da';
let _abortController = null;
if (typeof window !== 'undefined') {
  window._translatedSummary = '';
  window._translatedRaw = '';
}
let _currentCropImg = null, _cropDragging = false, _cropDragStart = null, _cropSelection = { x: 0, y: 0, w: 0, h: 0 }, _cropDispScale = 1, _cropDisplayW = 0, _cropDisplayH = 0, _finalCroppedDataURL = null, _targetSlideForImage = null;
let _penTool = 'pointer', _penColor = '#f87171', _penDrawing = false, _penOpacity = 0.05, _penLastX = 0, _penLastY = 0, _presCtx = null;
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
  window.getRawText = function () { return rawText; };
  window.getSummaryText = function () { return summaryText; };
  window.setSummaryText = function (t) { summaryText = t; };
  window.getLeftTab = function () { return leftTab; };
  window.setLeftTab = function (t) { leftTab = t; };
  window.getPresentationScript = function () { return presentationScript; };
  window.setPresentationScript = function (p) { presentationScript = p; };
  window.getActiveSlideIndex = function () { return activeSlideIndex; };
  window.setActiveSlideIndex = function (i) { activeSlideIndex = i; };
  window.getSlideStyle = function () { return slideStyle; };
  window.getWritingStyle = function () { return writingStyle; };
}
_exposeSlideGenGlobals();

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

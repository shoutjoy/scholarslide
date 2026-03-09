/* =========================================================
   STATE
   ========================================================= */
let rawText = '', fileName = '', slides = [], sources = [], activeSlideIndex = 0;
let leftTab = 'summary', rightTab = 'mdeditor', summaryText = '', presentationScript = [];
let slideStyle = 'light', presIndex = 0, presNotesVisible = false;
let writingStyle = 'academic-da'; // 'academic-da' | 'academic-im' | 'polite'
let _abortController = null;

// Translation cache
let _translatedSummary = '';
let _translatedRaw = '';

// Image crop state
let _currentCropImg = null, _cropDragging = false, _cropDragStart = null;
let _cropSelection = { x: 0, y: 0, w: 0, h: 0 };
let _cropDispScale = 1, _cropDisplayW = 0, _cropDisplayH = 0;
let _finalCroppedDataURL = null, _targetSlideForImage = null;

// Pen state
let _penTool = 'pointer', _penColor = '#f87171', _penDrawing = false;
let _penOpacity = 0.05; // default 5%
let _penLastX = 0, _penLastY = 0;
let _presCtx = null;

const LS_ACTIVE_KEY = 'ss_active_key', LS_KEYS_LIST = 'ss_keys', LS_SESSIONS = 'ss_sessions_v3';
const LS_SAVED_REF_LIST = 'ss_saved_ref_list';
let _activeApiKey = '';

// Background image generation job state
let _bgJob = { running: false, total: 0, done: 0, label: '' };
let _bgJobCancelled = false;

// Image generation state (for API key from input)
let _imageApiKey = ''; // overrides _activeApiKey for image generation if set

// Slide zoom state
let _slideZoom = 100; // percent

// Global Background progress bar (Header left)
let _globalProgressTimer = null;

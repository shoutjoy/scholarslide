/**
 * ScholarSlide — 전체 앱 다크/라이트 테마 (헤더 토글)
 * js/ui/app-theme.js — index에 넣지 않고 UI 폴더에 분리
 */
(function (global) {
  'use strict';

  var LS_APP_THEME = 'ss_app_theme';
  var THEME_DARK = 'dark';
  var THEME_LIGHT = 'light';

  function getAppTheme() {
    var saved = '';
    try { saved = (localStorage.getItem(LS_APP_THEME) || '').toLowerCase(); } catch (e) {}
    return saved === THEME_LIGHT ? THEME_LIGHT : THEME_DARK;
  }

  function setAppTheme(theme) {
    var next = theme === THEME_LIGHT ? THEME_LIGHT : THEME_DARK;
    try { localStorage.setItem(LS_APP_THEME, next); } catch (e) {}
    applyAppTheme(next);
    renderAppThemeToggle();
  }

  function applyAppTheme(theme) {
    var body = global.document && global.document.body;
    if (!body) return;
    body.classList.remove('app-theme-dark', 'app-theme-light');
    body.classList.add(theme === THEME_LIGHT ? 'app-theme-light' : 'app-theme-dark');
  }

  function renderAppThemeToggle() {
    var container = global.document && global.document.getElementById('app-theme-toggle');
    if (!container) return;
    var theme = getAppTheme();
    container.innerHTML =
      '<span style="display:inline-flex;align-items:center;gap:2px;margin-right:6px" title="전체 앱 다크/라이트">' +
      '<button type="button" class="btn btn-ghost btn-sm app-theme-btn' + (theme === THEME_LIGHT ? ' active' : '') + '" id="app-theme-light" aria-label="라이트">☀️ 라이트</button>' +
      '<button type="button" class="btn btn-ghost btn-sm app-theme-btn' + (theme === THEME_DARK ? ' active' : '') + '" id="app-theme-dark" aria-label="다크">🌙 다크</button>' +
      '</span>';
    var lightBtn = global.document.getElementById('app-theme-light');
    var darkBtn = global.document.getElementById('app-theme-dark');
    if (lightBtn) lightBtn.addEventListener('click', function () { setAppTheme(THEME_LIGHT); });
    if (darkBtn) darkBtn.addEventListener('click', function () { setAppTheme(THEME_DARK); });
  }

  function initAppTheme() {
    var theme = getAppTheme();
    applyAppTheme(theme);
    renderAppThemeToggle();
  }

  if (global.document && global.document.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', initAppTheme);
  } else {
    initAppTheme();
  }

  if (typeof global !== 'undefined') {
    global.setAppTheme = setAppTheme;
    global.getAppTheme = getAppTheme;
    global.initAppTheme = initAppTheme;
  }
})(typeof window !== 'undefined' ? window : this);

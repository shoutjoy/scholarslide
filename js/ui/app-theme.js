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
      '<button type="button" class="app-theme-toggle-btn" id="app-theme-toggle-btn" aria-label="다크/라이트 모드 전환" title="앱 다크/라이트 모드 전환"></button>';
    var btn = global.document.getElementById('app-theme-toggle-btn');
    if (btn) {
      btn.addEventListener('click', function () {
        setAppTheme(theme === THEME_DARK ? THEME_LIGHT : THEME_DARK);
      });
    }
  }

  function initAppTheme() {
    var theme = getAppTheme();
    applyAppTheme(theme);
    renderAppThemeToggle();
  }

  function toggleAppTheme() {
    var next = getAppTheme() === THEME_DARK ? THEME_LIGHT : THEME_DARK;
    setAppTheme(next);
  }

  if (global.document && global.document.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', initAppTheme);
  } else {
    initAppTheme();
  }

  global.document.addEventListener('keydown', function (e) {
    if (e.altKey && e.key === '4') {
      e.preventDefault();
      toggleAppTheme();
    }
  });

  if (typeof global !== 'undefined') {
    global.setAppTheme = setAppTheme;
    global.getAppTheme = getAppTheme;
    global.initAppTheme = initAppTheme;
    global.toggleAppTheme = toggleAppTheme;
  }
})(typeof window !== 'undefined' ? window : this);

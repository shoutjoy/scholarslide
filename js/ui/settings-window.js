/**
 * ScholarSlide — 설정 패널 (앱 내부 모달)
 * 기타 설정 | API 키 설정 | 프롬프트 설정 탭
 * 닫기, 전체화면 지원
 */
(function (global) {
  'use strict';

  var LS_ACTIVE_KEY = 'ss_active_key';
  var LS_KEYS_LIST = 'ss_keys';
  var LS_IMAGE_MODEL = 'ss_image_model';
  var LS_PROMPT_OVERRIDES = 'ss_prompt_overrides';
  var LS_DEFAULT_SLIDE_COUNT = 'ss_default_slide_count';
  var LS_DEFAULT_INCLUDE_COVER = 'ss_default_include_cover';

  function getSettingsPanelContent() {
    var parent = 'window._settingsParent';
    return '<style>' +
      '.sw-tabs{display:flex;gap:4px;margin-bottom:16px;flex-shrink:0}' +
      '.sw-tab{padding:8px 14px;background:var(--surface2);border:1px solid var(--border2);border-radius:8px;color:var(--text2);cursor:pointer;font-size:13px}' +
      '.sw-tab:hover{background:var(--surface3);color:var(--text)}.sw-tab.active{background:var(--accent);border-color:var(--accent);color:#fff}' +
      '.sw-panel{display:none}.sw-panel.active{display:block}' +
      '.sw-panel label{display:block;font-size:12px;font-weight:500;color:var(--text2);margin-bottom:6px}' +
      '.sw-panel input,.sw-panel select,.sw-panel textarea{width:100%;padding:10px 12px;background:var(--surface2);border:1px solid var(--border2);border-radius:8px;color:var(--text);font-size:13px}' +
      '.sw-panel textarea{min-height:80px;resize:vertical}' +
      '.sw-panel .btn{padding:8px 14px;border-radius:8px;font-size:13px;cursor:pointer;border:none}' +
      '.sw-panel .btn-primary{background:var(--accent);color:#fff}.sw-panel .btn-ghost{background:transparent;color:var(--text2);border:1px solid var(--border2)}' +
      '.sw-panel .btn-ghost:hover{background:var(--surface3);color:var(--text)}' +
      '.sw-panel .prompt-item{margin-bottom:16px}.sw-panel .prompt-item label{font-size:11px;color:var(--text3)}' +
      '.sw-panel .key-row{display:flex;align-items:center;gap:8px;padding:8px;background:var(--surface2);border-radius:6px;margin-bottom:6px;font-size:12px}' +
      '</style>' +
      '<div class="sw-tabs">' +
      '<button class="sw-tab active" data-tab="misc">기타 설정</button>' +
      '<button class="sw-tab" data-tab="api">API 키 설정</button>' +
      '<button class="sw-tab" data-tab="prompts">프롬프트 설정</button>' +
      '</div>' +
      '<div id="sw-panel-misc" class="sw-panel active">' +
      '<p style="color:var(--text3);font-size:12px;margin-bottom:16px">슬라이드 생성 시 사용할 기본값을 미리 설정합니다.</p>' +
      '<label>기본 슬라이드 수 (페이지)</label>' +
      '<input type="number" id="sw-misc-default-slide-count" min="5" max="30" value="15" style="width:80px;margin-bottom:12px">' +
      '<label style="display:flex;align-items:center;gap:8px;margin-top:12px;font-size:12px;cursor:pointer"><input type="checkbox" id="sw-misc-default-include-cover" checked> 표지 포함 기본값</label>' +
      '<label style="margin-top:12px">기본 슬라이드 생성 유형</label>' +
      '<select id="sw-misc-default-slide-gen-type" style="width:100%;max-width:320px;margin-top:4px">' +
      '<option value="precision">A. 정밀 요약형</option><option value="presentation">B. 발표 최적화형</option><option value="notebook">C. 노트북/학습형</option>' +
      '<option value="critical">D. 비판적 검토형</option><option value="evidence">E. 시각적 증거형</option><option value="logic">F. 인과관계 도식형</option>' +
      '<option value="quiz">G. 상호작용형</option><option value="workshop">H. 워크숍형</option></select>' +
      '<div style="margin-top:16px"><button class="btn btn-primary" id="sw-misc-apply-btn">적용</button></div>' +
      '</div>' +
      '<div id="sw-panel-api" class="sw-panel">' +
      '<p style="color:var(--text2);font-size:12px;margin-bottom:12px"><a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" style="color:var(--accent)">Google AI Studio</a>에서 발급한 API 키를 입력하세요.</p>' +
      '<label>API 키</label>' +
      '<div style="position:relative">' +
      '<input type="password" id="sw-api-key-field" placeholder="AIza..." autocomplete="off" style="padding-right:40px">' +
      '<button type="button" class="btn btn-ghost" style="position:absolute;right:4px;top:50%;transform:translateY(-50%);padding:4px 8px" id="sw-key-toggle" title="표시/숨기기">👁</button>' +
      '</div>' +
      '<div id="sw-key-strength-bar" style="display:none;margin-top:8px"><div id="sw-key-strength-fill" style="width:0%;height:6px;background:var(--accent);border-radius:3px"></div></div>' +
      '<span id="sw-key-strength-label" style="font-size:11px;color:var(--text3)"></span>' +
      '<div id="sw-saved-keys-section" style="margin-top:16px;display:none"><label>저장된 키 목록</label><div id="sw-saved-keys-list" class="saved-keys-list"></div></div>' +
      '<label style="margin-top:16px">이미지 생성 모델</label>' +
      '<select id="sw-image-model-select" style="width:100%;max-width:480px;margin-top:4px">' +
      '<option value="gemini-2.5-flash-preview-image-generation">gemini-2.5-flash-preview-image-generation</option>' +
      '<option value="gemini-2.5-flash-image">gemini-2.5-flash-image</option>' +
      '<option value="gemini-3.1-flash-image-preview">gemini-3.1-flash-image-preview</option>' +
      '<option value="gemini-3-pro-image-preview">gemini-3-pro-image-preview</option>' +
      '<option value="gemini-2.0-flash-exp">gemini-2.0-flash-exp</option>' +
      '<option value="imagen-4.0-generate-001">imagen-4.0-generate-001</option>' +
      '</select>' +
      '<label style="display:flex;align-items:center;gap:8px;margin-top:12px;font-size:12px;cursor:pointer"><input type="checkbox" id="sw-save-key-checkbox" checked> 브라우저에 저장</label>' +
      '<div style="margin-top:16px"><button class="btn btn-primary" id="sw-api-apply-btn">적용</button></div>' +
      '</div>' +
      '<div id="sw-panel-prompts" class="sw-panel">' +
      '<p style="color:var(--text3);font-size:12px;margin-bottom:8px">요약·번역·슬라이드 생성 등에 사용되는 프롬프트를 사전 설정합니다.</p>' +
      '<div style="margin-bottom:12px"><button class="btn btn-ghost" id="sw-prompt-load-defaults">기본값 불러오기</button> <button class="btn btn-ghost" id="sw-prompt-apply-upgrade">슬라이드 생성 업그레이드 적용</button> <button class="btn btn-primary" id="sw-prompt-save-btn">저장</button></div>' +
      '<div id="sw-prompts-container"></div>' +
      '</div>';
  }

  function initSettingsPanelScript() {
    var LS_ACTIVE_KEY = 'ss_active_key';
    var LS_KEYS_LIST = 'ss_keys';
    var LS_IMAGE_MODEL = 'ss_image_model';
    var LS_PROMPT_OVERRIDES = 'ss_prompt_overrides';
    var win = window;

    function $(id) { return document.getElementById(id); }
    function loadSavedKeys() { try { return JSON.parse(localStorage.getItem(LS_KEYS_LIST) || '[]'); } catch (e) { return []; } }
    function saveKeysList(list) { localStorage.setItem(LS_KEYS_LIST, JSON.stringify(list)); }
    function maskKey(k) { if (!k || k.length < 12) return k; return k.slice(0, 6) + '••••••••' + k.slice(-4); }

    function updateStrength() {
      var val = ($('sw-api-key-field') && $('sw-api-key-field').value) || '';
      var bar = $('sw-key-strength-bar');
      var fill = $('sw-key-strength-fill');
      var lbl = $('sw-key-strength-label');
      if (!bar || !fill || !lbl) return;
      if (!val) { bar.style.display = 'none'; return; }
      bar.style.display = 'block';
      var s = 0;
      if (val.indexOf('AIza') === 0) s += 50;
      if (val.length >= 35) s += 30;
      if (val.length >= 39) s += 20;
      fill.style.width = s + '%';
      if (s >= 100) { lbl.textContent = '✓ 유효한 형식'; lbl.style.color = 'var(--success)'; }
      else if (s >= 50) { lbl.textContent = '⚠ 확인 필요'; lbl.style.color = 'var(--warning)'; }
      else { lbl.textContent = '✗ AIza로 시작'; lbl.style.color = 'var(--danger)'; }
    }

    function renderSavedKeys() {
      var keys = loadSavedKeys();
      var section = $('sw-saved-keys-section');
      var list = $('sw-saved-keys-list');
      var active = localStorage.getItem(LS_ACTIVE_KEY) || '';
      if (!section || !list) return;
      if (!keys.length) { section.style.display = 'none'; return; }
      section.style.display = 'block';
      list.innerHTML = keys.map(function (k, i) {
        return '<div class="key-row"><span class="mask" style="flex:1">' + maskKey(k) + '</span>' +
          (k === active ? '<span style="color:var(--success);font-size:11px">사용 중</span>' : '') +
          '<button class="btn btn-ghost" onclick="window._swSelectKey(' + i + ')">선택</button>' +
          '<button class="btn btn-ghost" onclick="window._swDeleteKey(' + i + ')">삭제</button></div>';
      }).join('');
    }

    window._swSelectKey = function (i) {
      var keys = loadSavedKeys();
      if (!keys[i]) return;
      localStorage.setItem(LS_ACTIVE_KEY, keys[i]);
      var f = $('sw-api-key-field');
      if (f) f.value = keys[i];
      updateStrength();
      renderSavedKeys();
      if (typeof win.syncApiKeyFromStorage === 'function') win.syncApiKeyFromStorage();
    };
    window._swDeleteKey = function (i) {
      var keys = loadSavedKeys();
      var del = keys[i];
      keys.splice(i, 1);
      saveKeysList(keys);
      var active = localStorage.getItem(LS_ACTIVE_KEY) || '';
      if (del === active) {
        var next = keys[0] || '';
        localStorage.setItem(LS_ACTIVE_KEY, next);
        var f = $('sw-api-key-field');
        if (f) f.value = next;
        if (typeof win.syncApiKeyFromStorage === 'function') win.syncApiKeyFromStorage();
      }
      updateStrength();
      renderSavedKeys();
    };

    document.querySelectorAll('#settings-panel-root .sw-tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var t = this.getAttribute('data-tab');
        document.querySelectorAll('#settings-panel-root .sw-tab').forEach(function (b) { b.classList.remove('active'); });
        document.querySelectorAll('#settings-panel-root .sw-panel').forEach(function (p) { p.classList.remove('active'); });
        this.classList.add('active');
        var panel = $('sw-panel-' + t);
        if (panel) panel.classList.add('active');
      });
    });

    var miscCount = $('sw-misc-default-slide-count');
    var miscCover = $('sw-misc-default-include-cover');
    var miscType = $('sw-misc-default-slide-gen-type');
    if (miscCount) miscCount.value = localStorage.getItem('ss_default_slide_count') || '15';
    if (miscCover) miscCover.checked = localStorage.getItem('ss_default_include_cover') !== 'false';
    if (miscType) miscType.value = localStorage.getItem('ss_slide_gen_type') || 'precision';

    var miscBtn = $('sw-misc-apply-btn');
    if (miscBtn) miscBtn.addEventListener('click', function () {
      if (miscCount) localStorage.setItem('ss_default_slide_count', miscCount.value || '15');
      if (miscCover) localStorage.setItem('ss_default_include_cover', miscCover.checked ? 'true' : 'false');
      if (miscType) localStorage.setItem('ss_slide_gen_type', miscType.value || 'precision');
      if (typeof win.renderLeftPanel === 'function') win.renderLeftPanel();
      if (typeof win.showToast === 'function') win.showToast('✅ 슬라이드 기본값 적용됨');
    });

    var apiField = $('sw-api-key-field');
    if (apiField) apiField.addEventListener('input', updateStrength);

    var keyToggle = $('sw-key-toggle');
    if (keyToggle) keyToggle.addEventListener('click', function () {
      var f = $('sw-api-key-field');
      if (f) { f.type = f.type === 'password' ? 'text' : 'password'; this.textContent = f.type === 'password' ? '👁' : '🙈'; }
    });

    var apiApply = $('sw-api-apply-btn');
    if (apiApply) apiApply.addEventListener('click', function () {
      var val = ($('sw-api-key-field') && $('sw-api-key-field').value.trim()) || '';
      if (!val) { if (typeof win.showToast === 'function') win.showToast('⚠️ API 키를 입력하세요'); return; }
      localStorage.setItem(LS_ACTIVE_KEY, val);
      var imgSel = $('sw-image-model-select');
      if (imgSel) localStorage.setItem(LS_IMAGE_MODEL, imgSel.value);
      if ($('sw-save-key-checkbox') && $('sw-save-key-checkbox').checked) {
        var keys = loadSavedKeys();
        if (keys.indexOf(val) === -1) { keys.unshift(val); if (keys.length > 5) keys.pop(); saveKeysList(keys); }
      }
      if (typeof win.syncApiKeyFromStorage === 'function') win.syncApiKeyFromStorage();
      if (typeof win.showToast === 'function') win.showToast('✅ API 키 적용됨');
      renderSavedKeys();
    });

    var activeKey = localStorage.getItem(LS_ACTIVE_KEY) || '';
    if (apiField) apiField.value = activeKey;
    updateStrength();
    renderSavedKeys();

    var imgSel = $('sw-image-model-select');
    if (imgSel) imgSel.value = localStorage.getItem(LS_IMAGE_MODEL) || 'gemini-2.5-flash-image';

    function loadPrompts() {
      var defaults = (typeof win.getDefaultPrompts === 'function' && win.getDefaultPrompts()) || {};
      var overrides = {};
      try { var raw = localStorage.getItem(LS_PROMPT_OVERRIDES); if (raw) overrides = JSON.parse(raw); } catch (e) {}
      var html = '';
      for (var key in defaults) {
        if (!defaults.hasOwnProperty(key)) continue;
        var d = defaults[key];
        var val = overrides[key] !== undefined && overrides[key] !== null ? String(overrides[key]) : (d.value || '');
        var esc = val.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        var rows = key === 'slide_gen_system' ? 14 : (key === 'imggen_vis_prompt_instruction' || key === 'imggen_vis_prompt_system' ? 8 : 4);
        html += '<div class="prompt-item"><label>' + key + ' — ' + (d.label || key) + '</label><textarea data-key="' + key + '" rows="' + rows + '">' + esc + '</textarea></div>';
      }
      var container = $('sw-prompts-container');
      if (container) container.innerHTML = html || '<p style="color:var(--text3)">기본 프롬프트 목록을 불러오려면 새로고침하세요.</p>';
    }

    var loadDefaultsBtn = $('sw-prompt-load-defaults');
    if (loadDefaultsBtn) loadDefaultsBtn.addEventListener('click', function () {
      var defaults = (typeof win.getDefaultPrompts === 'function' && win.getDefaultPrompts()) || {};
      document.querySelectorAll('#settings-panel-root #sw-prompts-container textarea').forEach(function (ta) {
        var key = ta.getAttribute('data-key');
        var d = defaults[key];
        if (d && d.value) ta.value = d.value;
      });
    });

    var applyUpgradeBtn = $('sw-prompt-apply-upgrade');
    if (applyUpgradeBtn) applyUpgradeBtn.addEventListener('click', function () {
      if (typeof win.applySlideGenUpgrade === 'function') win.applySlideGenUpgrade();
      var d = (typeof win.getDefaultPrompts === 'function' && win.getDefaultPrompts()) || {};
      if (d && d.slide_gen_system && d.slide_gen_system.value) {
        var ta = document.querySelector('#settings-panel-root textarea[data-key="slide_gen_system"]');
        if (ta) ta.value = d.slide_gen_system.value;
      }
      if (typeof win.showToast === 'function') win.showToast('✅ 슬라이드 생성 업그레이드 적용됨');
    });

    var saveBtn = $('sw-prompt-save-btn');
    if (saveBtn) saveBtn.addEventListener('click', function () {
      var overrides = {};
      document.querySelectorAll('#settings-panel-root #sw-prompts-container textarea').forEach(function (ta) {
        var key = ta.getAttribute('data-key');
        var v = ta.value.trim();
        if (key) overrides[key] = v;
      });
      localStorage.setItem(LS_PROMPT_OVERRIDES, JSON.stringify(overrides));
      if (typeof win.setPromptOverrides === 'function') win.setPromptOverrides(overrides);
      if (typeof win.showToast === 'function') win.showToast('✅ 프롬프트 저장됨');
    });

    loadPrompts();
  }

  function openSettingsPanel() {
    var root = document.getElementById('settings-panel-root');
    var modal = document.getElementById('settings-modal');
    var box = document.getElementById('settings-modal-box');
    if (!root || !modal || !box) return;
    root.innerHTML = getSettingsPanelContent();
    box.classList.remove('settings-fullscreen');
    initSettingsPanelScript();
    modal.classList.add('open');
  }

  function toggleSettingsFullscreen() {
    var box = document.getElementById('settings-modal-box');
    var btn = document.getElementById('settings-fullscreen-btn');
    if (box) {
      box.classList.toggle('settings-fullscreen');
      if (btn) btn.textContent = box.classList.contains('settings-fullscreen') ? '⊟ 축소' : '⊞ 전체화면';
    }
  }

  if (typeof global !== 'undefined') {
    global.openSettingsPanel = openSettingsPanel;
    global.toggleSettingsFullscreen = toggleSettingsFullscreen;
    global.getSettingsPanelContent = getSettingsPanelContent;
  }
})(typeof window !== 'undefined' ? window : this);

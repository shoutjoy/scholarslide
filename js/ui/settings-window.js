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
  var LS_TEXT_MODEL = 'ss_text_model';
  var LS_PROMPT_OVERRIDES = 'ss_prompt_overrides';
  var LS_DEFAULT_SLIDE_COUNT = 'ss_default_slide_count';
  var LS_DEFAULT_INCLUDE_COVER = 'ss_default_include_cover';
  var LS_USER_INFO = 'ss_user_info';
  var LS_SCHOLARAI_PRESET = 'ss_scholara_i_preset';

  function getSettingsPanelContent() {
    var parent = 'window._settingsParent';
    return '<style>' +
      '.sw-tabs{display:flex;gap:4px;margin-bottom:16px;flex-shrink:0}' +
      '.sw-tab{padding:8px 14px;background:var(--surface2);border:1px solid var(--border2);border-radius:6px;color:var(--text2);cursor:pointer;font-size:12px}' +
      '.sw-tab:hover{background:var(--surface3);color:var(--text2)}.sw-tab.active{background:var(--accent);border-color:var(--accent);color:#fff}' +
      '.sw-prompt-filter-btn.active{background:var(--surface3);color:var(--accent);border-color:var(--accent)}' +
      '.sw-panel{display:none}.sw-panel.active{display:block}' +
      '.sw-panel label{display:block;font-size:12px;font-weight:500;color:var(--text2);margin-bottom:6px}' +
      '.sw-panel input,.sw-panel select,.sw-panel textarea{width:100%;padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:6px;color:var(--text2);font-size:13px;font-family:JetBrains Mono,Noto Sans KR,monospace}' +
      '.sw-panel textarea{min-height:80px;resize:vertical}' +
      '.sw-panel .btn{padding:6px 12px;border-radius:6px;font-size:12px;cursor:pointer;border:none}' +
      '.sw-panel .btn-primary{background:var(--accent);color:#fff}.sw-panel .btn-primary:hover{opacity:0.9}' +
      '.sw-panel .btn-ghost{background:var(--surface2);color:var(--text2);border:1px solid var(--border2)}.sw-panel .btn-ghost:hover{background:var(--surface3);color:var(--text)}' +
      '.sw-panel .prompt-item{margin-bottom:16px}.sw-panel .prompt-item label{font-size:11px;color:var(--warning);font-weight:600}' +
      '.sw-panel .prompt-category{margin-top:20px;margin-bottom:12px;padding-bottom:6px;border-bottom:1px solid var(--border2);font-size:13px;font-weight:600;color:var(--accent)}' +
      '.sw-panel .prompt-category:first-child{margin-top:0}' +
      '.sw-panel .key-row{display:flex;align-items:center;gap:8px;padding:8px;background:var(--surface);border:1px solid var(--border);border-radius:6px;margin-bottom:6px;font-size:12px;color:var(--text2)}' +
      '#settings-panel-root{background:var(--bg);color:var(--text2)}' +
      '</style>' +
      '<div class="sw-tabs">' +
      '<button class="sw-tab active" data-tab="misc">기타 설정</button>' +
      '<button class="sw-tab" data-tab="api">API 키 설정</button>' +
      '<button class="sw-tab" data-tab="prompts">프롬프트 설정</button>' +
      '</div>' +
      '<div id="sw-panel-misc" class="sw-panel active">' +
      '<p style="color:var(--text2);font-size:12px;margin-bottom:16px">슬라이드 생성 시 사용할 기본값을 미리 설정합니다.</p>' +
      '<div style="margin-bottom:20px;padding:12px;background:var(--surface);border-radius:6px;border:1px solid var(--border)">' +
      '<label style="display:block;font-size:12px;font-weight:600;color:var(--text2);margin-bottom:10px">사용자 정보 (요약문서 제목 아래에 표시)</label>' +
      '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;margin-bottom:8px">' +
      '<input type="text" id="sw-user-name" placeholder="이름" class="control" style="width:80px;padding:6px 12px;font-size:12px">' +
      '<label style="display:flex;align-items:center;gap:4px;font-size:11px;cursor:pointer;margin:0;color:var(--text2)"><input type="checkbox" id="sw-user-name-v"> v</label>' +
      '<input type="text" id="sw-user-affiliation" placeholder="소속" class="control" style="width:100px;padding:6px 12px;font-size:12px">' +
      '<label style="display:flex;align-items:center;gap:4px;font-size:11px;cursor:pointer;margin:0;color:var(--text2)"><input type="checkbox" id="sw-user-affiliation-v"> v</label>' +
      '<input type="text" id="sw-user-email" placeholder="메일" class="control" style="width:120px;padding:6px 12px;font-size:12px">' +
      '<label style="display:flex;align-items:center;gap:4px;font-size:11px;cursor:pointer;margin:0;color:var(--text2)"><input type="checkbox" id="sw-user-email-v"> v</label>' +
      '<input type="text" id="sw-user-phone" placeholder="연락처" class="control" style="width:100px;padding:6px 12px;font-size:12px">' +
      '<label style="display:flex;align-items:center;gap:4px;font-size:11px;cursor:pointer;margin:0;color:var(--text2)"><input type="checkbox" id="sw-user-phone-v"> v</label>' +
      '<button class="btn btn-primary btn-sm" id="sw-user-save">save</button>' +
      '</div><p style="font-size:10px;color:var(--text2);margin:0">체크된 항목만 요약문서 제목 아래에 표시됩니다.</p></div>' +
      '<label>기본 슬라이드 수 (페이지)</label>' +
      '<input type="number" id="sw-misc-default-slide-count" min="5" max="200" value="15" style="width:80px;margin-bottom:12px">' +
      '<label style="display:flex;align-items:center;gap:8px;margin-top:12px;font-size:12px;cursor:pointer"><input type="checkbox" id="sw-misc-default-include-cover" checked> 표지 포함 기본값</label>' +
      '<div class="sw-visibility-section" style="margin-top:16px;padding:12px;background:var(--surface);border:1px solid var(--border);border-radius:6px">' +
      '<div style="font-size:12px;font-weight:600;color:var(--text2);margin-bottom:10px">표시 설정 (탭별)</div>' +
      '<p style="font-size:10px;color:var(--text3);margin-bottom:12px">각 탭에서 표시할 항목을 선택합니다.</p>' +
      '<div style="display:flex;gap:24px;flex-wrap:wrap;align-items:flex-start">' +
      '<div style="min-width:100px"><div style="font-size:11px;font-weight:600;color:var(--accent);margin-bottom:8px">원문</div>' +
      '<label style="display:flex;align-items:center;gap:6px;font-size:11px;cursor:pointer;margin-bottom:6px"><input type="checkbox" id="sw-misc-show-writing-style-raw"> 문체설정 보이기</label>' +
      '<label style="display:flex;align-items:center;gap:6px;font-size:11px;cursor:pointer"><input type="checkbox" id="sw-misc-show-custom-raw"> 커스텀 지시사항 보이기</label></div>' +
      '<div style="min-width:100px"><div style="font-size:11px;font-weight:600;color:var(--accent);margin-bottom:8px">요약</div>' +
      '<label style="display:flex;align-items:center;gap:6px;font-size:11px;cursor:pointer;margin-bottom:6px"><input type="checkbox" id="sw-misc-show-writing-style-summary"> 문체설정 보이기</label>' +
      '<label style="display:flex;align-items:center;gap:6px;font-size:11px;cursor:pointer"><input type="checkbox" id="sw-misc-show-custom-summary"> 커스텀 지시사항 보이기</label></div>' +
      '<div style="min-width:100px"><div style="font-size:11px;font-weight:600;color:var(--accent);margin-bottom:8px">원고</div>' +
      '<label style="display:flex;align-items:center;gap:6px;font-size:11px;cursor:pointer;margin-bottom:6px"><input type="checkbox" id="sw-misc-show-slide-gen-type-manuscript"> 슬라이드생성유형 보이기</label>' +
      '<label style="display:flex;align-items:center;gap:6px;font-size:11px;cursor:pointer"><input type="checkbox" id="sw-misc-show-custom-manuscript"> 커스텀 프롬프트 보이기</label></div>' +
      '</div></div>' +
      '<label style="margin-top:12px">페이지 범위 기본값 (All Slide 등)</label>' +
      '<div style="display:flex;align-items:center;gap:8px;margin-top:4px;margin-bottom:12px">' +
      '<input type="number" id="sw-misc-range-min" min="1" max="999" placeholder="최소" style="width:72px">' +
      '<span style="color:var(--text3)">~</span>' +
      '<input type="number" id="sw-misc-range-max" min="1" max="999" placeholder="최대" style="width:72px">' +
      '</div>' +
      '<label style="margin-top:12px">기본 슬라이드 생성 유형</label>' +
      '<select id="sw-misc-default-slide-gen-type" style="width:100%;max-width:320px;margin-top:4px">' +
      '<option value="precision">A. 정밀 요약형</option><option value="presentation">B. 발표 최적화형</option><option value="notebook">C. 노트북/학습형</option>' +
      '<option value="critical">D. 비판적 검토형</option><option value="evidence">E. 시각적 증거형</option><option value="logic">F. 인과관계 도식형</option>' +
      '<option value="quiz">G. 상호작용형</option><option value="workshop">H. 워크숍형</option><option value="auto_visual">I. AII 자동 시각화형</option></select>' +
      '<label style="margin-top:16px">원문 요약 글자 수</label>' +
      '<input type="number" id="sw-misc-summary-char-limit" min="10000" max="2000000" step="1000" value="1500000" style="width:120px;margin-top:4px;margin-bottom:4px">' +
      '<p style="font-size:10px;color:var(--text2);margin:0 0 12px 0">요약 시 원문에서 사용할 최대 글자 수 (기본 1,500,000자)</p>' +
      '<label style="margin-top:16px">IMGSAVE URL (프로젝트 저장 모달의 IMGSAVE 링크 주소)</label>' +
      '<input type="url" id="sw-misc-imgsave-url" placeholder="https://imgbb.com/" style="width:100%;max-width:400px;margin-top:4px;margin-bottom:4px">' +
      '<p style="font-size:10px;color:var(--text2);margin:0 0 12px 0">이미지 업로드 사이트 주소. 기본: imgbb.com</p>' +
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
      '<label style="margin-top:16px">ScholarAI model</label>' +
      '<select id="sw-text-model-select" style="width:100%;max-width:320px;margin-top:4px">' +
      '<option value="gemini-2.5-pro">Gemini 2.5 Pro</option>' +
      '<option value="gemini-2.5-flash">Gemini 2.5 Flash</option>' +
      '<option value="gemini-3-flash-preview">Gemini 3 Flash</option>' +
      '<option value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite</option>' +
      '</select>' +
      '<label style="margin-top:16px">이미지 생성 모델</label>' +
      '<select id="sw-image-model-select" style="width:100%;max-width:480px;margin-top:4px">' +
      '<option value="gemini-2.0-flash-exp-image-generation">Gemini 2.0 Flash (Image Generation)</option>' +
      '<option value="gemini-2.5-flash-image">Nano Banana (Gemini 2.5 Flash 이미지)</option>' +
      '<option value="gemini-3.1-flash-image-preview">Nano Banana 2 (Gemini 3.1 Flash)</option>' +
      '<option value="gemini-3-pro-image-preview">Nano Banana Pro (Gemini 3 Pro)</option>' +
      '<option value="imagen-4.0-generate-001">Imagen 4</option>' +
      '<option value="imagen-4.0-ultra-generate-001">Imagen 4 Ultra</option>' +
      '<option value="imagen-4.0-fast-generate-001">Imagen 4 Fast</option>' +
      '</select>' +
      '<label style="display:flex;align-items:center;gap:8px;margin-top:12px;font-size:12px;cursor:pointer"><input type="checkbox" id="sw-save-key-checkbox" checked> 브라우저에 저장</label>' +
      '<div style="margin-top:16px"><button class="btn btn-primary" id="sw-api-apply-btn">적용</button></div>' +
      '</div>' +
      '<div id="sw-panel-prompts" class="sw-panel">' +
      '<p style="color:var(--text2);font-size:12px;margin-bottom:8px">요약·번역·슬라이드 생성 등에 사용되는 프롬프트를 사전 설정합니다.</p>' +
      '<label style="margin-bottom:6px">ScholarAI에서 사전 프롬프트 선택</label>' +
      '<select id="sw-scholara-i-preset-select" style="width:100%;max-width:320px;margin-bottom:12px">' +
      '<option value="none">사전프롬프트없음</option>' +
      '<option value="scholar_ai">scholarAI prompt</option>' +
      '<option value="apa_search">APA search Prompt</option>' +
      '</select>' +
      '<div style="margin-bottom:12px"><button class="btn btn-ghost" id="sw-prompt-load-defaults">기본값 불러오기</button> <button class="btn btn-ghost" id="sw-prompt-apply-upgrade">슬라이드 생성 업그레이드 적용</button> <button class="btn btn-primary" id="sw-prompt-save-btn">저장</button> <button class="btn btn-ghost" id="sw-prompt-export-btn">프롬프트 내보내기</button> <button class="btn btn-ghost" id="sw-prompt-import-btn">프롬프트 불러오기</button> <input type="file" id="sw-prompt-import-input" accept=".md,.txt" style="display:none"></div>' +
      '<div id="sw-prompts-filter" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;align-items:center">' +
      '<span style="font-size:12px;color:var(--text2);margin-right:4px">카테고리:</span>' +
      '<button type="button" class="btn btn-ghost btn-xs sw-prompt-filter-btn active" data-filter="all">전체</button>' +
      '<button type="button" class="btn btn-ghost btn-xs sw-prompt-filter-btn" data-filter="summary">요약</button>' +
      '<button type="button" class="btn btn-ghost btn-xs sw-prompt-filter-btn" data-filter="slide">슬라이드</button>' +
      '<button type="button" class="btn btn-ghost btn-xs sw-prompt-filter-btn" data-filter="all_slide">All Slide</button>' +
      '<button type="button" class="btn btn-ghost btn-xs sw-prompt-filter-btn" data-filter="image">이미지</button>' +
      '<button type="button" class="btn btn-ghost btn-xs sw-prompt-filter-btn" data-filter="translate">번역</button>' +
      '<button type="button" class="btn btn-ghost btn-xs sw-prompt-filter-btn" data-filter="ref_extract">참고문헌</button>' +
      '<button type="button" class="btn btn-ghost btn-xs sw-prompt-filter-btn" data-filter="other">기타</button>' +
      '</div>' +
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
    var miscShowWritingStyleRaw = $('sw-misc-show-writing-style-raw');
    var miscShowWritingStyleSummary = $('sw-misc-show-writing-style-summary');
    var miscShowCustomRaw = $('sw-misc-show-custom-raw');
    var miscShowCustomSummary = $('sw-misc-show-custom-summary');
    var miscShowSlideGenTypeManuscript = $('sw-misc-show-slide-gen-type-manuscript');
    var miscShowCustomManuscript = $('sw-misc-show-custom-manuscript');
    var miscType = $('sw-misc-default-slide-gen-type');
    var miscSummaryLimit = $('sw-misc-summary-char-limit');
    var miscRangeMin = $('sw-misc-range-min');
    var miscRangeMax = $('sw-misc-range-max');
    if (miscCount) miscCount.value = localStorage.getItem('ss_default_slide_count') || '15';
    if (miscCover) miscCover.checked = localStorage.getItem('ss_default_include_cover') !== 'false';
    var _raw = localStorage.getItem('ss_show_writing_style_raw');
    var _sum = localStorage.getItem('ss_show_writing_style_summary');
    if (_raw === null) _raw = localStorage.getItem('ss_show_writing_style');
    if (_sum === null) _sum = localStorage.getItem('ss_show_writing_style');
    if (miscShowWritingStyleRaw) miscShowWritingStyleRaw.checked = _raw === '1';
    if (miscShowWritingStyleSummary) miscShowWritingStyleSummary.checked = _sum === '1';
    var _cRaw = localStorage.getItem('ss_show_custom_instruction_raw');
    var _cSum = localStorage.getItem('ss_show_custom_instruction_summary');
    var _cMan = localStorage.getItem('ss_show_custom_instruction_manuscript');
    var _slideGenMan = localStorage.getItem('ss_show_slide_gen_type_manuscript');
    if (_cRaw === null) _cRaw = localStorage.getItem('ss_show_summary_custom_instruction');
    if (_cSum === null) _cSum = localStorage.getItem('ss_show_summary_custom_instruction');
    if (miscShowCustomRaw) miscShowCustomRaw.checked = _cRaw === '1';
    if (miscShowCustomSummary) miscShowCustomSummary.checked = _cSum === '1';
    if (miscShowCustomManuscript) miscShowCustomManuscript.checked = _cMan === '1';
    if (miscShowSlideGenTypeManuscript) miscShowSlideGenTypeManuscript.checked = _slideGenMan === '1';
    if (miscType) miscType.value = localStorage.getItem('ss_slide_gen_type') || 'precision';
    if (miscSummaryLimit) miscSummaryLimit.value = localStorage.getItem('ss_summary_char_limit') || '1500000';
    if (miscRangeMin) miscRangeMin.value = localStorage.getItem('ss_slide_range_default_min') || '1';
    if (miscRangeMax) miscRangeMax.value = localStorage.getItem('ss_slide_range_default_max') || '30';

    var loadUserInfo = function () {
      var data = {};
      try { var raw = localStorage.getItem(LS_USER_INFO); if (raw) data = JSON.parse(raw); } catch (e) {}
      var uName = $('sw-user-name'); if (uName) uName.value = data.name || '';
      var uAff = $('sw-user-affiliation'); if (uAff) uAff.value = data.affiliation || '';
      var uEmail = $('sw-user-email'); if (uEmail) uEmail.value = data.email || '';
      var uPhone = $('sw-user-phone'); if (uPhone) uPhone.value = data.phone || '';
      var cName = $('sw-user-name-v'); if (cName) cName.checked = data.checkName === true;
      var cAff = $('sw-user-affiliation-v'); if (cAff) cAff.checked = data.checkAffiliation === true;
      var cEmail = $('sw-user-email-v'); if (cEmail) cEmail.checked = data.checkEmail === true;
      var cPhone = $('sw-user-phone-v'); if (cPhone) cPhone.checked = data.checkPhone === true;
    };
    loadUserInfo();

    var userSaveBtn = $('sw-user-save');
    if (userSaveBtn) userSaveBtn.addEventListener('click', function () {
      var data = {
        name: ($('sw-user-name') && $('sw-user-name').value) || '',
        affiliation: ($('sw-user-affiliation') && $('sw-user-affiliation').value) || '',
        email: ($('sw-user-email') && $('sw-user-email').value) || '',
        phone: ($('sw-user-phone') && $('sw-user-phone').value) || '',
        checkName: ($('sw-user-name-v') && $('sw-user-name-v').checked) || false,
        checkAffiliation: ($('sw-user-affiliation-v') && $('sw-user-affiliation-v').checked) || false,
        checkEmail: ($('sw-user-email-v') && $('sw-user-email-v').checked) || false,
        checkPhone: ($('sw-user-phone-v') && $('sw-user-phone-v').checked) || false
      };
      localStorage.setItem(LS_USER_INFO, JSON.stringify(data));
      if (typeof win.getUserInfoForSummary !== 'undefined') { /* refresh */ }
      if (typeof win.showToast === 'function') win.showToast('저장되었습니다');
    });

    var miscImgSaveUrl = $('sw-misc-imgsave-url');
    if (miscImgSaveUrl) miscImgSaveUrl.value = localStorage.getItem('ss_imgsave_url') || 'https://imgbb.com/';

    var miscBtn = $('sw-misc-apply-btn');
    if (miscBtn) miscBtn.addEventListener('click', function () {
      if (miscCount) localStorage.setItem('ss_default_slide_count', miscCount.value || '15');
      if (miscCover) localStorage.setItem('ss_default_include_cover', miscCover.checked ? 'true' : 'false');
      if (miscShowWritingStyleRaw) localStorage.setItem('ss_show_writing_style_raw', miscShowWritingStyleRaw.checked ? '1' : '0');
      if (miscShowWritingStyleSummary) localStorage.setItem('ss_show_writing_style_summary', miscShowWritingStyleSummary.checked ? '1' : '0');
      if (miscShowCustomRaw) localStorage.setItem('ss_show_custom_instruction_raw', miscShowCustomRaw.checked ? '1' : '0');
      if (miscShowCustomSummary) localStorage.setItem('ss_show_custom_instruction_summary', miscShowCustomSummary.checked ? '1' : '0');
      if (miscShowCustomManuscript) localStorage.setItem('ss_show_custom_instruction_manuscript', miscShowCustomManuscript.checked ? '1' : '0');
      if (miscShowSlideGenTypeManuscript) localStorage.setItem('ss_show_slide_gen_type_manuscript', miscShowSlideGenTypeManuscript.checked ? '1' : '0');
      if (miscType) localStorage.setItem('ss_slide_gen_type', miscType.value || 'precision');
      if (miscRangeMin) localStorage.setItem('ss_slide_range_default_min', String(miscRangeMin.value || '1').trim() || '1');
      if (miscRangeMax) localStorage.setItem('ss_slide_range_default_max', String(miscRangeMax.value || '30').trim() || '30');
      if (miscSummaryLimit) {
        var val = parseInt(miscSummaryLimit.value, 10);
        if (!isNaN(val)) val = Math.max(10000, Math.min(2000000, val));
        else val = 1500000;
        localStorage.setItem('ss_summary_char_limit', String(val));
      }
      if (miscImgSaveUrl) {
        var url = (miscImgSaveUrl.value || '').trim();
        localStorage.setItem('ss_imgsave_url', url || 'https://imgbb.com/');
      }
      if (typeof win.renderLeftPanel === 'function') win.renderLeftPanel();
      if (typeof win.showToast === 'function') win.showToast('적용되었습니다');
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
      var textModelSel = $('sw-text-model-select');
      if (textModelSel) localStorage.setItem(LS_TEXT_MODEL, textModelSel.value);
      var imgSel = $('sw-image-model-select');
      if (imgSel) localStorage.setItem(LS_IMAGE_MODEL, imgSel.value);
      if ($('sw-save-key-checkbox') && $('sw-save-key-checkbox').checked) {
        var keys = loadSavedKeys();
        if (keys.indexOf(val) === -1) { keys.unshift(val); if (keys.length > 5) keys.pop(); saveKeysList(keys); }
      }
      if (typeof win.syncApiKeyFromStorage === 'function') win.syncApiKeyFromStorage();
      if (typeof win.showToast === 'function') win.showToast('적용되었습니다');
      renderSavedKeys();
    });

    var activeKey = localStorage.getItem(LS_ACTIVE_KEY) || '';
    if (apiField) apiField.value = activeKey;
    updateStrength();
    renderSavedKeys();

    var textModelSel = $('sw-text-model-select');
    if (textModelSel) textModelSel.value = localStorage.getItem(LS_TEXT_MODEL) || 'gemini-2.5-pro';
    var imgSel = $('sw-image-model-select');
    if (imgSel) imgSel.value = localStorage.getItem(LS_IMAGE_MODEL) || 'gemini-2.5-flash-image';
    var presetSel = $('sw-scholara-i-preset-select');
    if (presetSel) presetSel.value = localStorage.getItem(LS_SCHOLARAI_PRESET) || 'apa_search';

    function loadPrompts(filterCategory) {
      filterCategory = filterCategory || window._swCurrentPromptFilter || 'all';
      var defaults = (typeof win.getDefaultPrompts === 'function' && win.getDefaultPrompts()) || {};
      var categories = (typeof win.PROMPT_CATEGORIES !== 'undefined' && win.PROMPT_CATEGORIES) || [
        { id: 'summary', title: '📖 요약 관련' },
        { id: 'slide', title: '🗂 슬라이드 생성 관련' },
        { id: 'all_slide', title: '🧠 All Slide 생성 관련' },
        { id: 'image', title: '🎨 이미지 생성 관련' },
        { id: 'translate', title: '🌐 번역 관련' },
        { id: 'ref_extract', title: '📚 참고문헌 추출 (AI)' },
        { id: 'other', title: '📚 기타 (학술 검색 등)' }
      ];
      var overrides = {};
      try { var raw = localStorage.getItem(LS_PROMPT_OVERRIDES); if (raw) overrides = JSON.parse(raw); } catch (e) {}
      var html = '';
      for (var c = 0; c < categories.length; c++) {
        var cat = categories[c];
        if (filterCategory !== 'all' && cat.id !== filterCategory) continue;
        var items = [];
        for (var key in defaults) {
          if (!defaults.hasOwnProperty(key)) continue;
          var d = defaults[key];
          if ((d.category || 'other') !== cat.id) continue;
          items.push({ key: key, d: d });
        }
        if (items.length === 0) continue;
        html += '<div class="prompt-category">' + (cat.title || cat.id) + '</div>';
        for (var i = 0; i < items.length; i++) {
          var key = items[i].key;
          var d = items[i].d;
          var val = overrides[key] !== undefined && overrides[key] !== null ? String(overrides[key]) : (d.value || '');
          var esc = val.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          var rows = (key === 'slide_gen_system' || key === 'slide_gen_all_system' || (key && key.indexOf('slide_gen_system_') === 0)) ? 14 : (key === 'slide_gen_user_prompt' ? 10 : (key === 'imggen_vis_prompt_instruction' || key === 'imggen_vis_prompt_system' ? 8 : 4));
          html += '<div class="prompt-item"><label>' + key + ' — ' + (d.label || key) + '</label><textarea data-key="' + key + '" rows="' + rows + '">' + esc + '</textarea></div>';
        }
      }
      var container = $('sw-prompts-container');
      if (container) container.innerHTML = html || '<p style="color:var(--text2)">기본 프롬프트 목록을 불러오려면 새로고침하세요.</p>';
      document.querySelectorAll('#settings-panel-root .sw-prompt-filter-btn').forEach(function (b) {
        b.classList.toggle('active', (b.getAttribute('data-filter') || 'all') === filterCategory);
      });
    }

    document.querySelectorAll('#settings-panel-root .sw-prompt-filter-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var filter = btn.getAttribute('data-filter') || 'all';
        window._swCurrentPromptFilter = filter;
        document.querySelectorAll('#settings-panel-root .sw-prompt-filter-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        loadPrompts(filter);
      });
    });

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
      var typeIds = (typeof win.SLIDE_GEN_TYPE_IDS !== 'undefined' && win.SLIDE_GEN_TYPE_IDS) || ['precision', 'presentation', 'notebook', 'critical', 'evidence', 'logic', 'quiz', 'workshop', 'auto_visual'];
      for (var t = 0; t < typeIds.length; t++) {
        var k = 'slide_gen_system_' + typeIds[t];
        if (d[k] && d[k].value) {
          var ta = document.querySelector('#settings-panel-root textarea[data-key="' + k + '"]');
          if (ta) ta.value = d[k].value;
        }
      }
      if (d.slide_gen_all_system && d.slide_gen_all_system.value) {
        var taAll = document.querySelector('#settings-panel-root textarea[data-key="slide_gen_all_system"]');
        if (taAll) taAll.value = d.slide_gen_all_system.value;
      }
      if (typeof win.showToast === 'function') win.showToast('적용되었습니다');
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
      var presetSel = $('sw-scholara-i-preset-select');
      if (presetSel) localStorage.setItem(LS_SCHOLARAI_PRESET, presetSel.value);
      if (typeof win.setPromptOverrides === 'function') win.setPromptOverrides(overrides);
      if (typeof win.showToast === 'function') win.showToast('저장되었습니다');
    });

    function exportPromptsToMd() {
      var defaults = (typeof win.getDefaultPrompts === 'function' && win.getDefaultPrompts()) || {};
      var overrides = {};
      try { var raw = localStorage.getItem(LS_PROMPT_OVERRIDES); if (raw) overrides = JSON.parse(raw); } catch (e) {}
      var lines = ['# ScholarSlide 프롬프트 설정', '', '내보내기: ' + new Date().toLocaleString('ko-KR') + '', ''];
      var hasFromTa = false;
      document.querySelectorAll('#settings-panel-root #sw-prompts-container textarea').forEach(function (ta) {
        var key = ta.getAttribute('data-key');
        if (!key) return;
        hasFromTa = true;
        var val = (ta.value || '').trim();
        lines.push('## ' + key);
        lines.push('```');
        lines.push(val);
        lines.push('```');
        lines.push('');
      });
      if (!hasFromTa) {
        for (var key in defaults) {
          if (!defaults.hasOwnProperty(key)) continue;
          var d = defaults[key];
          var val = overrides[key] !== undefined && overrides[key] !== null ? String(overrides[key]) : (d.value || '');
          lines.push('## ' + key);
          lines.push('```');
          lines.push(val);
          lines.push('```');
          lines.push('');
        }
      }
      var blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'ScholarSlide_프롬프트_' + new Date().toISOString().slice(0, 10) + '.md';
      a.click();
      URL.revokeObjectURL(a.href);
      if (typeof win.showToast === 'function') win.showToast('프롬프트 내보내기 완료');
    }

    function importPromptsFromMd(mdText) {
      var defaults = (typeof win.getDefaultPrompts === 'function' && win.getDefaultPrompts()) || {};
      var knownKeys = Object.keys(defaults);
      var overrides = {};
      var re = /^##\s+([a-zA-Z0-9_]+)\s*$/gm;
      var m;
      var lastKey = null;
      var lastIdx = 0;
      while ((m = re.exec(mdText)) !== null) {
        if (lastKey && knownKeys.indexOf(lastKey) >= 0) {
          var block = mdText.slice(lastIdx, m.index).trim();
          if (/^```/.test(block)) block = block.replace(/^```\w*\r?\n?/, '').replace(/\r?\n?```\w*$/, '').trim();
          overrides[lastKey] = block;
        }
        lastKey = m[1];
        lastIdx = m.index + m[0].length;
      }
      if (lastKey && knownKeys.indexOf(lastKey) >= 0) {
        var tail = mdText.slice(lastIdx).trim();
        if (/^```/.test(tail)) tail = tail.replace(/^```\w*\r?\n?/, '').replace(/\r?\n?```\w*$/, '').trim();
        overrides[lastKey] = tail;
      }
      if (Object.keys(overrides).length === 0) {
        if (typeof win.showToast === 'function') win.showToast('유효한 프롬프트를 찾을 수 없습니다');
        return;
      }
      localStorage.setItem(LS_PROMPT_OVERRIDES, JSON.stringify(overrides));
      if (typeof win.setPromptOverrides === 'function') win.setPromptOverrides(overrides);
      loadPrompts();
      if (typeof win.showToast === 'function') win.showToast('프롬프트 불러오기 완료 (' + Object.keys(overrides).length + '개)');
    }

    var exportBtn = $('sw-prompt-export-btn');
    if (exportBtn) exportBtn.addEventListener('click', exportPromptsToMd);

    var importBtn = $('sw-prompt-import-btn');
    var importInput = $('sw-prompt-import-input');
    if (importBtn && importInput) {
      importBtn.addEventListener('click', function () { importInput.click(); });
      importInput.addEventListener('change', function () {
        var f = importInput.files && importInput.files[0];
        if (!f) return;
        var r = new FileReader();
        r.onload = function () { importPromptsFromMd(r.result || ''); importInput.value = ''; };
        r.readAsText(f, 'UTF-8');
      });
    }

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

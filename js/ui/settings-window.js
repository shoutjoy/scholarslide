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
      '.sw-ai-tabs{display:flex;gap:8px;margin-bottom:14px;padding:4px;background:var(--surface);border:1px solid var(--border);border-radius:9px}' +
      '.sw-ai-tab{flex:1;padding:9px 12px;border:1px solid transparent;border-radius:6px;background:transparent;color:var(--text2);font-size:12px;font-weight:700;cursor:pointer}' +
      '.sw-ai-tab.active{background:var(--accent);border-color:var(--accent);color:#fff}.sw-ai-section{display:none}.sw-ai-section.active{display:block}' +
      '.sw-prompt-filter-btn.active{background:var(--surface3);color:var(--accent);border-color:var(--accent)}' +
      '.sw-panel{display:none}.sw-panel.active{display:block}' +
      '.sw-panel label{display:block;font-size:12px;font-weight:500;color:var(--text2);margin-bottom:6px}' +
      '.sw-panel label.sw-row{display:flex!important;align-items:flex-start;gap:10px;width:100%;margin-bottom:10px;font-weight:400;line-height:1.45;cursor:pointer}' +
      '.sw-panel label.sw-row--center{align-items:center}' +
      '.sw-panel label.sw-row .sw-row-text{flex:1;min-width:0}' +
      '.sw-panel input,.sw-panel select,.sw-panel textarea{width:100%;padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:6px;color:var(--text2);font-size:13px;font-family:JetBrains Mono,Noto Sans KR,monospace}' +
      '.sw-panel input[type=radio],.sw-panel input[type=checkbox]{width:auto!important;max-width:none;flex:0 0 auto;padding:0;margin:2px 0 0 0;background:transparent;border:none;border-radius:0;font-family:inherit;accent-color:var(--accent)}' +
      '.sw-panel label.sw-row input[type=checkbox]{margin-top:1px}' +
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
      '<div style="min-width:100px"><div style="font-size:11px;font-weight:600;color:var(--accent);margin-bottom:8px">슬라이드</div>' +
      '<label style="display:flex;align-items:center;gap:6px;font-size:11px;cursor:pointer;margin-bottom:6px"><input type="checkbox" id="sw-misc-show-slide-gen-type-manuscript"> 슬라이드생성유형 보이기</label>' +
      '<label style="display:flex;align-items:center;gap:6px;font-size:11px;cursor:pointer"><input type="checkbox" id="sw-misc-show-custom-manuscript"> 커스텀 프롬프트 보이기</label></div>' +
      '</div></div>' +
      '<div style="margin-top:16px;padding:12px;background:var(--surface);border:1px solid var(--border);border-radius:6px">' +
      '<div style="font-size:12px;font-weight:600;color:var(--text2);margin-bottom:8px">발표</div>' +
      '<label style="display:flex;align-items:center;gap:6px;font-size:11px;cursor:pointer"><input type="checkbox" id="sw-misc-show-ext-pres"> 외부발표 보이기</label>' +
      '<p style="font-size:10px;color:var(--text3);margin:6px 0 0 0">체크 시 푸터에 🖥 외부 발표 버튼이 표시됩니다.</p></div>' +
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
      '<p style="font-size:10px;color:var(--text2);margin:0 0 12px 0">요약 시 사용할 최대 글자 수입니다. 대용량 문서는 LM Studio 약 1만 자, AI Studio 약 3만 자 단위로 자동 분할·부분 요약한 뒤 최종 통합합니다. 매우 큰 문서는 앞부분만 자르지 않고 전체 구간을 균등 반영합니다.</p>' +
      '<div class="sw-pdf-reflow-box" style="margin-top:16px;padding:12px 14px;background:var(--surface);border:1px solid var(--border);border-radius:8px">' +
      '<div style="font-size:12px;font-weight:600;color:var(--text2);margin-bottom:6px">PDF 업로드 후 원문 처리</div>' +
      '<p style="font-size:10px;color:var(--text3);margin:0 0 12px 0;line-height:1.5">추출 직후 AI 가독성 정리(머리말·제목 줄바꿈)를 할지 선택합니다. 원문 탭의 ✨ 버튼으로 나중에 백그라운드 실행도 가능합니다.</p>' +
      '<div style="display:flex;flex-direction:column;gap:8px">' +
      '<label class="sw-row" style="font-size:11px;margin-bottom:0"><input type="radio" name="sw-upload-pdf-reflow" value="extract_only"><span class="sw-row-text"><b>원문 추출만</b> — 휴리스틱 줄바꿈만, 빠름</span></label>' +
      '<label class="sw-row" style="font-size:11px;margin-bottom:0"><input type="radio" name="sw-upload-pdf-reflow" value="extract_and_ai"><span class="sw-row-text"><b>추출 후 바로 AI 정리</b> — API·시간 소요</span></label>' +
      '</div>' +
      '<label class="sw-row sw-row--center" style="font-size:11px;margin:12px 0 0 0;padding-top:12px;border-top:1px solid var(--border);margin-bottom:0"><input type="checkbox" id="sw-misc-ai-reflow-off"><span class="sw-row-text">PDF 업로드 직후 자동 AI 정리 끄기 (원문 탭 「AI 정리」버튼은 별도로 동작)</span></label>' +
      '</div>' +
      '<label style="margin-top:16px">IMGSAVE URL (프로젝트 저장 모달의 IMGSAVE 링크 주소)</label>' +
      '<input type="url" id="sw-misc-imgsave-url" placeholder="https://imgbb.com/" style="width:100%;max-width:400px;margin-top:4px;margin-bottom:4px">' +
      '<p style="font-size:10px;color:var(--text2);margin:0 0 12px 0">이미지 업로드 사이트 주소. 기본: imgbb.com</p>' +
      '<div style="margin-top:16px"><button class="btn btn-primary" id="sw-misc-apply-btn">적용</button></div>' +
      '</div>' +
      '<div id="sw-panel-api" class="sw-panel">' +
      '<div class="sw-ai-tabs" role="tablist"><button type="button" class="sw-ai-tab active" data-ai-settings-tab="lmstudio">🖥 LM Studio</button><button type="button" class="sw-ai-tab" data-ai-settings-tab="aistudio">✨ AI Studio</button></div>' +
      '<div id="sw-ai-section-lmstudio" class="sw-ai-section active" style="padding:12px;margin-bottom:16px;background:var(--surface);border:1px solid var(--border);border-radius:8px">' +
      '<label style="font-weight:700">텍스트 AI 공급자</label>' +
      '<select id="sw-ai-provider" style="max-width:420px"><option value="auto">자동 (LM Studio 우선 → AI Studio)</option><option value="lmstudio">LM Studio만 사용</option><option value="aistudio">AI Studio만 사용</option></select>' +
      '<p style="font-size:10px;color:var(--text3);margin:6px 0 12px">ScholarAI와 일반 AI Chat에서 사용할 공급자입니다. AI Studio는 <b>이미지 생성 + AI 텍스트 동작</b>에 사용되며, LM Studio는 로컬 AI 텍스트 동작에 사용됩니다. <b>AI Studio API 키가 없으면 요약·번역·슬라이드 생성 등 텍스트 AI 기능은 현재 로드된 LM Studio 모델로 자동 전환됩니다.</b></p>' +
      '<div style="display:grid;grid-template-columns:minmax(0,2fr) minmax(150px,1fr);gap:10px"><div><label>LM Studio Base URL</label><input id="sw-lm-base-url" type="url" value="http://127.0.0.1:5678/v1" placeholder="http://127.0.0.1:5678/v1"></div><div><label>API Key (선택)</label><input id="sw-lm-api-key" type="password" autocomplete="off" placeholder="인증 사용 시 입력"></div></div>' +
      '<div id="sw-lm-connection-card" style="margin-top:12px;padding:12px;border:1px solid var(--border2);border-radius:8px;background:var(--surface2)"><div style="display:flex;align-items:center;gap:8px"><span id="sw-lm-dot" style="width:10px;height:10px;border-radius:50%;background:var(--text3);display:inline-block"></span><b id="sw-lm-connection-label" style="font-size:12px">연결 확인 전</b></div><div style="margin-top:10px;font-size:11px;color:var(--text3)">LM Studio 현재 로드 모델</div><div id="sw-lm-model" style="margin-top:5px;padding:10px;border:1px solid var(--border);border-radius:6px;font-weight:700;color:var(--text2)">확인되지 않음</div><div style="display:flex;justify-content:space-between;gap:12px;margin-top:9px;padding-top:9px;border-top:1px solid var(--border)"><span style="font-size:11px;color:var(--text3)">최대 컨텍스트 길이</span><b id="sw-lm-context-length" style="font-size:11px;color:var(--accent)">확인되지 않음</b></div><div id="sw-lm-context-guide" style="font-size:10px;color:var(--text3);margin-top:5px">연결 후 문서 분할 크기를 자동 계산합니다.</div><div id="sw-lm-latency" style="font-size:10px;color:var(--text3);margin-top:6px">모델은 LM Studio에서 Load/Eject 합니다.</div></div>' +
      '<div style="display:grid;grid-template-columns:repeat(4,minmax(75px,1fr));gap:8px;margin-top:12px"><div><label>Temperature</label><input id="sw-lm-temperature" type="number" min="0" max="2" step="0.1"></div><div><label>Max tokens</label><input id="sw-lm-max-tokens" type="number" min="1" step="128"></div><div><label>Timeout (초)</label><input id="sw-lm-timeout" type="number" min="1"></div><div><label>Top P</label><input id="sw-lm-top-p" type="number" min="0" max="1" step="0.05" placeholder="기본"></div></div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:12px"><button type="button" class="btn btn-primary" id="sw-lm-save">LM 설정 저장</button><button type="button" class="btn btn-ghost" id="sw-lm-model-check">현재 로드 모델 확인</button><button type="button" class="btn btn-ghost" id="sw-lm-test">LM 연결 테스트</button></div>' +
      '<div id="sw-lm-status" style="font-size:11px;color:var(--text3);margin-top:10px"></div>' +
      '<div style="margin-top:14px;padding:12px;border:1px solid var(--border2);border-radius:8px;background:var(--surface2)"><div style="font-size:12px;font-weight:700;color:var(--text2);margin-bottom:9px">📚 문서 컨텍스트 처리 계획</div><label>최소 분할 단계</label><select id="sw-lm-split-mode"><option value="auto">자동 — 모델 용량에 맞춤</option><option value="2">최소 2개로 분할</option><option value="3">최소 3개로 분할</option><option value="4">최소 4개로 분할</option><option value="6">최소 6개로 분할</option><option value="8">최소 8개로 분할</option></select><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-top:10px;font-size:11px"><div>현재 선택 문서</div><b id="sw-lm-input-size" style="text-align:right">0자</b><div>원문 추정 토큰</div><b id="sw-lm-input-tokens" style="text-align:right">0 tokens</b><div>모델 대비 크기</div><b id="sw-lm-context-ratio" style="text-align:right">확인 필요</b><div>안전 입력량/회</div><b id="sw-lm-safe-input" style="text-align:right">3,000 tokens</b><div>안전 출력 한도</div><b id="sw-lm-safe-output" style="text-align:right">2,048 tokens</b><div>예상 처리 단계</div><b id="sw-lm-estimated-parts" style="text-align:right;color:var(--accent)">1개</b></div><div id="sw-lm-processing-note" style="margin-top:9px;padding:8px;border-radius:6px;background:var(--surface);font-size:10px;color:var(--text3);line-height:1.5">입력 문서를 확인하는 중입니다.</div></div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:14px;margin-top:10px;font-size:11px"><a href="https://lmstudio.ai/download" target="_blank" rel="noopener" style="color:var(--accent)">LM Studio 다운로드</a><a href="https://ollama.com/download" target="_blank" rel="noopener" style="color:var(--accent)">Ollama 다운로드</a><a href="https://ollama.com/search" target="_blank" rel="noopener" style="color:var(--accent)">Ollama 모델 찾기</a></div>' +
      '<label class="sw-row sw-row--center" style="margin-top:14px;margin-bottom:0"><input type="checkbox" id="ai-chat-enabled"><span class="sw-row-text"><b>AI Chat 사용</b> — 화면 우측 하단에 이동 가능한 플로팅 채팅 버튼 표시</span></label>' +
      '</div>' +
      '<div id="sw-ai-section-aistudio" class="sw-ai-section" style="padding:12px;background:var(--surface);border:1px solid var(--border);border-radius:8px">' +
      '<p style="color:var(--text2);font-size:12px;margin-bottom:10px"><b>AI Studio — 이미지 생성 + AI 동작</b><br><a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" style="color:var(--accent)">Google AI Studio</a>에서 발급한 API 키를 입력하세요.</p>' +
      '<div style="margin-bottom:14px;padding:10px 12px;border:1px solid rgba(245,158,11,.45);border-left:3px solid #f59e0b;border-radius:7px;background:rgba(245,158,11,.08);color:var(--text2);font-size:11px;line-height:1.55"><b style="color:#fbbf24">🖼 sspAI 사용 안내</b><br>상단의 <b>sspAI 이미지 생성 기능을 사용하려면 이곳에 Google AI Studio API 키를 입력하고 적용해야 합니다.</b> 입력한 키는 ScholarAI 텍스트 동작과 sspAI 이미지 생성에 함께 사용됩니다.</div>' +
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
    function selectAISettingsTab(name) {
      name = name === 'aistudio' ? 'aistudio' : 'lmstudio';
      document.querySelectorAll('#settings-panel-root .sw-ai-tab').forEach(function (button) {
        button.classList.toggle('active', button.getAttribute('data-ai-settings-tab') === name);
      });
      document.querySelectorAll('#settings-panel-root .sw-ai-section').forEach(function (section) {
        section.classList.toggle('active', section.id === 'sw-ai-section-' + name);
      });
      localStorage.setItem('ss_settings_ai_tab', name);
    }
    document.querySelectorAll('#settings-panel-root .sw-ai-tab').forEach(function (button) {
      button.addEventListener('click', function () { selectAISettingsTab(this.getAttribute('data-ai-settings-tab')); });
    });
    selectAISettingsTab(window._settingsInitialAITab || localStorage.getItem('ss_settings_ai_tab') || 'lmstudio');
    window._settingsInitialAITab = '';

    var miscCount = $('sw-misc-default-slide-count');
    var miscCover = $('sw-misc-default-include-cover');
    var miscShowWritingStyleRaw = $('sw-misc-show-writing-style-raw');
    var miscShowWritingStyleSummary = $('sw-misc-show-writing-style-summary');
    var miscShowCustomRaw = $('sw-misc-show-custom-raw');
    var miscShowCustomSummary = $('sw-misc-show-custom-summary');
    var miscShowSlideGenTypeManuscript = $('sw-misc-show-slide-gen-type-manuscript');
    var miscShowCustomManuscript = $('sw-misc-show-custom-manuscript');
    var miscShowExtPres = $('sw-misc-show-ext-pres');
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
    if (miscShowExtPres) miscShowExtPres.checked = localStorage.getItem('ss_show_ext_pres') === '1';
    if (miscType) miscType.value = localStorage.getItem('ss_slide_gen_type') || 'precision';
    if (miscSummaryLimit) miscSummaryLimit.value = localStorage.getItem('ss_summary_char_limit') || '1500000';
    if (miscRangeMin) miscRangeMin.value = localStorage.getItem('ss_slide_range_default_min') || '1';
    if (miscRangeMax) miscRangeMax.value = localStorage.getItem('ss_slide_range_default_max') || '30';
    var _uploadReflowMode = localStorage.getItem('ss_upload_pdf_reflow_mode') || 'extract_and_ai';
    document.querySelectorAll('#settings-panel-root input[name="sw-upload-pdf-reflow"]').forEach(function (r) {
      r.checked = r.value === _uploadReflowMode;
    });
    var miscAiReflowOff = $('sw-misc-ai-reflow-off');
    if (miscAiReflowOff) miscAiReflowOff.checked = localStorage.getItem('ss_ai_pdf_reflow') === '0';

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
      if (miscShowExtPres) localStorage.setItem('ss_show_ext_pres', miscShowExtPres.checked ? '1' : '0');
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
      var reflowRad = document.querySelector('#settings-panel-root input[name="sw-upload-pdf-reflow"]:checked');
      if (reflowRad) localStorage.setItem('ss_upload_pdf_reflow_mode', reflowRad.value);
      var miscAiReflowOffApply = $('sw-misc-ai-reflow-off');
      if (miscAiReflowOffApply) localStorage.setItem('ss_ai_pdf_reflow', miscAiReflowOffApply.checked ? '0' : '1');
      if (typeof win.renderLeftPanel === 'function') win.renderLeftPanel();
      if (typeof win.updateExtPresButtonVisibility === 'function') win.updateExtPresButtonVisibility();
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

    var providerSelect = $('sw-ai-provider');
    if (providerSelect) providerSelect.value = localStorage.getItem('ss_scholar_ai_provider') || 'auto';
    var localConfig = { baseUrl: 'http://127.0.0.1:5678/v1', apiKey: '' };
    try { if (win.LocalAI) localConfig = win.LocalAI.loadConfig(localStorage); } catch (e) {}
    if ($('sw-lm-base-url')) $('sw-lm-base-url').value = localConfig.baseUrl || 'http://127.0.0.1:5678/v1';
    if ($('sw-lm-api-key')) $('sw-lm-api-key').value = localConfig.apiKey || '';
    if ($('sw-lm-temperature')) $('sw-lm-temperature').value = localConfig.temperature == null ? '0.4' : localConfig.temperature;
    if ($('sw-lm-max-tokens')) $('sw-lm-max-tokens').value = localConfig.maxTokens || 8192;
    if ($('sw-lm-timeout')) $('sw-lm-timeout').value = Math.round((localConfig.timeoutMs || 90000) / 1000);
    if ($('sw-lm-top-p')) $('sw-lm-top-p').value = localConfig.topP == null ? '' : localConfig.topP;
    if ($('sw-lm-split-mode')) $('sw-lm-split-mode').value = localStorage.getItem('ss_lm_split_mode') || 'auto';
    function updateLmProcessingPlan() {
      var raw = typeof win.getRawText === 'function' ? String(win.getRawText() || '') : '';
      var manuscript = typeof win._slideManuscriptText === 'string' ? win._slideManuscriptText : '';
      var inputLength = Math.max(raw.length, manuscript.length);
      var sourceText = raw.length >= manuscript.length ? raw : manuscript;
      var inputTokens = typeof win.estimateAITokens === 'function' ? win.estimateAITokens(sourceText) : Math.ceil(inputLength / 2);
      var charsPerToken = inputTokens > 0 ? inputLength / inputTokens : 2;
      var context = Number(localStorage.getItem('ss_lm_context_length')) || 0;
      var safeInputTokens = context ? Math.max(768, Math.floor(context * 0.65)) : 3000;
      var safeChars = Math.max(1200, Math.min(30000, Math.floor(safeInputTokens * charsPerToken)));
      var configuredMax = Number($('sw-lm-max-tokens') && $('sw-lm-max-tokens').value) || 8192;
      var safeOutput = context ? Math.max(512, Math.min(configuredMax, Math.floor(context * 0.25))) : Math.min(configuredMax, 2048);
      var forced = $('sw-lm-split-mode') && $('sw-lm-split-mode').value !== 'auto' ? Number($('sw-lm-split-mode').value) : 1;
      var required = inputTokens ? Math.ceil(inputTokens / safeInputTokens) : 1;
      var requestedParts = Math.max(1, forced || 1, required);
      var actual = Math.min(40, requestedParts);
      if ($('sw-lm-input-size')) $('sw-lm-input-size').textContent = inputLength.toLocaleString('ko-KR') + '자';
      if ($('sw-lm-input-tokens')) $('sw-lm-input-tokens').textContent = '약 ' + inputTokens.toLocaleString('ko-KR') + ' tokens';
      if ($('sw-lm-context-ratio')) $('sw-lm-context-ratio').textContent = context ? '약 ' + (inputTokens / context).toFixed(inputTokens / context >= 10 ? 0 : 1) + '배' : '컨텍스트 확인 필요';
      if ($('sw-lm-safe-input')) $('sw-lm-safe-input').textContent = safeInputTokens.toLocaleString('ko-KR') + ' tokens · 약 ' + safeChars.toLocaleString('ko-KR') + '자';
      if ($('sw-lm-safe-output')) $('sw-lm-safe-output').textContent = safeOutput.toLocaleString('ko-KR') + ' tokens';
      if ($('sw-lm-estimated-parts')) $('sw-lm-estimated-parts').textContent = actual + '개 부분 요약 + 최종 통합';
      if ($('sw-lm-processing-note')) $('sw-lm-processing-note').textContent = inputLength
        ? '문서 약 ' + inputTokens.toLocaleString('ko-KR') + ' tokens를 안전 입력량 ' + safeInputTokens.toLocaleString('ko-KR') + ' tokens 기준으로 ' + actual + '개 구간 처리 후 하나로 통합합니다.' + (actual > (forced || 1) ? ' 선택한 최소 분할 수보다 모델 안전 한도가 작아 분할 수를 자동으로 늘렸습니다.' : '') + (requestedParts > 40 ? ' 처리 시간이 과도해지지 않도록 최대 40개 구간에서 문서 전체 위치를 균등 반영합니다.' : '')
        : '현재 선택된 원문 또는 업로드된 슬라이드 원고가 없습니다.';
    }
    if ($('sw-lm-split-mode')) $('sw-lm-split-mode').addEventListener('change', function () { localStorage.setItem('ss_lm_split_mode', this.value); updateLmProcessingPlan(); });
    if ($('sw-lm-max-tokens')) $('sw-lm-max-tokens').addEventListener('input', updateLmProcessingPlan);
    updateLmProcessingPlan();
    if ($('ai-chat-enabled')) $('ai-chat-enabled').checked = localStorage.getItem('ss_ai_chat_enabled') === '1';
    if (providerSelect) providerSelect.addEventListener('change', function () {
      localStorage.setItem('ss_scholar_ai_provider', providerSelect.value);
    });
    if ($('ai-chat-enabled')) $('ai-chat-enabled').addEventListener('change', function () {
      localStorage.setItem('ss_ai_chat_enabled', this.checked ? '1' : '0');
      if (win.AIChat) win.AIChat.setEnabled(this.checked);
    });
    function lmAdapter() {
      if (!win.LocalAI || !win.ScholarAIProvider) throw new Error('LM Studio 모듈이 로드되지 않았습니다.');
      return win.__scholarAIProvider || (win.__scholarAIProvider = win.ScholarAIProvider.create({ callAIStudio: win.callGemini }));
    }
    function readLmForm() {
      return {
        baseUrl: $('sw-lm-base-url').value.trim(), apiKey: $('sw-lm-api-key').value.trim(),
        temperature: Number($('sw-lm-temperature').value || 0.4),
        maxTokens: Number($('sw-lm-max-tokens').value || 8192),
        timeoutMs: Math.max(1, Number($('sw-lm-timeout').value || 90)) * 1000,
        topP: $('sw-lm-top-p').value === '' ? null : Number($('sw-lm-top-p').value)
      };
    }
    function setLmState(ok, model, detail, contextLength, maxContextLength) {
      var status = $('sw-lm-status');
      var dot = $('sw-lm-dot'); var label = $('sw-lm-connection-label'); var modelEl = $('sw-lm-model'); var latency = $('sw-lm-latency');
      if (dot) { dot.style.background = ok ? '#34d399' : '#f87171'; dot.style.boxShadow = ok ? '0 0 10px #34d399' : 'none'; }
      if (label) { label.textContent = ok ? '연결됨: LM Studio' : '연결 안 됨'; label.style.color = ok ? '#34d399' : '#f87171'; }
      if (modelEl) modelEl.textContent = model || '로드된 모델 없음';
      var contextEl = $('sw-lm-context-length'); var contextGuide = $('sw-lm-context-guide');
      var context = Number(contextLength) || (ok ? Number(localStorage.getItem('ss_lm_context_length')) : 0) || 0;
      var maximum = Number(maxContextLength) || 0;
      if (contextEl) contextEl.textContent = context
        ? context.toLocaleString('ko-KR') + ' tokens' + (maximum && maximum !== context ? ' (모델 최대 ' + maximum.toLocaleString('ko-KR') + ')' : '')
        : (maximum ? maximum.toLocaleString('ko-KR') + ' tokens' : 'LM Studio 응답에 정보 없음');
      if (contextGuide) {
        var suggestedChars = context ? Math.max(1800, Math.min(30000, Math.floor(context * 1.1))) : 6000;
        contextGuide.textContent = context ? '문서 입력 청크 약 ' + suggestedChars.toLocaleString('ko-KR') + '자로 자동 조정됩니다.' : '안전 기본값 6,000자로 문서를 분할합니다.';
      }
      updateLmProcessingPlan();
      if (latency) latency.textContent = detail || '모델은 LM Studio에서 Load/Eject 합니다.';
      if (status) { status.textContent = ok ? 'LM Studio 연결 성공 · 현재 모델 ' + model : 'LM Studio 연결 실패 · ' + (detail || '설정을 확인하세요.'); status.style.color = ok ? '#34d399' : '#f87171'; }
    }
    async function checkLmConnection() {
      var status = $('sw-lm-status');
      try {
        status.textContent = '연결 확인 중…'; status.style.color = 'var(--warning)';
        var checked = await lmAdapter().testLMStudio(readLmForm());
        if (!checked.ok) throw new Error(checked.error);
        setLmState(true, checked.model, '현재 로드 모델 자동 사용 · 응답 ' + checked.latencyMs + 'ms', checked.contextLength, checked.maxContextLength);
      } catch (error) {
        setLmState(false, '', error.message || String(error));
      }
    }
    if ($('sw-lm-save')) $('sw-lm-save').addEventListener('click', function () {
      try { lmAdapter().saveLMStudioConfig(readLmForm()); localStorage.setItem('ss_scholar_ai_provider', providerSelect ? providerSelect.value : 'lmstudio'); $('sw-lm-status').textContent = 'LM Studio 설정을 저장했습니다.'; $('sw-lm-status').style.color = 'var(--success)'; } catch (error) { setLmState(false, '', error.message || String(error)); }
    });
    if ($('sw-lm-model-check')) $('sw-lm-model-check').addEventListener('click', checkLmConnection);
    if ($('sw-lm-test')) $('sw-lm-test').addEventListener('click', checkLmConnection);
    if (win.LocalAI && localStorage.getItem(win.LocalAI.storageKey)) checkLmConnection();

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

  function openSettingsPanel(initialTab, initialAITab) {
    var root = document.getElementById('settings-panel-root');
    var modal = document.getElementById('settings-modal');
    var box = document.getElementById('settings-modal-box');
    if (!root || !modal || !box) return;
    window._settingsInitialAITab = initialAITab || '';
    root.innerHTML = getSettingsPanelContent();
    box.classList.remove('settings-fullscreen');
    initSettingsPanelScript();
    if (initialTab) {
      var tab = root.querySelector('.sw-tab[data-tab="' + initialTab + '"]');
      if (tab) tab.click();
    }
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

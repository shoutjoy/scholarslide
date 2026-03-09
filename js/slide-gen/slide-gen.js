/**
 * ScholarSlide — 슬라이드 생성 관련 (요약/슬라이드 JSON 생성, 발표 원고, AI 재작성·확장·1장 추가)
 * index.js 로드 후 사용. window.getSlides, setSlides, callGemini 등에 의존.
 */
(function () {
  'use strict';

  function g(id) { return document.getElementById(id); }
  function getSlidesArr() { return window.getSlides ? window.getSlides() : []; }
  function setSlides(s) { if (window.setSlides) window.setSlides(s); }
  function rawText() { return window.getRawText ? window.getRawText() : ''; }
  function setSummaryText(t) { if (window.setSummaryText) window.setSummaryText(t); }
  function setLeftTab(t) { if (window.setLeftTab) window.setLeftTab(t); }
  function setPresentationScript(p) { if (window.setPresentationScript) window.setPresentationScript(p); }
  function setActiveSlideIndex(i) { if (window.setActiveSlideIndex) window.setActiveSlideIndex(i); }
  function activeSlideIndex() { return window.getActiveSlideIndex ? window.getActiveSlideIndex() : 0; }
  function slideStyle() { return window.getSlideStyle ? window.getSlideStyle() : 'light'; }
  function writingStyle() { return window.getWritingStyle ? window.getWritingStyle() : 'academic-da'; }

  async function generateSummary(type) {
    if (!rawText()) return;
    var customInstruction = (g('custom-instruction-val') && g('custom-instruction-val').value) || '';
    var slideCount = parseInt((g('slide-count-val') && g('slide-count-val').value) || '12', 10) || 12;
    var includeCover = g('include-cover') ? g('include-cover').checked !== false : true;
    var wStyle = (g('writing-style-val') && g('writing-style-val').value) || writingStyle();

    var writingStyleGuide = wStyle === 'academic-da'
      ? '문체: 학술체 (~이다, ~이었다, ~나타났다, ~된다). 격식체, 논문 스타일.'
      : wStyle === 'academic-im'
        ? '문체: 학술체 축약형 (~임, ~함, ~됨, ~있음). 개조식, 간결한 논문 스타일.'
        : '문체: 일반체 존댓말 (~합니다, ~했습니다, ~됩니다). 청중 친화적이고 정중한 어조.';

    if (type === 'full') {
      var box = g('summaryProgress');
      var pct = g('summaryPercent');
      if (box) box.style.display = 'block';
      if (pct) pct.textContent = '0';
      if (window.showGlobalProgress) window.showGlobalProgress('📖 요약 생성 중...', 5, '📖');
      var _prog = 5;
      var _progTimer = setInterval(function () {
        if (_prog < 85) {
          _prog += Math.random() * 3;
          if (pct) pct.textContent = Math.round(_prog);
          if (window.updateGlobalProgress) window.updateGlobalProgress(_prog, '📖 요약 생성 중...');
        }
      }, 400);
      var isEnglish = /^[a-zA-Z\s\d.,!?;:()\-'"]{50,}/.test(rawText().substring(0, 200));
      var langInstruction = isEnglish ? 'Respond in English (same language as the source text).' : '한국어로 응답하세요.';
      var prompt = '이 학술 텍스트를 분석하여 구조화된 요약을 작성하세요: 연구 배경, 연구 질문/가설, 이론적 프레임워크, 연구 방법론, 주요 발견사항, 함의 및 시사점, 한계점. ' + writingStyleGuide + '\n\n텍스트:\n' + rawText().substring(0, 15000);
      if (customInstruction) prompt += '\n추가 지시: ' + customInstruction;
      try {
        var res = await window.callGemini(prompt, '당신은 대학원 수준 연구 조교입니다. ' + langInstruction);
        var text = res && res.text ? res.text : res;
        clearInterval(_progTimer);
        if (pct) pct.textContent = '100';
        if (window.updateGlobalProgress) window.updateGlobalProgress(100, '✅ 요약 완료');
        setTimeout(function () { if (box) box.style.display = 'none'; }, 1500);
        if (window.hideGlobalProgress) window.hideGlobalProgress(1500);
        setSummaryText(text);
        if (window.leftTab !== undefined) window.leftTab = 'summary';
        setLeftTab('summary');
        document.querySelectorAll('.panel-left .panel-tab').forEach(function (el) { el.classList.remove('active'); });
        if (g('tab-summary')) g('tab-summary').classList.add('active');
        if (window.renderLeftPanel) window.renderLeftPanel();
        if (window.showToast) window.showToast('✅ 요약 생성 완료');
      } catch (e) {
        clearInterval(_progTimer);
        if (box) box.style.display = 'none';
        if (window.hideGlobalProgress) window.hideGlobalProgress(500);
        if (e.name !== 'AbortError' && window.showToast) window.showToast('❌ 요약 실패: ' + e.message);
      }
      return;
    }

    if (window.showLoading) window.showLoading('슬라이드 구조 생성 중...', '발표 자료 작성', 30, true);
    var isAcademic = slideStyle() === 'light';
    var styleGuide = isAcademic ? '텍스트 중심, 세부 내용 포함. ' + writingStyleGuide : '발표 중심: 핵심 요약, 간결한 bullet points, 청중 친화적. ' + writingStyleGuide;
    var coverNote = includeCover ? '첫 번째 슬라이드는 반드시 표지(논문 제목, 저자, 소속, 발표연도 등)로 구성하고 "isCover":true 로 표시하세요.' : '';
    var prompt = '이 텍스트를 기반으로 정확히 ' + slideCount + '개의 슬라이드를 생성하세요.\n스타일: ' + styleGuide + '\n' + coverNote + '\n\n반드시 아래 JSON 배열 형식으로만 응답하세요 (코드블록 없이, 마크다운 없이):\n[{"title":"슬라이드 제목","bullets":["포인트1","포인트2","포인트3"],"notes":"발표자 노트","visPrompt":"English diagram description for AI image generation","isCover":false}]\n\n텍스트:\n' + rawText().substring(0, 15000);
    if (customInstruction) prompt += '\n추가 지시: ' + customInstruction;
    try {
      var res = await window.callGemini(prompt, 'You are an academic slide generator. Korean for title/bullets/notes, English for visPrompt.');
      var text = res && res.text ? res.text : res;
      var clean = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
      var match = clean.match(/\[[\s\S]*\]/);
      if (!match) throw new Error('응답에서 JSON을 찾을 수 없음');
      var parsed = JSON.parse(match[0]);
      var newSlides = parsed.map(function (s, i) {
        return {
          id: i,
          imageUrl: null,
          title: s.title,
          bullets: (s.bullets || []).map(function (b) { return b.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'); }),
          notes: s.notes || '',
          visPrompt: s.visPrompt || '',
          isCover: s.isCover || false
        };
      });
      setSlides(newSlides);
      setActiveSlideIndex(0);
      setPresentationScript([]);
      if (window.afterSlidesCreated) window.afterSlidesCreated();
      if (window.showToast) window.showToast('✅ ' + newSlides.length + '개 슬라이드 생성 완료');
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.error(e);
        if (window.showToast) window.showToast('❌ 슬라이드 생성 실패: ' + e.message);
      }
    }
    if (window.hideLoading) window.hideLoading();
  }

  async function generatePresentationScript() {
    var s = getSlidesArr();
    if (!s.length) return;
    if (window.showLoading) window.showLoading('발표 원고 생성 중...', '슬라이드별 스크립트 작성', 20, true);
    try {
      var slideSummary = s.map(function (slide, i) { return '슬라이드 ' + (i + 1) + ' [' + slide.title + ']:\n- ' + (slide.bullets || []).join('\n- '); }).join('\n\n');
      var prompt = '다음 슬라이드 구조를 기반으로 각 슬라이드의 발표 원고를 작성하세요.\n- 각 슬라이드별 2-4분 분량의 자연스러운 발표 언어\n- 슬라이드 수와 동일한 수의 원고를 JSON 배열로만 응답: ["스크립트1","스크립트2",...]\n\n' + slideSummary;
      var res = await window.callGemini(prompt, '학술 발표 전문가입니다. 자연스러운 발표 원고를 한국어로 작성합니다.');
      var text = res && res.text ? res.text : res;
      var clean = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
      var match = clean.match(/\[[\s\S]*\]/);
      if (!match) throw new Error('JSON 파싱 실패');
      var script = JSON.parse(match[0]);
      setPresentationScript(script);
      setLeftTab('script');
      document.querySelectorAll('.panel-left .panel-tab').forEach(function (el) { el.classList.remove('active'); });
      if (g('tab-script')) g('tab-script').classList.add('active');
      if (window.renderLeftPanel) window.renderLeftPanel();
      if (window.showToast) window.showToast('✅ 발표 원고 생성 완료');
    } catch (e) {
      if (e.name !== 'AbortError' && window.showToast) window.showToast('❌ 원고 생성 실패: ' + e.message);
    }
    if (window.hideLoading) window.hideLoading();
  }

  async function aiRewriteSlide(index) {
    var s = getSlidesArr();
    if (!s[index]) return;
    if (window.showLoading) window.showLoading('슬라이드 ' + (index + 1) + ' AI 재작성 중...', '', 50, true);
    try {
      var slide = s[index];
      var prompt = '다음 슬라이드를 더 명확하고 학술적으로 재작성하세요. JSON으로만:\n{"title":"제목","bullets":["포인트1","포인트2","포인트3"],"notes":"노트","visPrompt":"English"}\n\n제목: ' + slide.title + '\n내용: ' + (slide.bullets || []).join(', ');
      var res = await window.callGemini(prompt, 'Academic slide rewriter. Korean for title/bullets/notes, English for visPrompt.');
      var text = res && res.text ? res.text : res;
      var clean = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
      var obj = JSON.parse(clean);
      var next = s.slice();
      next[index] = Object.assign({}, next[index], obj);
      setSlides(next);
      if (window.renderSlides) window.renderSlides();
      if (window.renderThumbs) window.renderThumbs();
      if (window.showToast) window.showToast('✅ AI 재작성 완료');
    } catch (e) {
      if (e.name !== 'AbortError' && window.showToast) window.showToast('❌ 재작성 실패: ' + e.message);
    }
    if (window.hideLoading) window.hideLoading();
  }

  async function aiExpandSlide(index) {
    var s = getSlidesArr();
    if (!s[index]) return;
    var instruction = (typeof window.prompt === 'function' ? window.prompt('슬라이드에 추가할 내용을 지시하세요 (비워두면 자동 확장):') : '') || '';
    if (window.showLoading) window.showLoading('슬라이드 ' + (index + 1) + ' 확장 중...', '', 50, true);
    try {
      var slide = s[index];
      var base = instruction || '슬라이드 "' + slide.title + '"의 내용을 바탕으로 추가 세부사항 제공';
      var res = await window.callGemini(base + '\n\n기존 내용: ' + (slide.bullets || []).join(', ') + '\n\n추가 bullet points 2-3개를 JSON 배열로만: ["항목1","항목2"]', 'Academic bullet generator. Korean only.');
      var text = res && res.text ? res.text : res;
      var clean = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
      var match = clean.match(/\[[\s\S]*\]/);
      if (match) {
        var additional = JSON.parse(match[0]);
        var next = s.slice();
        next[index] = Object.assign({}, next[index], { bullets: (next[index].bullets || []).concat(additional) });
        setSlides(next);
        if (window.renderSlides) window.renderSlides();
        if (window.renderThumbs) window.renderThumbs();
        if (window.showToast) window.showToast('✅ 슬라이드 확장 완료');
      }
    } catch (e) {
      if (e.name !== 'AbortError' && window.showToast) window.showToast('❌ 확장 실패: ' + e.message);
    }
    if (window.hideLoading) window.hideLoading();
  }

  function hideAddDropdown() {
    document.querySelectorAll('.add-slide-dropdown.open').forEach(function (el) { el.classList.remove('open'); });
  }

  function toggleAddDropdown(index, containerEl, event) {
    event.stopPropagation();
    var dropdown = containerEl.querySelector('.add-slide-dropdown');
    if (!dropdown) return;
    var wasOpen = dropdown.classList.contains('open');
    hideAddDropdown();
    if (!wasOpen) {
      dropdown.classList.add('open');
      setTimeout(function () { document.addEventListener('click', hideAddDropdown, { once: true }); }, 0);
    }
  }

  function addSlideAfter(afterIndex, mode) {
    hideAddDropdown();
    if (mode === 'ai') {
      window._aiSlideAfterIndex = afterIndex;
      var contentTa = g('ai-slide-add-content');
      var promptTa = g('ai-slide-add-prompt');
      if (contentTa) contentTa.value = '';
      if (promptTa) promptTa.value = '';
      if (window.openModal) window.openModal('ai-slide-add-modal');
    } else {
      var newSlide = { id: Date.now(), title: '새 슬라이드', bullets: ['포인트를 입력하세요', '두 번째 포인트'], notes: '', visPrompt: '', imageUrl: null };
      if (window.pushSlideUndoState) window.pushSlideUndoState();
      var next = getSlidesArr().slice();
      next.splice(afterIndex + 1, 0, newSlide);
      setSlides(next);
      setActiveSlideIndex(afterIndex + 1);
      if (window.afterSlidesCreated) window.afterSlidesCreated();
      if (window.selectSlide) window.selectSlide(afterIndex + 1);
      if (window.showToast) window.showToast('✅ 빈 슬라이드 추가됨 — 뒤에 삽입');
    }
  }

  function confirmAddSlideAI() {
    var afterIndex = window._aiSlideAfterIndex != null ? window._aiSlideAfterIndex : activeSlideIndex();
    var content = (g('ai-slide-add-content') && g('ai-slide-add-content').value) ? g('ai-slide-add-content').value.trim() : '';
    var promptHint = (g('ai-slide-add-prompt') && g('ai-slide-add-prompt').value) ? g('ai-slide-add-prompt').value.trim() : '';
    var withImage = g('ai-slide-add-image') ? g('ai-slide-add-image').checked : false;
    if (window.closeModal) window.closeModal('ai-slide-add-modal');
    addSlideAI(afterIndex, content, promptHint, withImage);
  }

  async function addSlideAI(afterIndex, extraContent, promptHint, withImage) {
    if (window.showLoading) window.showLoading('AI 슬라이드 생성 중...', '', 50, true);
    try {
      var context = rawText() ? rawText().substring(0, 8000) : ('전체 슬라이드 맥락: ' + getSlidesArr().map(function (s) { return s.title; }).join(', '));
      var userExtra = extraContent ? '\n\n[추가 내용/키워드]: ' + extraContent : '';
      var userHint = promptHint ? '\n[세밀한 지시]: ' + promptHint : '';
      var prompt = '다음 텍스트를 기반으로 슬라이드 1개를 JSON으로만 생성 (코드블록 없이):\n{"title":"슬라이드 제목","bullets":["포인트1","포인트2","포인트3"],"notes":"발표자 노트","visPrompt":"English visual description"}\n\n' + context + userExtra + userHint;
      var res = await window.callGemini(prompt, 'Academic slide generator. Korean title/bullets/notes, English visPrompt.');
      var text = res && res.text ? res.text : res;
      var clean = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
      var jsonMatch = clean.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('JSON 파싱 실패');
      var obj = JSON.parse(jsonMatch[0]);
      var newSlide = Object.assign({}, obj, { id: Date.now(), imageUrl: null });
      if (window.pushSlideUndoState) window.pushSlideUndoState();
      var next = getSlidesArr().slice();
      next.splice(afterIndex + 1, 0, newSlide);
      setSlides(next);
      setActiveSlideIndex(afterIndex + 1);
      if (window.afterSlidesCreated) window.afterSlidesCreated();
      if (window.selectSlide) window.selectSlide(afterIndex + 1);
      if (window.showToast) window.showToast('✅ AI 슬라이드 삽입됨');
      if (withImage && newSlide.visPrompt && window.generateImage) {
        if (window.showLoading) window.showLoading('AI 이미지 생성 중...', newSlide.visPrompt, 70, true);
        var img = await window.generateImage(newSlide.visPrompt);
        if (window.hideLoading) window.hideLoading();
        if (img) {
          newSlide.imageUrl = img;
          if (window.addToAiImgHistory) window.addToAiImgHistory(newSlide.visPrompt, img, activeSlideIndex());
          if (window.renderSlides) window.renderSlides();
          if (window.renderThumbs) window.renderThumbs();
          if (window.renderGallery) window.renderGallery();
          if (window.showToast) window.showToast('✅ AI 이미지도 추가됨');
        }
      }
    } catch (e) {
      if (e.name !== 'AbortError' && window.showToast) window.showToast('❌ AI 슬라이드 생성 실패: ' + e.message);
    }
    if (window.hideLoading) window.hideLoading();
  }

  window.generateSummary = generateSummary;
  window.generatePresentationScript = generatePresentationScript;
  window.aiRewriteSlide = aiRewriteSlide;
  window.aiExpandSlide = aiExpandSlide;
  window.hideAddDropdown = hideAddDropdown;
  window.toggleAddDropdown = toggleAddDropdown;
  window.addSlideAfter = addSlideAfter;
  window.confirmAddSlideAI = confirmAddSlideAI;
  window.addSlideAI = addSlideAI;
})();

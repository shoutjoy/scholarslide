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

  async function generateSummary(type, options) {
    if (!rawText()) return;
    var customInstruction = (g('custom-instruction-val') && g('custom-instruction-val').value) || '';
    var slideCount = parseInt((g('slide-count-val') && g('slide-count-val').value) || (typeof localStorage !== 'undefined' && localStorage.getItem('ss_default_slide_count')) || '15', 10) || 15;
    var includeCover = g('include-cover') ? g('include-cover').checked !== false : true;
    var wStyle = (g('writing-style-val') && g('writing-style-val').value) || writingStyle();

    var writingStyleGuide = wStyle === 'academic-da'
      ? '문체: 학술체 (~이다, ~이었다, ~나타났다, ~된다). 격식체, 논문 스타일.'
      : wStyle === 'academic-im'
        ? '문체: 학술체 축약형 (~임, ~함, ~됨, ~있음). 개조식, 간결한 논문 스타일.'
        : '문체: 일반체 존댓말 (~합니다, ~했습니다, ~됩니다). 청중 친화적이고 정중한 어조.';

    if (type === 'full') {
      var opts = options || {};
      var mode = opts.mode || 'original';
      var styleId = opts.styleId || 'research';
      var slideCountOpt = opts.slideCount != null ? opts.slideCount : slideCount;

      var textToSummarize = rawText().substring(0, 15000);
      if (mode === 'translate' && typeof window.getRawTextForSummary === 'function') {
        if (window.showJobProgress) window.showJobProgress('translation', '🌐 원문 번역 중...', 5, '🌐');
        try {
          var translated = await window.getRawTextForSummary();
          textToSummarize = (translated || '').substring(0, 15000);
        } catch (e) {
          if (e.name !== 'AbortError' && window.showToast) window.showToast('❌ 번역 실패, 원문으로 요약합니다.');
        }
        if (window.hideJobProgress) window.hideJobProgress('translation', 0);
      }

      var box = g('summaryProgress');
      var pct = g('summaryPercent');
      if (box) box.style.display = 'block';
      if (pct) pct.textContent = '0';
      if (window.showJobProgress) window.showJobProgress('summary', '📖 요약 생성 중...', 5, '📖');
      var _prog = 5;
      var _progTimer = setInterval(function () {
        if (_prog < 85) {
          _prog += Math.random() * 3;
          if (pct) pct.textContent = Math.round(_prog);
          if (window.updateJobProgress) window.updateJobProgress('summary', _prog, '📖 요약 생성 중...');
        }
      }, 400);

      var prompt = typeof window.getSummaryPrompt === 'function'
        ? window.getSummaryPrompt(styleId, {
            text: textToSummarize,
            slideCount: slideCountOpt,
            granularity: opts.granularity || 'detail',
            writingStyleGuide: writingStyleGuide,
            customInstruction: customInstruction
          })
        : '이 학술 텍스트를 분석하여 구조화된 요약을 작성하세요: 연구 배경, 연구 질문/가설, 이론적 프레임워크, 연구 방법론, 주요 발견사항, 함의 및 시사점, 한계점. ' + writingStyleGuide + '\n\n텍스트:\n' + textToSummarize;
      var systemInstruction = typeof window.getSummarySystemInstruction === 'function'
        ? window.getSummarySystemInstruction(styleId)
        : '당신은 대학원 수준 연구 조교입니다.';
      var isEnglish = /^[a-zA-Z\s\d.,!?;:()\-'"]{50,}/.test(textToSummarize.substring(0, 200));
      var langInstruction = isEnglish ? 'Respond in English (same language as the source text).' : '한국어로 응답하세요.';
      try {
        var res = await window.callGemini(prompt, systemInstruction + ' ' + langInstruction);
        var text = res && res.text ? res.text : res;
        clearInterval(_progTimer);
        if (pct) pct.textContent = '100';
        if (window.updateJobProgress) window.updateJobProgress('summary', 100, '✅ 요약 완료');
        setTimeout(function () { if (box) box.style.display = 'none'; }, 1500);
        if (window.hideJobProgress) window.hideJobProgress('summary', 1500);
        setSummaryText(text);
        if (window.addSummaryToHistory && window.getFileName) {
          window.addSummaryToHistory({
            fileName: window.getFileName(),
            summaryText: text,
            styleId: styleId,
            mode: mode,
            granularity: opts.granularity || 'detail',
            slideCount: slideCountOpt
          });
        }
        if (window.leftTab !== undefined) window.leftTab = 'summary';
        setLeftTab('summary');
        document.querySelectorAll('.panel-left .panel-tab').forEach(function (el) { el.classList.remove('active'); });
        if (g('tab-summary')) g('tab-summary').classList.add('active');
        if (window.renderLeftPanel) window.renderLeftPanel();
        if (window.showToast) window.showToast('✅ 요약 생성 완료');
      } catch (e) {
        clearInterval(_progTimer);
        if (box) box.style.display = 'none';
        if (window.hideJobProgress) window.hideJobProgress('summary', 500);
        if (e.name !== 'AbortError' && window.showToast) window.showToast('❌ 요약 실패: ' + e.message);
      }
      return;
    }

    if (window.showJobProgress) window.showJobProgress('slideGen', '백그라운드에서 슬라이드 생성 중...', 0, '🗂');
    var isAcademic = slideStyle() === 'light';
    var styleGuide = isAcademic ? '텍스트 중심, 세부 내용 포함. ' + writingStyleGuide : '발표 중심: 핵심 요약, 간결한 bullet points, 청중 친화적. ' + writingStyleGuide;
    var coverNote = includeCover ? '첫 번째 슬라이드는 반드시 표지(논문 제목, 저자, 소속, 발표연도 등)로 구성하고 "isCover":true 로 표시하세요.' : '';
    var slideGenType = (g('slide-gen-type') && g('slide-gen-type').value) || (typeof localStorage !== 'undefined' && localStorage.getItem('ss_slide_gen_type')) || 'precision';
    var typeLabels = {
      precision: '정밀 요약형 (Precision Archive)',
      presentation: '발표 최적화형 (Presentation Focus)',
      notebook: '노트북/학습형 (Concept Mastery)',
      critical: '비판적 검토형 (Critical Analysis)',
      evidence: '시각적 증거형 (Evidence-Based Claims)',
      logic: '인과관계 도식형 (Logic Flow)',
      quiz: '상호작용형 (Interactive Quiz)',
      workshop: '워크숍형 (Practical Action)'
    };
    var typeLetters = { precision: 'A', presentation: 'B', notebook: 'C', critical: 'D', evidence: 'E', logic: 'F', quiz: 'G', workshop: 'H' };
    var typeLabel = typeLabels[slideGenType] || typeLabels.precision;
    var typeLetter = typeLetters[slideGenType] || 'A';
    var structureNote = '위 필수 구성 항목(8가지)을 순서대로 반영하고, 선택한 유형(Type ' + typeLetter + ')의 규칙을 적용하세요.';
    var noSlideNumNote = '각 슬라이드의 title에는 "Slide 1:", "Slide 15:" 같은 번호를 붙이지 말고, 섹션 제목만 넣으세요 (예: References - 참고문헌 리스트, Introduction, Methodology).';
    var prompt = '선택하신 ' + typeLabel + '으로 슬라이드 구성을 시작합니다.\n\n이 텍스트를 기반으로 정확히 ' + slideCount + '개의 슬라이드를 생성하세요.\n스타일: ' + styleGuide + '\n' + coverNote + '\n' + structureNote + '\n' + noSlideNumNote + '\n\n반드시 아래 JSON 배열 형식으로만 응답하세요 (코드블록 없이, 마크다운 없이):\n[{"title":"슬라이드 제목(번호 없이 섹션명만)","bullets":["포인트1","포인트2","포인트3"],"notes":"발표자 노트","visPrompt":"English diagram description for AI image generation","isCover":false}]\n\n텍스트:\n' + rawText().substring(0, 15000);
    if (customInstruction) prompt += '\n추가 지시: ' + customInstruction;
    var slideSystem = (typeof window.getSlideGenSystemPrompt === 'function' && window.getSlideGenSystemPrompt()) || 'You are an academic slide generator. Korean for title/bullets/notes, English for visPrompt.';
    try {
      var res = await window.callGemini(prompt, slideSystem);
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
      if (window.addToManuscriptHistory && window.getFileName) {
        var manuscriptContent = (typeof window.slidesToMarkdown === 'function') ? window.slidesToMarkdown(newSlides) : '';
        var entry = { type: 'slides', fileName: window.getFileName(), slides: newSlides.map(function (s) { return { id: s.id, title: s.title, bullets: s.bullets || [], notes: s.notes || '', visPrompt: s.visPrompt || '', isCover: s.isCover || false, imageUrl: null }; }), manuscriptContent: manuscriptContent };
        window.addToManuscriptHistory(entry);
        if (typeof window._selectedManuscriptHistoryId !== 'undefined') window._selectedManuscriptHistoryId = entry.id;
        if (typeof window.setManuscriptView === 'function') window.setManuscriptView('slides');
        if (typeof window.setManuscriptSubView === 'function') window.setManuscriptSubView('content');
      }
      if (window.showToast) window.showToast('✅ ' + newSlides.length + '개 슬라이드 생성 완료');
      if (window.renderLeftPanel) window.renderLeftPanel();
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.error(e);
        if (window.showToast) window.showToast('❌ 슬라이드 생성 실패: ' + e.message);
      }
    }
    if (window.hideJobProgress) window.hideJobProgress('slideGen', 0);
  }

  async function generatePresentationScript() {
    var s = getSlidesArr();
    if (!s.length) return;
    if (window.showLoading) window.showLoading('발표 원고 생성 중...', '슬라이드별 스크립트 작성', 20, true);
    try {
      var slideSummary = s.map(function (slide, i) { return '슬라이드 ' + (i + 1) + ' [' + slide.title + ']:\n- ' + (slide.bullets || []).join('\n- '); }).join('\n\n');
      var prompt = '다음 슬라이드 구조를 기반으로 각 슬라이드의 발표 원고를 작성하세요.\n- 각 슬라이드별 2-4분 분량의 자연스러운 발표 언어\n- 슬라이드 수와 동일한 수의 원고를 JSON 배열로만 응답: ["스크립트1","스크립트2",...]\n\n' + slideSummary;
      var scriptSystem = (typeof window.getPromptOverride === 'function' && window.getPromptOverride('slide_gen_script_system')) || '학술 발표 전문가입니다. 자연스러운 발표 원고를 한국어로 작성합니다.';
      var res = await window.callGemini(prompt, scriptSystem);
      var text = res && res.text ? res.text : res;
      var clean = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
      var match = clean.match(/\[[\s\S]*\]/);
      if (!match) throw new Error('JSON 파싱 실패');
      var script = JSON.parse(match[0]);
      setPresentationScript(script);
      setLeftTab('script');
      if (window.addToManuscriptHistory && window.getFileName) {
        var s = getSlidesArr();
        var entry = { type: 'script', fileName: window.getFileName(), presentationScript: script.slice(), slides: (s || []).map(function (sl) { return { title: sl.title, bullets: sl.bullets || [], notes: sl.notes || '' }; }) };
        window.addToManuscriptHistory(entry);
        if (typeof window._selectedManuscriptHistoryId !== 'undefined') window._selectedManuscriptHistoryId = entry.id;
        if (typeof window.setManuscriptSubView === 'function') window.setManuscriptSubView('content');
      }
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
      var prompt = '다음 슬라이드를 더 명확하고 학술적으로 재작성하세요. title에는 "Slide N:" 같은 번호를 넣지 말고 섹션 제목만 사용하세요. JSON으로만:\n{"title":"제목","bullets":["포인트1","포인트2","포인트3"],"notes":"노트","visPrompt":"English"}\n\n제목: ' + slide.title + '\n내용: ' + (slide.bullets || []).join(', ');
      var res = await window.callGemini(prompt, 'Academic slide rewriter. Korean for title/bullets/notes, English for visPrompt. Title must not include slide number (e.g. no "Slide 15:").');
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
    if (window.showJobProgress) window.showJobProgress('aiSlide', 'AI 슬라이드 생성 중...', 0, '🤖');
    try {
      var context = rawText() ? rawText().substring(0, 8000) : ('전체 슬라이드 맥락: ' + getSlidesArr().map(function (s) { return s.title; }).join(', '));
      var userExtra = extraContent ? '\n\n[추가 내용/키워드]: ' + extraContent : '';
      var userHint = promptHint ? '\n[세밀한 지시]: ' + promptHint : '';
      var prompt = '다음 텍스트를 기반으로 슬라이드 1개를 JSON으로만 생성 (코드블록 없이). title에는 "Slide N:" 같은 번호를 넣지 말고 섹션/내용 제목만 넣으세요:\n{"title":"제목(번호 없이)","bullets":["포인트1","포인트2","포인트3"],"notes":"발표자 노트","visPrompt":"English visual description"}\n\n' + context + userExtra + userHint;
      var res = await window.callGemini(prompt, 'Academic slide generator. Korean title/bullets/notes, English visPrompt. Do not include slide number in title.');
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
      if (window.hideJobProgress) window.hideJobProgress('aiSlide', 0);
      if (withImage && newSlide.visPrompt && window.generateImage) {
        if (window.showJobProgress) window.showJobProgress('aiImg', '백그라운드에서 이미지 생성 중...', 0, '🎨');
        (function () {
          window.generateImage(newSlide.visPrompt).then(function (img) {
            if (img) {
              var arr = getSlidesArr();
              var idx = arr.findIndex(function (sl) { return sl.id === newSlide.id; });
              if (idx >= 0) {
                if (window.pushSlideUndoState) window.pushSlideUndoState();
                var next = arr.slice();
                next[idx] = Object.assign({}, next[idx], { imageUrl: img });
                setSlides(next);
                if (window.addToAiImgHistory) window.addToAiImgHistory(newSlide.visPrompt, img, activeSlideIndex());
                if (window.renderSlides) window.renderSlides();
                if (window.renderThumbs) window.renderThumbs();
                if (window.renderGallery) window.renderGallery();
                if (window.showToast) window.showToast('✅ AI 이미지도 추가됨');
              }
            }
            if (window.hideJobProgress) window.hideJobProgress('aiImg', 0);
          }).catch(function (e) {
            if (e.name !== 'AbortError' && window.showToast) window.showToast('❌ AI 이미지 생성 실패: ' + e.message);
            if (window.hideJobProgress) window.hideJobProgress('aiImg', 0);
          });
        })();
      }
    } catch (e) {
      if (window.hideJobProgress) window.hideJobProgress('aiSlide', 0);
      if (e.name !== 'AbortError' && window.showToast) window.showToast('❌ AI 슬라이드 생성 실패: ' + e.message);
    }
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

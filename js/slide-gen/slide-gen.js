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
  function summaryText() { return window.getSummaryText ? window.getSummaryText() : ''; }
  function sourceTextForSlideGen(opts) {
    if (opts && opts.useSummaryForSlides && summaryText().trim()) return summaryText();
    return rawText();
  }
  function setSummaryText(t) { if (window.setSummaryText) window.setSummaryText(t); }
  function setLeftTab(t) { if (window.setLeftTab) window.setLeftTab(t); }
  function setPresentationScript(p) { if (window.setPresentationScript) window.setPresentationScript(p); }
  function setActiveSlideIndex(i) { if (window.setActiveSlideIndex) window.setActiveSlideIndex(i); }
  function activeSlideIndex() { return window.getActiveSlideIndex ? window.getActiveSlideIndex() : 0; }
  function slideStyle() { return window.getSlideStyle ? window.getSlideStyle() : 'light'; }
  function writingStyle() { return window.getWritingStyle ? window.getWritingStyle() : 'academic-da'; }
  function isTaskCancelled() {
    return !!(typeof window !== 'undefined' && (window._aiTaskCancelled || window._bgJobCancelled));
  }
  function wait(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }
  async function renderSlidesProgressively(allSlides) {
    var staged = [];
    for (var i = 0; i < allSlides.length; i++) {
      if (isTaskCancelled()) throw new Error('TASK_CANCELLED');
      staged.push(allSlides[i]);
      setSlides(staged.slice());
      if (window.renderSlides) window.renderSlides();
      if (window.renderThumbs) window.renderThumbs();
      if (window.renderGallery) window.renderGallery();
      if (window.updateJobProgress) {
        var pct = 40 + Math.round(((i + 1) / Math.max(1, allSlides.length)) * 45);
        window.updateJobProgress('slideGen', pct, '슬라이드 생성 반영 중... (' + (i + 1) + '/' + allSlides.length + ')');
      }
      await wait(45);
    }
    return staged;
  }
  function buildSlideMarkdownForVis(slide, idx) {
    var s = slide || {};
    var out = [];
    out.push('# Slide ' + (idx + 1));
    if (s.title) out.push('\nTitle: ' + s.title);
    var bullets = s.bullets || [];
    if (bullets.length) {
      out.push('\nBullets:');
      for (var i = 0; i < bullets.length; i++) out.push('- ' + String(bullets[i] || ''));
    }
    if (s.notes) out.push('\nNotes:\n' + String(s.notes));
    return out.join('\n');
  }
  function hasFigureTableCue(slide) {
    var s = slide || {};
    var text = [
      String(s.title || ''),
      (s.bullets || []).join(' '),
      String(s.notes || '')
    ].join(' ').toLowerCase();
    return /(figure|fig\.|table|chart|graph|diagram|caption|도표|도식|그림|표|캡션|그래프)/i.test(text);
  }
  function isWeakVisPrompt(prompt) {
    var p = String(prompt || '').trim();
    if (!p) return true;
    if (p.length < 60) return true;
    var detailTokens = /(axis|axes|legend|row|rows|column|columns|header|label|x-axis|y-axis|table|chart|graph|diagram|flow|timeline|variable|comparison|unit|annotat|callout|layout|grid)/i;
    if (!detailTokens.test(p)) return true;
    var genericOnly = /(academic (illustration|image|style)|professional infographic|minimal style|simple diagram|clean design)/i;
    if (genericOnly.test(p) && p.length < 120) return true;
    return false;
  }
  async function autoFillMissingVisPrompts(slidesArr) {
    if (!slidesArr || !slidesArr.length) return { requested: 0, generated: 0, failed: 0, rewritten: 0 };
    if (typeof window.callGemini !== 'function') return { requested: 0, generated: 0, failed: 0, rewritten: 0, unavailable: true };
    var targets = [];
    for (var i = 0; i < slidesArr.length; i++) {
      var s = slidesArr[i] || {};
      var current = String(s.visPrompt || '').trim();
      var cue = hasFigureTableCue(s);
      if (!current) {
        targets.push({ idx: i, mode: 'missing', cue: cue });
      } else if (cue && isWeakVisPrompt(current)) {
        targets.push({ idx: i, mode: 'rewrite', cue: cue });
      }
    }
    if (!targets.length) return { requested: 0, generated: 0, failed: 0, rewritten: 0 };
    if (window.showJobProgress) window.showJobProgress('slideAutoVisPrompt', 'visPrompt 자동 보강 중...', 0, '🧩');
    var generated = 0;
    var failed = 0;
    var rewritten = 0;
    for (var t = 0; t < targets.length; t++) {
      if (isTaskCancelled()) break;
      var target = targets[t];
      var idx = target.idx;
      var pct = Math.round((t / targets.length) * 100);
      if (window.updateJobProgress) window.updateJobProgress('slideAutoVisPrompt', pct, '슬라이드 ' + (idx + 1) + (target.mode === 'rewrite' ? ' visPrompt 재작성 중...' : ' visPrompt 보강 중...'));
      try {
        var mdContent = buildSlideMarkdownForVis(slidesArr[idx], idx);
        var visPromptPack = (typeof window.getImggenVisPromptInstruction === 'function')
          ? window.getImggenVisPromptInstruction(mdContent)
          : {
              system: 'You are an expert at creating detailed visual prompts for AI image generation. Output ONLY the prompt text.',
              user: 'Create a detailed English visual prompt for AI image generation based on this slide content. Output only the prompt.\n\n' + mdContent
            };
        var baseUser = visPromptPack.user || '';
        var qualityRule = '\n\n[Quality Filter]\n'
          + '- If this slide includes Figure/Table cues, the prompt must explicitly include layout structure.\n'
          + '- For table-like visuals: specify columns, rows, headers, labels, and units.\n'
          + '- For chart-like visuals: specify x-axis, y-axis, legend, compared groups, and key values.\n'
          + '- Avoid generic wording. Output only high-specificity English prompt text.';
        if (target.mode === 'rewrite') {
          var weakNow = String(slidesArr[idx].visPrompt || '').trim();
          baseUser += '\n\nCurrent weak visPrompt:\n' + weakNow + '\n\nRewrite this into a stronger, more specific visual prompt.';
        }
        var clean = '';
        var attemptUser = baseUser + qualityRule;
        for (var attempt = 0; attempt < 2; attempt++) {
          if (isTaskCancelled()) break;
          var res = await window.callGemini(attemptUser, visPromptPack.system);
          var text = (res && res.text ? res.text : res) || '';
          clean = String(text).replace(/```[\s\S]*?```/g, function (m) {
            return m.replace(/```/g, '');
          }).trim();
          if (!target.cue || !isWeakVisPrompt(clean)) break;
          attemptUser = baseUser + qualityRule + '\n\n[Retry]\nThe previous result was still weak. Regenerate with explicit structural details and concrete labels.';
        }
        if (!clean) {
          failed += 1;
          continue;
        }
        if (target.cue && isWeakVisPrompt(clean)) {
          failed += 1;
          continue;
        }
        slidesArr[idx].visPrompt = clean;
        generated += 1;
        if (target.mode === 'rewrite') rewritten += 1;
      } catch (e) {
        if (isTaskCancelled() || (e && e.name === 'AbortError')) break;
        failed += 1;
      }
    }
    if (window.updateJobProgress) window.updateJobProgress('slideAutoVisPrompt', 100, '✅ visPrompt 자동 보강 완료');
    if (window.hideJobProgress) window.hideJobProgress('slideAutoVisPrompt', 1000);
    return { requested: targets.length, generated: generated, failed: failed, rewritten: rewritten };
  }
  async function autoGenerateImagesForSlides(slidesArr) {
    if (!slidesArr || !slidesArr.length) return { requested: 0, generated: 0, failed: 0, skipped: 0 };
    if (typeof window.generateImage !== 'function') return { requested: 0, generated: 0, failed: 0, skipped: slidesArr.length, unavailable: true };
    var visFillResult = await autoFillMissingVisPrompts(slidesArr);
    var targets = [];
    for (var i = 1; i < slidesArr.length; i++) {
      var s = slidesArr[i] || {};
      if (s.visPrompt && String(s.visPrompt).trim() && !s.imageUrl) targets.push(i);
    }
    if (!targets.length) return { requested: 0, generated: 0, failed: 0, skipped: slidesArr.length, visFill: visFillResult };
    if (window.showJobProgress) window.showJobProgress('slideAutoImg', 'AII 이미지 자동 생성 중...', 0, '🎨');
    var generated = 0;
    var failed = 0;
    for (var t = 0; t < targets.length; t++) {
      if (isTaskCancelled()) break;
      var idx = targets[t];
      var pct = Math.round((t / targets.length) * 100);
      if (window.updateJobProgress) window.updateJobProgress('slideAutoImg', pct, '슬라이드 ' + (idx + 1) + ' 이미지 생성 중...');
      try {
        var prompt = String(slidesArr[idx].visPrompt || '').trim();
        var img = await window.generateImage(prompt);
        if (img) {
          slidesArr[idx].imageUrl = img;
          if (typeof window.applyFullFillImageLayout === 'function') window.applyFullFillImageLayout(slidesArr[idx]);
          generated += 1;
          if (window.addToAiImgHistory) window.addToAiImgHistory(prompt, img, idx);
          if (typeof window.imgBankAdd === 'function') {
            try { window.imgBankAdd({ dataURL: img, name: 'slide_' + Date.now() + '_' + idx, prompt: prompt }); } catch (e) {}
          }
          if (typeof window.pushSlideUndoState === 'function') window.pushSlideUndoState();
          setSlides(slidesArr.slice());
          if (window.renderSlides) window.renderSlides();
          if (window.renderThumbs) window.renderThumbs();
          if (window.renderGallery) window.renderGallery();
        } else {
          failed += 1;
        }
      } catch (e) {
        if (isTaskCancelled() || (e && e.name === 'AbortError')) break;
        if (e && e.message === 'NO_API_KEY' && window.showToast) window.showToast('⚠️ API 키를 설정해주세요');
        failed += 1;
      }
    }
    if (window.updateJobProgress) window.updateJobProgress('slideAutoImg', 100, '✅ AII 이미지 자동 생성 완료');
    if (window.hideJobProgress) window.hideJobProgress('slideAutoImg', 1200);
    return { requested: targets.length, generated: generated, failed: failed, skipped: Math.max(0, slidesArr.length - targets.length), visFill: visFillResult };
  }
  function parseSlideRange(text) {
    var raw = String(text || '').trim();
    if (!raw) return null;
    var range = raw.match(/^(\d+)\s*[-~]\s*(\d+)$/);
    if (range) {
      var min = parseInt(range[1], 10);
      var max = parseInt(range[2], 10);
      if (!isFinite(min) || !isFinite(max) || min <= 0 || max <= 0) return null;
      if (min > max) {
        var t = min;
        min = max;
        max = t;
      }
      return { min: min, max: max };
    }
    var single = raw.match(/^(\d+)$/);
    if (single) {
      var v = parseInt(single[1], 10);
      if (!isFinite(v) || v <= 0) return null;
      return { min: v, max: v };
    }
    return null;
  }
  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
  function cloneSlidesForHistory(arr) {
    try {
      return JSON.parse(JSON.stringify(Array.isArray(arr) ? arr : []));
    } catch (e) {
      return (arr || []).map(function (s, i) {
        return {
          id: s && s.id != null ? s.id : i,
          title: s && s.title || '',
          bullets: s && Array.isArray(s.bullets) ? s.bullets.slice() : [],
          notes: s && s.notes || '',
          visPrompt: s && s.visPrompt || '',
          isCover: !!(s && s.isCover),
          imageUrl: s && s.imageUrl || null,
          imageUrl2: s && s.imageUrl2 || null,
          innerSize: s && s.innerSize ? Object.assign({}, s.innerSize) : undefined,
          slideImage1: s && s.slideImage1 ? Object.assign({}, s.slideImage1) : undefined,
          slideImage2: s && s.slideImage2 ? Object.assign({}, s.slideImage2) : undefined
        };
      });
    }
  }
  function estimateAutoSlideCount(textLen, includeCover) {
    var chars = Math.max(1, parseInt(textLen || 0, 10));
    var byLength = Math.ceil(chars / 900);
    if (includeCover) byLength += 1;
    return clamp(byLength, 8, 80);
  }

  async function generateSummary(type, options) {
    if (typeof window !== 'undefined') window._aiTaskCancelled = false;
    var opts = options || {};
    if (type === 'full') {
      if (!rawText()) return;
    } else if (type === 'slides' || type === 'slides_auto') {
      var src = sourceTextForSlideGen(opts);
      if (!src || !src.trim()) {
        if (window.showToast) window.showToast('⚠️ 원문을 로드하거나, 요약자료로 생성 시에는 먼저 요약을 생성하세요.');
        return;
      }
    } else {
      if (!rawText()) return;
    }
    var customInstruction = (opts.customInstruction !== undefined && opts.customInstruction !== null)
      ? String(opts.customInstruction) : ((g('custom-instruction-val') && g('custom-instruction-val').value) || '');
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

      var summaryCharLimit = parseInt(
        (typeof localStorage !== 'undefined' && localStorage.getItem('ss_summary_char_limit')) || '1500000',
        10
      ) || 1500000;
      summaryCharLimit = Math.max(10000, Math.min(2000000, summaryCharLimit));
      var textToSummarize = rawText().substring(0, summaryCharLimit);
      if (mode === 'translate' && typeof window.getRawTextForSummary === 'function') {
        if (window.showJobProgress) window.showJobProgress('translation', '🌐 원문 번역 중...', 5, '🌐');
        try {
          var translated = await window.getRawTextForSummary();
          textToSummarize = (translated || '').substring(0, summaryCharLimit);
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

      var docTitle = (typeof window.getFileName === 'function' ? window.getFileName() : '') || '';
      if (docTitle) docTitle = docTitle.replace(/\.[^.]+$/, '');
      var formatDocTitleToAPA = function (s) {
        if (!s || !s.trim()) return s;
        s = s.trim();
        var m = s.match(/^(.+?)\s*\((\d{4})\)\s*(.*)$/);
        if (m) {
          var authors = m[1].replace(/\s+and\s+/gi, ' & ').replace(/\s*,\s*/g, ' & ').trim();
          var year = m[2];
          var title = m[3].trim();
          if (title && !/^[.!]/.test(title)) title = title.replace(/\.$/, '') + '.';
          return authors + ' (' + year + '). ' + (title || '');
        }
        return s;
      };
      if (docTitle) docTitle = formatDocTitleToAPA(docTitle);
      var prompt = typeof window.getSummaryPrompt === 'function'
        ? window.getSummaryPrompt(styleId, {
            text: textToSummarize,
            slideCount: slideCountOpt,
            granularity: opts.granularity || 'detail',
            writingStyleGuide: writingStyleGuide,
            customInstruction: customInstruction,
            docTitle: docTitle
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
        if (docTitle && text) {
          var intro = '다음은 원문 문서의 핵심 내용을 논문 구조에 맞춰 요약한 것입니다(from 제작자 박중희 교수).';
          var userInfoLine = '';
          if (typeof window.getUserInfoForSummary === 'function') {
            var ui = window.getUserInfoForSummary();
            if (ui) userInfoLine = '\n' + ui + '\n';
          }
          var oldIntro = '다음은 원문 문서의 핵심 내용을 논문 구조에 맞춰 요약한 것입니다.';
          if (text.indexOf(intro) === 0) {
            var rest = text.slice(intro.length).replace(/^\s+/, '');
            text = intro + '\n' + docTitle + userInfoLine + '\n' + rest;
          } else {
            var body = text.trim();
            if (body.indexOf(oldIntro) === 0) body = body.slice(oldIntro.length).replace(/^\s+/, '');
            text = intro + '\n' + docTitle + userInfoLine + '\n' + body;
          }
        }
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
        if (window.showJobCompleteBadge) window.showJobCompleteBadge('요약 생성 완료');
      } catch (e) {
        clearInterval(_progTimer);
        if (box) box.style.display = 'none';
        if (window.hideJobProgress) window.hideJobProgress('summary', 500);
        if (e && (e.name === 'AbortError' || e.message === 'TASK_CANCELLED')) {
          if (window.showToast) window.showToast('⏹ 요약 생성이 중단되었습니다.');
        } else if (window.showToast) {
          window.showToast('❌ 요약 실패: ' + e.message);
        }
      }
      return;
    }

    if (window.showJobProgress) window.showJobProgress('slideGen', '백그라운드에서 슬라이드 생성 중...', 0, '🗂');
    var slideSourceText = sourceTextForSlideGen(opts);
    var isAcademic = slideStyle() === 'light';
    var slideRangeRaw = (g('slide-range-val') && g('slide-range-val').value) || '';
    var parsedRange = parseSlideRange(slideRangeRaw);
    if (slideRangeRaw && !parsedRange && window.showToast) {
      window.showToast('⚠️ 페이지 범위 형식은 "최소-최대" 또는 단일 숫자여야 합니다. (예: 12-24)');
    }
    var slideGenType = (g('slide-gen-type') && g('slide-gen-type').value) || (typeof localStorage !== 'undefined' && localStorage.getItem('ss_slide_gen_type')) || 'precision';
    var isAutoSlideMode = type === 'slides_auto';
    if (isAutoSlideMode) slideGenType = 'auto_visual';
    var targetSlideCount = slideCount;
    if (isAutoSlideMode || slideGenType === 'auto_visual') {
      var estimated = estimateAutoSlideCount(slideSourceText.length, includeCover);
      if (parsedRange) {
        targetSlideCount = clamp(estimated, parsedRange.min, parsedRange.max);
      } else {
        targetSlideCount = estimated;
      }
      if (g('slide-count-val')) g('slide-count-val').value = String(targetSlideCount);
    }
    targetSlideCount = clamp(targetSlideCount, 5, 200);
    var pagePolicyNote = parsedRange
      ? ('슬라이드 수는 문서 길이를 기준으로 자동 산정하되, 반드시 사용자 범위 ' + parsedRange.min + '~' + parsedRange.max + ' 내에서 결정할 것.')
      : '슬라이드 수는 문서 길이와 정보 밀도에 맞춰 자동 산정할 것. 불필요한 분할은 피하고, 과밀한 슬라이드는 분리할 것.';
    var styleGuide = isAcademic ? '텍스트 중심, 세부 내용 포함. ' + writingStyleGuide : '발표 중심: 핵심 요약, 간결한 bullet points, 청중 친화적. ' + writingStyleGuide;
    if (slideGenType === 'auto_visual') {
      styleGuide += ' 자동 시각화 우선: 페이지별 핵심 메시지에 맞춰 그림/표/도식 필요 여부를 먼저 판단하고, 필요한 페이지에는 시각 요소 중심으로 구성.';
    }
    var coverNote = includeCover ? '첫 번째 슬라이드는 반드시 표지(논문 제목, 저자, 소속, 발표연도 등)로 구성하고 "isCover":true 로 표시하세요.' : '';
    var typeLabels = {
      precision: '정밀 요약형 (Precision Archive)',
      presentation: '발표 최적화형 (Presentation Focus)',
      notebook: '노트북/학습형 (Concept Mastery)',
      critical: '비판적 검토형 (Critical Analysis)',
      evidence: '시각적 증거형 (Evidence-Based Claims)',
      logic: '인과관계 도식형 (Logic Flow)',
      quiz: '상호작용형 (Interactive Quiz)',
      workshop: '워크숍형 (Practical Action)',
      auto_visual: 'AII 자동 시각화형 (Auto Visualizer)'
    };
    var typeLetters = { precision: 'A', presentation: 'B', notebook: 'C', critical: 'D', evidence: 'E', logic: 'F', quiz: 'G', workshop: 'H', auto_visual: 'I' };
    var typeLabel = typeLabels[slideGenType] || typeLabels.precision;
    var typeLetter = typeLetters[slideGenType] || 'A';
    var visualPolicy = slideGenType === 'auto_visual'
      ? '원자료(교재/PDF)의 도해·표·그림 내용을 최대한 보존해 재구성하고, 필요 시 해석을 덧붙인 신규 다이어그램을 제안할 것. 그림이 필요한 슬라이드에는 visPrompt를 반드시 구체적인 영어 문장으로 작성.'
      : '시각화가 필요할 때만 visPrompt를 작성하고, 불필요하면 빈 문자열로 둘 것.';
    var structureNote = (typeof window.getSlideGenStructureNote === 'function' ? window.getSlideGenStructureNote(typeLetter) : '위 필수 구성 항목(8가지)을 순서대로 반영하고, 선택한 유형(Type ' + typeLetter + ')의 규칙을 적용하세요.');
    var noSlideNumNote = (typeof window.getSlideGenNoSlideNumNote === 'function' ? window.getSlideGenNoSlideNumNote() : '각 슬라이드의 title에는 "Slide 1:", "Slide 15:" 같은 번호를 붙이지 말고, 섹션 제목만 넣으세요 (예: References - 참고문헌 리스트, Introduction, Methodology).');
    var userPrompt = (typeof window.getSlideGenUserPrompt === 'function' && window.getSlideGenUserPrompt({
      TYPE_LABEL: typeLabel,
      SLIDE_COUNT: String(targetSlideCount),
      STYLE_GUIDE: styleGuide,
      COVER_NOTE: coverNote,
      STRUCTURE_NOTE: structureNote,
      NO_SLIDE_NUM_NOTE: noSlideNumNote,
      PAGE_POLICY_NOTE: pagePolicyNote,
      VISUAL_POLICY: visualPolicy,
      TEXT: slideSourceText.substring(0, 15000)
    }));
    var prompt = userPrompt || ('선택하신 ' + typeLabel + '으로 슬라이드 구성을 시작합니다.\n\n이 텍스트를 기반으로 정확히 ' + targetSlideCount + '개의 슬라이드를 생성하세요.\n스타일: ' + styleGuide + '\n' + coverNote + '\n' + structureNote + '\n' + noSlideNumNote + '\n' + pagePolicyNote + '\n' + visualPolicy + '\n\n반드시 아래 JSON 배열 형식으로만 응답하세요 (코드블록 없이, 마크다운 없이):\n[{"title":"슬라이드 제목(번호 없이 섹션명만)","bullets":["포인트1","포인트2","포인트3"],"notes":"발표자 노트","visPrompt":"English diagram description for AI image generation","isCover":false}]\n\n텍스트:\n' + slideSourceText.substring(0, 15000));
    if (slideGenType === 'auto_visual') {
      prompt += '\n\n[강제 규칙 - 교재형 시각화]\n'
        + '- 그림/표/도해를 설명하는 슬라이드는 visPrompt를 반드시 작성.\n'
        + '- 원자료 캡션(제목, 변수, 단위, 비교군)을 visPrompt에 반영.\n'
        + '- table-like layout 또는 chart axes/legend/unit를 명시.\n'
        + '- 장식형 이미지 금지, 학습 목적 시각화만 허용.\n'
        + '- visPrompt가 비어 있으면 해당 슬라이드는 실패로 간주.';
    }
    if (isAutoSlideMode && typeof window.getPromptOverride === 'function') {
      var allCustom = window.getPromptOverride('slide_gen_all_custom');
      if (allCustom && String(allCustom).trim()) customInstruction = String(allCustom).trim();
    }
    if (customInstruction) prompt += '\n추가 지시: ' + customInstruction;
    var slideSystem = (typeof window.getSlideGenSystemPrompt === 'function' && window.getSlideGenSystemPrompt(isAutoSlideMode ? 'all' : slideGenType)) || 'You are an academic slide generator. Korean for title/bullets/notes, English for visPrompt.';
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
      // 표지 슬라이드에 설정의 사용자 정보(체크된 항목만) 추가
      if (newSlides.length && newSlides[0].isCover && typeof window.getUserInfoForSummary === 'function') {
        var userInfo = window.getUserInfoForSummary();
        if (userInfo && userInfo.trim()) {
          newSlides[0].bullets = (newSlides[0].bullets || []).concat('발표자: ' + userInfo.trim());
        }
      }
      var prevSlidesSnapshot = getSlidesArr();
      var addToHistoryFn = isAutoSlideMode && window.addToAllSlideHistory ? window.addToAllSlideHistory : window.addToSlideHistory;
      if (prevSlidesSnapshot && prevSlidesSnapshot.length && addToHistoryFn) {
        var prevSlidesCloned = cloneSlidesForHistory(prevSlidesSnapshot);
        var prevEntry = {
          fileName: ((window.getFileName ? window.getFileName() : '') || '슬라이드') + ' (생성 전)',
          slides: prevSlidesCloned,
          manuscriptContent: (typeof window.slidesToMarkdown === 'function') ? window.slidesToMarkdown(prevSlidesCloned) : '',
          isBackupBeforeRegeneration: true
        };
        addToHistoryFn(prevEntry);
        if (window.showToast) window.showToast('🗂 기존 슬라이드를 히스토리에 저장했습니다. (클릭 시 복원)');
      }
      if (window.updateJobProgress) window.updateJobProgress('slideGen', 35, '슬라이드 생성 결과 반영 중...');
      newSlides = await renderSlidesProgressively(newSlides);
      setActiveSlideIndex(0);
      setPresentationScript([]);
      if (window.afterSlidesCreated) window.afterSlidesCreated();
      var autoImgResult = null;
      if (slideGenType === 'auto_visual') {
        autoImgResult = await autoGenerateImagesForSlides(newSlides);
      }
      var addToHistoryFn = isAutoSlideMode && window.addToAllSlideHistory ? window.addToAllSlideHistory : window.addToSlideHistory;
      if (addToHistoryFn && window.getFileName) {
        var manuscriptContent = (typeof window.slidesToMarkdown === 'function') ? window.slidesToMarkdown(newSlides) : '';
        var entry = { fileName: window.getFileName(), slides: cloneSlidesForHistory(newSlides), manuscriptContent: manuscriptContent };
        addToHistoryFn(entry);
        if (typeof window._selectedManuscriptHistoryId !== 'undefined') window._selectedManuscriptHistoryId = entry.id || null;
        if (typeof window.setManuscriptView === 'function') window.setManuscriptView(isAutoSlideMode ? 'allslides' : 'slides');
        if (typeof window.setManuscriptSubView === 'function') window.setManuscriptSubView('content');
      }
      if (window.showToast) {
        var msg = '✅ ' + newSlides.length + '개 슬라이드 생성 완료' + (slideGenType === 'auto_visual' ? ' (AII 자동 시각화형)' : '');
        if (autoImgResult && slideGenType === 'auto_visual') {
          if (autoImgResult.unavailable) msg += ' / 이미지 자동 생성 기능을 사용할 수 없음';
          else {
            if (autoImgResult.visFill && autoImgResult.visFill.requested) {
              msg += ' / visPrompt 보강 ' + autoImgResult.visFill.generated + '개'
                + (autoImgResult.visFill.rewritten ? (' (재작성 ' + autoImgResult.visFill.rewritten + '개 포함)') : '')
                + (autoImgResult.visFill.failed ? (' (실패 ' + autoImgResult.visFill.failed + '개)') : '');
            }
            msg += ' / 이미지 생성 ' + autoImgResult.generated + '개' + (autoImgResult.failed ? (' (실패 ' + autoImgResult.failed + '개)') : '');
          }
        }
        window.showToast(msg);
      }
      if (window.showJobCompleteBadge) window.showJobCompleteBadge(newSlides.length + '개 슬라이드 생성 완료');
      if (window.renderLeftPanel) window.renderLeftPanel();
    } catch (e) {
      if (e && (e.name === 'AbortError' || e.message === 'TASK_CANCELLED')) {
        if (window.showToast) window.showToast('⏹ 슬라이드 생성이 중단되었습니다.');
      } else {
        console.error(e);
        if (window.showToast) window.showToast('❌ 슬라이드 생성 실패: ' + e.message);
      }
    }
    if (window.hideJobProgress) window.hideJobProgress('slideGen', 0);
  }

  async function generatePresentationScript() {
    if (typeof window !== 'undefined') window._aiTaskCancelled = false;
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
        var entry = { fileName: window.getFileName(), presentationScript: script.slice(), slides: (s || []).map(function (sl) { return { title: sl.title, bullets: sl.bullets || [], notes: sl.notes || '' }; }) };
        var savedScriptId = window.addToManuscriptHistory(entry);
        if (typeof window._selectedManuscriptHistoryId !== 'undefined') window._selectedManuscriptHistoryId = savedScriptId || entry.id || null;
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
    if (typeof window !== 'undefined') window._aiTaskCancelled = false;
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
    if (typeof window !== 'undefined') window._aiTaskCancelled = false;
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
    } else if (mode === 'image-only') {
      var newSlide = { id: Date.now(), title: '', bullets: [], notes: '', visPrompt: '', imageUrl: null, isImageOnly: true };
      if (window.pushSlideUndoState) window.pushSlideUndoState();
      var next = getSlidesArr().slice();
      next.splice(afterIndex + 1, 0, newSlide);
      setSlides(next);
      setActiveSlideIndex(afterIndex + 1);
      if (window.afterSlidesCreated) window.afterSlidesCreated();
      if (window.selectSlide) window.selectSlide(afterIndex + 1);
      if (window.showToast) window.showToast('✅ 이미지 전용 페이지 추가됨');
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
    if (typeof window !== 'undefined') window._aiTaskCancelled = false;
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
                if (typeof window.applyFullFillImageLayout === 'function') window.applyFullFillImageLayout(next[idx]);
                setSlides(next);
                if (window.addToAiImgHistory) window.addToAiImgHistory(newSlide.visPrompt, img, activeSlideIndex());
                if (typeof window.imgBankAdd === 'function') {
                  try { window.imgBankAdd({ dataURL: img, name: 'slide_ai_' + Date.now(), prompt: newSlide.visPrompt }); } catch (e) {}
                }
                if (window.renderSlides) window.renderSlides();
                if (window.renderThumbs) window.renderThumbs();
                if (window.renderGallery) window.renderGallery();
                if (window.showToast) window.showToast('✅ AI 이미지도 추가됨');
              }
            }
            if (window.hideJobProgress) window.hideJobProgress('aiImg', 0);
          }).catch(function (e) {
            if (e.name !== 'AbortError' && window.showToast) window.showToast('❌ ' + (e.message === 'NO_API_KEY' ? 'API 키를 설정해주세요' : 'AI 이미지 생성 실패: ' + e.message));
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

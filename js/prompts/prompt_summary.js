/**
 * ScholarSlide — 요약 프롬프트 관리
 * 학술 논문/전문자료 요약: 세밀도(세밀한/기본/핵심), 원문 1/3 이상 보존, 논문 구조·필요성·이론적 배경·APA 인용 반영
 */
(function (global) {
  'use strict';

  var SUMMARY_MODES = [
    { id: 'original', label: '원문요약' },
    { id: 'translate', label: '번역요약' }
  ];

  /** 요약 세밀도: 세밀한(기본) | 기본 | 핵심 */
  var SUMMARY_GRANULARITY = [
    { id: 'detail', label: '세밀한 요약' },
    { id: 'basic', label: '기본 요약' },
    { id: 'key', label: '핵심 요약' }
  ];

  function getDocTitleInstruction(docTitle) {
    if (!docTitle || typeof docTitle !== 'string') return '';
    var t = docTitle.trim();
    if (!t) return '';
    return '요약 맨 위 첫 줄에 반드시 다음 문서 제목을 마크다운 헤딩(# 또는 ##)으로 포함하세요: ' + t + '\n\n';
  }

  function getGranularityInstruction(granularity) {
    var common = [
      '논문·학술 자료이므로 논문 구조(서론-이론-방법-결과-논의)에 맞춰 요약할 것.',
      '연구의 필요성(배경·문제의식)을 명확히 서술할 것.',
      '이론적 배경에서는 각 이론·개념에 대한 설명을 빠짐없이 정리할 것.',
      '인용은 반드시 APA 양식으로 (저자, 연도) 또는 저자(연도) 형태를 유지할 것. 원문에 나온 모든 주요 인용을 누락하지 말 것.'
    ];
    if (granularity === 'detail') {
      return [
        '【세밀한 요약】',
        '원문 분량의 1/3 이상을 담을 만큼 충실히 요약할 것. 핵심 문장·수치·논리 전개를 가능한 한 보존할 것.',
        '',
        common.join('\n')
      ].join('\n');
    }
    if (granularity === 'basic') {
      return [
        '【기본 요약】',
        '원문의 구조와 논지를 유지하되, 각 섹션을 균형 있게 요약할 것. 필요성·이론·방법·결과·시사점을 모두 포함할 것.',
        '',
        common.join('\n')
      ].join('\n');
    }
    return [
      '【핵심 요약】',
      '가장 중요한 논지·발견·시사점을 압축하되, 필요성·이론적 배경·인용(APA)은 반드시 포함할 것.',
      '',
      common.join('\n')
    ].join('\n');
  }

  var SUMMARY_STYLES = [
    {
      id: 'detail',
      label: '세밀한 요약 (Detailed)',
      systemInstruction: 'You are an academic summarization specialist. Preserve at least one-third of the source content, follow paper structure, and include all key citations in APA (Author, Year) format.',
      getPrompt: function (text, opts) {
        var g = getGranularityInstruction((opts && opts.granularity) || 'detail');
        var titleInstr = getDocTitleInstruction((opts && opts.docTitle) || '');
        return [
          titleInstr,
          g,
          '',
          '요약 시 반드시 포함할 항목:',
          '1. 연구의 필요성·배경·문제 제기',
          '2. 이론적 배경 — 관련 이론·선행연구를 개념 설명과 함께 정리, 인용(저자, 연도) 유지',
          '3. 연구 방법·설계·분석',
          '4. 연구 결과(핵심 발견·수치·해석)',
          '5. 논의·시사점·한계·제언',
          '',
          '출력은 위 항목별로 제목을 붙여 구조화할 것. 원문의 인용은 APA 형식으로 그대로 반영할 것.',
          '',
          'Document:',
          text
        ].join('\n');
      }
    },
    {
      id: 'key',
      label: '핵심요약 (Key Summary)',
      systemInstruction: 'You are an academic summarization engine. Extract core messages while preserving research necessity, theoretical background, and APA citations (Author, Year).',
      getPrompt: function (text, opts) {
        var g = getGranularityInstruction((opts && opts.granularity) || 'detail');
        var titleInstr = getDocTitleInstruction((opts && opts.docTitle) || '');
        return [
          titleInstr,
          g,
          '',
          '요구사항:',
          '1. 문서의 중심 주제와 5~7개의 핵심 포인트 추출.',
          '2. 각 포인트는 연구 필요성·이론·결과·시사점과 연결되도록 할 것.',
          '3. 원문에 등장한 주요 인용은 (저자, 연도) 형태로 포함할 것.',
          '4. 한 문장으로 압축하되, 학술적 맥락을 놓치지 말 것.',
          '',
          '출력 형식:',
          '주제: (한 문장)',
          '핵심 포인트:',
          '1. …',
          '2. …',
          '…',
          '',
          'Document:',
          text
        ].join('\n');
      }
    },
    {
      id: 'slide',
      label: '슬라이드 요약 (Slide Ready)',
      systemInstruction: 'You are a presentation slide generator for academic research. Create slide-ready sections that cover research necessity, theoretical background, research model/design, results, implications, and review/reflection.',
      getPrompt: function (text, opts) {
        var slideCount = (opts && opts.slideCount) || 12;
        var g = getGranularityInstruction((opts && opts.granularity) || 'detail');
        var titleInstr = getDocTitleInstruction((opts && opts.docTitle) || '');
        return [
          titleInstr,
          g,
          '',
          '슬라이드용 요약이므로 아래 항목을 빠짐없이 포함할 것. 각 항목별로 슬라이드 제목과 불릿(3~5개) 형태로 정리.',
          '',
          '필수 항목 (순서 유지):',
          '1. 연구의 필요성',
          '2. 이론적 배경 — 이론·개념 설명과 인용(저자, 연도)',
          '3. 연구 모형·가설·설계',
          '4. 연구 방법·분석',
          '5. 연구 결과',
          '6. 논의·시사점',
          '7. 한계·제언',
          '8. 연구에 대한 소감·리뷰(선택)',
          '',
          '요구사항: 정확히 ' + slideCount + '개 슬라이드 분량으로 구성. 각 슬라이드 = 제목 + 3~5개 불릿. 인용은 APA 유지.',
          '',
          '출력 형식:',
          'Slide 1',
          'Title:',
          '- …',
          'Slide 2',
          'Title:',
          '- …',
          '(… ' + slideCount + '개까지)',
          '',
          'Document:',
          text
        ].join('\n');
      }
    },
    {
      id: 'structural',
      label: '구조 요약 (Structural)',
      systemInstruction: 'You are an academic structure analyst. Summarize each section (necessity, theory, method, results, discussion) with clear theory explanations and APA citations.',
      getPrompt: function (text, opts) {
        var g = getGranularityInstruction((opts && opts.granularity) || 'detail');
        var titleInstr = getDocTitleInstruction((opts && opts.docTitle) || '');
        return [
          titleInstr,
          g,
          '',
          '문서의 논문적 구조를 파악하여 다음 섹션별로 요약할 것:',
          '· 문제 제기/필요성',
          '· 이론적 배경(이론 설명·인용 포함)',
          '· 연구 방법·설계',
          '· 결과',
          '· 논의·시사점',
          '각 섹션 요약 시 원문의 인용(저자, 연도)을 누락하지 말 것.',
          '',
          'Document:',
          text
        ].join('\n');
      }
    },
    {
      id: 'concept',
      label: '개념 요약 (Concept)',
      systemInstruction: 'You are a concept extraction engine for academic texts. Define key concepts with theory context and cite sources in APA (Author, Year).',
      getPrompt: function (text, opts) {
        var g = getGranularityInstruction((opts && opts.granularity) || 'detail');
        var titleInstr = getDocTitleInstruction((opts && opts.docTitle) || '');
        return [
          titleInstr,
          g,
          '',
          '핵심 개념을 추출하고 각 개념에 대해: 정의, 이론적 설명, 필요 시 인용(저자, 연도)을 포함할 것.',
          '',
          'Document:',
          text
        ].join('\n');
      }
    },
    {
      id: 'comparative',
      label: '비교 요약 (Comparative)',
      systemInstruction: 'You are an analytical comparison engine. Compare theories/models with clear descriptions and APA citations.',
      getPrompt: function (text, opts) {
        var g = getGranularityInstruction((opts && opts.granularity) || 'detail');
        var titleInstr = getDocTitleInstruction((opts && opts.docTitle) || '');
        return [
          titleInstr,
          g,
          '',
          '비교 가능한 이론·모델·주장을 식별하고, 특성·유사점·차이점을 정리할 것. 인용은 (저자, 연도) 유지.',
          '',
          'Document:',
          text
        ].join('\n');
      }
    },
    {
      id: 'research',
      label: '연구 요약 (Research)',
      systemInstruction: 'You are an academic research summarizer. Summarize with research necessity, theoretical background (with clear theory explanations), method, results, implications, and full APA in-text citations.',
      getPrompt: function (text, opts) {
        var g = getGranularityInstruction((opts && opts.granularity) || 'detail');
        var titleInstr = getDocTitleInstruction((opts && opts.docTitle) || '');
        return [
          titleInstr,
          g,
          '',
          '구조화된 연구 요약. 반드시 포함:',
          '· 연구 문제·필요성',
          '· 이론적 배경 — 이론 설명을 명확히, 인용(저자, 연도) 포함',
          '· 연구 방법',
          '· 주요 결과',
          '· 함의·시사점·한계',
          '원문 인용을 APA 형식으로 빠짐없이 반영할 것.',
          '',
          'Document:',
          text
        ].join('\n');
      }
    }
  ];

  function getStyleById(id) {
    for (var i = 0; i < SUMMARY_STYLES.length; i++) {
      if (SUMMARY_STYLES[i].id === id) return SUMMARY_STYLES[i];
    }
    return SUMMARY_STYLES[0];
  }

  function getSummaryPrompt(styleId, options) {
    var style = getStyleById(styleId || 'detail');
    var text = (options && options.text) || '';
    var opts = {
      slideCount: (options && options.slideCount) != null ? options.slideCount : 12,
      granularity: (options && options.granularity) || 'detail',
      docTitle: (options && options.docTitle) || ''
    };
    var prompt = style.getPrompt(text, opts);
    if (options && options.writingStyleGuide) {
      prompt = options.writingStyleGuide + '\n\n' + prompt;
    }
    if (options && options.customInstruction) {
      prompt = prompt + '\n\n추가 지시: ' + options.customInstruction;
    }
    return prompt;
  }

  function getSummarySystemInstruction(styleId) {
    var style = getStyleById(styleId || 'detail');
    var override = (typeof global.getPromptOverride === 'function') ? global.getPromptOverride('summary_system_' + style.id) : null;
    return override !== null ? override : style.systemInstruction;
  }

  global.SUMMARY_MODES = SUMMARY_MODES;
  global.SUMMARY_GRANULARITY = SUMMARY_GRANULARITY;
  global.SUMMARY_STYLES = SUMMARY_STYLES;
  global.getSummaryPrompt = getSummaryPrompt;
  global.getSummarySystemInstruction = getSummarySystemInstruction;
})(typeof window !== 'undefined' ? window : this);

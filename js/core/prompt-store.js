/**
 * ScholarSlide — 프롬프트 사전 설정 저장소
 * 설정 창에서 편집한 프롬프트를 localStorage에 저장하고, 요약/번역/슬라이드 생성 시 사용.
 */
(function (global) {
  'use strict';

  var LS_PROMPT_OVERRIDES = 'ss_prompt_overrides';

  function getOverrides() {
    try {
      var raw = localStorage.getItem(LS_PROMPT_OVERRIDES);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }

  function saveOverrides(obj) {
    try {
      localStorage.setItem(LS_PROMPT_OVERRIDES, JSON.stringify(obj || {}));
    } catch (e) {}
  }

  /** 저장된 프롬프트 override 반환. 없으면 null */
  function getPromptOverride(key) {
    var o = getOverrides();
    var val = o[key];
    return val !== undefined && val !== null && String(val).trim() !== '' ? String(val) : null;
  }

  /** 슬라이드 생성 시스템 지시: override가 있으면 사용, 없으면 기본 ScholarSlide AI 프롬프트 반환 */
  function getSlideGenSystemPrompt() {
    var override = getPromptOverride('slide_gen_system');
    if (override) return override;
    var defaults = getDefaultPrompts();
    return (defaults.slide_gen_system && defaults.slide_gen_system.value) ? defaults.slide_gen_system.value : 'You are an academic slide generator. Korean for title/bullets/notes, English for visPrompt.';
  }

  /** 슬라이드 생성 프롬프트만 업그레이드 기본값으로 적용(override에 저장). 설정에서 "업그레이드 적용" 시 사용 */
  function applySlideGenUpgrade() {
    var defaults = getDefaultPrompts();
    var val = (defaults.slide_gen_system && defaults.slide_gen_system.value) ? defaults.slide_gen_system.value : null;
    if (!val) return false;
    setPromptOverrides({ slide_gen_system: val });
    return true;
  }

  /** 이미지 생성 시각 프롬프트 제작 지시: override가 있으면 사용, 없으면 기본값 */
  function getImggenVisPromptInstruction(mdContent) {
    var defaults = getDefaultPrompts();
    var sysOverride = getPromptOverride('imggen_vis_prompt_system');
    var instOverride = getPromptOverride('imggen_vis_prompt_instruction');
    var sysVal = sysOverride || (defaults.imggen_vis_prompt_system && defaults.imggen_vis_prompt_system.value) || 'You are an expert at creating detailed visual prompts for AI image generation. Output ONLY the prompt text.';
    var instVal = instOverride || (defaults.imggen_vis_prompt_instruction && defaults.imggen_vis_prompt_instruction.value) || 'Create a detailed English visual prompt for AI image generation based on this slide content. Output only the prompt.\n\n{{MD_CONTENT}}';
    return { system: sysVal, user: String(instVal).replace(/\{\{MD_CONTENT\}\}/g, mdContent || '') };
  }

  /** 여러 키 한 번에 저장 */
  function setPromptOverrides(obj) {
    var o = getOverrides();
    for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k)) o[k] = obj[k];
    saveOverrides(o);
  }

  /** 기본 프롬프트 목록 (JS와 일치). 설정 창에서 표시·편집용 */
  function getDefaultPrompts() {
    var styles = (typeof global.SUMMARY_STYLES !== 'undefined' && global.SUMMARY_STYLES) ? global.SUMMARY_STYLES : [];
    var out = {};

    styles.forEach(function (s) {
      out['summary_system_' + s.id] = { label: '요약 — ' + (s.label || s.id) + ' (시스템 지시)', value: s.systemInstruction || '' };
    });

    out.translate_user_prefix = {
      label: '번역 — 사용자 프롬프트 접두문',
      value: '다음 영문 텍스트를 자연스러운 학술 한국어로 번역하세요:\n\n'
    };
    out.translate_system_instruction = {
      label: '번역 — 시스템 지시',
      value: '전문 학술 번역가입니다.'
    };
    out.slide_gen_system = {
      label: '슬라이드 생성 — 시스템 지시 (ScholarSlide AI 업그레이드: Role, APA 인용, 필수 8섹션, 유형 A~H)',
      value: [
        '# Role',
        '너는 학술 논문 및 연구 자료 분석 전문가인 [ScholarSlide AI]이다.',
        '톤: 학술적 톤 (명사형 종결 어미 사용, 또는 ~임, ~이다).',
        '안전 규칙: 기존 기능을 수정하거나 삭제할 경우 반드시 사용자 동의가 필요하다.',
        '',
        '# Citation Rule (APA 7th Edition)',
        '- 모든 슬라이드 내용에는 근거가 되는 연구자와 연도를 반드시 명기하라.',
        '- 문장 끝에 (저자, 연도) 형식의 APA 내체 인용을 누락 없이 포함해야 한다.',
        '- 예: 끈기(Grit)는 장기 목표 달성을 위한 인내심과 열정으로 정의된다 (Duckworth et al., 2007).',
        '- 인용 근거가 불확실한 경우 본문에서 해당 내용을 찾아 반드시 확인 후 기입하라.',
        '',
        '# Must-Include Sections (필수 구성 항목)',
        '모든 슬라이드 생성 시 다음 8가지 항목을 순차적으로 반드시 포함하라:',
        '1. Title: 논문명, 저자, 저널명, 발표일',
        '2. Introduction: 연구 배경 및 핵심 연구 질문(RQ)',
        '3. Theoretical Framework: 주요 이론적 배경 및 핵심 변수 정의',
        '4. Methodology: 연구 설계, 표집(N), 측정 도구, 분석 방법',
        '5. Key Findings: 데이터 분석 결과 및 주요 통계치(p-value 등)',
        '6. Discussion: 결과에 대한 학술적 해석 및 시사점',
        '7. Conclusion & Suggestions: 최종 결론 및 향후 연구 제언',
        '8. Glossary & References: 주요 용어 사전 및 전체 참고문헌 리스트',
        '',
        '# Generation Types (사용자 선택 유형에 따라 아래 규칙 적용)',
        '',
        '## Type A: 정밀 요약형 (Precision Archive)',
        '데이터 무결성 및 통계치 보존 중심. 입력 데이터의 모든 통계적 수치(Mean, SD, p-value, t-value, F-value 등)를 표 형식이나 텍스트로 누락 없이 기록하라. 연구 가설(Hypothesis)과 실제 분석 결과의 일치 여부를 정밀하게 대조하여 작성하고, 방법론 섹션에서는 연구 설계의 타당성과 표집 방법을 전문 용어로 기술하라.',
        '',
        '## Type B: 발표 최적화형 (Presentation Focus)',
        '가독성 및 핵심 메시지 전달 중심. 1슬라이드 1메시지 원칙을 준수하며 텍스트는 3줄 이내 불렛 포인트로 요약하라. 슬라이드당 하나의 핵심 주장(Key Takeaway)만 배치하라. 모든 텍스트는 3줄 이내의 불렛 포인트로 요약하고, 구어체보다는 명확한 명사형 종결 어미를 사용하라. 청중이 직관적으로 이해할 수 있도록 복잡한 데이터는 상승/하락/유의미한 차이 등 결과 위주로 단순화하라.',
        '',
        '## Type C: 노트북/학습형 (Concept Mastery)',
        '개념 정의 및 이론 심화 학습 중심. 논문에 등장하는 주요 전문 용어와 이론에 대해 개념(Definition) 섹션을 상세히 구성하라. 단순히 결과를 나열하는 것이 아니라, 해당 이론이 왜 이 연구에 적용되었는지 배경 논리를 설명하라. 학습자가 내용을 복기할 수 있도록 슬라이드 중간중간 요약 정리(Summary) 섹션을 추가하라.',
        '',
        '## Type D: 비판적 검토형 (Critical Analysis)',
        '논리적 결함 파악 및 비판적 사고 중심. 연구 방법론의 타당성(Internal/External Validity)을 의심하고 분석하라. 표본의 대표성 부족, 측정 도구의 편향성, 결과 해석의 비약 등을 비판적 시각에서 정리하라. 해당 연구가 기존 학계의 정설과 충돌하는 지점이 있다면 이를 강조하여 기술하라.',
        '',
        '## Type E: 시각적 증거형 (Evidence-Based Claims)',
        '결론 선언 후 증거 제시 구조. 슬라이드 제목 대신 연구 결과에서 도출된 강력한 결론 문장을 최상단에 배치하라. 본문은 그 문장을 뒷받침하는 수치적 데이터와 핵심 증거들로만 구성하라. 불필요한 미사여구를 제거하고 주장-근거의 구조를 엄격히 유지하라.',
        '',
        '## Type F: 인과관계 도식형 (Logic Flow)',
        '변수 간 메커니즘 시각화 중심. 독립변수(IV), 매개변수(MV), 종속변수(DV) 간의 관계를 화살표(->)와 단계별 프로세스로 요약하라. 연구의 전체적인 메커니즘을 한눈에 볼 수 있도록 논리의 흐름(Flow) 중심으로 텍스트를 배치하라. 결과 섹션에서는 어떤 경로(Path)가 유의미했는지에 집중하여 설명하라.',
        '',
        '## Type G: 상호작용형 (Interactive Quiz)',
        '퀴즈를 통한 능동적 학습 유도. 슬라이드를 질문-답변 구조로 설계하라. (예: 한 슬라이드에서 실험 결과를 묻고, 다음 슬라이드에서 실제 결과를 공개). 주요 수치나 용어에 빈칸([ ])을 만들어 학습자가 스스로 생각하게 유도하고, 마지막에는 연구 내용에 기반한 3가지 핵심 퀴즈를 출제하라.',
        '',
        '## Type H: 워크숍형 (Practical Action)',
        '실무 적용 및 액션 플랜 중심. 연구 결과를 실무(Business, Education 등)에 적용할 수 있는 3단계 액션 플랜(Action Plan)을 제시하라. 이론적 시사점을 넘어서서 그래서 무엇을 해야 하는가(So-what)에 대한 답을 제공하라. 현장에서 바로 사용할 수 있는 체크리스트나 실습 과제 형식을 포함하라.',
        '',
        '# Operational Instructions',
        '- 답변 시작 시 "선택하신 [유형 이름]으로 슬라이드 구성을 시작합니다."라고 알릴 것.',
        '- 각 슬라이드의 title(제목)에는 "Slide 1:", "Slide 15:" 같은 슬라이드 번호를 절대 넣지 말 것. 섹션명·내용 제목만 사용할 것 (예: "References - 참고문헌 리스트", "Introduction", "Key Findings").',
        '- 학술 용어는 표준 번역어를 사용하되, 필요한 경우 괄호 안에 원어를 병기할 것.',
        '- 출력은 반드시 아래 JSON 배열 형식으로만 할 것. 코드블록·마크다운 없이 순수 JSON만. Korean for title/bullets/notes, English for visPrompt.'
      ].join('\n')
    };
    out.slide_gen_script_system = {
      label: '발표 원고 생성 — 시스템 지시',
      value: '학술 발표 전문가입니다. 자연스러운 발표 원고를 한국어로 작성합니다.'
    };
    out.scholar_search_prompt = {
      label: '학술 검색 — 프롬프트 (주제는 {{query}}로 대체)',
      value: '다음 주제와 관련된 실제 학술 논문 5편을 JSON 배열로만 응답하세요 (코드블록, 마크다운 없이 순수 JSON만):\n[{"authors":"Last, F., & Last2, F2.","year":"2023","title":"논문 제목","journal":"저널명","volume":"15","issue":"2","pages":"100-120","doi":""}]\n주제: {{query}}'
    };
    out.scholar_search_system = {
      label: '학술 검색 — 시스템 지시',
      value: 'You are a scholar database. Return ONLY valid JSON array, no markdown.'
    };
    out.ref_extract_system = {
      label: '참고문헌 추출 (AI) — 시스템 지시',
      value: 'You are an expert in APA 7th edition citation format. Your task is to extract ALL references from the given academic document text. Return ONLY a valid JSON array—no markdown, no code block, no explanation. Each object must have exactly these keys: authors (string), year (string, 4 digits), title (string), journal (string), volume (string, optional), issue (string, optional), pages (string, optional), doi (string, optional; without https://doi.org/ prefix). Author names and year must be present for every entry; other fields may be empty string if not found.'
    };
    out.ref_extract_prompt = {
      label: '참고문헌 추출 (AI) — 사용자 프롬프트 (원문은 {{TEXT}}로 대체)',
      value: 'Extract every reference from the following document in APA 7th edition format. Include only entries that have at least: author(s) and publication year. For each reference return one object with keys: authors, year, title, journal, volume, issue, pages, doi. Return ONLY a JSON array of such objects, nothing else.\n\nDocument text:\n{{TEXT}}'
    };

    out.imggen_vis_prompt_system = {
      label: '이미지 생성 — 시각 프롬프트 제작 지시 (시스템)',
      value: 'You are an expert at creating detailed visual prompts for AI image generation. Your task is to convert slide content into a rich, specific English prompt that will produce high-quality academic visuals. Output ONLY the prompt text—no explanation, no markdown, no code block, no prefix.'
    };
    out.imggen_vis_prompt_instruction = {
      label: '이미지 생성 — 시각 프롬프트 제작 지시 (사용자, MDeditor 내용은 {{MD_CONTENT}}로 대체)',
      value: [
        '다음 MDeditor 창의 슬라이드 내용을 참고하여, AI 이미지 생성용 시각 프롬프트를 **영어로** 세밀하게 작성하세요.',
        '',
        '# 작성 원칙',
        '1. **구체성**: "Academic journal cover" 같은 모호한 표현 대신, 제목·저자·저널명·연도 등 실제 콘텐츠를 반영한 구체적 묘사를 사용하세요.',
        '2. **시각적 요소**: 구도(composition), 레이아웃, 색상 톤, 스타일(학술·미니멀·인포그래픽 등)을 명시하세요.',
        '3. **핵심 메시지**: 슬라이드의 핵심 개념·변수·관계·결과를 시각적으로 표현할 수 있도록 구체적으로 기술하세요.',
        '4. **차트/다이어그램**: 통계·프로세스·인과관계가 있다면 "bar chart showing X vs Y", "flow diagram with arrows from A to B" 등 형태를 명시하세요.',
        '5. **출력 형식**: 코드블록·마크다운 없이 순수 영어 프롬프트 텍스트만 출력하세요 (1~3문장).',
        '',
        '# MDeditor 슬라이드 내용',
        '{{MD_CONTENT}}'
      ].join('\n')
    };

    return out;
  }

  if (typeof global !== 'undefined') {
    global.getPromptOverride = getPromptOverride;
    global.getImggenVisPromptInstruction = getImggenVisPromptInstruction;
    global.getSlideGenSystemPrompt = getSlideGenSystemPrompt;
    global.applySlideGenUpgrade = applySlideGenUpgrade;
    global.setPromptOverrides = setPromptOverrides;
    global.getPromptOverrides = getOverrides;
    global.getDefaultPrompts = getDefaultPrompts;
  }
})(typeof window !== 'undefined' ? window : this);

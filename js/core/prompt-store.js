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

  /** 슬라이드 생성 유형 id → 시스템 지시 키 (slide_gen_system_precision 등) */
  var SLIDE_GEN_TYPE_IDS = ['precision', 'presentation', 'notebook', 'critical', 'evidence', 'logic', 'quiz', 'workshop', 'auto_visual'];

  /** 슬라이드 생성 시스템 지시: 선택된 유형(slideGenType)에 해당하는 override 또는 기본값 반환. type === 'all' 이면 All Slide(한번에 전체 생성) 전용 키 사용 */
  function getSlideGenSystemPrompt(slideGenType) {
    var type = slideGenType || 'precision';
    var key = (type === 'all') ? 'slide_gen_all_system' : ('slide_gen_system_' + type);
    var override = getPromptOverride(key);
    if (override) return override;
    var defaults = getDefaultPrompts();
    var val = (defaults[key] && defaults[key].value) ? defaults[key].value : null;
    return val || 'You are an academic slide generator. Korean for title/bullets/notes, English for visPrompt.';
  }

  /** 슬라이드 생성 프롬프트만 업그레이드 기본값으로 적용(override에 저장). 유형별 + All Slide 적용. 설정에서 "업그레이드 적용" 시 사용 */
  function applySlideGenUpgrade() {
    var defaults = getDefaultPrompts();
    var overrides = {};
    for (var i = 0; i < SLIDE_GEN_TYPE_IDS.length; i++) {
      var key = 'slide_gen_system_' + SLIDE_GEN_TYPE_IDS[i];
      if (defaults[key] && defaults[key].value) overrides[key] = defaults[key].value;
    }
    if (defaults.slide_gen_all_system && defaults.slide_gen_all_system.value) overrides.slide_gen_all_system = defaults.slide_gen_all_system.value;
    if (Object.keys(overrides).length === 0) return false;
    setPromptOverrides(overrides);
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

  /** 카테고리: 요약 | 슬라이드 생성 | All Slide 생성 | 이미지 생성 | 번역 | 참고문헌 추출 | 기타 */
  var PROMPT_CATEGORIES = [
    { id: 'summary', title: '📖 요약 관련' },
    { id: 'slide', title: '🗂 슬라이드 생성 관련' },
    { id: 'all_slide', title: '🧠 All Slide 생성 관련' },
    { id: 'image', title: '🎨 이미지 생성 관련' },
    { id: 'translate', title: '🌐 번역 관련' },
    { id: 'ref_extract', title: '📚 참고문헌 추출 (AI)' },
    { id: 'other', title: '📚 기타 (학술 검색 등)' }
  ];

  /** 기본 프롬프트 목록 (JS와 일치). 설정 창에서 표시·편집용 */
  function getDefaultPrompts() {
    var styles = (typeof global.SUMMARY_STYLES !== 'undefined' && global.SUMMARY_STYLES) ? global.SUMMARY_STYLES : [];
    var out = {};

    styles.forEach(function (s) {
      out['summary_system_' + s.id] = { category: 'summary', label: (s.label || s.id) + ' (시스템 지시)', value: s.systemInstruction || '' };
    });

    out.translate_user_prefix = {
      category: 'translate',
      label: '사용자 프롬프트 접두문',
      value: '다음 영문 텍스트를 자연스러운 학술 한국어로 번역하세요:\n\n'
    };
    out.translate_system_instruction = {
      category: 'translate',
      label: '시스템 지시',
      value: '전문 학술 번역가입니다.'
    };
    var slideGenBase = [
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
      '# Operational Instructions',
      '- 답변 시작 시 "선택하신 [유형 이름]으로 슬라이드 구성을 시작합니다."라고 알릴 것.',
      '- 각 슬라이드의 title(제목)에는 "Slide 1:", "Slide 15:" 같은 슬라이드 번호를 절대 넣지 말 것. 섹션명·내용 제목만 사용할 것 (예: "References - 참고문헌 리스트", "Introduction", "Key Findings").',
      '- 학술 용어는 표준 번역어를 사용하되, 필요한 경우 괄호 안에 원어를 병기할 것.',
      '- 출력은 반드시 아래 JSON 배열 형식으로만 할 것. 코드블록·마크다운 없이 순수 JSON만. Korean for title/bullets/notes, English for visPrompt.'
    ].join('\n');
    var typeParagraphs = {
      precision: '## Type A: 정밀 요약형 (Precision Archive)\n데이터 무결성 및 통계치 보존 중심. 입력 데이터의 모든 통계적 수치(Mean, SD, p-value, t-value, F-value 등)를 표 형식이나 텍스트로 누락 없이 기록하라. 연구 가설(Hypothesis)과 실제 분석 결과의 일치 여부를 정밀하게 대조하여 작성하고, 방법론 섹션에서는 연구 설계의 타당성과 표집 방법을 전문 용어로 기술하라.',
      presentation: '## Type B: 발표 최적화형 (Presentation Focus)\n가독성 및 핵심 메시지 전달 중심. 1슬라이드 1메시지 원칙을 준수하며 텍스트는 3줄 이내 불렛 포인트로 요약하라. 슬라이드당 하나의 핵심 주장(Key Takeaway)만 배치하라. 모든 텍스트는 3줄 이내의 불렛 포인트로 요약하고, 구어체보다는 명확한 명사형 종결 어미를 사용하라. 청중이 직관적으로 이해할 수 있도록 복잡한 데이터는 상승/하락/유의미한 차이 등 결과 위주로 단순화하라.',
      notebook: '## Type C: 노트북/학습형 (Concept Mastery)\n개념 정의 및 이론 심화 학습 중심. 논문에 등장하는 주요 전문 용어와 이론에 대해 개념(Definition) 섹션을 상세히 구성하라. 단순히 결과를 나열하는 것이 아니라, 해당 이론이 왜 이 연구에 적용되었는지 배경 논리를 설명하라. 학습자가 내용을 복기할 수 있도록 슬라이드 중간중간 요약 정리(Summary) 섹션을 추가하라.',
      critical: '## Type D: 비판적 검토형 (Critical Analysis)\n논리적 결함 파악 및 비판적 사고 중심. 연구 방법론의 타당성(Internal/External Validity)을 의심하고 분석하라. 표본의 대표성 부족, 측정 도구의 편향성, 결과 해석의 비약 등을 비판적 시각에서 정리하라. 해당 연구가 기존 학계의 정설과 충돌하는 지점이 있다면 이를 강조하여 기술하라.',
      evidence: '## Type E: 시각적 증거형 (Evidence-Based Claims)\n결론 선언 후 증거 제시 구조. 슬라이드 제목 대신 연구 결과에서 도출된 강력한 결론 문장을 최상단에 배치하라. 본문은 그 문장을 뒷받침하는 수치적 데이터와 핵심 증거들로만 구성하라. 불필요한 미사여구를 제거하고 주장-근거의 구조를 엄격히 유지하라.',
      logic: '## Type F: 인과관계 도식형 (Logic Flow)\n변수 간 메커니즘 시각화 중심. 독립변수(IV), 매개변수(MV), 종속변수(DV) 간의 관계를 화살표(->)와 단계별 프로세스로 요약하라. 연구의 전체적인 메커니즘을 한눈에 볼 수 있도록 논리의 흐름(Flow) 중심으로 텍스트를 배치하라. 결과 섹션에서는 어떤 경로(Path)가 유의미했는지에 집중하여 설명하라.',
      quiz: '## Type G: 상호작용형 (Interactive Quiz)\n퀴즈를 통한 능동적 학습 유도. 슬라이드를 질문-답변 구조로 설계하라. (예: 한 슬라이드에서 실험 결과를 묻고, 다음 슬라이드에서 실제 결과를 공개). 주요 수치나 용어에 빈칸([ ])을 만들어 학습자가 스스로 생각하게 유도하고, 마지막에는 연구 내용에 기반한 3가지 핵심 퀴즈를 출제하라.',
      workshop: '## Type H: 워크숍형 (Practical Action)\n실무 적용 및 액션 플랜 중심. 연구 결과를 실무(Business, Education 등)에 적용할 수 있는 3단계 액션 플랜(Action Plan)을 제시하라. 이론적 시사점을 넘어서서 그래서 무엇을 해야 하는가(So-what)에 대한 답을 제공하라. 현장에서 바로 사용할 수 있는 체크리스트나 실습 과제 형식을 포함하라.',
      auto_visual: '## Type I: AII 자동 시각화형 (Auto Visualizer)\n교재형 학습자료를 전제로, 텍스트 요약만 하지 말고 시각 근거를 반드시 생성하라. 문서 분량에 맞춰 슬라이드 수를 자동 조정하고(필요 시 사용자 범위 준수), 각 슬라이드마다 "시각화 필요 여부"를 먼저 판단하라.\n\n시각화 강제 규칙:\n1) 원문에서 그림(Figure), 표(Table), 도해, 과정도, 비교표, 프레임워크, 통계 그래프가 언급되면 해당 슬라이드의 visPrompt는 반드시 비우지 말고 생성할 것.\n2) "그림/표를 설명하는 슬라이드"는 설명으로 끝내지 말고, 원자료 구조를 반영한 이미지 재생성 지시를 포함할 것.\n3) 표는 가능한 한 표 형태(행/열/헤더)로 유지되도록 프롬프트에 명시하고, 그래프는 축/범례/단위/비교군을 명시할 것.\n4) 원자료의 캡션(제목, 변수명, 단위, 조건, 집단, 시점)을 추출해 visPrompt에 반영할 것.\n5) 단순 장식 이미지는 금지하고, 개념 이해에 필요한 학습용 도식만 생성할 것.\n\n출력 품질 규칙:\n- visPrompt는 영어 1~3문장으로 구체적으로 작성하라.\n- 구도(composition), 핵심 객체, 레이아웃, 색상 톤, 스타일(academic infographic), 텍스트 라벨 포함 여부를 명시하라.\n- 표지(isCover=true)는 visPrompt를 비워도 되지만, 본문 슬라이드는 시각화가 필요하면 visPrompt를 반드시 채워라.'
    };
    var typeLabels = {
      precision: 'A. 정밀 요약형 (Precision Archive)',
      presentation: 'B. 발표 최적화형 (Presentation Focus)',
      notebook: 'C. 노트북/학습형 (Concept Mastery)',
      critical: 'D. 비판적 검토형 (Critical Analysis)',
      evidence: 'E. 시각적 증거형 (Evidence-Based Claims)',
      logic: 'F. 인과관계 도식형 (Logic Flow)',
      quiz: 'G. 상호작용형 (Interactive Quiz)',
      workshop: 'H. 워크숍형 (Practical Action)',
      auto_visual: 'I. AII 자동 시각화형 (Auto Visualizer)'
    };
    var notebookSystemPrompt = [
      '# Role',
      '너는 전공 서적의 핵심 가치를 발췌하여 청중에게 깊이 있는 통찰을 전달하는 교육용 발표 설계 전문가, [Academic Presenter AI]이다.',
      '톤: 지적이며 신뢰감 있는 학술적 톤 (~임, ~이다).',
      '안전 규칙: 기존 기능을 변경하거나 기능을 버릴 때 반드시 사용자의 동의를 구한다.',
      '',
      '# Citation Rule (APA 7th Edition)',
      '- 슬라이드의 모든 핵심 주장과 데이터에는 반드시 근거(저자, 연도)를 명기하라.',
      '- 문장 단위로 APA 내체 인용을 포함하여 학술적 엄밀함을 유지하라.',
      '- 본문(source)에서 정확한 근거 페이지나 위치를 확인하여 기입하라.',
      '',
      '# Textbook Structure Rule (교재 목차 규칙)',
      '- 교재는 장/절/소절 구조를 따르므로, 번호 체계를 해석하여 슬라이드 흐름에 반영하라.',
      '- 예: 2. 신호탐지이론 → 2.1 신호탐지 패러다임 → 2.2 민감도 → 3. 제목 → 3.1 소제목 → 3.2 소제목',
      '- 큰 장(2, 3...)은 섹션 전환 슬라이드로, 소절(2.1, 2.2...)은 개념 설명/사례/시각화 슬라이드로 풀어라.',
      '',
      '# Presentation Core Principle (발표 설계 원칙)',
      '1. Core Value First: 해당 단원의 내용이 전공 분야에서 왜 중요한지(Significance)를 먼저 제시하라.',
      '2. Inquiry-Based Titles: 슬라이드 소제목은 단순 요약이 아니라 핵심을 꿰뚫는 질문(Key Question) 형식으로 구성하라.',
      '3. Visual Integration: 교재의 그림(Figure)과 표(Table)는 설명의 핵심이다. 시각 자료가 필요한 슬라이드에는 반드시 시각화 생성 지시를 포함하라.',
      '',
      '# Figure/Table Mapping Rule (그림·표 번호 매핑)',
      '- 원문에 Figure 2.5, 그림 2-5, Table 3.1, 표 3-1 등 번호가 보이면 해당 번호를 슬라이드 내용과 visPrompt에 반영하라.',
      '- 그림 번호가 있는 슬라이드는 원자료의 캡션/변수/관계를 유지한 재구성 이미지를 생성하도록 지시하라.',
      '- 표 번호가 있는 슬라이드는 table-like layout(열/행/헤더/단위/비교군)을 명시한 visPrompt를 작성하라.',
      '- 그림/표를 설명만 하고 끝내지 말고, 반드시 이미지 생성 가능한 구체 프롬프트를 제공하라.',
      '',
      '# Must-Include Sections (슬라이드 구성 8단계)',
      '1. Title: 도서명, 단원명(Chapter Title), 저자 및 발표자 정보',
      '2. The Significance: 이 단원을 왜 배워야 하는가? 학문적 코어 가치와 중요성 제시',
      '3. Vocabulary & Concepts: 단원을 이해하기 위한 필수 개념 정의 (원어 병기)',
      '4. Deep Dive (Category-wise): 각 소제목별 핵심 질문을 던지고, 그에 대한 상세 분석 내용 기술',
      '5. Visual Evidence: 본문의 Figure/Table 리스트 및 각 시각 자료가 증명하는 핵심 원리 설명',
      '6. Real-world Scenarios: 이론이 실제 현장에서 어떻게 발현되는지 사례 분석',
      '7. Summary & Critical Thinking: 핵심 내용 재정리 및 청중과 논의할 비판적 사고 질문',
      '8. Glossary & References: 사용된 용어 사전 및 전체 참고문헌 리스트',
      '',
      '# Operational Instructions',
      '- 시작 시 "선택하신 [Academic Presenter Mode]로 전공 서적 발표 구성을 시작합니다."라고 알릴 것.',
      '- 슬라이드 제목에 "Slide 1" 같은 번호를 넣지 말고, 섹션명과 핵심 질문 중심 제목으로 작성하라.',
      '- Figure/Table가 핵심인 페이지는 관련 번호(예: 그림 2.5, 표 3.1)를 bullets 또는 notes에 반드시 남겨라.',
      '- 표(Table)가 복잡하면 표 전용 슬라이드와 해석 슬라이드를 분리해 구성하라.',
      '- 출력은 순수 JSON 배열만 허용 (코드블록/마크다운 금지).',
      '- 언어: title/bullets/notes는 한국어, visPrompt는 영어.',
      '',
      '# Generation Type: Academic Presenter (전공 발표형)',
      '- 단원 주제 명시: 각 슬라이드 상단에 현재 다루는 단원의 큰 주제를 기록한다.',
      '- 핵심 질문 제목: "왜 ~인가?" 형태의 질문형 제목을 적극 사용한다.',
      '- 상세 분석: 교재 논리를 따라 충분한 맥락 설명을 제공한다.',
      '- 이미지 생성 우선: Figure/Table 관련 슬라이드는 visPrompt를 빈 문자열로 두지 않는다.'
    ].join('\n');
    ['precision', 'presentation', 'notebook', 'critical', 'evidence', 'logic', 'quiz', 'workshop', 'auto_visual'].forEach(function (tid) {
      var value = (tid === 'notebook')
        ? notebookSystemPrompt
        : (slideGenBase + '\n\n# Generation Type (선택된 유형)\n\n' + (typeParagraphs[tid] || ''));
      out['slide_gen_system_' + tid] = {
        category: 'slide',
        label: '슬라이드 생성 — ' + (typeLabels[tid] || tid) + ' (시스템 지시)',
        value: value
      };
    });
    var pageRangeParagraph = [
      '',
      '# Page Range (범위 설정)',
      '사용자가 페이지 범위(예: 최소-최대)를 지정한 경우:',
      '- 생성 슬라이드 수는 반드시 해당 범위(min 이상, max 이하) 내에서 문서 분량과 정보 밀도에 맞춰 결정할 것.',
      '- 예: 범위가 12-24이면 슬라이드 수는 12개 이상 24개 이하로만 산정할 것.',
      '사용자가 범위를 비운 경우:',
      '- 문서 분량과 정보 밀도에 맞춰 슬라이드 수를 자동 산정할 것. 불필요한 분할은 피하고, 과밀한 슬라이드는 분리할 것.'
    ].join('\n');
    var slideGenAllSystemDefault = [
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
      '# Figure, Table',
      '- 제공된 원문의 모든 그림은 Fig번호와 함께 그림을 재생성할 것',
      '- 제공되는 원문의 표를 OCR로읽어서 표현하든 구조화하여 넣거나 이미지로 생성할 것',
      '',
      '# Must-Include Sections (필수 구성 항목)',
      '모든 슬라이드 생성 시 다음 8가지 항목을 순차적으로 반드시 포함하라: 제목에는 번호옆의 타이틀을 사용하지말것 예를 들면 Key Findings: 제목 과같은 형식은 하지 말것',
      '1. Title: 논문명, 저자(연도), 저널명',
      '2.1. 이론적 배경',
      '2.2. 핵심이론',
      '2.3. 연구 질문(RQ)',
      '3. 핵심 변수 정의 및 연구 모형',
      '4. 연구 설계, 표집(N), 측정 도구, 분석 방법',
      '5. 연구결과',
      '5.1. 연구질문에 따른 결과 정리',
      '5.2. 데이터 분석 결과 및 주요 통계치(p-value 등)',
      '6. 결과에 대한 학술적 해석 및 시사점',
      '7. 최종 결론',
      '8. 향후 연구 제언',
      '9. 주요 용어 사전',
      '10. 전체 참고문헌 리스트',
      '',
      '# Operational Instructions',
      '- 답변 시작 시 "선택하신 [유형 이름]으로 슬라이드 구성을 시작합니다."라고 알릴 것.',
      '- 각 슬라이드의 title(제목)에는 "Slide 1:", "Slide 15:" 같은 슬라이드 번호를 절대 넣지 말 것. 섹션명·내용 제목만 사용할 것 (예: "References - 참고문헌 리스트", "Introduction", "Key Findings").',
      '- 학술 용어는 표준 번역어를 사용하되, 필요한 경우 괄호 안에 원어를 병기할 것.',
      '- 출력은 반드시 아래 JSON 배열 형식으로만 할 것. 코드블록·마크다운 없이 순수 JSON만. Korean for title/bullets/notes, English for visPrompt.',
      '',
      '# Generation Type: AII 자동 시각화형 (Auto Visualizer) — All Slide 전용',
      '',
      '## Type I: AII 자동 시각화형 (Auto Visualizer)',
      '교재형 학습자료를 전제로, 텍스트 요약만 하지 말고 시각 근거를 반드시 생성하라. 문서 분량에 맞춰 슬라이드 수를 자동 조정하고(필요 시 사용자 범위 준수), 각 슬라이드마다 "시각화 필요 여부"를 먼저 판단하라.',
      '',
      '시각화 강제 규칙:',
      '1) 원문에서 그림(Figure), 표(Table), 도해, 과정도, 비교표, 프레임워크, 통계 그래프가 언급되면 해당 슬라이드의 visPrompt는 반드시 비우지 말고 생성할 것.',
      '2) "그림/표를 설명하는 슬라이드"는 설명으로 끝내지 말고, 원자료 구조를 반영한 이미지 재생성 지시를 포함할 것.',
      '3) 표는 가능한 한 표 형태(행/열/헤더)로 유지되도록 프롬프트에 명시하고, 그래프는 축/범례/단위/비교군을 명시할 것.',
      '4) 원자료의 캡션(제목, 변수명, 단위, 조건, 집단, 시점)을 추출해 visPrompt에 반영할 것.',
      '5) 단순 장식 이미지는 금지하고, 개념 이해에 필요한 학습용 도식만 생성할 것.',
      '',
      '출력 품질 규칙:',
      '- visPrompt는 영어 1~3문장으로 구체적으로 작성하라.',
      '- 구도(composition), 핵심 객체, 레이아웃, 색상 톤, 스타일(academic infographic), 텍스트 라벨 포함 여부를 명시하라.',
      '- 표지(isCover=true)는 visPrompt를 비워도 되지만, 본문 슬라이드는 시각화가 필요하면 visPrompt를 반드시 채워라.',
      '',
      '# Page Range (범위 설정)',
      '사용자가 페이지 범위(예: 최소-최대)를 지정한 경우:',
      '- 생성 슬라이드 수는 반드시 해당 범위(min 이상, max 이하) 내에서 문서 분량과 정보 밀도에 맞춰 결정할 것.',
      '- 예: 범위가 12-24이면 슬라이드 수는 12개 이상 24개 이하로만 산정할 것.',
      '사용자가 범위를 비운 경우:',
      '- 문서 분량과 정보 밀도에 맞춰 슬라이드 수를 자동 산정할 것. 불필요한 분할은 피하고, 과밀한 슬라이드는 분리할 것.'
    ].join('\n');
    out.slide_gen_all_system = {
      category: 'all_slide',
      label: 'All Slide 생성 — AII 자동 시각화형 (Auto Visualizer) (시스템 지시)',
      value: slideGenAllSystemDefault
    };
    out.slide_gen_all_custom = {
      category: 'all_slide',
      label: 'All Slide 생성 — 커스텀 프롬프트 (추가 지시, UI 텍스트창보다 우선)',
      value: ''
    };
    out.slide_gen_user_prompt = {
      category: 'slide',
      label: '사용자 프롬프트 ({{TYPE_LABEL}}, {{SLIDE_COUNT}}, {{STYLE_GUIDE}}, {{COVER_NOTE}}, {{STRUCTURE_NOTE}}, {{NO_SLIDE_NUM_NOTE}}, {{PAGE_POLICY_NOTE}}, {{VISUAL_POLICY}}, {{TEXT}})',
      value: '선택하신 {{TYPE_LABEL}}으로 슬라이드 구성을 시작합니다.\n\n이 텍스트를 기반으로 정확히 {{SLIDE_COUNT}}개의 슬라이드를 생성하세요.\n스타일: {{STYLE_GUIDE}}\n{{COVER_NOTE}}\n{{STRUCTURE_NOTE}}\n{{NO_SLIDE_NUM_NOTE}}\n{{PAGE_POLICY_NOTE}}\n{{VISUAL_POLICY}}\n\n[교재형 시각화 우선 규칙]\n- 그림/표/도해를 설명하는 슬라이드는 반드시 이미지 생성용 visPrompt를 포함할 것.\n- 원자료의 Figure/Table 캡션과 핵심 변수명을 반영해 재구성할 것.\n- 표는 table-like layout(열/행/헤더)로 보이도록, 그래프는 축/범례/단위를 명시할 것.\n- 장식 목적 이미지는 금지하고, 학습 이해를 높이는 시각화만 생성할 것.\n\n반드시 아래 JSON 배열 형식으로만 응답하세요 (코드블록 없이, 마크다운 없이):\n[{"title":"슬라이드 제목(번호 없이 섹션명만)","bullets":["포인트1","포인트2","포인트3"],"notes":"발표자 노트","visPrompt":"English visual prompt for textbook-style figure/table reconstruction","isCover":false}]\n\n추가 강제 규칙:\n- visPrompt는 영어 1~3문장.\n- 표지(isCover=true)를 제외하고 시각화 필요 슬라이드의 visPrompt는 빈 문자열 금지.\n- 그림/표를 인용한 슬라이드에서 visPrompt가 비어 있으면 실패로 간주.\n\n텍스트:\n{{TEXT}}'
    };
    out.slide_gen_structure_note = {
      category: 'slide',
      label: '구조 지시 (필수 8섹션·유형 규칙, {{TYPE_LETTER}}로 유형 문자 대체)',
      value: '위 필수 구성 항목(8가지)을 순서대로 반영하고, 선택한 유형(Type {{TYPE_LETTER}})의 규칙을 적용하세요.'
    };
    out.slide_gen_no_slide_num_note = {
      category: 'slide',
      label: '제목 규칙 (슬라이드 번호 금지)',
      value: '각 슬라이드의 title에는 "Slide 1:", "Slide 15:" 같은 번호를 붙이지 말고, 섹션명·내용 제목만 사용할 것 (예: "References - 참고문헌 리스트", "Introduction", "Key Findings").'
    };
    out.slide_gen_script_system = {
      category: 'slide',
      label: '발표 원고 생성 — 시스템 지시',
      value: '학술 발표 전문가입니다. 자연스러운 발표 원고를 한국어로 작성합니다.'
    };
    out.scholar_search_prompt = {
      category: 'other',
      label: '학술 검색 프롬프트 (주제는 {{query}}로 대체)',
      value: '다음 주제와 관련된 실제 학술 논문 5편을 JSON 배열로만 응답하세요 (코드블록, 마크다운 없이 순수 JSON만):\n[{"authors":"Last, F., & Last2, F2.","year":"2023","title":"논문 제목","journal":"저널명","volume":"15","issue":"2","pages":"100-120","doi":""}]\n주제: {{query}}'
    };
    out.scholar_search_system = {
      category: 'other',
      label: '학술 검색 시스템 지시',
      value: 'You are a scholar database. Return ONLY valid JSON array, no markdown.'
    };
    out.ref_extract_system = {
      category: 'ref_extract',
      label: '참고문헌 추출 (AI) 시스템 지시',
      value: 'You are an expert in APA 7th edition citation format. Your task is to extract ALL references from the given academic document text. References typically appear at the END of the document under sections titled "Reference", "References", "참고문헌", "참고", "Bibliography", "Works Cited", etc. Return ONLY a valid JSON array—no markdown, no code block, no explanation. Each object must have exactly these keys: authors (string), year (string, 4 digits), title (string), journal (string), volume (string, optional), issue (string, optional), pages (string, optional), doi (string, optional; without https://doi.org/ prefix). Author names and year must be present for every entry; other fields may be empty string if not found.'
    };
    out.ref_extract_prompt = {
      category: 'ref_extract',
      label: '참고문헌 추출 (AI) 사용자 프롬프트 (원문은 {{TEXT}}로 대체)',
      value: 'Extract every reference from the following document in APA 7th edition format. Focus on the END of the document where reference sections typically appear under headings such as: Reference, References, 참고문헌, 참고, Bibliography, Works Cited, or similar. Include only entries that have at least: author(s) and publication year. For each reference return one object with keys: authors, year, title, journal, volume, issue, pages, doi. Return ONLY a JSON array of such objects, nothing else.\n\nDocument text:\n{{TEXT}}'
    };

    var scholarAIPresetText = [
      'You are a scholarly assistant. Answer concisely in Korean based on the given passage. If the user asks a question, answer it; otherwise summarize or explain the passage.',
      '',
      'Citation and references:',
      '- When you use or refer to content from the literature, cite researchers in the body as (Author, Year) to support your claims.',
      '- For each cited work, provide a full reference entry. Format all references strictly in APA 7th edition.',
      '- At the end of your response, list every cited source in a References section. Format all references strictly in APA 7th edition.',
      '',
      'Task (when searching for literature):',
      'Search for real, peer-reviewed journal articles on the following topic: [여기에 주제 입력]',
      '',
      'Search conditions:',
      '- Publication years: [연도 범위 입력]',
      '- Only include verifiable, existing journal articles. Do NOT fabricate citations.',
      '- If bibliographic information is uncertain, explicitly state uncertainty.',
      '',
      'Output requirements:',
      '1. Format all references strictly in APA 7th edition.',
      '2. Include DOI when available.',
      '3. Indicate journal indexing status (SSCI/SCIE/ESCI/Scopus if known).',
      '4. Separate domestic (Korean) and international studies if applicable.',
      '5. For each article, provide 2–3 sentences summarizing: Research purpose; Methodology (e.g., SEM, multilevel modeling, regression, meta-analysis); Key findings.',
      '6. Focus on recent theoretical frameworks when relevant.'
    ].join('\n');
    out.scholarai_prompt = {
      category: 'other',
      label: 'ScholarAI 사전 프롬프트',
      value: scholarAIPresetText
    };
    out.apa_search_prompt = {
      category: 'other',
      label: 'APA 조사 프롬프트',
      value: scholarAIPresetText
    };

    out.imggen_vis_prompt_system = {
      category: 'image',
      label: '시각 프롬프트 제작 지시 (시스템)',
      value: 'You are an expert at creating detailed visual prompts for AI image generation. Your task is to convert slide content into a rich, specific English prompt that will produce high-quality academic visuals. Output ONLY the prompt text—no explanation, no markdown, no code block, no prefix.'
    };
    out.imggen_vis_prompt_instruction = {
      category: 'image',
      label: '시각 프롬프트 제작 지시 (사용자, MDeditor 내용은 {{MD_CONTENT}}로 대체)',
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

  /** 슬라이드 생성 사용자 프롬프트: placeholders 치환 후 반환 */
  function getSlideGenUserPrompt(vars) {
    var tpl = getPromptOverride('slide_gen_user_prompt');
    if (!tpl) {
      var d = getDefaultPrompts();
      tpl = (d.slide_gen_user_prompt && d.slide_gen_user_prompt.value) || '';
    }
    if (!tpl) return null;
    var s = tpl;
    for (var k in vars) if (vars.hasOwnProperty(k)) s = s.replace(new RegExp('\\{\\{' + k + '\\}\\}', 'g'), vars[k]);
    return s;
  }

  /** 슬라이드 생성 구조 지시 (structureNote) */
  function getSlideGenStructureNote(typeLetter) {
    var tpl = getPromptOverride('slide_gen_structure_note');
    if (!tpl) {
      var d = getDefaultPrompts();
      tpl = (d.slide_gen_structure_note && d.slide_gen_structure_note.value) || '위 필수 구성 항목(8가지)을 순서대로 반영하고, 선택한 유형(Type {{TYPE_LETTER}})의 규칙을 적용하세요.';
    }
    return (tpl || '').replace(/\{\{TYPE_LETTER\}\}/g, typeLetter || 'A');
  }

  /** 슬라이드 생성 제목 규칙 (noSlideNumNote) */
  function getSlideGenNoSlideNumNote() {
    var val = getPromptOverride('slide_gen_no_slide_num_note');
    if (val) return val;
    var d = getDefaultPrompts();
    return (d.slide_gen_no_slide_num_note && d.slide_gen_no_slide_num_note.value) || '각 슬라이드의 title에는 "Slide 1:", "Slide 15:" 같은 번호를 붙이지 말고, 섹션명·내용 제목만 사용할 것 (예: "References - 참고문헌 리스트", "Introduction", "Key Findings").';
  }

  if (typeof global !== 'undefined') {
    global.getPromptOverride = getPromptOverride;
    global.SLIDE_GEN_TYPE_IDS = SLIDE_GEN_TYPE_IDS;
    global.getImggenVisPromptInstruction = getImggenVisPromptInstruction;
    global.getSlideGenSystemPrompt = getSlideGenSystemPrompt;
    global.getSlideGenUserPrompt = getSlideGenUserPrompt;
    global.getSlideGenStructureNote = getSlideGenStructureNote;
    global.getSlideGenNoSlideNumNote = getSlideGenNoSlideNumNote;
    global.applySlideGenUpgrade = applySlideGenUpgrade;
    global.setPromptOverrides = setPromptOverrides;
    global.getPromptOverrides = getOverrides;
    global.getDefaultPrompts = getDefaultPrompts;
    global.PROMPT_CATEGORIES = PROMPT_CATEGORIES;
  }
})(typeof window !== 'undefined' ? window : this);

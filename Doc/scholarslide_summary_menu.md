# ScholarSlide 전체요약 기능 설계 문서

## 1. 전체요약 메뉴 UI 구조

``` text
전체 요약 방식 선택

① 핵심요약 (Key Summary)
② 디테일 요약 (Detailed Summary)
③ 슬라이드 요약 (Slide Ready Summary)
④ 구조 요약 (Structural Summary)
⑤ 개념 요약 (Concept Summary)
⑥ 비교 요약 (Comparative Summary)
⑦ 연구 요약 (Research Summary)
```

### 추가 옵션 UI

``` text
슬라이드 수
[ 12 ]

요약 깊이
○ 간단
○ 표준
○ 상세
```

또는

``` text
요약 목적
○ 발표용
○ 강의용
○ 연구분석용
```

------------------------------------------------------------------------

# 2. 핵심요약 (Key Summary)

**설명**\
가장 중요한 메시지만 추출하며 슬라이드 제목 생성에 적합하다.

### AI 프롬프트

``` text
You are an academic summarization engine.

Read the following document carefully and extract the most important core messages.

Requirements:

1. Identify the central theme of the entire document.
2. Extract the 5–7 most important key points.
3. Each key point must be written as one concise sentence.
4. Avoid long explanations.
5. Focus only on the most essential insights.

Output format:

Main Theme:
- one sentence

Key Points:
1.
2.
3.
4.
5.
```

------------------------------------------------------------------------

# 3. 디테일 요약 (Detailed Summary)

**설명**\
문단 흐름을 유지하는 정밀 요약으로 강의나 교재 분석에 적합하다.

### AI 프롬프트

``` text
You are an academic summarization engine.

Read the document and produce a detailed structured summary.

Requirements:

1. Preserve the logical structure of the document.
2. Summarize each major section or argument.
3. Include key ideas, evidence, and conclusions.
4. Avoid copying sentences from the original text.
5. Write concise but informative paragraphs.

Output format:

1. Main Topic
2. Background
3. Key Arguments
4. Supporting Evidence
5. Conclusions
```

------------------------------------------------------------------------

# 4. 슬라이드 요약 (Slide Ready Summary)

**설명**\
슬라이드 제작에 최적화된 요약이며 ScholarSlide의 핵심 기능이다.

### AI 프롬프트

``` text
You are a presentation slide generator.

Read the document and convert it into presentation slides.

Requirements:

1. Create exactly {SLIDE_COUNT} slides.
2. Each slide must contain:
   - Slide Title
   - 3 bullet points
3. Bullet points must be short and clear.
4. Avoid long sentences.
5. Each slide must represent one idea.

Output format:

Slide 1
Title:
- bullet
- bullet
- bullet

Slide 2
Title:
- bullet
- bullet
- bullet
```

------------------------------------------------------------------------

# 5. 구조 요약 (Structural Summary)

**설명**\
문서의 논리 구조를 분석하여 정리한다.

### AI 프롬프트

``` text
You are an academic structure analyst.

Analyze the document and extract its structural organization.

Requirements:

1. Identify the main logical structure of the document.
2. Detect sections such as:
   - Problem
   - Theory
   - Method
   - Results
   - Discussion
3. Summarize each section briefly.

Output format:

Document Structure

Problem:
Summary

Theory:
Summary

Method:
Summary

Results:
Summary

Discussion:
Summary
```

------------------------------------------------------------------------

# 6. 개념 요약 (Concept Summary)

**설명**\
핵심 개념 중심 요약이며 교육 콘텐츠 제작에 적합하다.

### AI 프롬프트

``` text
You are a concept extraction engine.

Read the document and extract the key concepts.

Requirements:

1. Identify the most important concepts.
2. Provide a short definition for each concept.
3. If possible, include a simple explanation or example.

Output format:

Concept 1
Definition:
Explanation:

Concept 2
Definition:
Explanation:
```

------------------------------------------------------------------------

# 7. 비교 요약 (Comparative Summary)

**설명**\
이론, 모델, 방법을 비교 분석한다.

### AI 프롬프트

``` text
You are an analytical comparison engine.

Read the document and identify comparable theories, models, or arguments.

Requirements:

1. Identify at least two items that can be compared.
2. Explain their key characteristics.
3. Summarize the main differences.

Output format:

Item A
Description:

Item B
Description:

Comparison

Similarities:
-

Differences:
-
```

------------------------------------------------------------------------

# 8. 연구 요약 (Research Summary)

**설명**\
논문 분석 및 연구 내용 정리에 적합하다.

### AI 프롬프트

``` text
You are an academic research summarizer.

Summarize the research paper in a structured format.

Requirements:

1. Identify the research problem.
2. Explain the theoretical background.
3. Describe the research method.
4. Summarize the key findings.
5. Explain the implications.

Output format:

Research Problem:

Theoretical Background:

Method:

Results:

Implications:
```

------------------------------------------------------------------------

# 9. 추천 ScholarSlide UI 구조

``` text
전체 요약 방식

○ 핵심요약
○ 디테일요약
○ 슬라이드요약
○ 구조요약
○ 개념요약
○ 비교요약
○ 연구요약

슬라이드 수
[ 12 ]
```

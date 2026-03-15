수정했습니다. 참고문헌 AI 추출이 백그라운드에서 동작하도록 바꿨습니다.

변경 사항 (js/features/references.js):
# showLoading 
**showLoading **제거 – 전체 화면 로딩 모달을 사용하지 않습니다.
토스트로 안내 – showToast('참고문헌 AI 추출 중... (백그라운드)')로 시작 메시지를 표시합니다.
hideLoading 제거 – 모달을 쓰지 않으므로 호출을 삭제했습니다.
이제 AI 추출 중에도 앱을 계속 사용할 수 있고, 완료 시에만 확인 창이 뜹니다.


적용 결과
작업	기존	변경 후
파일 업로드	전체 화면 로딩	상단 진행률 표시
학술 출처 검색	전체 화면 로딩	상단 진행률 표시
PPTX 생성	전체 화면 로딩	상단 진행률 표시
프로젝트 저장/불러오기	전체 화면 로딩	상단 진행률 표시
발표 원고 생성	전체 화면 로딩	상단 진행률 표시
슬라이드 AI 재작성/확장	전체 화면 로딩	상단 진행률 표시
참고문헌 AI 추출	(이미 토스트로 변경됨)	상단 진행률 표시
이제 진행 중에도 글을 읽거나 다른 작업을 계속할 수 있습니다.


# 수정 
편집모드로 들어가고 수정하고 보기모드로돌아와도 마크다운 편집 모드로 유지되는 오류가 있어. 보기 모드로 왔을 때는 마크타운이 렌더링된 모습으로 나타나 게 다시 1번 수정해져 오류가 무엇인지 확인해 보고 왜 안 되는지 체크해서 마크 다운 렌더링이 동작하게 만들어

원인
marked.js 미로드
index.js 뷰어 HTML에 marked.js 스크립트가 없어 마크다운 파싱이 되지 않았습니다.

렌더링 fallback 부족
window.opener.getViewerRenderedContent()가 실패하거나 빈 값을 반환하면, 마크다운 파싱 없이 <, >만 이스케이프하고 줄바꿈만 <br>로 바꾸는 방식으로 처리해, 원문 마크다운이 그대로 보였습니다.

예외 처리 없음
getViewerRenderedContent 호출 시 예외 처리가 없어, 에러가 나면 fallback으로 넘어가지 못했습니다.

수정 사항 (index.js)
marked.js 로드
뷰어 HTML에 marked.js CDN 스크립트를 추가했습니다.

viewerSwitchToView() 개선

getViewerRenderedContent 호출을 try/catch로 감쌌습니다.
getViewerRenderedContent가 실패하거나 빈 값을 반환하면 marked.parse()로 마크다운을 렌더링합니다.
marked가 없을 때만 기존처럼 단순 이스케이프 + <br>로 처리합니다.
viewer-edit-active 제거를 page-content 업데이트 이후로 옮겨, 보기 모드 전환이 정확히 되도록 했습니다.
viewerBuildNav()를 requestAnimationFrame 안에서 호출해 DOM 갱신 후 목차가 갱신되도록 했습니다.
이제 편집 모드에서 수정 후 보기 모드로 돌아가면 마크다운이 정상적으로 렌더링됩니다.



슬라이드 수·표지 포함 아래에 '슬라이드 생성' 버튼(askThenSummary('slides')) 복구 중입니다.


구현을 모두 반영했습니다. 요약만 정리합니다.

1. 새창보기(뷰어)에 ScholarAI 추가 (js/ui/viewers.js)

툴바: ScholarAI 버튼 추가(닫기 버튼 왼쪽).
우측 사이드바 (ScholarAI 열림 시):
헤더: "ScholarAI" 제목, >축소, 전체화면
입력된 지문: 문서에서 선택한 텍스트가 자동으로 표시(선택 시 갱신).
프롬프트 작성 창: 질문/지시 입력.
실행: 메인 창의 callGemini로 선택 지문 + 프롬프트 전달, 결과 표시.
결과창: AI 응답 표시(읽기 전용).
하단:
문서내 삽입 → 클릭 시 메뉴:
문서 한줄 아래에 삽입: 선택 끝 위치 다음 줄에 결과 삽입.
선택 내용 대체: 선택 영역을 결과로 교체.
font − / +: 결과창 폰트 크기 조절.
결과복사: 결과창 내용 클립보드 복사.
2. 동작


완료된 작업 요약
1. 히스토리 분리
발표원고 히스토리 (manuscriptHistory): ss_manuscript_history에 저장
슬라이드 생성 히스토리 (slideHistory): ss_slide_history에 저장
2. 라벨 규칙
발표 원고: 제목 + " 발표 원고" (예: 02_Wout(2018).pdf 발표 원고)
슬라이드 생성: 제목 + " 슬라이드" (예: 02_Wout(2018).pdf 슬라이드)
3. UI 동작
발표원고 탭 → 생성히스토리: 발표 원고만 표시
슬라이드생성 탭 → 생성히스토리: 슬라이드만 표시
각 탭에서 일괄 지우기, 삭제, 복원, 보기, 새창보기가 해당 히스토리에만 적용되도록 분리
4. 복원 기능
슬라이드 생성 후 다시 생성해도, 이전 슬라이드는 슬라이드생성 탭의 생성히스토리에서 복원 버튼으로 복구 가능
5. 마이그레이션
기존에 manuscriptHistory에 섞여 있던 슬라이드 항목(type === 'slides')은 slideHistory로 자동 이전
이제 발표원고와 슬라이드 생성 히스토리가 서로 분리되어 저장·표시됩니다.


ScholarAI 클릭: 우측에 ScholarAI 사이드바 표시. 문서/편집 영역에서 선택 시 해당 텍스트가 "입력된 지문"에 반영.
>축소: 사이드바 닫기(원래 레이아웃으로 복귀).
전체화면: ScholarAI 패널만 앱 내 전체화면. 다시 클릭하면 전체화면 해제.
문서내 삽입: 편집 모드로 전환한 뒤, 선택 위치(또는 입력된 지문과 일치하는 위치)에 결과를 삽입/대체.
3. 테마

뷰어의 Light/Dark 전환 시, ScholarAI 사이드바도 같은 테마가 적용되도록 스타일 처리했습니다.
요약·원문·발표원고 등 getTextViewerWindowHtml을 쓰는 새창보기에는 모두 동일한 ScholarAI가 붙습니다.

---

## AII Slide생성 업그레이드 (2026-03-15)

요청 사항 반영:
1) PDF/교재 기반 요약 + 슬라이드 + 시각화 동시 생성  
2) 페이지별 그림/표 생성 가능하도록 프롬프트 강화  
3) 문서량 기반 자동 페이지 수 + 사용자 범위(예: 12-24) 반영

적용 내용:
- 원고 탭에 `🧠 AII Slide생성` 버튼 추가 (`askThenSummary('slides_auto')`)
- 슬라이드 생성 유형에 `I. AII 자동 시각화형 (Auto Visualizer)` 추가
- `페이지 범위` 입력 추가 (`slide-range-val`)  
  - 형식: `최소-최대` 또는 단일 숫자 (예: `12-24`, `18`)
- AII 모드에서는 문서 길이 기반 자동 산정 후 사용자 범위 내로 클램프
- 프롬프트 템플릿에 아래 정책 변수 추가
  - `{{PAGE_POLICY_NOTE}}`: 페이지 수 결정 규칙
  - `{{VISUAL_POLICY}}`: 원자료 그림/표 재구성 및 해석 추가 규칙
- 설정 탭 기본 유형/프롬프트 오버라이드에도 `auto_visual` 유형 연결

핵심 프롬프트 의도:
- `원자료 그림/표를 최대한 보존해 재구성`
- `필요 시 해석이 추가된 신규 다이어그램 생성`
- `시각화가 필요한 슬라이드에만 visPrompt를 구체적 영어로 작성`






요청하신 “정확한 프롬프트 구성”
현재 적용된 구조는 아래 형태입니다(치환 변수 포함):

선택하신 {{TYPE_LABEL}}으로 슬라이드 구성을 시작합니다.
이 텍스트를 기반으로 정확히 {{SLIDE_COUNT}}개의 슬라이드를 생성하세요.
스타일: {{STYLE_GUIDE}}
{{COVER_NOTE}}
{{STRUCTURE_NOTE}}
{{NO_SLIDE_NUM_NOTE}}
{{PAGE_POLICY_NOTE}}
{{VISUAL_POLICY}}
반드시 아래 JSON 배열 형식으로만 응답하세요 (코드블록 없이, 마크다운 없이):
[{"title":"슬라이드 제목(번호 없이 섹션명만)","bullets":["포인트1","포인트2","포인트3"],"notes":"발표자 노트","visPrompt":"English diagram description for AI image generation","isCover":false}]
텍스트:
{{TEXT}}
AII 모드에서 {{VISUAL_POLICY}}는 다음 의도를 강제합니다:

원자료(PDF/교재)의 그림/표/도해를 최대한 유사 재구성
필요한 경우 해석이 추가된 새 도식 생성
시각화 필요한 슬라이드에만 구체적 영어 visPrompt 생성
확인 방법
원고 탭에서 페이지 범위에 12-24 입력 (선택)
🧠 AII Slide생성 클릭
생성 후 슬라이드 수가 문서량+범위 규칙대로 적용되는지 확인
각 슬라이드 visPrompt가 그림/표 중심으로 구체화됐는지 확인
원하시면 다음 단계로, **“AII 생성 직후 visPrompt 있는 슬라이드만 자동 이미지 배치”**까지 이어서 붙여드릴게요.



맞습니다. 원인은 정확히 이거였습니다:

AII Slide생성은 슬라이드 생성(visPrompt 포함)까지만 수행
실제 이미지 생성 루프(generateImage)는 자동 호출하지 않음
→ 그래서 설명은 생성되는데 이미지가 안 붙는 상태
방금 수정해서, AII 모드(auto_visual)에서는 슬라이드 생성 직후 자동으로 이미지 생성되도록 연결했습니다.

수정 내용
파일: js/slide-gen/slide-gen.js
추가:
autoGenerateImagesForSlides() 함수 신설
auto_visual 타입일 때 슬라이드 생성 후 자동 이미지 생성 실행
개선:
이미지 생성 성공 시 슬라이드에 즉시 반영(imageUrl)
썸네일/갤러리 실시간 갱신
히스토리 저장 시 imageUrl도 함께 저장되도록 수정
완료 토스트에 생성 결과 표시 (예: 성공 N개 / 실패 M개)
이제 동작
All Slide생성 클릭
슬라이드 생성 완료 후 자동으로 이미지 생성 진행
생성된 이미지는 각 슬라이드에 바로 붙음
확인 포인트
슬라이드별 visPrompt가 비어있지 않아야 이미지가 생성됩니다.
API 키/이미지 모델 호출 오류가 있으면 해당 슬라이드만 실패 카운트로 표시됩니다.
원하시면 다음으로 visPrompt가 비어있는 슬라이드에 대해 자동 보강 프롬프트 생성 후 재시도까지 넣어드릴게요.


# 프롬프트
1) 시스템 프롬프트 (프롬프트 설정 키)
키: slide_gen_system_auto_visual
구성: slideGenBase + Type I: AII 자동 시각화형

# Role
너는 학술 논문 및 연구 자료 분석 전문가인 [ScholarSlide AI]이다.
톤: 학술적 톤 (명사형 종결 어미 사용, 또는 ~임, ~이다).
안전 규칙: 기존 기능을 수정하거나 삭제할 경우 반드시 사용자 동의가 필요하다.

# Citation Rule (APA 7th Edition)
- 모든 슬라이드 내용에는 근거가 되는 연구자와 연도를 반드시 명기하라.
- 문장 끝에 (저자, 연도) 형식의 APA 내체 인용을 누락 없이 포함해야 한다.
...
# Operational Instructions
- 답변 시작 시 "선택하신 [유형 이름]으로 슬라이드 구성을 시작합니다."라고 알릴 것.
- title에 Slide 번호 금지
- 출력은 순수 JSON만. Korean(title/bullets/notes), English(visPrompt)

# Generation Type (선택된 유형)
## Type I: AII 자동 시각화형 (Auto Visualizer)
문서 분량에 맞춰 슬라이드 수를 자동 조정하고(필요 시 사용자 범위 준수), 
페이지별 시각화 전략을 먼저 결정하라.
원자료의 그림/표/도해를 가능한 한 보존해 재구성하되, 
해석이 필요한 경우 주석·인사이트가 추가된 도식으로 변환하라.
시각화가 필요한 슬라이드에는 visPrompt를 매우 구체적인 영어 문장으로 작성하고,
불필요한 슬라이드는 visPrompt를 비워라.




2) 사용자 프롬프트 템플릿 (프롬프트 설정 키)
키: slide_gen_user_prompt
선택하신 {{TYPE_LABEL}}으로 슬라이드 구성을 시작합니다.
이 텍스트를 기반으로 정확히 {{SLIDE_COUNT}}개의 슬라이드를 생성하세요.
스타일: {{STYLE_GUIDE}}
{{COVER_NOTE}}
{{STRUCTURE_NOTE}}
{{NO_SLIDE_NUM_NOTE}}
{{PAGE_POLICY_NOTE}}
{{VISUAL_POLICY}}
반드시 아래 JSON 배열 형식으로만 응답하세요 (코드블록 없이, 마크다운 없이):
[{"title":"슬라이드 제목(번호 없이 섹션명만)","bullets":["포인트1","포인트2","포인트3"],"notes":"발표자 노트","visPrompt":"English diagram description for AI image generation","isCover":false}]
텍스트:
{{TEXT}}


All Slide생성 시 실제 치환 값 핵심
TYPE_LABEL → AII 자동 시각화형 (Auto Visualizer)
SLIDE_COUNT → 문서 길이 기반 자동 계산값(페이지 범위 입력 시 범위 내로 조정)
PAGE_POLICY_NOTE → 자동 산정 + 사용자 범위 준수 규칙
VISUAL_POLICY → 원자료 그림/표 재구성 + 필요 시 해석 도식 추가 규칙
원하면 지금 바로 slide_gen_system_auto_visual/slide_gen_user_prompt를 교재형에 맞게 더 강하게(예: “표는 반드시 표 형태 유지”, “원자료 그림 캡션 기반으로 재작성”) 커스터마이징해서 넣어드릴게요.






변경 사항
1. index.html — 전체 요약 방식 선택 모달
커스텀 지시사항 (프롬프트) 섹션 추가
id="summary-options-custom-instruction" 인 textarea
placeholder: 예: supplement·information theory까지 요약, 20페이지 분량 괜찮음...
안내 문구: "요약 시 AI에 전달되는 추가 지시사항입니다. 좌측 패널의 커스텀 지시사항과 연동됩니다."
2. index.js — openSummaryOptionsModal()
모달을 열 때 좌측 패널의 커스텀 지시사항(custom-instruction-val) 값을 모달의 summary-options-custom-instruction에 넣어 둠
→ 모달에서 항상 현재 설정한 프롬프트를 보고 수정할 수 있음.
3. index.js — confirmSummaryOptions()
모달의 커스텀 지시사항 값을 읽어서
좌측 패널의 custom-instruction-val에 다시 씀 (다음에 모달을 열면 동일하게 보이도록)
generateSummary('full', { ..., customInstruction: customInstruction })에 넘김
→ 요약 실행 시 모달에 입력한 프롬프트가 적용됨.
4. js/slide-gen/slide-gen.js — generateSummary()
options.customInstruction이 있으면 그 값을 우선 사용하고, 없으면 기존처럼 custom-instruction-val textarea 값을 사용하도록 변경
→ 모달에서 넘긴 커스텀 지시사항이 요약 프롬프트에 반영됨.
이제 전문요약 도구/슬라이드 초안제작으로 모달을 열면 요약 대상·세밀도·요약 방식 아래에 커스텀 지시사항이 보이고, 여기에 적은 내용이 요약 시 AI에 그대로 전달됩니다.



강화 완료했습니다.
요청하신 골자대로 교재형에서 그림/표를 설명만 하지 않고 실제 이미지 생성으로 이어지도록 프롬프트를 더 강하게 바꿨습니다.

적용한 강화 내용
1) slide_gen_system_auto_visual 강화
파일: js/core/prompt-store.js

교재형 시각화 강제 규칙 추가:
Figure/Table/도해/과정도/비교표/그래프 언급 시 visPrompt 필수
설명 슬라이드는 설명으로 끝내지 않고 이미지 재생성 지시 포함
표는 행/열/헤더 유지 명시
그래프는 축/범례/단위/비교군 명시
원자료 캡션(제목/변수/단위/조건/집단/시점) 반영
장식 이미지 금지, 학습용 도식 우선
2) slide_gen_user_prompt 강화
파일: js/core/prompt-store.js

교재형 시각화 규칙 블록 추가
JSON 스키마는 유지하되 visPrompt 품질 기준 강화
추가 강제 문구:
visPrompt 영어 1~3문장
표지 제외, 시각화 필요 슬라이드에서 빈 visPrompt 금지
그림/표 인용 슬라이드에서 visPrompt 비면 실패 처리
3) 런타임 안전장치 추가
파일: js/slide-gen/slide-gen.js

auto_visual 실행 시, 사용자 오버라이드 프롬프트를 쓰더라도
교재형 강제 규칙(캡션 반영/표·그래프 구조 명시/장식 금지/빈 visPrompt 실패)을
최종 프롬프트에 항상 추가로 덧붙이도록 했습니다.
이제 All Slide생성에서 교재 내 그림/표 관련 페이지는 visPrompt 생성 가능성이 확실히 높아지고, 이후 자동 이미지 생성 파이프라인으로 연결됩니다.

원하면 다음 단계로, visPrompt 생성 결과를 검사해서
**“Figure/Table 키워드가 있는데도 약하게 생성된 프롬프트는 자동으로 재작성”**하는 품질 필터도 추가해드릴 수 있습니다.


요청하신 대로 slide_gen_system_notebook를 교재 단원형 전용 프롬프트로 교체했습니다.
이제 노트북/학습형(C)은 논문형 공통 베이스를 타지 않고, 교재 구조 중심으로 동작합니다.

적용 파일:

js/core/prompt-store.js
적용 핵심:

장/절/소절 번호 구조 반영 (2 → 2.1 → 2.2 → 3 → 3.1 ...)
Figure/Table 번호 매핑 규칙 강화 (Figure 2.5, Table 3.1 등)
그림/표 슬라이드에서 “설명만” 금지, 이미지 생성 가능한 visPrompt 필수
표는 행/열/헤더/단위/비교군 명시
제목은 질문형 중심, 슬라이드 번호 텍스트 금지
언어 규칙 유지: title/bullets/notes 한국어, visPrompt 영어
즉, 지금부터 C. 노트북/학습형 (Concept Mastery)은 교재 발표용으로 더 맞게 생성됩니다.
원하시면 다음으로 slide_gen_user_prompt 쪽도 notebook 모드일 때 별도 템플릿을 쓰게 분리해 드릴게요(현재는 공통 user 템플릿 사용).



# img inDB
요청하신 imgBank 기능을 모두 반영했습니다. 변경 사항만 요약합니다.

1. 저장소 (inDB) — js/core/storage.js
DB 버전을 3으로 올리고 스토어 imgbank 추가 (keyPath: id, autoIncrement).
함수 추가: imgBankGetAll(), imgBankAdd({ dataURL, name?, createdAt? }), imgBankDelete(id).
2. imgBank 화면 — js/features/imgbank.js (신규)
왼쪽: IndexedDB에서 불러온 이미지를 매트릭스(갤러리) 형태로 표시.
오른쪽: 선택한 이미지 프리뷰
확대/축소: − / + 버튼, 배율 표시(100% 등).
이동:
확대 후 마우스 드래그로 이동.
화살표 키(↑↓←→) 로 30px 단위 이동.
Export: 현재 imgBank 전체를 JSON 파일로 다운로드.
Import: JSON 파일 선택 시 파싱 후 imgbank에 추가하고 그리드 갱신.
이미지 업로드 모달에서 「inDB 저장」 클릭 시 _finalCroppedDataURL 또는 _origImageDataURL을 imgBankAdd로 저장하고 토스트로 안내.
3. UI 연결 — index.html / js/ui/modals.js / style.css
메인 메뉴(헤더): 🖼 imgBank 버튼 추가 → 클릭 시 우측 패널에서 imgBank 탭으로 전환.
우측 탭: 🖼 imgBank 탭 추가, #imgbank-panel 영역 추가.
이미지 업로드 모달: 「⬇ 저장」 오른쪽에 「inDB 저장」 버튼 추가.
스타일: .imgbank-layout, .imgbank-grid, .imgbank-preview-wrap 등 갤러리/프리뷰용 CSS 추가.
4. 스크립트 로드
index.html에서 js/features/imgbank.js 를 storage.js 다음에 로드하도록 추가.
사용 방법

헤더의 🖼 imgBank 또는 우측 🖼 imgBank 탭으로 진입.
이미지 업로드 모달에서 편집 후 「inDB 저장」 으로 DB에 저장.
imgBank 화면에서 왼쪽 그리드로 선택 → 오른쪽에서 확대/축소·드래그·화살표로 확인.
Export로 JSON 백업, Import로 JSON에서 복원.
원하면 프리뷰에서 «슬라이드에 삽입» 버튼으로 선택 이미지를 현재 슬라이드에 넣는 연동도 추가할 수 있습니다.





# 요약 
변경 내용
수정 파일: js/slide-gen/slide-gen.js
추가 동작:
visPrompt가 빈 슬라이드를 자동 탐지
슬라이드 제목/불릿/노트를 바탕으로 보강 프롬프트 생성
보강된 visPrompt를 저장한 뒤 이미지 생성 루프로 진행
결과 표시:
토스트에 visPrompt 보강 n개 (실패 m개) + 이미지 생성 n개 (실패 m개)를 함께 표시
프롬프트 설정 연동 확인
네, 프롬프트 설정에 들어간 값을 실제로 사용합니다.

자동 보강 시 사용하는 키:

imggen_vis_prompt_system
imggen_vis_prompt_instruction
연결 경로:

js/core/prompt-store.js의 getImggenVisPromptInstruction()에서 위 2개 키를 읽음
js/slide-gen/slide-gen.js의 자동 보강 로직이 이 함수를 호출해 사용
즉, 설정창 프롬프트 설정에서 해당 항목을 바꾸면 보강 품질/스타일이 바로 반영됩니다.




원인은 프롬프트가 아니라 요약에 쓰는 원문 길이 제한이었습니다. 그 부분을 수정했습니다.

원인
요약 시 원문을 앞부분 15,000자만 잘라서 AI에 보내고 있었습니다.
8장짜리 원고는 15,000자 안에 1~2장 정도만 들어가서, 결과도 2장까지만 나온 것입니다.
수정 사항
1. js/slide-gen/slide-gen.js — 요약용 원문 길이 제한 확대
15,000자 → 80,000자로 변경했습니다.
원문 요약·번역 후 요약 모두 동일한 summaryCharLimit(80,000자)를 사용합니다.
8장 분량도 대부분 한 번에 요약 가능한 수준입니다.
2. js/prompts/prompt_summary.js — “전체 챕터 요약” 지시 추가
요약 세밀도 공통 지시 맨 앞에 다음 문장을 넣었습니다.
「원문이 여러 장(chapter)·섹션으로 구성된 경우, 제공된 전체 분량에 등장하는 모든 장과 섹션을 빠짐없이 요약할 것. 앞부분(1~2장)만 요약하지 말고, 원문 끝까지 균형 있게 모든 챕터를 포함할 것.»
이렇게 해서 80,000자 안에 들어온 모든 챕터가 요약에 포함되도록 했습니다.
이제 같은 8장 원고로 다시 요약하면, 1~8장 전체가 반영된 요약이 나와야 합니다.
원고가 80,000자를 넘으면 그때는 앞 80,000자만 요약되므로, 필요하면 나중에 이 제한 값을 더 늘릴 수 있습니다.


변경 사항
1. js/ui/settings-window.js — 기타 설정에 항목 추가
원문 요약 글자 수 입력란 추가
id="sw-misc-summary-char-limit"
type="number", min="10000", max="500000", step="1000", 기본값 80000
안내 문구: "요약 시 원문에서 사용할 최대 글자 수 (기본 80,000자)"
설정 창을 열 때 localStorage의 ss_summary_char_limit 값을 불러와 표시 (없으면 80000)
적용 시 ss_summary_char_limit에 저장하며, 10,000 ~ 500,000 범위로만 저장
2. js/slide-gen/slide-gen.js — 요약 시 설정값 사용
요약할 때 localStorage.getItem('ss_summary_char_limit')를 읽어 사용
값이 없거나 잘못된 경우 80,000 사용
10,000 미만이면 10,000, 500,000 초과면 500,000으로 제한
이제 설정 → 기타 설정에서 원문 요약 글자 수를 10,000 ~ 500,000 자 사이로 바꿀 수 있고, 요약은 이 값만큼만 원문을 잘라 사용합니다.


영 완료했습니다. 요청하신 2가지를 모두 넣었습니다.

생성 전 백업 표시:
새 슬라이드 생성 전에 자동 백업되는 히스토리 항목에 생성 전 백업 배지가 붙습니다.
수동 히스토리 저장 기능:
상단 툴바에 💾 히스토리 저장 버튼을 추가해서, 슬라이드를 조금 수정한 뒤 원하는 시점에 직접 히스토리에 저장할 수 있습니다.
사용 방법
슬라이드 편집 후 상단 💾 히스토리 저장 클릭
왼쪽 슬라이드 생성히스토리에서 수동 저장 배지 붙은 항목 확인
항목 클릭하면 즉시 해당 상태로 복귀
적용 파일
index.html (💾 히스토리 저장 버튼 추가)
index.js (수동 저장 함수 saveCurrentSlidesToHistory() 추가 + 버튼 활성/비활성 연동)
js/slide-gen/slide-gen.js (생성 전 백업 항목에 플래그 추가)
js/ui/sidebar/manuscript-tab.js (히스토리 배지 렌더링: 생성 전 백업, 수동 저장)
원하시면 다음으로, 수동 저장 시 간단한 메모(예: “도입부 수정본”, “이미지 교체 후”)를 입력해서 히스토리 제목에 같이 남기도록 확장해드릴게요.



결론: 일부만 반영되고, “슬라이드 생성 유형”은 All Slide에서 무시됩니다
1. 슬라이드 생성 유형

All Slide에서는 사용되지 않습니다.
slides_auto(All Slide)일 때는 항상 slideGenType = 'auto_visual'로 고정됩니다.
UI에서 "C. 노트북/학습형" 등을 골라도 All Slide는 항상 "AII 자동 시각화형 (Auto Visualizer)" 로만 동작합니다.
2. 슬라이드 비율 (16:9 등)

생성 API/프롬프트에는 넘기지 않습니다.
앱 전역 비율 설정이라 생성된 슬라이드를 그 비율로 보여주는 데만 쓰입니다.
즉, 표시에는 반영, 생성 로직(슬라이드 수·구성)에는 미반영입니다.
3. 슬라이드 수

**All Slide에서는 “문서량 기반 자동 산정”**만 사용합니다.
estimateAutoSlideCount(원문 길이, 표지 포함)으로 슬라이드 수를 정하고,
페이지 범위가 있으면 그 min~max 안으로만 잘라서 사용합니다.
따라서 사전 설정의 “슬라이드 수” 입력값(예: 30)은 All Slide에서 직접 쓰이지 않고,
페이지 범위가 상·하한 역할을 합니다.
4. 표지 포함

반영됩니다.
includeCover가 슬라이드 수 추정과 프롬프트의 표지 지시(coverNote)에 사용됩니다.
5. 커스텀 프롬프트

반영됩니다.
All Slide일 때는
설정(prompt-store)의 **「All Slide 생성 — 커스텀 프롬프트」**가 있으면 그걸로 덮어쓰고,
없으면 원고 탭의 「커스텀 프롬프트」 입력값이 추가 지시로 들어갑니다.
6. 페이지 범위

반영됩니다.
“All 버튼에서 문서량 기반 자동 조정”이지만,
범위를 넣으면(예: 12-24) 슬라이드 수가 그 min~max 안에서만 정해지도록 코드에 반영되어 있습니다.
한 줄 요약:
All Slide는 표지 포함, 커스텀 프롬프트, 페이지 범위는 사전 설정을 따르고, 슬라이드 생성 유형은 무시되며(항상 자동 시각화형), 슬라이드 수는 문서량+페이지 범위로만 자동 산정되고 “슬라이드 수” 입력값은 직접 쓰이지 않습니다.




반영했습니다. 배치 일괄적용이 “현재 보이는 구조(창 크기·배치)”를 모든 슬라이드에 그대로 쓰도록 바꿨습니다.

변경 내용
1. 동작 방식

기준: 현재 선택한 한 페이지의 창(배치) 구조를 기준으로 사용합니다.
대상: 그 구조를 나머지 모든 슬라이드에 일괄 적용합니다.
이미지 여부: 기준 슬라이드에 이미지가 없어도 동작합니다. (텍스트만 있어도 본문 영역 크기·위치 등 적용 가능)
2. 일괄 적용되는 항목

현재 슬라이드에서 아래 속성들을 복사해 모든 슬라이드에 넣습니다.

항목	설명
innerSize	텍스트/이미지 비율(widthPct), 텍스트 영역 높이(heightPct)
bulletSize	본문(불릿) 영역 가로·세로 크기
bulletPosition	본문 영역 위치(left, top)
slideImage1 / slideImage2	이미지 슬롯 크기·위치(w, h, left, top)
extraAreaHeight, extraAreaPosition	텍스트창(추가 영역) 높이·위치
extraImageSize	추가 영역 안 이미지 크기
titlePosition	제목 위치
titleFontSize	제목 글자 크기
layerOrder	레이어 순서(텍스트/이미지 앞뒤)
3. 코드/UI 문구

applyCurrentSlideLayoutToAll(): 위 속성들을 깊은 복사로 현재 슬라이드에서 읽어, 기준 슬라이드를 제외한 모든 슬라이드에 적용하도록 수정했습니다.
확인 메시지:
"현재 슬라이드의 창 크기·배치 구조(텍스트/이미지 비율, 본문 영역 크기, 이미지 크기·위치, 레이어 순서 등)를 모든 슬라이드에 일괄 적용할까요?"
버튼 툴팁:
"현재 슬라이드의 창 크기·배치 구조를 모든 슬라이드에 일괄 적용"
한 페이지에서 디바이더·리사이즈 핸들로 창 크기를 맞춘 뒤 배치 일괄적용을 누르면, 그 한 페이지의 “현재 보이는 구조”가 전체 슬라이드에 동일하게 적용됩니다.


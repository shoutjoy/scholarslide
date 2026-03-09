# 좌측 사이드바 원고(원고) 파트 UI 개편

## 목표
원고 탭을 눌렀을 때만 적용되는 전용 UI로 변경. 기존 `index.js`에 몰아넣지 않고 **폴더/파일 분할**로 구현.

## 새 원고 탭 UI 구성 (위 → 아래 순서)

| 순서 | 블록 | 설명 | 기존 연동 |
|------|------|------|-----------|
| 0 | 파일 뱃지 | 파일명·크기·미리보기 (원고 탭에서도 유지) | `file-badge` 동일 |
| 1 | **[발표원고생성], [슬라이드 생성]** | 한 줄에 버튼 2개 | `askThenGenerateScript()`, `askThenSummary('slides')` |
| 2 | **[커스텀 프롬프트]** | 텍스트 영역 | `id="custom-instruction-val"` 유지 |
| 3 | **[슬라이드 원고로 생성], [파일선택]** | 한 줄에 버튼 2개 | 발표 원고 생성 + `handleFileUpload` (다른 파일 열기) |
| 4 | **[텍스트입력창]** | 자유 입력/메모용 텍스트 영역 | `id="manuscript-text-input"` (신규) |
| 5 | **[발표원고], [슬라이드생성]** | 보기 전환 탭 | 발표원고 = 스크립트 목록, 슬라이드생성 = 슬라이드 요약/생성 안내 |
| 6 | **[생성내용] [생성히스토리] [새창보기]** | 하단 액션 3개 | 생성내용 표시 영역, 히스토리 토글, 새 창에서 보기 |

## 파일 구조

```
js/
  ui/
    left-panel.js          ← 기존. 원고 탭일 때 manuscript-tab 호출
    sidebar/
      manuscript-tab.js    ← 신규. 원고 탭 전용 HTML 생성 및 핸들러 연결
```

## 구현 단계

### 1단계: 문서화 및 설계
- [x] `Doc/sidebar_revise.md` 작성 (본 문서)

### 2단계: 원고 탭 전용 모듈
- [x] `js/ui/sidebar/manuscript-tab.js` 생성
  - `buildManuscriptTabContent(opts)` 함수: `opts`에 fileName, fileSizeLabel, rawTextLength, presentationScript, slides, customInstruction, leftTab 등 전달받아 원고 전용 HTML 문자열 반환
  - 위 표의 1~6 블록 순서로 마크업
  - 기존 전역 함수 호출: `askThenGenerateScript`, `askThenSummary`, `handleFileUpload`, `saveContent`, `openSummaryWindow` 등 (onclick에서 호출)
  - 원고/슬라이드생성 토글: `_manuscriptView` ('script' | 'slides') 로 전환 시 해당 영역만 표시
  - 생성내용/생성히스토리: `_manuscriptSubView` ('content' | 'history'), 생성히스토리 시 **`getManuscriptHistory()`** 목록 표시 (요약 히스토리와 분리)
  - 새창보기: `openScriptInNewWindow()` 전역 함수로 발표 원고를 새 창에 표시

### 3단계: left-panel.js 연동
- [x] `left-panel.js`에서 `leftTab === 'script'` 일 때
  - 공통 상단(문체 설정, 슬라이드 수, 표지 포함, 슬라이드 생성 유형, 전체 요약/슬라이드 생성 카드) **없이**
  - `buildManuscriptTabContent(...)` 결과만 사용해 `content.innerHTML` 구성 (파일 뱃지는 원고 탭 전용 HTML에 포함)
- [x] `index.html`에 `<script src="js/ui/sidebar/manuscript-tab.js"></script>` 추가 (left-panel.js 이전에 로드)

### 4단계: 동작 확인
- [ ] 원문/요약 탭: 기존과 동일
- [ ] 원고 탭: 새 UI만 표시, 발표원고생성·슬라이드 생성·파일선택·커스텀 프롬프트·생성내용/히스토리/새창보기 동작

## 참고: 기존 ID / 전역 함수

- `custom-instruction-val`: 커스텀 지시사항 (슬라이드 생성 등에서 사용)
- `slide-count-val`, `include-cover`, `slide-gen-type`, `writing-style-val`: 원고 탭에서는 상단에 두지 않음 (설정 창 또는 요약 탭에서만 사용 가능)
- `askThenGenerateScript()`, `askThenSummary('slides')`, `handleFileUpload`, `saveContent('script')`, `openSummaryWindow`, `renderLeftPanel`

## 요약 탭 vs 원고 탭 · 히스토리 분리

- **요약 탭**
  - **전체 요약**: 기존과 동일. 요약 옵션 모달 → 요약만 실행 → **요약 히스토리**에 저장.
  - **슬라이드 요약**: "슬라이드 생성" 버튼을 **"슬라이드 요약"**으로 변경. 클릭 시 **요약 옵션 모달**만 열리며, 사용자가 요약 방식(세밀한/핵심/슬라이드 요약 등)을 선택 후 실행하면 **요약만** 수행되고 **요약 히스토리**에만 저장됨. 실제 슬라이드(JSON)는 생성하지 않음.
- **원고 탭**
  - **슬라이드 생성**: `askThenSummary('slides')` 호출 → 실제 슬라이드 JSON 생성. 완료 시 **원고(슬라이드) 히스토리**에 추가.
  - **발표 원고 생성**: `askThenGenerateScript()` 호출. 완료 시 **원고(슬라이드) 히스토리**에 추가.
- **요약 히스토리** (`ss_summary_history`, `getSummaryHistory`)와 **원고 히스토리** (`ss_manuscript_history`, `getManuscriptHistory`)는 **공유하지 않음**. 요약 탭에서는 요약 히스토리만, 원고 탭 생성히스토리에서는 원고/슬라이드 생성 기록만 표시.

## 수정 이력

- 최초 작성: 원고 탭 UI 개편 요청에 따라 계획 수립 및 1단계 완료.
- 2·3단계 완료: `js/ui/sidebar/manuscript-tab.js` 추가, `left-panel.js` 연동, `index.html` 스크립트 로드. 생성내용/생성히스토리/새창보기 동작 구현.
- 요약 탭 개편: 요약 탭 "슬라이드 생성" → "슬라이드 요약"(요약 옵션 모달만 열고 요약만 수행). 원고 히스토리 저장소(`ss_manuscript_history`) 추가, 원고 탭 생성히스토리에서만 사용. 요약 히스토리와 원고 히스토리 분리.

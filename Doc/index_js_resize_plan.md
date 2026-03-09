# index.js 리사이즈 계획 (목표: 1500줄 이내)

현재 `index.js`는 **약 5,380줄**입니다. 이를 **1,500줄 이내**로 줄이기 위해 모듈 분리 계획을 정리했습니다.

---

## 1. 목표

| 항목 | 내용 |
|------|------|
| **목표** | `index.js`를 **1,500줄 이내**로 축소 |
| **방식** | 단일 파일을 **기능별 모듈**로 분리 후 `<script>` 로드 순서로 의존성 해결 |
| **호환** | 기존 `index.html`의 `onclick="함수명()"` 및 `js/slide-gen.js`, `js/translate.js`와의 전역 연동 유지 |

---

## 2. 로드 순서 (index.html에 추가할 script 태그)

의존 관계를 만족하도록 아래 순서로 로드합니다.

```
1. js/core/state.js          ← 전역 상태·상수·ReferenceStore
2. js/core/helpers.js       ← escapeHtml, showToast, autoResize, openModal 등 공통 유틸
3. js/core/api-keys.js      ← API 키·모달·저장키 목록
4. js/core/storage.js       ← IDB, 자동저장, 프로젝트/세션 불러오기
5. js/features/references.js ← 인용 포맷·참고문헌 패널·APA 파싱·저장 목록
6. js/features/gemini-file.js ← callGemini, generateImage, 파일 업로드, PDF worker
7. js/features/panels.js    ← 좌측 패널, 탭 전환, 요약/원고 창
8. js/features/slides-thumbs.js ← renderThumbs, selectSlide, 레이어, 슬라이드 CRUD
9. js/features/images-crop.js   ← 이미지 생성·시각화·갤러리·크롭 엔진 전체
10. js/features/presentation.js ← 발표 모드, 외부 발표, 펜 도구
11. js/features/export-pptx.js  ← PPTX 내보내기, Clear All
12. js/features/pdf-preview.js  ← PDF 미리보기 패널
13. js/features/design-render.js ← updateDesignPanel, renderSlides(대형), 슬라이드 HTML
14. js/features/markdown-editor.js ← MD 에디터, parseMdFull, 마크다운→HTML, YouTube
15. js/features/ai-popups.js     ← AI 이미지 팝업, YouTube 모달 등
16. index.js                    ← 진입점·DOMContentLoaded·이벤트 훅·나머지 글루 코드 (목표 1500줄)
17. js/translate/translate.js
18. js/slide-gen/slide-gen.js
```

---

## 3. 모듈별 책임 및 예상 줄 수

### 3.1 js/core/state.js (~120줄)

- **내용**: `LS_*` 상수, `rawText`, `fileName`, `slides`, `sources`, `activeSlideIndex`, `leftTab`, `rightTab`, `summaryText`, `presentationScript`, `slideStyle`, `presIndex`, `presNotesVisible`, `_presFromCurrent`, `writingStyle`, `_abortController`, 크롭/펜 관련 `_*` 변수, `_activeApiKey`, `ReferenceStore` IIFE
- **노출**: 위 변수들은 전역(또는 `window.ScholarSlide = window.ScholarSlide || {}`에 붙여서 다른 스크립트에서 접근)
- **비고**: `_exposeSlideGenGlobals()`는 `index.js`에서 state 로드 후 호출하거나, state.js 마지막에 두어도 됨

### 3.2 js/core/helpers.js (~180줄)

- **내용**: `showConfirm`, `askThen*`, `showGlobalProgress`/`updateGlobalProgress`/`hideGlobalProgress`, `showLoading`/`setProgress`/`hideLoading`, `abortCurrentTask`, `showToast`, `escapeHtml`, `autoResize`, `switchTab`, `switchRightTab`, `openModal`, `closeModal`, `handleModalBackdropClick`, `renderHelpModal`, `openHelpModal`
- **의존**: `state.js` (전역 상태 참조)

### 3.3 js/core/api-keys.js (~120줄)

- **내용**: `getApiKey`, `loadSavedKeys`, `saveKeysList`, `maskKey`, `updateHeaderKeyStatus`, `initApiKey`, `toggleKeyVisibility`, `updateApiKeyStrength`, `renderSavedKeysList`, `selectSavedKey`, `deleteSavedKey`, `applyApiKey`
- **의존**: `state.js`, `helpers.js`

### 3.4 js/core/storage.js (~380줄)

- **내용**: `openIDB`, `idbPut`, `idbGet`, `idbGetAll`, `idbGetAllKeys`, `idbDelete`, `buildWorkspaceSnapshot`, `autoSaveNow`, `scheduleAutosave`, `updateAutosaveIndicator`, `restoreAutosave`, `applyWorkspaceSnapshot`, `_markDirty`, 프로젝트 import/export, `switchLoadTab`, `renderAutosaveTab`, `restoreAutosaveAndClose`, `clearAutosave`, `saveSession`, `loadSessions`, `openLoadModal`, `renderSessionsList`, `loadSession`, `renameSession`, `deleteSession`
- **의존**: `state.js`, `helpers.js`

### 3.5 js/features/references.js (~320줄)

- **내용**: `getSavedRefList`, `saveRefList`, `addToSavedList`, `formatAPA`/`formatInTextAPA`/`formatChicago`/`formatMLA`/`formatCitation`/`formatInText`, `addParsedRef`, `parseAPA`, `switchRefTab`, `renderSavedRefList`, `filterSavedRefList`, `clearSavedRefList`, `loadFromSavedList`, `deleteSavedRef`, `removeRef`, `clearAllReferences`, `saveRefToLocalList`, `_trackFocus`, `insertInTextCitation`, `makeRefSlide`, `addReferenceFromModal`, `addRefsSlide`, `renderRefsPanel`(패널 HTML 생성), Scholar 검색 AI 관련 `searchScholarAI`, `scholarAddRef`, `scholarSaveList`
- **의존**: `state.js`, `helpers.js`

### 3.6 js/features/gemini-file.js (~220줄)

- **내용**: `callGemini`, `generateImage`, `refineImageAPI`, `ensurePDFWorker`, `handleFileUpload`, `loadFromTextInput`, `enableMainBtns`, `saveContent`, 백그라운드 잡·이미지 API 키·`getImageApiKey`
- **의존**: `state.js`, `helpers.js`, `api-keys.js`

### 3.7 js/features/panels.js (~200줄)

- **내용**: `renderSources`, `renderLeftPanel`, `setSlideStyle`, `setWritingStyle`, `openFullTextWindow`, `openSummaryWindow`
- **의존**: `state.js`, `helpers.js`

### 3.8 js/features/slides-thumbs.js (~220줄)

- **내용**: `afterSlidesCreated`, `renderThumbs`, `selectSlide`, 레이어 선택/이동(`selectSlideLayer`, `moveLayerUp`, `moveLayerDown`, `applyLayerOrderToDom`), `updateSlideTitle`, `updateSlideBullet`, `updateSlideNotes`, `removeSlideImage`, `removeSlideImage2`, `openImageModal2`, `deleteSlide`, `addNewSlide`, `addSlideAfter`(빈 슬라이드 추가용)
- **의존**: `state.js`, `helpers.js`, `design-render`의 `renderSlides`는 전역 함수로 존재해야 하므로 순서상 design-render를 먼저 두거나, 여기서는 선언만 하고 정의는 design-render에 둠

### 3.9 js/features/images-crop.js (~950줄)

- **내용**: 이미지 생성·시각화(`askThenVisualizeAll`, `openVisualizeModal`, `startVisualizeAll`, `generateAllImages`, `refineImage`), `renderGallery`, `downloadGalleryImage`, `openImageModal`, `setupCropEvents`, 크롭 엔진 전부(`drawCropCanvas`, `drawCropOverlay`, `attachCropEvents`, 비율 버튼, 적용/취소, `aiEditImage` 등), `addImageContain`(PPTX용은 export-pptx에서 사용할 수 있도록 전역 유지)
- **의존**: `state.js`, `helpers.js`, `gemini-file.js`

### 3.10 js/features/presentation.js (~450줄)

- **내용**: 발표 모드 진입/종료, `presNav`, `changePresZoom`, `fitPresZoom`, `changePresFontScale`, `togglePresNotes`, 펜 도구(`setPenTool`, `setPenColor`, 그리기/지우개), `openExternalPresentation`(외부 발표 창), 발표 캔버스 렌더링
- **의존**: `state.js`, `helpers.js`, `design-render`의 슬라이드 렌더 결과

### 3.11 js/features/export-pptx.js (~380줄)

- **내용**: `exportPPT`(PptxGenJS 호출, 슬라이드별 제목/불릿/이미지 추가), References 슬라이드, `clearAll`
- **의존**: `state.js`, `helpers.js`, `references.js`(포맷 함수)

### 3.12 js/features/pdf-preview.js (~200줄)

- **내용**: PDF 미리보기 패널 열기/닫기, 페이지 네비게이션, 줌, `extractCurrentPageText`, `openPdfNewWindow`
- **의존**: `state.js`, `helpers.js`

### 3.13 js/features/design-render.js (~850줄)

- **내용**: `updateDesignPanel`(디자인 패널 HTML·이미지 업로드/제거/갤러리 버튼), **`renderSlides`** 전체(슬라이드 래퍼·제목·불릿·bullet-text·showBulletEditor/hideBulletEditor·wrapSelectionWith·extra text·이미지 영역·여백 뱃지), `renderGallery` 호출 연동
- **의존**: `state.js`, `helpers.js`, `slides-thumbs.js`의 update* 등
- **비고**: `renderSlides`가 매우 크므로 이 파일이 가장 비대함. 필요 시 슬라이드 HTML 생성부만 별도 `slide-template.js`로 나눌 수 있음

### 3.14 js/features/markdown-editor.js (~520줄)

- **내용**: `markdownToHtml`, `parseMdFull`(코드블록·YouTube·헤딩·리스트 등), `mdApplyToSlide`, `mdLoadFromSlide`, `mdUpdatePreview`, `mdUpdatePageIndicators`, `calcSlideWhitespacePx`, `updateWhitespaceBadges`, MD 에디터용 Ctrl+Enter, 불릿 Ctrl+B/Ctrl+I, YouTube URL 정규화/미리보기/삽입
- **의존**: `state.js`, `helpers.js`, `design-render`의 `renderSlides`

### 3.15 js/features/ai-popups.js (~400줄)

- **내용**: `openAiImageWindow`(팝업 HTML 문자열 포함), `applyAiImageFromPopup`, `addToAiImgHistory`, 기타 AI 슬라이드 추가 모달 연동
- **의존**: `state.js`, `helpers.js`, `gemini-file.js`

### 3.16 index.js — 진입점 (목표 ~1,200~1,500줄)

- **유지할 내용**
  - `_exposeSlideGenGlobals()` 호출(또는 state.js로 이전)
  - DOMContentLoaded: `loadAiImgHistory`, `initApiKey`, `renderLeftPanel`, `renderRefsPanel`, `renderThumbs`, `renderSlides`, `initMdSplitter`, `mdUpdatePageIndicators`, `updateWhitespaceBadges`
  - 자동저장 복구 토스트·복구/무시 버튼
  - 30초 간격 자동저장 setInterval
  - `renderSlides`/`renderLeftPanel` 훅으로 `_markDirty` 호출
  - `updateSlideBullet`, `hideBulletEditor`(중복 정의 정리 시 한 곳만 유지)
  - textarea 자동 확장·Enter 시 새 불릿 추가
  - Ctrl+9/0 줌, Ctrl+←/→ 슬라이드 이동, Ctrl+B/Ctrl+I(또는 markdown-editor로 이동)
  - Resizable panels(`startResize`, `doResize`, `stopResize`)
  - 기타 작은 이벤트 리스너·스텁
- **제거·이전**: 위 모듈로 이미 이전된 함수들은 index.js에서 삭제

---

## 4. 예상 줄 수 요약

| 파일 | 예상 줄 수 |
|------|------------|
| js/core/state.js | ~120 |
| js/core/helpers.js | ~180 |
| js/core/api-keys.js | ~120 |
| js/core/storage.js | ~380 |
| js/features/references.js | ~320 |
| js/features/gemini-file.js | ~220 |
| js/features/panels.js | ~200 |
| js/features/slides-thumbs.js | ~220 |
| js/features/images-crop.js | ~950 |
| js/features/presentation.js | ~450 |
| js/features/export-pptx.js | ~380 |
| js/features/pdf-preview.js | ~200 |
| js/features/design-render.js | ~850 |
| js/features/markdown-editor.js | ~520 |
| js/features/ai-popups.js | ~400 |
| **index.js** | **~1,200 ~ 1,500** |
| **합계** | **~7,100** (주석·빈 줄 포함) |

---

## 5. 작업 순서 제안

1. **Phase 1 — core**
   - `js/core/state.js` 생성 후 전역 상태·상수·ReferenceStore 이동
   - `js/core/helpers.js` 생성 후 토스트·모달·로딩·탭 전환 이동
   - `js/core/api-keys.js`, `js/core/storage.js` 순으로 분리
   - index.html에 script 1~4 추가, index.js에서 해당 블록 제거 후 테스트

2. **Phase 2 — references & api**
   - `js/features/references.js`, `js/features/gemini-file.js` 생성 및 이전
   - script 5~6 추가, index.js에서 제거 후 테스트

3. **Phase 3 — panels & slides**
   - `js/features/panels.js`, `js/features/slides-thumbs.js` 생성 및 이전
   - script 7~8 추가, index.js에서 제거 후 테스트

4. **Phase 4 — images & presentation & export**
   - `js/features/images-crop.js`, `js/features/presentation.js`, `js/features/export-pptx.js` 생성 및 이전
   - script 9~11 추가, index.js에서 제거 후 테스트

5. **Phase 5 — pdf & design & markdown**
   - `js/features/pdf-preview.js`, `js/features/design-render.js`, `js/features/markdown-editor.js` 생성 및 이전
   - script 12~14 추가, index.js에서 제거 후 테스트

6. **Phase 6 — ai-popups & index 정리**
   - `js/features/ai-popups.js` 생성 및 이전
   - index.js에 남은 글루 코드만 유지하고 줄 수 확인 (목표 1500줄 미만)
   - 전역 노출이 필요한 함수는 `window.함수명 = 함수명` 또는 그대로 전역 선언 유지

---

## 6. 주의사항

- **전역 노출**: HTML의 `onclick="함수명()"` 및 `slide-gen.js`/`translate.js`에서 사용하는 함수는 반드시 `window` 또는 전역 스코프에 유지.
- **순환 참조**: `renderSlides` ↔ `updateDesignPanel` 등 서로 호출하는 부분은 같은 파일에 두거나, 한쪽만 다른 모듈로 빼고 인자/콜백으로 넘기도록 설계.
- **기존 js 폴더**: `js/utils/citations.js`, `js/store/references.js` 등 기존 파일과 역할이 겹치면, 기존 파일을 쓰도록 통합하거나 이 계획의 새 파일로 대체할지 결정 필요.
- **테스트**: 각 Phase 후 로그인/API 키·슬라이드 생성·편집·발표·PPTX 내보내기·PDF 미리보기·크롭·MD 적용 등 핵심 플로우를 한 번씩 확인하는 것을 권장.

이 계획대로 진행하면 `index.js`를 **1,500줄 이내**로 줄이면서도 기능과 호환성을 유지할 수 있습니다.

# index.js 리사이즈 계획 — 실행 체크리스트

**목표**: `index.js`를 **1,500줄 미만**으로 축소  
**현재**: 약 5,380줄 → **제거 목표**: 약 3,900줄 이상을 별도 모듈로 이전

---

## 로드 순서 (index.html에 추가할 script)

```html
<script src="js/core/state.js"></script>
<script src="js/core/helpers.js"></script>
<script src="js/core/api-keys.js"></script>
<script src="js/core/storage.js"></script>
<script src="js/features/references.js"></script>
<script src="js/features/gemini-file.js"></script>
<script src="js/features/panels.js"></script>
<script src="js/features/slides-thumbs.js"></script>
<script src="js/features/images-crop.js"></script>
<script src="js/features/presentation.js"></script>
<script src="js/features/export-pptx.js"></script>
<script src="js/features/pdf-preview.js"></script>
<script src="js/features/design-render.js"></script>
<script src="js/features/markdown-editor.js"></script>
<script src="js/features/ai-popups.js"></script>
<script src="index.js"></script>
<script src="js/translate/translate.js"></script>
<script src="js/slide-gen/slide-gen.js"></script>
```

---

## Phase 1 — Core (state, helpers, api-keys, storage)

| # | 항목 | index.js 구간 | 새 파일 | 예상 줄 수 | 완료 |
|---|------|----------------|---------|------------|------|
| 1.1 | 전역 상수·상태·ReferenceStore·_exposeSlideGenGlobals | **8~68** | `js/core/state.js` | ~65 | ☑ |
| 1.2 | API 키: getApiKey, loadSavedKeys, saveKeysList, maskKey, updateHeaderKeyStatus, initApiKey, openApiModal, openModal, closeModal, handleModalBackdropClick, renderHelpModal, openHelpModal, toggleKeyVisibility, updateApiKeyStrength, renderSavedKeysList, selectSavedKey, deleteSavedKey, applyApiKey | **385~487** | `js/core/api-keys.js` | ~105 | ☑ |

| 1.3 | UI 공통: showConfirm, askThenSummary, askThenFetchSources, askThenGenerateScript, askThenGenerateImages, askThenRewrite | **488~521** | `js/core/helpers.js` | ~35 | ☑ |
| 1.4 | UI 공통: showGlobalProgress, updateGlobalProgress, hideGlobalProgress, showLoading, setProgress, hideLoading, abortCurrentTask, showToast, escapeHtml, autoResize, switchTab, switchRightTab | **901~984** | `js/core/helpers.js` (이어서) | ~85 | ☑ |
| 1.5 | IDB·자동저장: openIDB, idbPut, idbGet, idbGetAll, idbGetAllKeys, idbDelete, buildWorkspaceSnapshot, autoSaveNow, scheduleAutosave, updateAutosaveIndicator, restoreAutosave, applyWorkspaceSnapshot, _markDirty | **525~707** | `js/core/storage.js` | ~185 | ☑ |
| 1.6 | 프로젝트·로드 모달: openProjectModal, exportProjectFile, importProjectFile, switchLoadTab, renderAutosaveTab, restoreAutosaveAndClose, clearAutosave, saveSession, loadSessions, openLoadModal, renderSessionsList, loadSession, renameSession, deleteSession | **708~900** | `js/core/storage.js` (이어서) | ~195 | ☑ |
| 1.7 | index.html에 script 4개 추가 (state, helpers, api-keys, storage) | — | `index.html` | — | ☑ |
| 1.8 | index.js에서 1.1~1.6 해당 블록 삭제 후 동작 확인 | — | `index.js` | **-665줄** | ☑ |

---

## Phase 2 — References & Gemini & File

| # | 항목 | index.js 구간 | 새 파일 | 예상 줄 수 | 완료 |
|---|------|----------------|---------|------------|------|
| 2.1 | 인용·참고문헌: formatAPA, formatInTextAPA, formatChicago, formatMLA, formatCitation, formatInText, addParsedRef, parseAPA | **69~137** | `js/features/references.js` | ~70 | ☑ |
| 2.2 | 참고문헌 탭·저장목록: switchRefTab, renderSavedRefList, filterSavedRefList, clearSavedRefList, loadFromSavedList, deleteSavedRef, getSavedRefList, saveRefList, addToSavedList | **138~188** | `js/features/references.js` (이어서) | ~55 | ☑ |
| 2.3 | 참고문헌 패널·인용 삽입: removeRef, clearAllReferences, saveRefToLocalList, _trackFocus, insertInTextCitation, makeRefSlide, addReferenceFromModal, addRefsSlide, renderRefsPanel | **189~313** | `js/features/references.js` (이어서) | ~130 | ☑ |

| 2.4 | Scholar AI: searchScholarAI, scholarAddRef, scholarSaveList | **314~360** | `js/features/references.js` (이어서) | ~50 | ☐ |
| 2.5 | Sources 패널: renderSources | **361~377** | `js/features/panels.js` (또는 references) | ~20 | ☐ |
| 2.6 | Gemini·파일: callGemini, generateImage, refineImageAPI, ensurePDFWorker, handleFileUpload, loadFromTextInput, enableMainBtns, saveContent, _bgJob*, getImageApiKey | **985~1375** | `js/features/gemini-file.js` | ~395 | ☐ |
| 2.7 | 드래그 앤 드롭: handleDragOver, handleDragLeave, handleDrop | **1376~1382** | `js/features/gemini-file.js` (이어서) | ~10 | ☐ |
| 2.8 | index.html에 script 2개 추가 (references, gemini-file) | — | `index.html` | — | ☐ |
| 2.9 | index.js에서 2.1~2.7 해당 블록 삭제 후 동작 확인 | — | `index.js` | **-710줄** | ☐ |

---

## Phase 3 — Panels & Slides & Thumbs

| # | 항목 | index.js 구간 | 새 파일 | 예상 줄 수 | 완료 |
|---|------|----------------|---------|------------|------|
| 3.1 | 좌측 패널: renderLeftPanel, setSlideStyle, setWritingStyle, openFullTextWindow, openSummaryWindow | **1383~1501** | `js/features/panels.js` | ~120 | ☐ |
| 3.2 | 슬라이드·썸네일: afterSlidesCreated, renderThumbs, selectSlide | **1502~1555** | `js/features/slides-thumbs.js` | ~55 | ☐ |
| 3.3 | 레이어: selectSlideLayer, moveLayerUp, moveLayerDown, applyLayerOrderToDom | **1556~1612** | `js/features/slides-thumbs.js` (이어서) | ~60 | ☐ |
| 3.4 | 슬라이드 CRUD: updateSlideTitle, updateSlideBullet, updateSlideNotes, removeSlideImage, removeSlideImage2, openImageModal2, deleteSlide, addNewSlide, addSlideAfter | **1613~1634** | `js/features/slides-thumbs.js` (이어서) | ~25 | ☐ |
| 3.5 | index.html에 script 2개 추가 (panels, slides-thumbs) | — | `index.html` | — | ☐ |
| 3.6 | index.js에서 3.1~3.4 해당 블록 삭제 후 동작 확인 | — | `index.js` | **-260줄** | ☐ |

---

## Phase 4 — Image generation, Gallery, Presentation, Export

| # | 항목 | index.js 구간 | 새 파일 | 예상 줄 수 | 완료 |
|---|------|----------------|---------|------------|------|
| 4.1 | 이미지 생성·시각화: askThenVisualizeAll, openVisualizeModal, startVisualizeAll, generateAllImages, refineImage | **1635~1734** | `js/features/images-crop.js` | ~100 | ☐ |
| 4.2 | 갤러리: renderGallery, downloadGalleryImage | **1735~1760** | `js/features/images-crop.js` (이어서) | ~28 | ☐ |
| 4.3 | 디자인 패널 헤더·Sources: updatePresLeftLabel (1765~1780) | **1765~1780** | `js/features/slides-thumbs.js` 또는 design-render | ~18 | ☐ |
| 4.4 | 발표 모드: presNav, presRender, changePresZoom, fitPresZoom, changePresFontScale, togglePresNotes, exitPresentation, updatePresLeftLabel 등 | **1781~1945** | `js/features/presentation.js` | ~165 | ☐ |
| 4.5 | 펜 도구: setPenTool, setPenColor, pen mousedown/move/up, erase 등 | **1946~2031** | `js/features/presentation.js` (이어서) | ~88 | ☐ |
| 4.6 | PPTX: stripHtmlForExport, stripBlocksToPlainText, exportPPT | **2032~2175** | `js/features/export-pptx.js` | ~145 | ☐ |
| 4.7 | Clear All: clearAll | **2176~2199** | `js/features/export-pptx.js` (이어서) | ~25 | ☐ |
| 4.8 | index.html에 script 3개 추가 (images-crop, presentation, export-pptx) | — | `index.html` | — | ☐ |
| 4.9 | index.js에서 4.1~4.7 해당 블록 삭제 후 동작 확인 | — | `index.js` | **-569줄** | ☐ |

---

## Phase 5 — PDF Preview & Image Upload & Crop

| # | 항목 | index.js 구간 | 새 파일 | 예상 줄 수 | 완료 |
|---|------|----------------|---------|------------|------|
| 5.1 | PDF 미리보기: 패널 열기/닫기, pdfNavPage, pdfZoom, extractCurrentPageText, 키보드 네비 | **2204~2407** | `js/features/pdf-preview.js` | ~205 | ☐ |
| 5.2 | 이미지 모달·파일 읽기: openImageModal, setupCropEvents, 이미지 파일 로드 시 crop UI 표시 | **2408~2528** | `js/features/images-crop.js` (이어서) | ~120 | ☐ |
| 5.3 | 크롭 엔진: drawCropCanvas, drawCropOverlay, attachCropEvents, 비율 버튼, 적용/취소, applyCrop, aiEditImage 등 | **2529~2832** | `js/features/images-crop.js` (이어서) | ~305 | ☐ |
| 5.4 | 크롭 이후 블록 (2833~2994): setupCropEvents 상세, 리사이즈 핸들 등 | **2833~3125** | `js/features/images-crop.js` (이어서) | ~295 | ☐ |
| 5.5 | index.html에 script 1개 추가 (pdf-preview) | — | `index.html` | — | ☐ |
| 5.6 | index.js에서 5.1~5.4 해당 블록 삭제 후 동작 확인 | — | `index.js` | **-925줄** | ☐ |

---

## Phase 6 — Design panel & renderSlides (가장 큰 블록)

| # | 항목 | index.js 구간 | 새 파일 | 예상 줄 수 | 완료 |
|---|------|----------------|---------|------------|------|
| 6.1 | updateDesignPanel 전체 (디자인 패널 HTML, 이미지 버튼, 갤러리 연동) | **3400~3514** | `js/features/design-render.js` | ~115 | ☐ |
| 6.2 | renderSlides 전체 (슬라이드 래퍼, 제목, 불릿, bullet-text, showBulletEditor, hideBulletEditor, wrapSelectionWith, extra text, 이미지 영역, 여백 뱃지) | **3515~4221** | `js/features/design-render.js` (이어서) | ~710 | ☐ |
| 6.3 | 3126~3399 구간: 마크다운/YouTube 헬퍼 중 design에 필요한 부분만 design-render로, 나머지는 markdown-editor로 | **3126~3399** | 분리 후 design-render / markdown-editor | ~275 | ☐ |
| 6.4 | index.html에 script 1개 추가 (design-render) | — | `index.html` | — | ☐ |
| 6.5 | index.js에서 6.1~6.3 해당 블록 삭제 후 동작 확인 | — | `index.js` | **-1100줄** | ☐ |

---

## Phase 7 — Markdown editor & YouTube & AI popups

| # | 항목 | index.js 구간 | 새 파일 | 예상 줄 수 | 완료 |
|---|------|----------------|---------|------------|------|
| 7.1 | 마크다운·파싱: markdownToHtml, parseMdFull (코드블록, YouTube, 헤딩, 리스트 등), mdApplyToSlide, mdLoadFromSlide | **4222~4260 + 4261~4510** | `js/features/markdown-editor.js` | ~350 | ☐ |
| 7.2 | MD 에디터 UI: mdUpdatePreview, mdUpdatePageIndicators, calcSlideWhitespacePx, updateWhitespaceBadges, YouTube normalize/extract/buildYoutubeEmbedHtml, updateYoutubePreview, previewYoutube, insertYoutubeFromModal | **4511~4787** | `js/features/markdown-editor.js` (이어서) | ~280 | ☐ |
| 7.3 | AI 이미지·PDF 팝업: openAiImageWindow (팝업 HTML 문자열), applyAiImageFromPopup, openPdfNewWindow | **4600~4760** | `js/features/ai-popups.js` | ~165 | ☐ |
| 7.4 | 리사이즈 패널: startResize, doResize, stopResize (index.js에 유지 가능) | **4762~4786** | index.js 유지 또는 helpers | ~25 | ☐ |
| 7.5 | index.html에 script 2개 추가 (markdown-editor, ai-popups) | — | `index.html` | — | ☐ |
| 7.6 | index.js에서 7.1~7.3 해당 블록 삭제 후 동작 확인 | — | `index.js` | **-870줄** | ☐ |

---

## Phase 8 — index.js 최종 정리

| # | 항목 | 내용 | 완료 |
|---|------|------|------|
| 8.1 | DOMContentLoaded | loadAiImgHistory, initApiKey, renderLeftPanel, renderRefsPanel, renderThumbs, renderSlides, initMdSplitter, mdUpdatePageIndicators, updateWhitespaceBadges | ☐ |
| 8.2 | 자동저장 복구 토스트 | idbGet 후 복구/무시 버튼 UI, restoreAutosave 호출 | ☐ |
| 8.3 | setInterval 자동저장 | _autosaveDirty 시 30초마다 autoSaveNow(true) | ☐ |
| 8.4 | 훅 | renderSlides, renderLeftPanel 래핑하여 _markDirty 호출 | ☐ |
| 8.5 | 이벤트 리스너 | updateSlideBullet, hideBulletEditor 중복 제거 후 한 곳만 유지 | ☐ |
| 8.6 | 이벤트 리스너 | textarea 자동 확장, Enter 시 새 불릿, Ctrl+9/0, Ctrl+←/→, Ctrl+B/Ctrl+I | ☐ |
| 8.7 | 기타 | Resize 패널(또는 helpers로 이전), Cropper 훅, generateImageFromPrompt 등 남은 스크립트만 유지 | ☐ |
| 8.8 | 줄 수 확인 | `index.js` 총 줄 수 **1,500줄 미만** 확인 | ☐ |

---

## 실제 줄 수 목표 요약

| Phase | index.js에서 제거할 줄 수 (대략) |
|-------|----------------------------------|
| 1 | 665 |
| 2 | 710 |
| 3 | 260 |
| 4 | 569 |
| 5 | 925 |
| 6 | 1,100 |
| 7 | 870 |
| **합계** | **~4,999** |

분리 후 **index.js**에는 진입점·이벤트 훅·DOMContentLoaded·자동저장 복구·필수 리스너만 남기면 **약 400~1,500줄**로 유지 가능합니다.

---

## 주의사항

- **전역 노출**: `onclick="함수명()"` 사용 함수는 각 모듈에서 `function 함수명()` 또는 `window.함수명 = 함수명`으로 전역 유지.
- **의존 순서**: state → helpers → api-keys → storage → references → gemini-file → panels → slides-thumbs → images-crop → presentation → export-pptx → pdf-preview → design-render → markdown-editor → ai-popups → index.js 순으로 로드.
- **테스트**: 각 Phase 완료 후 슬라이드 생성·편집·발표·PPTX 내보내기·PDF 미리보기·크롭·MD 적용·참고문헌·API 키 동작을 한 번씩 확인할 것.

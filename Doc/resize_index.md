# index.js 800줄 이하 축소 플랜

**목표:** `index.js`를 **800줄 이하**로 줄인다.  
**현재:** 약 **5,277줄** → **약 4,480줄**을 별도 모듈로 이전해야 함.

---

## 1. 원칙

- **index.js에 남길 것:** 앱 부트스트랩, DOMContentLoaded 초기화, 전역 이벤트 리스너(모듈 함수 호출), HTML `onclick`에서 호출되는 함수의 **얇은 스텁**만 유지.
- **이전할 것:** 기능 단위별로 `js/` 하위 모듈로 분리하고, 각 모듈은 필요 시 `window.함수명 = 함수`로 전역 노출해 기존 `onclick`/이벤트와 호환.
- **로드 순서:** `index.html`에서 `state.js` → `helpers.js` → `api-keys.js` → `storage.js` → `references.js` 등 기존 코어 다음에, **새 모듈**을 알파벳/역할 순으로 추가하고, **맨 마지막에 `index.js`** 로드.

---

## 2. 모듈별 개입 계획 (추출 대상·라인·파일)

아래는 **index.js 기준 1-based 라인 번호**로 구간을 제시한다.  
각 구간을 해당 새 파일로 **잘라서 옮기고**, index.js에는 해당 블록을 제거한 뒤 필요하면 한 줄 스텁만 둔다.

| # | 새 파일 경로 | 추출 대상 요약 | 대략 라인 범위 | 예상 줄수 |
|---|--------------|----------------|----------------|-----------|
| 1 | `js/upload/file-upload.js` | PDF worker, 파일 업로드, 텍스트 붙여넣기, 참고문헌 섹션 추출 | 166~260, 263~360 | ~200 |
| 2 | `js/features/refs-viewer.js` | 참고문헌 전용 뷰어(REF EXP), getRawTextWithReferences, resetTranslationCache, saveContent | 361~435 | ~80 |
| 3 | `js/ui/zoom-pres.js` | 슬라이드/발표 줌·폰트 스케일, openExternalPresentation, escH, applyZoom, chZoom, fitZoom | 476~698 | ~225 |
| 4 | `js/ui/left-panel.js` | renderLeftPanel 전체 | 709~804 | ~96 |
| 5 | `js/ui/viewers.js` | setSlideStyle, updateHeaderSlideMode, setWritingStyle, promoteSectionHeadings, buildViewerContentWithPages, getTextViewerWindowHtml, getTranslationViewerWindowHtml, openTranslationViewer, openKoreanViewWindow, openFullTextWindow, openSummaryWindow | 805~1180 | ~380 |
| 6 | `js/ui/slides-core.js` | afterSlidesCreated, renderThumbs, selectSlide, selectSlideLayer, moveLayerUp/Down, updateSlideTitle/Bullet/Notes, removeSlideImage(1/2), pushSlideUndoState, slideUndo, slideRedo, openImageModal2, deleteSlide, addNewSlide, addSlideAfter, toggleAddDropdown | 1181~1390 | ~210 |
| 7 | `js/ui/visualize.js` | askThenVisualizeAll, openVisualizeModal, startVisualizeAll, generateAllImages, refineImage, renderGallery, downloadGalleryImage, fetchSources | 1390~1535 | ~145 |
| 8 | `js/ui/presentation.js` | updatePresLeftLabel, startPresentation, startPresentationFromCurrent, setupPresCanvasResize, resizePresCanvas, exitPresentation, handlePresKey, presNav, changePresZoom, applyPresZoom, fitPresZoom, togglePresNotes, renderPresSlide | 1536~1705 | ~170 |
| 9 | `js/ui/pen-tools.js` | setPenTool, updatePenToolUI, setPenColor, setupPenEventsOnCanvas, getPresCanvasPos, penDown, penMove, clearPresCanvas | 1706~1787 | ~82 |
| 10 | `js/export/pptx.js` | renderTextForExport, renderMultilineForExport, openExportModal, openSummaryOptionsModal, loadSummaryFromHistory, confirmSummaryOptions, exportPPT | 1788~1976 | ~190 |
| 11 | `js/ui/clear-all.js` | clearAll | 1978~2005 | ~28 |
| 12 | `js/ui/pdf-preview.js` | PDF 미리보기 패널 전체 (openPdfPreview, closePdfPreview, loadPdfPreview, pdfRenderPage, pdfRenderAllThumbs, 관련 변수·헬퍼) | 2008~2212 | ~205 |
| 13 | `js/ui/crop-modal.js` | 이미지 크롭/모달 관련 IIFE 및 openImageModal 후킹 (주석에 있는 _origOpenModal_crop 활용 구간) | 84~91, 2214~2500 부근 | 별도 grep 후 결정 |
| 14 | `js/ui/design-panel.js` | updateDesignPanel, renderExtraTextInSlide, renderSlides 호출 이후 디자인 패널 갱신, 갤러리/이미지 히스토리 UI | 2502~2640, 2706~2790, 3213~3390 | ~350 |
| 15 | `js/slides/render-slides.js` | renderSlides, applyYoutubeResizedStyles 및 슬라이드 카드 HTML 생성 전체 | 3215~3340 | ~125 |
| 16 | `js/editor/markdown.js` | extractYoutubeId, buildYoutubeEmbedHtml, buildResizeMoveHandlesHtml, buildSlideImageWrapStyle, markdownToHtml, parseMdFull, inlineMd (및 관련 유틸) | 2862~2935 | ~75 |
| 17 | `js/editor/extra-text.js` | _extraTextColors, initExtraText, toggleExtraTextEditor, renderExtraText, 기타 슬라이드 extra text | 2940~3020 부근 | grep 후 결정 |
| 18 | `js/ui/resize-handlers.js` | YouTube/이미지/extra 영역/불릿 영역 리사이즈·이동 IIFE (document.addEventListener('mousedown', ...) 블록들) | 2640~2700, 3340~3500, 3502~3850 | ~400 |
| 19 | `js/editor/md-editor.js` | MD 에디터: mdApplyToSlide, mdLiveApply, mdFmt, mdAdjustFontSize, openLinkModal, insertLinkFromModal, openYoutubeModal, updateYoutubePreview, insertYoutubeFromModal, aiEditImage, mdUpdatePreview, mdEditorUndo/Redo, pushMdEditorUndoState, mdEditorMoveLineUp/Down, mdEditorDupLine, mdEditorDeleteLine, initMdSplitter, mdUpdatePageIndicators 등 | 3852~4040, 4174~4355, 4572~4586, 4818~4892 | ~450 |
| 20 | `js/features/ref-export.js` | exportRefsToLocalFile, exportSavedListToFile, importRefsFromFile | 2808~2854 | ~47 |
| 21 | `js/features/ai-image-history.js` | _aiImgHistory, addToAiImgHistory, saveAiImgHistory, loadAiImgHistory, clearAiImgHistory, _buildHistoryHTML, renderAiImgHistory, renderAiImgHistoryInner, insertHistoryImage, deleteHistoryImage, openImageFullscreen, generateSingleImage, applyHistoryImageNow, insertInlineAiImage, downloadGenImage | 2640~2805 부근 (정확한 구간은 grep) | ~165 |
| 22 | `js/ui/events-global.js` | keydown(F5 발표), input(bullet/slide-title autoResize), keydown(Enter/Shift+Enter), keydown(Ctrl+B/I), keydown(MD 에디터 undo/redo/줄이동), paste/cut(MD), DOMContentLoaded(switchRightTab), mdpro postMessage | 4676~4715, 4735~4810, 4950~4968, 4976~5015, 5017~5025, 5134~5164 | ~200 |
| 23 | `js/ui/autosave-hooks.js` | 자동저장 복구 토스트, setInterval autosave, _markDirty 후킹(_origRenderSlidesFn, _origRenderLeftPanelFn) | 4588~4648 | ~61 |
| 24 | `js/api/gemini-inline.js` | index.js 내 callGemini, generateImage, refineImageAPI (현재 index 95~164) — 단, 이미 js/api/ai.js·image.js가 있으면 통합 검토 | 94~164 | ~72 |
| 25 | `js/ui/summary-options.js` | openSummaryOptionsModal, confirmSummaryOptions, loadSummaryFromHistory (일부는 export에 포함 가능) | export와 중복 제거 후 한 곳에만 |
| 26 | `js/ui/v3-fixes.js` | updateSlideBullet(slideIndex, bulletIndex, value), hideBulletEditor, autoResizeTextarea, wrapSelectionWith, updateMdSlideIndicator 등 V3.x 패치 함수 | 4654~4674, 4692~4716, 4969~4974 | ~80 |
| 27 | `js/ui/splitter.js` | initMdSplitter, 스플리터 드래그 로직 | 4893~4912 부근 | ~25 |
| 28 | 남김 (index.js) | Scholar AI 검색·소스 (17~77), getImageApiKey 스텁 (692~700), handleDragOver/Leave/Drop (702~707), renderLeftPanel 스텁(모듈 호출), getTextViewerWindowHtml 등 뷰어 스텁, DOMContentLoaded 부트스트랩, F5/Shift+F5, Cropper 훅, generateImageFromPrompt, mdpro postMessage 래퍼 | — | **목표 ≤800** |

---

## 3. index.html 스크립트 로드 순서 (수정안)

기존 유지 후, 아래 순서로 새 모듈을 삽입한다. (index.js는 **맨 마지막** 직전에 두고, 그 다음에 설정/기타 유틸만 올 수 있게 한다.)

```html
<script src="js/core/state.js"></script>
<script src="js/core/helpers.js"></script>
<script src="js/core/api-keys.js"></script>
<script src="js/core/prompt-store.js"></script>
<script src="js/core/storage.js"></script>
<script src="js/features/references.js"></script>
<!-- 새로 추가 (기능·API) -->
<script src="js/api/gemini-inline.js"></script>
<script src="js/upload/file-upload.js"></script>
<script src="js/features/refs-viewer.js"></script>
<script src="js/features/ref-export.js"></script>
<script src="js/features/ai-image-history.js"></script>
<!-- 에디터·마크다운 -->
<script src="js/editor/markdown.js"></script>
<script src="js/editor/extra-text.js"></script>
<script src="js/editor/md-editor.js"></script>
<!-- 슬라이드 렌더 -->
<script src="js/slides/render-slides.js"></script>
<!-- UI 패널·모달 -->
<script src="js/ui/zoom-pres.js"></script>
<script src="js/ui/left-panel.js"></script>
<script src="js/ui/viewers.js"></script>
<script src="js/ui/slides-core.js"></script>
<script src="js/ui/visualize.js"></script>
<script src="js/ui/presentation.js"></script>
<script src="js/ui/pen-tools.js"></script>
<script src="js/ui/pdf-preview.js"></script>
<script src="js/ui/design-panel.js"></script>
<script src="js/ui/resize-handlers.js"></script>
<script src="js/ui/clear-all.js"></script>
<script src="js/ui/v3-fixes.js"></script>
<script src="js/ui/splitter.js"></script>
<script src="js/ui/autosave-hooks.js"></script>
<script src="js/ui/events-global.js"></script>
<!-- 내보내기 -->
<script src="js/export/pptx.js"></script>
<!-- 메인 (부트스트랩만 유지) -->
<script src="index.js"></script>
<script src="js/translate/translate.js"></script>
<script src="js/prompts/prompt_summary.js"></script>
<script src="js/slide-gen/slide-gen.js"></script>
<script src="js/ui/settings-window.js"></script>
```

---

## 4. 실행용 체크리스트

아래 순서대로 진행하면, 한 번에 하나씩 검증하면서 줄일 수 있다.

### Phase A: 준비
- [x] **A1.** `index.js` 전체 백업 (복사본 저장). → `index.js.backup` 생성됨
- [x] **A2.** 현재 `index.js` 줄 수 기록: **5,254줄** (2025-03-09 기준)
- [x] **A3.** `js/upload/`, `js/features/`, `js/ui/`, `js/editor/`, `js/slides/`, `js/export/` 디렉터리 존재 여부 확인, 없으면 생성. → `js/upload`, `js/editor`, `js/slides`, `js/export` 새로 생성됨 (`js/features`, `js/ui`는 기존 존재)

### Phase B: API·업로드·참고문헌 뷰어 (1~3번)
- [x] **B1.** `js/upload/file-upload.js` 생성: ensurePDFWorker, getPageTextWithLineBreaks, normalizeSentenceLineBreaks, handleFileUpload, loadFromTextInput, enableMainBtns, extractReferencesSectionFromRawText, getReferencesOnlyText, getReferencesExpCount, openRefExpWindow (라인 166~360 부근) 이동. 필요한 전역 참조 주석으로 명시.
- [x] **B2.** `js/features/refs-viewer.js` 생성: getRawTextWithReferences, resetTranslationCache, saveContent, _bgJobStart/Tick/End/_bgBarUpdate/_cancelBgJob (361~475 부근) 이동.
- [x] **B3.** index.js에서 B1·B2에 해당하는 블록 삭제 후, 해당 함수를 모듈에서 호출하도록 스텁만 남기기 (예: `function handleFileUpload(e){ return window.handleFileUpload(e); }` 또는 모듈이 window에 할당하면 스텁 불필요).
- [x] **B4.** index.html에 `<script src="js/upload/file-upload.js"></script>`, `js/features/refs-viewer.js` 추가 (references.js 다음).
- [ ] **B5.** 브라우저에서 파일 업로드·참고문헌 추출·REF EXP 창 동작 확인.

### Phase C: 줌·왼쪽 패널·뷰어 (4~5번)
- [ ] **C1.** `js/ui/zoom-pres.js` 생성: changeSlideZoom, applySlideZoom, supportsZoom, changeSlideFontScale, applySlideFontScale, changePresFontScale, openExternalPresentation, escH, applyZoom, chZoom, chFontScale, fitZoom, render, nav, toggleNotes (476~698).
- [ ] **C2.** `js/ui/left-panel.js` 생성: renderLeftPanel 전체 (709~804).
- [ ] **C3.** `js/ui/viewers.js` 생성: setSlideStyle, updateHeaderSlideMode, setWritingStyle, promoteSectionHeadings, buildViewerContentWithPages, getTextViewerWindowHtml, getTranslationViewerWindowHtml, openTranslationViewer, openKoreanViewWindow, openFullTextWindow, openSummaryWindow (805~1180).
- [ ] **C4.** index.js에서 C1~C3 블록 제거, 스텁 또는 window 위임만 유지.
- [ ] **C5.** index.html에 C1~C3 스크립트 추가.
- [ ] **C6.** 왼쪽 패널·원문/요약/참고문헌 탭·새 창 뷰어·줌/폰트 스케일 동작 확인.

### Phase D: 슬라이드 코어·비주얼라이즈·발표·펜 (6~9번)
- [ ] **D1.** `js/ui/slides-core.js` 생성: afterSlidesCreated, renderThumbs, selectSlide, selectSlideLayer, moveLayerUp/Down, updateSlideTitle/Bullet/Notes, removeSlideImage(1/2), pushSlideUndoState, slideUndo, slideRedo, openImageModal2, deleteSlide, addNewSlide, addSlideAfter, toggleAddDropdown (1181~1390).
- [ ] **D2.** `js/ui/visualize.js` 생성: askThenVisualizeAll, openVisualizeModal, startVisualizeAll, generateAllImages, refineImage, renderGallery, downloadGalleryImage, fetchSources (1390~1535).
- [ ] **D3.** `js/ui/presentation.js` 생성: updatePresLeftLabel, startPresentation, startPresentationFromCurrent, setupPresCanvasResize, resizePresCanvas, exitPresentation, handlePresKey, presNav, changePresZoom, applyPresZoom, fitPresZoom, togglePresNotes, renderPresSlide (1536~1705).
- [ ] **D4.** `js/ui/pen-tools.js` 생성: setPenTool, updatePenToolUI, setPenColor, setupPenEventsOnCanvas, getPresCanvasPos, penDown, penMove, clearPresCanvas (1706~1787).
- [ ] **D5.** index.js에서 D1~D4 블록 제거, index.html에 스크립트 4개 추가.
- [ ] **D6.** 슬라이드 추가/삭제/선택, 썸네일, 이미지 시각화, 발표 모드, 펜 도구 동작 확인.

### Phase E: 내보내기·초기화·PDF 미리보기 (10~12번)
- [ ] **E1.** `js/export/pptx.js` 생성: renderTextForExport, renderMultilineForExport, openExportModal, openSummaryOptionsModal, loadSummaryFromHistory, confirmSummaryOptions, exportPPT (1788~1976).
- [ ] **E2.** `js/ui/clear-all.js` 생성: clearAll (1978~2005).
- [ ] **E3.** `js/ui/pdf-preview.js` 생성: _pdfDoc 등 변수, openPdfPreview, closePdfPreview, togglePdfPreview, loadPdfPreview, pdfRenderPage, pdfRenderAllThumbs 등 (2008~2212).
- [ ] **E4.** index.js에서 E1~E3 제거, index.html에 스크립트 추가.
- [ ] **E5.** PPTX 내보내기, 전체 초기화, PDF 미리보기 열기/페이지 넘기기 확인.

### Phase F: 디자인 패널·슬라이드 렌더·마크다운·리사이즈 (13~18번)
- [ ] **F1.** `js/ui/design-panel.js` 생성: updateDesignPanel, renderExtraTextInSlide 및 갤러리/이미지 히스토리 UI 관련 (2502~2640, 2706~2790, 3213~3390).
- [ ] **F2.** `js/slides/render-slides.js` 생성: renderSlides, applyYoutubeResizedStyles (3215~3340).
- [ ] **F3.** `js/editor/markdown.js` 생성: extractYoutubeId, buildYoutubeEmbedHtml, buildResizeMoveHandlesHtml, buildSlideImageWrapStyle, markdownToHtml, parseMdFull, inlineMd (2862~2935).
- [ ] **F4.** `js/editor/extra-text.js` 생성: _extraTextColors, initExtraText, toggleExtraTextEditor, renderExtraText 등 (2940~3020).
- [ ] **F5.** `js/ui/resize-handlers.js` 생성: YouTube/이미지/extra/불릿 리사이즈·이동 IIFE (3502~3850).
- [ ] **F6.** index.js에서 F1~F5 블록 제거, index.html에 스크립트 추가.
- [ ] **F7.** 슬라이드 편집·디자인 패널·이미지/유튜브 리사이즈·마크다운 렌더 확인.

### Phase G: MD 에디터·참고문헌 내보내기·이벤트·부트스트랩 (19~28번)
- [ ] **G1.** `js/editor/md-editor.js` 생성: mdApplyToSlide, mdLiveApply, mdFmt, openLinkModal, insertLinkFromModal, openYoutubeModal, updateYoutubePreview, insertYoutubeFromModal, aiEditImage, mdUpdatePreview, mdEditorUndo/Redo, pushMdEditorUndoState, mdEditorMoveLineUp/Down, mdEditorDupLine, mdEditorDeleteLine, initMdSplitter, mdUpdatePageIndicators 등 (3852~4040, 4174~4355, 4818~4892).
- [ ] **G2.** `js/features/ref-export.js` 생성: exportRefsToLocalFile, exportSavedListToFile, importRefsFromFile (2808~2854).
- [ ] **G3.** `js/features/ai-image-history.js` 생성: _aiImgHistory, addToAiImgHistory, saveAiImgHistory, loadAiImgHistory, clearAiImgHistory, _buildHistoryHTML, renderAiImgHistory, renderAiImgHistoryInner, insertHistoryImage, deleteHistoryImage, openImageFullscreen, generateSingleImage, applyHistoryImageNow, insertInlineAiImage, downloadGenImage (2640~2805).
- [ ] **G4.** `js/ui/events-global.js` 생성: input/bullet autoResize, keydown Enter·Ctrl+B/I·MD 에디터, paste/cut, DOMContentLoaded(switchRightTab), mdpro postMessage (4676~4810, 4950~5025, 5134~5164).
- [ ] **G5.** `js/ui/autosave-hooks.js` 생성: 자동저장 복구 토스트, setInterval, _markDirty 후킹 (4588~4648).
- [ ] **G6.** `js/ui/v3-fixes.js` 생성: updateSlideBullet, hideBulletEditor, autoResizeTextarea, wrapSelectionWith, updateMdSlideIndicator 등 (4654~4674, 4692~4974).
- [ ] **G7.** `js/ui/splitter.js` 생성: initMdSplitter 스플리터 드래그 (4893~4912).
- [ ] **G8.** index.js에서 G1~G7 해당 블록 제거.
- [ ] **G9.** index.js에 남은 부분만 정리: Scholar AI·소스·getImageApiKey·handleDrag·DOMContentLoaded 부트스트랩·F5·Cropper·generateImageFromPrompt·mdpro 래퍼 등. **최종 줄 수 ≤ 800 확인.**

### Phase H: 검증 및 정리
- [ ] **H1.** 전체 플로우: 파일 업로드 → 요약 → 슬라이드 생성 → 편집 → 이미지/유튜브 → 발표 → PPTX 내보내기.
- [ ] **H2.** 콘솔 에러 없음 확인.
- [ ] **H3.** `index.js` 줄 수 재측정: **800줄 이하** 여부 확인.
- [ ] **H4.** Doc/resize_index.md 이 체크리스트에 맞게 실제 수행한 라인 번호·파일명을 주석으로 업데이트 (선택).

---

## 5. 주의사항 (실시 시)

1. **전역 의존성:** 각 모듈은 `rawText`, `slides`, `activeSlideIndex`, `ReferenceStore`, `showToast`, `escapeHtml`, `openModal`, `closeModal`, `getApiKey`, `idbGet`, `idbPut` 등이 이미 전역에 있다고 가정한다. state.js·helpers.js·storage.js가 먼저 로드되므로 순서를 바꾸지 말 것.
2. **onclick 호환:** HTML에 `onclick="renderLeftPanel()"` 등으로 되어 있으면, 해당 함수는 반드시 `window.renderLeftPanel`에 존재해야 한다. 모듈 파일 끝에 `window.renderLeftPanel = renderLeftPanel;` 형태로 노출할 것.
3. **중복 제거:** 한 함수가 두 모듈에 있지 않도록, 이동 시 해당 블록을 index.js에서 완전히 삭제하고 한 곳에서만 정의할 것.
4. **점진적 이전:** 한 Phase가 끝날 때마다 저장 후 동작을 확인한 다음 다음 Phase로 진행하는 것을 권장한다.

---

## 6. 목표 달성 요약

| 항목 | 목표 |
|------|------|
| index.js 최종 줄 수 | ≤ 800 |
| 새로 만들 모듈 수 | 약 20~25개 |
| index.html script 추가 | 위 §3 순서대로 |
| 검증 | Phase H 체크리스트 통과 |

이 문서를 따라 단계별로 실행하면 index.js를 800줄 이하로 줄이면서도 기존 동작을 유지할 수 있다.

---

## 7. index.js 최종 구성 (≤800줄 목표)

실시 후 **index.js에만 남겨둘 내용**은 다음으로 한정한다.

| 구간 | 내용 | 예상 줄 수 |
|------|------|------------|
| 헤더 | V3.1 FIX 주석, 기존 모듈로 이전된 함수 목록 주석 | ~15 |
| Scholar AI·Sources | searchScholarAI, scholarAddRef, scholarSaveList, renderSources (또는 scholar.js로 완전 이전 후 스텁만) | ~65 |
| Gemini·이미지 API | callGemini, generateImage, refineImageAPI — 또는 js/api/gemini-inline.js 로 이전 후 제거 | 0 또는 ~72 |
| getImageApiKey 스텁 | getImageApiKey (api-keys 연동) | ~10 |
| 드래그 앤 드롭 | handleDragOver, handleDragLeave, handleDrop | ~8 |
| renderLeftPanel 스텁 | 모듈 위임용 한 줄 | ~5 |
| DOMContentLoaded 부트스트랩 | loadAiImgHistory, initApiKey, renderLeftPanel 등 호출 | ~15 |
| F5 / Shift+F5 | keydown 리스너 (발표 시작) | ~12 |
| Cropper 훅 | click 리스너 (activeCropper) | ~8 |
| generateImageFromPrompt | V3.2 이미지 생성 (또는 모듈로 이전) | 0 또는 ~80 |
| mdpro postMessage | postMessage 수신·ready 전송 IIFE | ~50 |
| 기타 전역 리스너·스텁 | updateMdSlideIndicator 등 | ~30 |

**합계:** 약 **300~400줄** (여유 있게 800 이하). 나머지 모든 로직은 §2의 모듈로 이전한다.

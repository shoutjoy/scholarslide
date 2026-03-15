/**
 * ScholarSlide — 파일 업로드, 텍스트 로드, 참고문헌 섹션 추출, REF EXP 창
 * 전역 의존: rawText, fileName, showLoading, setProgress, hideLoading, showToast, renderLeftPanel,
 * loadPdfPreview, ReferenceStore, formatCitation, buildViewerContentWithPages, getTextViewerWindowHtml, escapeHtml
 */
(function () {
  'use strict';

  function ensurePDFWorker() {
    if (window.pdfjsLib && !window.pdfjsLib.GlobalWorkerOptions.workerSrc)
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/' + window.pdfjsLib.version + '/pdf.worker.min.js';
  }

  function getPageTextWithLineBreaks(content) {
    var items = content.items || [];
    if (!items.length) return '';
    var withPos = items.map(function (it) {
      var t = it.transform;
      var x = t && t[4] != null ? t[4] : 0;
      var y = t && t[5] != null ? t[5] : 0;
      return { str: it.str || '', x: x, y: y };
    });
    withPos.sort(function (a, b) {
      var yA = a.y, yB = b.y;
      var yTolerance = 4;
      if (Math.abs(yA - yB) > yTolerance) return yB - yA;
      return a.x - b.x;
    });
    var lines = [];
    var lastY = null;
    var yTolerance = 5;
    for (var i = 0; i < withPos.length; i++) {
      var it = withPos[i];
      var y = it.y;
      if (lastY !== null && Math.abs(y - lastY) > yTolerance) lines.push('');
      lastY = y;
      var idx = lines.length - 1;
      if (idx >= 0) lines[idx] = (lines[idx] ? lines[idx] + ' ' : '') + it.str;
      else lines.push(it.str);
    }
    return lines.join('\n');
  }

  function normalizeSentenceLineBreaks(text) {
    if (!text || !text.trim()) return text;
    return text
      .replace(/([.!?])\s+([A-Z가-힣])/g, '$1\n\n$2')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  async function handleFileUpload(e) {
    var file = e.target.files[0];
    if (!file) return;
    showLoading('파일에서 텍스트 추출 중...', file.name, 20);
    try {
      ensurePDFWorker();
      var text = '';
      if (file.type === 'application/pdf') {
        var buf = await file.arrayBuffer();
        window._pdfArrayBuffer = buf.slice(0);
        if (typeof loadPdfPreview === 'function') loadPdfPreview(buf.slice(0), file.name);
        var pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
        for (var i = 1; i <= pdf.numPages; i++) {
          var page = await pdf.getPage(i);
          var content = await page.getTextContent();
          var pageText = getPageTextWithLineBreaks(content);
          text += '\n\n--- ' + i + '페이지 ---\n\n' + pageText;
          setProgress(Math.round(20 + (i / pdf.numPages) * 50));
        }
        text = text.replace(/^\n+/, '').trim();
      } else if (file.name.endsWith('.docx')) {
        var bufDoc = await file.arrayBuffer();
        var result = await window.mammoth.extractRawText({ arrayBuffer: bufDoc });
        text = result.value || '';
        if (text && !text.includes('\n\n')) text = normalizeSentenceLineBreaks(text);
        text = '--- 1페이지 ---\n\n' + text.trim();
      } else {
        text = await file.text();
        if (text && !text.trim().includes('\n') && text.length > 80) text = normalizeSentenceLineBreaks(text);
        if (text) text = '--- 1페이지 ---\n\n' + text.trim();
      }
      if (typeof window.addFileToSlot === 'function') {
        window.addFileToSlot({ fileName: file.name, rawText: text, checked: true });
      } else {
        if (typeof rawText !== 'undefined') rawText = text;
        window.rawText = text;
        if (typeof window.setRawText === 'function') window.setRawText(text);
        if (typeof window.setFileName === 'function') window.setFileName(file.name);
      }
      if (typeof window.resetTranslationCache === 'function') window.resetTranslationCache();
      showToast('✅ 파일 로드 완료 (' + (text.length / 1000).toFixed(1) + 'k 글자)');
      renderLeftPanel();
      enableMainBtns();
      if (text.length > 500 && typeof window.extractReferencesWithAI === 'function') {
        setTimeout(function () { window.extractReferencesWithAI(null, { autoApply: true }); }, 300);
      }
    } catch (err) {
      console.error(err);
      showToast('❌ 파일 처리 실패: ' + err.message);
    } finally {
      hideLoading();
      if (e.target) e.target.value = '';
    }
  }

  function loadFromTextInput() {
    var inp = document.getElementById('text-paste-input');
    var val = inp && inp.value ? inp.value.trim() : '';
    if (!val) { showToast('⚠️ 텍스트를 입력하세요'); return; }
    if (typeof window.addFileToSlot === 'function') {
      window.addFileToSlot({ fileName: '직접입력.txt', rawText: val, checked: true });
    } else {
      if (typeof rawText !== 'undefined') rawText = val;
      window.rawText = val;
      if (typeof window.setRawText === 'function') window.setRawText(val);
      if (typeof window.setFileName === 'function') window.setFileName('직접입력.txt');
    }
    if (typeof window.resetTranslationCache === 'function') window.resetTranslationCache();
    showToast('✅ 텍스트 로드 완료');
    renderLeftPanel();
    enableMainBtns();
    if (val.length > 500 && typeof window.extractReferencesWithAI === 'function') {
      setTimeout(function () { window.extractReferencesWithAI(null, { autoApply: true }); }, 300);
    }
  }

  function enableMainBtns() {
    ['save-session-btn'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.disabled = false;
    });
  }

  function extractReferencesSectionFromRawText(sourceText) {
    var raw = (typeof sourceText !== 'undefined' && sourceText != null) ? String(sourceText) : (typeof rawText !== 'undefined' ? rawText : (window.rawText || '')) || '';
    if (!raw.trim()) return { text: '', count: 0, source: 'none' };
    var section = '';
    var blockMarkers = [/---\s*참고문헌\s*---\s*\n?/gi, /---\s*References?\s*---\s*\n?/gi, /---\s*Bibliography\s*---\s*\n?/gi];
    for (var i = 0; i < blockMarkers.length; i++) {
      var m = raw.match(blockMarkers[i]);
      if (m) {
        section = raw.substring(m.index + m[0].length).trim();
        break;
      }
    }
    if (!section) {
      var refSectionHeads = [
        /^\s*References\s*$/im, /^\s*REFERENCES\s*$/m, /^\s*Reference\s*$/im,
        /^\s*참고문헌\s*$/m, /^\s*참고\s*문헌\s*$/m,
        /^\s*Bibliography\s*$/im, /^\s*BIBLIOGRAPHY\s*$/m,
        /^\s*Reference\s+List\s*$/im, /^\s*Works?\s+Cited\s*$/im,
        /^\s*References?\s+and\s+Notes\s*$/im
      ];
      for (var ii = 0; ii < refSectionHeads.length; ii++) {
        var mm = raw.match(refSectionHeads[ii]);
        if (mm) {
          section = raw.substring(mm.index + mm[0].length).trim();
          break;
        }
      }
    }
    if (!section) {
      var lines = raw.split(/\n/);
      var startIdx = -1;
      for (var L = 0; L < lines.length; L++) {
        var line = lines[L];
        var trimmed = line.trim();
        if (/^References?\s*$/i.test(trimmed) || /^참고\s*문헌\s*$/i.test(trimmed) || /^Bibliography\s*$/i.test(trimmed) ||
            /^Reference\s+List\s*$/i.test(trimmed) || /^Works?\s+Cited\s*$/i.test(trimmed)) {
          startIdx = L + 1;
          break;
        }
      }
      if (startIdx >= 0) section = lines.slice(startIdx).join('\n').trim();
    }
    if (!section) {
      var refLine = raw.search(/\n\s*(?:References?|REFERENCES?|참고\s*문헌|Bibliography|BIBLIOGRAPHY)\s*\n/i);
      if (refLine >= 0) {
        var after = raw.substring(refLine + 1);
        section = after.replace(/^\s*(?:References?|REFERENCES?|참고\s*문헌|Bibliography|BIBLIOGRAPHY)\s*\n?/i, '').trim();
      }
    }
    if (!section || section.length < 20) return { text: '', count: 0, source: 'none' };
    var reRefStart = /\n\s*(?=[A-Z][A-Za-z\-',\s&.]{2,120}\(\d{4}[a-z]?\)\s*\.)/g;
    var parts = section.split(reRefStart);
    var entries = [];
    for (var j = 0; j < parts.length; j++) {
      var entry = parts[j].replace(/^\s+|\s+$/g, '');
      if (entry.length < 15) continue;
      entry = entry.replace(/^(?:References?|REFERENCES?|참고\s*문헌|Bibliography|BIBLIOGRAPHY|Reference\s+List)\s*\n?/i, '');
      if (/^References?\s*$/i.test(entry) || /^참고\s*문헌\s*$/i.test(entry) || /^Bibliography\s*$/i.test(entry)) continue;
      if (/\(\d{4}[a-z]?\)\s*\./.test(entry)) entries.push(entry);
    }
    if (entries.length === 0 && section.length > 50 && /\(\d{4}[a-z]?\)/.test(section)) {
      var fallback = section.split(/\n\s*\n+/);
      for (var k = 0; k < fallback.length; k++) {
        var e = fallback[k].trim();
        if (e.length > 20 && /\(\d{4}[a-z]?\)/.test(e)) entries.push(e);
      }
    }
    var text = entries.length ? entries.join('\n\n') : '';
    return { text: text, count: entries.length, source: entries.length ? 'document' : 'none' };
  }

  function getReferencesOnlyText() {
    var r = (typeof window.getRawText === 'function' ? window.getRawText() : (typeof rawText !== 'undefined' ? rawText : window.rawText || '')) || '';
    var extracted = extractReferencesSectionFromRawText(r);
    if (extracted.source === 'document' && extracted.count > 0) return extracted.text;
    if (typeof ReferenceStore === 'undefined' || !ReferenceStore.getAll) return '';
    var refs = ReferenceStore.getAll();
    if (!refs || !refs.length) return '';
    var style = (document.getElementById('citation-style') && document.getElementById('citation-style').value) || 'APA';
    return refs.map(function (ref) {
      return (typeof formatCitation === 'function' ? formatCitation(ref, style) : (ref.authors + ' (' + ref.year + '). ' + ref.title + '.'));
    }).join('\n\n');
  }

  function getReferencesExpCount() {
    var r = (typeof window.getRawText === 'function' ? window.getRawText() : (typeof rawText !== 'undefined' ? rawText : window.rawText || '')) || '';
    var extracted = extractReferencesSectionFromRawText(r);
    if (extracted.source === 'document' && extracted.count > 0)
      return { count: extracted.count, label: '문서에서 추출' };
    var refs = typeof ReferenceStore !== 'undefined' && ReferenceStore.getAll ? ReferenceStore.getAll() : [];
    return { count: refs.length, label: '저장된 참고문헌' };
  }

  function openRefExpWindow() {
    var text = getReferencesOnlyText();
    var expCount = getReferencesExpCount();
    if (!text) { showToast('⚠️ 추출된 참고문헌이 없습니다. 원문에 References 섹션이 있거나 참고문헌 탭에서 추가하세요.'); return; }
    var win = window.open('', '_blank', 'width=900,height=750,scrollbars=yes,resizable=yes');
    if (!win) { showToast('⚠️ 팝업이 차단되었습니다. 팝업 허용 후 다시 시도하세요.'); return; }
    if (typeof window.registerChildWindow === 'function') window.registerChildWindow(win);
    if (typeof window.setViewerContent !== 'function') window.setViewerContent = function (text, type) {
      if (type === 'raw') { window.rawText = text; if (typeof rawText !== 'undefined') rawText = text; }
      else if (type === 'summary') { window.summaryText = text; if (typeof summaryText !== 'undefined') summaryText = text; }
      else if (type === 'refs') return;
      if (typeof renderLeftPanel === 'function') renderLeftPanel();
      if (typeof showToast === 'function') showToast('✅ 현재 상태 저장됨');
    };
    var contentRendered = typeof buildViewerContentWithPages === 'function' ? buildViewerContentWithPages(text) : text;
    var escapedHtml = contentRendered.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$').replace(/<\/script>/gi, '<\\/script>');
    var rawJson = JSON.stringify(text);
    var fn = (typeof window.getFileName === 'function' ? window.getFileName() : (typeof fileName !== 'undefined' ? fileName : window.fileName || '')) || '';
    var esc = typeof escapeHtml === 'function' ? escapeHtml : function (s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
    var title = esc(fn);
    win.document.write(getTextViewerWindowHtml({
      title: title,
      subtitle: '📚 ' + expCount.label + ' (' + expCount.count + '편)',
      pageTitle: '참고문헌 — ' + title,
      contentHtml: escapedHtml,
      rawTextJson: rawJson,
      contentType: 'refs'
    }));
    win.document.close();
  }

  window.ensurePDFWorker = ensurePDFWorker;
  window.getPageTextWithLineBreaks = getPageTextWithLineBreaks;
  window.normalizeSentenceLineBreaks = normalizeSentenceLineBreaks;
  window.handleFileUpload = handleFileUpload;
  window.loadFromTextInput = loadFromTextInput;
  window.enableMainBtns = enableMainBtns;
  window.extractReferencesSectionFromRawText = extractReferencesSectionFromRawText;
  window.getReferencesOnlyText = getReferencesOnlyText;
  window.getReferencesExpCount = getReferencesExpCount;
  window.openRefExpWindow = openRefExpWindow;
})();

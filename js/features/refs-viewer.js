/**
 * ScholarSlide — 원문+참고문헌 텍스트, 번역 캐시 초기화, 저장, 배경 이미지 작업 상태
 * 전역 의존: rawText, summaryText, presentationScript, slides, showToast, renderLeftPanel,
 * ReferenceStore, formatCitation, escapeHtml, showGlobalProgress, hideGlobalProgress
 */
(function () {
  'use strict';

  function getRawTextWithReferences() {
    var t = (typeof window.getRawText === 'function' ? window.getRawText() : (typeof rawText !== 'undefined' ? rawText : '')) || '';
    if (typeof ReferenceStore !== 'undefined' && ReferenceStore.getAll) {
      var refs = ReferenceStore.getAll();
      if (refs && refs.length) {
        var style = (document.getElementById('citation-style') && document.getElementById('citation-style').value) || 'APA';
        t += '\n\n--- 참고문헌 ---\n\n' + refs.map(function (r) {
          return (typeof formatCitation === 'function' ? formatCitation(r, style) : (r.authors + ' (' + r.year + '). ' + r.title + '.'));
        }).join('\n\n');
      }
    }
    return t;
  }

  function resetTranslationCache() {
    if (typeof window !== 'undefined') {
      window._translatedSummary = '';
      window._translatedRaw = '';
    }
    if (typeof renderLeftPanel === 'function') renderLeftPanel();
  }

  function saveContent(type) {
    var content = '';
    var ext = 'txt';
    if (type === 'raw') {
      content = (typeof window.getRawText === 'function' ? window.getRawText() : (typeof rawText !== 'undefined' ? rawText : '')) || '';
      ext = 'txt';
    } else if (type === 'summary') {
      content = (typeof window.getSummaryText === 'function' ? window.getSummaryText() : (typeof summaryText !== 'undefined' ? summaryText : '')) || '';
      ext = 'md';
    } else if (type === 'script') {
      var script = (typeof window.getPresentationScript === 'function' ? window.getPresentationScript() : (typeof presentationScript !== 'undefined' ? presentationScript : [])) || [];
      var sl = (typeof window.getSlides === 'function' ? window.getSlides() : (typeof slides !== 'undefined' ? slides : [])) || [];
      content = script.map(function (s, i) {
        var title = sl[i] && sl[i].title ? sl[i].title : '';
        return '## 슬라이드 ' + (i + 1) + ': ' + title + '\n\n' + s;
      }).join('\n\n---\n\n');
      ext = 'md';
    }
    if (!content) { showToast('⚠️ 저장할 내용이 없습니다'); return; }
    var blob = new Blob([content], { type: 'text/plain' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'scholarslide_' + type + '.' + ext;
    a.click();
    showToast('✅ ' + type + ' 저장됨');
  }

  var _bgJob = { running: false, total: 0, done: 0, label: '' };

  function _bgJobStart(total, label) {
    window._bgJobCancelled = false;
    _bgJob = { running: true, total: total, done: 0, label: label };
    window._bgJob = _bgJob;
    _bgBarUpdate();
  }
  function _bgJobTick(done, label) {
    _bgJob.done = done;
    _bgJob.label = label || _bgJob.label;
    window._bgJob = _bgJob;
    _bgBarUpdate();
  }
  function _bgJobEnd(msg) {
    _bgJob.running = false;
    window._bgJob = _bgJob;
    _bgBarUpdate();
    if (msg) showToast(msg);
  }
  function _bgBarUpdate() {
    var bar = document.getElementById('bg-job-bar');
    if (!bar) return;
    if (!_bgJob.running) {
      bar.style.display = 'none';
      if (typeof hideGlobalProgress === 'function') hideGlobalProgress(800);
      return;
    }
    bar.style.display = 'flex';
    var pct = _bgJob.total > 0 ? Math.round((_bgJob.done / _bgJob.total) * 100) : 0;
    var esc = (typeof escapeHtml === 'function' ? escapeHtml : function (s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); });
    bar.innerHTML = '<span style="font-size:11px;color:var(--accent)">🎨 이미지 생성 중</span>' +
      '<span style="font-size:10px;color:var(--text2);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin:0 8px">' + esc(_bgJob.label) + '</span>' +
      '<span style="font-size:10px;color:var(--text3);white-space:nowrap">' + _bgJob.done + '/' + _bgJob.total + '</span>' +
      '<div style="width:80px;height:4px;background:var(--border2);border-radius:2px;margin:0 8px;flex-shrink:0">' +
      '<div style="height:4px;background:var(--accent);border-radius:2px;width:' + pct + '%;transition:width 0.3s"></div></div>' +
      '<button onclick="_cancelBgJob()" style="font-size:10px;background:none;border:1px solid var(--border2);color:var(--text3);border-radius:4px;padding:1px 6px;cursor:pointer">중단</button>';
    if (typeof showGlobalProgress === 'function') showGlobalProgress('🎨 이미지 생성 중 (' + _bgJob.done + '/' + _bgJob.total + ')', pct, '🎨');
  }
  function _cancelBgJob() {
    window._bgJobCancelled = true;
    _bgJobEnd('⏹ 이미지 생성 중단됨');
  }

  window.getRawTextWithReferences = getRawTextWithReferences;
  window.resetTranslationCache = resetTranslationCache;
  window.saveContent = saveContent;
  window._bgJobStart = _bgJobStart;
  window._bgJobTick = _bgJobTick;
  window._bgJobEnd = _bgJobEnd;
  window._cancelBgJob = _cancelBgJob;
})();

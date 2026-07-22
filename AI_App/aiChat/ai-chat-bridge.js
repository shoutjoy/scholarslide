/* ScholarSlide adapter for the reusable AI Chat and ScholarAI provider modules. */
(function (root) {
  'use strict';

  var cachedGeminiModels = [
    'gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.5-flash-lite', 'gemini-3-flash-preview'
  ];
  var lastSelection = '';

  function provider() {
    if (!root.ScholarAIProvider) throw new Error('ScholarAIProvider가 로드되지 않았습니다.');
    if (!root.__scholarAIProvider) {
      root.__scholarAIProvider = root.ScholarAIProvider.create({
        callAIStudio: function (prompt, systemInstruction, useSearch, model) {
          return root.callGemini(prompt, systemInstruction, useSearch, model);
        }
      });
    }
    return root.__scholarAIProvider;
  }

  function messagesToPrompt(messages) {
    return (messages || []).map(function (message) {
      return (message.role === 'assistant' ? 'Assistant' : 'User') + ': ' + String(message.content || '');
    }).join('\n\n');
  }

  function selectedText() {
    var active = document.activeElement;
    if (active && /^(TEXTAREA|INPUT)$/.test(active.tagName) && typeof active.selectionStart === 'number') {
      var value = String(active.value || '').slice(active.selectionStart, active.selectionEnd).trim();
      if (value) lastSelection = value;
    } else {
      var selection = root.getSelection && root.getSelection();
      var text = selection ? String(selection.toString() || '').trim() : '';
      if (text) lastSelection = text;
    }
    return lastSelection;
  }

  function insertIntoDocument(text, mode) {
    var target = document.getElementById('md-editor-ta');
    if (!target) throw new Error('문서 편집기를 먼저 열어 주세요.');
    var start = target.selectionStart || 0;
    var end = target.selectionEnd || start;
    if (mode === 'after-line') {
      start = end = target.value.indexOf('\n', end);
      if (start < 0) start = end = target.value.length;
      text = '\n\n' + text;
    } else if (mode === 'end') {
      start = end = target.value.length;
      text = (target.value.trim() ? '\n\n' : '') + text;
    } else if (mode !== 'replace') {
      end = start;
    }
    target.setRangeText(String(text || ''), start, end, 'end');
    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.focus();
  }

  root.AIChatBridge = Object.freeze({
    complete: async function (request) {
      var p = provider();
      var result = await p.complete({
        provider: request.provider,
        model: request.model,
        prompt: messagesToPrompt(request.messages),
        systemInstruction: request.systemInstruction || '',
        useSearch: !!request.academicSearch
      });
      return { provider: result.provider, model: result.model, text: result.text || '', reasoning: '' };
    },
    abort: function () { provider().abort(); },
    refreshLMStudioModels: async function () {
      var synced = await provider().syncLMStudioLoadedModel();
      // AI Chat expects both the active model and the selectable model list.
      // Returning only an array made refreshModels() treat the result as empty,
      // even though the shared provider had detected and saved the loaded model.
      return {
        model: synced.model,
        models: synced.models.map(function (item) { return item.id; }).filter(Boolean),
        contextLength: synced.contextLength || null,
        maxContextLength: synced.maxContextLength || null
      };
    },
    refreshGeminiModels: async function () { return cachedGeminiModels.slice(); },
    getCachedGeminiModels: function () { return cachedGeminiModels.slice(); },
    getSelectedDocumentText: selectedText,
    insertIntoDocument: insertIntoDocument
  });

  document.addEventListener('selectionchange', selectedText);
})(window);

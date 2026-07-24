/* ScholarSlide adapter for the reusable AI Chat and ScholarAI provider modules. */
(function (root) {
  'use strict';

  var cachedGeminiModels = [
    'gemini-3.5-flash',
    'gemini-3.1-pro-preview',
    'gemini-3-flash-preview',
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-2.5-flash-lite',
    'gemini-3.1-flash-lite-image',
    'gemini-3.1-flash-image',
    'gemini-3-pro-image',
    'gemini-2.5-flash-image'
  ];
  var lastSelection = '';
  var activeController = null;

  function provider() {
    if (!root.ScholarAIProvider) throw new Error('ScholarAIProvider가 로드되지 않았습니다.');
    if (!root.__scholarAIProvider) {
      root.__scholarAIProvider = root.ScholarAIProvider.create({
        storage: root.localStorage,
        callAIStudio: function (prompt, systemInstruction, useSearch, model) {
          return root.callGemini(prompt, systemInstruction, useSearch, model);
        }
      });
    }
    return root.__scholarAIProvider;
  }

  function normalizeMessages(messages) {
    return (Array.isArray(messages) ? messages : []).filter(function (message) {
      return message && (message.role === 'user' || message.role === 'assistant') && String(message.content || '').trim();
    }).map(function (message) {
      return { role: message.role, content: String(message.content) };
    });
  }

  function messagesToPrompt(messages) {
    return normalizeMessages(messages).map(function (message) {
      return (message.role === 'assistant' ? 'Assistant' : 'User') + ': ' + message.content;
    }).join('\n\n');
  }

  function estimateTokens(value) {
    var text = String(value || '');
    var ascii = 0;
    var nonAscii = 0;
    for (var i = 0; i < text.length; i++) {
      if (text.charCodeAt(i) < 128) ascii += 1;
      else nonAscii += 1;
    }
    return Math.ceil(ascii / 4 + nonAscii / 1.5 + 24);
  }

  function syncedContextLength(synced) {
    var models = synced && Array.isArray(synced.models) ? synced.models : [];
    var selected = models.filter(function (item) {
      return item && item.id === synced.model;
    })[0] || models[0];
    var instances = selected && Array.isArray(selected.instances) ? selected.instances : [];
    return Math.max(0, Number(instances[0] && instances[0].contextLength) || 0);
  }

  function getHistoryOutputReserve(contextLength, requestedOutputTokens, reasoningMode) {
    if (!contextLength) return requestedOutputTokens;
    var minimumUsefulOutput = reasoningMode ? 1024 : 768;
    var contextShare = Math.floor(contextLength * (reasoningMode ? 0.4 : 0.32));
    return Math.min(requestedOutputTokens, Math.max(minimumUsefulOutput, contextShare));
  }

  function clipHistoryMessage(message, tokenBudget) {
    var original = String(message && message.content || '').trim();
    var label = message && message.role === 'assistant' ? 'AI: ' : 'User: ';
    if (!original || tokenBudget < 48) return null;
    if (estimateTokens(label + original) <= tokenBudget) {
      return { role: message.role, content: original };
    }
    var suffix = '\n\n[Earlier message truncated to fit the context window]';
    var low = 1;
    var high = original.length;
    var best = '';
    while (low <= high) {
      var middle = Math.floor((low + high) / 2);
      var candidate = original.slice(0, middle).replace(/\s+$/, '') + suffix;
      if (estimateTokens(label + candidate) <= tokenBudget) {
        best = candidate;
        low = middle + 1;
      } else {
        high = middle - 1;
      }
    }
    return best ? { role: message.role, content: best } : null;
  }

  function retainHistory(messages, tokenBudget) {
    if (!Number.isFinite(tokenBudget)) return messages.slice();
    if (tokenBudget < 96 || !messages.length) return [];
    var turns = [];
    var currentTurn = [];
    messages.forEach(function (message) {
      if (message.role === 'user') {
        if (currentTurn.length) turns.push(currentTurn);
        currentTurn = [message];
      } else if (currentTurn.length) {
        currentTurn.push(message);
      }
    });
    if (currentTurn.length) turns.push(currentTurn);

    var retainedTurns = [];
    var retainedTokens = 0;
    for (var turnIndex = turns.length - 1; turnIndex >= 0; turnIndex--) {
      var turn = turns[turnIndex];
      var turnTokens = turn.reduce(function (sum, message) {
        return sum + estimateTokens((message.role === 'assistant' ? 'AI' : 'User') + ': ' + message.content);
      }, 0);
      if (retainedTokens + turnTokens <= tokenBudget) {
        retainedTurns.unshift(turn);
        retainedTokens += turnTokens;
        continue;
      }
      if (retainedTurns.length) break;

      var clippedTurn = [];
      var remaining = tokenBudget;
      for (var messageIndex = 0; messageIndex < turn.length && remaining >= 48; messageIndex++) {
        var messagesLeft = turn.length - messageIndex;
        var messageBudget = messagesLeft > 1
          ? Math.max(48, Math.floor(remaining / messagesLeft))
          : remaining;
        var clipped = clipHistoryMessage(turn[messageIndex], messageBudget);
        if (!clipped) continue;
        clippedTurn.push(clipped);
        remaining -= estimateTokens((clipped.role === 'assistant' ? 'AI' : 'User') + ': ' + clipped.content);
      }
      if (clippedTurn.length) retainedTurns.unshift(clippedTurn);
      break;
    }
    return retainedTurns.reduce(function (all, turn) { return all.concat(turn); }, []);
  }
  function isAbortError(error) {
    return !!(error && error.name === 'AbortError') || /abort|중지/i.test(String(error && error.message || error || ''));
  }

  function shouldFallbackToOpenAIEndpoint(error) {
    return /native chat|\/api\/v1\/chat|http 404|not found|unknown endpoint/i.test(String(error && error.message || error || ''));
  }

  function selectedText() {
    var active = document.activeElement;
    if (active && /^(TEXTAREA|INPUT)$/.test(active.tagName) && typeof active.selectionStart === 'number') {
      var value = String(active.value || '').slice(active.selectionStart, active.selectionEnd).trim();
      if (value) lastSelection = value;
    } else {
      var selection = root.getSelection && root.getSelection();
      var text = selection ? String(selection.toString() || '').trim() : '';
      if (text && !(selection.anchorNode && selection.anchorNode.parentElement && selection.anchorNode.parentElement.closest('#ai-chat-panel'))) {
        lastSelection = text;
      }
    }
    return lastSelection;
  }

  function insertIntoDocument(value, mode) {
    var target = document.getElementById('md-editor-ta');
    if (!target) throw new Error('문서 편집기를 먼저 열어 주세요.');
    var text = String(value == null ? '' : value).replace(/\r\n?/g, '\n');
    var start = Number(target.selectionStart) || 0;
    var end = Number(target.selectionEnd) || start;
    mode = String(mode || 'cursor');

    if (mode === 'document-end' || mode === 'end') {
      start = end = target.value.length;
      text = (target.value.trim() ? '\n\n' : '') + text;
    } else if (mode === 'line-below' || mode === 'after-line') {
      var lineEnd = target.value.indexOf('\n', end);
      if (lineEnd < 0) {
        start = end = target.value.length;
        text = (target.value.endsWith('\n') ? '' : '\n') + text;
      } else {
        start = end = lineEnd + 1;
        text += text.endsWith('\n') ? '' : '\n';
      }
    } else if (mode !== 'replace') {
      start = end;
    }

    target.setRangeText(text, start, end, 'end');
    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.focus();
    return true;
  }

  async function refreshLMStudioModels() {
    var synced = await provider().syncLMStudioLoadedModel();
    var contextLength = syncedContextLength(synced);
    if (contextLength > 0) {
      try { root.localStorage.setItem('ss_lm_context_length', String(contextLength)); } catch (e) {}
    }
    return {
      model: synced.model,
      models: synced.models.map(function (item) { return item.id; }).filter(Boolean),
      contextLength: contextLength || null,
      loadedModels: synced.models
    };
  }

  async function completeLMStudio(request, signal) {
    var p = provider();
    var synced = await p.syncLMStudioLoadedModel();
    var config = p.getLMStudioConfig();
    var contextLength = syncedContextLength(synced);
    var messages = normalizeMessages(request.messages);
    var lastUserIndex = messages.map(function (message) { return message.role; }).lastIndexOf('user');
    if (lastUserIndex < 0) throw new Error('전송할 사용자 질문이 없습니다.');

    var academic = request.academicSearch === true;
    var continuation = request.continuation === true;
    var splitAcademic = request.splitAcademicResponse === true;
    var reasoningMode = request.mode === 'reasoning' && !academic;
    var configuredMaxTokens = Math.max(1, Number(config.maxTokens) || 8192);
    var quickMaxTokens = Math.max(1, Number(config.quickMaxTokens) || 4096);
    var reasoningMaxTokens = Math.max(1, Number(config.reasoningMaxTokens) || 8192);
    var configuredReasoning = String(config.reasoningLevel || 'auto').toLowerCase();
    if (['auto', 'on', 'low', 'medium', 'high'].indexOf(configuredReasoning) < 0) configuredReasoning = 'auto';
    var academicMaxTokens = Math.min(Number(request.academicEvidenceCount) > 20 ? 4096 : 3072, configuredMaxTokens);

    var requestedOutputTokens = splitAcademic
      ? Math.min(2200, configuredMaxTokens)
      : continuation
      ? configuredMaxTokens
      : academic
      ? academicMaxTokens
      : Math.min(reasoningMode ? reasoningMaxTokens : quickMaxTokens, configuredMaxTokens);
    var modeInstruction = academic
      ? ''
      : continuation
      ? '이전 응답에서 아직 작성하지 않은 본문만 이어서 작성하세요. 질문·체크리스트·계획·작업 지시·모델의 생각·이미 작성한 문장은 출력하지 마세요.'
      : splitAcademic
      ? '학술 답변은 여러 파트로 나눕니다. 시스템 지시가 지정한 현재 파트만 상세하게 작성하고 이전·다음 파트나 체크리스트·추론·계획은 출력하지 마세요.'
      : reasoningMode
      ? '설정된 추론 강도로 충분히 검토한 뒤 완성도 높은 최종 답변을 작성하세요. 요청한 항목을 누락하지 말고 내부 계획이나 추론은 최종 답변에 섞지 마세요.'
      : '핵심부터 바로 답하되 사용자가 요청한 코드, 설명, 형식과 분량을 완전하게 충족하세요. 인위적인 문장 수 제한을 두지 마세요.';
    var baseSystemPrompt = [request.systemInstruction || '', modeInstruction].filter(Boolean).join('\n\n');
    var fixedInputTokens = estimateTokens(baseSystemPrompt) + estimateTokens(messages[lastUserIndex].content);
    var historyOutputReserve = getHistoryOutputReserve(contextLength, requestedOutputTokens, reasoningMode);
    var historyTokenBudget = contextLength
      ? Math.max(0, contextLength - fixedInputTokens - historyOutputReserve - 256)
      : Number.POSITIVE_INFINITY;
    var historyCandidates = academic ? [] : messages.slice(0, lastUserIndex);
    var historyMessages = retainHistory(historyCandidates, historyTokenBudget);
    var history = historyMessages.map(function (message) {
      return (message.role === 'assistant' ? 'AI' : 'User') + ': ' + message.content;
    }).join('\n\n');
    var retainedHistoryTokens = history ? estimateTokens(history) : 0;
    var systemPrompt = [baseSystemPrompt, history ? '이전 대화:\n' + history : ''].filter(Boolean).join('\n\n');
    var estimatedInputTokens = estimateTokens(systemPrompt) + estimateTokens(messages[lastUserIndex].content);
    var contextOutputBudget = contextLength
      ? Math.max(1, contextLength - estimatedInputTokens - 256)
      : configuredMaxTokens;
    var normalOutputBudget = Math.max(1, Math.min(configuredMaxTokens, contextOutputBudget));
    var maxTokens = splitAcademic
      ? Math.min(2200, normalOutputBudget)
      : continuation
      ? normalOutputBudget
      : academic
      ? Math.min(academicMaxTokens, normalOutputBudget)
      : Math.min(reasoningMode ? reasoningMaxTokens : quickMaxTokens, normalOutputBudget);
    var timeoutMs = continuation
      ? Math.max(
          600000,
          Number(config.timeoutMs) || 0,
          Math.ceil((maxTokens / 8) * 1000 + 120000)
        )
      : reasoningMode
      ? Math.max(300000, Number(config.timeoutMs) || 0)
      : (academic ? Math.max(240000, Number(config.timeoutMs) || 0) : Math.max(60000, Number(config.timeoutMs) || 0));
    var client = root.LocalAI.createClient(Object.assign({}, config, {
      model: synced.model,
      maxTokens: maxTokens,
      timeoutMs: timeoutMs
    }));
    var streamEventHandler = typeof request.onStreamEvent === 'function' ? request.onStreamEvent : null;
    if (streamEventHandler) {
      streamEventHandler({
        type: 'request.start',
        context_length: contextLength || null,
        max_output_tokens: maxTokens,
        estimated_input_tokens: estimatedInputTokens,
        retained_history_tokens: retainedHistoryTokens,
        reasoning: academic || continuation || splitAcademic
          ? 'off'
          : (reasoningMode ? configuredReasoning : 'off')
      });
    }
    var chatOptions = {
      input: messages[lastUserIndex].content,
      systemInstruction: systemPrompt,
      model: synced.model,
      reasoning: academic || continuation || splitAcademic
        ? 'off'
        : (reasoningMode ? (configuredReasoning === 'auto' ? undefined : configuredReasoning) : 'off'),
      contextLength: contextLength || undefined,
      maxTokens: maxTokens,
      timeoutMs: timeoutMs,
      store: splitAcademic ? false : (request.retainForContinuation === true || academic || continuation),
      previousResponseId: request.previousResponseId || undefined,
      signal: signal,
      onEvent: streamEventHandler || undefined
    };
    try {
      var result = streamEventHandler && typeof client.chatStream === 'function'
        ? await client.chatStream(chatOptions)
        : await client.chat(chatOptions);
      return {
        provider: 'lmstudio',
        model: result.model || synced.model,
        text: result.text || '',
        reasoning: result.reasoning || '',
        usage: result.usage || null,
        finishReason: result.finishReason || '',
        contextLength: contextLength || null,
        maxOutputTokens: maxTokens,
        responseId: result.responseId || null
      };
    } catch (error) {
      if (isAbortError(error) || !shouldFallbackToOpenAIEndpoint(error)) throw error;
      var fallback = await client.complete({
        prompt: messagesToPrompt(request.messages),
        systemInstruction: systemPrompt,
        model: synced.model,
        maxTokens: maxTokens,
        timeoutMs: timeoutMs,
        signal: signal
      });
      return {
        provider: 'lmstudio',
        model: fallback.model || synced.model,
        text: fallback.text || '',
        reasoning: fallback.reasoning || '',
        usage: fallback.usage || null,
        finishReason: fallback.finishReason || '',
        contextLength: contextLength || null,
        maxOutputTokens: maxTokens,
        responseId: fallback.responseId || null
      };
    }
  }

  async function completeAIStudio(request) {
    var result = await provider().complete({
      provider: 'aistudio',
      model: request.model,
      prompt: messagesToPrompt(request.messages),
      systemInstruction: request.systemInstruction || '',
      useSearch: !!request.academicSearch
    });
    return {
      provider: result.provider,
      model: result.model,
      text: result.text || '',
      reasoning: result.reasoning || '',
      images: result.images || [],
      finishReason: result.finishReason || ''
    };
  }

  function imageDataUrl(image) {
    if (!image || !image.data) throw new Error('이미지 데이터가 없습니다.');
    return 'data:' + String(image.mimeType || 'image/png') + ';base64,' + String(image.data);
  }

  root.AIChatBridge = Object.freeze({
    complete: async function (request) {
      request = request || {};
      if (activeController) activeController.abort();
      var controller = new AbortController();
      activeController = controller;
      try {
        return request.provider === 'aistudio'
          ? await completeAIStudio(request)
          : await completeLMStudio(request, controller.signal);
      } finally {
        if (activeController === controller) activeController = null;
      }
    },
    abort: function () {
      if (activeController) activeController.abort();
      try { provider().abort(); } catch (e) {}
    },
    refreshLMStudioModels: refreshLMStudioModels,
    refreshGeminiModels: async function () { return cachedGeminiModels.slice(); },
    getCachedGeminiModels: function () { return cachedGeminiModels.slice(); },
    getSelectedDocumentText: selectedText,
    insertIntoDocument: insertIntoDocument,
    saveImageForDocument: async function (image) { return imageDataUrl(image); }
  });

  document.addEventListener('selectionchange', selectedText);
})(window);

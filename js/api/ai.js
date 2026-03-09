/* =========================================================
   GEMINI API INTERACTION
   ========================================================= */

async function callGemini(prompt, systemInstruction = '', useSearch = false) {
    const key = getApiKey();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
    const payload = {
        contents: [{ parts: [{ text: prompt }] }]
    };
    if (systemInstruction) {
        // Note: Gemini API format for system instruction:
        payload.systemInstruction = { parts: [{ text: systemInstruction }] };
    }
    if (useSearch) {
        // Add Google Search grounding tool
        payload.tools = [{ googleSearch: {} }];
    }

    if (_abortController) _abortController.abort();
    _abortController = new AbortController();

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: _abortController.signal
    });

    if (!res.ok) {
        let errText = await res.text();
        try { const ej = JSON.parse(errText); if (ej.error && ej.error.message) errText = ej.error.message; } catch (e) { }
        throw new Error(`API Error: ${res.status} - ${errText}`);
    }

    const data = await res.json();
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        throw new Error('응답을 생성할 수 없습니다.');
    }

    const text = data.candidates[0].content.parts[0].text;
    let groundings = [];
    if (data.candidates[0].groundingMetadata && data.candidates[0].groundingMetadata.groundingChunks) {
        groundings = data.candidates[0].groundingMetadata.groundingChunks.map(c => c.web?.uri).filter(Boolean);
    }

    return { text, groundings };
}

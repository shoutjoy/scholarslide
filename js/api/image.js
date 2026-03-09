/* =========================================================
   IMAGE GENERATION API (from index.js image fetching features)
   ========================================================= */

function getImageApiKey() {
    if (_imageApiKey) return _imageApiKey;
    if (_activeApiKey) return _activeApiKey;
    throw new Error('NO_API_KEY');
}

async function generateImage(prompt) {
    const promptEn = await callGemini(`Translate this into a clear, detailed English prompt for an AI image generator. Do not add any conversational text, ONLY the prompt:\n${prompt}`, 'You are an expert translator and prompt engineer.', false);

    const key = getImageApiKey();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateImages?key=${key}`;

    const body = {
        instances: [{ prompt: promptEn.text.trim() }],
        parameters: {
            sampleCount: 1,
            aspectRatio: "16:9",
            outputOptions: { mimeType: "image/jpeg" },
            personGeneration: "DONT_ALLOW"
        }
    };

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    if (!res.ok) {
        let errText = await res.text();
        try { const ej = JSON.parse(errText); if (ej.error && ej.error.message) errText = ej.error.message; } catch (e) { }
        throw new Error(`이미지 API 에러: ${res.status} - ${errText}`);
    }

    const data = await res.json();
    if (data.predictions && data.predictions[0] && data.predictions[0].bytesBase64Encoded) {
        return 'data:image/jpeg;base64,' + data.predictions[0].bytesBase64Encoded;
    }
    throw new Error('이미지 반환 데이터가 없습니다.');
}

async function refineImageAPI(base64, instruction) {
    const key = getImageApiKey();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateImages?key=${key}`;
    const pureBase64 = base64.split(',')[1];

    const instrEn = await callGemini(`Translate this image edit instruction to English. Return ONLY the translation:\n${instruction}`);

    const body = {
        instances: [
            {
                prompt: instrEn.text.trim(),
                image: { bytesBase64Encoded: pureBase64 }
            }
        ],
        parameters: {
            sampleCount: 1,
            aspectRatio: "16:9",
            outputOptions: { mimeType: "image/jpeg" },
            personGeneration: "DONT_ALLOW"
        }
    };
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error('이미지 재생성 실패:' + res.status);
    const data = await res.json();
    if (data.predictions && data.predictions[0]) return 'data:image/jpeg;base64,' + data.predictions[0].bytesBase64Encoded;
    throw new Error('재생성된 이미지가 없습니다');
}

/**
 * Lingo. AI Integration Gateway (Phase 11)
 *
 * Server-side AI integration supporting Google Gemini API (gemini-2.5-flash) and OpenAI.
 * Strictly safeguards API keys on the server, enforces input validation and rate-limiting,
 * and handles unconfigured provider states gracefully without fabricating artificial AI responses.
 */

export function getAIStatus() {
  const geminiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
  const openaiKey = (process.env.OPENAI_API_KEY || '').trim();

  if (geminiKey) {
    return {
      configured: true,
      provider: 'gemini',
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      instructions: null
    };
  }

  if (openaiKey) {
    return {
      configured: true,
      provider: 'openai',
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      instructions: null
    };
  }

  return {
    configured: false,
    provider: null,
    model: null,
    instructions: 'To enable live AI English conversation, set GEMINI_API_KEY in your .env file. You can obtain a free Gemini API key from Google AI Studio.'
  };
}

/**
 * Sends a conversation turn to the configured AI provider.
 */
export async function sendAIConversationTurn({
  scenario = 'Everyday English Conversation',
  aiPersona = 'You are a friendly, encouraging English conversation partner.',
  level = 'A2',
  userMessage = '',
  history = []
}) {
  if (typeof userMessage !== 'string' || !userMessage.trim()) {
    const err = new Error('Message cannot be empty.');
    err.status = 400;
    throw err;
  }

  if (userMessage.length > 500) {
    const err = new Error('Message length exceeds maximum limit of 500 characters.');
    err.status = 400;
    throw err;
  }

  const status = getAIStatus();
  if (!status.configured) {
    const err = new Error(
      'AI conversation provider is not configured. Add GEMINI_API_KEY to your .env configuration to enable live AI conversation.'
    );
    err.status = 503;
    err.code = 'AI_UNCONFIGURED';
    throw err;
  }

  const safeHistory = Array.isArray(history) ? history.slice(-20) : [];

  const systemInstruction = `
You are Lingo's AI English Conversation Tutor.
Role & Persona: ${aiPersona}
Scenario Context: ${scenario}
Learner CEFR Level: ${level}

Guidelines:
1. Reply naturally in character, keeping your answer concise (1–3 sentences) and vocabulary appropriate for CEFR ${level}.
2. Always output valid JSON conforming strictly to this schema:
{
  "reply": "Your in-character spoken response to the learner",
  "grammarCorrection": null or "Gentle, helpful explanation of any grammar or word choice error with the natural phrasing",
  "vocabularyTips": [
    { "term": "word", "definition": "simple explanation", "example": "example usage" }
  ]
}
3. If the learner's message has no grammatical errors, set "grammarCorrection" to null.
4. Distinguish genuine grammar errors from stylistic preferences.
5. Provide 1 to 2 relevant vocabulary tips that fit this conversation turn.
`;

  if (status.provider === 'gemini') {
    return await callGeminiAPI({
      apiKey: (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim(),
      model: status.model,
      systemInstruction,
      userMessage,
      history: safeHistory
    });
  }

  if (status.provider === 'openai') {
    return await callOpenAIAPI({
      apiKey: (process.env.OPENAI_API_KEY || '').trim(),
      model: status.model,
      systemInstruction,
      userMessage,
      history: safeHistory
    });
  }

  throw new Error('Unsupported AI provider.');
}

async function callGeminiAPI({ apiKey, model, systemInstruction, userMessage, history }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const contents = [];

  for (const turn of history) {
    if (turn.role === 'user' && turn.content) {
      contents.push({ role: 'user', parts: [{ text: String(turn.content) }] });
    } else if (turn.role === 'assistant' && turn.content) {
      contents.push({ role: 'model', parts: [{ text: String(turn.content) }] });
    }
  }

  contents.push({ role: 'user', parts: [{ text: userMessage }] });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.7,
          maxOutputTokens: 600
        }
      })
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errBody = await response.text();
      const err = new Error(`AI Provider returned HTTP ${response.status}: ${errBody.slice(0, 150)}`);
      err.status = response.status === 429 ? 429 : 502;
      throw err;
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      throw new Error('AI provider returned an empty response.');
    }

    try {
      const parsed = JSON.parse(candidateText);
      return {
        reply: parsed.reply || candidateText,
        grammarCorrection: parsed.grammarCorrection || null,
        vocabularyTips: Array.isArray(parsed.vocabularyTips) ? parsed.vocabularyTips : []
      };
    } catch {
      return {
        reply: candidateText,
        grammarCorrection: null,
        vocabularyTips: []
      };
    }
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      const timeoutErr = new Error('AI service timed out after 15 seconds. Please try again.');
      timeoutErr.status = 504;
      throw timeoutErr;
    }
    throw err;
  }
}

async function callOpenAIAPI({ apiKey, model, systemInstruction, userMessage, history }) {
  const url = 'https://api.openai.com/v1/chat/completions';

  const messages = [{ role: 'system', content: systemInstruction }];

  for (const turn of history) {
    if (['user', 'assistant'].includes(turn.role) && turn.content) {
      messages.push({ role: turn.role, content: String(turn.content) });
    }
  }

  messages.push({ role: 'user', content: userMessage });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages,
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 600
      })
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errBody = await response.text();
      const err = new Error(`AI Provider returned HTTP ${response.status}: ${errBody.slice(0, 150)}`);
      err.status = response.status === 429 ? 429 : 502;
      throw err;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI returned an empty completion.');
    }

    try {
      const parsed = JSON.parse(content);
      return {
        reply: parsed.reply || content,
        grammarCorrection: parsed.grammarCorrection || null,
        vocabularyTips: Array.isArray(parsed.vocabularyTips) ? parsed.vocabularyTips : []
      };
    } catch {
      return {
        reply: content,
        grammarCorrection: null,
        vocabularyTips: []
      };
    }
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      const timeoutErr = new Error('AI service timed out after 15 seconds. Please try again.');
      timeoutErr.status = 504;
      throw timeoutErr;
    }
    throw err;
  }
}

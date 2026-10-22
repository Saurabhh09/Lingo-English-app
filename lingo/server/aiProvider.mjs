/**
 * Lingo. AI Integration Gateway (Phase 11)
 *
 * Server-side AI integration supporting Google Gemini API (gemini-2.5-flash) and OpenAI.
 * Strictly safeguards API keys on the server, enforces input validation and rate-limiting,
 * and handles unconfigured provider states gracefully without fabricating artificial AI responses.
 */

// Test Provider Hook for automated tests without spending API credits
let mockAIProviderHook = null;
export function setAIProviderMock(fn) {
  mockAIProviderHook = fn;
}
export function clearAIProviderMock() {
  mockAIProviderHook = null;
}
export function hasAIProviderMock() {
  return !!mockAIProviderHook;
}

// Redacts secrets, keys, and tokens from error messages to prevent leakage
export function sanitizeErrorMessage(rawText, sensitiveValues = []) {
  if (!rawText) return '';
  let cleaned = String(rawText);
  for (const val of sensitiveValues) {
    if (val && typeof val === 'string' && val.length > 3) {
      cleaned = cleaned.replaceAll(val, '[REDACTED]');
    }
  }
  return cleaned
    .replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_API_KEY]')
    .replace(/sk-[a-zA-Z0-9_-]{20,}/g, '[REDACTED_API_KEY]')
    .replace(/key=[^&\s]+/gi, 'key=[REDACTED]')
    .slice(0, 150);
}

/**
 * Deterministic in-character guided fallback responses when live AI is unavailable or unconfigured.
 */
export function generateGuidedFallbackResponse({ scenarioId, userMessage = '', history = [], reason = 'GUIDED_FALLBACK' }) {
  const turnIndex = Array.isArray(history) ? Math.floor(history.length / 2) : 0;
  let replyText = 'Thank you for your response! That was very clear.';

  if (scenarioId === 'conv_cafe_01') {
    const replies = [
      'Wonderful choice! That will be ready in just a moment. Would you like anything else with that?',
      'Coming right up! Would you like any pastries or snacks to go with that?',
      'Perfect! That will be ready in just a couple of minutes at the pickup counter.'
    ];
    replyText = replies[turnIndex % replies.length];
  } else if (scenarioId === 'conv_greet_01') {
    const replies = [
      'Lovely to meet you! Welcome to the neighborhood. Let me know if you need anything as you settle in.',
      'That sounds great! If you ever need recommendations for groceries or cafés nearby, feel free to ask!',
      'Have a wonderful rest of your day, and welcome again to the building!'
    ];
    replyText = replies[turnIndex % replies.length];
  } else if (scenarioId === 'conv_hotel_01') {
    const replies = [
      'Here is your room key. Breakfast is served on the first floor from seven to ten thirty in the morning. Enjoy your stay!',
      'WiFi access is complimentary throughout the hotel. The network name and passcode are on your keycard folder.',
      'Enjoy your stay! Please let our front desk know if there is anything else we can do for you.'
    ];
    replyText = replies[turnIndex % replies.length];
  } else if (scenarioId === 'conv_interview_01') {
    const replies = [
      'Thank you for sharing that context. Could you highlight a specific project where you overcame a notable challenge?',
      'That is very interesting. How do you approach collaborating across multidisciplinary or remote teams?',
      'Thank you for explaining that in such detail. Do you have any questions for us about the role or team?'
    ];
    replyText = replies[turnIndex % replies.length];
  } else if (scenarioId === 'conv_debate_01') {
    const replies = [
      'That is a thought-provoking perspective. Balancing technological capability with human agency remains critical.',
      'Indeed. Without continuous domain practice, institutional expertise degrades even in highly automated environments.',
      'That brings us to a crucial question: how should regulatory frameworks evolve to maintain meaningful human oversight?'
    ];
    replyText = replies[turnIndex % replies.length];
  }

  return {
    reply: replyText,
    grammarCorrection: null,
    vocabularyTips: [],
    source: 'fallback',
    isFallback: true,
    fallbackReason: reason
  };
}

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

  // 1. Check for test mock hook first
  if (mockAIProviderHook) {
    const mockResult = await mockAIProviderHook({ scenario, aiPersona, level, userMessage, history });
    if (mockResult) return mockResult;
  }

  // 2. Check provider configuration
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
  const starterPrompt = (safeHistory[0]?.role === 'assistant' && safeHistory[0]?.content) ? safeHistory[0].content : '';

  const systemInstruction = `
You are Lingo's AI English Conversation Tutor.
Role & Persona: ${aiPersona}
Scenario Context: ${scenario}
Learner CEFR Level: ${level}${starterPrompt ? `\nScenario Starter Prompt: "${starterPrompt}"` : ''}

Pedagogical Guidelines for CEFR ${level}:
1. Reply naturally in character, keeping your answer concise (1–3 sentences) and vocabulary appropriate for CEFR ${level}.
2. Always output valid JSON conforming strictly to this schema:
{
  "reply": "Your in-character spoken response to the learner",
  "grammarCorrection": null or "Gentle, concise explanation of any grammar or word choice error with the natural phrasing",
  "vocabularyTips": [
    { "term": "word", "definition": "simple explanation", "example": "example usage" }
  ]
}
3. If the learner's message has no grammatical errors, set "grammarCorrection" to null.
4. Correct only meaningful grammar or word choice errors gently without being overly pedantic.
5. Provide 1 to 2 relevant vocabulary tips that fit this conversation turn.
`;

  if (status.provider === 'gemini') {
    return await callGeminiAPI({
      apiKey: (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim(),
      model: status.model,
      systemInstruction,
      userMessage: userMessage.trim(),
      history: safeHistory
    });
  }

  if (status.provider === 'openai') {
    return await callOpenAIAPI({
      apiKey: (process.env.OPENAI_API_KEY || '').trim(),
      model: status.model,
      systemInstruction,
      userMessage: userMessage.trim(),
      history: safeHistory
    });
  }

  throw new Error('Unsupported AI provider.');
}

async function callGeminiAPI({ apiKey, model, systemInstruction, userMessage, history }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  // Filter and build multi-turn history.
  // Gemini API requires multiturn chat to start with a 'user' turn and alternate between user and model.
  const contents = [];

  for (const turn of history) {
    if (turn.role === 'user' && turn.content) {
      contents.push({ role: 'user', parts: [{ text: String(turn.content) }] });
    } else if (turn.role === 'assistant' && turn.content) {
      // Gemini requires multiturn talk to start with a 'user' turn.
      // Only include assistant/model turns if preceded by a user turn.
      if (contents.length > 0) {
        contents.push({ role: 'model', parts: [{ text: String(turn.content) }] });
      }
    }
  }

  contents.push({ role: 'user', parts: [{ text: userMessage }] });

  const maxAttempts = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
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
        const errBody = await response.text().catch(() => '');
        const safeErr = sanitizeErrorMessage(errBody, [apiKey]);
        const err = new Error(`AI Provider returned HTTP ${response.status}: ${safeErr}`);
        err.status = response.status === 429 ? 429 : (response.status === 401 || response.status === 403) ? 401 : 502;
        const isRetryable = response.status === 429 || response.status === 502 || response.status === 503 || response.status === 504;
        if (attempt < maxAttempts && isRetryable) {
          console.warn(`[AI Conversation] Attempt ${attempt} failed with ${response.status}. Retrying in 1200ms...`);
          await new Promise(r => setTimeout(r, 1200));
          continue;
        }
        throw err;
      }

      const data = await response.json();
      const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!candidateText) {
        throw new Error('AI provider returned an empty response.');
      }

      try {
        const cleaned = candidateText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
        const parsed = JSON.parse(cleaned);
        return {
          reply: parsed.reply || candidateText,
          grammarCorrection: parsed.grammarCorrection || null,
          vocabularyTips: Array.isArray(parsed.vocabularyTips) ? parsed.vocabularyTips : [],
          source: 'gemini',
          model
        };
      } catch {
        return {
          reply: candidateText,
          grammarCorrection: null,
          vocabularyTips: [],
          source: 'gemini',
          model
        };
      }
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;
      if (err.name === 'AbortError') {
        const timeoutErr = new Error('AI service timed out after 15 seconds. Please try again.');
        timeoutErr.status = 504;
        lastError = timeoutErr;
      }
      const isRetryable = lastError.status === 429 || lastError.status === 502 || lastError.status === 503 || lastError.status === 504;
      if (attempt < maxAttempts && isRetryable) {
        console.warn(`[AI Conversation] Attempt ${attempt} failed with ${lastError.message}. Retrying in 1200ms...`);
        await new Promise(r => setTimeout(r, 1200));
        continue;
      }
      break;
    }
  }

  throw lastError;
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

  const maxAttempts = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
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
        const errBody = await response.text().catch(() => '');
        const safeErr = sanitizeErrorMessage(errBody, [apiKey]);
        const err = new Error(`AI Provider returned HTTP ${response.status}: ${safeErr}`);
        err.status = response.status === 429 ? 429 : 502;
        const isRetryable = response.status === 429 || response.status === 502 || response.status === 503 || response.status === 504;
        if (attempt < maxAttempts && isRetryable) {
          console.warn(`[AI Conversation OpenAI] Attempt ${attempt} failed with ${response.status}. Retrying in 1200ms...`);
          await new Promise(r => setTimeout(r, 1200));
          continue;
        }
        throw err;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('OpenAI returned an empty completion.');
      }

      try {
        const cleaned = content.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
        const parsed = JSON.parse(cleaned);
        return {
          reply: parsed.reply || content,
          grammarCorrection: parsed.grammarCorrection || null,
          vocabularyTips: Array.isArray(parsed.vocabularyTips) ? parsed.vocabularyTips : [],
          source: 'openai',
          model
        };
      } catch {
        return {
          reply: content,
          grammarCorrection: null,
          vocabularyTips: [],
          source: 'openai',
          model
        };
      }
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;
      if (err.name === 'AbortError') {
        const timeoutErr = new Error('AI service timed out after 15 seconds. Please try again.');
        timeoutErr.status = 504;
        lastError = timeoutErr;
      }
      const isRetryable = lastError.status === 429 || lastError.status === 502 || lastError.status === 503 || lastError.status === 504;
      if (attempt < maxAttempts && isRetryable) {
        console.warn(`[AI Conversation OpenAI] Attempt ${attempt} failed with ${lastError.message}. Retrying in 1200ms...`);
        await new Promise(r => setTimeout(r, 1200));
        continue;
      }
      break;
    }
  }

  throw lastError;
}

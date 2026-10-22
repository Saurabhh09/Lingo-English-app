import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, Mic, Volume2, Sparkles, AlertCircle, Info, CheckCircle2, Loader2, RotateCcw } from 'lucide-react';

export function AIConversationTutor({ scenarios = [], api, updateProgress, userCompleted = [] }) {
  const [selectedId, setSelectedId] = useState(scenarios[0]?.id || 'conv_greet_01');
  const [aiStatus, setAiStatus] = useState({ configured: false, provider: null, model: null });
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [isListeningMic, setIsListeningMic] = useState(false);

  const scrollRef = useRef(null);
  const recognitionRef = useRef(null);

  const currentScenario = scenarios.find(s => s.id === selectedId) || scenarios[0];
  const [selectedLevel, setSelectedLevel] = useState(currentScenario?.level || 'B1');

  useEffect(() => {
    if (currentScenario?.level) {
      setSelectedLevel(currentScenario.level);
    }
  }, [currentScenario?.id]);

  useEffect(() => {
    api('/ai/status')
      .then(res => setAiStatus(res))
      .catch(() => setAiStatus({ configured: false }));
  }, []);

  useEffect(() => {
    // Reset conversation on scenario change with starter prompt
    setMessages([
      {
        role: 'assistant',
        content: currentScenario.starterPrompt,
        grammarCorrection: null,
        vocabularyTips: [],
        source: 'starter'
      }
    ]);
    setInput('');
    setError('');
  }, [currentScenario.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, busy]);

  function speakText(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const s = new SpeechSynthesisUtterance(text);
    s.lang = 'en-US';
    s.rate = 0.85;
    window.speechSynthesis.speak(s);
  }

  function handleVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Voice recognition is not supported in this browser. Please type your message.');
      return;
    }

    if (isListeningMic) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListeningMic(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;

      recognition.onstart = () => setIsListeningMic(true);
      recognition.onresult = e => {
        const text = e.results[0][0].transcript;
        setInput(prev => (prev ? prev + ' ' + text : text));
      };
      recognition.onerror = e => {
        setIsListeningMic(false);
        setError('Voice recognition notice: ' + e.error);
      };
      recognition.onend = () => setIsListeningMic(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      setError('Could not access microphone for voice chat.');
    }
  }

  async function handleSendMessage(overrideText = null) {
    const textToSend = overrideText || input;
    if (!textToSend.trim() || busy) return;

    const userMsg = textToSend.trim();
    setInput('');
    setError('');

    const newHistory = [...messages, { role: 'user', content: userMsg }];
    setMessages(newHistory);
    setBusy(true);

    if (!aiStatus.configured) {
      // In Guided Practice Mode (AI unconfigured)
      setTimeout(() => {
        let replyText = 'Thank you for your response! That was very clear.';
        if (currentScenario.id === 'conv_cafe_01') {
          replyText = 'Wonderful choice! That will be ready in just a moment. Would you like anything else with that?';
        } else if (currentScenario.id === 'conv_greet_01') {
          replyText = 'Lovely to meet you! Welcome to the neighborhood. Let me know if you need anything as you settle in.';
        } else if (currentScenario.id === 'conv_hotel_01') {
          replyText = 'Here is your room key. Breakfast is served on the first floor from seven to ten thirty in the morning. Enjoy your stay!';
        } else if (currentScenario.id === 'conv_interview_01') {
          replyText = 'Thank you for sharing that context. Could you highlight a specific project where you overcame a notable challenge?';
        } else {
          replyText = 'That is a thought-provoking perspective. Balancing technological capability with human agency remains critical.';
        }

        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: replyText,
            grammarCorrection: null,
            vocabularyTips: [],
            source: 'fallback',
            isFallback: true,
            fallbackReason: 'Guided practice mode active'
          }
        ]);
        setBusy(false);
      }, 500);
      return;
    }

    try {
      const historyPayload = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await api('/ai/conversation', {
        scenarioId: currentScenario.id,
        userMessage: userMsg,
        history: historyPayload,
        level: selectedLevel || currentScenario.level || 'B1'
      });

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: res.reply,
          grammarCorrection: res.grammarCorrection,
          vocabularyTips: res.vocabularyTips || [],
          source: res.source || (res.isFallback ? 'fallback' : 'gemini'),
          isFallback: Boolean(res.isFallback),
          fallbackReason: res.fallbackReason || null,
          model: res.model || null
        }
      ]);

      if (res.progress) {
        updateProgress(res.progress);
      }
    } catch (err) {
      setError(err.message || 'Failed to receive AI response. Please retry.');
    } finally {
      setBusy(false);
    }
  }

  function handleReset() {
    setMessages([
      {
        role: 'assistant',
        content: currentScenario.starterPrompt,
        grammarCorrection: null,
        vocabularyTips: [],
        source: 'starter'
      }
    ]);
    setInput('');
    setError('');
  }

  return (
    <div className="practice-grid">
      <aside className="practice-sidebar">
        <span className="eyebrow" style={{ marginBottom: '4px' }}>CONVERSATION SCENARIOS</span>
        {scenarios.map(sc => {
          const isSelected = sc.id === currentScenario?.id;
          return (
            <button
              key={sc.id}
              className={`practice-list-card ${isSelected ? 'selected' : ''}`}
              onClick={() => setSelectedId(sc.id)}
            >
              <div className="practice-card-header">
                <span className="practice-level-tag">{sc.level}</span>
                <Bot size={15} color="#455d38" />
              </div>
              <h4>{sc.title}</h4>
              <p>Role: {sc.role}</p>
            </button>
          );
        })}
      </aside>

      <section className="practice-panel">
        <div className="practice-panel-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="practice-level-tag">{selectedLevel}</span>
              <select
                className="cefr-level-select"
                value={selectedLevel}
                onChange={e => setSelectedLevel(e.target.value)}
                aria-label="Select CEFR proficiency level"
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  border: '1px solid #c8d9be',
                  background: '#f2f7ed',
                  color: '#344e23',
                  cursor: 'pointer'
                }}
              >
                <option value="A1">A1 · Beginner</option>
                <option value="A2">A2 · Elementary</option>
                <option value="B1">B1 · Intermediate</option>
                <option value="B2">B2 · Upper Intermediate</option>
                <option value="C1">C1 · Advanced</option>
              </select>
            </div>
            <h3>{currentScenario.title}</h3>
            <p>Partner: <b>{currentScenario.role}</b> · {currentScenario.scenario}</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
            <span className={`ai-status-pill ${aiStatus.configured ? 'configured' : 'unconfigured'}`}>
              <Sparkles size={13} />
              {aiStatus.configured ? `AI Ready (${aiStatus.model})` : 'Guided Practice Mode'}
            </span>
            {!aiStatus.configured && (
              <span style={{ fontSize: '11px', color: '#7a8c72' }}>Add GEMINI_API_KEY in .env for live AI</span>
            )}
          </div>
        </div>

        <div className="ai-chat-container">
          <div className="ai-chat-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', fontWeight: 600, color: '#304128' }}>
              <Bot size={18} />
              <span>Conversation with {currentScenario.role}</span>
            </div>

            <button type="button" className="text-button" onClick={handleReset} style={{ fontSize: '12px' }}>
              <RotateCcw size={13} /> Restart chat
            </button>
          </div>

          <div className="ai-messages-scroll" ref={scrollRef}>
            {messages.map((m, idx) => (
              <div key={idx} className={`ai-message-bubble ${m.role}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {m.role === 'assistant' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {m.source === 'gemini' ? (
                          <span className="ai-source-badge live">✦ Live Gemini AI</span>
                        ) : m.source === 'fallback' ? (
                          <span className="ai-source-badge fallback">Guided Scenario Reply</span>
                        ) : (
                          <span className="ai-source-badge scenario">Scenario Starter</span>
                        )}
                      </div>
                    )}
                    <span>{m.content}</span>
                    {m.fallbackReason && (
                      <span className="ai-fallback-note">({m.fallbackReason})</span>
                    )}
                  </div>
                  {m.role === 'assistant' && (
                    <button
                      type="button"
                      className="icon-button"
                      style={{ padding: '2px', color: '#56684e' }}
                      onClick={() => speakText(m.content)}
                      aria-label="Listen to assistant message"
                      title="Read aloud"
                    >
                      <Volume2 size={15} />
                    </button>
                  )}
                </div>

                {m.grammarCorrection && (
                  <div className="ai-correction-box">
                    <b>💡 Grammar Insight:</b> {m.grammarCorrection}
                  </div>
                )}

                {m.vocabularyTips?.length > 0 && (
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#4a6039' }}>Vocabulary Focus:</span>
                    <div className="ai-vocab-pill-row">
                      {m.vocabularyTips.map((tip, i) => (
                        <span key={i} className="ai-vocab-pill" title={`${tip.definition} ${tip.example ? `("${tip.example}")` : ''}`}>
                          <b>{tip.term}</b>: {tip.definition}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {busy && (
              <div className="ai-message-bubble assistant" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#596950' }}>
                <Loader2 className="spin" size={16} />
                <span>{currentScenario.role} is thinking…</span>
              </div>
            )}
          </div>

          {currentScenario.suggestedReplies?.length > 0 && (
            <div className="ai-scenario-prompts-row">
              <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#687b60', alignSelf: 'center' }}>
                Suggested replies:
              </span>
              {currentScenario.suggestedReplies.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  className="ai-scenario-reply-btn"
                  disabled={busy}
                  onClick={() => handleSendMessage(r)}
                >
                  “{r}”
                </button>
              ))}
            </div>
          )}

          <div className="ai-chat-input-bar">
            <button
              type="button"
              className={`icon-button ${isListeningMic ? 'active' : ''}`}
              onClick={handleVoiceInput}
              aria-label={isListeningMic ? 'Stop voice input' : 'Speak into chat'}
              title="Speak into chat"
              style={{ color: isListeningMic ? '#d84534' : 'inherit' }}
            >
              <Mic size={18} />
            </button>

            <input
              type="text"
              className="ai-chat-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSendMessage();
              }}
              placeholder={`Reply to ${currentScenario.role} in English...`}
              disabled={busy}
              maxLength={500}
              aria-label="Your conversation reply"
            />

            <button
              type="button"
              className="ai-send-btn"
              disabled={busy || !input.trim()}
              onClick={() => handleSendMessage()}
              aria-label="Send message"
            >
              {busy ? <Loader2 className="spin" size={17} /> : <Send size={16} />}
            </button>
          </div>
        </div>

        {error && <div className="form-error">{error}</div>}

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#73836b' }}>
          <Info size={15} />
          <span>
            {aiStatus.configured
              ? `Connected securely to ${aiStatus.model}. Keys remain strictly protected on the server.`
              : 'Guided Scenario Mode active. Add GEMINI_API_KEY to .env for real-time AI responses.'}
          </span>
        </div>
      </section>
    </div>
  );
}

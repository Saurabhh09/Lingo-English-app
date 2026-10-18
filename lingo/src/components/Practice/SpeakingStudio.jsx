import React, { useState } from 'react';
import { MicrophoneRecorder } from './MicrophoneRecorder.jsx';
import { Mic, CheckCircle2, ArrowRight, RotateCcw, Sparkles, Loader2, BookOpen } from 'lucide-react';

export function SpeakingStudio({ prompts = [], api, updateProgress, userCompleted = [] }) {
  const [selectedId, setSelectedId] = useState(prompts[0]?.id || 'spk_intro_01');
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const currentPrompt = prompts.find(p => p.id === selectedId) || prompts[0];

  function handlePromptChange(id) {
    setSelectedId(id);
    setTranscript('');
    setResult(null);
    setError('');
  }

  async function handleSubmit() {
    if (!currentPrompt || busy) return;
    const words = transcript.trim().split(/\s+/).filter(Boolean);
    if (words.length < (currentPrompt.minWords || 5)) {
      setError(`Please speak or write at least ${currentPrompt.minWords} words. You have ${words.length}.`);
      return;
    }

    setBusy(true);
    setError('');

    try {
      const res = await api('/practice/speaking/submit', {
        promptId: currentPrompt.id,
        transcript: transcript.trim()
      });
      setResult(res);
      if (res.progress) {
        updateProgress(res.progress);
      }
    } catch (err) {
      setError(err.message || 'Failed to submit speaking practice.');
    } finally {
      setBusy(false);
    }
  }

  function handleRetry() {
    setTranscript('');
    setResult(null);
    setError('');
  }

  const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="practice-grid">
      <aside className="practice-sidebar">
        <span className="eyebrow" style={{ marginBottom: '4px' }}>SPEAKING STUDIO TASKS</span>
        {prompts.map(p => {
          const isDone = userCompleted.includes(p.id);
          const isSelected = p.id === currentPrompt?.id;
          return (
            <button
              key={p.id}
              className={`practice-list-card ${isSelected ? 'selected' : ''}`}
              onClick={() => handlePromptChange(p.id)}
            >
              <div className="practice-card-header">
                <span className="practice-level-tag">{p.level}</span>
                {isDone && <CheckCircle2 size={15} color="#3d6824" />}
              </div>
              <h4>{p.title}</h4>
              <p>{p.objective}</p>
              <div className="practice-meta-row">
                <span>Min {p.minWords} words</span>
                <span>+{p.xp} XP</span>
              </div>
            </button>
          );
        })}
      </aside>

      <section className="practice-panel">
        <div className="practice-panel-header">
          <div>
            <span className="practice-level-tag">{currentPrompt.level}</span>
            <h3>{currentPrompt.title}</h3>
            <p>{currentPrompt.objective}</p>
          </div>
          <span className="pill outline">+{currentPrompt.xp} XP</span>
        </div>

        <div style={{ background: '#f8faf4', border: '1px solid #e2ebd8', borderRadius: '16px', padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: '#3c4e33' }}>
            <Sparkles size={16} />
            <span>Recommended Vocabulary & Keywords:</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {currentPrompt.suggestedKeywords?.map(kw => (
              <span key={kw} className="ai-vocab-pill">
                {kw}
              </span>
            ))}
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: '#687b60' }}>
            Aim for at least <b>{currentPrompt.minWords} words</b> in your spoken response. Speak naturally and at a comfortable pace.
          </p>
        </div>

        <MicrophoneRecorder
          transcript={transcript}
          onTranscriptChange={setTranscript}
          placeholder="Speak into your microphone or write your spoken response here..."
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#56674e' }}>
          <span>Word Count: <b>{wordCount}</b> / {currentPrompt.minWords} minimum</span>
          {wordCount >= currentPrompt.minWords && (
            <span style={{ color: '#2d5917', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 size={15} /> Word requirement met!
            </span>
          )}
        </div>

        {error && <div className="form-error">{error}</div>}

        {result ? (
          <div style={{ background: '#f5f8f0', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '18px', color: '#264b15' }}>
                  A Little Win! Speaking Practice Recorded.
                </h4>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#576850' }}>
                  You delivered a response with {result.wordCount} words.
                </p>
              </div>
              <span className="pill dark">
                {result.earned > 0 ? `+${result.earned} XP earned` : 'Mastered'}
              </span>
            </div>

            {currentPrompt.exampleResponse && (
              <div style={{ background: '#ffffff', border: '1px solid #e1ebd9', borderRadius: '12px', padding: '14px 18px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#4a5b42', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <BookOpen size={14} /> Example Model Response:
                </span>
                <p style={{ margin: '6px 0 0', fontSize: '13.5px', color: '#2c3a25', fontStyle: 'italic' }}>
                  “{currentPrompt.exampleResponse}”
                </p>
              </div>
            )}

            <button type="button" className="button dark" onClick={handleRetry} style={{ alignSelf: 'flex-start' }}>
              <RotateCcw size={16} /> Practice another response
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="button dark"
            disabled={busy || wordCount < (currentPrompt.minWords || 5)}
            onClick={handleSubmit}
            style={{ alignSelf: 'flex-start' }}
          >
            {busy ? <Loader2 className="spin" size={17} /> : <>Submit Speaking Response <ArrowRight size={17} /></>}
          </button>
        )}
      </section>
    </div>
  );
}

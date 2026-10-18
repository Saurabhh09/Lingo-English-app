import React, { useState } from 'react';
import { MicrophoneRecorder } from './MicrophoneRecorder.jsx';
import { Volume2, CheckCircle2, RotateCcw, ArrowRight, Sparkles, Loader2, Info } from 'lucide-react';

export function PronunciationCoach({ items = [], api, updateProgress, userCompleted = [] }) {
  const [selectedId, setSelectedId] = useState(items[0]?.id || 'pron_hello');
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const currentItem = items.find(i => i.id === selectedId) || items[0];

  function handleItemChange(id) {
    setSelectedId(id);
    setTranscript('');
    setResult(null);
    setError('');
  }

  function playReferenceAudio() {
    if (currentItem.referenceAudioUrl) {
      const a = new Audio(currentItem.referenceAudioUrl);
      a.play().catch(() => {
        // Fallback to Web Speech API
        speakFallback(currentItem.targetPhrase);
      });
    } else {
      speakFallback(currentItem.targetPhrase);
    }
  }

  function speakFallback(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const s = new SpeechSynthesisUtterance(text);
    s.lang = 'en-US';
    s.rate = 0.8;
    window.speechSynthesis.speak(s);
  }

  async function handleEvaluate() {
    if (!currentItem || busy || !transcript.trim()) return;
    setBusy(true);
    setError('');

    try {
      const res = await api('/practice/pronunciation/submit', {
        itemId: currentItem.id,
        transcript: transcript.trim()
      });
      setResult(res);
      if (res.progress) {
        updateProgress(res.progress);
      }
    } catch (err) {
      setError(err.message || 'Failed to evaluate pronunciation.');
    } finally {
      setBusy(false);
    }
  }

  function handleRetry() {
    setTranscript('');
    setResult(null);
    setError('');
  }

  return (
    <div className="practice-grid">
      <aside className="practice-sidebar">
        <span className="eyebrow" style={{ marginBottom: '4px' }}>PRONUNCIATION PHRASES</span>
        {items.map(item => {
          const isDone = userCompleted.includes(item.id);
          const isSelected = item.id === currentItem?.id;
          return (
            <button
              key={item.id}
              className={`practice-list-card ${isSelected ? 'selected' : ''}`}
              onClick={() => handleItemChange(item.id)}
            >
              <div className="practice-card-header">
                <span className="practice-level-tag">{item.level}</span>
                {isDone && <CheckCircle2 size={15} color="#3d6824" />}
              </div>
              <h4>{item.targetPhrase}</h4>
              <p style={{ fontFamily: 'monospace', fontSize: '12px' }}>{item.phonetic}</p>
              <div className="practice-meta-row">
                <span>{item.focusSounds}</span>
                <span>+{item.xp} XP</span>
              </div>
            </button>
          );
        })}
      </aside>

      <section className="practice-panel">
        <div className="practice-panel-header">
          <div>
            <span className="practice-level-tag">{currentItem.level}</span>
            <h3>Pronunciation Practice</h3>
            <p>Listen carefully to the reference pronunciation, then repeat the sentence aloud.</p>
          </div>
          <span className="pill outline">+{currentItem.xp} XP</span>
        </div>

        <div className="pron-diff-card">
          <div className="pron-target-banner">
            <div className="pron-target-text">
              <h4>“{currentItem.targetPhrase}”</h4>
              <span>{currentItem.phonetic}</span>
            </div>

            <button
              type="button"
              className="button dark"
              onClick={playReferenceAudio}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              aria-label="Listen to reference pronunciation audio"
            >
              <Volume2 size={18} />
              <span>Hear Audio</span>
            </button>
          </div>

          <div style={{ fontSize: '13px', color: '#57674f' }}>
            <b>Sound Focus:</b> {currentItem.focusSounds}
          </div>
        </div>

        <MicrophoneRecorder
          transcript={transcript}
          onTranscriptChange={setTranscript}
          placeholder="Click the microphone above and read the target phrase aloud..."
        />

        {error && <div className="form-error">{error}</div>}

        {result ? (
          <div style={{ background: '#f5f8f0', borderRadius: '18px', padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className={`pron-score-row ${result.assessment}`}>
              <div>
                <span style={{ fontSize: '24px', fontWeight: 800 }}>{result.score}%</span>
                <span style={{ marginLeft: '10px', fontSize: '15px' }}>
                  {result.assessment === 'excellent' ? 'Excellent Clarity!' : result.assessment === 'good' ? 'Good Articulation!' : 'Needs More Clarity'}
                </span>
              </div>
              <span className="pill dark">
                {result.earned > 0 ? `+${result.earned} XP earned` : 'Mastered'}
              </span>
            </div>

            <p style={{ margin: 0, fontSize: '14px', color: '#384831' }}>{result.message}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#52634a' }}>Word Recognition Alignment:</span>
              <div className="pron-words-breakdown">
                {result.words?.map((w, idx) => (
                  <span key={idx} className={`pron-word-chip ${w.status}`}>
                    {w.word}
                    {w.status === 'exact' ? ' ✓' : w.status === 'close' ? ' ~' : ' ✗'}
                  </span>
                ))}
              </div>
            </div>

            <div className="pron-disclaimer-note">
              <Info size={15} />
              <span>{result.disclaimer}</span>
            </div>

            <button type="button" className="button dark" onClick={handleRetry} style={{ alignSelf: 'flex-start' }}>
              <RotateCcw size={16} /> Practice this phrase again
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="button dark"
            disabled={busy || !transcript.trim()}
            onClick={handleEvaluate}
            style={{ alignSelf: 'flex-start' }}
          >
            {busy ? <Loader2 className="spin" size={17} /> : <>Evaluate My Pronunciation <ArrowRight size={17} /></>}
          </button>
        )}
      </section>
    </div>
  );
}

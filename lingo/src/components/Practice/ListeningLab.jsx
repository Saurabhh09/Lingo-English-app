import React, { useState } from 'react';
import { AudioPlayer } from './AudioPlayer.jsx';
import { Headphones, Check, CheckCircle2, XCircle, ArrowRight, RotateCcw, Sparkles, Loader2 } from 'lucide-react';

export function ListeningLab({ modules = [], api, updateProgress, userCompleted = [] }) {
  const [selectedId, setSelectedId] = useState(modules[0]?.id || 'list_pre_a1_01');
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const currentModule = modules.find(m => m.id === selectedId) || modules[0];

  function handleSelectOption(qIndex, optionIndex) {
    if (result) return;
    setAnswers(prev => ({
      ...prev,
      [qIndex]: optionIndex
    }));
  }

  function handleModuleChange(id) {
    setSelectedId(id);
    setAnswers({});
    setResult(null);
    setError('');
  }

  async function handleSubmit() {
    if (!currentModule || busy) return;
    const answeredCount = Object.keys(answers).length;
    if (answeredCount < currentModule.questions.length) {
      setError(`Please answer all ${currentModule.questions.length} questions before checking.`);
      return;
    }

    setBusy(true);
    setError('');

    const answerArray = currentModule.questions.map((_, idx) => answers[idx]);

    try {
      const res = await api('/practice/listening/submit', {
        moduleId: currentModule.id,
        answers: answerArray
      });
      setResult(res);
      if (res.progress) {
        updateProgress(res.progress);
      }
    } catch (err) {
      setError(err.message || 'Failed to submit listening answers.');
    } finally {
      setBusy(false);
    }
  }

  function handleRetry() {
    setAnswers({});
    setResult(null);
    setError('');
  }

  return (
    <div className="practice-grid">
      <aside className="practice-sidebar">
        <span className="eyebrow" style={{ marginBottom: '4px' }}>LISTENING LAB PASSAGES</span>
        {modules.map(mod => {
          const isDone = userCompleted.includes(mod.id);
          const isSelected = mod.id === currentModule?.id;
          return (
            <button
              key={mod.id}
              className={`practice-list-card ${isSelected ? 'selected' : ''}`}
              onClick={() => handleModuleChange(mod.id)}
            >
              <div className="practice-card-header">
                <span className="practice-level-tag">{mod.level}</span>
                {isDone && <CheckCircle2 size={15} color="#3d6824" />}
              </div>
              <h4>{mod.title}</h4>
              <p>{mod.subtitle}</p>
              <div className="practice-meta-row">
                <span>{mod.questions.length} questions</span>
                <span>+{mod.xp} XP</span>
              </div>
            </button>
          );
        })}
      </aside>

      <section className="practice-panel">
        <div className="practice-panel-header">
          <div>
            <span className="practice-level-tag">{currentModule.level}</span>
            <h3>{currentModule.title}</h3>
            <p>{currentModule.subtitle}</p>
          </div>
          <span className="pill outline">+{currentModule.xp} XP</span>
        </div>

        <AudioPlayer
          audioUrl={currentModule.audioUrl}
          passage={currentModule.passage}
          title={currentModule.title}
        />

        <div className="listening-questions-list">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: '#3d4d35' }}>
            <Headphones size={16} />
            <span>Comprehension Questions ({currentModule.questions.length})</span>
          </div>

          {currentModule.questions.map((q, qIndex) => {
            const selectedOpt = answers[qIndex];
            const isEvaluated = !!result;
            const correctOpt = result?.solutions?.[qIndex];

            return (
              <div key={qIndex} className="listening-question-card">
                <h5>{qIndex + 1}. {q.prompt}</h5>
                <div className="listening-options-grid">
                  {q.options.map((opt, optIndex) => {
                    const isChosen = selectedOpt === optIndex;
                    let optClass = isChosen ? 'selected' : '';
                    if (isEvaluated) {
                      if (optIndex === correctOpt) {
                        optClass = 'correct';
                      } else if (isChosen && optIndex !== correctOpt) {
                        optClass = 'incorrect';
                      }
                    }

                    return (
                      <button
                        key={optIndex}
                        type="button"
                        className={`listening-option-btn ${optClass}`}
                        disabled={isEvaluated || busy}
                        onClick={() => handleSelectOption(qIndex, optIndex)}
                      >
                        <span className="listening-option-key">
                          {String.fromCharCode(65 + optIndex)}
                        </span>
                        <span>{opt}</span>
                        {isEvaluated && optIndex === correctOpt && <Check size={16} style={{ marginLeft: 'auto' }} />}
                      </button>
                    );
                  })}
                </div>

                {isEvaluated && q.explanation && (
                  <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: '#56664e', background: '#edf4e8', padding: '8px 12px', borderRadius: '8px' }}>
                    <b>Explanation:</b> {q.explanation}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {error && <div className="form-error">{error}</div>}

        {result ? (
          <div style={{ background: '#f5f8f0', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '18px', color: result.passed ? '#264b15' : '#882b20' }}>
                  {result.passed ? 'Look at you go! Listening Mastered.' : 'Keep listening! You’ve got this.'}
                </h4>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#576850' }}>
                  Score: {result.correct} / {result.total} correct
                </p>
              </div>
              <span className="pill dark">
                {result.earned > 0 ? `+${result.earned} XP earned` : 'Mastered'}
              </span>
            </div>

            <button type="button" className="button dark" onClick={handleRetry} style={{ alignSelf: 'flex-start' }}>
              <RotateCcw size={16} /> Try another attempt
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="button dark"
            disabled={busy || Object.keys(answers).length < currentModule.questions.length}
            onClick={handleSubmit}
            style={{ alignSelf: 'flex-start' }}
          >
            {busy ? <Loader2 className="spin" size={17} /> : <>Check My Answers <ArrowRight size={17} /></>}
          </button>
        )}
      </section>
    </div>
  );
}

import React, { useState } from 'react';
import {
  Gamepad2,
  Users,
  Zap,
  Globe,
  ArrowRight,
  Clock,
  Plus,
  Lock,
  Sparkles,
  Check,
  Loader2,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import { GameArt } from '../../Art.jsx';

/**
 * GamesSetup: The enhanced Play & Learn page setup interface.
 * Features clearly separated Create Game & Join Game areas,
 * complete validation feedback, responsive styling, and accessible controls.
 */
export function GamesSetup({ busy, createGame, joinGame }) {
  const [code, setCode] = useState('');
  const [difficulty, setDifficulty] = useState('Beginner');
  const [topic, setTopic] = useState('Mixed English');
  const [duration, setDuration] = useState(3);
  const [inputTouched, setInputTouched] = useState(false);

  const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const isCodeValid = cleanCode.length === 6;

  function handleCodeChange(e) {
    const formatted = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setCode(formatted);
    setInputTouched(true);
  }

  function handleJoinSubmit(e) {
    e.preventDefault();
    if (isCodeValid && !busy) {
      joinGame(cleanCode);
    }
  }

  function handleCreateSubmit(e) {
    e.preventDefault();
    if (!busy) {
      createGame({ difficulty, topic, duration });
    }
  }

  return (
    <div className="games-page">
      {/* Hero Banner */}
      <section className="game-banner purple">
        <div>
          <span className="pill translucent">
            <Gamepad2 size={15} /> GOOD WORDS. GREAT COMPANY.
          </span>
          <h2>
            A little challenge.<br />A whole lot of fun.
          </h2>
          <p>Play with friends, race the clock, and learn without even noticing.</p>
          <div className="game-feature-pills">
            <span><Users size={15} /> Up to 8 players</span>
            <span><Zap size={15} /> Live scores</span>
            <span><Globe size={15} /> All skill levels</span>
          </div>
        </div>
        <GameArt />
      </section>

      {/* Main Setup Grid: Create & Join Areas + Field Guide Sidebar */}
      <div className="game-setup-grid">
        <div className="game-setup-main">

          {/* ====================================================
              AREA A: JOIN A GAME
             ==================================================== */}
          <section className="join-card panel">
            <div className="card-heading">
              <div className="section-number">01</div>
              <div>
                <h3>Got an invite?</h3>
                <p>Enter your friend’s 6-character room code and jump right in.</p>
              </div>
              <span className="join-doodle" aria-hidden="true">↗</span>
            </div>

            <form onSubmit={handleJoinSubmit} noValidate={false}>
              <div className="join-input-wrapper">
                <div className="join-input">
                  <KeyRound size={20} color="#6a7c5b" />
                  <input
                    aria-label="Game code"
                    placeholder="ENTER GAME CODE"
                    maxLength={6}
                    minLength={6}
                    required
                    value={code}
                    onChange={handleCodeChange}
                    autoComplete="off"
                    spellCheck="false"
                  />
                  <span
                    className={`join-code-badge ${isCodeValid ? 'ready' : ''}`}
                    aria-live="polite"
                  >
                    {isCodeValid ? (
                      <>
                        <Check size={14} color="#3b7324" /> Ready
                      </>
                    ) : (
                      <>{code.length} / 6</>
                    )}
                  </span>
                </div>

                {inputTouched && code.length > 0 && !isCodeValid && (
                  <p style={{ margin: '4px 0 0 4px', fontSize: '11px', color: '#9d5a45' }}>
                    Room codes are exactly 6 letters or numbers.
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="button dark"
                disabled={busy || !isCodeValid}
              >
                {busy ? (
                  <Loader2 className="spin" size={17} />
                ) : (
                  <>
                    Join game <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          </section>

          {/* ====================================================
              AREA B: CREATE A GAME
             ==================================================== */}
          <section className="create-card panel">
            <div className="card-heading">
              <div className="section-number">02</div>
              <div>
                <h3>Make it your game.</h3>
                <p>Pick your vibe. Invite your people. Let the learning begin.</p>
              </div>
              <span className="create-doodle" aria-hidden="true">✧</span>
            </div>

            <form onSubmit={handleCreateSubmit}>
              {/* Option 1: Difficulty */}
              <div className="form-section-title">
                <span>Choose your challenge</span>
                <span>01 / 03</span>
              </div>
              <div className="difficulty-options">
                {[
                  ['Beginner', '🌱', 'Just getting started'],
                  ['Intermediate', '🌿', 'Finding my flow'],
                  ['Advanced', '🌳', 'Bring it on'],
                ].map(([d, icon, desc]) => (
                  <button
                    type="button"
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={difficulty === d ? 'selected' : ''}
                  >
                    <span>{icon}</span>
                    <b>{d}</b>
                    <small>{desc}</small>
                    <i>{difficulty === d ? <Check size={12} /> : null}</i>
                  </button>
                ))}
              </div>

              {/* Option 2: Topic */}
              <div className="form-section-title" style={{ marginTop: '24px' }}>
                <span>What are we exploring?</span>
                <span>02 / 03</span>
              </div>
              <div className="topic-options">
                {[
                  ['Mixed English', '✨'],
                  ['Grammar', '🧩'],
                  ['Vocabulary', '📖'],
                  ['Food & drinks', '🥑'],
                  ['Conversation', '💬'],
                ].map(([t, icon]) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setTopic(t)}
                    className={topic === t ? 'selected' : ''}
                  >
                    <span>{icon}</span>
                    {t}
                    {topic === t && <Check size={14} />}
                  </button>
                ))}
              </div>

              {/* Option 3: Time limit */}
              <div className="form-section-title" style={{ marginTop: '24px' }}>
                <span>A little time for fun</span>
                <span>03 / 03</span>
              </div>
              <div className="time-options">
                {[1, 3, 5, 10].map(t => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setDuration(t)}
                    className={duration === t ? 'selected' : ''}
                  >
                    <Clock size={16} />
                    <b>{t}</b> min
                  </button>
                ))}
              </div>

              {/* Create Footer */}
              <div className="create-footer">
                <span>
                  <Lock size={14} /> Private room. Your code, your crew.
                </span>
                <button
                  type="submit"
                  className="button dark"
                  disabled={busy}
                >
                  {busy ? (
                    <Loader2 className="spin" size={17} />
                  ) : (
                    <>
                      <Plus size={18} /> Create a game
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>

        </div>

        {/* Sidebar Guide */}
        <aside className="game-sidebar">
          <section className="howto-card yellow">
            <span className="howto-icon" aria-hidden="true">✦</span>
            <span className="eyebrow">A QUICK FIELD GUIDE</span>
            <h2>Good times,<br />in three steps.</h2>
            {[
              ['1', 'Make a little room', 'Choose a topic, difficulty, and time limit.'],
              ['2', 'Gather your people', 'Share your unique code. Friends join from their own devices.'],
              ['3', 'Let the fun begin', 'The host starts the round. Answer quickly for bonus points!'],
            ].map(([n, title, text]) => (
              <div className="howto-step" key={n}>
                <span>{n}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </div>
            ))}
            <div className="howto-note">
              <Sparkles size={18} />
              <span>No friends online? Play solo.<br />Your curiosity is great company.</span>
            </div>
          </section>

          <div className="game-tip">
            <span>💡</span>
            <p>
              <b>A little tip</b>Every answer teaches you something—even the ones you don’t get right.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

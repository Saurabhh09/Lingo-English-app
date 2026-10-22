import React, { useState } from 'react';
import {
  Gamepad2,
  Users,
  User,
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
  Eye,
  Sliders,
  ListChecks,
  AlertCircle,
  Tv,
} from 'lucide-react';
import { GameArt } from '../../Art.jsx';
import {
  GAME_MODES,
  CEFR_LEVELS,
  SUGGESTED_TOPICS,
  DURATION_OPTIONS,
  QUESTION_COUNT_OPTIONS,
  HOST_ROLES,
  DEFAULT_GAME_CONFIG,
  LIMITS,
  validateCustomTopic,
  validateCustomDuration,
  validateCustomQuestionCount,
  validateGameConfig,
  mapConfigToBackend,
} from './gameConfig.js';

/**
 * GamesSetup: Phase 2 Enhanced Play & Learn setup interface.
 * Implements complete game-creation onboarding:
 * - Game mode selection (Solo vs Friends)
 * - CEFR level selection (Pre-A1 to C2) with concise descriptions
 * - Topic selection (Suggested topics + validated Custom topic input)
 * - Duration configuration (1m, 3m, 5m, 10m, 15m, 20m, Custom)
 * - Question count configuration (5, 10, 15, 20, 30, Custom)
 * - Host participation preference (Play with everyone vs Spectate in Friends mode; hidden in Solo)
 * - Safe mapping to current backend contract to preserve operational game creation
 */
export function GamesSetup({ busy, createGame, joinGame }) {
  // Join Room State
  const [code, setCode] = useState('');
  const [inputTouched, setInputTouched] = useState(false);

  // Game Creation Configuration State (Phase 2 Model)
  const [config, setConfig] = useState(DEFAULT_GAME_CONFIG);
  const [touchedFields, setTouchedFields] = useState({});

  // Validation
  const validationResult = validateGameConfig(config);
  const isConfigValid = validationResult.valid;
  const errors = validationResult.errors;

  // Clean join code
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

  function updateField(key, value) {
    setConfig(prev => ({ ...prev, [key]: value }));
  }

  function markTouched(key) {
    setTouchedFields(prev => ({ ...prev, [key]: true }));
  }

  function handleCreateSubmit(e) {
    e.preventDefault();
    if (!isConfigValid || busy) return;

    // Safely map rich configuration to the backend API contract
    const backendPayload = mapConfigToBackend(config);
    backendPayload.mode = config.mode;
    backendPayload.hostRole = config.hostRole;
    createGame(backendPayload);
  }

  // Selected CEFR item for summary & display
  const currentCefr = CEFR_LEVELS.find(l => l.id === config.cefrLevel) || CEFR_LEVELS[3];

  // Effective topic label
  const effectiveTopicLabel = config.topicType === 'custom'
    ? (config.customTopic.trim() || 'Custom topic')
    : config.selectedTopic;

  // Effective duration label
  const effectiveDurationMinutes = config.durationOption === 'custom'
    ? config.customDuration
    : config.durationOption;

  // Effective question count label
  const effectiveQuestionCount = config.questionCountOption === 'custom'
    ? config.customQuestionCount
    : config.questionCountOption;

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
            <span><Users size={15} /> Up to 100 players</span>
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
              AREA A: JOIN A GAME (Unchanged join-by-code flow)
             ==================================================== */}
          <section className="join-card panel" aria-labelledby="join-card-heading">
            <div className="card-heading">
              <div className="section-number">01</div>
              <div>
                <h3 id="join-card-heading">Got an invite?</h3>
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
                  <p className="validation-error-msg" role="alert">
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
              AREA B: CREATE A GAME (Complete Redesigned Onboarding)
             ==================================================== */}
          <section className="create-card panel" aria-labelledby="create-card-heading">
            <div className="card-heading">
              <div className="section-number">02</div>
              <div>
                <h3 id="create-card-heading">Make it your game.</h3>
                <p>Pick your vibe. Set your rules. Let the learning begin.</p>
              </div>
              <span className="create-doodle" aria-hidden="true">✧</span>
            </div>

            <form onSubmit={handleCreateSubmit} className="create-game-form">

              {/* --------------------------------------------------
                  STEP 1: GAME MODE SELECTION (Solo vs Friends)
                 -------------------------------------------------- */}
              <div className="form-section first">
                <div className="form-section-title">
                  <div>
                    <span>Game Mode</span>
                    <p className="section-subtext">Choose how you’d like to play today.</p>
                  </div>
                  <span className="step-badge">Step 1 of 5</span>
                </div>

                <div className="mode-options-grid" role="radiogroup" aria-label="Game Mode Selection">
                  {GAME_MODES.map(mode => {
                    const isSelected = config.mode === mode.id;
                    const Icon = mode.id === 'solo' ? User : Users;
                    return (
                      <button
                        type="button"
                        key={mode.id}
                        role="radio"
                        data-mode={mode.id}
                        aria-checked={isSelected}
                        onClick={() => updateField('mode', mode.id)}
                        className={`mode-card ${isSelected ? 'selected' : ''}`}
                      >
                        <div className="mode-card-header">
                          <div className="mode-card-icon">
                            <Icon size={20} />
                          </div>
                          <span className="mode-pill">{mode.badge}</span>
                        </div>
                        <div className="mode-card-content">
                          <b>{mode.label}</b>
                          <small className="mode-tagline">{mode.tagline}</small>
                          <p>{mode.description}</p>
                        </div>
                        <i className="mode-check" aria-hidden="true">
                          {isSelected && <Check size={14} />}
                        </i>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* --------------------------------------------------
                  STEP 2: CEFR LEVEL SELECTION (Pre-A1 to C2)
                 -------------------------------------------------- */}
              <div className="form-section">
                <div className="form-section-title">
                  <div>
                    <span>Target Proficiency (CEFR)</span>
                    <p className="section-subtext">Standard international levels from first steps to native fluency.</p>
                  </div>
                  <span className="step-badge">Step 2 of 5</span>
                </div>

                <div className="cefr-options-grid" role="radiogroup" aria-label="CEFR Proficiency Level">
                  {CEFR_LEVELS.map(lvl => {
                    const isSelected = config.cefrLevel === lvl.id;
                    return (
                      <button
                        type="button"
                        key={lvl.id}
                        role="radio"
                        data-cefr={lvl.id}
                        aria-label={`CEFR ${lvl.label}`}
                        aria-checked={isSelected}
                        onClick={() => updateField('cefrLevel', lvl.id)}
                        className={`cefr-card ${isSelected ? 'selected' : ''}`}
                      >
                        <div className="cefr-card-top">
                          <span className="cefr-card-badge">{lvl.label}</span>
                          <i className="cefr-check" aria-hidden="true">
                            {isSelected && <Check size={12} />}
                          </i>
                        </div>
                        <b className="cefr-card-title">{lvl.title}</b>
                        <p className="cefr-card-desc">{lvl.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* --------------------------------------------------
                  STEP 3: TOPIC SELECTION (Suggested + Custom Topic)
                 -------------------------------------------------- */}
              <div className="form-section">
                <div className="form-section-title">
                  <div>
                    <span>What are we exploring?</span>
                    <p className="section-subtext">Choose a suggested curriculum theme or type your own custom topic.</p>
                  </div>
                  <span className="step-badge">Step 3 of 5</span>
                </div>

                {/* Topic Mode Toggle (Suggested vs Custom) */}
                <div className="topic-mode-toggle" role="tablist" aria-label="Topic Source">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={config.topicType === 'suggested'}
                    className={`topic-tab-btn ${config.topicType === 'suggested' ? 'active' : ''}`}
                    onClick={() => updateField('topicType', 'suggested')}
                  >
                    <Sparkles size={14} /> Suggested Topics
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={config.topicType === 'custom'}
                    className={`topic-tab-btn ${config.topicType === 'custom' ? 'active' : ''}`}
                    onClick={() => {
                      updateField('topicType', 'custom');
                      markTouched('customTopic');
                    }}
                  >
                    <Sliders size={14} /> Custom Topic
                  </button>
                </div>

                {config.topicType === 'suggested' ? (
                  <div className="topic-options-grid" role="radiogroup" aria-label="Suggested Topics">
                    {SUGGESTED_TOPICS.map(topic => {
                      const isSelected = config.selectedTopic === topic.id;
                      return (
                        <button
                          type="button"
                          key={topic.id}
                          role="radio"
                          aria-checked={isSelected}
                          onClick={() => updateField('selectedTopic', topic.id)}
                          className={`topic-card ${isSelected ? 'selected' : ''}`}
                        >
                          <span className="topic-card-icon">{topic.icon}</span>
                          <div className="topic-card-text">
                            <b>{topic.label}</b>
                            <small>{topic.description}</small>
                          </div>
                          {isSelected && <Check size={14} className="topic-check-icon" />}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="custom-topic-panel">
                    <div className="custom-topic-header">
                      <label htmlFor="custom-topic-input">Enter your custom topic</label>
                      <span className="char-counter" aria-live="polite">
                        {config.customTopic.length} / {LIMITS.CUSTOM_TOPIC_MAX_LEN}
                      </span>
                    </div>

                    <div className="custom-input-box">
                      <input
                        id="custom-topic-input"
                        type="text"
                        placeholder="e.g. Medical English, Tech Startups, Travel in Tokyo, Job Interview..."
                        value={config.customTopic}
                        maxLength={LIMITS.CUSTOM_TOPIC_MAX_LEN}
                        onChange={e => updateField('customTopic', e.target.value)}
                        onBlur={() => markTouched('customTopic')}
                        aria-invalid={touchedFields.customTopic && !!errors.customTopic}
                        aria-describedby="custom-topic-note custom-topic-error"
                      />
                    </div>

                    {touchedFields.customTopic && errors.customTopic && (
                      <p id="custom-topic-error" className="validation-error-msg" role="alert">
                        <AlertCircle size={13} /> {errors.customTopic}
                      </p>
                    )}

                    <div id="custom-topic-note" className="custom-topic-ai-callout">
                      <div className="ai-callout-header">
                        <Sparkles size={16} className="ai-sparkle-icon" />
                        <span className="ai-callout-title">Generate Questions with AI</span>
                      </div>
                      <p className="ai-callout-text">
                        Enter any topic and let AI create personalized English questions based on your selected CEFR level.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* --------------------------------------------------
                  STEP 4: DURATION CONFIGURATION
                 -------------------------------------------------- */}
              <div className="form-section">
                <div className="form-section-title">
                  <div>
                    <span>Round Duration</span>
                    <p className="section-subtext">How long should the round last before final scores?</p>
                  </div>
                  <span className="step-badge">Step 4 of 5</span>
                </div>

                <div className="duration-options-grid" role="radiogroup" aria-label="Game Duration">
                  {DURATION_OPTIONS.map(opt => {
                    const isSelected = config.durationOption === opt.value;
                    return (
                      <button
                        type="button"
                        key={String(opt.value)}
                        role="radio"
                        data-duration={opt.value}
                        aria-label={opt.value === 'custom' ? 'Custom duration' : `${opt.minutes} min`}
                        aria-checked={isSelected}
                        onClick={() => updateField('durationOption', opt.value)}
                        className={`duration-card ${isSelected ? 'selected' : ''}`}
                      >
                        <Clock size={15} />
                        {opt.value === 'custom' ? (
                          <b>Custom</b>
                        ) : (
                          <>
                            <b>{opt.minutes}</b> min
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Duration Input Field */}
                {config.durationOption === 'custom' && (
                  <div className="custom-numeric-panel">
                    <div className="custom-numeric-row">
                      <label htmlFor="custom-duration-input">Specify duration (minutes):</label>
                      <div className="custom-number-input">
                        <input
                          id="custom-duration-input"
                          type="number"
                          min={LIMITS.CUSTOM_DURATION_MIN}
                          max={LIMITS.CUSTOM_DURATION_MAX}
                          value={config.customDuration}
                          onChange={e => updateField('customDuration', e.target.value)}
                          onBlur={() => markTouched('customDuration')}
                          aria-invalid={touchedFields.customDuration && !!errors.customDuration}
                        />
                        <span>min</span>
                      </div>
                    </div>
                    {touchedFields.customDuration && errors.customDuration && (
                      <p className="validation-error-msg" role="alert">
                        <AlertCircle size={13} /> {errors.customDuration}
                      </p>
                    )}
                    <small className="field-hint">Choose between 1 and 60 minutes.</small>
                  </div>
                )}
              </div>

              {/* --------------------------------------------------
                  STEP 5: QUESTION COUNT CONFIGURATION
                 -------------------------------------------------- */}
              <div className="form-section">
                <div className="form-section-title">
                  <div>
                    <span>Question Count</span>
                    <p className="section-subtext">Target number of questions for this session.</p>
                  </div>
                  <span className="step-badge">Step 5 of 5</span>
                </div>

                <div className="question-options-grid" role="radiogroup" aria-label="Question Count">
                  {QUESTION_COUNT_OPTIONS.map(opt => {
                    const isSelected = config.questionCountOption === opt.value;
                    return (
                      <button
                        type="button"
                        key={String(opt.value)}
                        role="radio"
                        data-questions={opt.value}
                        aria-label={opt.value === 'custom' ? 'Custom question count' : `${opt.count} Qs`}
                        aria-checked={isSelected}
                        onClick={() => updateField('questionCountOption', opt.value)}
                        className={`question-card ${isSelected ? 'selected' : ''}`}
                      >
                        <ListChecks size={15} />
                        {opt.value === 'custom' ? (
                          <b>Custom</b>
                        ) : (
                          <>
                            <b>{opt.count}</b> Qs
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Question Count Input Field */}
                {config.questionCountOption === 'custom' && (
                  <div className="custom-numeric-panel">
                    <div className="custom-numeric-row">
                      <label htmlFor="custom-question-input">Specify question count:</label>
                      <div className="custom-number-input">
                        <input
                          id="custom-question-input"
                          type="number"
                          min={LIMITS.CUSTOM_QUESTIONS_MIN}
                          max={LIMITS.CUSTOM_QUESTIONS_MAX}
                          value={config.customQuestionCount}
                          onChange={e => updateField('customQuestionCount', e.target.value)}
                          onBlur={() => markTouched('customQuestionCount')}
                          aria-invalid={touchedFields.customQuestionCount && !!errors.customQuestionCount}
                        />
                        <span>questions</span>
                      </div>
                    </div>
                    {touchedFields.customQuestionCount && errors.customQuestionCount && (
                      <p className="validation-error-msg" role="alert">
                        <AlertCircle size={13} /> {errors.customQuestionCount}
                      </p>
                    )}
                    <small className="field-hint">Choose between 3 and 50 questions.</small>
                  </div>
                )}
              </div>

              {/* --------------------------------------------------
                  HOST PARTICIPATION PREFERENCE
                  (Shown only when Friends mode is selected)
                 -------------------------------------------------- */}
              {config.mode === 'friends' && (
                <div className="form-section host-role-section">
                  <div className="form-section-title">
                    <div>
                      <span>Host Participation</span>
                      <p className="section-subtext">Decide if you will compete as a player or oversee as a spectator.</p>
                    </div>
                    <span className="role-badge">Host preference</span>
                  </div>

                  <div className="host-role-grid" role="radiogroup" aria-label="Host Participation Role">
                    {HOST_ROLES.map(role => {
                      const isSelected = config.hostRole === role.id;
                      const Icon = role.id === 'player' ? Gamepad2 : Eye;
                      return (
                        <button
                          type="button"
                          key={role.id}
                          role="radio"
                          aria-checked={isSelected}
                          onClick={() => updateField('hostRole', role.id)}
                          className={`host-role-card ${isSelected ? 'selected' : ''}`}
                        >
                          <div className="host-role-header">
                            <Icon size={18} />
                            <b>{role.title}</b>
                            <span className="role-tagline">{role.tagline}</span>
                            <i className="role-check" aria-hidden="true">
                              {isSelected && <Check size={12} />}
                            </i>
                          </div>
                          <p>{role.description}</p>
                        </button>
                      );
                    })}
                  </div>

                  <div className="host-role-note">
                    <Tv size={14} />
                    <span>
                      Spectator role UI preference is saved for room creation; full spectator permission enforcement activates in Phase 3.
                    </span>
                  </div>
                </div>
              )}

              {/* --------------------------------------------------
                  CONFIGURATION SUMMARY PREVIEW
                 -------------------------------------------------- */}
              <div className="game-summary-card">
                <div className="summary-header">
                  <Sparkles size={16} />
                  <b>Configuration Summary</b>
                </div>
                <div className="summary-chips">
                  <span className="summary-chip mode">
                    {config.mode === 'solo' ? <User size={13} /> : <Users size={13} />}
                    {config.mode === 'solo' ? 'Solo Mode' : 'Friends Mode'}
                  </span>
                  <span className="summary-chip cefr">
                    <b>{currentCefr.label}</b> {currentCefr.title}
                  </span>
                  <span className="summary-chip topic">
                    📖 {effectiveTopicLabel}
                  </span>
                  <span className="summary-chip duration">
                    <Clock size={13} /> {effectiveDurationMinutes} min
                  </span>
                  <span className="summary-chip questions">
                    <ListChecks size={13} /> {effectiveQuestionCount} Qs
                  </span>
                  {config.mode === 'friends' && (
                    <span className="summary-chip role">
                      {config.hostRole === 'player' ? <Gamepad2 size={13} /> : <Eye size={13} />}
                      {config.hostRole === 'player' ? 'Playing Host' : 'Spectating Host'}
                    </span>
                  )}
                </div>
              </div>

              {/* --------------------------------------------------
                  CREATE FOOTER & ACTIONS
                 -------------------------------------------------- */}
              <div className="create-footer">
                <span className="security-notice">
                  <Lock size={14} />
                  {config.mode === 'friends'
                    ? 'Private room. Your code, your crew.'
                    : 'Solo practice. Focused, personal learning.'}
                </span>

                <button
                  type="submit"
                  className="button dark create-submit-btn"
                  disabled={busy || !isConfigValid}
                >
                  {busy ? (
                    <Loader2 className="spin" size={17} />
                  ) : (
                    <>
                      <Plus size={18} />
                      {config.mode === 'friends' ? 'Create a game' : 'Start game'}
                    </>
                  )}
                </button>
              </div>

            </form>
          </section>

        </div>

        {/* ====================================================
            SIDEBAR GUIDE (Onboarding field guide)
           ==================================================== */}
        <aside className="game-sidebar">
          <section className="howto-card yellow" aria-labelledby="howto-heading">
            <span className="howto-icon" aria-hidden="true">✦</span>
            <span className="eyebrow">A QUICK FIELD GUIDE</span>
            <h2 id="howto-heading">Good times,<br />in three steps.</h2>

            {[
              [
                '1',
                'Choose your mode',
                'Play independently in Solo mode, or launch a Friends lobby and share your unique 6-character room code.',
              ],
              [
                '2',
                'Tailor your challenge',
                'Select international CEFR levels (Pre-A1 to C2), choose rich curated topics or craft custom topics, and dial in time and questions.',
              ],
              [
                '3',
                'Compete or spectate',
                'In Friends mode, hosts can join the trivia race as an active player or spectate the live scoreboard from above.',
              ],
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
              <span>
                <b>Phase 2 Onboarding</b>
                <br />
                Clean responsive controls, standard CEFR mapping, and full validation are active.
              </span>
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

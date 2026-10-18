import React, { useState, useEffect } from 'react';
import { Headphones, Mic, Volume2, Bot, Sparkles, Trophy, Zap, Flame, Loader2 } from 'lucide-react';
import { ListeningLab } from './ListeningLab.jsx';
import { SpeakingStudio } from './SpeakingStudio.jsx';
import { PronunciationCoach } from './PronunciationCoach.jsx';
import { AIConversationTutor } from './AIConversationTutor.jsx';
import './practice.css';

export function PracticeHub({ progress, updateProgress, api }) {
  const [activeTab, setActiveTab] = useState('listening'); // 'listening' | 'speaking' | 'pronunciation' | 'ai'
  const [catalog, setCatalog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    api('/practice/catalog')
      .then(data => {
        if (!active) return;
        setCatalog(data);
        setLoading(false);
      })
      .catch(err => {
        if (!active) return;
        setError(err.message || 'Failed to load practice catalog.');
        setLoading(false);
      });

    return () => { active = false; };
  }, []);

  const practiceStats = progress?.practice || { listening: [], speaking: [], pronunciation: [], conversation: [] };
  const totalCompletedPractice =
    (practiceStats.listening?.length || 0) +
    (practiceStats.speaking?.length || 0) +
    (practiceStats.pronunciation?.length || 0) +
    (practiceStats.conversation?.length || 0);

  if (loading) {
    return (
      <div className="practice-page" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '350px' }}>
        <Loader2 className="spin" size={36} color="#455f35" />
        <p style={{ color: '#57674e', marginTop: '14px' }}>Opening your English Practice Studio…</p>
      </div>
    );
  }

  if (error || !catalog) {
    return (
      <div className="practice-page">
        <div className="form-error" role="alert">
          {error || 'Unable to load practice catalog.'}
        </div>
      </div>
    );
  }

  return (
    <div className="practice-page">
      {/* 1. Header Banner */}
      <section className="practice-banner">
        <div>
          <span className="pill white">
            <Sparkles size={14} /> PHASE 11 · MULTIMODAL ENGLISH PRACTICE
          </span>
          <h2>Listen, Speak & Converse.<br />Language practice that feels alive.</h2>
          <p>
            Train your ears with natural audio passages, hone your voice with speech recognition,
            test pronunciation clarity, and practice realistic conversations.
          </p>
          <div className="practice-stats-pills">
            <span><Headphones size={15} /> 9 Listening Passages</span>
            <span><Mic size={15} /> 4 Speaking Challenges</span>
            <span><Volume2 size={15} /> 6 Pronunciation Targets</span>
            <span><Bot size={15} /> 5 Conversation Scenarios</span>
            <span><Trophy size={15} /> {totalCompletedPractice} Mastered</span>
          </div>
        </div>
      </section>

      {/* 2. Interactive Navigation Tabs */}
      <nav className="practice-nav-tabs" role="tablist" aria-label="Practice capabilities">
        <button
          role="tab"
          aria-selected={activeTab === 'listening'}
          className={`practice-tab-btn ${activeTab === 'listening' ? 'active' : ''}`}
          onClick={() => setActiveTab('listening')}
        >
          <Headphones size={17} />
          <span>Listening Lab</span>
          <span className="practice-tab-badge">{catalog.listening.length}</span>
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'speaking'}
          className={`practice-tab-btn ${activeTab === 'speaking' ? 'active' : ''}`}
          onClick={() => setActiveTab('speaking')}
        >
          <Mic size={17} />
          <span>Speaking Studio</span>
          <span className="practice-tab-badge">{catalog.speaking.length}</span>
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'pronunciation'}
          className={`practice-tab-btn ${activeTab === 'pronunciation' ? 'active' : ''}`}
          onClick={() => setActiveTab('pronunciation')}
        >
          <Volume2 size={17} />
          <span>Pronunciation Coach</span>
          <span className="practice-tab-badge">{catalog.pronunciation.length}</span>
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'ai'}
          className={`practice-tab-btn ${activeTab === 'ai' ? 'active' : ''}`}
          onClick={() => setActiveTab('ai')}
        >
          <Bot size={17} />
          <span>AI Conversation Tutor</span>
          <span className="practice-tab-badge">{catalog.scenarios.length}</span>
        </button>
      </nav>

      {/* 3. Active Experience Component */}
      {activeTab === 'listening' && (
        <ListeningLab
          modules={catalog.listening}
          api={api}
          updateProgress={updateProgress}
          userCompleted={practiceStats.listening || []}
        />
      )}

      {activeTab === 'speaking' && (
        <SpeakingStudio
          prompts={catalog.speaking}
          api={api}
          updateProgress={updateProgress}
          userCompleted={practiceStats.speaking || []}
        />
      )}

      {activeTab === 'pronunciation' && (
        <PronunciationCoach
          items={catalog.pronunciation}
          api={api}
          updateProgress={updateProgress}
          userCompleted={practiceStats.pronunciation || []}
        />
      )}

      {activeTab === 'ai' && (
        <AIConversationTutor
          scenarios={catalog.scenarios}
          api={api}
          updateProgress={updateProgress}
          userCompleted={practiceStats.conversation || []}
        />
      )}
    </div>
  );
}

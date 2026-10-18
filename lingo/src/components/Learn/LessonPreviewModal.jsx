import React, { useState, useEffect } from 'react';
import { X, Lock, Sparkles, Clock, Zap, Target, CheckCircle2, Trophy, ArrowRight, ShieldCheck, BookOpen } from 'lucide-react';

export function LessonPreviewModal({ lesson, onClose, onStartReal, isLocked, prerequisiteName }) {
  if (!lesson) return null;

  const [curriculumData, setCurriculumData] = useState(null);
  const isCheckpoint = lesson.isCheckpoint;
  const targetId = lesson.realLessonId || lesson.id;

  useEffect(() => {
    let active = true;
    if (targetId && !isCheckpoint) {
      fetch(`/api/curriculum/lessons/${encodeURIComponent(targetId)}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (active && data) setCurriculumData(data);
        })
        .catch(() => {});
    }
    return () => { active = false; };
  }, [targetId, isCheckpoint]);

  const primaryObj = curriculumData?.primaryObjective;

  return (
    <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal lesson-preview-modal" role="dialog" aria-modal="true" aria-labelledby="preview-modal-title">
        <button className="modal-close icon-button" onClick={onClose} aria-label="Close dialog">
          <X size={20} />
        </button>

        <div className="preview-modal-icon-wrap">
          <span className={`preview-modal-badge ${lesson.color || 'lime'} ${isCheckpoint ? 'checkpoint-badge' : ''}`}>
            {isCheckpoint ? <Trophy size={28} /> : (lesson.icon || '📖')}
          </span>
          <div className="preview-modal-meta">
            <span className="eyebrow">
              {isCheckpoint ? 'MILESTONE ASSESSMENT' : (curriculumData?.levelCode ? `${curriculumData.levelCode} · ${lesson.levelLabel || 'LESSON'}` : (lesson.levelLabel || (lesson.type ? lesson.type.toUpperCase() : 'LESSON PREVIEW')))}
            </span>
            <h2 id="preview-modal-title">{curriculumData?.title || lesson.title}</h2>
            <p className="preview-modal-subtitle">{curriculumData?.subtitle || lesson.subtitle}</p>
          </div>
        </div>

        <div className="preview-tags-row">
          {(curriculumData?.estimatedDurationMin ? `${curriculumData.estimatedDurationMin} min` : lesson.duration) && (
            <span className="pill outline">
              <Clock size={13} /> {curriculumData?.estimatedDurationMin ? `${curriculumData.estimatedDurationMin} min` : lesson.duration}
            </span>
          )}
          {(curriculumData?.xp || lesson.xp) && (
            <span className="pill white">
              <Zap size={13} /> +{curriculumData?.xp || lesson.xp} XP
            </span>
          )}
          {(curriculumData?.pedagogicalFocus || lesson.type) && (
            <span className="pill translucent">
              <Sparkles size={13} /> {curriculumData?.pedagogicalFocus || lesson.type}
            </span>
          )}
          {lesson.realLessonId ? (
            <span className="pill lime-pill">
              <CheckCircle2 size={13} /> Interactive Experience Ready
            </span>
          ) : (
            <span className="pill outline demo-pill">
              Curriculum Roadmap
            </span>
          )}
        </div>

        <div className="preview-modal-body">
          <p className="preview-description">
            {curriculumData?.description || lesson.description || 'Practice core English vocabulary, pronunciation patterns, and conversational agility.'}
          </p>

          {isLocked ? (
            <div className="preview-locked-callout">
              <Lock size={18} />
              <div>
                <b>This lesson is locked</b>
                <p>Complete {prerequisiteName || 'the previous lesson'} to unlock this practice.</p>
              </div>
            </div>
          ) : primaryObj ? (
            <div className="preview-objectives-box">
              <div className="objectives-title">
                <Target size={16} />
                <span>Target Objective: {primaryObj.title}</span>
              </div>
              <p className="preview-objective-desc">{primaryObj.description}</p>
              {primaryObj.cefrDescriptor && (
                <div className="preview-cando-statement">
                  <CheckCircle2 size={15} />
                  <span><b>CEFR Can-Do Outcome:</b> {primaryObj.cefrDescriptor}</span>
                </div>
              )}
            </div>
          ) : lesson.objective ? (
            <div className="preview-objectives-box">
              <div className="objectives-title">
                <Target size={16} />
                <span>Learning Objective</span>
              </div>
              <p className="preview-objective-desc">{lesson.objective}</p>
            </div>
          ) : null}

          {!lesson.realLessonId && !isCheckpoint && (
            <div className="preview-demo-note">
              <Sparkles size={16} />
              <div>
                <b>Curriculum Roadmap Placeholder</b>
                <p>This level is part of Lingo’s global CEFR roadmap. Interactive teaching and exercises for this stage are planned for upcoming releases.</p>
              </div>
            </div>
          )}
        </div>

        <div className="preview-modal-actions">
          {lesson.realLessonId && !isLocked ? (
            <button className="button dark full-width" onClick={() => { onClose(); onStartReal(lesson); }}>
              Start interactive lesson <ArrowRight size={17} />
            </button>
          ) : (
            <button className="button light full-width" onClick={onClose}>
              Back to learning path
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

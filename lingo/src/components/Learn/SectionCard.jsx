import React, { useState } from 'react';
import { UnitGroup } from './UnitGroup.jsx';
import { getSectionLessons } from '../../curriculumData.js';
import { ChevronDown, ChevronUp, BookOpen, Layers } from 'lucide-react';

export function SectionCard({
  section,
  userCompleted = [],
  activeLessonId,
  onSelectLesson,
  defaultExpanded = true
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Compute total lessons in section using the unified helper
  const units = section.units || [];
  const sectionLessons = getSectionLessons(section);
  const totalLessons = sectionLessons.length;
  const completedLessons = sectionLessons.filter(l =>
    userCompleted.includes(l.realLessonId || l.id)
  ).length;

  return (
    <section className="section-container" aria-labelledby={`section-title-${section.id}`}>
      {/* Section Banner Header */}
      <div
        className="section-banner-header"
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
      >
        <div className="section-badge-cluster">
          <span className="section-tag-badge">
            SECTION {section.sectionNumber}
          </span>
          <span className="section-units-count">
            {units.length} {units.length === 1 ? 'Unit' : 'Units'} · {totalLessons} Lessons
          </span>
        </div>

        <div className="section-title-wrap">
          <h2 id={`section-title-${section.id}`}>{section.title}</h2>
          {section.tagline && <p className="section-tagline">{section.tagline}</p>}
        </div>

        <div className="section-header-actions">
          <span className="section-progress-pill">
            {completedLessons} / {totalLessons} completed
          </span>
          <button
            type="button"
            className="icon-button section-toggle-btn"
            aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
            onClick={e => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>

      {/* Collapsible Section Content */}
      {isExpanded && (
        <div className="section-units-container">
          {section.description && (
            <p className="section-description-text">{section.description}</p>
          )}

          <div className="section-units-list">
            {units.map(unit => (
              <UnitGroup
                key={unit.id}
                unit={unit}
                userCompleted={userCompleted}
                activeLessonId={activeLessonId}
                onSelectLesson={onSelectLesson}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

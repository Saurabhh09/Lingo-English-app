import React from 'react';
import { LessonNode } from './LessonNode.jsx';
import { getLessonStatus } from '../../curriculumData.js';

export function CoursePath({
  lessons = [],
  userCompleted = [],
  activeLessonId,
  onSelectLesson,
  unitCompleted
}) {
  // Sequence of horizontal offsets to create a friendly, readable winding rhythm
  const alignments = ['center', 'left', 'center', 'right'];

  return (
    <div className="course-path-container">
      {/* Decorative vertical trail connector */}
      <div className="path-trail-line" aria-hidden="true" />

      <div className="path-nodes-flow">
        {lessons.map((lesson, idx) => {
          const status = getLessonStatus(lesson, userCompleted, activeLessonId);
          const alignment = alignments[idx % alignments.length];

          // Determine prerequisite text
          let prerequisiteName = '';
          if (idx > 0) {
            prerequisiteName = lessons[idx - 1].title;
          }

          return (
            <React.Fragment key={lesson.id || idx}>
              <LessonNode
                lesson={lesson}
                index={idx}
                status={status}
                alignment={alignment}
                prerequisiteName={prerequisiteName}
                onClick={() => onSelectLesson(lesson, status, prerequisiteName)}
              />
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

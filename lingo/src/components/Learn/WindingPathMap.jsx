import React, { useMemo } from 'react';
import {
  Sparkles, Trophy, Lock, Check, Star, Play,
  Home, Sun, Leaf, Utensils, Clock, Users,
  Globe, BookOpen, Compass, Heart, Smile, Layers,
  Coffee, Music, MessageCircle, AlertCircle
} from 'lucide-react';
import { getLessonStatus, realLessons } from '../../curriculumData.js';
import { Mascot } from '../../Art.jsx';

// Map lesson titles/types to appropriate themed icons matching the reference design
function getNodeIcon(lesson) {
  if (lesson.isCheckpoint) return <Trophy size={28} className="node-icon-svg" />;

  const title = (lesson.title || '').toLowerCase();
  const desc = (lesson.description || '').toLowerCase();
  const type = (lesson.type || '').toLowerCase();

  if (title.includes('home') || title.includes('family') || desc.includes('family') || title.includes('house')) {
    return <Home size={26} className="node-icon-svg" />;
  }
  if (title.includes('weather') || title.includes('sky') || desc.includes('rain') || desc.includes('sun')) {
    return <Sun size={26} className="node-icon-svg" />;
  }
  if (title.includes('nature') || title.includes('plant') || desc.includes('green') || title.includes('garden')) {
    return <Leaf size={26} className="node-icon-svg" />;
  }
  if (title.includes('food') || title.includes('kitchen') || title.includes('bakery') || title.includes('drink') || desc.includes('restaurant')) {
    return <Utensils size={26} className="node-icon-svg" />;
  }
  if (title.includes('time') || title.includes('clock') || desc.includes('hour') || title.includes('schedule')) {
    return <Clock size={26} className="node-icon-svg" />;
  }
  if (title.includes('people') || title.includes('friend') || title.includes('community') || desc.includes('friends')) {
    return <Users size={26} className="node-icon-svg" />;
  }
  if (title.includes('world') || title.includes('travel') || title.includes('geography') || title.includes('space') || title.includes('ocean')) {
    return <Globe size={26} className="node-icon-svg" />;
  }
  if (title.includes('mood') || title.includes('emotion') || title.includes('feel') || desc.includes('happy')) {
    return <Smile size={26} className="node-icon-svg" />;
  }
  if (title.includes('sentence') || title.includes('grammar') || title.includes('structure')) {
    return <Layers size={26} className="node-icon-svg" />;
  }
  if (title.includes('hello') || title.includes('greeting') || title.includes('conversation')) {
    return <MessageCircle size={26} className="node-icon-svg" />;
  }
  if (type.includes('vocabulary') || title.includes('word')) {
    return <BookOpen size={26} className="node-icon-svg" />;
  }

  // Fallback to the lesson's own icon or Sparkles
  if (lesson.icon && typeof lesson.icon === 'string' && lesson.icon.length <= 2) {
    return <span className="node-icon-emoji">{lesson.icon}</span>;
  }
  return <Sparkles size={26} className="node-icon-svg" />;
}

// Colors for nodes matching the reference image (Orange, Blue, Purple, Green, Gold)
const NODE_COLOR_PALETTES = [
  { name: 'orange', fill: '#f97316', ring: '#ea580c', shadow: '#c2410c' },
  { name: 'blue', fill: '#0ea5e9', ring: '#0284c7', shadow: '#0369a1' },
  { name: 'purple', fill: '#a855f7', ring: '#9333ea', shadow: '#7e22ce' },
  { name: 'green', fill: '#22c55e', ring: '#16a34a', shadow: '#15803d' },
  { name: 'yellow', fill: '#eab308', ring: '#ca8a04', shadow: '#a16207' },
  { name: 'rose', fill: '#f43f5e', ring: '#e11d48', shadow: '#be123c' },
];

export function WindingPathMap({
  activeLevel,
  userCompleted = [],
  activeLessonId = null,
  onSelectLesson,
}) {
  // 1. Flatten all lessons across all sections of this CEFR level into a continuous path sequence
  const { pathItems, totalHeight, svgCurvePath } = useMemo(() => {
    const items = [];
    let currentY = 210; // Placed comfortably below the sticky course header (height ~100px) so the first section signboard renders with ample breathing room
    const STEP_Y = 96; // Tighter vertical stepping for an organic, cohesive game trail
    const SECTION_EXTRA_Y = 110; // Extra clearance when introducing a new section signboard

    let lessonIndex = 0;

    activeLevel.sections.forEach((section, sIdx) => {
      // Determine all lessons in this section
      const sectionLessons = [];
      section.units.forEach(unit => {
        unit.lessons.forEach(l => {
          sectionLessons.push({
            ...l,
            unitTitle: unit.title,
            sectionId: section.id,
            sectionNumber: section.sectionNumber,
            sectionTitle: section.title,
            sectionTagline: section.tagline,
          });
        });
      });

      sectionLessons.forEach((lesson, lIdx) => {
        const isSectionStart = lIdx === 0;

        if (isSectionStart && sIdx > 0) {
          currentY += SECTION_EXTRA_Y;
        }

        // S-curve wave calculation: alternates left, center, right organically
        // 50% is center. 22% amplitude keeps it comfortably between 28% and 72% across all phone screens.
        const xPercent = Math.round(50 + 22 * Math.sin(lessonIndex * 1.35));
        const y = currentY;

        const colorIndex = (lessonIndex + sIdx) % NODE_COLOR_PALETTES.length;
        const colorPalette = lesson.isCheckpoint
          ? { name: 'gold', fill: '#eab308', ring: '#ca8a04', shadow: '#a16207' }
          : NODE_COLOR_PALETTES[colorIndex];

        items.push({
          lesson,
          index: lessonIndex,
          sectionIndex: sIdx,
          isSectionStart,
          sectionNumber: section.sectionNumber,
          sectionTitle: section.title,
          sectionTagline: section.tagline,
          x: xPercent,
          y,
          colorPalette,
        });

        currentY += STEP_Y;
        lessonIndex++;
      });
    });

    // 2. Generate smooth cubic bezier SVG path connecting all (x, y) coordinates
    // We assume an SVG coordinate space of width 400 (and map xPercent directly to 4 * xPercent)
    let pathD = '';
    if (items.length > 0) {
      const coords = items.map(item => ({
        x: item.x * 4, // 0 to 400
        y: item.y,
      }));

      pathD = `M ${coords[0].x} ${coords[0].y}`;
      for (let i = 1; i < coords.length; i++) {
        const prev = coords[i - 1];
        const curr = coords[i];
        const dy = curr.y - prev.y;
        // Cubic bezier control points smoothly guiding the road curve
        const cp1x = prev.x;
        const cp1y = prev.y + dy * 0.52;
        const cp2x = curr.x;
        const cp2y = curr.y - dy * 0.52;
        pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
      }
    }

    const calculatedTotalHeight = currentY + 70; // Tight clearance for finish milestone without dead space

    return {
      pathItems: items,
      totalHeight: calculatedTotalHeight,
      svgCurvePath: pathD,
    };
  }, [activeLevel]);

  // Determine biome class based on CEFR level
  const biomeTheme = useMemo(() => {
    switch (activeLevel.id) {
      case 'a2':
        return 'biome-desert';
      case 'b1':
        return 'biome-ocean';
      case 'b2':
        return 'biome-autumn';
      case 'c1':
      case 'c2':
        return 'biome-mountain';
      case 'pre-a1':
      case 'a1':
      default:
        return 'biome-green';
    }
  }, [activeLevel.id]);

  return (
    <div className={`winding-path-wrapper ${biomeTheme}`} style={{ minHeight: `${totalHeight}px` }}>
      {/* 1. Themed Game Biome Background Scenery */}
      <div className="biome-scenery-layer" aria-hidden="true">
        {biomeTheme === 'biome-green' ? (
          /* Lush rolling green meadow & hills matching Left reference screenshot */
          <svg className="biome-svg-bg" viewBox="0 0 400 1200" preserveAspectRatio="none" fill="none">
            <defs>
              <linearGradient id="greenSky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#c8f3a3" />
                <stop offset="35%" stopColor="#9be564" />
                <stop offset="70%" stopColor="#75ce3b" />
                <stop offset="100%" stopColor="#55b822" />
              </linearGradient>
              <linearGradient id="riverWater" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#0284c7" />
              </linearGradient>
            </defs>
            <rect width="400" height="1200" fill="url(#greenSky)" />

            {/* Rolling hills contours */}
            <path d="M-20 180 Q80 120 200 160 T420 140 L420 1200 L-20 1200 Z" fill="#6bc834" opacity="0.6" />
            <path d="M-20 420 Q120 360 260 410 T420 380 L420 1200 L-20 1200 Z" fill="#58be23" opacity="0.65" />
            <path d="M-20 740 Q90 680 230 720 T420 700 L420 1200 L-20 1200 Z" fill="#4bae18" opacity="0.75" />

            {/* Stylized trees & decorative bushes on hillsides */}
            <g opacity="0.85">
              <ellipse cx="340" cy="220" rx="18" ry="24" fill="#f59e0b" />
              <ellipse cx="360" cy="235" rx="14" ry="18" fill="#fbbf24" />
              <ellipse cx="50" cy="380" rx="16" ry="22" fill="#ec4899" />
              <ellipse cx="68" cy="395" rx="12" ry="16" fill="#f472b6" />
              <ellipse cx="345" cy="580" rx="18" ry="24" fill="#3b82f6" />
              <ellipse cx="40" cy="850" rx="20" ry="26" fill="#10b981" />
              <ellipse cx="350" cy="980" rx="16" ry="22" fill="#84cc16" />
            </g>

            {/* River at bottom as seen in reference screenshot */}
            <path d="M-20 1080 Q100 1020 180 1060 T420 1040 L420 1200 L-20 1200 Z" fill="#0284c7" />
            <path d="M-20 1100 Q80 1050 170 1085 T420 1070 L420 1200 L-20 1200 Z" fill="url(#riverWater)" />
          </svg>
        ) : (
          /* Warm Desert canyon dunes matching Right reference screenshot */
          <svg className="biome-svg-bg" viewBox="0 0 400 1200" preserveAspectRatio="none" fill="none">
            <defs>
              <linearGradient id="desertSky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fef3c7" />
                <stop offset="40%" stopColor="#fde68a" />
                <stop offset="75%" stopColor="#fcd34d" />
                <stop offset="100%" stopColor="#fbbf24" />
              </linearGradient>
            </defs>
            <rect width="400" height="1200" fill="url(#desertSky)" />
            <path d="M-20 220 Q110 160 230 200 T420 180 L420 1200 L-20 1200 Z" fill="#f59e0b" opacity="0.3" />
            <path d="M-20 540 Q90 480 250 530 T420 500 L420 1200 L-20 1200 Z" fill="#d97706" opacity="0.35" />
            <path d="M-20 860 Q120 800 240 850 T420 820 L420 1200 L-20 1200 Z" fill="#b45309" opacity="0.4" />

            {/* Stylized Cacti */}
            <g fill="#15803d" opacity="0.8">
              <rect x="42" y="270" width="8" height="32" rx="4" />
              <path d="M36 280 H42 V292 H36 Z" />
              <rect x="345" y="610" width="8" height="34" rx="4" />
              <rect x="46" y="940" width="8" height="30" rx="4" />
            </g>
          </svg>
        )}
      </div>

      {/* 2. Continuous Winding SVG Road Path Ribbon */}
      <svg
        className="winding-road-svg"
        viewBox={`0 0 400 ${totalHeight}`}
        style={{ height: `${totalHeight}px` }}
        preserveAspectRatio="none"
      >
        {/* Soft road shadow on the terrain */}
        <path
          d={svgCurvePath}
          fill="none"
          stroke="rgba(0, 0, 0, 0.12)"
          strokeWidth="28"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Outer road border edge */}
        <path
          d={svgCurvePath}
          fill="none"
          stroke={biomeTheme === 'biome-desert' ? '#f59e0b' : '#a3e635'}
          strokeWidth="24"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Main continuous road surface ribbon (creamy walking trail) */}
        <path
          d={svgCurvePath}
          fill="none"
          stroke={biomeTheme === 'biome-desert' ? '#fffbeb' : '#fffbeb'}
          strokeWidth="18"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Center dashed trail markers */}
        <path
          d={svgCurvePath}
          fill="none"
          stroke={biomeTheme === 'biome-desert' ? 'rgba(217, 119, 6, 0.25)' : 'rgba(101, 163, 13, 0.28)'}
          strokeWidth="3.5"
          strokeDasharray="6 8"
          strokeLinecap="round"
        />
      </svg>

      {/* 3. Section Milestone Landmark Banners & Stepping Stone Lesson Nodes */}
      <div className="winding-nodes-container" style={{ height: `${totalHeight}px` }}>
        {pathItems.map((item) => {
          const { lesson, index, isSectionStart, sectionNumber, sectionTitle, sectionTagline, x, y, colorPalette } = item;
          const status = getLessonStatus(lesson, userCompleted, activeLessonId);
          const isCompleted = status === 'completed';
          const isCurrent = status === 'current';
          const isLocked = status === 'locked';

          return (
            <React.Fragment key={lesson.id || index}>
              {/* Section Landmark Signboard (Rendered when crossing into a new section) */}
              {isSectionStart && (
                <div
                  className="section-milestone-signboard"
                  style={{ top: `${y - 68}px` }}
                >
                  <div className="signboard-inner">
                    <span className="signboard-badge">SECTION {sectionNumber}</span>
                    <strong className="signboard-title">{sectionTitle}</strong>
                    <span className="signboard-tagline">{sectionTagline}</span>
                  </div>
                </div>
              )}

              {/* Circular Stepping Stone Node */}
              <div
                className={`winding-node-anchor ${isCurrent ? 'is-current-anchor' : ''}`}
                style={{ left: `${x}%`, top: `${y}px` }}
              >
                {/* Active Lesson Pulse Halo Ring & Mascot Cheer */}
                {isCurrent && (
                  <>
                    <div className="node-current-pulse-ring" />
                    <div className="node-mascot-cheer">
                      <div className="mascot-speech-bubble">
                        <span>START!</span>
                      </div>
                      <Mascot pose="walk" size={48} className="node-mascot-sprout" />
                    </div>
                  </>
                )}

                {/* Main 3D Node Button (Matching Circular Badges in Reference) */}
                <button
                  className={`winding-circle-btn color-${colorPalette.name} ${status} ${lesson.isCheckpoint ? 'is-checkpoint' : ''}`}
                  onClick={() => onSelectLesson(lesson, status, item.sectionTitle)}
                  aria-label={`${lesson.title} (${status})`}
                  title={`${lesson.title} · ${lesson.type || ''}`}
                >
                  {/* Inner Icon Circle */}
                  <div className="node-inner-circle">
                    {getNodeIcon(lesson)}
                  </div>

                  {/* Top-Right Star / State Badge (Matching Reference ⭐1, ⭐2, etc.) */}
                  <div className={`node-corner-star-badge ${isCompleted ? 'completed-star' : isLocked ? 'locked-badge' : 'active-star'}`}>
                    {isCompleted ? (
                      <Check size={12} strokeWidth={3.5} />
                    ) : isLocked ? (
                      <Lock size={11} strokeWidth={2.5} />
                    ) : (
                      <>
                        <Star size={10} fill="currentColor" strokeWidth={0} />
                        <span className="star-level-num">{(index % 3) + 1}</span>
                      </>
                    )}
                  </div>
                </button>

                {/* Topic Label under the node */}
                <div className="node-label-wrap">
                  <span className="node-title-pill">
                    {lesson.title}
                  </span>
                </div>
              </div>
            </React.Fragment>
          );
        })}

        {/* 4. Level Finish Line / Milestone Island */}
        <div
          className="level-finish-island"
          style={{ top: `${totalHeight - 85}px` }}
        >
          <div className="finish-island-card">
            <span className="finish-island-trophy">🏆</span>
            <div className="finish-island-text">
              <strong>{activeLevel.code} Mastery Milestone</strong>
              <small>Complete all sections to conquer {activeLevel.name}!</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useId } from 'react';

const PALETTES = {
  green: {
    rimLight: '#a6f45c',
    rimDark: '#3c9602',
    faceTop: '#7be422',
    faceBottom: '#43a902',
    ribbonMain: '#58cc02',
    ribbonFold: '#2f7a01',
    glow: 'rgba(88, 204, 2, 0.35)'
  },
  blue: {
    rimLight: '#7cd9ff',
    rimDark: '#1277b0',
    faceTop: '#3cc5ff',
    faceBottom: '#168fd1',
    ribbonMain: '#1cb0f6',
    ribbonFold: '#0e6694',
    glow: 'rgba(28, 176, 246, 0.35)'
  },
  gold: {
    rimLight: '#ffe97d',
    rimDark: '#c78300',
    faceTop: '#ffd93d',
    faceBottom: '#f09e00',
    ribbonMain: '#ffb800',
    ribbonFold: '#b06d00',
    glow: 'rgba(255, 196, 0, 0.4)'
  },
  orange: {
    rimLight: '#ffbe6b',
    rimDark: '#c94f00',
    faceTop: '#ffa336',
    faceBottom: '#e86400',
    ribbonMain: '#ff7b00',
    ribbonFold: '#ad4400',
    glow: 'rgba(255, 136, 0, 0.38)'
  },
  purple: {
    rimLight: '#e3b8ff',
    rimDark: '#7a2ec2',
    faceTop: '#c484ff',
    faceBottom: '#9040e0',
    ribbonMain: '#a855f7',
    ribbonFold: '#6620a8',
    glow: 'rgba(168, 85, 247, 0.36)'
  }
};

function renderCenterGlyph(icon) {
  switch (icon) {
    case 'unit_book_check':
      return (
        <g>
          <path d="M35 42c0-3 2-5 5-5h11v27H40c-3 0-5 2-5 4V42Zm30 0c0-3-2-5-5-5H49v27h11c3 0 5 2 5 4V42Z" fill="#fff" opacity="0.96" />
          <path d="M51 48l4 4 8-8" fill="none" stroke="#2f7a01" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      );
    case 'unit_compass':
    case 'section_compass':
    case 'cefr_compass_b1':
      return (
        <g>
          <circle cx="50" cy="49" r="15" fill="#fff" opacity="0.95" />
          <circle cx="50" cy="49" r="11" fill="none" stroke="rgba(0,0,0,0.14)" strokeWidth="1.5" />
          <path d="M50 38l4 10-4 11-4-11 4-10Z" fill="#ef4444" />
          <path d="M50 49l4 10-4-3-4 3 4-10Z" fill="#1e293b" />
          <circle cx="50" cy="49" r="2" fill="#fff" />
        </g>
      );
    case 'unit_stack':
    case 'section_books':
      return (
        <g>
          <rect x="34" y="51" width="32" height="9" rx="3" fill="#fff" />
          <rect x="37" y="42" width="28" height="8" rx="3" fill="#fef3c7" />
          <rect x="35" y="34" width="30" height="8" rx="3" fill="#dcfce7" />
          <path d="M40 37h14M42 46h16M40 55h18" stroke="rgba(0,0,0,0.18)" strokeWidth="2" strokeLinecap="round" />
        </g>
      );
    case 'unit_puzzle':
      return (
        <path
          d="M42 36h8a4 4 0 1 1 6 0h6v10a4 4 0 1 1 0 6v10H52a4 4 0 1 0-6 0H36V52a4 4 0 1 0 0-6V36h6Z"
          fill="#ffffff"
          opacity="0.96"
        />
      );
    case 'unit_trophy':
    case 'cefr_grand_trophy':
      return (
        <g>
          <path d="M39 36h22v10c0 7-5 12-11 12s-11-5-11-12V36Z" fill="#fff" />
          <path d="M39 39h-5c0 6 2 9 5 9M61 39h5c0 6-2 9-5 9" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
          <rect x="47" y="56" width="6" height="6" fill="#fff" />
          <rect x="41" y="61" width="18" height="4" rx="2" fill="#fde047" />
        </g>
      );
    case 'unit_gem_star':
    case 'cefr_diamond_c1':
      return (
        <g>
          <polygon points="41,36 59,36 65,45 50,63 35,45" fill="#fff" opacity="0.95" />
          <polygon points="41,36 59,36 55,45 45,45" fill="rgba(255,255,255,0.45)" />
          <path d="M35 45h30M50 63l-5-18M50 63l5-18" stroke="rgba(0,0,0,0.12)" strokeWidth="1.5" />
        </g>
      );
    case 'unit_rocket':
      return (
        <g transform="rotate(35 50 49)">
          <path d="M50 32c6 6 8 15 8 24H42c0-9 2-18 8-24Z" fill="#fff" />
          <circle cx="50" cy="45" r="4" fill="#38bdf8" />
          <path d="M42 52l-6 6h6ZM58 52l6 6h-6Z" fill="#fde047" />
          <path d="M47 57l3 7 3-7" fill="#f97316" />
        </g>
      );
    case 'unit_calendar_chain':
    case 'streak_calendar':
      return (
        <g>
          <rect x="35" y="37" width="30" height="26" rx="5" fill="#fff" />
          <rect x="35" y="37" width="30" height="8" rx="3" fill="#ef4444" />
          <path d="M43 34v5M57 34v5" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
          <path d="M43 52l4 4 10-9" fill="none" stroke="#16a34a" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      );
    case 'section_flag':
      return (
        <g>
          <rect x="38" y="34" width="3.5" height="30" rx="1.7" fill="#fff" />
          <path d="M41.5 36h22l-5 7 5 7h-22V36Z" fill="#fef08a" />
        </g>
      );
    case 'section_shield':
      return (
        <g>
          <path d="M50 34l14 5v10c0 9-6 14-14 17-8-3-14-8-14-17V39l14-5Z" fill="#fff" />
          <path d="M50 41l2.8 5.6 6.2.9-4.5 4.3 1.1 6.2L50 55l-5.6 3 1.1-6.2-4.5-4.3 6.2-.9L50 41Z" fill="#facc15" />
        </g>
      );
    case 'section_bullseye':
    case 'learning_bullseye':
      return (
        <g>
          <circle cx="50" cy="49" r="14.5" fill="#fff" />
          <circle cx="50" cy="49" r="10.5" fill="#ef4444" />
          <circle cx="50" cy="49" r="6.5" fill="#fff" />
          <circle cx="50" cy="49" r="3" fill="#ef4444" />
          <path d="M62 35l-11 13" stroke="#fde047" strokeWidth="3" strokeLinecap="round" />
          <polygon points="62,33 65,37 60,38" fill="#f97316" />
        </g>
      );
    case 'section_scroll':
      return (
        <g>
          <rect x="38" y="36" width="24" height="27" rx="4" fill="#fff" />
          <circle cx="38" cy="39" r="3.5" fill="#dbeafe" />
          <circle cx="62" cy="60" r="3.5" fill="#dbeafe" />
          <path d="M43 44h14M43 50h14M43 56h9" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      );
    case 'section_crown':
    case 'cefr_grand_crown':
      return (
        <g>
          <path d="M34 57l3-17 9 7 4-11 4 11 9-7 3 17H34Z" fill="#fff" />
          <rect x="34" y="59" width="32" height="4" rx="2" fill="#fde047" />
          <circle cx="50" cy="34" r="2.5" fill="#fde047" />
        </g>
      );
    case 'cefr_sprout_cap':
      return (
        <g>
          <polygon points="50,34 68,43 50,52 32,43" fill="#fff" />
          <path d="M40 48v8c0 3 4.5 6 10 6s10-3 10-6v-8" fill="#fef08a" />
          <path d="M65 44v11" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      );
    case 'cefr_medal_a1':
      return (
        <g>
          <path d="M42 33h16l-3 10H45l-3-10Z" fill="#ef4444" />
          <circle cx="50" cy="52" r="11" fill="#fff" />
          <path d="M50 45l2 4.2 4.6.7-3.3 3.2.8 4.6L50 55.5l-4.1 2.2.8-4.6-3.3-3.2 4.6-.7L50 45Z" fill="#f59e0b" />
        </g>
      );
    case 'cefr_laurel_a2':
      return (
        <g>
          <path d="M50 37l4 8.5 9.2 1.3-6.7 6.5 1.6 9.2L50 58l-8.1 4.5 1.6-9.2-6.7-6.5 9.2-1.3L50 37Z" fill="#fff" />
        </g>
      );
    case 'cefr_torch_b2':
      return (
        <g>
          <path d="M50 31c4 5 7 9 4 14-2 3-6 3-8 0-3-4 0-9 4-14Z" fill="#fff" />
          <path d="M43 47h14l-3 16h-8l-3-16Z" fill="#fef08a" />
        </g>
      );
    case 'cefr_globe':
      return (
        <g>
          <circle cx="50" cy="49" r="14" fill="#fff" />
          <ellipse cx="50" cy="49" rx="7" ry="14" fill="none" stroke="#eab308" strokeWidth="2" />
          <path d="M36 49h28M39 42h22M39 56h22" stroke="#eab308" strokeWidth="1.8" />
        </g>
      );
    case 'cefr_mountain':
      return (
        <g>
          <polygon points="33,61 48,36 63,61" fill="#fff" />
          <polygon points="48,61 58,43 68,61" fill="#fef08a" />
          <polygon points="44,43 48,36 52,43 49,42 48,44 46,42" fill="#e2e8f0" />
        </g>
      );
    case 'streak_spark':
    case 'streak_flame':
      return (
        <g>
          <path d="M51 32c5 7 11 12 11 20a12 12 0 1 1-24 0c0-6 3-11 7-15 0 4 2 6 4 6 2 0 2-6 2-11Z" fill="#fff" />
          <path d="M50 45c3 3 5 6 5 9a5 5 0 1 1-10 0c0-3 2-6 5-9Z" fill="#fde047" />
        </g>
      );
    case 'streak_lightning':
      return (
        <polygon points="53,33 38,51 48,51 45,65 62,46 52,46" fill="#fff" />
      );
    case 'streak_phoenix':
      return (
        <g>
          <path d="M32 45c6-3 12 0 18 7 6-7 12-10 18-7-2 8-7 13-15 15l-3 5-3-5c-8-2-13-7-15-15Z" fill="#fff" />
          <circle cx="50" cy="39" r="5" fill="#fde047" />
        </g>
      );
    case 'learning_brain':
      return (
        <g>
          <path d="M48 37c-5-2-11 2-11 7-3 2-3 8 0 10 0 5 6 8 11 6V37Zm4 0c5-2 11 2 11 7 3 2 3 8 0 10 0 5-6 8-11 6V37Z" fill="#fce7f3" />
          <path d="M41 44c2 0 3 2 3 4M59 44c-2 0-3 2-3 4M42 53c2 1 4 0 4-2M58 53c-2 1-4 0-4-2" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" fill="none" />
        </g>
      );
    case 'learning_owl_book':
      return (
        <g>
          <ellipse cx="50" cy="50" rx="12" ry="13" fill="#fff" />
          <circle cx="45" cy="45" r="4" fill="#a855f7" />
          <circle cx="55" cy="45" r="4" fill="#a855f7" />
          <circle cx="45" cy="45" r="1.8" fill="#fff" />
          <circle cx="55" cy="45" r="1.8" fill="#fff" />
          <polygon points="48,49 52,49 50,53" fill="#f59e0b" />
        </g>
      );
    case 'learning_quill':
      return (
        <g>
          <path d="M62 34c-9 2-17 9-21 19l-5 9 9-4c10-4 17-12 17-24Z" fill="#fff" />
          <path d="M37 61l16-17" stroke="#9333ea" strokeWidth="2" strokeLinecap="round" />
        </g>
      );
    case 'learning_stopwatch':
      return (
        <g>
          <rect x="46" y="32" width="8" height="3.5" rx="1.5" fill="#fff" />
          <circle cx="50" cy="51" r="13" fill="#fff" />
          <path d="M50 43v8l6 3" stroke="#9333ea" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </g>
      );
    case 'learning_sun_star':
    default:
      return (
        <g>
          <path d="M50 35l4 8.5 9.2 1.3-6.7 6.5 1.6 9.2L50 56l-8.1 4.5 1.6-9.2-6.7-6.5 9.2-1.3L50 35Z" fill="#fff" />
        </g>
      );
  }
}

export function BadgeArtwork({
  icon = 'unit_book_check',
  color = 'green',
  rarity = 'common',
  locked = false,
  ribbonText = '',
  size = 86,
  className = ''
}) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const pal = PALETTES[color] || PALETTES.green;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={`badge-svg-art rarity-${rarity} ${locked ? 'is-locked' : 'is-unlocked'} ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`rim-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={pal.rimLight} />
          <stop offset="100%" stopColor={pal.rimDark} />
        </linearGradient>
        <linearGradient id={`face-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={pal.faceTop} />
          <stop offset="100%" stopColor={pal.faceBottom} />
        </linearGradient>
        <linearGradient id={`rib-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={pal.ribbonFold} />
          <stop offset="22%" stopColor={pal.ribbonMain} />
          <stop offset="78%" stopColor={pal.ribbonMain} />
          <stop offset="100%" stopColor={pal.ribbonFold} />
        </linearGradient>
      </defs>

      {/* Subtle Ambient Glow */}
      {!locked && (
        <circle cx="50" cy="50" r="42" fill={pal.glow} opacity="0.55" />
      )}

      {/* Side Laurel Wreaths */}
      <g opacity={locked ? 0.35 : 0.95}>
        <path d="M18 54c-4-7-3-16 2-22 2 6 1 14-2 22Z" fill="#65c914" />
        <path d="M15 44c-3-4-2-10 1-14 2 4 1 9-1 14Z" fill="#84e22a" />
        <path d="M19 63c-4-4-5-10-3-15 3 4 4 10 3 15Z" fill="#46a302" />
        <path d="M82 54c4-7 3-16-2-22-2 6-1 14 2 22Z" fill="#65c914" />
        <path d="M85 44c3-4 2-10-1-14-2 4-1 9 1 14Z" fill="#84e22a" />
        <path d="M81 63c4-4 5-10 3-15-3 4-4 10-3 15Z" fill="#46a302" />
      </g>

      {/* 3D Shield / Crest Base */}
      <path
        d="M50 10 L81 22 C83 23 84 25 84 27 L84 54 C84 68 69 80 50 86 C31 80 16 68 16 54 L16 27 C16 25 17 23 19 22 Z"
        fill={`url(#rim-${uid})`}
      />
      <path
        d="M50 15 L76 25.5 C77.5 26 78.5 27.5 78.5 29 L78.5 53 C78.5 64 66 74.5 50 80 C34 74.5 21.5 64 21.5 53 L21.5 29 C21.5 27.5 22.5 26 24 25.5 Z"
        fill={`url(#face-${uid})`}
      />

      {/* Glossy Top Specular Arc */}
      <path
        d="M25 29 L50 19 L75 29 C70 33 60 35 50 35 C40 35 30 33 25 29 Z"
        fill="#ffffff"
        opacity="0.22"
      />

      {/* Distinct Badge Center Symbol */}
      {renderCenterGlyph(icon)}

      {/* Bottom 3D Folded Ribbon */}
      <path d="M14 71 L24 68 L24 79 L14 82 L18 76.5 Z" fill={pal.ribbonFold} />
      <path d="M86 71 L76 68 L76 79 L86 82 L82 76.5 Z" fill={pal.ribbonFold} />
      <rect x="20" y="66" width="60" height="14" rx="4" fill={`url(#rib-${uid})`} stroke="rgba(255,255,255,0.45)" strokeWidth="1" />
      {ribbonText && (
        <text
          x="50"
          y="75.5"
          textAnchor="middle"
          fill="#ffffff"
          fontSize="7.4"
          fontWeight="900"
          fontFamily="sans-serif"
          letterSpacing="0.2px"
        >
          {ribbonText}
        </text>
      )}

      {/* Rarity Sparkles */}
      {!locked && (rarity === 'rare' || rarity === 'epic' || rarity === 'legendary') && (
        <g fill="#fef08a">
          <path d="M84 18l1.5 3.5L89 23l-3.5 1.5L84 28l-1.5-3.5L79 23l3.5-1.5Z" />
          {(rarity === 'epic' || rarity === 'legendary') && (
            <path d="M16 17l1.2 2.8L20 21l-2.8 1.2L16 25l-1.2-2.8L12 21l2.8-1.2Z" />
          )}
        </g>
      )}
    </svg>
  );
}

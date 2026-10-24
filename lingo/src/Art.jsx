import React from 'react';

/**
 * Adorable Lingo Sprout Mascot
 * Poses: 'walk', 'peek', 'read', 'listen', 'celebrate', 'cheer', 'wave'
 */
export function Mascot({ pose = 'wave', size = 80, className = '' }) {
  const s = size;
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 160 160"
      fill="none"
      className={`lingo-mascot ${className}`}
      role="img"
      aria-label="Lingo Sprout Mascot"
    >
      <defs>
        <radialGradient id="mascotBodyGrad" cx="40%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#8ee53f" />
          <stop offset="60%" stopColor="#58cc02" />
          <stop offset="100%" stopColor="#46a302" />
        </radialGradient>
        <radialGradient id="mascotLeafGrad" cx="30%" cy="20%" r="80%">
          <stop offset="0%" stopColor="#a3f752" />
          <stop offset="100%" stopColor="#4cb800" />
        </radialGradient>
        <linearGradient id="mascotBackpack" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffb03a" />
          <stop offset="100%" stopColor="#e07b00" />
        </linearGradient>
        <filter id="softMascotShadow" x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#367000" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Ground Shadow */}
      <ellipse cx="80" cy="148" rx="42" ry="7" fill="#2d4218" opacity="0.14" />

      {/* Backpack visible on side when walking or reading */}
      {(pose === 'walk' || pose === 'read') && (
        <g id="mascot-backpack" filter="url(#softMascotShadow)">
          <rect x="106" y="74" width="26" height="34" rx="10" fill="url(#mascotBackpack)" stroke="#b56200" strokeWidth="2.5" />
          <rect x="112" y="80" width="14" height="12" rx="4" fill="#ffd176" stroke="#b56200" strokeWidth="1.5" />
          {/* Straps */}
          <path d="M107 78 Q95 76 86 84" stroke="#c96d00" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M109 100 Q95 102 88 96" stroke="#c96d00" strokeWidth="3" strokeLinecap="round" fill="none" />
        </g>
      )}

      {/* Main Sprout Body */}
      <g id="mascot-body" filter="url(#softMascotShadow)">
        {/* Plump friendly pear/egg shape */}
        <path
          d="M80 34 C112 34 126 62 126 96 C126 126 108 142 80 142 C52 142 34 126 34 96 C34 62 48 34 80 34 Z"
          fill="url(#mascotBodyGrad)"
          stroke="#3d8e01"
          strokeWidth="3.5"
        />
        {/* Soft belly highlight */}
        <ellipse cx="80" cy="100" rx="30" ry="24" fill="#a4f358" opacity="0.45" />
      </g>

      {/* Leaves on top of head */}
      <g id="mascot-leaves">
        {/* Left main leaf */}
        <path
          d="M78 35 C70 12 50 10 44 20 C38 32 60 38 76 37"
          fill="url(#mascotLeafGrad)"
          stroke="#388200"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {/* Right smaller leaf */}
        <path
          d="M82 34 C94 14 116 16 118 28 C120 40 98 40 82 38"
          fill="url(#mascotLeafGrad)"
          stroke="#388200"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {/* Center stem */}
        <path d="M79 38 Q80 29 78 24" stroke="#337800" strokeWidth="3" strokeLinecap="round" />
      </g>

      {/* Rosy Blushing Cheeks */}
      <ellipse cx="56" cy="94" rx="8" ry="5.5" fill="#ff7b88" opacity="0.65" />
      <ellipse cx="104" cy="94" rx="8" ry="5.5" fill="#ff7b88" opacity="0.65" />

      {/* Eyes */}
      <g id="mascot-eyes">
        {pose === 'celebrate' || pose === 'cheer' ? (
          // Joyful curved squinting happy eyes
          <>
            <path d="M58 84 Q65 76 72 84" stroke="#1f3b06" strokeWidth="4" strokeLinecap="round" fill="none" />
            <path d="M88 84 Q95 76 102 84" stroke="#1f3b06" strokeWidth="4" strokeLinecap="round" fill="none" />
          </>
        ) : (
          // Big cute shiny eyes
          <>
            <ellipse cx="64" cy="82" rx="6.5" ry="8" fill="#1b3304" />
            <ellipse cx="96" cy="82" rx="6.5" ry="8" fill="#1b3304" />
            {/* Sparkle highlights */}
            <circle cx="62" cy="79" r="2.8" fill="#ffffff" />
            <circle cx="66" cy="84" r="1.3" fill="#ffffff" />
            <circle cx="94" cy="79" r="2.8" fill="#ffffff" />
            <circle cx="98" cy="84" r="1.3" fill="#ffffff" />
          </>
        )}
      </g>

      {/* Mouth */}
      <g id="mascot-mouth">
        {pose === 'celebrate' || pose === 'cheer' ? (
          // Big open joyful smile with tongue
          <path d="M70 94 Q80 110 90 94 Z" fill="#9e1828" stroke="#1b3304" strokeWidth="2.5" />
        ) : pose === 'listen' ? (
          // Small thoughtful 'o' mouth
          <ellipse cx="80" cy="96" rx="4" ry="4.5" fill="#1b3304" />
        ) : (
          // Friendly open smile
          <path d="M71 93 Q80 105 89 93" stroke="#1b3304" strokeWidth="3" strokeLinecap="round" fill="none" />
        )}
      </g>

      {/* Feet */}
      <g id="mascot-feet">
        {pose === 'walk' ? (
          <>
            <ellipse cx="65" cy="144" rx="10" ry="6" fill="#ffd176" stroke="#b56200" strokeWidth="2" />
            <ellipse cx="96" cy="142" rx="11" ry="6.5" fill="#ffd176" stroke="#b56200" strokeWidth="2" />
          </>
        ) : (
          <>
            <ellipse cx="66" cy="143" rx="10" ry="6" fill="#ffd176" stroke="#b56200" strokeWidth="2" />
            <ellipse cx="94" cy="143" rx="10" ry="6" fill="#ffd176" stroke="#b56200" strokeWidth="2" />
          </>
        )}
      </g>

      {/* Arms / Hands */}
      <g id="mascot-hands">
        {pose === 'wave' && (
          <>
            {/* Left arm resting */}
            <path d="M42 96 Q32 104 38 114" stroke="#3d8e01" strokeWidth="7" strokeLinecap="round" fill="none" />
            {/* Right arm waving up high */}
            <path d="M118 94 Q132 80 134 66" stroke="#3d8e01" strokeWidth="7" strokeLinecap="round" fill="none" />
            {/* Little rounded hand */}
            <circle cx="134" cy="65" r="5" fill="#58cc02" />
          </>
        )}
        {pose === 'walk' && (
          <>
            {/* Left arm waving forward */}
            <path d="M42 96 Q24 88 28 76" stroke="#3d8e01" strokeWidth="7" strokeLinecap="round" fill="none" />
            <circle cx="28" cy="76" r="5.5" fill="#58cc02" />
            {/* Right arm holding strap */}
            <path d="M118 96 Q108 102 96 100" stroke="#3d8e01" strokeWidth="6.5" strokeLinecap="round" fill="none" />
          </>
        )}
        {pose === 'peek' && (
          <>
            {/* Two cute stubby paws resting forward on top of the card ledge */}
            <ellipse cx="58" cy="120" rx="9" ry="6" fill="#58cc02" stroke="#3d8e01" strokeWidth="2.5" />
            <ellipse cx="102" cy="120" rx="9" ry="6" fill="#58cc02" stroke="#3d8e01" strokeWidth="2.5" />
          </>
        )}
        {pose === 'read' && (
          <>
            {/* Two arms holding open book in front */}
            <path d="M48 98 Q60 110 70 106" stroke="#3d8e01" strokeWidth="6.5" strokeLinecap="round" fill="none" />
            <path d="M112 98 Q100 110 90 106" stroke="#3d8e01" strokeWidth="6.5" strokeLinecap="round" fill="none" />
            {/* Open book */}
            <g transform="translate(56, 100)">
              <rect x="0" y="2" width="24" height="20" rx="3" fill="#1cb0f6" transform="rotate(-6)" />
              <rect x="24" y="0" width="24" height="20" rx="3" fill="#1899d6" transform="rotate(6)" />
              <rect x="2" y="3" width="21" height="18" rx="2" fill="#ffffff" transform="rotate(-6)" />
              <rect x="25" y="1" width="21" height="18" rx="2" fill="#f4faff" transform="rotate(6)" />
              {/* Lines in book */}
              <line x1="6" y1="8" x2="19" y2="7" stroke="#90c8eb" strokeWidth="1.5" />
              <line x1="6" y1="12" x2="19" y2="11" stroke="#90c8eb" strokeWidth="1.5" />
              <line x1="29" y1="7" x2="42" y2="8" stroke="#90c8eb" strokeWidth="1.5" />
              <line x1="29" y1="11" x2="42" y2="12" stroke="#90c8eb" strokeWidth="1.5" />
            </g>
          </>
        )}
        {pose === 'listen' && (
          <>
            {/* Big headphones on head */}
            <path d="M42 80 C36 40 124 40 118 80" stroke="#1cb0f6" strokeWidth="6" strokeLinecap="round" fill="none" />
            <rect x="34" y="68" width="12" height="24" rx="6" fill="#1cb0f6" stroke="#1899d6" strokeWidth="2" />
            <rect x="114" y="68" width="12" height="24" rx="6" fill="#1cb0f6" stroke="#1899d6" strokeWidth="2" />
            {/* Cheerful hands */}
            <path d="M44 98 Q34 108 42 116" stroke="#3d8e01" strokeWidth="6" strokeLinecap="round" fill="none" />
            <path d="M116 98 Q126 108 118 116" stroke="#3d8e01" strokeWidth="6" strokeLinecap="round" fill="none" />
          </>
        )}
        {pose === 'celebrate' && (
          <>
            {/* Both arms raised up high! */}
            <path d="M46 92 Q28 66 32 50" stroke="#3d8e01" strokeWidth="7" strokeLinecap="round" fill="none" />
            <circle cx="32" cy="49" r="6" fill="#58cc02" />
            <path d="M114 92 Q132 66 128 50" stroke="#3d8e01" strokeWidth="7" strokeLinecap="round" fill="none" />
            <circle cx="128" cy="49" r="6" fill="#58cc02" />
            {/* Little stars around */}
            <path d="M22 36 L25 43 L32 44 L27 49 L28 56 L22 52 L16 56 L17 49 L12 44 L19 43 Z" fill="#ffc800" />
            <path d="M138 32 L140 37 L145 38 L141 42 L142 47 L138 44 L134 47 L135 42 L131 38 L136 37 Z" fill="#ffc800" />
            <circle cx="48" cy="28" r="3" fill="#ff4b4b" />
            <circle cx="112" cy="24" r="3.5" fill="#1cb0f6" />
          </>
        )}
      </g>
    </svg>
  );
}

/**
 * Screen 1 Hero Landscape Art (The rolling countryside path, hills, flag, trees)
 */
export function WelcomeLandscape({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 520 340" fill="none" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#eef8ff" />
          <stop offset="100%" stopColor="#f7fbf0" />
        </linearGradient>
        <linearGradient id="hillBack" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d5eed1" />
          <stop offset="100%" stopColor="#b6e0b0" />
        </linearGradient>
        <linearGradient id="hillFront" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c5e69e" />
          <stop offset="100%" stopColor="#a3d674" />
        </linearGradient>
        <linearGradient id="pathGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fdedd4" />
          <stop offset="100%" stopColor="#f3deb8" />
        </linearGradient>
      </defs>

      {/* Sky Background */}
      <rect width="520" height="340" rx="28" fill="url(#skyGrad)" />

      {/* Fluffy Clouds */}
      <g opacity="0.8">
        <path d="M120 70 Q130 50 155 52 Q180 48 190 70 Q205 72 205 85 Q205 96 190 96 L125 96 Q110 96 110 84 Q110 72 120 70 Z" fill="#ffffff" />
        <path d="M350 48 Q360 32 380 34 Q400 30 410 48 Q422 50 422 60 Q422 70 410 70 L355 70 Q342 70 342 60 Q342 50 350 48 Z" fill="#ffffff" opacity="0.85" />
      </g>

      {/* Background Hills */}
      <path d="M-20 220 Q90 140 240 180 T540 170 L540 340 L-20 340 Z" fill="url(#hillBack)" />

      {/* Small Cute Trees on Hill */}
      <g>
        <ellipse cx="140" cy="160" rx="14" ry="20" fill="#75ba62" />
        <rect x="138" y="174" width="4" height="12" fill="#8a633a" />
        <ellipse cx="170" cy="170" rx="11" ry="16" fill="#88cb74" />
        <rect x="168" y="180" width="4" height="10" fill="#8a633a" />
        <ellipse cx="440" cy="175" rx="16" ry="22" fill="#69b354" />
        <rect x="438" y="190" width="5" height="14" fill="#8a633a" />
      </g>

      {/* Foreground Rolling Hills */}
      <path d="M-30 260 Q120 190 320 230 T550 210 L550 340 L-30 340 Z" fill="url(#hillFront)" />

      {/* Winding Cobblestone/Dirt Trail */}
      <path
        d="M-10 320 Q120 300 170 270 Q230 230 290 240 T540 270 L540 340 L-10 340 Z"
        fill="url(#pathGrad)"
      />
      {/* Path Edge Lines */}
      <path d="M-10 320 Q120 300 170 270 Q230 230 290 240 T540 270" stroke="#e0c79c" strokeWidth="3" strokeDasharray="6 8" fill="none" />

      {/* Little milestone flag */}
      <g transform="translate(185, 235)">
        <line x1="0" y1="0" x2="0" y2="30" stroke="#a37648" strokeWidth="3" strokeLinecap="round" />
        <polygon points="0,2 18,9 0,16" fill="#ffb03a" stroke="#d48b17" strokeWidth="1.5" />
      </g>
    </svg>
  );
}

/**
 * Screen 3 Unit Landscape Art (Cute Bear Mascot, Yellow Chick, Purple Bird & 3D Alphabet Tiles)
 */
export function UnitLandscapeBanner({ unitNumber = 1, className = '' }) {
  return (
    <svg className={className} viewBox="0 0 760 210" fill="none" preserveAspectRatio="xMidYMid slice" role="img" aria-label={`Unit ${unitNumber} Adventure Landscape`}>
      <defs>
        <linearGradient id="bannerSkyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#dbeafe" />
          <stop offset="55%" stopColor="#f0fdf4" />
          <stop offset="100%" stopColor="#dcfce7" />
        </linearGradient>
        <linearGradient id="hillBackGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#86efac" />
          <stop offset="100%" stopColor="#4ade80" />
        </linearGradient>
        <linearGradient id="hillFrontGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="100%" stopColor="#22c55e" />
        </linearGradient>
        <linearGradient id="bearBodyGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#b45309" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>
        <linearGradient id="chickBodyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="100%" stopColor="#facc15" />
        </linearGradient>
        <linearGradient id="tileAGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
        <linearGradient id="tileBGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id="tileCGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fb7185" />
          <stop offset="100%" stopColor="#e11d48" />
        </linearGradient>
        <filter id="tileShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#0f172a" floodOpacity="0.16" />
        </filter>
        <filter id="mascotShadow" x="-15%" y="-15%" width="130%" height="130%">
          <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#14532d" floodOpacity="0.18" />
        </filter>
      </defs>

      {/* Sky & Gentle Sunlight */}
      <rect width="760" height="210" rx="20" fill="url(#bannerSkyGrad)" />

      {/* Sun Glow on Top Right */}
      <circle cx="700" cy="20" r="50" fill="#fef08a" opacity="0.4" />
      <circle cx="700" cy="20" r="30" fill="#fde047" opacity="0.6" />

      {/* Soft Floating Clouds */}
      <g opacity="0.85">
        <path d="M70 45 Q85 30 105 32 Q125 25 140 40 Q155 42 150 55 Q145 65 130 65 L80 65 Q65 65 65 55 Q65 48 70 45 Z" fill="#ffffff" />
        <path d="M430 35 Q445 22 465 24 Q480 18 495 32 Q510 34 505 48 L440 48 Q425 48 430 35 Z" fill="#ffffff" opacity="0.9" />
        <path d="M260 25 Q272 16 288 18 Q300 12 312 24 Q324 26 320 36 L270 36 Q258 36 260 25 Z" fill="#ffffff" opacity="0.7" />
      </g>

      {/* Rainbow Sparkles / Floating Confetti */}
      <g opacity="0.75">
        <circle cx="210" cy="30" r="3" fill="#ec4899" />
        <circle cx="225" cy="45" r="2" fill="#38bdf8" />
        <polygon points="340,30 343,36 349,36 344,40 346,46 340,42 334,46 336,40 331,36 337,36" fill="#fbbf24" />
        <polygon points="530,22 532,27 537,27 533,30 535,35 530,32 525,35 527,30 523,27 528,27" fill="#a855f7" />
        <circle cx="650" cy="60" r="3" fill="#22c55e" />
      </g>

      {/* Background Rolling Hills */}
      <path d="M-20 150 Q160 85 380 125 T780 105 L780 210 L-20 210 Z" fill="url(#hillBackGrad)" />

      {/* Foreground Meadow */}
      <path d="M-20 165 Q180 125 420 150 T780 135 L780 210 L-20 210 Z" fill="url(#hillFrontGrad)" />

      {/* Stepping Stone Adventure Path */}
      <g opacity="0.95">
        <ellipse cx="260" cy="195" rx="34" ry="10" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5" />
        <ellipse cx="320" cy="180" rx="30" ry="9" fill="#fffbeb" stroke="#d97706" strokeWidth="1.5" />
        <ellipse cx="375" cy="192" rx="32" ry="10" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5" />
        <ellipse cx="435" cy="178" rx="28" ry="8" fill="#fffbeb" stroke="#d97706" strokeWidth="1.5" />
      </g>

      {/* 3D Floating Alphabet Tile "A" (Sky Blue) */}
      <g transform="translate(68, 32)" filter="url(#tileShadow)">
        <polygon points="26,0 52,14 26,28 0,14" fill="#7dd3fc" />
        <polygon points="0,14 26,28 26,58 0,44" fill="#0284c7" />
        <polygon points="26,28 52,14 52,44 26,58" fill="#0369a1" />
        {/* Letter A on front */}
        <text x="14" y="44" fill="#ffffff" fontSize="22" fontWeight="900" fontFamily="DM, system-ui, sans-serif">A</text>
        {/* Sparkle on Tile A */}
        <polygon points="46,6 48,11 53,11 49,14 51,19 46,16 41,19 43,14 39,11 44,11" fill="#fef08a" />
      </g>

      {/* 3D Floating Alphabet Tile "B" (Sunny Gold) */}
      <g transform="translate(365, 14)" filter="url(#tileShadow)">
        <polygon points="24,0 48,13 24,26 0,13" fill="#fef08a" />
        <polygon points="0,13 24,26 24,54 0,41" fill="#f59e0b" />
        <polygon points="24,26 48,13 48,41 24,54" fill="#d97706" />
        {/* Letter B on front */}
        <text x="13" y="42" fill="#ffffff" fontSize="20" fontWeight="900" fontFamily="DM, system-ui, sans-serif">B</text>
      </g>

      {/* 3D Floating Alphabet Tile "C" (Coral Pink) */}
      <g transform="translate(640, 42)" filter="url(#tileShadow)">
        <polygon points="24,0 48,13 24,26 0,13" fill="#fecdd3" />
        <polygon points="0,13 24,26 24,52 0,39" fill="#f43f5e" />
        <polygon points="24,26 48,13 48,39 24,52" fill="#e11d48" />
        {/* Letter C on front */}
        <text x="13" y="40" fill="#ffffff" fontSize="20" fontWeight="900" fontFamily="DM, system-ui, sans-serif">C</text>
        <circle cx="44" cy="8" r="3" fill="#fef08a" />
      </g>

      {/* ADORABLE BROWN BEAR (Reading a Book) on Left */}
      <g transform="translate(135, 78)" filter="url(#mascotShadow)">
        {/* Ground shadow under bear */}
        <ellipse cx="45" cy="118" rx="42" ry="8" fill="#14532d" opacity="0.25" />

        {/* Round Bear Ears */}
        <circle cx="22" cy="30" r="14" fill="#78350f" />
        <circle cx="22" cy="30" r="8" fill="#fde68a" />
        <circle cx="68" cy="30" r="14" fill="#78350f" />
        <circle cx="68" cy="30" r="8" fill="#fde68a" />

        {/* Bear Body */}
        <ellipse cx="45" cy="86" rx="34" ry="32" fill="url(#bearBodyGrad)" stroke="#5c2605" strokeWidth="2.5" />
        {/* Beige tummy */}
        <ellipse cx="45" cy="90" rx="22" ry="20" fill="#fef3c7" opacity="0.9" />

        {/* Bear Head */}
        <ellipse cx="45" cy="46" rx="32" ry="28" fill="url(#bearBodyGrad)" stroke="#5c2605" strokeWidth="2.5" />

        {/* Chubby beige muzzle */}
        <ellipse cx="45" cy="54" rx="17" ry="13" fill="#fef3c7" stroke="#fde68a" strokeWidth="1.5" />
        {/* Nose */}
        <ellipse cx="45" cy="49" rx="6" ry="4.5" fill="#451a03" />
        <circle cx="43" cy="47" r="1.5" fill="#ffffff" />
        {/* Smiling mouth */}
        <path d="M41 55 Q45 60 49 55" stroke="#451a03" strokeWidth="2" strokeLinecap="round" fill="none" />

        {/* Shiny Happy Eyes */}
        <ellipse cx="32" cy="42" rx="4.5" ry="6" fill="#1e1b4b" />
        <ellipse cx="58" cy="42" rx="4.5" ry="6" fill="#1e1b4b" />
        <circle cx="31" cy="40" r="2" fill="#ffffff" />
        <circle cx="57" cy="40" r="2" fill="#ffffff" />

        {/* Rosy Blushing Cheeks */}
        <ellipse cx="23" cy="52" rx="6" ry="4" fill="#fb7185" opacity="0.7" />
        <ellipse cx="67" cy="52" rx="6" ry="4" fill="#fb7185" opacity="0.7" />

        {/* Orange Scarf / Bandana */}
        <path d="M26 66 Q45 74 64 66 L52 82 Z" fill="#ea580c" stroke="#c2410c" strokeWidth="1.5" />
        <circle cx="45" cy="71" r="3" fill="#fef08a" />

        {/* Open Book in Bear's Paws */}
        <g transform="translate(18, 76)">
          {/* Blue Book Cover */}
          <path d="M6 24 Q27 18 27 34 L27 48 Q27 32 6 38 Z" fill="#0284c7" />
          <path d="M48 24 Q27 18 27 34 L27 48 Q27 32 48 38 Z" fill="#0369a1" />
          {/* White Open Pages */}
          <path d="M8 22 Q27 16 27 32 L27 45 Q27 29 8 35 Z" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
          <path d="M46 22 Q27 16 27 32 L27 45 Q27 29 46 35 Z" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
          {/* Text lines on book */}
          <line x1="12" y1="26" x2="24" y2="23" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="12" y1="30" x2="24" y2="27" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="30" y1="23" x2="42" y2="26" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="30" y1="27" x2="42" y2="30" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
          {/* Bookmark Ribbon */}
          <path d="M27 32 L27 50 L30 46 L33 50 L33 32" fill="#ef4444" />
        </g>
        {/* Paws holding book */}
        <ellipse cx="20" cy="98" rx="7" ry="5.5" fill="#78350f" />
        <ellipse cx="70" cy="98" rx="7" ry="5.5" fill="#78350f" />
      </g>

      {/* WOODEN SIGNBOARD "UNIT {unitNumber}" in Center */}
      <g transform="translate(250, 75)">
        {/* Signboard Post */}
        <rect x="52" y="38" width="10" height="60" rx="3" fill="#78350f" stroke="#451a03" strokeWidth="1.5" />
        {/* Wooden Signboard Plaque with 3D Depth */}
        <rect x="0" y="4" width="114" height="42" rx="10" fill="#b45309" />
        <rect x="0" y="0" width="114" height="40" rx="10" fill="#fef08a" stroke="#ca8a04" strokeWidth="2.5" />
        {/* Wood rivets */}
        <circle cx="8" cy="8" r="2.5" fill="#ca8a04" />
        <circle cx="106" cy="8" r="2.5" fill="#ca8a04" />
        <circle cx="8" cy="32" r="2.5" fill="#ca8a04" />
        <circle cx="106" cy="32" r="2.5" fill="#ca8a04" />
        {/* Signboard Text */}
        <text x="57" y="24" textAnchor="middle" fill="#78350f" fontSize="16" fontWeight="900" fontFamily="DM, system-ui, sans-serif" letterSpacing="1">
          UNIT {unitNumber}
        </text>
        <text x="57" y="34" textAnchor="middle" fill="#a16207" fontSize="7.5" fontWeight="800" fontFamily="DM, system-ui, sans-serif" letterSpacing="0.8">
          ENGLISH ADVENTURE
        </text>
      </g>

      {/* CHEERFUL YELLOW CHICK on Right */}
      <g transform="translate(485, 108)" filter="url(#mascotShadow)">
        {/* Ground shadow under chick */}
        <ellipse cx="24" cy="74" rx="22" ry="6" fill="#14532d" opacity="0.22" />

        {/* Chick Body */}
        <ellipse cx="24" cy="42" rx="20" ry="24" fill="url(#chickBodyGrad)" stroke="#eab308" strokeWidth="2" />
        {/* Soft belly highlight */}
        <ellipse cx="24" cy="48" rx="13" ry="14" fill="#ffffff" opacity="0.45" />

        {/* Head Tuft Feathers */}
        <path d="M22 18 Q20 8 16 12 Q24 14 23 18" fill="#facc15" stroke="#eab308" strokeWidth="1" />
        <path d="M24 18 Q26 6 30 10 Q26 14 25 18" fill="#facc15" stroke="#eab308" strokeWidth="1" />

        {/* Cheerful Wings lifted high */}
        <path d="M6 38 Q-8 26 2 20 Q10 24 10 34 Z" fill="#facc15" stroke="#eab308" strokeWidth="1.5" />
        <path d="M40 36 Q54 24 46 18 Q38 22 38 32 Z" fill="#facc15" stroke="#eab308" strokeWidth="1.5" />

        {/* Shiny Cartoon Eyes */}
        <ellipse cx="16" cy="36" rx="3.5" ry="5" fill="#1e1b4b" />
        <ellipse cx="32" cy="36" rx="3.5" ry="5" fill="#1e1b4b" />
        <circle cx="15" cy="34" r="1.5" fill="#ffffff" />
        <circle cx="31" cy="34" r="1.5" fill="#ffffff" />

        {/* Cute Blushing Cheeks */}
        <ellipse cx="10" cy="44" rx="4" ry="2.5" fill="#f43f5e" opacity="0.6" />
        <ellipse cx="38" cy="44" rx="4" ry="2.5" fill="#f43f5e" opacity="0.6" />

        {/* Cheerful Orange Beak */}
        <polygon points="20,40 28,40 24,47" fill="#f97316" stroke="#ea580c" strokeWidth="1" />

        {/* Tiny Orange Feet */}
        <ellipse cx="18" cy="68" rx="5" ry="3" fill="#f97316" />
        <ellipse cx="30" cy="68" rx="5" ry="3" fill="#f97316" />
      </g>

      {/* CHEERFUL PURPLE BIRD COMPANION (Fluttering) */}
      <g transform="translate(565, 75)" filter="url(#mascotShadow)">
        {/* Bird Body */}
        <ellipse cx="20" cy="22" rx="14" ry="12" fill="#c084fc" stroke="#9333ea" strokeWidth="1.8" />
        {/* Belly */}
        <ellipse cx="18" cy="25" rx="8" ry="7" fill="#f5f3ff" opacity="0.8" />
        {/* Fluttering Wing */}
        <path d="M22 18 Q34 6 32 18 Q26 24 20 22" fill="#a855f7" stroke="#7e22ce" strokeWidth="1.5" />
        {/* Eye */}
        <circle cx="14" cy="19" r="2.5" fill="#1e1b4b" />
        <circle cx="13" cy="18" r="1" fill="#ffffff" />
        {/* Yellow Beak */}
        <polygon points="8,19 2,22 8,24" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />
        {/* Little musical note */}
        <path d="M-6 8 L-6 0 L0 2 L0 10 M-6 8 A 2 2 0 1 1 -10 8 A 2 2 0 1 1 -6 8 M0 10 A 2 2 0 1 1 -4 10 A 2 2 0 1 1 0 10" stroke="#7e22ce" strokeWidth="1.5" fill="#a855f7" />
      </g>

      {/* Daisies & Wildflowers */}
      <g>
        {/* Left Daisy */}
        <g transform="translate(115, 175)">
          <circle cx="0" cy="0" r="3.5" fill="#facc15" />
          <circle cx="0" cy="-6" r="3" fill="#ffffff" />
          <circle cx="6" cy="0" r="3" fill="#ffffff" />
          <circle cx="0" cy="6" r="3" fill="#ffffff" />
          <circle cx="-6" cy="0" r="3" fill="#ffffff" />
        </g>
        {/* Center Flowers */}
        <g transform="translate(225, 165)">
          <circle cx="0" cy="0" r="3" fill="#f43f5e" />
          <circle cx="-4" cy="-4" r="2.5" fill="#fecdd3" />
          <circle cx="4" cy="-4" r="2.5" fill="#fecdd3" />
        </g>
        {/* Right Daisy */}
        <g transform="translate(545, 185)">
          <circle cx="0" cy="0" r="3.5" fill="#facc15" />
          <circle cx="0" cy="-6" r="3" fill="#ffffff" />
          <circle cx="6" cy="0" r="3" fill="#ffffff" />
          <circle cx="0" cy="6" r="3" fill="#ffffff" />
          <circle cx="-6" cy="0" r="3" fill="#ffffff" />
        </g>
        {/* Far Right Tulips */}
        <g transform="translate(680, 160)">
          <path d="M0 0 Q-5 -8 -3 -12 Q0 -6 0 0 Q0 -6 3 -12 Q5 -8 0 0 Z" fill="#ec4899" />
          <line x1="0" y1="0" x2="0" y2="10" stroke="#15803d" strokeWidth="2" />
        </g>
      </g>
    </svg>
  );
}

/**
 * Illustrated Choice Badges (Apple, Cup, Dog, Cat) for exercises & vocabulary
 */
export function AppleIllustration({ size = 70 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <defs>
        <radialGradient id="appleGrad" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#ff7070" />
          <stop offset="60%" stopColor="#ea2b2b" />
          <stop offset="100%" stopColor="#b80c0c" />
        </radialGradient>
      </defs>
      {/* Apple Body */}
      <path
        d="M50 28 C32 20 16 34 16 58 C16 84 38 92 50 88 C62 92 84 84 84 58 C84 34 68 20 50 28 Z"
        fill="url(#appleGrad)"
        stroke="#960808"
        strokeWidth="3"
      />
      {/* Highlight Shine */}
      <ellipse cx="32" cy="46" rx="5" ry="11" transform="rotate(-24 32 46)" fill="#ffffff" opacity="0.65" />
      {/* Stem */}
      <path d="M50 28 Q52 14 62 10" stroke="#694119" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      {/* Green Leaf */}
      <path d="M52 20 Q64 12 70 20 Q64 26 52 20" fill="#58cc02" stroke="#3b8a00" strokeWidth="1.5" />
    </svg>
  );
}

export function CupIllustration({ size = 70 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <defs>
        <radialGradient id="cupGrad" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#67d2ff" />
          <stop offset="70%" stopColor="#1cb0f6" />
          <stop offset="100%" stopColor="#0d88c2" />
        </radialGradient>
      </defs>
      {/* Saucer */}
      <ellipse cx="48" cy="82" rx="34" ry="7" fill="#e2f3fc" stroke="#1899d6" strokeWidth="2.5" />
      {/* Cup Handle */}
      <path d="M68 44 C84 44 84 68 68 68" stroke="#1899d6" strokeWidth="6" strokeLinecap="round" fill="none" />
      {/* Cup Body */}
      <path
        d="M24 36 L28 72 C28 78 38 82 48 82 C58 82 68 78 68 72 L72 36 Z"
        fill="url(#cupGrad)"
        stroke="#0d88c2"
        strokeWidth="3"
      />
      {/* Tea/Liquid Rim */}
      <ellipse cx="48" cy="36" rx="24" ry="6.5" fill="#4fbcf0" stroke="#0d88c2" strokeWidth="2" />
      {/* Steam lines */}
      <path d="M42 24 Q38 18 42 12" stroke="#bae6fd" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M54 24 Q58 18 54 12" stroke="#bae6fd" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function DogIllustration({ size = 70 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      {/* Body */}
      <ellipse cx="50" cy="65" rx="26" ry="22" fill="#d99962" stroke="#995822" strokeWidth="2.5" />
      {/* Tail */}
      <path d="M74 65 Q88 56 82 44" stroke="#995822" strokeWidth="5" strokeLinecap="round" fill="none" />
      {/* Head */}
      <circle cx="44" cy="46" r="20" fill="#e8af78" stroke="#995822" strokeWidth="2.5" />
      {/* Floppy Ears */}
      <ellipse cx="26" cy="42" rx="8" ry="14" transform="rotate(-15 26 42)" fill="#a86832" stroke="#754117" strokeWidth="2" />
      <ellipse cx="62" cy="42" rx="8" ry="14" transform="rotate(15 62 42)" fill="#a86832" stroke="#754117" strokeWidth="2" />
      {/* Snout */}
      <ellipse cx="44" cy="52" rx="10" ry="7" fill="#fff5ea" />
      <polygon points="41,49 47,49 44,53" fill="#291a0f" />
      <path d="M44 53 Q44 57 41 57 M44 53 Q44 57 47 57" stroke="#291a0f" strokeWidth="1.5" strokeLinecap="round" />
      {/* Eyes */}
      <circle cx="37" cy="43" r="3" fill="#291a0f" />
      <circle cx="51" cy="43" r="3" fill="#291a0f" />
      <circle cx="36" cy="42" r="1" fill="#ffffff" />
      <circle cx="50" cy="42" r="1" fill="#ffffff" />
      {/* Front Paws */}
      <ellipse cx="38" cy="84" rx="6" ry="4" fill="#e8af78" stroke="#995822" strokeWidth="2" />
      <ellipse cx="52" cy="84" rx="6" ry="4" fill="#e8af78" stroke="#995822" strokeWidth="2" />
    </svg>
  );
}

export function CatIllustration({ size = 70 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      {/* Cat Body */}
      <ellipse cx="50" cy="66" rx="24" ry="20" fill="#ffb833" stroke="#c47d04" strokeWidth="2.5" />
      {/* Cat Tail curled */}
      <path d="M72 68 Q86 64 84 50 Q82 42 76 46" stroke="#c47d04" strokeWidth="4.5" strokeLinecap="round" fill="none" />
      {/* Cat Head */}
      <circle cx="48" cy="46" r="20" fill="#ffc252" stroke="#c47d04" strokeWidth="2.5" />
      {/* Pointy Ears */}
      <polygon points="32,34 38,18 46,30" fill="#ff9f1a" stroke="#c47d04" strokeWidth="2" strokeLinejoin="round" />
      <polygon points="35,31 39,22 43,30" fill="#ffa8be" />
      <polygon points="50,30 58,18 64,34" fill="#ff9f1a" stroke="#c47d04" strokeWidth="2" strokeLinejoin="round" />
      <polygon points="53,30 57,22 61,31" fill="#ffa8be" />
      {/* Eyes (big anime cat eyes) */}
      <ellipse cx="40" cy="44" rx="4" ry="5.5" fill="#1b2e15" />
      <circle cx="39" cy="42" r="1.5" fill="#ffffff" />
      <ellipse cx="56" cy="44" rx="4" ry="5.5" fill="#1b2e15" />
      <circle cx="55" cy="42" r="1.5" fill="#ffffff" />
      {/* Nose & Mouth */}
      <polygon points="46,50 50,50 48,53" fill="#ff708f" />
      <path d="M48 53 Q45 56 42 55 M48 53 Q51 56 54 55" stroke="#754700" strokeWidth="1.5" strokeLinecap="round" />
      {/* Whiskers */}
      <line x1="28" y1="48" x2="36" y2="50" stroke="#a36e1c" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="26" y1="53" x2="35" y2="53" stroke="#a36e1c" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="60" y1="50" x2="68" y2="48" stroke="#a36e1c" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="61" y1="53" x2="70" y2="53" stroke="#a36e1c" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

// Preserve existing exports
export function Sprout({ size = 36 }) {
  return <Mascot pose="wave" size={size} />;
}

export function BookArt({ className = '' }) {
  return <WelcomeLandscape className={className} />;
}

export function GameArt() {
  return (
    <svg className="game-art" viewBox="0 0 360 270" fill="none" aria-label="Playful game controller and trophy" role="img">
      <ellipse cx="184" cy="241" rx="121" ry="14" fill="#a19cbf" opacity=".2" />
      <g className="float-slow" transform="rotate(-12 170 175)">
        <path d="M108 121h131c29 0 44 33 49 67l4 24c3 24-22 34-38 18l-30-30H128l-32 29c-16 16-38 5-34-18l4-27c5-36 17-63 42-63Z" fill="#ffffff" stroke="#58cc02" strokeWidth="4" />
        <path d="M112 142v35m-17-17h34" stroke="#2b383f" strokeWidth="11" strokeLinecap="round" />
        <circle cx="229" cy="148" r="8" fill="#58cc02" />
        <circle cx="247" cy="166" r="8" fill="#ffc800" />
        <circle cx="211" cy="166" r="8" fill="#1cb0f6" />
        <circle cx="229" cy="184" r="8" fill="#ce82ff" />
      </g>
      <g className="float-bulb">
        <path d="M146 43h64l-6 44c-3 20-49 20-53 0l-5-44Z" fill="#ffc800" stroke="#e5a800" strokeWidth="2" />
        <path d="M147 51h-18c-3 24 10 33 25 30m56-30h18c3 24-10 33-25 30" stroke="#e5a800" strokeWidth="6" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function TopicArt({ type }) {
  return (
    <svg viewBox="0 0 220 90" className="topic-art" aria-hidden="true">
      {type === 'food' ? (
        <>
          <path d="M28-25C-22 18 9 99 55 70c38-25-20-38 10-86" fill="#58cc02" opacity="0.8" />
          <path d="M57-14C5 32 42 107 85 60c25-27-6-40 16-79" fill="#2dd4bf" opacity="0.8" />
          <path d="M92-10C48 33 81 106 116 57c26-37 4-41 25-82" fill="#38bdf8" opacity="0.8" />
        </>
      ) : (
        <>
          <ellipse cx="49" cy="9" rx="41" ry="45" fill="#facc15" opacity="0.8" />
          <ellipse cx="97" cy="-7" rx="30" ry="46" fill="#fb923c" opacity="0.8" />
          <ellipse cx="158" cy="12" rx="49" ry="36" fill="#f472b6" opacity="0.8" />
        </>
      )}
    </svg>
  );
}

import React from 'react';
import {
  BookOpen, Users, Headphones, Gamepad2, User, BellRing, Flame, Zap, Sparkles, ArrowRight
} from 'lucide-react';
import { Sprout } from '../../Art.jsx';

function HomeIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M11.3 2.5a1.2 1.2 0 0 1 1.4 0l8 6.2A1.5 1.5 0 0 1 21.3 9.9V19a2.5 2.5 0 0 1-2.5 2.5H15a1 1 0 0 1-1-1v-4.8a1.2 1.2 0 0 0-1.2-1.2h-1.6a1.2 1.2 0 0 0-1.2 1.2v4.8a1 1 0 0 1-1 1H5.2A2.5 2.5 0 0 1 2.7 19V9.9a1.5 1.5 0 0 1 .6-1.2l8-6.2Z" />
    </svg>
  );
}

const NAV_ITEMS = [
  ['home', 'Home', HomeIcon],
  ['learn', 'Learn', BookOpen],
  ['friends', 'Friends', Users],
  ['practice', 'Practice', Headphones],
  ['games', 'Play', Gamepad2],
  ['profile', 'Profile', User],
  ['reminders', 'Reminders', BellRing],
];

export function WebSidebar({
  page,
  navigate,
  user,
  progress,
  selectedAvatar,
  avatarColor,
  socialUnreadCount = 0,
  onOpenLesson,
}) {
  const completedCount = progress?.completed?.length || 0;

  return (
    <aside className="web-sidebar" aria-label="Primary Navigation">
      <div className="web-sidebar-brand-row">
        <button
          type="button"
          className="web-sidebar-brand"
          onClick={() => navigate('home')}
        >
          <Sprout size={30} />
          <span>lingo<span className="brand-dot">.</span></span>
        </button>
        <p className="web-sidebar-tagline">A little English, every day.</p>
      </div>

      <span className="web-nav-section-label">EXPLORE</span>
      <nav className="web-sidebar-nav" role="navigation" aria-label="Desktop Navigation">
        {NAV_ITEMS.map(([key, label, Icon]) => {
          const isActive = page === key;
          const showBadge = key === 'friends' && socialUnreadCount > 0;
          return (
            <button
              key={key}
              type="button"
              data-testid={`web-nav-${key}`}
              className={`web-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => navigate(key)}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="web-nav-icon"><Icon size={20} /></span>
              <span className="web-nav-label">{label}</span>
              {showBadge && (
                <span className="web-nav-badge">{socialUnreadCount > 9 ? '9+' : socialUnreadCount}</span>
              )}
              {isActive && !showBadge && <span className="web-nav-dot" aria-hidden="true" />}
            </button>
          );
        })}
      </nav>

      <div className="web-sidebar-spacer" />

      {onOpenLesson && (
        <div className="web-sidebar-promo">
          <div className="web-sidebar-promo-head">
            <Sparkles size={15} />
            <span>{progress?.streak ? `${progress.streak}d Streak` : 'Daily Spark'}</span>
            <span className="web-sidebar-promo-xp"><Zap size={12} fill="currentColor" /> {progress?.xp || 0}</span>
          </div>
          <p>Keep momentum going with your next bite-sized English lesson.</p>
          <button type="button" className="web-sidebar-promo-btn" onClick={onOpenLesson}>
            <span>Lesson {completedCount + 1}</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      {user && (
        <button
          type="button"
          className="web-sidebar-profile"
          onClick={() => navigate('profile')}
          aria-label="Open profile"
        >
          <span className={`avatar small ${avatarColor}`}>{selectedAvatar}</span>
          <span className="web-sidebar-profile-meta">
            <b>{user.name}</b>
            <small>@{user.username}</small>
          </span>
          <Flame size={15} className="web-sidebar-streak-icon" />
        </button>
      )}
    </aside>
  );
}

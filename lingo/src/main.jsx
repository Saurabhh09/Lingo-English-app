import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowUpRight, ArrowRight, ArrowLeft, BookOpen, LayoutGrid, Gamepad2, Headphones,
  Search, Flame, ChevronDown, ChevronRight, ChevronLeft, Check, Plus, X, Lock,
  Play, Volume2, Bookmark, Clock, Users, Copy, Trophy, Sparkles, Target, LogOut,
  Settings, CheckCircle2, Loader2, BarChart3, Leaf, Zap, Globe, RotateCcw,
  GraduationCap, Info, ShieldCheck, Heart, User, Edit3
} from 'lucide-react';
import {
  BookArt, GameArt, TopicArt, Sprout, Mascot,
  AppleIllustration, CupIllustration, DogIllustration, CatIllustration
} from './Art';
import { lessons } from '../content';
import './style.css';
import './components/Learn/learn.css';
import './components/Games/games.css';
import { Learn } from './components/Learn/Learn.jsx';
import { PracticeHub } from './components/Practice/PracticeHub.jsx';
import { GamesSetup as Games } from './components/Games/GamesSetup.jsx';
import { GameRoom } from './components/Games/GameRoom.jsx';
import { SoloGameRoom } from './components/Games/SoloGameRoom.jsx';

const pages = ['home', 'learn', 'practice', 'games'];
const words = [
  { word: 'Serendipity', phonetic: '/ˌser.ənˈdɪp.ə.ti/', type: 'noun', meaning: 'The happy chance of finding something wonderful when you weren’t looking for it.', example: 'Finding this little café was pure serendipity.' },
  { word: 'Resilient', phonetic: '/rɪˈzɪl.i.ənt/', type: 'adjective', meaning: 'Able to recover and feel strong again after a difficulty.', example: 'She stayed resilient through every challenge.' },
  { word: 'Curious', phonetic: '/ˈkjʊə.ri.əs/', type: 'adjective', meaning: 'Eager to learn, discover, or know more about something.', example: 'Stay curious, and keep asking questions.' },
  { word: 'Wanderlust', phonetic: '/ˈwɒn.də.lʌst/', type: 'noun', meaning: 'A strong desire to travel and explore new places.', example: 'Her wanderlust took her to new countries.' },
  { word: 'Gratitude', phonetic: '/ˈɡræt.ɪ.tjuːd/', type: 'noun', meaning: 'A warm feeling of thankfulness and appreciation.', example: 'He expressed gratitude for their support.' },
  { word: 'Flourish', phonetic: '/ˈflʌr.ɪʃ/', type: 'verb', meaning: 'To grow, develop, and succeed in a healthy way.', example: 'With practice, your confidence will flourish.' },
  { word: 'Mindful', phonetic: '/ˈmaɪnd.fəl/', type: 'adjective', meaning: 'Paying careful attention to what is happening around you.', example: 'Be mindful of how your words affect others.' },
  { word: 'Courage', phonetic: '/ˈkʌr.ɪdʒ/', type: 'noun', meaning: 'The ability to do something even when you feel afraid.', example: 'It takes courage to try something new.' }
];

function App() {
  const [page, setPage] = useState('home');
  const [direction, setDirection] = useState(1);
  const [user, setUser] = useState(null);
  const [progress, setProgress] = useState(null);
  const [config, setConfig] = useState({ database: 'demo' });
  const [modal, setModal] = useState(null);
  const [authModal, setAuthModal] = useState(null);
  const [toast, setToast] = useState('');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [fatal, setFatal] = useState('');
  const [game, setGame] = useState(null);
  const [tick, setTick] = useState(Date.now());
  const [wordIndex, setWordIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedAvatar, setSelectedAvatar] = useState(() => localStorage.getItem('lingo-avatar') || '🌱');
  const [avatarColor, setAvatarColor] = useState(() => localStorage.getItem('lingo-avatar-color') || 'lime');
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');

  const token = useRef(localStorage.getItem('lingo-token'));
  const toastTimer = useRef();
  const touch = useRef(null);
  const word = words[wordIndex];

  const notify = m => {
    setToast(m);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 3500);
  };

  async function api(url, body, method) {
    const r = await fetch('/api' + url, {
      method: method || (body ? 'POST' : 'GET'),
      headers: {
        'Content-Type': 'application/json',
        ...(token.current ? { Authorization: 'Bearer ' + token.current } : {})
      },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    const data = await r.json();
    if (data.serverTime) data.clientReceivedAt = Date.now();
    if (!r.ok) {
      const err = Error(data.error || 'Something went wrong. Please try again.');
      err.status = r.status;
      throw err;
    }
    return data;
  }

  const adopt = d => {
    token.current = d.token;
    localStorage.setItem('lingo-token', d.token);
    const customName = localStorage.getItem('lingo-custom-name');
    if (customName && d.user) {
      d.user.name = customName;
    }
    setUser(d.user);
    setProgress(d.progress);
    setGame(null);
    setAuthModal(null);
    localStorage.removeItem('lingo-game');
    localStorage.removeItem('lingo-solo');
  };

  async function initialize() {
    try {
      setLoading(true);
      setFatal('');
      const c = await fetch('/api/config').then(r => r.json());
      setConfig(c);
      let d;
      if (token.current) {
        try {
          d = await api('/me');
        } catch (e) {
          if (e.status !== 401) throw e;
          token.current = null;
          localStorage.removeItem('lingo-token');
        }
      }
      if (d) {
        const customName = localStorage.getItem('lingo-custom-name');
        if (customName && d.user) {
          d.user.name = customName;
        }
        setUser(d.user);
        setProgress(d.progress);
        const soloStored = localStorage.getItem('lingo-solo');
        if (soloStored) {
          try {
            const sg = await api('/games/solo');
            if (sg) setGame(sg);
            else localStorage.removeItem('lingo-solo');
          } catch {
            localStorage.removeItem('lingo-solo');
          }
        } else {
          const code = localStorage.getItem('lingo-game');
          if (code) {
            try {
              setGame(await api('/games/' + code));
            } catch {
              localStorage.removeItem('lingo-game');
            }
          }
        }
      } else {
        setUser(null);
        setProgress(null);
        setGame(null);
      }
    } catch (e) {
      setFatal(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleStartDemo() {
    try {
      setBusy(true);
      const d = await api('/auth/demo', {});
      adopt(d);
      notify('Welcome to Lingo! Your journey begins.');
    } catch (e) {
      setAuthModal('signup');
      notify(e.message || 'Please create an account to start.');
    } finally {
      setBusy(false);
    }
  }

  async function handleExitDemo() {
    try {
      await api('/auth/logout', {});
    } catch {}
    token.current = null;
    localStorage.removeItem('lingo-token');
    localStorage.removeItem('lingo-game');
    localStorage.removeItem('lingo-solo');
    setUser(null);
    setProgress(null);
    setGame(null);
    setModal(null);
    notify('Exited demo mode.');
  }

  useEffect(() => {
    initialize();
    return () => clearTimeout(toastTimer.current);
  }, []);

  useEffect(() => {
    if (!modal && !authModal) return;
    const previous = document.activeElement;
    const frame = requestAnimationFrame(() =>
      document.querySelector('.modal input, .modal button')?.focus()
    );
    const handler = e => {
      const dialog = document.querySelector('.modal');
      if (!dialog) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        if (authModal) setAuthModal(null);
        else if (modal && (modal.type !== 'lesson' || window.confirm('Leave this lesson? This attempt won’t be saved.'))) {
          setModal(null);
        }
      }
      if (e.key === 'Tab') {
        const nodes = [...dialog.querySelectorAll('button:not(:disabled),input,select,[tabindex="0"]')].filter(el => el.offsetParent !== null);
        const first = nodes[0], last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', handler);
    const before = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = before;
      previous?.focus();
    };
  }, [modal, authModal]);

  function navigate(next) {
    if (next === page) return;
    setDirection(pages.indexOf(next) > pages.indexOf(page) ? 1 : -1);
    setPage(next);
    setSearch('');
  }

  useEffect(() => {
    const handler = e => {
      if (modal || authModal || ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      const i = pages.indexOf(page);
      if (e.key === 'ArrowRight') navigate(pages[(i + 1) % pages.length]);
      if (e.key === 'ArrowLeft') navigate(pages[(i + pages.length - 1) % pages.length]);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [page, modal, authModal]);

  useEffect(() => {
    if (!game || game.status === 'finished') return;
    let cancel = false;
    const update = async () => {
      try {
        const endpoint = game.mode === 'solo' ? '/games/solo' : '/games/' + game.code;
        const g = await api(endpoint);
        if (!cancel) setGame(g);
      } catch (e) {
        if (!cancel) {
          if (e.status === 404) {
            notify(e.message || 'Game room is no longer available.');
            setGame(null);
            localStorage.removeItem(game.mode === 'solo' ? 'lingo-solo' : 'lingo-game');
          } else {
            console.warn('Transient polling error:', e);
          }
        }
      }
    };
    const i = setInterval(update, 1200), clock = setInterval(() => setTick(Date.now()), 250);
    return () => {
      cancel = true;
      clearInterval(i);
      clearInterval(clock);
    };
  }, [game?.code, game?.mode, game?.status]);

  async function updateGoal(goal) {
    try {
      setProgress(await api('/progress/goal', { goal }));
      setModal(null);
      notify('Daily goal updated. You’ve got this!');
    } catch (e) {
      notify(e.message);
    }
  }

  async function saveWord(w = word.word) {
    try {
      const p = await api('/progress/word', { word: w });
      setProgress(p);
      notify(p.saved.includes(w) ? 'Added to your word library!' : 'Removed from your library.');
    } catch (e) {
      notify(e.message);
    }
  }

  function speak(w = word.word) {
    if (!('speechSynthesis' in window)) {
      notify('Your browser doesn’t support pronunciation playback.');
      return;
    }
    window.speechSynthesis.cancel();
    const s = new SpeechSynthesisUtterance(w);
    s.lang = 'en-US';
    s.rate = 0.8;
    window.speechSynthesis.speak(s);
  }

  const activeLesson = lessons.find(l => !progress?.completed.includes(l.id)) || lessons[0];

  function openLesson(l) {
    const idx = lessons.indexOf(l);
    if (idx > 0 && !progress.completed.includes(lessons[idx - 1].id)) {
      notify('Finish the previous level to unlock this one.');
      return;
    }
    setModal({ type: 'lesson', lesson: l });
  }

  async function createGame(settings) {
    setBusy(true);
    try {
      if (settings.metadata?.mode === 'solo' || settings.mode === 'solo') {
        const g = await api('/games/solo', settings);
        setGame(g);
        localStorage.setItem('lingo-solo', 'true');
        notify('Solo challenge starting in 10 seconds!');
      } else {
        const g = await api('/games', settings);
        setGame(g);
        localStorage.setItem('lingo-game', g.code);
        notify('Your room is ready. Invite a friend!');
      }
    } catch (e) {
      notify(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function joinGame(code) {
    setBusy(true);
    try {
      const g = await api('/games/join', { code });
      setGame(g);
      localStorage.setItem('lingo-game', g.code);
      notify('You’re in! Welcome to the game.');
    } catch (e) {
      notify(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function gameAction(action, body = {}) {
    if (busy && action === 'leave') return;
    setBusy(true);
    try {
      const endpoint = game.mode === 'solo' ? '/games/solo/' + action : '/games/' + game.code + '/' + action;
      const g = await api(endpoint, body);
      if (action === 'leave') {
        setGame(null);
        localStorage.removeItem(game.mode === 'solo' ? 'lingo-solo' : 'lingo-game');
      } else setGame(g);
    } catch (e) {
      if (action === 'leave') {
        setGame(null);
        localStorage.removeItem(game.mode === 'solo' ? 'lingo-solo' : 'lingo-game');
      }
      notify(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(game.code);
      notify('Game code copied!');
    } catch {
      notify('Your game code is ' + game.code);
    }
  }

  const headings = {
    home: ['Your little corner of learning', 'Dashboard'],
    learn: ['Small steps. Big possibilities.', 'Let’s learn'],
    practice: ['Listening, Speaking & AI Practice', 'Practice Lab'],
    games: ['A little friendly competition', 'Play & learn']
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="brand"><Sprout /><span>lingo<span className="brand-dot">.</span></span></div>
        {fatal ? (
          <>
            <p>{fatal}</p>
            <button className="button dark" onClick={initialize}>Try again</button>
            <small>If you’ve configured Supabase, run the provided schema first.</small>
          </>
        ) : (
          <>
            <Loader2 className="spin" />
            <p>Getting your happy place ready…</p>
          </>
        )}
      </div>
    );
  }

  // SCREEN 1: WELCOME & ONBOARDING (Matches Screenshot 1)
  if (!user || !progress) {
    return (
      <div className="unauth-screen">
        <div className="welcome-screen-container">
          {/* Top Bar with Lingo wordmark and Skip button */}
          <div className="welcome-top-bar">
            <div className="welcome-brand">
              <Sprout size={32} />
              <span>lingo<span className="brand-dot">.</span></span>
            </div>
            <button className="welcome-skip-btn" onClick={handleStartDemo} disabled={busy}>
              Skip
            </button>
          </div>

          {/* Heading */}
          <h1 className="welcome-headline">
            A little practice <br />
            <span className="highlight-green">a brighter you.</span>
          </h1>

          {/* Subtitle */}
          <p className="welcome-subtitle">
            Learn English through fun lessons, real conversations and friendly games.
          </p>

          {/* Floating Badge */}
          <div className="welcome-badge-float">
            Small steps.<br />Big possibilities.
          </div>

          {/* Hero Artwork with Countryside Path & Walking Sprout Mascot */}
          <div className="welcome-hero-art">
            <BookArt />
            <div className="welcome-mascot-walking">
              <Mascot pose="walk" size={105} />
            </div>
          </div>

          {/* Primary CTA Button */}
          <button
            className="welcome-get-started-btn button dark"
            onClick={handleStartDemo}
            disabled={busy}
          >
            <span>{busy ? 'Getting ready…' : 'Get started'}</span>
            <ArrowRight size={18} />
          </button>

          {/* Divider */}
          <div className="welcome-divider-row">
            <span>or continue with</span>
          </div>

          {/* Social Auth Pills */}
          <div className="welcome-social-row">
            <button className="social-pill-btn" onClick={() => setAuthModal('signup')}>
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.05h3.9c2.28-2.1 3.645-5.18 3.645-9.14z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.9-3.05c-1.08.72-2.45 1.16-4.03 1.16-3.1 0-5.73-2.09-6.67-4.9H1.3v3.14C3.28 21.23 7.35 24 12 24z"/>
                <path fill="#FBBC05" d="M5.33 14.3c-.24-.72-.38-1.49-.38-2.3s.14-1.58.38-2.3V6.56H1.3C.47 8.2 0 10.04 0 12s.47 3.8 1.3 5.44l4.03-3.14z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.28 2.77 1.3 6.56l4.03 3.14c.94-2.81 3.57-4.95 6.67-4.95z"/>
              </svg>
              <span>Google</span>
            </button>
            <button className="social-pill-btn" onClick={() => setAuthModal('signup')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.99.6-2.64 1.36-.58.67-1.09 1.74-.95 2.77 1 .08 2.04-.52 2.67-1.28z"/>
              </svg>
              <span>Apple</span>
            </button>
            <button className="social-pill-btn" onClick={() => setAuthModal('signup')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="4" width="20" height="16" rx="2"/>
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
              </svg>
              <span>Email</span>
            </button>
          </div>

          {/* Already have an account? Sign in */}
          <div className="welcome-signin-link">
            Already have an account?
            <button type="button" onClick={() => setAuthModal('login')}>
              Sign in
            </button>
          </div>
        </div>

        {/* Modal when user chooses to login or sign up */}
        {authModal && (
          <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) setAuthModal(null); }}>
            <div className="modal" role="dialog" aria-modal="true">
              <button className="modal-close icon-button" onClick={() => setAuthModal(null)} aria-label="Close dialog">
                <X size={20} />
              </button>
              <Auth api={api} adopt={adopt} close={() => setAuthModal(null)} notify={notify} initialMode={authModal} isDemoActive={false} />
            </div>
          </div>
        )}

        {toast && (
          <div className="toast" role="status">
            <CheckCircle2 size={18} />
            {toast}
            <button onClick={() => setToast('')} aria-label="Dismiss notification"><X size={15} /></button>
          </div>
        )}
      </div>
    );
  }

  // LOGGED IN APP SHELL
  return (
    <div className="app-shell">
      {/* Desktop Sidebar */}
      <aside className="sidebar">
        <a className="brand" href="#" onClick={e => { e.preventDefault(); navigate('home'); }} aria-label="Lingo home">
          <Sprout /><span>lingo<span className="brand-dot">.</span></span>
        </a>
        <div className="sidebar-tagline">Little by little. A lot better.</div>
        <div className="nav-label">YOUR SPACE</div>
        <nav>
          {[
            [LayoutGrid, 'home', 'Dashboard'],
            [BookOpen, 'learn', 'Let’s learn'],
            [Headphones, 'practice', 'Practice Lab'],
            [Gamepad2, 'games', 'Play & learn']
          ].map(([Icon, key, label]) => (
            <button key={key} onClick={() => navigate(key)} className={'nav-item ' + (page === key ? 'active' : '')}>
              <Icon size={20} /><span>{label}</span>
              {page === key && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-divider" />
        <button className="nav-item" onClick={() => setModal({ type: 'library' })}>
          <Bookmark size={20} /><span>My word library</span><span className="tiny-count">{progress.saved.length}</span>
        </button>
        <button className="nav-item" onClick={() => setModal({ type: 'progress' })}>
          <BarChart3 size={20} /><span>My progress</span>
        </button>
        <div className="sidebar-spacer" />
        <div className="sidebar-promo">
          <span className="promo-star">✧</span>
          <h3>A little every day<br />goes a long way.</h3>
          <p>Your next “aha!” is<br />just one lesson away.</p>
          <button onClick={() => { navigate('learn'); openLesson(activeLesson); }}>
            Let’s make it happen <ArrowUpRight size={17} />
          </button>
        </div>
        <button className="sidebar-profile" onClick={() => setModal({ type: user.demo ? 'auth' : 'profile' })}>
          <span className={`avatar ${avatarColor}`}>{selectedAvatar}</span>
          <span><b>{user.name}</b><small>{user.demo ? 'Demo explorer' : 'English explorer'}</small></span>
          <Settings size={17} />
        </button>
      </aside>

      <div className="workspace">
        {/* Topbar */}
        <header className="topbar">
          <div className="mobile-brand-mark">
            <span className="brand-leaf">🌱</span>
            <b>Lingo</b>
          </div>
          <div className="breadcrumb topbar-crumb">
            My workspace <ChevronRight size={14} /><span>{headings[page][1]}</span>
          </div>
          <div className="topbar-actions">
            <div className="search-wrap">
              <Search size={17} />
              <input
                aria-label="Search lessons and words"
                placeholder="Find something to learn…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <kbd>⌕</kbd>
              {search && (
                <div className="search-results">
                  <span className="eyebrow">LESSONS & WORDS</span>
                  {[
                    ...lessons.filter(l => (l.title + ' ' + l.subtitle).toLowerCase().includes(search.toLowerCase())).map(l => (
                      <button key={l.id} onClick={() => { setSearch(''); navigate('learn'); openLesson(l); }}>
                        <span>{l.icon}</span>
                        <div><b>{l.title}</b><small>{l.subtitle}</small></div>
                        <ArrowUpRight size={16} />
                      </button>
                    )),
                    ...words.filter(w => w.word.toLowerCase().includes(search.toLowerCase())).map(w => (
                      <button key={w.word} onClick={() => { setWordIndex(words.indexOf(w)); setSearch(''); setModal({ type: 'word', word: w }); }}>
                        <BookOpen size={18} />
                        <div><b>{w.word}</b><small>{w.type}</small></div>
                        <ArrowUpRight size={16} />
                      </button>
                    ))
                  ]}
                  <p className="search-hint">
                    {!lessons.some(l => (l.title + ' ' + l.subtitle).toLowerCase().includes(search.toLowerCase())) && !words.some(w => w.word.toLowerCase().includes(search.toLowerCase()))
                      ? 'No matches yet. Try “food”, “grammar”, or “curious”.'
                      : 'A new discovery is one click away.'}
                  </p>
                </div>
              )}
            </div>
            {/* Streak Indicator with Flame */}
            <button className="streak-pill" onClick={() => setModal({ type: 'progress' })} aria-label="View learning streak">
              <Flame size={18} /><b>{progress.streak}</b><span>day streak</span>
            </button>
            {/* Gem / Energy Badge */}
            <div className="gem-pill" aria-label="Energy & XP">
              <Zap size={16} fill="currentColor" />
              <b>{progress.xp}</b>
            </div>
            {/* Profile Avatar */}
            <button className="header-profile" onClick={() => setModal({ type: user.demo ? 'auth' : 'profile' })} aria-label="Account">
              <span className={`avatar small ${avatarColor}`}>{selectedAvatar}</span>
              <ChevronDown size={15} />
            </button>
          </div>
        </header>

        <main
          onTouchStart={e => touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }}
          onTouchEnd={e => {
            if (!touch.current || modal) return;
            const dx = e.changedTouches[0].clientX - touch.current.x, dy = e.changedTouches[0].clientY - touch.current.y;
            if (Math.abs(dx) > 90 && Math.abs(dx) > Math.abs(dy) * 2) {
              const i = pages.indexOf(page);
              navigate(pages[(i + (dx < 0 ? 1 : pages.length - 1)) % pages.length]);
            }
            touch.current = null;
          }}
        >
          {/* Page Heading (Preserved for accessibility & tests) */}
          <div className="page-heading">
            <div>
              <p>{headings[page][0]}</p>
              <h1>{headings[page][1]}<span className="heading-dot">.</span></h1>
            </div>
            <div className="heading-right">
              <span className="date-label">
                {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
              <div className="page-arrows">
                <button onClick={() => navigate(pages[(pages.indexOf(page) + pages.length - 1) % pages.length])} aria-label="Previous section">
                  <ChevronLeft size={17} />
                </button>
                <button onClick={() => navigate(pages[(pages.indexOf(page) + 1) % pages.length])} aria-label="Next section">
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
          </div>

          <div className={'page-content ' + (direction > 0 ? 'from-right' : 'from-left')} key={page}>
            {/* SCREEN 2: HOME DASHBOARD (Matches Screenshot 2) */}
            {page === 'home' && (
              <div className="dashboard-grid">
                <div className="dashboard-main">
                  {/* 1. Greeting Card with Peeking Mascot */}
                  <div className="dashboard-greeting-card">
                    <div className="greeting-text-block">
                      <div className="greeting-eyebrow">Good morning!</div>
                      <h2 className="greeting-title">Ready to learn today?</h2>
                    </div>
                    <div className="greeting-mascot-peek">
                      <Mascot pose="peek" size={88} />
                    </div>
                  </div>

                  {/* 2. "Your journey" Card */}
                  <div className="journey-summary-card" onClick={() => navigate('learn')}>
                    <div className="journey-icon-wrap">
                      <BookOpen size={22} />
                    </div>
                    <div className="journey-info">
                      <span className="journey-label">Your journey</span>
                      <h4 className="journey-title">Pre-A1 · English Starter</h4>
                      <div className="journey-progress-track">
                        <i style={{ width: `${Math.round(progress.completed.length / lessons.length * 100)}%` }} />
                      </div>
                      <div className="journey-meta">
                        {progress.completed.length} / {lessons.length} lessons · {Math.round(progress.completed.length / lessons.length * 100)}%
                      </div>
                    </div>
                    <ChevronRight size={20} color="#77858d" />
                  </div>

                  {/* 3. 4-Card Stats Row */}
                  <div className="stats-row-4">
                    <div className="stat-box fire">
                      <div className="stat-box-icon"><Flame size={20} fill="#ff9600" /></div>
                      <div className="stat-box-value">{progress.streak}</div>
                      <div className="stat-box-label">Day streak</div>
                    </div>
                    <div className="stat-box bolt">
                      <div className="stat-box-icon"><Zap size={20} fill="#58cc02" /></div>
                      <div className="stat-box-value">{progress.xp}</div>
                      <div className="stat-box-label">Total XP</div>
                    </div>
                    <div className="stat-box book">
                      <div className="stat-box-icon"><BookOpen size={20} /></div>
                      <div className="stat-box-value">{progress.words}</div>
                      <div className="stat-box-label">Words learned</div>
                    </div>
                    <div className="stat-box crown">
                      <div className="stat-box-icon"><Trophy size={20} /></div>
                      <div className="stat-box-value">{progress.gamesWon || 0}</div>
                      <div className="stat-box-label">Games won</div>
                    </div>
                  </div>

                  {/* 4. "Continue learning" Section */}
                  <div className="continue-learning-section">
                    <div className="section-header-row">
                      <h3 className="section-header-title">Continue learning</h3>
                      <button className="icon-button" onClick={() => navigate('learn')} aria-label="View all lessons">
                        <ChevronRight size={18} />
                      </button>
                    </div>
                    <div className="continue-learning-card">
                      <div className="continue-card-body">
                        <span className="continue-tag-badge">SECTION 01</span>
                        <h4 className="continue-card-title">{activeLesson.title || 'The Little Foundations'}</h4>
                        <p className="continue-card-subtitle">{activeLesson.subtitle || 'Greetings, introduce yourself and simple sentences.'}</p>
                        <button className="continue-btn" onClick={() => openLesson(activeLesson)}>
                          <span>Continue Lesson {progress.completed.length + 1}</span>
                          <ArrowRight size={16} />
                        </button>
                      </div>
                      <div className="continue-mascot-read">
                        <Mascot pose="read" size={95} />
                      </div>
                    </div>
                  </div>

                  {/* 5. "Explore" Section */}
                  <div className="explore-section">
                    <div className="section-header-row" style={{ marginBottom: '12px' }}>
                      <h3 className="section-header-title">Explore</h3>
                    </div>
                    <div className="explore-grid-3">
                      <div className="explore-card green" onClick={() => navigate('learn')}>
                        <div className="explore-card-icon"><BookOpen size={20} /></div>
                        <strong className="explore-card-title">Learn</strong>
                        <span className="explore-card-sub">Structured path</span>
                      </div>
                      <div className="explore-card purple" onClick={() => navigate('practice')}>
                        <div className="explore-card-icon"><Headphones size={20} /></div>
                        <strong className="explore-card-title">Practice</strong>
                        <span className="explore-card-sub">Listen, speak, write</span>
                      </div>
                      <div className="explore-card yellow" onClick={() => navigate('games')}>
                        <div className="explore-card-icon"><Gamepad2 size={20} /></div>
                        <strong className="explore-card-title">Play</strong>
                        <span className="explore-card-sub">Games & friends</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dashboard Rail */}
                <aside className="dashboard-rail">
                  <section className="goal-card panel">
                    <div className="card-heading">
                      <h3>Your daily little win</h3>
                      <button className="icon-button" onClick={() => setModal({ type: 'goal' })} aria-label="Edit daily goal">
                        <Settings size={16} />
                      </button>
                    </div>
                    <div className="goal-ring">
                      <svg viewBox="0 0 170 170">
                        <circle cx="85" cy="85" r="69" stroke="#ededdf" strokeWidth="10" fill="none" />
                        <circle
                          cx="85" cy="85" r="69" stroke="#58cc02" strokeWidth="10" fill="none" strokeLinecap="round"
                          strokeDasharray="434"
                          strokeDashoffset={434 * (1 - Math.min(1, progress.todayWords / progress.goal))}
                          transform="rotate(-90 85 85)"
                        />
                      </svg>
                      <div>
                        <span className="goal-emoji">🌱</span>
                        <strong>{Math.min(100, Math.round(progress.todayWords / progress.goal * 100))}<small>%</small></strong>
                        <span>of your daily goal</span>
                      </div>
                    </div>
                    <p>{progress.todayWords >= progress.goal ? 'You did it! A little win worth celebrating.' : 'A few words today. A more confident you tomorrow.'}</p>
                    <div className="goal-footer">
                      <Target size={15} /><span>{progress.goal} words a day</span>
                      <button onClick={() => setModal({ type: 'goal' })}>Edit goal</button>
                    </div>
                  </section>

                  <section className="word-card purple panel">
                    <div className="card-heading">
                      <span className="eyebrow">A WORD TO FALL IN LOVE WITH</span>
                      <Sparkles size={17} />
                    </div>
                    <div className="word-title">
                      <h3>{word.word}</h3>
                      <button className="icon-button" onClick={() => speak()} aria-label="Hear pronunciation">
                        <Volume2 size={18} />
                      </button>
                    </div>
                    <div className="phonetic">{word.phonetic} <span>{word.type}</span></div>
                    <p>{word.meaning}</p>
                    <div className="word-example">“{word.example}”</div>
                    <div className="word-footer">
                      <button onClick={() => saveWord()}>
                        <Bookmark size={15} fill={progress.saved.includes(word.word) ? 'currentColor' : 'none'} />
                        {progress.saved.includes(word.word) ? 'Saved to library' : 'Save this word'}
                      </button>
                      <button className="icon-button" aria-label="Discover another word" onClick={() => setWordIndex((wordIndex + 1) % words.length)}>
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  </section>

                  <section className="rhythm-card panel">
                    <div className="card-heading">
                      <h3>Your learning rhythm</h3>
                      <span className="pill small-pill">This week</span>
                    </div>
                    <div className="weekly-chart">
                      {Array.from({ length: 7 }, (_, i) => {
                        const d = new Date();
                        d.setDate(d.getDate() - 6 + i);
                        const date = d.toISOString().slice(0, 10), v = progress.history[date] || 0;
                        return (
                          <div key={i} className={'chart-day ' + (i === 6 ? 'today' : '')}>
                            <span className="chart-value">{v || ''}</span>
                            <div className="bar-background">
                              <i style={{ height: Math.max(7, Math.min(100, v / progress.goal * 100)) + '%' }} className={v ? '' : 'empty'} />
                            </div>
                            <span>{d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1)}</span>
                            {i === 6 && <i className="today-dot" />}
                          </div>
                        );
                      })}
                    </div>
                    <div className="rhythm-footer">
                      <Flame size={17} />
                      <span>{progress.streak ? `${progress.streak}-day streak. Keep your spark alive!` : 'Your next lesson starts a new streak.'}</span>
                    </div>
                  </section>
                </aside>
              </div>
            )}

            {page === 'learn' && (
              <Learn progress={progress} openLesson={openLesson} activeLesson={activeLesson} onOpenProgressModal={() => setModal({ type: 'progress' })} />
            )}

            {page === 'practice' && (
              <PracticeHub progress={progress} updateProgress={setProgress} api={api} />
            )}

            {page === 'games' && (
              game ? (
                game.mode === 'solo' ? (
                  <SoloGameRoom game={game} user={user} tick={tick} busy={busy} action={gameAction} />
                ) : (
                  <GameRoom game={game} user={user} tick={tick} busy={busy} action={gameAction} copyCode={copyCode} />
                )
              ) : (
                <Games busy={busy} createGame={createGame} joinGame={joinGame} />
              )
            )}
          </div>

          <footer className="main-footer">
            <div className="main-footer-line">
              <span className="footer-sprout-icon">🌱</span>
              <span className="footer-highlight">Made for your “I did it!” moments.</span>
            </div>
            <div className="main-footer-line sub">
              <span>{user.demo ? 'Sample stats · Demo explorer' : config.database === 'supabase' ? 'Connected to Supabase' : 'Saved on this demo server'}</span>
              <span className="footer-dot">•</span>
              <span>English, at your pace.</span>
            </div>
          </footer>
        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR (Matches Screenshot 2) */}
      <nav className="mobile-nav">
        {[
          [LayoutGrid, 'home', 'Home'],
          [BookOpen, 'learn', 'Learn'],
          [Headphones, 'practice', 'Practice'],
          [Gamepad2, 'games', 'Play'],
          [User, 'profile', 'Profile']
        ].map(([Icon, key, label]) => (
          <button
            key={key}
            onClick={() => {
              if (key === 'profile') setModal({ type: user.demo ? 'auth' : 'profile' });
              else navigate(key);
            }}
            className={`mobile-nav-btn ${page === key && key !== 'profile' ? 'active' : ''}`}
          >
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {user.demo && (
        <button className="demo-signup" onClick={() => setModal({ type: 'auth' })}>
          <span className="green-dot" /> Exploring the demo <span>Make it yours <ArrowUpRight size={14} /></span>
        </button>
      )}

      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          {toast}
          <button onClick={() => setToast('')} aria-label="Dismiss notification"><X size={15} /></button>
        </div>
      )}

      {/* MODAL DIALOGS */}
      {modal && (
        <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget && modal.type !== 'lesson') setModal(null); }}>
          <div className={'modal ' + (modal.type === 'lesson' ? 'lesson-modal' : '')} role="dialog" aria-modal="true" aria-label={modal.type}>
            <button
              className="modal-close icon-button"
              onClick={() => {
                if (modal.type === 'lesson') {
                  if (window.confirm('Leave this lesson? Your answers for this attempt won’t be saved.')) setModal(null);
                } else setModal(null);
              }}
              aria-label="Close dialog"
            >
              <X size={20} />
            </button>

            {modal.type === 'auth' && (
              <Auth api={api} adopt={adopt} close={() => setModal(null)} notify={notify} initialMode={user?.demo ? 'signup' : 'login'} isDemoActive={!!user?.demo} onExitDemo={handleExitDemo} />
            )}

            {modal.type === 'lesson' && (
              <Lesson
                lesson={modal.lesson}
                api={api}
                updateProgress={setProgress}
                close={() => setModal(null)}
                next={() => {
                  const nextLesson = lessons[lessons.indexOf(modal.lesson) + 1];
                  if (nextLesson) setModal({ type: 'lesson', lesson: nextLesson });
                  else setModal(null);
                }}
                key={modal.lesson.id}
              />
            )}

            {modal.type === 'goal' && (
              <>
                <span className="modal-emoji">🎯</span>
                <span className="eyebrow">BUILD A LITTLE HABIT</span>
                <h2>Your pace. Your goal.</h2>
                <p className="modal-description">Choose a daily word goal that fits your day. Small and steady wins the race.</p>
                <div className="goal-options">
                  {[
                    [5, 'Easy does it', 'A tiny step'],
                    [10, 'Steady explorer', 'A lovely little habit'],
                    [20, 'Feeling focused', 'Make some room to grow'],
                    [30, 'All in', 'Challenge accepted']
                  ].map(([goal, label, desc]) => (
                    <button className={progress.goal === goal ? 'selected' : ''} key={goal} onClick={() => updateGoal(goal)}>
                      <span><b>{label}</b><small>{desc}</small></span>
                      <strong>{goal}<small>words / day</small></strong>
                      {progress.goal === goal && <Check size={19} />}
                    </button>
                  ))}
                </div>
              </>
            )}

            {modal.type === 'library' && (
              <>
                <span className="modal-emoji">📚</span>
                <span className="eyebrow">YOUR POCKET OF POSSIBILITIES</span>
                <h2>My word library<span className="heading-dot">.</span></h2>
                <p className="modal-description">Words you love, all in one little place.</p>
                {!progress.saved.length ? (
                  <div className="empty-state">
                    <Bookmark size={35} />
                    <h3>Your collection starts with one word.</h3>
                    <p>Save a word from your dashboard, or discover one below.</p>
                  </div>
                ) : null}
                <div className="library-list">
                  {(progress.saved.length ? words.filter(w => progress.saved.includes(w.word)) : words.slice(0, 3)).map(w => (
                    <div key={w.word}>
                      <div>
                        <h3>{w.word}<button className="icon-button" onClick={() => speak(w.word)} aria-label={'Hear ' + w.word}><Volume2 size={16} /></button></h3>
                        <span className="phonetic">{w.type}</span>
                        <p>{w.meaning}</p>
                      </div>
                      <button className={'save-word ' + (progress.saved.includes(w.word) ? 'selected' : '')} onClick={() => saveWord(w.word)} aria-label={'Save or remove ' + w.word}>
                        <Bookmark size={20} fill={progress.saved.includes(w.word) ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {modal.type === 'word' && (
              <>
                <span className="modal-emoji">✨</span>
                <span className="eyebrow">YOUR NEXT LITTLE DISCOVERY</span>
                <h2>{modal.word.word} <button className="icon-button" onClick={() => speak(modal.word.word)}><Volume2 size={20} /></button></h2>
                <div className="phonetic">{modal.word.phonetic} · {modal.word.type}</div>
                <p className="modal-description">{modal.word.meaning}</p>
                <div className="word-example">“{modal.word.example}”</div>
                <button className="button dark full-width" onClick={() => saveWord(modal.word.word)}>
                  <Bookmark size={17} />{progress.saved.includes(modal.word.word) ? 'Remove from library' : 'Save to my library'}
                </button>
              </>
            )}

            {modal.type === 'topic' && (
              <>
                <span className="modal-emoji">{modal.topic === 'Food & drinks' ? '🥑' : '💬'}</span>
                <span className="eyebrow">EXPLORE YOUR WORLD</span>
                <h2>{modal.topic}</h2>
                <p className="modal-description">Discover it on your learning path, or jump into a practice game with no level locks.</p>
                <button className="button dark full-width" onClick={() => { setModal(null); navigate('games'); createGame({ difficulty: 'Beginner', topic: modal.topic, duration: 1 }); }}>
                  Start a practice game <Gamepad2 size={19} />
                </button>
                <button className="button light full-width" onClick={() => { setModal(null); navigate('learn'); }}>
                  See my learning path <ArrowRight size={17} />
                </button>
              </>
            )}

            {modal.type === 'progress' && (
              <div className="progress-modal-view">
                <span className="modal-emoji">🌱</span>
                <span className="eyebrow">YOU’RE GROWING EVERY DAY</span>
                <h2>Look at you go.</h2>
                <p className="modal-description">Every little lesson counts. {user.demo && 'Your demo starts with sample XP, words, and a streak; new lesson activity is real.'}</p>
                
                <div className="progress-modal-grid">
                  <div className="progress-metric-card fire">
                    <div className="metric-icon-bubble"><Flame size={20} /></div>
                    <div className="metric-details">
                      <strong>{progress.streak}</strong>
                      <span>Day streak</span>
                    </div>
                  </div>
                  <div className="progress-metric-card bolt">
                    <div className="metric-icon-bubble"><Zap size={20} /></div>
                    <div className="metric-details">
                      <strong>{progress.xp}</strong>
                      <span>Total XP</span>
                    </div>
                  </div>
                  <div className="progress-metric-card book">
                    <div className="metric-icon-bubble"><BookOpen size={20} /></div>
                    <div className="metric-details">
                      <strong>{progress.words}</strong>
                      <span>Words learned</span>
                    </div>
                  </div>
                  <div className="progress-metric-card crown">
                    <div className="metric-icon-bubble"><CheckCircle2 size={20} /></div>
                    <div className="metric-details">
                      <strong>{progress.completed.length} / {lessons.length}</strong>
                      <span>Lessons done</span>
                    </div>
                  </div>
                </div>

                <div className="achievements-section">
                  <h3 className="achievements-heading">Your little milestones</h3>
                  <div className="milestones-list">
                    {[
                      ['First little win', progress.completed.length >= 1, 'Finish your first lesson'],
                      ['Everyday explorer', progress.completed.length >= 3, 'Complete all of unit 1'],
                      ['A world of possibilities', progress.completed.length >= lessons.length, 'Complete the entire learning path']
                    ].map(([title, done, desc]) => (
                      <div key={title} className={`milestone-item ${done ? 'unlocked' : 'locked'}`}>
                        <div className={`milestone-badge ${done ? 'earned' : 'locked'}`}>
                          {done ? <Trophy size={18} /> : <Lock size={18} />}
                        </div>
                        <div className="milestone-text">
                          <b className="milestone-title">{title}</b>
                          <p className="milestone-desc">{desc}</p>
                        </div>
                        {done && (
                          <div className="milestone-check" aria-label="Completed">
                            <Check size={16} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {modal.type === 'profile' && (
              <div className="profile-modal-view">
                <div className="profile-header-card">
                  <div className="profile-avatar-wrap">
                    <span className={`profile-avatar ${avatarColor}`}>{selectedAvatar}</span>
                  </div>

                  <div className="profile-identity-block">
                    {isEditingName ? (
                      <div className="profile-name-edit-box">
                        <input
                          type="text"
                          value={tempName}
                          onChange={e => setTempName(e.target.value)}
                          placeholder="Your display name"
                          maxLength={30}
                          autoFocus
                          className="profile-name-input"
                        />
                        <div className="profile-name-edit-btns">
                          <button
                            type="button"
                            className="button dark"
                            style={{ padding: '6px 14px', fontSize: '12px' }}
                            onClick={() => {
                              if (tempName.trim()) {
                                setUser(prev => ({ ...prev, name: tempName.trim() }));
                                localStorage.setItem('lingo-custom-name', tempName.trim());
                                setIsEditingName(false);
                                notify('Display name updated!');
                              }
                            }}
                          >
                            <Check size={14} /> Save
                          </button>
                          <button
                            type="button"
                            className="button light"
                            style={{ padding: '6px 14px', fontSize: '12px' }}
                            onClick={() => setIsEditingName(false)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="profile-name-display-row">
                        <h2>{user.name}</h2>
                        <button
                          type="button"
                          className="profile-edit-name-btn"
                          onClick={() => {
                            setTempName(user.name);
                            setIsEditingName(true);
                          }}
                          aria-label="Edit display name"
                        >
                          <Edit3 size={15} />
                        </button>
                      </div>
                    )}
                    <p className="modal-description">@{user.username} · {user.demo ? 'Demo explorer' : 'English explorer'}</p>
                  </div>
                </div>

                {/* Avatar Selection Grid */}
                <div className="profile-custom-box">
                  <span className="profile-box-label">CHOOSE YOUR AVATAR</span>
                  <div className="avatar-pick-grid">
                    {['🌱', '🐻', '🦊', '🦉', '🐧', '🐱', '🐰', '🌟'].map(av => (
                      <button
                        key={av}
                        type="button"
                        className={`avatar-pick-btn ${selectedAvatar === av ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedAvatar(av);
                          localStorage.setItem('lingo-avatar', av);
                        }}
                      >
                        {av}
                      </button>
                    ))}
                  </div>

                  <span className="profile-box-label" style={{ marginTop: '12px' }}>AVATAR THEME</span>
                  <div className="avatar-color-grid">
                    {[
                      ['lime', '#58cc02'],
                      ['blue', '#1cb0f6'],
                      ['purple', '#ce82ff'],
                      ['yellow', '#ffc800'],
                      ['coral', '#ff4b4b']
                    ].map(([col, hex]) => (
                      <button
                        key={col}
                        type="button"
                        className={`avatar-color-dot ${avatarColor === col ? 'active' : ''}`}
                        style={{ background: hex }}
                        onClick={() => {
                          setAvatarColor(col);
                          localStorage.setItem('lingo-avatar-color', col);
                        }}
                        aria-label={`Theme ${col}`}
                      >
                        {avatarColor === col && <Check size={13} color="#ffffff" strokeWidth={3} />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Real Learner Progress Stats */}
                <div className="profile-stats-grid">
                  <div className="profile-stat-box lime">
                    <Flame size={18} />
                    <strong>{progress.streak}</strong>
                    <span>day streak</span>
                  </div>
                  <div className="profile-stat-box purple">
                    <Zap size={18} />
                    <strong>{progress.xp}</strong>
                    <span>total XP</span>
                  </div>
                  <div className="profile-stat-box blue">
                    <BookOpen size={18} />
                    <strong>{progress.words}</strong>
                    <span>words learned</span>
                  </div>
                  <div className="profile-stat-box yellow">
                    <Trophy size={18} />
                    <strong>{progress.completed?.length || 0}</strong>
                    <span>lessons completed</span>
                  </div>
                </div>

                {/* Learning Hub Entries: My Word Library & My Progress */}
                <div className="profile-hub-entries">
                  <span className="profile-box-label">YOUR LEARNING HUB</span>
                  <div className="profile-hub-grid">
                    <button
                      type="button"
                      className="profile-hub-card word-lib"
                      onClick={() => setModal({ type: 'library' })}
                    >
                      <div className="profile-hub-icon"><Bookmark size={20} /></div>
                      <div className="profile-hub-info">
                        <strong>My Word Library</strong>
                        <p>Vocabulary & saved flashcards</p>
                      </div>
                      <span className="profile-hub-badge">{progress.saved.length} {progress.saved.length === 1 ? 'word' : 'words'}</span>
                      <ChevronRight size={18} className="profile-hub-arrow" />
                    </button>

                    <button
                      type="button"
                      className="profile-hub-card my-prog"
                      onClick={() => setModal({ type: 'progress' })}
                    >
                      <div className="profile-hub-icon"><BarChart3 size={20} /></div>
                      <div className="profile-hub-info">
                        <strong>My Progress & Milestones</strong>
                        <p>Streak, XP & achievements</p>
                      </div>
                      <span className="profile-hub-badge">{progress.completed?.length || 0} done</span>
                      <ChevronRight size={18} className="profile-hub-arrow" />
                    </button>
                  </div>
                </div>

                {/* Daily Goal Quick Setting */}
                <div className="profile-goal-card">
                  <div>
                    <span className="profile-goal-title">Daily Goal</span>
                    <strong className="profile-goal-val">{progress.goal} words / day</strong>
                  </div>
                  <button className="button light compact" onClick={() => setModal({ type: 'goal' })}>
                    <Settings size={15} /> Adjust goal
                  </button>
                </div>

                {/* Sign out */}
                <button
                  className="button dark full-width sign-out-action-btn"
                  onClick={async () => {
                    try { await api('/auth/logout', {}); } catch (e) { console.warn('Logout:', e); }
                    token.current = null;
                    localStorage.removeItem('lingo-token');
                    localStorage.removeItem('lingo-game');
                    localStorage.removeItem('lingo-solo');
                    setModal(null);
                    setUser(null);
                    setProgress(null);
                    setGame(null);
                    notify('Signed out. See you again soon!');
                  }}
                >
                  <LogOut size={17} /> Sign out
                </button>

                <p className="profile-sub-footnote">
                  @{user.username} · {config.database === 'supabase' ? 'Synced with Supabase' : 'Local demo environment'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Auth({ api, adopt, close, notify, initialMode = 'login', isDemoActive = false, onExitDemo }) {
  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <>
      <div className="modal-brand"><Sprout size={32} /><span>lingo<span className="brand-dot">.</span></span></div>
      <span className="eyebrow">YOUR ENGLISH STORY STARTS HERE</span>
      <h2>{mode === 'signup' ? 'A little hello. A fresh start.' : 'Welcome back, explorer.'}</h2>
      <p className="modal-description">
        {mode === 'signup' ? 'Just a name, a username, and a password. No email. No fuss.' : 'Your next little win is waiting for you.'}
      </p>
      <div className="auth-tabs">
        <button className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError(''); }}>Sign in</button>
        <button className={mode === 'signup' ? 'active' : ''} onClick={() => { setMode('signup'); setError(''); }}>Create account</button>
      </div>
      <form
        className="auth-form"
        onSubmit={async e => {
          e.preventDefault();
          setBusy(true);
          setError('');
          try {
            const d = await api('/auth/' + mode, { name, username, password });
            adopt(d);
            if (close) close();
            notify(mode === 'signup' ? 'Your story starts here. Welcome to Lingo!' : 'Welcome back! Let’s find a little win.');
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {mode === 'signup' && (
          <label>
            What should we call you?
            <input placeholder="Your name" value={name} maxLength={40} required autoComplete="name" onChange={e => setName(e.target.value)} />
          </label>
        )}
        <label>
          Your unique username
          <input
            placeholder="e.g. curious_sam"
            value={username}
            pattern="[a-zA-Z0-9_]{3,20}"
            minLength={3}
            maxLength={20}
            required
            autoComplete="username"
            onChange={e => setUsername(e.target.value.toLowerCase())}
          />
          {mode === 'signup' && <small>3–20 letters, numbers, or underscores.</small>}
        </label>
        <label>
          {mode === 'signup' ? 'Create a password' : 'Your password'}
          <input
            type="password"
            placeholder="At least 8 characters"
            value={password}
            minLength={mode === 'signup' ? 8 : 1}
            maxLength={128}
            required
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            onChange={e => setPassword(e.target.value)}
          />
        </label>
        {error && <div className="form-error" role="alert">{error}</div>}
        <button className="button dark full-width" disabled={busy}>
          {busy ? <Loader2 className="spin" size={18} /> : <>{mode === 'signup' ? 'Let’s start my story' : 'Back to my happy place'} <ArrowRight size={18} /></>}
        </button>
      </form>
      {isDemoActive && onExitDemo && (
        <button type="button" className="text-button" style={{ marginTop: '16px', width: '100%', justifyContent: 'center' }} onClick={onExitDemo}>
          Leave demo mode and return to sign in
        </button>
      )}
      <p className="auth-note"><Lock size={13} /> Your password is securely hashed.</p>
    </>
  );
}

// SCREEN 4: EXERCISE & LESSON EXPERIENCES (Matches Screenshot 4)
function Lesson({ lesson, api, updateProgress, close, next }) {
  const [curriculum, setCurriculum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const [stage, setStage] = useState('learn');
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [checked, setChecked] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [lifecycle, setLifecycle] = useState('loading');

  function speakPrompt(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const s = new SpeechSynthesisUtterance(text);
    s.lang = 'en-US';
    s.rate = 0.8;
    window.speechSynthesis.speak(s);
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLifecycle('loading');
    setApiError('');
    setStage('learn');
    setIndex(0);
    setSelected(null);
    setChecked(false);
    setFeedback(null);
    setAnswers([]);
    setResult(null);

    const targetId = lesson.realLessonId || lesson.id;
    if (!targetId) {
      setLoading(false);
      setLifecycle('error');
      setApiError('Lesson not found.');
      return;
    }

    api('/curriculum/lessons/' + encodeURIComponent(targetId))
      .then(data => {
        if (!active) return;
        if (!data || !data.id) {
          setApiError('Lesson details could not be found.');
          setLifecycle('error');
        } else {
          setCurriculum(data);
          setLifecycle('ready');
        }
        setLoading(false);
      })
      .catch(err => {
        if (!active) return;
        setApiError(err.message || 'Failed to load lesson curriculum.');
        setLifecycle('error');
        setLoading(false);
      });

    return () => { active = false; };
  }, [lesson.id, lesson.realLessonId]);

  if (loading || lifecycle === 'loading') {
    return <div className="lesson-loading-state"><Loader2 className="spin" size={32} /><p>Loading lesson curriculum & exercises…</p></div>;
  }

  if (apiError || !curriculum || (lifecycle === 'error' && !curriculum)) {
    return (
      <div className="lesson-error-state">
        <div className="celebration"><span>✦</span><Leaf size={48} /><span>✧</span></div>
        <h2>We hit a little bump.</h2>
        <p>{apiError || 'Could not load lesson content.'}</p>
        <button className="button dark full-width" onClick={close}>Back to my journey</button>
      </div>
    );
  }

  const exercises = curriculum.exercises || [];
  const currentEx = exercises[index] || (lesson.questions ? { prompt: lesson.questions[index]?.[0], options: lesson.questions[index]?.[1], explanation: lesson.questions[index]?.[3] } : null);

  async function checkAnswer() {
    if (selected === null || busy || lifecycle === 'submitting') return;
    setBusy(true);
    setLifecycle('submitting');
    setError('');
    try {
      const res = await api('/curriculum/exercises/check', {
        lessonId: curriculum.id,
        exerciseIndex: index,
        choice: selected,
        exerciseId: currentEx?.id
      });
      setFeedback(res);
      setChecked(true);
      setLifecycle('in_progress');
    } catch (err) {
      setError(err.message || 'Unable to check answer on server. Please try again.');
      setLifecycle('in_progress');
    } finally {
      setBusy(false);
    }
  }

  async function advance() {
    if (busy || lifecycle === 'submitting') return;
    const a = [...answers, selected];
    if (index === exercises.length - 1) {
      setBusy(true);
      setLifecycle('submitting');
      setError('');
      try {
        const r = await api('/progress/lesson', { lesson: curriculum.id, answers: a });
        updateProgress(r.progress);
        setResult(r);
        setStage('results');
        setLifecycle('completed');
      } catch (e) {
        setError(e.message || 'Failed to record lesson completion. Please retry.');
        setLifecycle('in_progress');
      } finally {
        setBusy(false);
      }
    } else {
      setAnswers(a);
      setIndex(index + 1);
      setSelected(null);
      setChecked(false);
      setFeedback(null);
      setLifecycle('in_progress');
    }
  }

  function reset() {
    setIndex(0);
    setSelected(null);
    setChecked(false);
    setFeedback(null);
    setAnswers([]);
    setResult(null);
    setError('');
    setStage('practice');
    setLifecycle('in_progress');
  }

  const primaryObj = curriculum.primaryObjective;

  if (stage === 'results' && result) {
    const isPathFinished = lessons[lessons.length - 1]?.id === curriculum.id;
    return (
      <div className="lesson-result">
        <div className="celebration">
          <Mascot pose="celebrate" size={90} />
        </div>
        <span className="eyebrow">{result.passed ? 'A LITTLE WIN, A BIG FEELING' : 'THIS IS HOW GROWTH HAPPENS'}</span>
        <h2>{result.passed ? 'Look at you go!' : 'Let’s give it another go.'}</h2>
        <p>{result.passed ? 'Another little step toward a more confident you.' : 'Every mistake is a chance to learn. Score 3 out of 5 to unlock the next level.'}</p>
        
        <div className="lesson-result-stats">
          <div><strong>{result.correct} / {result.total}</strong><span>correct answers</span></div>
          <div><strong>+{result.earned}</strong><span>{result.alreadyCompleted ? 'XP earned (already mastered)' : 'XP earned'}</span></div>
        </div>

        {(curriculum.learningObjectives?.length > 0 || primaryObj) && (
          <div className="results-objectives-checklist">
            <div className="results-objectives-heading"><ShieldCheck size={16} /><span>Objectives Practiced & Reinforced</span></div>
            <div className="results-revisited-list">
              {(curriculum.learningObjectives?.length > 0 ? curriculum.learningObjectives : [primaryObj]).map(obj => (
                <div key={obj.id} className="results-revisited-item">
                  <CheckCircle2 size={16} /><div><b>{obj.title}</b><p style={{ margin: 0, fontSize: '11.5px', color: '#5c6b4d' }}>{obj.description}</p></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {curriculum.review && (
          <div className="results-review-card">
            <div className="results-review-heading"><Sparkles size={15} /><span>Key Concept Takeaway</span></div>
            <p className="results-review-text">{curriculum.review}</p>
          </div>
        )}

        {result.passed ? (
          <>
            <button className="button dark full-width" onClick={next}>
              {isPathFinished ? 'You finished this path!' : 'On to the next little adventure'} <ArrowRight size={18} />
            </button>
            <button className="button light full-width" onClick={close}>Back to my journey</button>
          </>
        ) : (
          <>
            <button className="button dark full-width" onClick={reset}><RotateCcw size={18} /> Try again. You’ve got this.</button>
            <button className="button light full-width" onClick={() => setStage('learn')}>Review lesson notes</button>
          </>
        )}
      </div>
    );
  }

  if (stage === 'learn') {
    return (
      <>
        <div className="lesson-header">
          <span className={'lesson-mini-icon ' + (curriculum.accentColor || lesson.color || 'lime')}>{curriculum.icon || lesson.icon || '📖'}</span>
          <div>
            <span className="eyebrow">
              {curriculum.levelCode || 'PRE-A1'} · {curriculum.pedagogicalFocus || 'LANGUAGE PRACTICE'} · +{curriculum.xp || lesson.xp} XP
            </span>
            <h3>{curriculum.title || lesson.title}</h3>
          </div>
        </div>

        <div className="lesson-stage-stepper" role="tablist">
          <span className="stepper-step active"><span className="step-num">1</span><span>Learn</span></span>
          <span className="stepper-arrow">›</span>
          <button type="button" className="stepper-step" onClick={() => setStage('practice')}><span className="step-num">2</span><span>Practice</span></button>
          <span className="stepper-arrow">›</span>
          <span className="stepper-step"><span className="step-num">3</span><span>Results</span></span>
        </div>

        <div className="learn-stage-container">
          {primaryObj && (
            <div className="learn-objective-card">
              <div className="learn-objective-header"><Target size={16} /><span>Primary Learning Objective</span></div>
              <h4 className="learn-objective-title">{primaryObj.title}</h4>
              <p className="learn-objective-desc">{primaryObj.description}</p>
              {primaryObj.cefrDescriptor && (
                <div className="learn-cando-pill">
                  <CheckCircle2 size={16} />
                  <span><b>CEFR Can-Do Outcome:</b> {primaryObj.cefrDescriptor}</span>
                </div>
              )}
            </div>
          )}

          {curriculum.description && <p className="learn-introduction">{curriculum.description}</p>}

          {curriculum.explanation && (
            <div className="learn-explanation-card">
              <span className="learn-card-label"><BookOpen size={14} /> Teaching Explanation</span>
              <p className="learn-explanation-text">{curriculum.explanation}</p>
            </div>
          )}

          {curriculum.vocabulary?.length > 0 && (
            <div className="learn-section-block">
              <div className="learn-section-heading"><BookOpen size={15} /><span>Core Vocabulary ({curriculum.vocabulary.length} words)</span></div>
              <div className="learn-vocab-grid">
                {curriculum.vocabulary.map((v, i) => (
                  <div key={i} className="learn-vocab-card">
                    <div className="vocab-term-row"><span className="vocab-term">{v.term}</span></div>
                    <div className="vocab-definition">{v.definition}</div>
                    {v.example && <div className="vocab-example">“{v.example}”</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {curriculum.grammar && (curriculum.grammar.pattern || curriculum.grammar.rule) && (
            <div className="learn-grammar-card">
              <span className="learn-card-label"><Sparkles size={14} /> Grammar Pattern & Rule</span>
              {curriculum.grammar.pattern && <span className="grammar-pattern-badge">{curriculum.grammar.pattern}</span>}
              {curriculum.grammar.rule && <p className="grammar-rule-text">{curriculum.grammar.rule}</p>}
              {curriculum.grammar.example && <div className="grammar-example-note"><b>Example:</b> “{curriculum.grammar.example}”</div>}
            </div>
          )}

          {curriculum.workedExamples?.length > 0 && (
            <div className="learn-section-block">
              <div className="learn-section-heading"><GraduationCap size={15} /><span>Worked Examples</span></div>
              <div className="learn-worked-list">
                {curriculum.workedExamples.map((ex, i) => (
                  <div key={i} className="learn-worked-card">
                    <div className="worked-prompt"><b>Prompt:</b> {ex.prompt}</div>
                    <div className="worked-solution-pill"><Check size={14} /> <b>Solution:</b> {ex.solution}</div>
                    {(ex.reason || ex.explanation) && <p className="worked-reason-text">{ex.reason || ex.explanation}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <button className="button dark full-width start-practice-action-btn" onClick={() => setStage('practice')}>
          Start Practice ({exercises.length} questions) <ArrowRight size={18} />
        </button>
      </>
    );
  }

  // Helper to render illustrations for vocabulary choices
  function renderChoiceArt(text) {
    const t = String(text || '').toLowerCase();
    if (t.includes('apple')) return <AppleIllustration size={64} />;
    if (t.includes('cup') || t.includes('coffee') || t.includes('tea')) return <CupIllustration size={64} />;
    if (t.includes('dog') || t.includes('puppy')) return <DogIllustration size={64} />;
    if (t.includes('cat') || t.includes('kitten')) return <CatIllustration size={64} />;
    return null;
  }

  const hasVisualChoices = currentEx?.options?.some(o => renderChoiceArt(o) !== null);

  return (
    <>
      {/* SCREEN 4: TOPBAR WITH PROGRESS AND HEARTS */}
      <div className="lesson-top-bar">
        <div className="lesson-progress-segmented">
          <i style={{ width: `${(index / exercises.length) * 100}%` }} />
        </div>
        <div className="lesson-hearts-badge" aria-label="3 hearts remaining">
          <Heart size={18} fill="#ff4b4b" color="#ff4b4b" />
          <span>3</span>
        </div>
      </div>

      <div className="exercise-prompt-wrap">
        <span className="exercise-category-eyebrow">
          <Headphones size={14} /> {currentEx?.exerciseType === 'listening' ? 'LISTEN & CHOOSE' : 'CHOOSE THE CORRECT ANSWER'}
        </span>
        <h2 className="exercise-prompt-title">{currentEx?.prompt || 'Listen to the audio and choose the right option'}</h2>
        <p className="exercise-prompt-sub">Listen to the audio or read along, then select the best answer below.</p>
      </div>

      {/* Audio & Mascot Prompt Area */}
      <div className="exercise-audio-card">
        <div className="exercise-mascot-peek">
          <Mascot pose="listen" size={68} />
        </div>
        <button
          type="button"
          className="exercise-speaker-btn"
          onClick={() => speakPrompt(currentEx?.prompt || 'listen')}
          aria-label="Hear pronunciation audio"
        >
          <Volume2 size={26} />
        </button>
        <div className="exercise-audio-prompt-box">
          <div className="exercise-prompt-quote">“{currentEx?.prompt || 'Listen closely to the audio.'}”</div>
          <span className="exercise-audio-hint">Tap speaker to replay audio</span>
        </div>
      </div>

      {/* 2x2 Choice Grid or Options */}
      {currentEx && (
        <div className={hasVisualChoices ? 'choice-grid-2x2' : 'answer-options'}>
          {currentEx.options.map((opt, i) => {
            const isSelected = selected === i;
            const isCorrectOption = checked && feedback?.correctIndex === i;
            const isWrongSelection = checked && isSelected && !feedback?.isCorrect;
            const btnClass = checked
              ? (isCorrectOption ? 'correct' : isWrongSelection ? 'incorrect' : '')
              : (isSelected ? 'selected' : '');
            
            const art = renderChoiceArt(opt);

            if (hasVisualChoices) {
              return (
                <button
                  key={i}
                  type="button"
                  disabled={checked || busy || lifecycle === 'submitting'}
                  className={`choice-card-item ${btnClass}`}
                  onClick={() => setSelected(i)}
                >
                  <div className="choice-illustration-wrap">
                    {art || <BookOpen size={40} color="#58cc02" />}
                  </div>
                  <span className="choice-card-label">{opt}</span>
                </button>
              );
            }

            return (
              <button
                key={i}
                type="button"
                disabled={checked || busy || lifecycle === 'submitting'}
                className={btnClass}
                onClick={() => setSelected(i)}
              >
                <span>{String.fromCharCode(65 + i)}</span>
                {opt}
                {checked && isCorrectOption && <Check size={18} />}
              </button>
            );
          })}
        </div>
      )}

      {/* Feedback Banner */}
      {checked && feedback && (
        <div className={'answer-feedback ' + (feedback.isCorrect ? 'positive' : 'negative')}>
          <b>{feedback.isCorrect ? 'That’s it! You’ve got this.' : 'Almost! Here’s a little tip.'}</b>
          {currentEx?.explanation && <p>{currentEx.explanation}</p>}
        </div>
      )}

      {error && <div className="form-error">{error}</div>}

      {/* Full-width 3D Action Button */}
      <button
        className="exercise-check-btn button primary"
        disabled={selected === null || busy || lifecycle === 'submitting'}
        onClick={() => (checked ? advance() : checkAnswer())}
      >
        {busy || lifecycle === 'submitting' ? (
          <Loader2 className="spin" size={18} />
        ) : (
          <>
            {checked ? (index === exercises.length - 1 ? 'See my little win' : 'Next question') : 'Check my answer'}
            <ArrowRight size={18} />
          </>
        )}
      </button>
    </>
  );
}

createRoot(document.getElementById('root')).render(<App />);

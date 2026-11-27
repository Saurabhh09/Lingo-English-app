import 'dotenv/config';
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lessons, questionPool } from './content.js';
import { getPublicLevels, getPublicLesson, getLessonSolutionKeys, getLessonById, checkLessonPrerequisites, CURRICULUM_CATALOG } from './server/curriculumCatalog.mjs';
import { getCheckpointUnitLessons } from './src/curriculumData.js';
import { validateCurriculumCatalog } from './server/curriculumValidator.mjs';
import { requireAdmin } from './server/adminAuth.mjs';
import { getPublicPracticeCatalog, getListeningSolutionKeys, LISTENING_MODULES, SPEAKING_PROMPTS, PRONUNCIATION_ITEMS, CONVERSATION_SCENARIOS } from './server/practiceCatalog.mjs';
import { evaluatePronunciation } from './server/pronunciationEvaluator.mjs';
import { generateQuestionSet, generateCuratedFallbackQuestions, validateQuestionConfig, setQuestionGeneratorMock, clearQuestionGeneratorMock, hasQuestionGeneratorMock } from './server/questionGenerator.mjs';
import { getAIStatus, sendAIConversationTurn, generateGuidedFallbackResponse, setAIProviderMock, clearAIProviderMock, hasAIProviderMock } from './server/aiProvider.mjs';
import { BADGE_CATALOG, BADGE_CATEGORIES } from './server/badgeCatalog.mjs';
import { evaluateAchievements, formatAchievementSummary, isValidVocabTerm, ensureAchievementState } from './server/achievementEngine.mjs';
import { REWARD_DEFINITIONS } from './server/rewardDefinitions.mjs';
import { evaluateRewards, claimReward, formatRewardHistory, ensureRewardState } from './server/rewardEngine.mjs';
import {
  deriveLingoId,
  ensureSocialState,
  buildPublicProfileCard,
  pairKey,
  isBlockedBetween,
  areFriends,
  getFriendUsernames,
  getFriendStatus,
  pushNotification,
  expireStaleInvitations,
  syncSocialToSupabase,
  INVITE_TTL_MS,
  GAME_INVITE_TTL_MS
} from './server/socialEngine.mjs';

const PRESET_TOPIC_NAMES = new Set([
  'Mixed English',
  'Grammar',
  'Vocabulary',
  'Food & drinks',
  'Conversation',
  'Daily conversation',
  'Business English',
  'Travel English',
  'Interview preparation'
]);
const root = path.dirname(fileURLToPath(import.meta.url));
if (fs.existsSync(path.join(root, '.env'))) {
  const envContent = fs.readFileSync(path.join(root, '.env'), 'utf8');
  for (const line of envContent.split(/\r?\n/)) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2] ? m[2].trim().replace(/^['"](.*)['"]$/, '$1') : '';
    }
  }
}
const app = express();
app.set('trust proxy', 1);
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});
app.use(express.json({ limit: '20kb' }));
app.use((req, res, next) => {
  if (req.url.includes('/api/index') && req.originalUrl) {
    req.url = req.originalUrl;
  }
  if (!req.url.startsWith('/api')) {
    if (req.originalUrl && req.originalUrl.startsWith('/api')) {
      req.url = req.originalUrl;
    } else if (process.env.VERCEL) {
      req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
    }
  }
  next();
});
const connected = (process.env.NODE_ENV !== 'production' && process.env.ISOLATED_TEST) ? false : !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const supabase = connected ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } }) : null;
const dataPath = (process.env.NODE_ENV !== 'production' && process.env.DATA_PATH) ? path.resolve(process.env.DATA_PATH) : path.join(root, 'data.json');
let local = fs.existsSync(dataPath) ? JSON.parse(fs.readFileSync(dataPath, 'utf8')) : { accounts: {}, sessions: {}, progress: {}, games: {}, solo: {} };
if (!local.solo) local.solo = {};
const db = { async get(table, id) { if (!supabase) return structuredClone(local[table]?.[id] || null); const { data, error } = await supabase.from('lingo_' + table).select('payload').eq('id', id).maybeSingle(); if (error) throw Error('Database is not ready. Apply supabase/schema.sql.'); return data?.payload || null; }, async set(table, id, payload) { if (table === 'accounts' || (table === 'progress' && id !== SOCIAL_STATE_ID)) socialDirectoryCache = null; if (supabase) { const { error } = await supabase.from('lingo_' + table).upsert({ id, payload }); if (error) throw Error('Database write failed. Check your Supabase setup.'); } else { if (!local[table]) local[table] = {}; local[table][id] = structuredClone(payload); try { fs.writeFileSync(dataPath + '.tmp', JSON.stringify(local)); fs.renameSync(dataPath + '.tmp', dataPath); } catch { fs.writeFileSync(dataPath, JSON.stringify(local)); } } }, async del(table, id) { if (table === 'accounts' || (table === 'progress' && id !== SOCIAL_STATE_ID)) socialDirectoryCache = null; if (supabase) { const { error } = await supabase.from('lingo_' + table).delete().eq('id', id); if (error) throw error; } else { if (local[table]) delete local[table][id]; fs.writeFileSync(dataPath, JSON.stringify(local)); } } };
const SOCIAL_STATE_ID = '__lingo_social_state__';
let socialDirectoryCache = null;
const SOCIAL_DIRECTORY_TTL_MS = 8000;
async function getSocialState() {
  const raw = await db.get('progress', SOCIAL_STATE_ID);
  const s = ensureSocialState(raw);
  if (expireStaleInvitations(s, now())) {
    await db.set('progress', SOCIAL_STATE_ID, s);
  }
  return s;
}
async function saveSocialState(s, { syncTables = null } = {}) {
  await db.set('progress', SOCIAL_STATE_ID, s);
  await syncSocialToSupabase(supabase, s, { tables: syncTables });
}
async function listAccountsAndProgress() {
  if (supabase) {
    if (socialDirectoryCache && (Date.now() - socialDirectoryCache.ts) < SOCIAL_DIRECTORY_TTL_MS) {
      return socialDirectoryCache.value;
    }
    const [accRes, progRes] = await Promise.all([
      supabase.from('lingo_accounts').select('id, payload').limit(5000),
      supabase.from('lingo_progress').select('id, payload').neq('id', SOCIAL_STATE_ID).limit(5000)
    ]);
    if (accRes.error) throw new Error('Failed to load accounts: ' + accRes.error.message);
    if (progRes.error) throw new Error('Failed to load progress: ' + progRes.error.message);
    const accountsMap = {};
    for (const r of (accRes.data || [])) {
      if (!r?.id || !r?.payload) continue;
      const acc = typeof r.payload === 'string' ? JSON.parse(r.payload) : { ...r.payload };
      if (!acc.username) acc.username = r.id;
      if (!acc.lingoId) acc.lingoId = deriveLingoId(acc.username);
      accountsMap[r.id] = acc;
    }
    const progressMap = {};
    for (const r of (progRes.data || [])) {
      if (!r?.id || !r?.payload) continue;
      progressMap[r.id] = typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload;
    }
    const value = { accountsMap, progressMap };
    socialDirectoryCache = { ts: Date.now(), value };
    return value;
  }
  const accountsMap = {};
  for (const [k, v] of Object.entries(local.accounts || {})) {
    if (!v) continue;
    accountsMap[k] = { ...v, username: v.username || k, lingoId: v.lingoId || deriveLingoId(v.username || k) };
  }
  const progressMap = { ...(local.progress || {}) };
  delete progressMap[SOCIAL_STATE_ID];
  return { accountsMap, progressMap };
}
const id = () => randomBytes(16).toString('hex'); const hash = s => createHash('sha256').update(s).digest('hex'); const today = () => new Date().toISOString().slice(0, 10);

let badgesCatalogSeeded = false;
async function syncRelationalAchievements(username, earnedBadges = {}, achievementProgress = {}) {
  if (!supabase) return;
  try {
    if (!badgesCatalogSeeded) {
      const rows = BADGE_CATALOG.map(b => ({
        id: b.id,
        name: b.name,
        description: b.description,
        category: b.category,
        icon: b.icon,
        rarity: b.rarity,
        unlock_condition: b.unlockCondition
      }));
      const { error: seedErr } = await supabase.from('badges').upsert(rows, { onConflict: 'id' });
      if (!seedErr) badgesCatalogSeeded = true;
    }
    const badgeRows = Object.values(earnedBadges).map(b => ({
      id: `${username}:${b.badgeId}`,
      user_id: username,
      badge_id: b.badgeId,
      earned_at: b.earnedAt || new Date().toISOString(),
      related_entity_type: b.relatedEntityType || null,
      related_entity_id: b.relatedEntityId || null
    }));
    if (badgeRows.length) {
      await supabase.from('user_badges').upsert(badgeRows, { onConflict: 'user_id,badge_id' });
    }
    const progRows = Object.values(achievementProgress).map(ap => ({
      id: `${username}:${ap.achievementId}`,
      user_id: username,
      achievement_id: ap.achievementId,
      current_progress: ap.currentProgress || 0,
      target_progress: Math.max(1, ap.targetProgress || 1),
      updated_at: ap.updatedAt || new Date().toISOString()
    }));
    if (progRows.length) {
      await supabase.from('achievement_progress').upsert(progRows, { onConflict: 'user_id,achievement_id' });
    }
  } catch {
    // Graceful fallback: lingo_progress JSONB remains authoritative even if relational migration hasn't run yet.
  }
}
let rewardDefsSeeded = false;
async function syncRelationalRewards(username, progress = {}) {
  if (!supabase) return;
  try {
    if (!rewardDefsSeeded) {
      const defRows = REWARD_DEFINITIONS.map(r => ({
        id: r.id,
        name: r.name,
        description: r.description,
        trigger_type: r.triggerType,
        trigger_reference: r.triggerReference,
        xp_amount: r.xpAmount || 0,
        gems_amount: r.gemsAmount || 0,
        badge_id: r.badgeId || null,
        certificate_title: r.certificateTitle || null,
        is_active: r.isActive !== false
      }));
      const { error: seedErr } = await supabase.from('reward_definitions').upsert(defRows, { onConflict: 'id' });
      if (!seedErr) rewardDefsSeeded = true;
    }
    const rewardRows = Object.values(progress.rewards || {}).map(rw => ({
      id: `${username}:${rw.rewardId}`,
      user_id: username,
      reward_id: rw.rewardId,
      status: rw.status,
      unlocked_at: rw.unlockedAt || null,
      claimed_at: rw.claimedAt || null
    }));
    if (rewardRows.length) {
      await supabase.from('user_rewards').upsert(rewardRows, { onConflict: 'user_id,reward_id' });
    }
    const txRows = (progress.walletLedger || []).map(tx => ({
      id: `${username}:${tx.id}`,
      user_id: username,
      currency: tx.currency,
      amount: tx.amount,
      source_type: tx.sourceType,
      source_id: tx.sourceId,
      created_at: tx.createdAt || new Date().toISOString()
    }));
    if (txRows.length) {
      await supabase.from('wallet_transactions').upsert(txRows, { onConflict: 'user_id,currency,source_type,source_id' });
    }
  } catch {
    // Graceful fallback: lingo_progress JSONB remains authoritative if relational reward tables aren't applied yet.
  }
}
const locks = new Map(); async function locked(key, fn) { const prior = locks.get(key) || Promise.resolve(); let release; const next = new Promise(r => release = r); locks.set(key, next); await prior; try { return await fn(); } finally { release(); if (locks.get(key) === next) locks.delete(key); } }
const fail = (msg, status = 400) => { const e = Error(msg); e.status = status; throw e; };
const route = fn => async (req, res, next) => { try { await fn(req, res); } catch (e) { next(e); } };
const rate = new Map();
app.use('/api/auth', (req, res, next) => {
  if (process.env.NODE_ENV !== 'production' && (req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1')) return next();
  const k = req.ip;
  const t = Date.now();
  let a = (rate.get(k) || []).filter(x => t - x < 60000);
  if (a.length > 25) return res.status(429).json({ error: 'A little too fast! Try again in a minute.' });
  a.push(t);
  rate.set(k, a);
  next();
});
setInterval(() => {
  const t = Date.now();
  for (const [k, a] of rate.entries()) {
    const valid = a.filter(x => t - x < 60000);
    if (valid.length === 0) rate.delete(k);
    else rate.set(k, valid);
  }
}, 300000).unref();
let testClockOffset = 0;
const now = () => Date.now() + (process.env.NODE_ENV !== 'production' ? testClockOffset : 0);
if (process.env.NODE_ENV !== 'production') {
  app.post('/api/test/advance-clock', (req, res) => {
    const ms = Number(req.body.ms) || 0;
    testClockOffset += ms;
    res.json({ now: now(), offset: testClockOffset });
  });
  app.post('/api/test/reset-clock', (_, res) => {
    testClockOffset = 0;
    rate.clear();
    res.json({ now: now(), offset: testClockOffset });
  });
  app.post('/api/test/set-ai-mock', (req, res) => {
    const { questions, error } = req.body;
    if (error) {
      const err = new Error(error.message || 'Mock Error');
      err.status = error.status || 500;
      err.code = error.code || 'MOCK_ERROR';
      setQuestionGeneratorMock(() => ({ error: err }));
    } else if (Array.isArray(questions)) {
      setQuestionGeneratorMock(() => ({ questions }));
    } else {
      clearQuestionGeneratorMock();
    }
    res.json({ ok: true, mocked: true });
  });
  app.post('/api/test/clear-ai-mock', (_, res) => {
    clearQuestionGeneratorMock();
    res.json({ ok: true, mocked: false });
  });
  app.post('/api/test/set-ai-convo-mock', (req, res) => {
    const { reply, grammarCorrection, vocabularyTips, error, source, model, mockType, errorStatus, errorMessage } = req.body;
    if (error || mockType === 'error') {
      const err = new Error(errorMessage || error?.message || 'Mock Convo Error');
      err.status = errorStatus || error?.status || 500;
      err.code = error?.code || 'MOCK_ERROR';
      setAIProviderMock(() => { throw err; });
    } else if (reply) {
      setAIProviderMock(() => ({
        reply,
        grammarCorrection: grammarCorrection || null,
        vocabularyTips: vocabularyTips || [],
        source: source || 'gemini',
        model: model || 'gemini-2.5-flash'
      }));
    } else {
      clearAIProviderMock();
    }
    res.json({ ok: true, mocked: true });
  });
  app.post('/api/test/clear-ai-convo-mock', (_, res) => {
    clearAIProviderMock();
    res.json({ ok: true, mocked: false });
  });
}
const CACHED_PUBLIC_LEVELS = getPublicLevels();
const CACHED_PUBLIC_PRACTICE = getPublicPracticeCatalog();
const CACHED_BADGES_CATALOG = { categories: BADGE_CATEGORIES, badges: BADGE_CATALOG };
const CACHED_REWARDS_CATALOG = { rewards: REWARD_DEFINITIONS };
app.get('/api/health', (_, res) => res.json({ status: 'ok', uptime: Math.floor(process.uptime()), timestamp: now(), database: connected ? 'supabase' : 'demo' }));
app.get('/api/config', (_, res) => res.json({ database: connected ? 'supabase' : 'demo', app: 'Lingo' }));
app.get('/api/curriculum/levels', (_, res) => { res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600'); res.json(CACHED_PUBLIC_LEVELS); });
app.get('/api/curriculum/lessons/batch', (req, res) => {
  const rawIds = String(req.query.ids || '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 12);
  if (!rawIds.length) return res.status(400).json({ error: 'Lesson IDs are required.' });
  res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
  res.json({ lessons: rawIds.map(id => getPublicLesson(id)).filter(Boolean) });
});
app.get('/api/curriculum/lessons/:id', (req, res) => { const l = getPublicLesson(req.params.id); if (!l) return res.status(404).json({ error: 'Lesson not found.' }); res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600'); res.json(l); });
app.get('/api/practice/catalog', (_, res) => { res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600'); res.json(CACHED_PUBLIC_PRACTICE); });
app.get('/api/badges', (_, res) => { res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600'); res.json(CACHED_BADGES_CATALOG); });
app.get('/api/rewards/catalog', (_, res) => { res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600'); res.json(CACHED_REWARDS_CATALOG); });
app.get('/api/ai/status', (_, res) => res.json(getAIStatus()));
app.post('/api/pronunciation/evaluate', route(async (req, res) => {
  const { targetPhrase, spokenTranscript, spokenText, transcript } = req.body;
  const spoken = spokenTranscript || spokenText || transcript || '';
  if (!targetPhrase || typeof targetPhrase !== 'string') fail('Target phrase is required.', 400);
  res.json(evaluatePronunciation(targetPhrase, spoken));
}));
app.post('/api/curriculum/exercises/check', route(async (req, res) => {
  const { lessonId, exerciseIndex, choice, exerciseId } = req.body;
  if (typeof lessonId !== 'string' || !lessonId.trim()) fail('Lesson ID is required.', 400);
  const keys = getLessonSolutionKeys(lessonId);
  if (!keys) fail('Lesson not found.', 404);
  if (!Number.isInteger(exerciseIndex) || exerciseIndex < 0 || exerciseIndex >= keys.length) fail('Invalid exercise index.', 400);
  if (!Number.isInteger(choice) || choice < 0 || choice > 3) fail('Invalid choice. Must be an option index between 0 and 3.', 400);
  if (exerciseId !== undefined && exerciseId !== keys[exerciseIndex].id) fail('Exercise ID mismatch for submitted index.', 400);

  // Prerequisite verification: if authenticated, ensure learner has unlocked the lesson
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  if (token) {
    const s = await db.get('sessions', hash(token));
    if (s && s.expires >= Date.now()) {
      const authUser = await db.get('accounts', s.username);
      if (authUser) {
        const userProgress = await db.get('progress', authUser.username);
        const prereqCheck = checkLessonPrerequisites(lessonId, userProgress?.completed || []);
        if (!prereqCheck.unlocked) {
          fail('Complete the prerequisite lesson first before checking exercises.', 403);
        }
      }
    }
  }
  const correctIndex = keys[exerciseIndex].solutionKey.correctIndex;
  const isCorrect = correctIndex === choice;
  res.json({ isCorrect, correctIndex });
}));
const initialProgress = (demo = false) => ({ xp: demo ? 1240 : 0, gems: 0, words: demo ? 450 : 0, streak: demo ? 7 : 0, completed: [], checkpoints: [], saved: [], rewards: {}, walletLedger: [], certificates: {}, goal: 10, todayWords: 0, lastStudy: null, history: {}, dailyDate: today(), practice: { listening: [], speaking: [], pronunciation: [], conversation: [] } });
const publicUser = u => ({ username: u.username, lingoId: u.lingoId || deriveLingoId(u.username), name: u.name, avatar: u.avatar || '🌱', avatarColor: u.avatarColor || 'lime', demo: u.demo });
async function session(u) { const token = id() + id(); await db.set('sessions', hash(token), { username: u.username, expires: Date.now() + 30 * 86400000 }); return token; }
app.post('/api/auth/signup', route(async (req, res) => { const { name, password } = req.body; const username = String(req.body.username || '').toLowerCase().trim(); if (!/^[a-z0-9_]{3,20}$/.test(username)) fail('Use 3–20 letters, numbers, or underscores for your username.'); if (typeof name !== 'string' || !name.trim() || name.length > 40) fail('Please enter a name (up to 40 characters).'); if (typeof password !== 'string' || password.length < 8 || password.length > 128) fail('Choose a password with 8–128 characters.'); await locked('signup:' + username, async () => { if (await db.get('accounts', username)) fail('That username is taken. Try another one.', 409); const salt = id(); const u = { username, lingoId: deriveLingoId(username), avatar: '🌱', avatarColor: 'lime', name: name.trim(), salt, password: scryptSync(password, salt, 64).toString('hex'), demo: false }; await db.set('accounts', username, u); await db.set('progress', username, initialProgress()); res.json({ token: await session(u), user: publicUser(u), progress: initialProgress() }); }); }));
app.post('/api/auth/login', route(async (req, res) => { const username = String(req.body.username || '').toLowerCase().trim(); const u = await db.get('accounts', username); if (!u || typeof req.body.password !== 'string' || req.body.password.length > 128 || !timingSafeEqual(Buffer.from(u.password, 'hex'), scryptSync(req.body.password, u.salt, 64))) fail('Username or password doesn’t match.', 401); if (!u.lingoId || !u.avatar || !u.avatarColor) { u.lingoId = u.lingoId || deriveLingoId(u.username); u.avatar = u.avatar || '🌱'; u.avatarColor = u.avatarColor || 'lime'; await db.set('accounts', username, u); } res.json({ token: await session(u), user: publicUser(u), progress: await db.get('progress', username) }); }));
app.post('/api/auth/demo', route(async (req, res) => {
  if (connected) {
    fail('Demo accounts cannot be created when connected to Supabase. Please sign in or create an account.', 403);
  }
  const username = 'demo_' + id().slice(0, 12), salt = id();
  const u = { username, name: 'Jamie', demo: true, salt, password: scryptSync(id(), salt, 64).toString('hex') };
  await db.set('accounts', username, u);
  const progress = initialProgress(true);
  await db.set('progress', username, progress);
  res.json({ token: await session(u), user: publicUser(u), progress });
}));
app.use('/api', async (req, res, next) => { try { const token = (req.headers.authorization || '').replace(/^Bearer /, ''); const s = token && await db.get('sessions', hash(token)); if (!s || s.expires < Date.now()) fail('Please sign in to continue.', 401); req.user = await db.get('accounts', s.username); if (!req.user) fail('Please sign in again.', 401); req.sessionKey = hash(token); next(); } catch (e) { next(e); } });
app.get('/api/me', route(async (req, res) => {
  if (!req.user.lingoId || !req.user.avatar || !req.user.avatarColor) {
    req.user.lingoId = req.user.lingoId || deriveLingoId(req.user.username);
    req.user.avatar = req.user.avatar || '🌱';
    req.user.avatarColor = req.user.avatarColor || 'lime';
    await db.set('accounts', req.user.username, req.user);
  }
  await locked(req.user.username, async () => {
    const p = await db.get('progress', req.user.username);
    if (!p.practice) p.practice = { listening: [], speaking: [], pronunciation: [], conversation: [] };
    let dirty = false;
    if (p.dailyDate !== today()) {
      p.todayWords = 0;
      p.dailyDate = today();
      dirty = true;
    }
    const prevBadgeCount = Object.keys(p.badges || {}).length;
    const nowIso = new Date(now()).toISOString();
    const evalRes = evaluateAchievements(p, { type: 'backfill' }, nowIso);
    const rewardEval = evaluateRewards(p, nowIso);
    if (dirty || evalRes.newlyUnlocked.length > 0 || rewardEval.newlyAvailable.length > 0 || prevBadgeCount === 0 && Object.keys(p.achievementProgress || {}).length > 0) {
      await db.set('progress', req.user.username, p);
      if (evalRes.newlyUnlocked.length > 0) {
        await syncRelationalAchievements(req.user.username, p.badges, p.achievementProgress);
      }
      if (rewardEval.newlyAvailable.length > 0) {
        await syncRelationalRewards(req.user.username, p);
      }
    }
    res.json({
      user: publicUser(req.user),
      progress: p,
      newlyUnlockedBadges: evalRes.newlyUnlocked,
      newlyAvailableRewards: rewardEval.newlyAvailable
    });
  });
}));
app.get('/api/achievements', route(async (req, res) => {
  await locked(req.user.username, async () => {
    const p = await db.get('progress', req.user.username);
    const evalRes = evaluateAchievements(p, { type: 'backfill' }, new Date(now()).toISOString());
    await db.set('progress', req.user.username, p);
    if (evalRes.newlyUnlocked.length > 0) {
      await syncRelationalAchievements(req.user.username, p.badges, p.achievementProgress);
    }
    res.json({
      catalog: BADGE_CATALOG,
      categories: BADGE_CATEGORIES,
      earnedBadges: p.badges || {},
      achievementProgress: p.achievementProgress || {},
      summary: formatAchievementSummary(p),
      newlyUnlockedBadges: evalRes.newlyUnlocked
    });
  });
}));
app.get('/api/rewards', route(async (req, res) => {
  await locked(req.user.username, async () => {
    const p = await db.get('progress', req.user.username);
    const nowIso = new Date(now()).toISOString();
    const rewardEval = evaluateRewards(p, nowIso);
    if (rewardEval.newlyAvailable.length > 0) {
      await db.set('progress', req.user.username, p);
      await syncRelationalRewards(req.user.username, p);
    } else {
      ensureRewardState(p);
    }
    res.json({
      gems: p.gems || 0,
      xp: p.xp || 0,
      rewards: p.rewards || {},
      walletLedger: p.walletLedger || [],
      certificates: p.certificates || {},
      history: formatRewardHistory(p),
      newlyAvailableRewards: rewardEval.newlyAvailable
    });
  });
}));
app.post('/api/rewards/:id/claim', route(async (req, res) => {
  const rewardId = String(req.params.id || '').trim();
  if (!rewardId) fail('Reward ID is required.', 400);
  await locked(req.user.username, async () => {
    const p = await db.get('progress', req.user.username);
    const nowIso = new Date(now()).toISOString();
    const result = claimReward(p, rewardId, nowIso);
    await db.set('progress', req.user.username, p);
    await syncRelationalRewards(req.user.username, p);
    if (result.newlyUnlockedBadges.length > 0) {
      await syncRelationalAchievements(req.user.username, p.badges, p.achievementProgress);
    }
    res.json({
      progress: p,
      reward: result.reward,
      alreadyClaimed: result.alreadyClaimed,
      xpAdded: result.xpAdded,
      gemsAdded: result.gemsAdded,
      newlyUnlockedBadges: result.newlyUnlockedBadges,
      gems: p.gems || 0,
      xp: p.xp || 0
    });
  });
}));
app.post('/api/auth/logout', route(async (req, res) => { await db.del('sessions', req.sessionKey); res.json({ ok: true }); }));
app.get('/api/admin/curriculum/validate', requireAdmin, (req, res) => {
  const report = validateCurriculumCatalog(CURRICULUM_CATALOG);
  res.json(report);
});
app.get('/api/admin/status', requireAdmin, (req, res) => {
  res.json({ ok: true, admin: req.user.username });
});
app.post('/api/progress/goal', route(async (req, res) => { if (![5, 10, 20, 30].includes(req.body.goal)) fail('Choose a valid daily goal.'); await locked(req.user.username, async () => { const p = await db.get('progress', req.user.username); p.goal = req.body.goal; await db.set('progress', req.user.username, p); res.json(p); }); }));
app.post('/api/progress/word', route(async (req, res) => {
  const word = typeof req.body.word === 'string' ? req.body.word.trim() : '';
  if (!isValidVocabTerm(word)) fail('Word not found.');
  await locked(req.user.username, async () => {
    const p = await db.get('progress', req.user.username);
    ensureAchievementState(p);
    p.saved = p.saved.includes(word) ? p.saved.filter(w => w !== word) : [...p.saved, word];
    const evalRes = evaluateAchievements(p, { type: 'vocabulary_saved', word }, new Date(now()).toISOString());
    await db.set('progress', req.user.username, p);
    await syncRelationalAchievements(req.user.username, p.badges, p.achievementProgress);
    res.json({ ...p, newlyUnlockedBadges: evalRes.newlyUnlocked });
  });
}));
app.get('/api/progress/lessons/:id/status', route(async (req, res) => {
  const p = await db.get('progress', req.user.username);
  const prereqCheck = checkLessonPrerequisites(req.params.id, p.completed);
  if (!prereqCheck.found) fail('Lesson not found.', 404);
  const idx = lessons.findIndex(l => l.id === req.params.id);
  const seqOk = idx === 0 || p.completed.includes(lessons[idx - 1].id);
  res.json({
    lessonId: req.params.id,
    isUnlocked: prereqCheck.unlocked && seqOk,
    missingPrerequisites: prereqCheck.missing,
    isCompleted: p.completed.includes(req.params.id)
  });
}));
app.post('/api/progress/lesson', route(async (req, res) => {
  const lesson = lessons.find(l => l.id === req.body.lesson);
  if (!lesson) fail('Lesson not found.', 400);
  const answers = req.body.answers;
  if (!Array.isArray(answers) || answers.length !== lesson.questions.length || answers.some(x => !Number.isInteger(x) || x < 0 || x > 3)) fail('Finish all the questions first.', 400);
  const durationSec = typeof req.body.durationSec === 'number' && req.body.durationSec > 0 ? req.body.durationSec : null;
  const exerciseTimesSec = Array.isArray(req.body.exerciseTimesSec) ? req.body.exerciseTimesSec : null;
  await locked(req.user.username, async () => {
    const p = await db.get('progress', req.user.username);
    ensureAchievementState(p);
    const prereqCheck = checkLessonPrerequisites(lesson.id, p.completed);
    const idx = lessons.findIndex(l => l.id === lesson.id);
    const seqOk = idx === 0 || p.completed.includes(lessons[idx - 1].id);
    if (!prereqCheck.unlocked || !seqOk) fail('Complete the previous level to unlock this one.', 400);
    const correct = lesson.questions.filter((q, i) => q[2] === answers[i]).length;
    const passed = correct >= Math.ceil(lesson.questions.length * .6);
    const fresh = !p.completed.includes(lesson.id);
    let earned = 0;
    if (passed && fresh) {
      earned = lesson.xp;
      p.completed.push(lesson.id);
      p.xp += earned;
      p.words += lesson.questions.length;
      if (p.dailyDate !== today()) p.todayWords = 0;
      p.todayWords += lesson.questions.length;
      p.dailyDate = today();
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      p.streak = p.lastStudy === today() ? p.streak : p.lastStudy === yesterday ? p.streak + 1 : 1;
      p.lastStudy = today();
      p.history[today()] = (p.history[today()] || 0) + lesson.questions.length;
    }
    const nowIso = new Date(now()).toISOString();
    const evalRes = evaluateAchievements(
      p,
      {
        type: 'lesson_completed',
        lessonId: lesson.id,
        correct,
        total: lesson.questions.length,
        passed,
        fresh,
        durationSec,
        exerciseTimesSec
      },
      nowIso
    );
    const rewardEval = evaluateRewards(p, nowIso);
    await db.set('progress', req.user.username, p);
    await syncRelationalAchievements(req.user.username, p.badges, p.achievementProgress);
    if (rewardEval.newlyAvailable.length > 0) {
      await syncRelationalRewards(req.user.username, p);
    }
    res.json({
      progress: p,
      correct,
      total: lesson.questions.length,
      passed,
      earned,
      alreadyCompleted: !fresh,
      newlyUnlockedBadges: evalRes.newlyUnlocked,
      newlyAvailableRewards: rewardEval.newlyAvailable
    });
  });
}));
app.post('/api/progress/checkpoint', route(async (req, res) => {
  const { checkpointId, submissions } = req.body || {};
  if (typeof checkpointId !== 'string' || !checkpointId.startsWith('checkpoint-')) {
    fail('Invalid checkpoint ID.', 400);
  }
  const cpInfo = getCheckpointUnitLessons(checkpointId);
  if (!cpInfo || !Array.isArray(cpInfo.precedingRealIds) || cpInfo.precedingRealIds.length === 0) {
    fail('Unknown or invalid checkpoint ID.', 400);
  }
  const cpItem = cpInfo.unit?.lessons?.find(l => l.isCheckpoint && l.id === checkpointId);
  const canonicalXp = Number(cpItem?.xp) > 0 && Number(cpItem?.xp) <= 200 ? Number(cpItem.xp) : 40;
  const totalUnitExercises = cpInfo.precedingRealIds.reduce((sum, id) => {
    const keys = getLessonSolutionKeys(id);
    return sum + (Array.isArray(keys) ? keys.length : 0);
  }, 0);
  const expectedCount = Math.min(5, totalUnitExercises);
  if (expectedCount <= 0) {
    fail('Checkpoint exercises are unavailable.', 400);
  }
  if (!Array.isArray(submissions) || submissions.length !== expectedCount) {
    fail(`Submit all ${expectedCount} milestone review answers.`, 400);
  }
  const seenExercises = new Set();
  let correct = 0;
  for (const item of submissions) {
    const { lessonId, exerciseIndex, choice, exerciseId } = item || {};
    if (typeof lessonId !== 'string' || !cpInfo.precedingRealIds.includes(lessonId)) {
      fail('Checkpoint exercise does not belong to this unit.', 400);
    }
    if (!Number.isInteger(exerciseIndex) || exerciseIndex < 0) {
      fail('Invalid checkpoint exercise index.', 400);
    }
    if (!Number.isInteger(choice) || choice < 0 || choice > 3) {
      fail('Invalid checkpoint answer choice.', 400);
    }
    const dedupeKey = `${lessonId}:${exerciseIndex}`;
    if (seenExercises.has(dedupeKey)) {
      fail('Duplicate checkpoint exercise submission.', 400);
    }
    seenExercises.add(dedupeKey);
    const lessonKeys = getLessonSolutionKeys(lessonId);
    const exKey = lessonKeys?.[exerciseIndex];
    if (!exKey || !exKey.solutionKey) {
      fail('Checkpoint exercise not found.', 400);
    }
    if (exerciseId !== undefined && exKey.id !== exerciseId) {
      fail('Checkpoint exercise ID mismatch.', 400);
    }
    if (choice === exKey.solutionKey.correctIndex) {
      correct += 1;
    }
  }
  const total = submissions.length;
  await locked(req.user.username, async () => {
    const p = await db.get('progress', req.user.username);
    ensureAchievementState(p);
    const missingUnitLessons = cpInfo.precedingRealIds.filter(id => !p.completed.includes(id));
    if (missingUnitLessons.length > 0) {
      fail('Complete all lessons in this unit to unlock this milestone review.', 400);
    }
    if (!Array.isArray(p.checkpoints)) p.checkpoints = [];
    const passed = correct >= Math.ceil(total * 0.6);
    const fresh = !p.checkpoints.includes(checkpointId);
    let earned = 0;
    if (passed && fresh) {
      earned = canonicalXp;
      p.checkpoints.push(checkpointId);
      p.xp += earned;
      p.words += total;
      if (p.dailyDate !== today()) p.todayWords = 0;
      p.todayWords += total;
      p.dailyDate = today();
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      p.streak = p.lastStudy === today() ? p.streak : p.lastStudy === yesterday ? p.streak + 1 : 1;
      p.lastStudy = today();
      p.history[today()] = (p.history[today()] || 0) + total;
    }
    const nowIso = new Date(now()).toISOString();
    const evalRes = evaluateAchievements(
      p,
      { type: 'checkpoint_completed', checkpointId, correct, total, passed },
      nowIso
    );
    const rewardEval = evaluateRewards(p, nowIso);
    await db.set('progress', req.user.username, p);
    await syncRelationalAchievements(req.user.username, p.badges, p.achievementProgress);
    if (rewardEval.newlyAvailable.length > 0) {
      await syncRelationalRewards(req.user.username, p);
    }
    res.json({
      progress: p,
      correct,
      total,
      passed,
      earned,
      alreadyCompleted: !fresh,
      newlyUnlockedBadges: evalRes.newlyUnlocked,
      newlyAvailableRewards: rewardEval.newlyAvailable
    });
  });
}));
app.post('/api/practice/listening/submit', route(async (req, res) => {
  const { moduleId, answers } = req.body;
  if (typeof moduleId !== 'string' || !moduleId.trim()) fail('Module ID is required.', 400);
  const keys = getListeningSolutionKeys(moduleId);
  if (!keys) fail('Listening module not found.', 404);
  if (!Array.isArray(answers) || answers.length !== keys.length || answers.some(x => !Number.isInteger(x) || x < 0 || x > 3)) {
    fail('Answer all listening questions with valid options.', 400);
  }
  const mod = LISTENING_MODULES.find(m => m.id === moduleId);
  await locked(req.user.username, async () => {
    const p = await db.get('progress', req.user.username);
    if (!p.practice) p.practice = { listening: [], speaking: [], pronunciation: [], conversation: [] };
    const correct = answers.filter((ans, idx) => ans === keys[idx]).length;
    const passed = correct >= Math.ceil(keys.length * 0.6);
    const fresh = !p.practice.listening.includes(moduleId);
    let earned = 0;
    if (passed && fresh) {
      earned = mod.xp || 25;
      p.practice.listening.push(moduleId);
      p.xp += earned;
      p.words += keys.length;
      if (p.dailyDate !== today()) p.todayWords = 0;
      p.todayWords += keys.length;
      p.dailyDate = today();
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      p.streak = p.lastStudy === today() ? p.streak : p.lastStudy === yesterday ? p.streak + 1 : 1;
      p.lastStudy = today();
      p.history[today()] = (p.history[today()] || 0) + keys.length;
    }
    const evalRes = evaluateAchievements(
      p,
      { type: 'assessment_completed', passed, correct, total: keys.length, moduleId },
      new Date(now()).toISOString()
    );
    await db.set('progress', req.user.username, p);
    await syncRelationalAchievements(req.user.username, p.badges, p.achievementProgress);
    res.json({
      progress: p,
      correct,
      total: keys.length,
      passed,
      earned,
      alreadyCompleted: !fresh,
      solutions: keys,
      newlyUnlockedBadges: evalRes.newlyUnlocked
    });
  });
}));
app.post('/api/practice/speaking/submit', route(async (req, res) => {
  const { promptId, transcript } = req.body;
  if (typeof promptId !== 'string' || !promptId.trim()) fail('Prompt ID is required.', 400);
  const spk = SPEAKING_PROMPTS.find(s => s.id === promptId);
  if (!spk) fail('Speaking prompt not found.', 404);
  if (typeof transcript !== 'string' || !transcript.trim()) {
    fail('Spoken transcript cannot be empty.', 400);
  }
  const words = transcript.trim().split(/\s+/).filter(Boolean);
  if (words.length < (spk.minWords || 5)) {
    fail(`Your spoken response must contain at least ${spk.minWords} words. You spoke ${words.length}.`, 400);
  }
  await locked(req.user.username, async () => {
    const p = await db.get('progress', req.user.username);
    if (!p.practice) p.practice = { listening: [], speaking: [], pronunciation: [], conversation: [] };
    const fresh = !p.practice.speaking.includes(promptId);
    let earned = 0;
    if (fresh) {
      earned = spk.xp || 30;
      p.practice.speaking.push(promptId);
      p.xp += earned;
      p.words += words.length;
      if (p.dailyDate !== today()) p.todayWords = 0;
      p.todayWords += words.length;
      p.dailyDate = today();
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      p.streak = p.lastStudy === today() ? p.streak : p.lastStudy === yesterday ? p.streak + 1 : 1;
      p.lastStudy = today();
      p.history[today()] = (p.history[today()] || 0) + words.length;
    }
    const evalRes = evaluateAchievements(p, { type: 'daily_activity_completed' }, new Date(now()).toISOString());
    await db.set('progress', req.user.username, p);
    await syncRelationalAchievements(req.user.username, p.badges, p.achievementProgress);
    res.json({
      progress: p,
      passed: true,
      wordCount: words.length,
      earned,
      alreadyCompleted: !fresh,
      feedback: 'Great speaking practice! Voice recorded and verified.',
      newlyUnlockedBadges: evalRes.newlyUnlocked
    });
  });
}));
app.post('/api/practice/pronunciation/submit', route(async (req, res) => {
  const { itemId, transcript } = req.body;
  if (typeof itemId !== 'string' || !itemId.trim()) fail('Pronunciation item ID is required.', 400);
  const item = PRONUNCIATION_ITEMS.find(p => p.id === itemId);
  if (!item) fail('Pronunciation item not found.', 404);
  if (typeof transcript !== 'string' || !transcript.trim()) {
    fail('Spoken transcript cannot be empty.', 400);
  }
  const evalResult = evaluatePronunciation(item.targetPhrase, transcript);
  await locked(req.user.username, async () => {
    const p = await db.get('progress', req.user.username);
    if (!p.practice) p.practice = { listening: [], speaking: [], pronunciation: [], conversation: [] };
    const fresh = !p.practice.pronunciation.includes(itemId);
    let earned = 0;
    if (evalResult.passed && fresh) {
      earned = item.xp || 20;
      p.practice.pronunciation.push(itemId);
      p.xp += earned;
      p.words += 1;
      if (p.dailyDate !== today()) p.todayWords = 0;
      p.todayWords += 1;
      p.dailyDate = today();
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      p.streak = p.lastStudy === today() ? p.streak : p.lastStudy === yesterday ? p.streak + 1 : 1;
      p.lastStudy = today();
      p.history[today()] = (p.history[today()] || 0) + 1;
    }
    const evalRes = evaluateAchievements(
      p,
      evalResult.passed ? { type: 'daily_activity_completed' } : { type: 'evaluate' },
      new Date(now()).toISOString()
    );
    await db.set('progress', req.user.username, p);
    await syncRelationalAchievements(req.user.username, p.badges, p.achievementProgress);
    res.json({
      ...evalResult,
      progress: p,
      earned,
      alreadyCompleted: !fresh,
      newlyUnlockedBadges: evalRes.newlyUnlocked
    });
  });
}));
app.post('/api/ai/conversation', route(async (req, res) => {
  const { scenarioId, userMessage, history, level, allowFallback = true } = req.body;
  if (!userMessage || typeof userMessage !== 'string' || !userMessage.trim()) {
    fail('Message cannot be empty.', 400);
  }
  if (userMessage.length > 500) {
    fail('Message length exceeds maximum limit of 500 characters.', 400);
  }

  const scenario = CONVERSATION_SCENARIOS.find(s => s.id === scenarioId) || CONVERSATION_SCENARIOS[0];
  let turnResult;

  try {
    turnResult = await sendAIConversationTurn({
      scenario: scenario.title + ' — ' + scenario.scenario,
      aiPersona: scenario.aiPersona,
      level: level || scenario.level,
      userMessage: userMessage.trim(),
      history
    });
  } catch (aiErr) {
    // If AI is unconfigured and fallback is disallowed, preserve HTTP 503 for tests
    if (aiErr.code === 'AI_UNCONFIGURED' && allowFallback === false) {
      throw aiErr;
    }
    const isRateLimit = aiErr.status === 429 || aiErr.message?.includes('429') || aiErr.message?.toLowerCase().includes('quota') || aiErr.message?.toLowerCase().includes('rate limit');
    const reasonText = isRateLimit
      ? 'Rate limit exceeded. Used guided response.'
      : 'AI service temporarily unavailable. Used guided response.';

    console.warn(`[AI Conversation Fallback] ${aiErr.message}`);
    turnResult = generateGuidedFallbackResponse({
      scenarioId: scenario.id,
      userMessage: userMessage.trim(),
      history,
      reason: reasonText
    });
  }

  await locked(req.user.username, async () => {
    const p = await db.get('progress', req.user.username);
    if (!p.practice) p.practice = { listening: [], speaking: [], pronunciation: [], conversation: [] };
    const fresh = !p.practice.conversation.includes(scenario.id);
    let earned = 0;
    if (fresh && Array.isArray(history) && history.length >= 2) {
      earned = 30;
      p.practice.conversation.push(scenario.id);
      p.xp += earned;
      p.words += 5;
      if (p.dailyDate !== today()) p.todayWords = 0;
      p.todayWords += 5;
      p.dailyDate = today();
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      p.streak = p.lastStudy === today() ? p.streak : p.lastStudy === yesterday ? p.streak + 1 : 1;
      p.lastStudy = today();
      p.history[today()] = (p.history[today()] || 0) + 5;
      await db.set('progress', req.user.username, p);
    }
    res.json({
      ...turnResult,
      progress: p,
      earned,
      alreadyCompleted: !fresh
    });
  });
}));

const normalizeCode = v => String(v || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
function member(u, role = 'player') { return { username: u.username, name: u.name, role: role || 'player', score: 0, index: 0, completed: false, answered: {}, answerDetails: {}, questionOrder: null, joined: now() }; }

function generateShuffledOrder(count) {
  const order = Array.from({ length: count }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

function calculatePlayerStats(questions = [], answered = {}, answerDetails = {}, isPlaying = false, currentIndex = 0, questionOrder = null) {
  let correctCount = 0;
  let incorrectCount = 0;
  let timedOutCount = 0;
  const maxIdx = isPlaying ? Math.min(currentIndex + (answered?.[currentIndex] !== undefined || answerDetails?.[currentIndex] ? 1 : 0), questions.length) : questions.length;
  for (let i = 0; i < maxIdx; i++) {
    const qIdx = (questionOrder && questionOrder[i] !== undefined) ? questionOrder[i] : i;
    const q = questions[qIdx];
    const ans = answered?.[i];
    const details = answerDetails?.[i];
    if (details?.timedOut) {
      timedOutCount++;
    } else if (details?.isCorrect || (ans !== undefined && q && ans === q[2])) {
      correctCount++;
    } else if (ans !== undefined || (details && !details.timedOut)) {
      incorrectCount++;
    } else {
      timedOutCount++;
    }
  }
  const answeredCount = correctCount + incorrectCount;
  const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
  return {
    correct: correctCount,
    incorrect: incorrectCount,
    timedOut: timedOutCount,
    answered: answeredCount,
    accuracy,
    accuracyPercent: accuracy,
    total: questions.length,
    totalQuestions: questions.length
  };
}

const MAX_ACTIVE_PLAYERS = 100;
const MAX_SPECTATORS = 20;

function view(g, u, timeOverride) {
  const mem = g.members[u.username];
  const isSpectator = mem?.role === 'spectator';
  const playerIndex = mem ? (mem.index ?? 0) : 0;
  const myCompleted = !!mem?.completed || (mem && playerIndex >= g.questions.length);

  const questionIndex = (mem && mem.questionOrder && mem.questionOrder[playerIndex] !== undefined)
    ? mem.questionOrder[playerIndex]
    : playerIndex;
  const currentQIndex = Math.min(questionIndex, Math.max(0, g.questions.length - 1));
  const current = g.questions[currentQIndex];

  const answered = mem?.answered?.[playerIndex];
  const details = mem?.answerDetails?.[playerIndex];
  const currentTime = timeOverride || now();

  const activePlayers = Object.values(g.members).filter(m => m.role !== 'spectator');
  const spectators = Object.values(g.members).filter(m => m.role === 'spectator');
  const allActiveCompleted = activePlayers.length > 0 && activePlayers.every(m => m.completed || (m.index ?? 0) >= g.questions.length);
  const allActiveAnswered = activePlayers.length > 0 && activePlayers.every(m => {
    const pIdx = m.index ?? 0;
    return m.completed || pIdx >= g.questions.length || (m.answered?.[pIdx] !== undefined && m.answered?.[pIdx] >= 0);
  });
  const canAdvance = !isSpectator && !myCompleted && (answered !== undefined && answered >= 0);

  return {
    code: g.code,
    host: g.host,
    hostRole: g.hostRole || 'player',
    isCustomTopic: !!g.isCustomTopic,
    title: g.title,
    difficulty: g.difficulty,
    topic: g.topic,
    cefrLevel: g.cefrLevel || g.metadata?.cefrLevel || 'B1',
    duration: g.duration,
    metadata: g.metadata || {},
    status: g.status,
    score: mem ? mem.score : 0,
    index: playerIndex,
    completed: myCompleted,
    total: g.questions.length,
    questionSource: g.questionSource || (g.questions?.[0]?.source || 'fallback'),
    maxPlayers: MAX_ACTIVE_PLAYERS,
    maxSpectators: MAX_SPECTATORS,
    activePlayerCount: activePlayers.length,
    spectatorCount: spectators.length,
    countdownDeadline: g.countdownDeadline || null,
    startedAt: g.startedAt || null,
    endsAt: g.endsAt,
    roundEnd: null,
    roundReady: allActiveAnswered,
    canAdvance,
    serverTime: currentTime,
    stats: mem ? calculatePlayerStats(g.questions, mem.answered, mem.answerDetails, g.status === 'playing' && !myCompleted, playerIndex, mem.questionOrder) : null,
    members: Object.values(g.members).map(m => {
      const pIdx = m.index ?? 0;
      const isCompleted = !!m.completed || pIdx >= g.questions.length;
      return {
        username: m.username,
        name: m.name,
        role: m.role || 'player',
        score: m.score,
        index: pIdx,
        completed: isCompleted,
        answered: m.answered?.[pIdx] !== undefined && m.answered?.[pIdx] >= 0,
        timedOut: false,
        stats: calculatePlayerStats(g.questions, m.answered, m.answerDetails, g.status === 'playing' && !isCompleted, pIdx, m.questionOrder)
      };
    }),
    leaderboard: Object.values(g.members)
      .filter(m => m.role !== 'spectator')
      .map(m => {
        const pIdx = m.index ?? 0;
        const isCompleted = !!m.completed || pIdx >= g.questions.length;
        const stats = calculatePlayerStats(g.questions, m.answered, m.answerDetails, g.status === 'playing' && !isCompleted, pIdx, m.questionOrder);
        return {
          username: m.username,
          name: m.name,
          role: m.role || 'player',
          score: m.score,
          index: pIdx,
          completed: isCompleted,
          correct: stats.correct,
          incorrect: stats.incorrect,
          timedOut: stats.timedOut,
          answered: stats.answered,
          accuracyPercent: stats.accuracyPercent
        };
      })
      .sort((a, b) => b.score - a.score || a.username.localeCompare(b.username)),
    question: (g.status === 'playing' && !isSpectator && !myCompleted && current) ? {
      id: current.id || `q_${playerIndex}`,
      prompt: current[0],
      options: current[1]
    } : (isSpectator && g.status === 'playing' && current) ? {
      id: current.id || 'q_0',
      prompt: current[0],
      options: current[1]
    } : null,
    answer: (!isSpectator && (answered !== undefined || details) && current) ? {
      selected: details?.timedOut ? null : (answered !== undefined ? answered : details?.choice),
      correct: current[2],
      explanation: current[3] || current.explanation || '',
      isCorrect: details ? details.isCorrect : (answered === current[2]),
      pointsEarned: details ? details.pointsEarned : 0,
      timedOut: false
    } : null
  };
}
function soloView(g, u, timeOverride) {
  const current = g.questions[g.index] || g.questions[g.questions.length - 1];
  const answered = g.answered?.[g.index];
  const details = g.answerDetails?.[g.index];
  const currentTime = timeOverride || now();
  const roundReady = g.status === 'playing' && (answered !== undefined);
  const canAdvance = roundReady;
  const stats = calculatePlayerStats(g.questions, g.answered, g.answerDetails, g.status === 'playing', g.index);

  return {
    mode: 'solo',
    id: g.id,
    title: g.title,
    difficulty: g.difficulty,
    topic: g.topic,
    cefrLevel: g.cefrLevel || g.metadata?.cefrLevel || 'B1',
    duration: g.duration,
    metadata: g.metadata || {},
    status: g.status,
    index: g.index,
    total: g.questions.length,
    questionSource: g.questionSource || (g.questions?.[0]?.source || 'fallback'),
    score: g.score || 0,
    countdownDeadline: g.countdownDeadline || null,
    startedAt: g.startedAt || null,
    endsAt: g.endsAt,
    roundEnd: null,
    roundReady,
    canAdvance,
    stats,
    serverTime: currentTime,
    question: (g.status === 'playing' || (g.status === 'finished' && (answered !== undefined || details))) && current ? {
      id: current.id || `q_${g.index}`,
      prompt: current[0],
      options: current[1]
    } : null,
    answer: (answered !== undefined || details) && current ? {
      selected: answered !== undefined ? answered : details?.choice,
      correct: current[2],
      explanation: current[3] || current.explanation || '',
      isCorrect: details ? details.isCorrect : (answered === current[2]),
      pointsEarned: details ? details.pointsEarned : 0
    } : null
  };
}
function getNextQuestion(g) {
  const pool = questionPool(g.topic, g.difficulty);
  if (!Array.isArray(pool) || pool.length === 0) return null;
  const usedPrompts = new Set((g.questions || []).map(q => q[0]));
  const unused = pool.filter(q => !usedPrompts.has(q[0]));
  if (unused.length > 0) {
    return unused[Math.floor(Math.random() * unused.length)];
  }
  const lastPrompt = g.questions?.[g.questions.length - 1]?.[0];
  const candidates = pool.length > 1 && lastPrompt
    ? pool.filter(q => q[0] !== lastPrompt)
    : pool;
  return candidates[Math.floor(Math.random() * candidates.length)];
}
async function tick(g) {
  const currentTime = now();
  if (g.status === 'countdown') {
    if (g.countdownDeadline && currentTime >= g.countdownDeadline) {
      g.status = 'playing';
      g.countdownDeadline = null;
      g.startedAt = currentTime;
      g.endsAt = currentTime + (g.duration * 60000);
      g.index = 0;
      g.questionStartedAt = currentTime;
      g.roundEnd = null;
      g.lastAnswer = 0;
      delete g.answerDeadlineAt;
      for (const m of Object.values(g.members)) {
        m.index = m.index ?? 0;
        m.completed = m.completed ?? false;
        m.questionStartedAt = currentTime;
      }
      await db.set('games', g.code, g);
    }
    return;
  }
  if (g.status !== 'playing') return;
  if (currentTime >= g.endsAt) {
    g.status = 'finished';
    await db.set('games', g.code, g);
    return;
  }
  const activePlayers = Object.values(g.members).filter(m => m.role !== 'spectator');
  const allCompleted = activePlayers.length > 0 && activePlayers.every(m => m.completed || (m.index ?? 0) >= g.questions.length);
  if (allCompleted) {
    g.status = 'finished';
    await db.set('games', g.code, g);
  }
}
async function tickSolo(g) {
  const currentTime = now();
  if (g.status === 'countdown') {
    if (g.countdownDeadline && currentTime >= g.countdownDeadline) {
      g.status = 'playing';
      g.countdownDeadline = null;
      g.startedAt = currentTime;
      g.endsAt = currentTime + (g.duration * 60000);
      g.index = 0;
      g.questionStartedAt = currentTime;
      g.roundEnd = null;
      g.lastAnswer = 0;
      await db.set('solo', g.user, g);
    }
    return;
  }
  if (g.status !== 'playing') return;
  if (currentTime >= g.endsAt || g.index >= g.questions.length) {
    g.status = 'finished';
    await db.set('solo', g.user, g);
    return;
  }
  // In Solo mode, no delayed auto-advance. Player advances explicitly via Next Question or endsAt expires.
}
app.post('/api/games/solo', route(async (req, res) => {
  await locked('solo:' + req.user.username, async () => {
    const existing = await db.get('solo', req.user.username);
    if (existing && (existing.status === 'countdown' || existing.status === 'playing')) {
      await tickSolo(existing);
      return res.json(soloView(existing, req.user));
    }

    const isCustomTopic = req.body.isCustomTopic === true ||
      req.body.metadata?.topicType === 'custom' ||
      req.body.metadata?.isCustomTopic === true ||
      req.body.topicType === 'custom' ||
      Boolean(req.body.customTopic);

    const rawTopic = isCustomTopic
      ? (req.body.customTopic || req.body.metadata?.topicName || req.body.topic || 'Mixed English')
      : (req.body.metadata?.topicName || req.body.topic || 'Mixed English');

    const rawCefr = req.body.cefrLevel || req.body.metadata?.cefrLevel || req.body.difficulty || 'B1';
    const rawDuration = req.body.metadata?.targetDurationMinutes ?? req.body.duration ?? 3;
    const rawCount = req.body.metadata?.targetQuestionCount ?? req.body.questionCount ?? req.body.count ?? Math.min(50, Math.max(3, Math.ceil(Number(rawDuration) * 60 / 20)));

    const validatedConfig = validateQuestionConfig({
      cefrLevel: rawCefr,
      topic: rawTopic,
      duration: rawDuration,
      questionCount: rawCount
    });

    let questions;
    if (isCustomTopic) {
      questions = await generateQuestionSet(validatedConfig, { allowFallback: false });
    } else if (hasQuestionGeneratorMock()) {
      const allowFallback = req.body.allowFallback !== false && req.body.metadata?.allowFallback !== false;
      questions = await generateQuestionSet(validatedConfig, { allowFallback });
    } else {
      questions = generateCuratedFallbackQuestions({
        cefrLevel: validatedConfig.cefrLevel,
        topic: validatedConfig.topic,
        questionCount: validatedConfig.questionCount,
        reason: 'SUGGESTED_TOPIC_CATALOG'
      });
    }

    const currentTime = now();
    const soloGame = {
      id: 'solo:' + req.user.username,
      mode: 'solo',
      user: req.user.username,
      isCustomTopic: !!isCustomTopic,
      title: validatedConfig.topic + ' solo challenge',
      difficulty: req.body.difficulty || (['Pre-A1', 'A1', 'A2'].includes(validatedConfig.cefrLevel) ? 'Beginner' : ['C1', 'C2'].includes(validatedConfig.cefrLevel) ? 'Advanced' : 'Intermediate'),
      cefrLevel: validatedConfig.cefrLevel,
      topic: validatedConfig.topic,
      duration: validatedConfig.duration,
      metadata: req.body.metadata || {},
      status: 'countdown',
      questionSource: questions[0]?.source || 'fallback',
      countdownDeadline: currentTime + 10000,
      startedAt: null,
      endsAt: null,
      roundEnd: null,
      index: 0,
      lastAnswer: 0,
      score: 0,
      answered: {},
      answerDetails: {},
      questions
    };

    await db.set('solo', req.user.username, soloGame);

    const delay = Math.max(0, soloGame.countdownDeadline - now());
    setTimeout(async () => {
      try {
        await locked('solo:' + req.user.username, async () => {
          const cur = await db.get('solo', req.user.username);
          if (cur && cur.status === 'countdown') {
            await tickSolo(cur);
          }
        });
      } catch (err) {
        console.error('Solo countdown background transition error:', err.message);
      }
    }, delay);

    res.json(soloView(soloGame, req.user, currentTime));
  });
}));
app.get('/api/games/solo', route(async (req, res) => {
  await locked('solo:' + req.user.username, async () => {
    const g = await db.get('solo', req.user.username);
    if (!g) fail('Solo game not found.', 404);
    await tickSolo(g);
    res.json(soloView(g, req.user));
  });
}));
app.post('/api/games/solo/answer', route(async (req, res) => {
  await locked('solo:' + req.user.username, async () => {
    const g = await db.get('solo', req.user.username);
    if (!g) fail('Solo game not found.', 404);
    await tickSolo(g);
    if (g.status !== 'playing') fail('Game is not in a valid answering state.');

    const currentTime = now();
    if (currentTime >= g.endsAt) {
      g.status = 'finished';
      await db.set('solo', req.user.username, g);
      fail('Game duration has expired.', 400);
    }

    if (req.body.index !== undefined && g.index !== req.body.index) fail('The next question has started.');
    const currentQ = g.questions[g.index];
    if (!currentQ) fail('Question not found.', 404);
    if (req.body.questionId && currentQ) {
      const qId = currentQ.id || `q_${g.index}`;
      if (req.body.questionId !== qId && req.body.questionId !== g.index) {
        fail('Question does not match the active question.');
      }
    }
    const choice = req.body.choice;
    if (!Number.isInteger(choice) || choice < 0 || choice > 3) fail('Choose an answer.');

    if (g.answered[g.index] !== undefined) {
      if (g.answered[g.index] === choice) {
        return res.json(soloView(g, req.user));
      }
      fail('You already answered this question.');
    }

    g.answered[g.index] = choice;
    g.lastAnswer = currentTime;
    const correctChoice = currentQ[2];
    const isCorrect = choice === correctChoice;
    let points = 0;
    if (isCorrect) {
      const elapsedSec = Math.max(0, Math.floor((currentTime - (g.questionStartedAt || g.startedAt || currentTime)) / 1000));
      const speedBonus = Math.max(0, 20 - elapsedSec) * 5;
      points = 100 + speedBonus;
      g.score = (g.score || 0) + points;
    }
    if (!g.answerDetails) g.answerDetails = {};
    g.answerDetails[g.index] = {
      choice,
      correctChoice,
      isCorrect,
      pointsEarned: points,
      timedOut: false,
      timestamp: currentTime
    };

    if (g.index + 1 >= g.questions.length) {
      g.status = 'finished';
    }

    if (isCorrect) {
      await locked(req.user.username, async () => {
        const p = await db.get('progress', req.user.username);
        if (p) {
          const elapsedSec = Math.max(0, Math.floor((currentTime - (g.questionStartedAt || g.startedAt || currentTime)) / 1000));
          const isGrammar = g.topic === 'Grammar';
          evaluateAchievements(
            p,
            {
              type: isGrammar ? 'grammar_exercise_completed' : 'game_answer_correct',
              count: 1,
              fast: elapsedSec <= 15
            },
            new Date(now()).toISOString()
          );
          await db.set('progress', req.user.username, p);
        }
      });
    }

    await db.set('solo', req.user.username, g);
    res.json(soloView(g, req.user));
  });
}));
app.post('/api/games/solo/next', route(async (req, res) => {
  await locked('solo:' + req.user.username, async () => {
    const g = await db.get('solo', req.user.username);
    if (!g) fail('Solo game not found.', 404);
    await tickSolo(g);
    if (g.status !== 'playing') fail('Game is not playing.');

    const currentTime = now();
    if (currentTime >= g.endsAt) {
      g.status = 'finished';
      await db.set('solo', req.user.username, g);
      fail('Game duration has expired.', 400);
    }

    const answered = g.answered?.[g.index] !== undefined;
    if (!answered) {
      fail('Please answer the question before proceeding.', 400);
    }

    if (g.index + 1 >= g.questions.length) {
      g.status = 'finished';
      await db.set('solo', req.user.username, g);
      return res.json(soloView(g, req.user));
    }

    g.index++;
    g.questionStartedAt = currentTime;
    g.lastAnswer = 0;
    await db.set('solo', req.user.username, g);
    res.json(soloView(g, req.user));
  });
}));
app.post('/api/games/solo/leave', route(async (req, res) => {
  await locked('solo:' + req.user.username, async () => {
    await db.del('solo', req.user.username);
    res.json({ ok: true });
  });
}));
app.post('/api/games', route(async (req, res) => {
  await locked('create_game:' + req.user.username, async () => {
    const isCustomTopic = req.body.isCustomTopic === true ||
      req.body.metadata?.topicType === 'custom' ||
      req.body.metadata?.isCustomTopic === true ||
      req.body.topicType === 'custom' ||
      Boolean(req.body.customTopic);

    const rawTopic = isCustomTopic
      ? (req.body.customTopic || req.body.metadata?.topicName || req.body.topic || 'Mixed English')
      : (req.body.metadata?.topicName || req.body.topic || 'Mixed English');

    const rawCefr = req.body.cefrLevel || req.body.metadata?.cefrLevel || req.body.difficulty || 'B1';
    const rawDuration = req.body.metadata?.targetDurationMinutes ?? req.body.duration ?? 3;
    const rawCount = req.body.metadata?.targetQuestionCount ?? req.body.questionCount ?? req.body.count ?? Math.min(50, Math.max(3, Math.ceil(Number(rawDuration) * 60 / 20)));

    const validatedConfig = validateQuestionConfig({
      cefrLevel: rawCefr,
      topic: rawTopic,
      duration: rawDuration,
      questionCount: rawCount
    });

    const hostRole = (req.body.hostRole === 'spectator' || req.body.metadata?.hostRole === 'spectator') ? 'spectator' : 'player';
    let code;
    do { code = randomBytes(4).toString('hex').slice(0, 6).toUpperCase(); } while (await db.get('games', code));

    let questions;
    if (isCustomTopic) {
      questions = await generateQuestionSet(validatedConfig, { allowFallback: false });
    } else if (hasQuestionGeneratorMock()) {
      const allowFallback = req.body.allowFallback !== false && req.body.metadata?.allowFallback !== false;
      questions = await generateQuestionSet(validatedConfig, { allowFallback });
    } else {
      questions = generateCuratedFallbackQuestions({
        cefrLevel: validatedConfig.cefrLevel,
        topic: validatedConfig.topic,
        questionCount: validatedConfig.questionCount,
        reason: 'SUGGESTED_TOPIC_CATALOG'
      });
    }

    const hostMem = member(req.user, hostRole);
    if (isCustomTopic && hostRole !== 'spectator') {
      hostMem.questionOrder = generateShuffledOrder(questions.length);
    }

    const g = {
      code,
      host: req.user.username,
      hostRole,
      isCustomTopic: !!isCustomTopic,
      title: validatedConfig.topic + ' challenge',
      difficulty: req.body.difficulty || (['Pre-A1', 'A1', 'A2'].includes(validatedConfig.cefrLevel) ? 'Beginner' : ['C1', 'C2'].includes(validatedConfig.cefrLevel) ? 'Advanced' : 'Intermediate'),
      cefrLevel: validatedConfig.cefrLevel,
      topic: validatedConfig.topic,
      duration: validatedConfig.duration,
      metadata: req.body.metadata || {},
      status: 'waiting',
      questionSource: questions[0]?.source || 'fallback',
      created: now(),
      countdownDeadline: null,
      startedAt: null,
      endsAt: null,
      roundEnd: null,
      index: 0,
      lastAnswer: 0,
      members: { [req.user.username]: hostMem },
      questions
    };
    await db.set('games', code, g);
    res.json(view(g, req.user));
  });
}));
app.post('/api/games/join', route(async (req, res) => {
  const code = normalizeCode(req.body.code);
  await locked('game:' + code, async () => {
    const g = await db.get('games', code);
    if (!g) fail('We couldn’t find that game. Double-check the code.', 404);
    await tick(g);
    if (g.status === 'finished') fail('That game has finished. Create a new challenge!');
    if (!['waiting', 'countdown', 'playing'].includes(g.status) && !g.members[req.user.username]) {
      fail('That game is not available to join.');
    }
    if (!g.members[req.user.username]) {
      const activeCount = Object.values(g.members).filter(m => m.role !== 'spectator').length;
      const spectatorCount = Object.values(g.members).filter(m => m.role === 'spectator').length;
      const joinRole = (req.body.role === 'spectator' || req.body.metadata?.role === 'spectator') ? 'spectator' : 'player';

      if (joinRole === 'spectator') {
        if (spectatorCount >= MAX_SPECTATORS) {
          fail(`This room has reached maximum spectator capacity (${MAX_SPECTATORS} spectators).`, 400);
        }
      } else {
        if (activeCount >= MAX_ACTIVE_PLAYERS) {
          fail(`This room is full (${MAX_ACTIVE_PLAYERS} active players).`, 400);
        }
      }

      const newMem = member(req.user, joinRole);
      if (g.isCustomTopic && joinRole !== 'spectator') {
        let guestOrder = generateShuffledOrder(g.questions.length);
        const existingHost = Object.values(g.members).find(m => m.role !== 'spectator' && m.questionOrder);
        if (g.questions.length > 1 && existingHost?.questionOrder) {
          if (guestOrder[0] === existingHost.questionOrder[0]) {
            [guestOrder[0], guestOrder[1]] = [guestOrder[1], guestOrder[0]];
          }
        }
        newMem.questionOrder = guestOrder;
      }
      g.members[req.user.username] = newMem;
      await db.set('games', code, g);
    }
    res.json(view(g, req.user));
  });
}));
app.get('/api/games/:code', route(async (req, res) => {
  const code = normalizeCode(req.params.code);
  await locked('game:' + code, async () => {
    const g = await db.get('games', code);
    if (!g || !g.members[req.user.username]) fail('Game not found.', 404);
    await tick(g);
    res.json(view(g, req.user));
  });
}));
app.post('/api/games/:code/start', route(async (req, res) => {
  const code = normalizeCode(req.params.code);
  await locked('game:' + code, async () => {
    const g = await db.get('games', code);
    if (!g) fail('Game not found.', 404);
    if (g.host !== req.user.username) fail('Only the host can start this game.', 403);
    if (g.status === 'countdown') return res.json(view(g, req.user));
    if (g.status === 'playing') fail('This game has already started.', 400);
    if (g.status === 'finished') fail('This game has finished.', 400);
    if (g.status !== 'waiting') fail('This game cannot be started.', 400);

    const currentTime = now();
    g.status = 'countdown';
    g.countdownDeadline = currentTime + 10000;
    g.startedAt = null;
    g.endsAt = null;
    g.roundEnd = null;
    await db.set('games', g.code, g);

    const delay = Math.max(0, g.countdownDeadline - now());
    setTimeout(async () => {
      try {
        await locked('game:' + g.code, async () => {
          const cur = await db.get('games', g.code);
          if (cur && cur.status === 'countdown') {
            await tick(cur);
          }
        });
      } catch (err) {
        console.error('Countdown background transition error:', err.message);
      }
    }, delay);

    res.json(view(g, req.user, currentTime));
  });
}));
app.post('/api/games/:code/answer', route(async (req, res) => {
  const code = normalizeCode(req.params.code);
  await locked('game:' + code, async () => {
    const g = await db.get('games', code);
    if (!g || !g.members[req.user.username]) fail('Game not found.', 404);
    const m = g.members[req.user.username];
    if (m.role === 'spectator') fail('Spectators cannot submit answers.', 403);
    await tick(g);
    if (g.status !== 'playing') fail('Game is not in a valid answering state.');

    const currentTime = now();
    if (currentTime >= g.endsAt) {
      g.status = 'finished';
      await db.set('games', g.code, g);
      fail('Game duration has expired.', 400);
    }

    const playerIndex = m.index ?? 0;
    if (m.completed || playerIndex >= g.questions.length) {
      fail('You have already completed all questions.', 400);
    }

    if (req.body.index !== undefined && playerIndex !== req.body.index) {
      fail('The next question has started.');
    }
    const questionIndex = (m.questionOrder && m.questionOrder[playerIndex] !== undefined)
      ? m.questionOrder[playerIndex]
      : playerIndex;
    const currentQ = g.questions[questionIndex];
    if (!currentQ) fail('Question not found.', 404);
    if (req.body.questionId) {
      const qId = currentQ.id || `q_${playerIndex}`;
      if (req.body.questionId !== qId && req.body.questionId !== playerIndex && req.body.questionId !== questionIndex) {
        fail('Question does not match the active question.');
      }
    }

    const choice = req.body.choice;
    if (!Number.isInteger(choice) || choice < 0 || choice > 3) fail('Choose an answer.');

    if (m.answered[playerIndex] !== undefined && m.answered[playerIndex] >= 0) {
      if (m.answered[playerIndex] === choice) {
        return res.json(view(g, req.user));
      }
      fail('You already answered this question.');
    }

    m.answered[playerIndex] = choice;
    g.lastAnswer = currentTime;
    const correctChoice = currentQ[2];
    const isCorrect = choice === correctChoice;
    let points = 0;
    if (isCorrect) {
      const elapsedSec = Math.max(0, Math.floor((currentTime - (m.questionStartedAt || g.startedAt || currentTime)) / 1000));
      const speedBonus = Math.max(0, 20 - elapsedSec) * 5;
      points = 100 + speedBonus;
      m.score = (m.score || 0) + points;
    }
    if (!m.answerDetails) m.answerDetails = {};
    m.answerDetails[playerIndex] = {
      choice,
      correctChoice,
      isCorrect,
      pointsEarned: points,
      timedOut: false,
      timestamp: currentTime
    };

    if (playerIndex + 1 >= g.questions.length) {
      m.completed = true;
    }

    const activePlayers = Object.values(g.members).filter(mem => mem.role !== 'spectator');
    const allDone = activePlayers.length > 0 && activePlayers.every(mem => mem.completed || (mem.index ?? 0) >= g.questions.length);
    if (allDone) {
      g.status = 'finished';
    }

    if (isCorrect) {
      await locked(req.user.username, async () => {
        const p = await db.get('progress', req.user.username);
        if (p) {
          const elapsedSec = Math.max(0, Math.floor((currentTime - (m.questionStartedAt || g.startedAt || currentTime)) / 1000));
          const isGrammar = g.topic === 'Grammar';
          evaluateAchievements(
            p,
            {
              type: isGrammar ? 'grammar_exercise_completed' : 'game_answer_correct',
              count: 1,
              fast: elapsedSec <= 15
            },
            new Date(now()).toISOString()
          );
          await db.set('progress', req.user.username, p);
        }
      });
    }

    await db.set('games', g.code, g);
    res.json(view(g, req.user));
  });
}));
app.post('/api/games/:code/next', route(async (req, res) => {
  const code = normalizeCode(req.params.code);
  await locked('game:' + code, async () => {
    const g = await db.get('games', code);
    if (!g || !g.members[req.user.username]) fail('Game not found.', 404);
    const m = g.members[req.user.username];
    if (m.role === 'spectator') fail('Spectators cannot advance questions.', 403);
    await tick(g);
    if (g.status !== 'playing') fail('Game is not playing.');

    const currentTime = now();
    if (currentTime >= g.endsAt) {
      g.status = 'finished';
      await db.set('games', g.code, g);
      fail('Game duration has expired.', 400);
    }

    const playerIndex = m.index ?? 0;
    if (m.completed || playerIndex >= g.questions.length) {
      fail('You have already completed all questions.', 400);
    }
    const answered = m.answered?.[playerIndex] !== undefined && m.answered?.[playerIndex] >= 0;
    if (!answered) {
      fail('Please answer the question before proceeding.', 400);
    }

    if (playerIndex + 1 >= g.questions.length) {
      m.completed = true;
      const activePlayers = Object.values(g.members).filter(mem => mem.role !== 'spectator');
      const allDone = activePlayers.length > 0 && activePlayers.every(mem => mem.completed || (mem.index ?? 0) >= g.questions.length);
      if (allDone) {
        g.status = 'finished';
      }
      await db.set('games', g.code, g);
      return res.json(view(g, req.user));
    }

    m.index = playerIndex + 1;
    m.questionStartedAt = currentTime;
    await db.set('games', g.code, g);
    res.json(view(g, req.user));
  });
}));
app.post('/api/games/:code/leave', route(async (req, res) => {
  const code = normalizeCode(req.params.code);
  await locked('game:' + code, async () => {
    const g = await db.get('games', code);
    if (g?.members[req.user.username]) {
      delete g.members[req.user.username];
      if (g.host === req.user.username) {
        g.host = Object.keys(g.members)[0] || null;
        if (g.host) {
          g.hostRole = g.members[g.host].role || 'player';
        }
      }
      if (!g.host) {
        g.status = 'finished';
      } else if (g.status === 'playing') {
        const activePlayers = Object.values(g.members).filter(m => m.role !== 'spectator');
        if (activePlayers.length > 0 && activePlayers.every(m => m.completed || (m.index ?? 0) >= g.questions.length)) {
          g.status = 'finished';
        }
      }
      await db.set('games', g.code, g);
      if (g.status === 'finished') {
        await locked('social:global', async () => {
          const s = await getSocialState();
          let changed = false;
          for (const gi of s.gameInvitations) {
            if (gi.gameId === g.code && gi.status === 'pending') {
              gi.status = 'cancelled';
              gi.respondedAt = new Date(now()).toISOString();
              changed = true;
            }
          }
          if (changed) await saveSocialState(s);
        });
      }
    }
    res.json({ ok: true });
  });
}));

// ============================================================================
// LINGO SOCIAL: FRIENDS, COMMUNITIES, GAME INVITATIONS & NOTIFICATIONS
// ============================================================================

app.post('/api/social/presence', route(async (req, res) => {
  await locked('social:global', async () => {
    const s = await getSocialState();
    const nowMs = now();
    const prevSeen = s.presence[req.user.username] || 0;
    s.presence[req.user.username] = nowMs;
    if (nowMs - prevSeen > 25000) {
      await saveSocialState(s, { syncTables: [] });
    }

    const pendingFriendRequests = s.friendRequests.filter(
      r => r.receiverId === req.user.username && r.status === 'pending'
    ).length;
    const pendingCommunityInvites = s.communityInvitations.filter(
      i => i.inviteeId === req.user.username && i.status === 'pending'
    ).length;
    const pendingGameInvs = s.gameInvitations.filter(
      gi => gi.receiverId === req.user.username && gi.status === 'pending'
    );
    let activeGameInv = null;
    if (pendingGameInvs.length) {
      const games = await Promise.all(pendingGameInvs.map(gi => db.get('games', gi.gameId)));
      for (let idx = 0; idx < pendingGameInvs.length; idx++) {
        const g = games[idx];
        const gi = pendingGameInvs[idx];
        if (g && (g.status === 'waiting' || g.status === 'countdown')) {
          const activeCount = Object.values(g.members || {}).filter(m => m.role !== 'spectator').length;
          const senderAcc = await db.get('accounts', gi.senderId);
          activeGameInv = {
            ...gi,
            topic: g.topic,
            difficulty: g.difficulty,
            playerCount: activeCount,
            maxPlayers: MAX_ACTIVE_PLAYERS,
            senderName: senderAcc?.name || gi.senderId
          };
          break;
        }
      }
    }
    const unreadNotifs = s.notifications.filter(
      n => n.userId === req.user.username && !n.isRead
    ).length;

    res.json({
      ok: true,
      unreadCount: unreadNotifs,
      socialBadgeCount: pendingFriendRequests + pendingCommunityInvites + (activeGameInv ? 1 : 0),
      pendingFriendRequests,
      pendingCommunityInvites,
      pendingGameInvitesCount: pendingGameInvs.length,
      latestGameInvite: activeGameInv
    });
  });
}));

app.post('/api/social/profile', route(async (req, res) => {
  const { name, avatar, avatarColor } = req.body || {};
  await locked('account:' + req.user.username, async () => {
    const u = await db.get('accounts', req.user.username);
    if (!u) fail('Account not found.', 404);
    if (typeof name === 'string' && name.trim() && name.trim().length <= 40) {
      u.name = name.trim();
    }
    if (typeof avatar === 'string' && avatar.trim() && avatar.trim().length <= 8) {
      u.avatar = avatar.trim();
    }
    if (['lime', 'blue', 'purple', 'yellow', 'coral'].includes(avatarColor)) {
      u.avatarColor = avatarColor;
    }
    if (!u.lingoId) u.lingoId = deriveLingoId(u.username);
    await db.set('accounts', req.user.username, u);
    res.json({ user: publicUser(u) });
  });
}));

app.get('/api/social/overview', route(async (req, res) => {
  await locked('social:global', async () => {
    const [s, directory] = await Promise.all([getSocialState(), listAccountsAndProgress()]);
    const nowMs = now();
    const prevSeen = s.presence[req.user.username] || 0;
    s.presence[req.user.username] = nowMs;
    if (nowMs - prevSeen > 25000) {
      await saveSocialState(s, { syncTables: [] });
    }

    const { accountsMap, progressMap } = directory;
    const me = req.user.username;

    const friendNames = getFriendUsernames(s, me).filter(u => !isBlockedBetween(s, me, u));
    const friends = friendNames
      .map(uname => buildPublicProfileCard(accountsMap[uname], progressMap[uname], s.presence, nowMs))
      .filter(Boolean)
      .sort((a, b) => Number(b.isOnline) - Number(a.isOnline) || b.xp - a.xp);

    const incomingRequests = s.friendRequests
      .filter(r => r.receiverId === me && r.status === 'pending' && accountsMap[r.senderId])
      .map(r => ({
        ...r,
        sender: buildPublicProfileCard(accountsMap[r.senderId], progressMap[r.senderId], s.presence, nowMs)
      }));

    const outgoingRequests = s.friendRequests
      .filter(r => r.senderId === me && r.status === 'pending' && accountsMap[r.receiverId])
      .map(r => ({
        ...r,
        receiver: buildPublicProfileCard(accountsMap[r.receiverId], progressMap[r.receiverId], s.presence, nowMs)
      }));

    const blockedUsers = s.blocks
      .filter(b => b.blockerId === me && accountsMap[b.blockedId])
      .map(b => ({
        id: b.id,
        username: b.blockedId,
        name: accountsMap[b.blockedId]?.name || b.blockedId,
        blockedAt: b.createdAt
      }));

    const myMemberships = s.communityMembers.filter(m => m.userId === me);
    const communities = myMemberships
      .map(mem => {
        const comm = s.communities.find(c => c.id === mem.communityId);
        if (!comm) return null;
        const members = s.communityMembers.filter(m => m.communityId === comm.id);
        return {
          ...comm,
          myRole: mem.role,
          memberCount: members.length,
          memberUsernames: members.map(m => m.userId)
        };
      })
      .filter(Boolean);

    const communityInvitations = s.communityInvitations
      .filter(inv => inv.inviteeId === me && inv.status === 'pending')
      .map(inv => {
        const comm = s.communities.find(c => c.id === inv.communityId);
        const inviter = accountsMap[inv.inviterId];
        if (!comm) return null;
        const memberCount = s.communityMembers.filter(m => m.communityId === comm.id).length;
        return {
          ...inv,
          communityName: comm.name,
          communityIcon: comm.icon || '🌟',
          communityDescription: comm.description || '',
          memberCount,
          inviterName: inviter?.name || inv.inviterId
        };
      })
      .filter(Boolean);

    const pendingGameInvsForMe = s.gameInvitations.filter(
      gi => gi.receiverId === me && gi.status === 'pending'
    );
    const loadedGames = pendingGameInvsForMe.length
      ? await Promise.all(pendingGameInvsForMe.map(gi => db.get('games', gi.gameId)))
      : [];
    const gameInvitations = [];
    for (let idx = 0; idx < pendingGameInvsForMe.length; idx++) {
      const gi = pendingGameInvsForMe[idx];
      const g = loadedGames[idx];
      if (!g || g.status === 'finished' || g.status === 'playing') {
        continue;
      }
      const activeCount = Object.values(g.members || {}).filter(m => m.role !== 'spectator').length;
      const senderAcc = accountsMap[gi.senderId];
      gameInvitations.push({
        ...gi,
        topic: g.topic,
        difficulty: g.difficulty,
        cefrLevel: g.cefrLevel,
        duration: g.duration,
        playerCount: activeCount,
        maxPlayers: MAX_ACTIVE_PLAYERS,
        senderName: senderAcc?.name || gi.senderId,
        senderAvatar: senderAcc?.avatar || '🌱'
      });
    }

    const notifications = s.notifications
      .filter(n => n.userId === me)
      .slice(0, 60);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    res.json({
      me: buildPublicProfileCard(accountsMap[me] || req.user, progressMap[me], s.presence, nowMs),
      friends,
      incomingRequests,
      outgoingRequests,
      blockedUsers,
      communities,
      communityInvitations,
      gameInvitations,
      notifications,
      unreadCount
    });
  });
}));

app.get('/api/social/search', route(async (req, res) => {
  const rawQ = String(req.query.q || '').trim().toLowerCase();
  const q = rawQ.replace(/^@+/, '');
  if (q.length < 2) return res.json({ users: [] });

  await locked('social:global', async () => {
    const s = await getSocialState();
    const nowMs = now();
    const { accountsMap, progressMap } = await listAccountsAndProgress();
    const me = req.user.username;

    const scored = [];
    for (const acc of Object.values(accountsMap)) {
      if (!acc || acc.username === me) continue;
      if (isBlockedBetween(s, me, acc.username)) continue;
      const lingoId = (acc.lingoId || deriveLingoId(acc.username)).toLowerCase();
      const uname = String(acc.username || '').toLowerCase();
      const dname = String(acc.name || '').toLowerCase();

      let score = 0;
      if (uname === q || lingoId === q) score = 3;
      else if (uname.startsWith(q) || lingoId.startsWith(q) || dname.startsWith(q)) score = 2;
      else if (uname.includes(q) || lingoId.includes(q) || dname.includes(q)) score = 1;

      if (score > 0) {
        const card = buildPublicProfileCard(acc, progressMap[acc.username], s.presence, nowMs);
        scored.push({
          score,
          item: {
            ...card,
            friendStatus: getFriendStatus(s, me, acc.username)
          }
        });
      }
    }
    scored.sort((a, b) => b.score - a.score || a.item.username.localeCompare(b.item.username));
    res.json({ users: scored.slice(0, 25).map(x => x.item) });
  });
}));

app.get('/api/social/users/:username', route(async (req, res) => {
  const target = String(req.params.username || '').toLowerCase().trim();
  await locked('social:global', async () => {
    const s = await getSocialState();
    const nowMs = now();
    const me = req.user.username;
    if (target !== me && isBlockedBetween(s, me, target)) {
      fail('You cannot view this profile.', 403);
    }
    const { accountsMap, progressMap } = await listAccountsAndProgress();
    const acc = accountsMap[target];
    if (!acc) fail('User not found.', 404);
    const prog = progressMap[target];
    const card = buildPublicProfileCard(acc, prog, s.presence, nowMs);

    const myFriends = new Set(getFriendUsernames(s, me));
    const theirFriends = getFriendUsernames(s, target);
    const mutualFriendsCount = target === me ? 0 : theirFriends.filter(f => myFriends.has(f)).length;

    const myComms = new Set(s.communityMembers.filter(m => m.userId === me).map(m => m.communityId));
    const sharedCommunities = s.communityMembers
      .filter(m => m.userId === target && myComms.has(m.communityId))
      .map(m => {
        const c = s.communities.find(cm => cm.id === m.communityId);
        return c ? { id: c.id, name: c.name, icon: c.icon } : null;
      })
      .filter(Boolean);

    res.json({
      profile: {
        ...card,
        friendStatus: getFriendStatus(s, me, target),
        mutualFriendsCount,
        sharedCommunities,
        earnedBadgeIds: Object.keys(prog?.badges || {})
      }
    });
  });
}));

app.post('/api/social/friends/request', route(async (req, res) => {
  const { username, lingoId } = req.body || {};
  await locked('social:global', async () => {
    const s = await getSocialState();
    const me = req.user.username;

    let targetAcc = null;
    if (typeof username === 'string' && username.trim()) {
      const cleanUname = username.toLowerCase().trim().replace(/^@+/, '');
      targetAcc = await db.get('accounts', cleanUname);
      if (targetAcc && !targetAcc.username) targetAcc.username = cleanUname;
    } else if (typeof lingoId === 'string' && lingoId.trim()) {
      const targetId = lingoId.trim().toUpperCase();
      const { accountsMap } = await listAccountsAndProgress();
      targetAcc = Object.values(accountsMap).find(
        a => (a.lingoId || deriveLingoId(a.username)).toUpperCase() === targetId
      );
    }

    if (!targetAcc) fail('User not found.', 404);
    const target = targetAcc.username;
    if (target === me) fail('You cannot send a friend request to yourself.', 400);
    if (isBlockedBetween(s, me, target)) fail('Cannot send friend request to this user.', 403);
    if (areFriends(s, me, target)) fail('You are already friends.', 409);

    const dupOut = s.friendRequests.find(
      r => r.senderId === me && r.receiverId === target && r.status === 'pending'
    );
    if (dupOut) fail('Friend request already sent.', 409);

    const nowIso = new Date(now()).toISOString();
    const inverse = s.friendRequests.find(
      r => r.senderId === target && r.receiverId === me && r.status === 'pending'
    );
    if (inverse) {
      inverse.status = 'accepted';
      inverse.respondedAt = nowIso;
      const [u1, u2] = pairKey(me, target);
      if (!areFriends(s, u1, u2)) {
        s.friendships.push({ id: `fs_${u1}_${u2}`, userOneId: u1, userTwoId: u2, createdAt: nowIso });
      }
      pushNotification(s, {
        userId: target,
        type: 'friendship_update',
        title: 'Friend Request Accepted',
        message: `${req.user.name} accepted your friend request!`,
        relatedEntityId: me
      }, now());
      await saveSocialState(s, { syncTables: ['friendships', 'friendRequests', 'notifications'] });
      return res.json({ status: 'accepted', friendUsername: target });
    }

    const reqObj = {
      id: `fr_${randomBytes(8).toString('hex')}`,
      senderId: me,
      receiverId: target,
      status: 'pending',
      createdAt: nowIso,
      respondedAt: null
    };
    s.friendRequests.push(reqObj);
    pushNotification(s, {
      userId: target,
      type: 'friend_request',
      title: 'New Friend Request',
      message: `${req.user.name} (@${me}) wants to be your study friend.`,
      relatedEntityId: reqObj.id,
      metadata: { senderUsername: me, requestId: reqObj.id }
    }, now());
    await saveSocialState(s, { syncTables: ['friendRequests', 'notifications'] });
    res.json({ status: 'pending', request: reqObj });
  });
}));

app.post('/api/social/friends/requests/:reqId/respond', route(async (req, res) => {
  const { reqId } = req.params;
  const { action } = req.body || {};
  if (!['accept', 'reject', 'cancel'].includes(action)) fail('Invalid friend request action.', 400);

  await locked('social:global', async () => {
    const s = await getSocialState();
    const fr = s.friendRequests.find(r => r.id === reqId);
    if (!fr) fail('Friend request not found.', 404);
    if (fr.status !== 'pending') fail('This friend request has already been handled.', 400);

    const me = req.user.username;
    if ((action === 'accept' || action === 'reject') && fr.receiverId !== me) {
      fail('You are not authorized to respond to this friend request.', 403);
    }
    if (action === 'cancel' && fr.senderId !== me) {
      fail('Only the sender can cancel an outgoing friend request.', 403);
    }

    const nowIso = new Date(now()).toISOString();
    if (action === 'accept') {
      fr.status = 'accepted';
      fr.respondedAt = nowIso;
      const [u1, u2] = pairKey(fr.senderId, fr.receiverId);
      if (!areFriends(s, u1, u2)) {
        s.friendships.push({ id: `fs_${u1}_${u2}`, userOneId: u1, userTwoId: u2, createdAt: nowIso });
      }
      pushNotification(s, {
        userId: fr.senderId,
        type: 'friendship_update',
        title: 'You’re Friends!',
        message: `${req.user.name} (@${me}) accepted your friend request.`,
        relatedEntityId: me
      }, now());
    } else if (action === 'reject') {
      fr.status = 'rejected';
      fr.respondedAt = nowIso;
    } else {
      fr.status = 'cancelled';
      fr.respondedAt = nowIso;
    }

    for (const n of s.notifications) {
      if (n.userId === me && n.relatedEntityId === reqId) n.isRead = true;
    }
    await saveSocialState(s, {
      syncTables: action === 'accept'
        ? ['friendships', 'friendRequests', 'notifications']
        : ['friendRequests', 'notifications']
    });
    res.json({ ok: true, request: fr });
  });
}));

app.delete('/api/social/friends/:username', route(async (req, res) => {
  const target = String(req.params.username || '').toLowerCase().trim();
  await locked('social:global', async () => {
    const s = await getSocialState();
    const [u1, u2] = pairKey(req.user.username, target);
    const before = s.friendships.length;
    s.friendships = s.friendships.filter(f => !(f.userOneId === u1 && f.userTwoId === u2));
    if (s.friendships.length === before) fail('Friendship not found.', 404);
    await saveSocialState(s);
    if (supabase) {
      try {
        await supabase.from('friendships').delete().match({ user_one_id: u1, user_two_id: u2 });
      } catch { }
    }
    res.json({ ok: true });
  });
}));

app.post('/api/social/blocks', route(async (req, res) => {
  const { username, action = 'block' } = req.body || {};
  const target = String(username || '').toLowerCase().trim();
  if (!target || target === req.user.username) fail('Choose a valid user.', 400);

  await locked('social:global', async () => {
    const s = await getSocialState();
    const me = req.user.username;
    if (action === 'unblock') {
      s.blocks = s.blocks.filter(b => !(b.blockerId === me && b.blockedId === target));
      await saveSocialState(s);
      if (supabase) {
        try { await supabase.from('user_blocks').delete().match({ blocker_id: me, blocked_id: target }); } catch { }
      }
      return res.json({ ok: true, blocked: false });
    }
    if (!s.blocks.some(b => b.blockerId === me && b.blockedId === target)) {
      s.blocks.push({ id: `blk_${me}_${target}`, blockerId: me, blockedId: target, createdAt: new Date(now()).toISOString() });
    }
    const [u1, u2] = pairKey(me, target);
    s.friendships = s.friendships.filter(f => !(f.userOneId === u1 && f.userTwoId === u2));
    for (const r of s.friendRequests) {
      if (r.status === 'pending' && ((r.senderId === me && r.receiverId === target) || (r.senderId === target && r.receiverId === me))) {
        r.status = 'cancelled';
      }
    }
    for (const gi of s.gameInvitations) {
      if (gi.status === 'pending' && ((gi.senderId === me && gi.receiverId === target) || (gi.senderId === target && gi.receiverId === me))) {
        gi.status = 'cancelled';
      }
    }
    await saveSocialState(s);
    res.json({ ok: true, blocked: true });
  });
}));

// --- PRIVATE COMMUNITIES ---

app.post('/api/communities', route(async (req, res) => {
  const { name, description = '', icon = '🌟', allowMemberInvites = false, inviteUsernames = [] } = req.body || {};
  const cleanName = typeof name === 'string' ? name.trim() : '';
  if (cleanName.length < 2 || cleanName.length > 48) fail('Community name must be 2–48 characters.', 400);
  const cleanDesc = typeof description === 'string' ? description.trim().slice(0, 240) : '';
  const cleanIcon = typeof icon === 'string' && icon.trim() ? icon.trim().slice(0, 8) : '🌟';

  await locked('social:global', async () => {
    const s = await getSocialState();
    const me = req.user.username;
    const nowIso = new Date(now()).toISOString();
    const commId = `comm_${randomBytes(6).toString('hex')}`;

    const community = {
      id: commId,
      ownerId: me,
      name: cleanName,
      description: cleanDesc,
      icon: cleanIcon,
      allowMemberInvites: Boolean(allowMemberInvites),
      createdAt: nowIso
    };
    s.communities.push(community);
    s.communityMembers.push({
      id: `cm_${commId}_${me}`,
      communityId: commId,
      userId: me,
      role: 'owner',
      joinedAt: nowIso
    });

    const invited = [];
    const expIso = new Date(now() + INVITE_TTL_MS).toISOString();
    for (const rawU of (Array.isArray(inviteUsernames) ? inviteUsernames : [])) {
      const target = String(rawU || '').toLowerCase().trim();
      if (!target || target === me || isBlockedBetween(s, me, target) || !areFriends(s, me, target)) continue;
      if (invited.includes(target)) continue;
      const inv = {
        id: `ci_${randomBytes(8).toString('hex')}`,
        communityId: commId,
        inviterId: me,
        inviteeId: target,
        status: 'pending',
        createdAt: nowIso,
        respondedAt: null,
        expiresAt: expIso
      };
      s.communityInvitations.push(inv);
      pushNotification(s, {
        userId: target,
        type: 'community_invitation',
        title: 'Community Invitation',
        message: `${req.user.name} invited you to join "${cleanName}".`,
        relatedEntityId: inv.id,
        metadata: { communityId: commId, invitationId: inv.id }
      }, now());
      invited.push(target);
    }

    await saveSocialState(s);
    res.json({ community: { ...community, myRole: 'owner', memberCount: 1 }, invited });
  });
}));

app.get('/api/communities/:id', route(async (req, res) => {
  const commId = String(req.params.id || '').trim();
  await locked('social:global', async () => {
    const s = await getSocialState();
    const comm = s.communities.find(c => c.id === commId);
    if (!comm) fail('Community not found.', 404);
    const me = req.user.username;
    const myMem = s.communityMembers.find(m => m.communityId === commId && m.userId === me);
    if (!myMem) fail('Access denied. This community is private.', 403);

    const { accountsMap, progressMap } = await listAccountsAndProgress();
    const nowMs = now();

    const members = s.communityMembers
      .filter(m => m.communityId === commId && accountsMap[m.userId])
      .map(m => ({
        ...buildPublicProfileCard(accountsMap[m.userId], progressMap[m.userId], s.presence, nowMs),
        role: m.role,
        joinedAt: m.joinedAt
      }))
      .sort((a, b) => {
        const rank = { owner: 0, admin: 1, member: 2 };
        return (rank[a.role] ?? 3) - (rank[b.role] ?? 3) || b.xp - a.xp;
      });

    const pendingInvites = ['owner', 'admin'].includes(myMem.role)
      ? s.communityInvitations
          .filter(i => i.communityId === commId && i.status === 'pending')
          .map(i => ({
            ...i,
            inviteeName: accountsMap[i.inviteeId]?.name || i.inviteeId
          }))
      : [];

    res.json({
      community: {
        ...comm,
        myRole: myMem.role,
        memberCount: members.length,
        members,
        pendingInvites
      }
    });
  });
}));

app.patch('/api/communities/:id', route(async (req, res) => {
  const commId = String(req.params.id || '').trim();
  const { name, description, icon, allowMemberInvites } = req.body || {};
  await locked('social:global', async () => {
    const s = await getSocialState();
    const comm = s.communities.find(c => c.id === commId);
    if (!comm) fail('Community not found.', 404);
    if (comm.ownerId !== req.user.username) fail('Only the community owner can edit settings.', 403);

    if (typeof name === 'string' && name.trim().length >= 2 && name.trim().length <= 48) {
      comm.name = name.trim();
    }
    if (typeof description === 'string') {
      comm.description = description.trim().slice(0, 240);
    }
    if (typeof icon === 'string' && icon.trim()) {
      comm.icon = icon.trim().slice(0, 8);
    }
    if (typeof allowMemberInvites === 'boolean') {
      comm.allowMemberInvites = allowMemberInvites;
    }

    await saveSocialState(s);
    res.json({ community: comm });
  });
}));

app.delete('/api/communities/:id', route(async (req, res) => {
  const commId = String(req.params.id || '').trim();
  await locked('social:global', async () => {
    const s = await getSocialState();
    const comm = s.communities.find(c => c.id === commId);
    if (!comm) fail('Community not found.', 404);
    if (comm.ownerId !== req.user.username) fail('Only the owner can delete this community.', 403);

    const otherMembers = s.communityMembers.filter(m => m.communityId === commId && m.userId !== req.user.username);
    for (const m of otherMembers) {
      pushNotification(s, {
        userId: m.userId,
        type: 'community_update',
        title: 'Community Closed',
        message: `"${comm.name}" was deleted by its owner.`,
        relatedEntityId: commId
      }, now());
    }
    s.communities = s.communities.filter(c => c.id !== commId);
    s.communityMembers = s.communityMembers.filter(m => m.communityId !== commId);
    s.communityInvitations = s.communityInvitations.filter(i => i.communityId !== commId);
    await saveSocialState(s);
    if (supabase) {
      try { await supabase.from('communities').delete().eq('id', commId); } catch { }
    }
    res.json({ ok: true });
  });
}));

app.post('/api/communities/:id/invite', route(async (req, res) => {
  const commId = String(req.params.id || '').trim();
  const { usernames = [] } = req.body || {};
  await locked('social:global', async () => {
    const s = await getSocialState();
    const comm = s.communities.find(c => c.id === commId);
    if (!comm) fail('Community not found.', 404);
    const me = req.user.username;
    const myMem = s.communityMembers.find(m => m.communityId === commId && m.userId === me);
    if (!myMem) fail('Access denied.', 403);
    if (myMem.role === 'member' && !comm.allowMemberInvites) {
      fail('Only community owners and admins can invite new members.', 403);
    }

    const { accountsMap } = await listAccountsAndProgress();
    const nowIso = new Date(now()).toISOString();
    const expIso = new Date(now() + INVITE_TTL_MS).toISOString();
    const invited = [];

    for (const rawU of (Array.isArray(usernames) ? usernames : [])) {
      const target = String(rawU || '').toLowerCase().trim();
      if (!target || target === me || !accountsMap[target]) continue;
      if (isBlockedBetween(s, me, target)) continue;
      if (!areFriends(s, me, target)) continue;
      const alreadyMem = s.communityMembers.some(m => m.communityId === commId && m.userId === target);
      const alreadyInv = s.communityInvitations.some(i => i.communityId === commId && i.inviteeId === target && i.status === 'pending');
      if (alreadyMem || alreadyInv || invited.includes(target)) continue;

      const inv = {
        id: `ci_${randomBytes(8).toString('hex')}`,
        communityId: commId,
        inviterId: me,
        inviteeId: target,
        status: 'pending',
        createdAt: nowIso,
        respondedAt: null,
        expiresAt: expIso
      };
      s.communityInvitations.push(inv);
      pushNotification(s, {
        userId: target,
        type: 'community_invitation',
        title: 'Community Invitation',
        message: `${req.user.name} invited you to join "${comm.name}".`,
        relatedEntityId: inv.id,
        metadata: { communityId: commId, invitationId: inv.id }
      }, now());
      invited.push(target);
    }

    await saveSocialState(s);
    res.json({ invited });
  });
}));

app.post('/api/communities/invitations/:invId/respond', route(async (req, res) => {
  const { invId } = req.params;
  const { action } = req.body || {};
  if (!['accept', 'decline'].includes(action)) fail('Invalid invitation action.', 400);

  await locked('social:global', async () => {
    const s = await getSocialState();
    const inv = s.communityInvitations.find(i => i.id === invId);
    if (!inv) fail('Community invitation not found.', 404);
    const me = req.user.username;
    if (inv.inviteeId !== me) fail('Unauthorized to respond to this invitation.', 403);
    if (inv.status !== 'pending') fail(`This invitation is already ${inv.status}.`, 400);

    const comm = s.communities.find(c => c.id === inv.communityId);
    if (!comm) {
      inv.status = 'expired';
      await saveSocialState(s);
      fail('This community no longer exists.', 404);
    }

    const nowIso = new Date(now()).toISOString();
    inv.respondedAt = nowIso;
    if (action === 'decline') {
      inv.status = 'declined';
    } else {
      inv.status = 'accepted';
      if (!s.communityMembers.some(m => m.communityId === comm.id && m.userId === me)) {
        s.communityMembers.push({
          id: `cm_${comm.id}_${me}`,
          communityId: comm.id,
          userId: me,
          role: 'member',
          joinedAt: nowIso
        });
      }
      pushNotification(s, {
        userId: inv.inviterId,
        type: 'community_update',
        title: 'New Community Member',
        message: `${req.user.name} joined "${comm.name}"!`,
        relatedEntityId: comm.id
      }, now());
    }

    for (const n of s.notifications) {
      if (n.userId === me && n.relatedEntityId === invId) n.isRead = true;
    }
    await saveSocialState(s);
    res.json({ ok: true, status: inv.status, communityId: comm.id });
  });
}));

app.patch('/api/communities/:id/members/:targetUsername', route(async (req, res) => {
  const commId = String(req.params.id || '').trim();
  const target = String(req.params.targetUsername || '').toLowerCase().trim();
  const { action, role } = req.body || {};

  await locked('social:global', async () => {
    const s = await getSocialState();
    const comm = s.communities.find(c => c.id === commId);
    if (!comm) fail('Community not found.', 404);
    if (comm.ownerId !== req.user.username) fail('Only the community owner can manage members.', 403);
    if (target === comm.ownerId) fail('Owner membership cannot be modified here.', 400);

    const mem = s.communityMembers.find(m => m.communityId === commId && m.userId === target);
    if (!mem) fail('Member not found in community.', 404);

    if (action === 'remove') {
      s.communityMembers = s.communityMembers.filter(m => !(m.communityId === commId && m.userId === target));
      pushNotification(s, {
        userId: target,
        type: 'community_update',
        title: 'Community Update',
        message: `You were removed from "${comm.name}".`,
        relatedEntityId: commId
      }, now());
      await saveSocialState(s);
      if (supabase) {
        try { await supabase.from('community_members').delete().match({ community_id: commId, user_id: target }); } catch { }
      }
      return res.json({ ok: true, removed: target });
    }

    if (action === 'set_role' && ['admin', 'member'].includes(role)) {
      mem.role = role;
      pushNotification(s, {
        userId: target,
        type: 'community_update',
        title: 'Community Role Updated',
        message: `You are now ${role === 'admin' ? 'an Admin' : 'a Member'} in "${comm.name}".`,
        relatedEntityId: commId
      }, now());
      await saveSocialState(s);
      return res.json({ ok: true, role });
    }

    fail('Invalid member action.', 400);
  });
}));

app.post('/api/communities/:id/leave', route(async (req, res) => {
  const commId = String(req.params.id || '').trim();
  const { transferToUsername } = req.body || {};

  await locked('social:global', async () => {
    const s = await getSocialState();
    const comm = s.communities.find(c => c.id === commId);
    if (!comm) fail('Community not found.', 404);
    const me = req.user.username;
    const myMem = s.communityMembers.find(m => m.communityId === commId && m.userId === me);
    if (!myMem) fail('You are not a member of this community.', 404);

    const otherMembers = s.communityMembers.filter(m => m.communityId === commId && m.userId !== me);

    if (comm.ownerId === me) {
      if (otherMembers.length === 0) {
        s.communities = s.communities.filter(c => c.id !== commId);
        s.communityMembers = s.communityMembers.filter(m => m.communityId !== commId);
        s.communityInvitations = s.communityInvitations.filter(i => i.communityId !== commId);
        await saveSocialState(s);
        if (supabase) {
          try { await supabase.from('communities').delete().eq('id', commId); } catch { }
        }
        return res.json({ ok: true, deleted: true });
      }
      const nextOwnerId = String(transferToUsername || '').toLowerCase().trim();
      const nextOwnerMem = otherMembers.find(m => m.userId === nextOwnerId);
      if (!nextOwnerMem) {
        fail('Transfer ownership to another member before leaving this community.', 400);
      }
      comm.ownerId = nextOwnerId;
      nextOwnerMem.role = 'owner';
      pushNotification(s, {
        userId: nextOwnerId,
        type: 'community_update',
        title: 'Community Ownership Transferred',
        message: `You are now the owner of "${comm.name}".`,
        relatedEntityId: commId
      }, now());
    }

    s.communityMembers = s.communityMembers.filter(m => !(m.communityId === commId && m.userId === me));
    await saveSocialState(s);
    if (supabase) {
      try { await supabase.from('community_members').delete().match({ community_id: commId, user_id: me }); } catch { }
    }
    res.json({ ok: true, transferredTo: comm.ownerId !== me ? comm.ownerId : null });
  });
}));

// --- MULTIPLAYER GAME INVITATIONS & ACCEPT / DECLINE ---

app.post('/api/games/:code/invite', route(async (req, res) => {
  const code = normalizeCode(req.params.code);
  const { mode = 'selected', usernames = [], communityId, communityIds = [] } = req.body || {};

  await locked('game:' + code, async () => {
    const g = await db.get('games', code);
    if (!g) fail('Game room not found.', 404);
    await tick(g);
    if (!g.members[req.user.username]) fail('You must belong to this game room to invite friends.', 403);
    if (!['waiting', 'countdown'].includes(g.status)) {
      fail('Cannot send invitations after the match has started or finished.', 400);
    }

    await locked('social:global', async () => {
      const s = await getSocialState();
      const me = req.user.username;
      const { accountsMap } = await listAccountsAndProgress();

      const candidateSet = new Set();
      if (mode === 'all_friends') {
        for (const f of getFriendUsernames(s, me)) candidateSet.add(f);
      } else if (mode === 'community') {
        const ids = [...(Array.isArray(communityIds) ? communityIds : []), ...(communityId ? [communityId] : [])].filter(Boolean);
        if (!ids.length) fail('Select at least one community.', 400);
        for (const cId of ids) {
          const isMember = s.communityMembers.some(m => m.communityId === cId && m.userId === me);
          if (!isMember) fail('You can only invite communities you belong to.', 403);
          for (const m of s.communityMembers.filter(cm => cm.communityId === cId)) {
            candidateSet.add(m.userId);
          }
        }
      } else {
        for (const rawU of (Array.isArray(usernames) ? usernames : [])) {
          const u = String(rawU || '').toLowerCase().trim();
          if (u) candidateSet.add(u);
        }
      }

      const nowIso = new Date(now()).toISOString();
      const expIso = new Date(now() + GAME_INVITE_TTL_MS).toISOString();
      const activePlayerCount = Object.values(g.members).filter(m => m.role !== 'spectator').length;

      const invited = [];
      let skippedCount = 0;

      for (const target of candidateSet) {
        if (target === me || !accountsMap[target]) {
          if (target !== me) skippedCount++;
          continue;
        }
        if (g.members[target] || isBlockedBetween(s, me, target)) {
          skippedCount++;
          continue;
        }
        if (mode === 'selected' && !areFriends(s, me, target)) {
          skippedCount++;
          continue;
        }
        const existingInv = s.gameInvitations.find(
          gi => gi.gameId === code && gi.receiverId === target && ['pending', 'accepted'].includes(gi.status)
        );
        if (existingInv) {
          skippedCount++;
          continue;
        }

        // Reuse declined/expired row key if re-inviting or create fresh record
        s.gameInvitations = s.gameInvitations.filter(gi => !(gi.gameId === code && gi.receiverId === target));
        const gi = {
          id: `gi_${randomBytes(8).toString('hex')}`,
          gameId: code,
          senderId: me,
          receiverId: target,
          status: 'pending',
          createdAt: nowIso,
          respondedAt: null,
          expiresAt: expIso
        };
        s.gameInvitations.push(gi);
        pushNotification(s, {
          userId: target,
          type: 'game_invitation',
          title: 'GAME INVITATION!',
          message: `${req.user.name} challenged you to ${g.topic} (${g.difficulty}).`,
          relatedEntityId: gi.id,
          metadata: {
            inviteId: gi.id,
            gameCode: code,
            topic: g.topic,
            difficulty: g.difficulty,
            senderUsername: me,
            senderName: req.user.name,
            playerCount: activePlayerCount,
            maxPlayers: MAX_ACTIVE_PLAYERS
          }
        }, now());
        invited.push({
          ...gi,
          receiverName: accountsMap[target]?.name || target
        });
      }

      await saveSocialState(s);
      const roomInvites = s.gameInvitations
        .filter(gi => gi.gameId === code)
        .map(gi => ({
          ...gi,
          receiverName: accountsMap[gi.receiverId]?.name || gi.receiverId,
          receiverAvatar: accountsMap[gi.receiverId]?.avatar || '🌱'
        }));

      res.json({ ok: true, invited, skippedCount, invites: roomInvites });
    });
  });
}));

app.get('/api/games/:code/invites', route(async (req, res) => {
  const code = normalizeCode(req.params.code);
  const g = await db.get('games', code);
  if (!g || !g.members[req.user.username]) fail('Game room not found.', 404);

  await locked('social:global', async () => {
    const s = await getSocialState();
    const { accountsMap } = await listAccountsAndProgress();
    const invites = s.gameInvitations
      .filter(gi => gi.gameId === code)
      .map(gi => ({
        ...gi,
        receiverName: accountsMap[gi.receiverId]?.name || gi.receiverId,
        receiverAvatar: accountsMap[gi.receiverId]?.avatar || '🌱'
      }));
    res.json({ invites });
  });
}));

app.post('/api/games/invites/:invId/respond', route(async (req, res) => {
  const { invId } = req.params;
  const { action } = req.body || {};
  if (!['accept', 'decline'].includes(action)) fail('Invalid game invitation action.', 400);

  let inviteSnapshot = null;
  await locked('social:global', async () => {
    const s = await getSocialState();
    const gi = s.gameInvitations.find(x => x.id === invId);
    if (!gi) fail('Game invitation not found.', 404);
    if (gi.receiverId !== req.user.username) fail('You are not authorized to respond to this invitation.', 403);
    if (gi.status !== 'pending') fail(`This game invitation is already ${gi.status}.`, 400);

    const nowIso = new Date(now()).toISOString();
    if (action === 'decline') {
      gi.status = 'declined';
      gi.respondedAt = nowIso;
      for (const n of s.notifications) {
        if (n.userId === req.user.username && n.relatedEntityId === invId) n.isRead = true;
      }
      await saveSocialState(s);
      inviteSnapshot = { declined: true, invite: gi };
      return;
    }
    inviteSnapshot = { declined: false, invite: { ...gi } };
  });

  if (inviteSnapshot.declined) {
    return res.json({ ok: true, status: 'declined' });
  }

  const code = inviteSnapshot.invite.gameId;
  await locked('game:' + code, async () => {
    const g = await db.get('games', code);
    if (!g) {
      await locked('social:global', async () => {
        const s = await getSocialState();
        const gi = s.gameInvitations.find(x => x.id === invId);
        if (gi) gi.status = 'expired';
        await saveSocialState(s);
      });
      fail('That game room no longer exists.', 404);
    }
    await tick(g);
    if (g.status === 'finished') {
      await locked('social:global', async () => {
        const s = await getSocialState();
        const gi = s.gameInvitations.find(x => x.id === invId);
        if (gi) gi.status = 'expired';
        await saveSocialState(s);
      });
      fail('That game has already finished.', 400);
    }
    if (g.status === 'playing') {
      fail('That match has already started.', 400);
    }
    if (g.members[req.user.username]) {
      await locked('social:global', async () => {
        const s = await getSocialState();
        const gi = s.gameInvitations.find(x => x.id === invId);
        if (gi) {
          gi.status = 'accepted';
          gi.respondedAt = new Date(now()).toISOString();
        }
        await saveSocialState(s);
      });
      fail('You are already participating in this game.', 409);
    }
    const activeCount = Object.values(g.members).filter(m => m.role !== 'spectator').length;
    if (activeCount >= MAX_ACTIVE_PLAYERS) {
      fail(`This room is full (${MAX_ACTIVE_PLAYERS} active players).`, 400);
    }

    const newMem = member(req.user, 'player');
    if (g.isCustomTopic) {
      let guestOrder = generateShuffledOrder(g.questions.length);
      const existingHost = Object.values(g.members).find(m => m.role !== 'spectator' && m.questionOrder);
      if (g.questions.length > 1 && existingHost?.questionOrder && guestOrder[0] === existingHost.questionOrder[0]) {
        [guestOrder[0], guestOrder[1]] = [guestOrder[1], guestOrder[0]];
      }
      newMem.questionOrder = guestOrder;
    }
    g.members[req.user.username] = newMem;
    await db.set('games', code, g);

    await locked('social:global', async () => {
      const s = await getSocialState();
      const gi = s.gameInvitations.find(x => x.id === invId);
      if (gi) {
        gi.status = 'accepted';
        gi.respondedAt = new Date(now()).toISOString();
      }
      for (const n of s.notifications) {
        if (n.userId === req.user.username && n.relatedEntityId === invId) n.isRead = true;
      }
      pushNotification(s, {
        userId: inviteSnapshot.invite.senderId,
        type: 'game_invitation',
        title: 'Challenge Accepted!',
        message: `${req.user.name} accepted your invitation to join Room ${code}.`,
        relatedEntityId: code
      }, now());
      await saveSocialState(s);
    });

    res.json({ ok: true, status: 'accepted', game: view(g, req.user) });
  });
}));

app.post('/api/notifications/read', route(async (req, res) => {
  const { ids } = req.body || {};
  await locked('social:global', async () => {
    const s = await getSocialState();
    const me = req.user.username;
    for (const n of s.notifications) {
      if (n.userId !== me) continue;
      if (ids === 'all' || !ids || (Array.isArray(ids) && ids.includes(n.id))) {
        n.isRead = true;
      }
    }
    await saveSocialState(s);
    res.json({ ok: true });
  });
}));

app.use('/api', (req, res) => res.status(404).json({ error: 'API endpoint not found.' }));
app.use((err, req, res, next) => {
  console.error(err.message);
  const status = err.status || 500;
  const message = (status < 500 || process.env.NODE_ENV !== 'production')
    ? (err.status ? err.message : 'Something went wrong. ' + err.message)
    : 'Internal server error. Please try again.';
  res.status(status).json({ error: message });
});
const isEntryScript = Boolean(process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));
const shouldListen = !process.env.VERCEL && (isEntryScript || process.env.ISOLATED_TEST);

if (shouldListen) {
  const readApkManifest = () => {
    const manifestCandidates = [
      path.join(root, 'releases', 'apk-manifest.json'),
      path.join(root, 'dist', 'apk-manifest.json')
    ];
    const file = manifestCandidates.find(p => fs.existsSync(p));
    if (!file) return null;
    try {
      return { file, data: JSON.parse(fs.readFileSync(file, 'utf8')) };
    } catch {
      return null;
    }
  };
  const sendApkRelease = (requestedFilename, res, next) => {
    const loaded = readApkManifest();
    const downloadFilename = loaded?.data?.downloadFilename || 'lingo.apk';
    if (requestedFilename && requestedFilename !== downloadFilename) {
      return next();
    }
    const candidates = [
      path.join(root, 'releases', 'lingo.apk'),
      path.join(root, 'dist', 'downloads', downloadFilename)
    ];
    const apkFile = candidates.find(p => fs.existsSync(p));
    if (!apkFile) return next();
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
    res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
    return res.sendFile(apkFile);
  };
  app.get('/apk-manifest.json', (_, res, next) => {
    const loaded = readApkManifest();
    if (!loaded) return next();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
    return res.sendFile(loaded.file);
  });
  app.get('/downloads/:filename', (req, res, next) => sendApkRelease(req.params.filename, res, next));
  app.get('/lingo.apk', (_, res, next) => sendApkRelease(null, res, next));
  if (process.env.NODE_ENV === 'production' || process.env.ISOLATED_TEST) {
    app.use(express.static(path.join(root, 'dist')));
    app.get('/{*path}', (_, res) => res.sendFile(path.join(root, 'dist/index.html')));
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({ root, server: { middlewareMode: true, allowedHosts: true }, appType: 'spa' });
    app.use(vite.middlewares);
  }
  const server = app.listen(process.env.PORT || 3000, '0.0.0.0', () => console.log(`Lingo is ready on port ${process.env.PORT || 3000} • ${connected ? 'Supabase connected' : 'local demo database'}`));
  const shutdown = () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000).unref();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

export default app;
export { app };

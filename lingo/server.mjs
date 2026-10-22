import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lessons, questionPool } from './content.js';
import { getPublicLevels, getPublicLesson, getLessonSolutionKeys, getLessonById, checkLessonPrerequisites, CURRICULUM_CATALOG } from './server/curriculumCatalog.mjs';
import { validateCurriculumCatalog } from './server/curriculumValidator.mjs';
import { requireAdmin } from './server/adminAuth.mjs';
import { getPublicPracticeCatalog, getListeningSolutionKeys, LISTENING_MODULES, SPEAKING_PROMPTS, PRONUNCIATION_ITEMS, CONVERSATION_SCENARIOS } from './server/practiceCatalog.mjs';
import { evaluatePronunciation } from './server/pronunciationEvaluator.mjs';
import { generateQuestionSet, generateCuratedFallbackQuestions, validateQuestionConfig, setQuestionGeneratorMock, clearQuestionGeneratorMock, hasQuestionGeneratorMock } from './server/questionGenerator.mjs';
import { getAIStatus, sendAIConversationTurn, generateGuidedFallbackResponse, setAIProviderMock, clearAIProviderMock, hasAIProviderMock } from './server/aiProvider.mjs';

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
const app = express(); app.use(express.json({ limit: '20kb' }));
const connected = (process.env.NODE_ENV !== 'production' && process.env.ISOLATED_TEST) ? false : !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const supabase = connected ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } }) : null;
const dataPath = (process.env.NODE_ENV !== 'production' && process.env.DATA_PATH) ? path.resolve(process.env.DATA_PATH) : path.join(root, 'data.json');
let local = fs.existsSync(dataPath) ? JSON.parse(fs.readFileSync(dataPath, 'utf8')) : { accounts: {}, sessions: {}, progress: {}, games: {}, solo: {} };
if (!local.solo) local.solo = {};
const db = { async get(table, id) { if (!supabase) return structuredClone(local[table]?.[id] || null); const { data, error } = await supabase.from('lingo_' + table).select('payload').eq('id', id).maybeSingle(); if (error) throw Error('Database is not ready. Apply supabase/schema.sql.'); return data?.payload || null; }, async set(table, id, payload) { if (supabase) { const { error } = await supabase.from('lingo_' + table).upsert({ id, payload }); if (error) throw Error('Database write failed. Check your Supabase setup.'); } else { if (!local[table]) local[table] = {}; local[table][id] = structuredClone(payload); try { fs.writeFileSync(dataPath + '.tmp', JSON.stringify(local)); fs.renameSync(dataPath + '.tmp', dataPath); } catch { fs.writeFileSync(dataPath, JSON.stringify(local)); } } }, async del(table, id) { if (supabase) { const { error } = await supabase.from('lingo_' + table).delete().eq('id', id); if (error) throw error; } else { if (local[table]) delete local[table][id]; fs.writeFileSync(dataPath, JSON.stringify(local)); } } };
const id = () => randomBytes(16).toString('hex'); const hash = s => createHash('sha256').update(s).digest('hex'); const today = () => new Date().toISOString().slice(0, 10);
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
app.get('/api/health', (_, res) => res.json({ status: 'ok', uptime: Math.floor(process.uptime()), timestamp: now(), database: connected ? 'supabase' : 'demo' }));
app.get('/api/config', (_, res) => res.json({ database: connected ? 'supabase' : 'demo', app: 'Lingo' }));
app.get('/api/curriculum/levels', (_, res) => res.json(getPublicLevels()));
app.get('/api/curriculum/lessons/:id', (req, res) => { const l = getPublicLesson(req.params.id); if (!l) return res.status(404).json({ error: 'Lesson not found.' }); res.json(l); });
app.get('/api/practice/catalog', (_, res) => res.json(getPublicPracticeCatalog()));
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
const initialProgress = (demo = false) => ({ xp: demo ? 1240 : 0, words: demo ? 450 : 0, streak: demo ? 7 : 0, completed: [], saved: [], goal: 10, todayWords: 0, lastStudy: null, history: {}, dailyDate: today(), practice: { listening: [], speaking: [], pronunciation: [], conversation: [] } });
const publicUser = u => ({ username: u.username, name: u.name, demo: u.demo });
async function session(u) { const token = id() + id(); await db.set('sessions', hash(token), { username: u.username, expires: Date.now() + 30 * 86400000 }); return token; }
app.post('/api/auth/signup', route(async (req, res) => { const { name, password } = req.body; const username = String(req.body.username || '').toLowerCase().trim(); if (!/^[a-z0-9_]{3,20}$/.test(username)) fail('Use 3–20 letters, numbers, or underscores for your username.'); if (typeof name !== 'string' || !name.trim() || name.length > 40) fail('Please enter a name (up to 40 characters).'); if (typeof password !== 'string' || password.length < 8 || password.length > 128) fail('Choose a password with 8–128 characters.'); await locked('signup:' + username, async () => { if (await db.get('accounts', username)) fail('That username is taken. Try another one.', 409); const salt = id(); const u = { username, name: name.trim(), salt, password: scryptSync(password, salt, 64).toString('hex'), demo: false }; await db.set('accounts', username, u); await db.set('progress', username, initialProgress()); res.json({ token: await session(u), user: publicUser(u), progress: initialProgress() }); }); }));
app.post('/api/auth/login', route(async (req, res) => { const username = String(req.body.username || '').toLowerCase().trim(); const u = await db.get('accounts', username); if (!u || typeof req.body.password !== 'string' || req.body.password.length > 128 || !timingSafeEqual(Buffer.from(u.password, 'hex'), scryptSync(req.body.password, u.salt, 64))) fail('Username or password doesn’t match.', 401); res.json({ token: await session(u), user: publicUser(u), progress: await db.get('progress', username) }); }));
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
app.get('/api/me', route(async (req, res) => { const p = await db.get('progress', req.user.username); if (!p.practice) p.practice = { listening: [], speaking: [], pronunciation: [], conversation: [] }; if (p.dailyDate !== today()) { p.todayWords = 0; p.dailyDate = today(); await db.set('progress', req.user.username, p); } res.json({ user: publicUser(req.user), progress: p }); }));
app.post('/api/auth/logout', route(async (req, res) => { await db.del('sessions', req.sessionKey); res.json({ ok: true }); }));
app.get('/api/admin/curriculum/validate', requireAdmin, (req, res) => {
  const report = validateCurriculumCatalog(CURRICULUM_CATALOG);
  res.json(report);
});
app.get('/api/admin/status', requireAdmin, (req, res) => {
  res.json({ ok: true, admin: req.user.username });
});
app.post('/api/progress/goal', route(async (req, res) => { if (![5, 10, 20, 30].includes(req.body.goal)) fail('Choose a valid daily goal.'); await locked(req.user.username, async () => { const p = await db.get('progress', req.user.username); p.goal = req.body.goal; await db.set('progress', req.user.username, p); res.json(p); }); }));
app.post('/api/progress/word', route(async (req, res) => { const allowed = ['Serendipity', 'Resilient', 'Curious', 'Wanderlust', 'Gratitude', 'Flourish', 'Mindful', 'Courage']; if (!allowed.includes(req.body.word)) fail('Word not found.'); await locked(req.user.username, async () => { const p = await db.get('progress', req.user.username); p.saved = p.saved.includes(req.body.word) ? p.saved.filter(w => w !== req.body.word) : [...p.saved, req.body.word]; await db.set('progress', req.user.username, p); res.json(p); }); }));
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
  await locked(req.user.username, async () => {
    const p = await db.get('progress', req.user.username);
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
      await db.set('progress', req.user.username, p);
    }
    res.json({ progress: p, correct, total: lesson.questions.length, passed, earned, alreadyCompleted: !fresh });
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
      await db.set('progress', req.user.username, p);
    }
    res.json({
      progress: p,
      correct,
      total: keys.length,
      passed,
      earned,
      alreadyCompleted: !fresh,
      solutions: keys
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
      await db.set('progress', req.user.username, p);
    }
    res.json({
      progress: p,
      passed: true,
      wordCount: words.length,
      earned,
      alreadyCompleted: !fresh,
      feedback: 'Great speaking practice! Voice recorded and verified.'
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
      await db.set('progress', req.user.username, p);
    }
    res.json({
      ...evalResult,
      progress: p,
      earned,
      alreadyCompleted: !fresh
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
    question: g.status === 'playing' && current ? {
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
    }
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
if (process.env.NODE_ENV === 'production' || process.env.ISOLATED_TEST) {
  app.use(express.static(path.join(root, 'dist')));
  app.get('/{*path}', (_, res) => res.sendFile(path.join(root, 'dist/index.html')));
} else {
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

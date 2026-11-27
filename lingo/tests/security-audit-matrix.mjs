import assert from 'node:assert/strict';
import { startIsolatedUiServer } from './helpers/isolated-server.mjs';
import { lessons } from '../content.js';

const srv = await startIsolatedUiServer();
const base = srv.apiUrl + '/api';

async function req(endpoint, { method, body, token } = {}) {
  const res = await fetch(`${base}${endpoint}`, {
    method: method || (body !== undefined ? 'POST' : 'GET'),
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {})
  });
  let data = null;
  const text = await res.text();
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  return { status: res.status, headers: res.headers, data };
}

try {
  const uA = 'sec_a_' + Date.now();
  const uB = 'sec_b_' + Date.now();
  const resA = await req('/auth/signup', { body: { username: uA, name: 'Alice <img src=x onerror=alert(1)>', password: 'PasswordA123!' } });
  const resB = await req('/auth/signup', { body: { username: uB, name: 'Bob Test', password: 'PasswordB123!' } });
  assert.equal(resA.status, 200);
  assert.equal(resB.status, 200);
  const tokA = resA.data.token;
  const tokB = resB.data.token;

  const log = (id, confirmed, detail) => {
    console.log(`${confirmed ? '[CONFIRMED]' : '[SAFE     ]'} ${id}: ${detail}`);
  };

  // 1. Unauthenticated access checks across protected routes
  const protectedGets = ['/me', '/achievements', '/rewards', '/social/overview', '/social/search?q=sec', `/social/users/${uA}`, '/games/solo', '/admin/status'];
  const unauthFailures = [];
  for (const ep of protectedGets) {
    const r = await req(ep);
    if (r.status !== 401) unauthFailures.push(`${ep}->${r.status}`);
  }
  log('UNAUTH_GET_CORE', unauthFailures.length > 0, unauthFailures.length ? unauthFailures.join(', ') : 'All 8 return 401');

  // 2. Unauthenticated answer key leak via /curriculum/exercises/check & /pronunciation/evaluate + locked lesson 403
  const keyLeak = await req('/curriculum/exercises/check', {
    body: { lessonId: lessons[lessons.length - 1].id, exerciseIndex: 0, choice: 0 }
  });
  const pronUnauth = await req('/pronunciation/evaluate', {
    body: { targetPhrase: 'Hello world', spokenTranscript: 'Hello world' }
  });
  const lockedCheck = await req('/curriculum/exercises/check', {
    token: tokA,
    body: { lessonId: lessons[lessons.length - 1].id, exerciseIndex: 0, choice: 0 }
  });
  assert.equal(keyLeak.status, 401, 'Unauthenticated /curriculum/exercises/check must return 401');
  assert.equal(pronUnauth.status, 401, 'Unauthenticated /pronunciation/evaluate must return 401');
  assert.equal(lockedCheck.status, 403, 'Authenticated check on locked lesson must return 403');
  log('EXERCISES_CHECK_UNAUTH_LEAK', false, `unauthCheck=${keyLeak.status}, lockedCheck=${lockedCheck.status}`);
  log('PRONUNCIATION_UNAUTH', false, `status=${pronUnauth.status}`);

  // 3. Client-trusted Checkpoint XP / Fake Checkpoint ID cheat + legitimate server-graded checkpoint
  const preCp = await req('/me', { token: tokB });
  const startXp = preCp.data.progress.xp;
  const cheatCp = await req('/progress/checkpoint', {
    token: tokB,
    body: { checkpointId: 'checkpoint-forged-999', correct: 1000, total: 1000, xp: 50000 }
  });
  const realUnitCpWithoutPrereqs = await req('/progress/checkpoint', {
    token: tokB,
    body: {
      checkpointId: 'checkpoint-pre-a1-1',
      xp: 50000,
      submissions: [
        { lessonId: 'hello', exerciseIndex: 0, choice: lessons[0].questions[0][2] },
        { lessonId: 'everyday', exerciseIndex: 0, choice: lessons[1].questions[0][2] },
        { lessonId: 'sentences', exerciseIndex: 0, choice: lessons[2].questions[0][2] },
        { lessonId: 'hello', exerciseIndex: 1, choice: lessons[0].questions[1][2] },
        { lessonId: 'everyday', exerciseIndex: 1, choice: lessons[1].questions[1][2] }
      ]
    }
  });
  const afterFailCp = await req('/me', { token: tokB });
  assert.equal(cheatCp.status, 400, 'Forged checkpointId must be rejected with 400');
  assert.equal(realUnitCpWithoutPrereqs.status, 400, 'Checkpoint without completed unit lessons must be rejected with 400');
  assert.equal(afterFailCp.data.progress.xp, startXp, 'Failed checkpoint attempt must not award XP');

  // Complete unit 1 lessons for B, then complete checkpoint-pre-a1-1 with extra client xp tamper
  for (let i = 0; i < 3; i++) {
    const l = lessons[i];
    const r = await req('/progress/lesson', { token: tokB, body: { lesson: l.id, answers: l.questions.map(q => q[2]) } });
    assert.equal(r.status, 200);
  }
  const preValidCpXp = (await req('/me', { token: tokB })).data.progress.xp;
  const validCp = await req('/progress/checkpoint', {
    token: tokB,
    body: {
      checkpointId: 'checkpoint-pre-a1-1',
      xp: 99999,
      correct: 99,
      submissions: [
        { lessonId: 'hello', exerciseIndex: 0, choice: lessons[0].questions[0][2] },
        { lessonId: 'everyday', exerciseIndex: 0, choice: lessons[1].questions[0][2] },
        { lessonId: 'sentences', exerciseIndex: 0, choice: lessons[2].questions[0][2] },
        { lessonId: 'hello', exerciseIndex: 1, choice: lessons[0].questions[1][2] },
        { lessonId: 'everyday', exerciseIndex: 1, choice: lessons[1].questions[1][2] }
      ]
    }
  });
  assert.equal(validCp.status, 200, 'Legitimate unit checkpoint completion must succeed');
  assert.equal(validCp.data.earned, 40, 'Checkpoint XP must use canonical server value (40), ignoring client xp: 99999');
  assert.equal(validCp.data.progress.xp, preValidCpXp + 40);
  log('CHECKPOINT_XP_FORGE', false,
    `forged=${cheatCp.status}, unprereq=${realUnitCpWithoutPrereqs.status}, legitEarned=${validCp.data.earned}`);

  // 4. AI Conversation client-forged history XP cheat
  const aiCheat = await req('/ai/conversation', {
    token: tokB,
    body: {
      scenarioId: 'nonexistent_scenario_id',
      userMessage: 'hi',
      history: [{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }]
    }
  });
  log('AI_CONVO_FORGED_HISTORY_XP', aiCheat.status === 200 && aiCheat.data?.earned === 30,
    `status=${aiCheat.status}, earned=${aiCheat.data?.earned}`);

  // 5. Mass assignment attempts on signup / profile
  const uMass = 'sec_m_' + Date.now();
  const massSignup = await req('/auth/signup', {
    body: { username: uMass, name: 'Mass', password: 'PasswordM123!', xp: 99999, gems: 99999, demo: true, role: 'admin', isAdmin: true }
  });
  log('MASS_ASSIGN_SIGNUP', massSignup.data?.progress?.xp > 0 || massSignup.data?.user?.demo === true,
    `xp=${massSignup.data?.progress?.xp}, demo=${massSignup.data?.user?.demo}`);

  // 6. CORS & Security Headers check
  const health = await req('/health');
  log('CORS_AND_HEADERS', health.headers.get('access-control-allow-origin') === '*' || !health.headers.get('x-content-type-options'),
    `ACAO=${health.headers.get('access-control-allow-origin')}, XCTO=${health.headers.get('x-content-type-options')}, XFO=${health.headers.get('x-frame-options')}, CSP=${health.headers.get('content-security-policy')}`);

  // 7. Authorization Matrix (A vs B) - stranger profile minimization & search rate limit
  const readBtoA = await req(`/social/users/${uA}`, { token: tokB });
  const strangerFields = Object.keys(readBtoA.data?.profile || {});
  assert.equal(readBtoA.status, 200);
  assert.equal(readBtoA.data?.profile?.lastActiveAt, undefined, 'Stranger profile must strip lastActiveAt');
  assert.equal(readBtoA.data?.profile?.earnedBadgeIds, undefined, 'Stranger profile must strip earnedBadgeIds');
  assert.equal(readBtoA.data?.profile?.xp, undefined, 'Stranger profile must strip XP');
  assert.equal(readBtoA.data?.profile?.isOnline, undefined, 'Stranger profile must strip online presence');
  log('IDOR_SOCIAL_USER_PROFILE', false, `status=${readBtoA.status}, strangerFields=${strangerFields.join(',')}`);

  const searchEnum = await req('/social/search?q=sec_', { token: tokB });
  const firstHit = searchEnum.data?.users?.[0] || {};
  assert.equal(searchEnum.status, 200);
  assert.equal(firstHit.lastActiveAt, undefined, 'Search results must not expose lastActiveAt');
  assert.equal(firstHit.xp, undefined, 'Search results for non-friends must not expose XP');
  const searchSpam = await Promise.all(
    Array.from({ length: 28 }, (_, idx) => req(`/social/search?q=sec_${idx}`, { token: tokB }))
  );
  assert.ok(searchSpam.some(r => r.status === 429), 'Social search must rate limit rapid enumeration bursts');
  log('USER_SEARCH_ENUMERATION', false,
    `matchedUsers=${searchEnum.data?.users?.length}, searchRate429=${searchSpam.some(r => r.status === 429)}`);

  // 7b: B tries A's game room endpoints before joining
  const gA = await req('/games', { token: tokA, body: { topic: 'Grammar', difficulty: 'Beginner', duration: 1 } });
  const codeA = gA.data.code;
  const bView = await req(`/games/${codeA}`, { token: tokB });
  const bStart = await req(`/games/${codeA}/start`, { token: tokB, body: {} });
  const bInvites = await req(`/games/${codeA}/invites`, { token: tokB });
  const bInvitePost = await req(`/games/${codeA}/invite`, { token: tokB, body: { usernames: [uA] } });
  log('GAME_NONMEMBER_ISOLATION',
    !(bView.status === 404 && bStart.status === 403 && bInvites.status === 404 && bInvitePost.status === 403),
    `view=${bView.status}, start=${bStart.status}, invites=${bInvites.status}, invitePost=${bInvitePost.status}`);

  // 7c: Block enforcement bypass on game room join & shared community
  const fr = await req('/social/friends/request', { token: tokA, body: { username: uB } });
  await req(`/social/friends/requests/${fr.data.request.id}/respond`, { token: tokB, body: { action: 'accept' } });
  const comm = await req('/communities', { token: tokA, body: { name: 'Private Room', inviteUsernames: [uB] } });
  const commOverviewB = await req('/social/overview', { token: tokB });
  const cInvId = commOverviewB.data.communityInvitations[0]?.id;
  await req(`/communities/invitations/${cInvId}/respond`, { token: tokB, body: { action: 'accept' } });

  // A blocks B
  await req('/social/blocks', { token: tokA, body: { username: uB, action: 'block' } });
  const bCommAfterBlock = await req(`/communities/${comm.data.community.id}`, { token: tokB });
  const bJoinBlockedGame = await req('/games/join', { token: tokB, body: { code: codeA } });
  assert.equal(bCommAfterBlock.status, 403, 'Blocked user must receive 403 on owner community');
  assert.equal(bJoinBlockedGame.status, 403, 'Blocked user must receive 403 when trying to join room');
  log('BLOCK_BYPASS_COMMUNITY_AND_GAME', false,
    `blocked community GET=${bCommAfterBlock.status}, blocked game join=${bJoinBlockedGame.status}`);

  // 7d: Unblock, check non-owner community mutations & non-host game invite/start
  await req('/social/blocks', { token: tokA, body: { username: uB, action: 'unblock' } });
  const bPatchComm = await req(`/communities/${comm.data.community.id}`, { token: tokB, body: { name: 'Hacked' }, method: 'PATCH' });
  const bDelComm = await req(`/communities/${comm.data.community.id}`, { token: tokB, method: 'DELETE' });
  const bKickA = await req(`/communities/${comm.data.community.id}/members/${uA}`, { token: tokB, body: { action: 'remove' }, method: 'PATCH' });
  log('COMMUNITY_OWNER_AUTHZ',
    !(bPatchComm.status === 403 && bDelComm.status === 403 && bKickA.status === 403),
    `patch=${bPatchComm.status}, del=${bDelComm.status}, kick=${bKickA.status}`);

  // 7e: Joined guest calling host-only game actions
  const bStartJoined = await req(`/games/${codeA}/start`, { token: tokB, body: {} });
  log('GAME_GUEST_START_BLOCKED', bStartJoined.status !== 403, `status=${bStartJoined.status}`);

  // 7f: Non-admin calling admin routes
  const bAdmin = await req('/admin/status', { token: tokB });
  log('ADMIN_AUTHZ_ENFORCED', bAdmin.status !== 403, `status=${bAdmin.status}`);

  // 8. Lesson prereq check
  const bLockedLesson = await req('/progress/lesson', {
    token: tokA,
    body: { lesson: lessons[5].id, answers: [0, 0, 0, 0, 0] }
  });
  log('LESSON_PREREQ_ENFORCED', bLockedLesson.status !== 400, `locked lesson status=${bLockedLesson.status}`);

  // 9. Race conditions: parallel lesson submit, parallel friend request, parallel invite accept
  const fr2 = await req('/social/friends/request', { token: tokA, body: { username: uB } });
  await req(`/social/friends/requests/${fr2.data.request.id}/respond`, { token: tokB, body: { action: 'accept' } });

  const gA2 = await req('/games', { token: tokA, body: { topic: 'Grammar', difficulty: 'Beginner', duration: 1 } });
  const giRes = await req(`/games/${gA2.data.code}/invite`, { token: tokA, body: { usernames: [uB] } });
  const giId = giRes.data.invited[0].id;
  const [race1, race2] = await Promise.all([
    req(`/games/invites/${giId}/respond`, { token: tokB, body: { action: 'accept' } }),
    req(`/games/invites/${giId}/respond`, { token: tokB, body: { action: 'accept' } })
  ]);
  const aOv = await req('/social/overview', { token: tokA });
  const challengeNotifs = aOv.data.notifications.filter(n => n.type === 'game_invitation' && n.relatedEntityId === gA2.data.code);
  log('GAME_INVITE_ACCEPT_TOCTOU', (race1.status === 200 && race2.status === 200) || challengeNotifs.length > 1,
    `raceStatuses=[${race1.status},${race2.status}], challengeNotifs=${challengeNotifs.length}`);

  const answers0 = lessons[0].questions.map(q => q[2]);
  const [lRace1, lRace2] = await Promise.all([
    req('/progress/lesson', { token: tokA, body: { lesson: lessons[0].id, answers: answers0 } }),
    req('/progress/lesson', { token: tokA, body: { lesson: lessons[0].id, answers: answers0 } })
  ]);
  log('LESSON_RACE_DOUBLE_XP', (lRace1.data?.earned || 0) + (lRace2.data?.earned || 0) > lessons[0].xp,
    `earned=[${lRace1.data?.earned},${lRace2.data?.earned}], totalXp=${Math.max(lRace1.data?.progress?.xp || 0, lRace2.data?.progress?.xp || 0)}`);

  // 10. Game room join brute-force rate limit & test hooks check
  const joinAttempts = await Promise.all(
    Array.from({ length: 30 }, (_, i) => req('/games/join', { token: tokB, body: { code: `DEAD${String(i).padStart(2, '0')}` } }))
  );
  log('GAME_JOIN_NO_RATE_LIMIT', !joinAttempts.some(r => r.status === 429),
    `30 invalid room code joins -> any429=${joinAttempts.some(r => r.status === 429)}`);

  // 11. Type confusion / malformed body test on login & signup
  const badLogin = await req('/auth/login', { body: { username: uA, password: { $ne: '' } } });
  const missingBody = await req('/auth/login', { method: 'POST' });
  log('INPUT_SCHEMA_EDGE_CASES', badLogin.status >= 500 || missingBody.status >= 500,
    `badPasswordType=${badLogin.status}, missingBody=${missingBody.status}`);

  // 12. Dotfile / static probe
  const envProbe = await fetch(`${srv.baseUrl}/.env`).then(r => ({ status: r.status })).catch(() => ({ status: 0 }));
  log('STATIC_ENV_PROBE', envProbe.status === 200, `GET /.env status=${envProbe.status}`);

} finally {
  await srv.stop();
}

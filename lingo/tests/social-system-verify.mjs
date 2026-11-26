import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildPersonalizedDailyReminders } from '../server/reminderEngine.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const tempDataPath = path.join(os.tmpdir(), `lingo-social-verify-${Date.now()}.json`);
const port = 3461;
const baseUrl = `http://127.0.0.1:${port}/api`;

async function req(endpoint, body, token, method) {
  const res = await fetch(baseUrl + endpoint, {
    method: method || (body !== undefined ? 'POST' : 'GET'),
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {})
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {})
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data };
}

async function waitForServer(timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(`${baseUrl}/health`);
      if (r.ok) return;
    } catch { }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('Timed out waiting for isolated social test server.');
}

async function runTests() {
  console.log('--- RUNNING LINGO SOCIAL (FRIENDS, COMMUNITIES, GAME INVITES & NOTIFICATIONS) VERIFICATION ---');
  const serverProc = spawn('node', ['server.mjs'], {
    cwd: rootDir,
    env: {
      ...process.env,
      PORT: String(port),
      ISOLATED_TEST: '1',
      NODE_ENV: 'test',
      DATA_PATH: tempDataPath
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  try {
    await waitForServer();
    await req('/test/reset-clock', {});

    // Setup 4 real learner accounts
    const alice = await req('/auth/signup', { name: 'Alice Lin', username: 'alice_social', password: 'Password123!' });
    const bob = await req('/auth/signup', { name: 'Bob Reyes', username: 'bob_social', password: 'Password123!' });
    const carol = await req('/auth/signup', { name: 'Carol Diaz', username: 'carol_social', password: 'Password123!' });
    const dave = await req('/auth/signup', { name: 'Dave Kim', username: 'dave_social', password: 'Password123!' });

    assert.equal(alice.status, 200);
    assert.equal(bob.status, 200);
    assert.equal(carol.status, 200);
    assert.equal(dave.status, 200);

    const tokA = alice.data.token;
    const tokB = bob.data.token;
    const tokC = carol.data.token;
    const tokD = dave.data.token;

    assert.ok(alice.data.user.lingoId?.startsWith('LNG-'), 'Lingo ID must be generated on signup');

    // SCENARIO 1: Search users by username, @username & Lingo ID + self-request prevention + password leak check
    const searchByName = await req('/social/search?q=bob_social', undefined, tokA, 'GET');
    assert.equal(searchByName.status, 200);
    assert.equal(searchByName.data.users.length, 1);
    assert.equal(searchByName.data.users[0].username, 'bob_social');
    assert.equal(searchByName.data.users[0].passwordHash, undefined, 'Must not expose private fields');

    const searchByAtName = await req('/social/search?q=@bob_social', undefined, tokA, 'GET');
    assert.equal(searchByAtName.status, 200);
    assert.equal(searchByAtName.data.users.length, 1);
    assert.equal(searchByAtName.data.users[0].username, 'bob_social');

    const searchById = await req(`/social/search?q=${encodeURIComponent(bob.data.user.lingoId)}`, undefined, tokA, 'GET');
    assert.equal(searchById.status, 200);
    assert.equal(searchById.data.users[0].username, 'bob_social');

    const selfReq = await req('/social/friends/request', { username: 'alice_social' }, tokA);
    assert.equal(selfReq.status, 400, 'Self friend request must be rejected');

    // Profile customization persists
    const profEdit = await req('/social/profile', { name: 'Alice Updated', avatar: '🦊', avatarColor: 'purple' }, tokA);
    assert.equal(profEdit.status, 200);
    assert.equal(profEdit.data.user.name, 'Alice Updated');
    assert.equal(profEdit.data.user.avatar, '🦊');

    // SCENARIO 2 & 3: Send request A -> B, duplicate blocked, B accepts -> mutual friends list
    const reqAB = await req('/social/friends/request', { username: 'bob_social' }, tokA);
    assert.equal(reqAB.status, 200);
    assert.equal(reqAB.data.status, 'pending');

    const dupAB = await req('/social/friends/request', { username: 'bob_social' }, tokA);
    assert.equal(dupAB.status, 409, 'Duplicate outgoing friend request must fail');

    const ovB = await req('/social/overview', undefined, tokB, 'GET');
    assert.equal(ovB.data.incomingRequests.length, 1);
    assert.equal(ovB.data.incomingRequests[0].senderId, 'alice_social');

    const accAB = await req(`/social/friends/requests/${reqAB.data.request.id}/respond`, { action: 'accept' }, tokB);
    assert.equal(accAB.status, 200);

    const ovA1 = await req('/social/overview', undefined, tokA, 'GET');
    const ovB1 = await req('/social/overview', undefined, tokB, 'GET');
    assert.ok(ovA1.data.friends.some(f => f.username === 'bob_social'));
    assert.ok(ovB1.data.friends.some(f => f.username === 'alice_social'));

    // Also make A <-> C friends, C reject -> D test, and remove/block verification later
    const reqAC = await req('/social/friends/request', { lingoId: carol.data.user.lingoId }, tokA);
    assert.equal(reqAC.status, 200);
    await req(`/social/friends/requests/${reqAC.data.request.id}/respond`, { action: 'accept' }, tokC);

    // Cancel outgoing request & Reject incoming request
    const reqAD = await req('/social/friends/request', { username: 'dave_social' }, tokA);
    assert.equal(reqAD.status, 200);
    const cancelAD = await req(`/social/friends/requests/${reqAD.data.request.id}/respond`, { action: 'cancel' }, tokA);
    assert.equal(cancelAD.status, 200);

    const reqDA = await req('/social/friends/request', { username: 'alice_social' }, tokD);
    assert.equal(reqDA.status, 200);
    const rejectDA = await req(`/social/friends/requests/${reqDA.data.request.id}/respond`, { action: 'reject' }, tokA);
    assert.equal(rejectDA.status, 200);

    // SCENARIO 4, 5, 6: Private communities, private access enforcement, invites, roles & owner transfer
    const createComm1 = await req('/communities', {
      name: 'Morning Grammar Squad',
      description: 'Daily practice and rapid quizzes',
      icon: '🦉',
      allowMemberInvites: false,
      inviteUsernames: ['bob_social', 'carol_social']
    }, tokA);
    assert.equal(createComm1.status, 200);
    const comm1Id = createComm1.data.community.id;
    assert.deepEqual(createComm1.data.invited.sort(), ['bob_social', 'carol_social']);

    // Non-member (Dave) must get 403 accessing private community
    const davePrivateGet = await req(`/communities/${comm1Id}`, undefined, tokD, 'GET');
    assert.equal(davePrivateGet.status, 403, 'Non-member must be blocked from private community');

    // Bob and Carol accept community invitations
    const ovBComm = await req('/social/overview', undefined, tokB, 'GET');
    assert.equal(ovBComm.data.communityInvitations.length, 1);
    const bobCommInvId = ovBComm.data.communityInvitations[0].id;
    const bobAcceptComm = await req(`/communities/invitations/${bobCommInvId}/respond`, { action: 'accept' }, tokB);
    assert.equal(bobAcceptComm.status, 200);

    const ovCComm = await req('/social/overview', undefined, tokC, 'GET');
    const carolAcceptComm = await req(`/communities/invitations/${ovCComm.data.communityInvitations[0].id}/respond`, { action: 'accept' }, tokC);
    assert.equal(carolAcceptComm.status, 200);

    // Alice promotes Bob to admin
    const promoteBob = await req(`/communities/${comm1Id}/members/bob_social`, { action: 'set_role', role: 'admin' }, tokA, 'PATCH');
    assert.equal(promoteBob.status, 200);
    assert.equal(promoteBob.data.role, 'admin');

    // Second community with overlapping Bob & Carol to test multi-community deduplication
    const createComm2 = await req('/communities', {
      name: 'Fluent Speakers',
      description: 'Second study circle',
      icon: '🚀',
      inviteUsernames: ['bob_social', 'carol_social']
    }, tokA);
    const comm2Id = createComm2.data.community.id;
    const ovBComm2 = await req('/social/overview', undefined, tokB, 'GET');
    await req(`/communities/invitations/${ovBComm2.data.communityInvitations[0].id}/respond`, { action: 'accept' }, tokB);
    const ovCComm2 = await req('/social/overview', undefined, tokC, 'GET');
    await req(`/communities/invitations/${ovCComm2.data.communityInvitations[0].id}/respond`, { action: 'accept' }, tokC);

    // Owner cannot leave without transfer
    const failLeave = await req(`/communities/${comm2Id}/leave`, {}, tokA);
    assert.equal(failLeave.status, 400, 'Owner must transfer ownership before leaving non-empty community');

    // Owner transfers ownership to Bob & leaves
    const transferLeave = await req(`/communities/${comm2Id}/leave`, { transferToUsername: 'bob_social' }, tokA);
    assert.equal(transferLeave.status, 200);
    assert.equal(transferLeave.data.transferredTo, 'bob_social');

    // Delete community cleanup verification on comm2 by new owner Bob
    const bobDelComm2 = await req(`/communities/${comm2Id}`, undefined, tokB, 'DELETE');
    assert.equal(bobDelComm2.status, 200);

    // SCENARIO 7, 8, 9, 10, 11: Game creation + Selected Invite + Invite All + Community Dedup + Notification Accept/Decline
    const gCreate = await req('/games', {
      topic: 'Grammar',
      difficulty: 'Intermediate',
      duration: 3,
      questionCount: 5,
      role: 'player',
      isHostParticipating: true
    }, tokA);
    assert.equal(gCreate.status, 200);
    const gameCode = gCreate.data.code;

    // Step A: Invite selected friend (Bob)
    const invBob = await req(`/games/${gameCode}/invite`, { mode: 'selected', usernames: ['bob_social'] }, tokA);
    assert.equal(invBob.status, 200);
    assert.equal(invBob.data.invited.length, 1);
    assert.equal(invBob.data.invited[0].receiverId, 'bob_social');

    // Step B: Invite community (comm1 has Alice, Bob, Carol -> Alice excluded, Bob already invited/skipped, Carol receives 1 invite)
    const invComm = await req(`/games/${gameCode}/invite`, { mode: 'community', communityIds: [comm1Id] }, tokA);
    assert.equal(invComm.status, 200);
    assert.equal(invComm.data.invited.length, 1, 'Community invite must deduplicate already-invited Bob & exclude host');
    assert.equal(invComm.data.invited[0].receiverId, 'carol_social');

    // Step C: Invite All Friends when Bob & Carol are already pending -> should invite 0 duplicates
    const invAllDup = await req(`/games/${gameCode}/invite`, { mode: 'all_friends' }, tokA);
    assert.equal(invAllDup.status, 200);
    assert.equal(invAllDup.data.invited.length, 0, 'Invite All must skip already-invited friends without duplicates');

    // Bob checks presence & notifications, accepts game invitation -> joins lobby directly
    const presB = await req('/social/presence', {}, tokB);
    assert.equal(presB.status, 200);
    assert.ok(presB.data.latestGameInvite, 'Bob should receive live pending game invite in presence check');
    const bobGameInvId = presB.data.latestGameInvite.id;

    const bobAcceptGame = await req(`/games/invites/${bobGameInvId}/respond`, { action: 'accept' }, tokB);
    assert.equal(bobAcceptGame.status, 200);
    assert.equal(bobAcceptGame.data.game.code, gameCode);
    assert.ok(bobAcceptGame.data.game.members.some(m => m.username === 'bob_social'), 'Bob must now be inside game lobby');

    // Carol declines game invitation -> status updates to declined & game stays unaffected
    const ovCGame = await req('/social/overview', undefined, tokC, 'GET');
    assert.equal(ovCGame.data.gameInvitations.length, 1);
    const carolGameInvId = ovCGame.data.gameInvitations[0].id;
    const carolDecline = await req(`/games/invites/${carolGameInvId}/respond`, { action: 'decline' }, tokC);
    assert.equal(carolDecline.status, 200);
    assert.equal(carolDecline.data.status, 'declined');

    // Verify existing Team Code join still works independently (Dave joins by room code!)
    const daveCodeJoin = await req('/games/join', { code: gameCode }, tokD);
    assert.equal(daveCodeJoin.status, 200);
    assert.ok(daveCodeJoin.data.members.some(m => m.username === 'dave_social'));

    // Host starts game -> pending invite acceptance on started game fails cleanly
    // First create another game where Carol is invited, then start it before Carol accepts
    const gStartedCreate = await req('/games', {
      topic: 'Vocabulary',
      difficulty: 'Beginner',
      duration: 2,
      questionCount: 5,
      role: 'player',
      isHostParticipating: true
    }, tokA);
    const startedCode = gStartedCreate.data.code;
    const invCarolLate = await req(`/games/${startedCode}/invite`, { mode: 'selected', usernames: ['carol_social'] }, tokA);
    const lateInvId = invCarolLate.data.invited[0].id;

    // Start game & advance past 10s countdown into 'playing'
    await req(`/games/${startedCode}/start`, {}, tokA);
    await req('/test/advance-clock', { ms: 12000 });
    const gState = await req(`/games/${startedCode}`, undefined, tokA, 'GET');
    assert.equal(gState.data.status, 'playing');

    const carolLateAccept = await req(`/games/invites/${lateInvId}/respond`, { action: 'accept' }, tokC);
    assert.equal(carolLateAccept.status, 400, 'Accepting an invite after game started must fail cleanly');

    // SCENARIO 12: Multi-friend Invite All + Removal & Blocking verification
    const reqBD = await req('/social/friends/request', { username: 'dave_social' }, tokB);
    await req(`/social/friends/requests/${reqBD.data.request.id}/respond`, { action: 'accept' }, tokD);

    const gBobAll = await req('/games', {
      topic: 'Mixed English',
      difficulty: 'Intermediate',
      duration: 3,
      questionCount: 5,
      role: 'player',
      isHostParticipating: true
    }, tokB);
    const bobInviteAllRes = await req(`/games/${gBobAll.data.code}/invite`, { mode: 'all_friends' }, tokB);
    assert.equal(bobInviteAllRes.status, 200);
    assert.deepEqual(
      bobInviteAllRes.data.invited.map(i => i.receiverId).sort(),
      ['alice_social', 'dave_social'],
      'Invite All Friends should invite all eligible accepted friends'
    );

    // Block check: Alice blocks Carol -> friendship removed & cannot send new friend request
    const blockC = await req('/social/blocks', { username: 'carol_social', action: 'block' }, tokA);
    assert.equal(blockC.status, 200);
    const carolBlockedReq = await req('/social/friends/request', { username: 'alice_social' }, tokC);
    assert.equal(carolBlockedReq.status, 403, 'Blocked user cannot send friend request');

    // Remove friend Bob -> friendship removed cleanly
    const removeB = await req('/social/friends/bob_social', undefined, tokA, 'DELETE');
    assert.equal(removeB.status, 200);
    const ovAAfter = await req('/social/overview', undefined, tokA, 'GET');
    assert.equal(ovAAfter.data.friends.length, 0);

    // Mark notifications read
    const readAll = await req('/notifications/read', { ids: 'all' }, tokA);
    assert.equal(readAll.status, 200);
    const ovARead = await req('/social/overview', undefined, tokA, 'GET');
    assert.equal(ovARead.data.unreadCount, 0);

    // SCENARIO 13: Personalized Daily Reminders (Journey + Motivation from real user data)
    const remActive = buildPersonalizedDailyReminders({
      user: { username: 'alice_social', name: 'Alice Lin' },
      progress: {
        completed: ['hello', 'everyday'],
        checkpoints: [],
        streak: 5,
        todayWords: 6,
        goal: 10,
        xp: 240,
        gems: 15
      }
    });
    assert.equal(remActive.journey.osId, 9001);
    assert.equal(remActive.journey.completedCount, 2);
    assert.equal(remActive.journey.nextLessonId, 'sentences');
    assert.ok(remActive.journey.body.includes('2/138 done'), 'Journey reminder must embed short real completion progress');
    assert.equal(remActive.motivation.osId, 9002);
    assert.equal(remActive.motivation.remainingWords, 4);
    assert.ok(remActive.motivation.title.includes('5d Streak'), 'Motivation reminder must reference active streak concisely');

    console.log('ALL LINGO SOCIAL (FRIENDS, COMMUNITIES, GAME INVITES & NOTIFICATIONS) TESTS PASSED!');
  } finally {
    serverProc.kill('SIGTERM');
    try { fs.unlinkSync(tempDataPath); } catch { }
  }
}

runTests().catch(err => {
  console.error('SOCIAL TEST FAILED:', err);
  process.exit(1);
});

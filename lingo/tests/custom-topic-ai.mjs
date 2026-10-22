import assert from 'node:assert/strict';

const root = 'http://localhost:3000/api';

async function request(endpoint, body, token, method) {
  const response = await fetch(root + endpoint, {
    method: method || (body ? 'POST' : 'GET'),
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  return { status: response.status, data };
}

console.log('========================================================================');
console.log('--- STARTING CUSTOM TOPIC GEMINI AI INTEGRATION TEST SUITE ---');
console.log('========================================================================\n');

await request('/test/reset-clock', {});
const ts = String(Date.now()).slice(-6);

// Helper for quick user signup
async function createUser(prefix, name) {
  const username = `${prefix}_${ts}`;
  const res = await request('/auth/signup', { username, name, password: 'Password123' });
  assert.equal(res.status, 200, `User creation failed for ${username}: ${res.data?.error}`);
  return { username, token: res.data.token };
}

// ============================================================================
// PART 1: SOLO MODE WITH CUSTOM TOPIC & GEMINI GENERATION
// ============================================================================
console.log('--- PART 1: SOLO MODE CUSTOM TOPIC GENERATION ---');
const soloUser = await createUser('soloct', 'Solo Custom Topic User');

// 1.1 Mock Gemini generation for "Medical English" at B2 with 5 questions
const mockMedicalQuestions = [
  {
    prompt: 'Which term refers to high blood pressure in clinical settings?',
    options: ['Hypertension', 'Hypotension', 'Hyperglycemia', 'Arrhythmia'],
    correctIndex: 0,
    explanation: 'Hypertension is the clinical term for chronically elevated arterial blood pressure.'
  },
  {
    prompt: 'What should a triage nurse ask to assess pain intensity?',
    options: ['Rate your pain on a scale from 1 to 10', 'Are you feeling okay?', 'Can you walk?', 'Did you take aspirin?'],
    correctIndex: 0,
    explanation: 'The 1-10 numerical rating scale is the standard clinical pain assessment tool.'
  },
  {
    prompt: 'Which document provides informed patient consent prior to surgery?',
    options: ['Surgical consent form', 'Discharge summary', 'Prescription pad', 'Admission invoice'],
    correctIndex: 0,
    explanation: 'A surgical consent form confirms the patient has been informed of risks and benefits.'
  },
  {
    prompt: 'What is the standard medical term for shortness of breath?',
    options: ['Dyspnea', 'Apnea', 'Tachycardia', 'Syncope'],
    correctIndex: 0,
    explanation: 'Dyspnea is the clinical term for difficult or labored breathing.'
  },
  {
    prompt: 'Which instruction is appropriate when explaining medication fasting?',
    options: ['Do not eat or drink anything after midnight', 'Drink only juice', 'Take with heavy meals', 'Eat high-fat foods'],
    correctIndex: 0,
    explanation: 'Fasting instructions typically require abstaining from all food and fluids after midnight.'
  }
];

await request('/test/set-ai-mock', { questions: mockMedicalQuestions });

const soloRes = await request('/games/solo', {
  topicType: 'custom',
  isCustomTopic: true,
  customTopic: 'Medical English',
  cefrLevel: 'B2',
  duration: 5,
  questionCount: 5,
  metadata: {
    mode: 'solo',
    topicType: 'custom',
    isCustomTopic: true,
    topicName: 'Medical English',
    cefrLevel: 'B2',
    targetDurationMinutes: 5,
    targetQuestionCount: 5,
    allowFallback: false
  }
}, soloUser.token);

assert.equal(soloRes.status, 200, 'Solo game creation with custom topic must succeed');
assert.equal(soloRes.data.mode, 'solo');
assert.equal(soloRes.data.topic, 'Medical English');
assert.equal(soloRes.data.cefrLevel, 'B2');
assert.equal(soloRes.data.total, 5, 'Must respect exact requested question count (5)');
assert.equal(soloRes.data.questionSource, 'ai', 'Must be tagged as AI-generated');
assert.equal(soloRes.data.status, 'countdown');
console.log('PASS 1.1: Solo game created with custom topic, B2 level, exact question count (5), and AI tagging');

// 1.2 Transition past countdown to playing
await request('/test/advance-clock', { ms: 10100 });
const soloPlaying = await request('/games/solo', null, soloUser.token);
assert.equal(soloPlaying.data.status, 'playing');
assert.ok(soloPlaying.data.question.prompt.includes('blood pressure'), 'First question is topic-specific medical question');
assert.equal(soloPlaying.data.question.options.length, 4);
console.log('PASS 1.2: Solo countdown transitions to playing with topic-specific medical questions');

// 1.3 Answer questions one by one with independent scoring and feedback
const ans1 = await request('/games/solo/answer', { index: 0, choice: 0 }, soloUser.token);
assert.equal(ans1.status, 200);
assert.equal(ans1.data.answer.isCorrect, true);
assert.ok(ans1.data.score > 0, 'Score awarded for correct answer');
assert.ok(ans1.data.answer.explanation.includes('Hypertension'), 'Helpful medical explanation provided');

const next1 = await request('/games/solo/next', {}, soloUser.token);
assert.equal(next1.status, 200);
assert.equal(next1.data.index, 1);
assert.ok(next1.data.question.prompt.includes('pain intensity'), 'Second question appears one by one');
console.log('PASS 1.3: Question answered, feedback/explanation verified, and progressed to Question 2 one by one');

// Clean up solo game
await request('/games/solo/leave', {}, soloUser.token);


// ============================================================================
// PART 2: STRICT NO-SILENT-FALLBACK ON CUSTOM TOPIC AI FAILURE
// ============================================================================
console.log('\n--- PART 2: STRICT AI FAILURE REJECTION (NO SILENT FALLBACK) ---');
// When Gemini generation fails for custom topics, system must NOT silently substitute hardcoded questions
await request('/test/set-ai-mock', {
  error: { message: 'Gemini quota exceeded', status: 429, code: 'RATE_LIMITED' }
});

const failCustomRes = await request('/games/solo', {
  topicType: 'custom',
  isCustomTopic: true,
  customTopic: 'Deep Sea Biology',
  cefrLevel: 'C1',
  duration: 5,
  questionCount: 4,
  metadata: {
    mode: 'solo',
    topicType: 'custom',
    isCustomTopic: true,
    topicName: 'Deep Sea Biology',
    cefrLevel: 'C1',
    targetDurationMinutes: 5,
    targetQuestionCount: 4,
    allowFallback: false
  }
}, soloUser.token);

// Must reject with error, NEVER returning 200 with fallback questions
assert.notEqual(failCustomRes.status, 200, 'Custom topic must NOT succeed with fallback when AI fails');
assert.ok(failCustomRes.data.error, 'Returns clear, informative error message');
console.log(`PASS 2: Custom topic AI failure properly rejects without silent fallback (HTTP ${failCustomRes.status}: ${failCustomRes.data.error})`);

// Clean mock hook
await request('/test/clear-ai-mock', {});


// ============================================================================
// PART 3: FRIENDS MODE CUSTOM TOPIC, CANONICAL SET & RANDOMIZED ORDER
// ============================================================================
console.log('\n--- PART 3: FRIENDS MODE CANONICAL SET & INDEPENDENT ORDER ---');
const host = await createUser('cthost', 'Host Learner');
const guest = await createUser('ctguest', 'Guest Learner');
const spec = await createUser('ctspec', 'Spectator User');

const mockTechQuestions = [
  {
    prompt: 'What does "bootstrapping" mean in the context of tech startups?',
    options: ['Self-funding without venture capital', 'Hiring developers', 'Launching on App Store', 'Filing for bankruptcy'],
    correctIndex: 0,
    explanation: 'Bootstrapping refers to building a company using personal savings and early revenues.'
  },
  {
    prompt: 'In product management, what does MVP stand for?',
    options: ['Minimum Viable Product', 'Most Valuable Programmer', 'Maximum Velocity Project', 'Modular Version Protocol'],
    correctIndex: 0,
    explanation: 'An MVP is the simplest version of a product that can be released to gather validated learning.'
  },
  {
    prompt: 'What is a "pitch deck" primarily used for?',
    options: ['Presenting business plans to investors', 'Designing marketing brochures', 'Managing team sprints', 'Auditing financial taxes'],
    correctIndex: 0,
    explanation: 'A pitch deck is a brief presentation used to pitch a startup to prospective angel or VC investors.'
  },
  {
    prompt: 'Which metric measures the rate at which customers stop subscribing?',
    options: ['Churn rate', 'Burn rate', 'Bounce rate', 'Click-through rate'],
    correctIndex: 0,
    explanation: 'Churn rate is the percentage of customers or subscribers who cancel over a given period.'
  }
];

await request('/test/set-ai-mock', { questions: mockTechQuestions });

// 3.1 Host creates custom topic room: "Tech Startups & Venture Capital"
const roomRes = await request('/games', {
  topicType: 'custom',
  isCustomTopic: true,
  customTopic: 'Tech Startups & Venture Capital',
  cefrLevel: 'B2',
  duration: 5,
  questionCount: 4,
  hostRole: 'player',
  metadata: {
    mode: 'friends',
    topicType: 'custom',
    isCustomTopic: true,
    topicName: 'Tech Startups & Venture Capital',
    cefrLevel: 'B2',
    targetDurationMinutes: 5,
    targetQuestionCount: 4,
    hostRole: 'player'
  }
}, host.token);

assert.equal(roomRes.status, 200, 'Custom topic Friends room creation must succeed');
const roomCode = roomRes.data.code;
assert.equal(roomRes.data.topic, 'Tech Startups & Venture Capital');
assert.equal(roomRes.data.total, 4);
assert.equal(roomRes.data.questionSource, 'ai');
assert.equal(roomRes.data.isCustomTopic, true);
console.log('PASS 3.1: Friends room created with Custom Topic and Gemini-generated questions');

// 3.2 Guest joins as active player, Spectator joins as spectator
const guestJoin = await request('/games/join', { code: roomCode, role: 'player' }, guest.token);
assert.equal(guestJoin.status, 200);

const specJoin = await request('/games/join', { code: roomCode, role: 'spectator' }, spec.token);
assert.equal(specJoin.status, 200);

// 3.3 Start the match and advance past countdown
await request(`/games/${roomCode}/start`, {}, host.token);
await request('/test/advance-clock', { ms: 10100 });

const hostView = await request(`/games/${roomCode}`, null, host.token);
const guestView = await request(`/games/${roomCode}`, null, guest.token);
const specView = await request(`/games/${roomCode}`, null, spec.token);

assert.equal(hostView.data.status, 'playing');
assert.equal(guestView.data.status, 'playing');
assert.equal(specView.data.status, 'playing');

// 3.4 Verify each player receives an independently randomized question order
console.log(`Host question 0: "${hostView.data.question.prompt}" (id: ${hostView.data.question.id})`);
console.log(`Guest question 0: "${guestView.data.question.prompt}" (id: ${guestView.data.question.id})`);

// Questions must both come from the canonical set of 4 tech startup questions
const canonicalPrompts = mockTechQuestions.map(q => q.prompt);
assert.ok(canonicalPrompts.includes(hostView.data.question.prompt), 'Host question is from canonical set');
assert.ok(canonicalPrompts.includes(guestView.data.question.prompt), 'Guest question is from canonical set');

// Orders must be independently randomized
assert.notEqual(hostView.data.question.id, guestView.data.question.id, 'Host and guest receive distinct randomized starting questions');
console.log('PASS 3.2: Each player receives an independently randomized question order from canonical set');

// 3.5 Verify order stability across refreshes and reconnects
const hostRefresh1 = await request(`/games/${roomCode}`, null, host.token);
const hostRefresh2 = await request(`/games/${roomCode}`, null, host.token);
assert.equal(hostRefresh1.data.question.id, hostView.data.question.id, 'Host question remains identical on refresh 1');
assert.equal(hostRefresh2.data.question.id, hostView.data.question.id, 'Host question remains identical on refresh 2');

const guestRefresh1 = await request(`/games/${roomCode}`, null, guest.token);
const guestRefresh2 = await request(`/games/${roomCode}`, null, guest.token);
assert.equal(guestRefresh1.data.question.id, guestView.data.question.id, 'Guest question remains identical on refresh 1');
assert.equal(guestRefresh2.data.question.id, guestView.data.question.id, 'Guest question remains identical on refresh 2');
console.log('PASS 3.3: Player question order is stable and persisted across refreshes and reconnects');

// 3.6 Verify independent answer submission and scoring for randomized questions
// Find correct option for Host's current question
const hostPrompt = hostView.data.question.prompt;
const hostCanonicalQ = mockTechQuestions.find(q => q.prompt === hostPrompt);
const hostAnsRes = await request(`/games/${roomCode}/answer`, {
  index: 0,
  choice: hostCanonicalQ.correctIndex,
  questionId: hostView.data.question.id
}, host.token);

assert.equal(hostAnsRes.status, 200);
assert.equal(hostAnsRes.data.answer.isCorrect, true);
assert.equal(hostAnsRes.data.answer.explanation, hostCanonicalQ.explanation);
assert.ok(hostAnsRes.data.score > 0);
console.log('PASS 3.4: Host answers their randomized question and receives correct feedback and explanation');

// 3.7 Spectators cannot answer or advance questions
const specAnsAttempt = await request(`/games/${roomCode}/answer`, { index: 0, choice: 0 }, spec.token);
assert.equal(specAnsAttempt.status, 403, 'Spectator cannot submit answers');

const specNextAttempt = await request(`/games/${roomCode}/next`, {}, spec.token);
assert.equal(specNextAttempt.status, 403, 'Spectator cannot advance questions');
console.log('PASS 3.5: Spectator permissions strictly enforced with 403');

// Clean up
await request('/test/clear-ai-mock', {});
await request('/test/reset-clock', {});

console.log('\n========================================================================');
console.log('🎉 ALL CUSTOM TOPIC AI INTEGRATION TESTS PASSED WITH 0 ERRORS!');
console.log('========================================================================');

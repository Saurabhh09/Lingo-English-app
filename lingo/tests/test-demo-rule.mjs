import { createClient } from '@supabase/supabase-js';

const BASE_URL = 'http://localhost:3000';
const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const tables = [
  'lingo_accounts',
  'lingo_sessions',
  'lingo_progress',
  'lingo_games',
  'lingo_solo'
];

async function getCounts() {
  const counts = {};
  for (const t of tables) {
    const { count, error } = await client.from(t).select('*', { count: 'exact', head: true });
    if (error) throw error;
    counts[t] = count;
  }
  return counts;
}

console.log('=== STEP 1: INITIAL ROW COUNTS ===');
const initialCounts = await getCounts();
console.log('Initial row counts:', initialCounts);

console.log('\n=== STEP 2: TEST /api/auth/demo ENDPOINT ===');
const demoRes = await fetch(`${BASE_URL}/api/auth/demo`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({})
});
const demoBody = await demoRes.json();
console.log('Status code:', demoRes.status);
console.log('Response body:', demoBody);

if (demoRes.status !== 403) {
  throw new Error(`Expected status 403, got ${demoRes.status}`);
}
if (!demoBody.error || !demoBody.error.includes('Demo accounts cannot be created when connected to Supabase')) {
  throw new Error(`Unexpected error message: ${demoBody.error}`);
}
console.log('✓ /api/auth/demo correctly blocked with HTTP 403 and informative message');

console.log('\n=== STEP 3: TEST SAFE LOGIN/SIGNUP ENDPOINTS ===');
const loginBad = await fetch(`${BASE_URL}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'saurabhhsingh', password: 'incorrect_password_123' })
});
const loginBadBody = await loginBad.json();
console.log('Login with incorrect password status:', loginBad.status, loginBadBody);
if (loginBad.status !== 401) {
  throw new Error(`Expected 401 on bad login, got ${loginBad.status}`);
}
console.log('✓ Login validation active and intact');

const signupInvalid = await fetch(`${BASE_URL}/api/auth/signup`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Test', username: 'a', password: 'password123' })
});
const signupInvalidBody = await signupInvalid.json();
console.log('Signup invalid username status:', signupInvalid.status, signupInvalidBody);
if (signupInvalid.status !== 400) {
  throw new Error(`Expected 400 on invalid signup username, got ${signupInvalid.status}`);
}
console.log('✓ Signup validation active and intact');

console.log('\n=== STEP 4: VERIFY PERSONAL ACCOUNTS INTACT ===');
const { data: accounts, error: accErr } = await client.from('lingo_accounts').select('id, payload');
if (accErr) throw accErr;
const userIds = accounts.map(a => a.id);
console.log('Account IDs in database:', userIds);
if (!userIds.includes('saurabhhsingh')) {
  throw new Error('Missing personal account saurabhhsingh!');
}
console.log('✓ saurabhhsingh account is verified intact in lingo_accounts');
if (userIds.includes('saurabh09')) {
  console.log('✓ saurabh09 account is present in lingo_accounts');
} else {
  console.log('ℹ saurabh09 is not yet created in lingo_accounts');
}

const { data: progressList, error: progErr } = await client.from('lingo_progress').select('id, payload');
if (progErr) throw progErr;
const progIds = progressList.map(p => p.id);
console.log('Progress IDs in database:', progIds);
if (!progIds.includes('saurabhhsingh') || !progIds.includes('saurabh09')) {
  throw new Error('Missing personal account progress!');
}
const saurabhProgress = progressList.find(p => p.id === 'saurabhhsingh');
console.log('saurabhhsingh progress record:', {
  xp: saurabhProgress.payload.xp,
  words: saurabhProgress.payload.words,
  streak: saurabhProgress.payload.streak,
  completed: saurabhProgress.payload.completed?.length
});

console.log('\n=== STEP 5: FINAL ROW COUNTS ===');
const finalCounts = await getCounts();
console.log('Final row counts:', finalCounts);

let unchanged = true;
for (const t of tables) {
  if (finalCounts[t] !== initialCounts[t]) {
    console.error(`Count mismatch on ${t}: initial=${initialCounts[t]}, final=${finalCounts[t]}`);
    unchanged = false;
  }
}
if (!unchanged) {
  throw new Error('Table counts changed during testing!');
}
console.log('✓ All table counts strictly identical! Zero records written during testing.');

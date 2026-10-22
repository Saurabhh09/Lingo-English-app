import assert from 'node:assert/strict';

const baseUrl = 'http://localhost:3000/api';

async function req(endpoint, method = 'GET', body = null, token = null) {
  const res = await fetch(baseUrl + endpoint, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

console.log('--- RUNNING SAFE READ-ONLY & FUNCTIONALITY VERIFICATION ---');

// 1. Health check
const health = await req('/health');
assert.equal(health.status, 200);
assert.equal(health.data.database, 'supabase');
console.log('✔ Health check: 200 OK (Database: Supabase)');

// 2. Config check
const config = await req('/config');
assert.equal(config.status, 200);
assert.equal(config.data.database, 'supabase');
console.log('✔ Config check: 200 OK (Database: Supabase)');

// 3. AI Status check (Gemini)
const aiStatus = await req('/ai/status');
assert.equal(aiStatus.status, 200);
console.log(`✔ AI Status check: 200 OK (Configured: ${aiStatus.data.configured}, Source: ${aiStatus.data.source || 'gemini'})`);

// 4. Practice catalog check
const practice = await req('/practice/catalog');
assert.equal(practice.status, 200);
assert.ok(practice.data.listening && practice.data.speaking && practice.data.pronunciation && practice.data.scenarios);
console.log('✔ Practice catalog check: 200 OK (All 4 modules available)');

// 5. Curriculum check
const curriculum = await req('/curriculum/levels');
assert.equal(curriculum.status, 200);
assert.ok(Array.isArray(curriculum.data) && curriculum.data.length > 0);
console.log(`✔ Curriculum check: 200 OK (${curriculum.data.length} levels loaded)`);

// 6. Unauthenticated guard check
const unauthMe = await req('/me');
assert.equal(unauthMe.status, 401);
assert.equal(unauthMe.data.error, 'Please sign in to continue.');
console.log('✔ Route guard check: /api/me correctly returns 401 for unauthenticated visitors without creating accounts');

console.log('\n✔ All safe functionality checks PASSED!');

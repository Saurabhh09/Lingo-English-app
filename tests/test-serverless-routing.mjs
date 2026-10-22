import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../api/index.js';

// Start a lightweight http server wrapping the exported app (simulating what Vercel does)
const server = http.createServer((req, res) => app(req, res));

await new Promise((resolve, reject) => {
  server.listen(0, '127.0.0.1', resolve);
});

const port = server.address().port;
const baseUrl = `http://127.0.0.1:${port}`;
console.log(`Test server listening on ${baseUrl}`);

try {
  // Test 1: GET /api/config
  console.log('Testing GET /api/config...');
  const resConfig = await fetch(`${baseUrl}/api/config`);
  assert.equal(resConfig.status, 200, `Expected 200, got ${resConfig.status}`);
  assert.match(resConfig.headers.get('content-type'), /application\/json/);
  const dataConfig = await resConfig.json();
  console.log('GET /api/config response:', dataConfig);
  assert.ok(dataConfig.app === 'Lingo', 'Expected app to be Lingo');
  assert.ok(dataConfig.database, 'Expected database field');

  // Test 2: GET /config (simulating Vercel stripped rewrite)
  console.log('Testing GET /config (stripped prefix)...');
  const resConfigStripped = await fetch(`${baseUrl}/config`);
  assert.equal(resConfigStripped.status, 200, `Expected 200, got ${resConfigStripped.status}`);
  const dataConfigStripped = await resConfigStripped.json();
  assert.equal(dataConfigStripped.app, 'Lingo');
  console.log('GET /config response matched successfully.');

  // Test 3: POST /api/auth/signup validation error (ensures reaching signup handler)
  console.log('Testing POST /api/auth/signup (empty body)...');
  const resSignupEmpty = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  assert.equal(resSignupEmpty.status, 400);
  assert.match(resSignupEmpty.headers.get('content-type'), /application\/json/);
  const dataSignupEmpty = await resSignupEmpty.json();
  console.log('POST /api/auth/signup empty body response:', dataSignupEmpty);
  assert.ok(dataSignupEmpty.error, 'Expected error message');
  assert.match(dataSignupEmpty.error, /username/);

  // Test 4: Other endpoints (health, curriculum)
  console.log('Testing GET /api/health...');
  const resHealth = await fetch(`${baseUrl}/api/health`);
  assert.equal(resHealth.status, 200);
  const dataHealth = await resHealth.json();
  assert.equal(dataHealth.status, 'ok');

  console.log('Testing GET /api/curriculum/levels...');
  const resLevels = await fetch(`${baseUrl}/api/curriculum/levels`);
  assert.equal(resLevels.status, 200);
  const dataLevels = await resLevels.json();
  assert.ok(Array.isArray(dataLevels), 'Levels should be an array');

  // Test 5: Unauthenticated nonexistent route triggers auth gate with JSON
  console.log('Testing GET /api/nonexistent (unauthenticated)...');
  const resNonexistent = await fetch(`${baseUrl}/api/nonexistent`);
  assert.equal(resNonexistent.status, 401);
  assert.match(resNonexistent.headers.get('content-type'), /application\/json/);
  const dataNonexistent = await resNonexistent.json();
  assert.equal(dataNonexistent.error, 'Please sign in to continue.');
  console.log('GET /api/nonexistent returned valid 401 JSON as expected.');

  console.log('\n--- ALL ROUTING AND HANDLER VERIFICATION TESTS PASSED ---');
} finally {
  server.close();
}

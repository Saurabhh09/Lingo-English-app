import assert from 'node:assert/strict';
import { startIsolatedUiServer } from './helpers/isolated-server.mjs';
import { lessons } from '../content.js';

const CONCURRENCY = 12;
const ITERATIONS_PER_WORKER = 15; // 180 reqs per endpoint

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return Number(sorted[idx].toFixed(2));
}

async function benchEndpoint(name, fn) {
  const latencies = [];
  let errors = 0;
  const start = performance.now();
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (let i = 0; i < ITERATIONS_PER_WORKER; i++) {
        const t0 = performance.now();
        try {
          const ok = await fn();
          if (!ok) errors++;
        } catch {
          errors++;
        } finally {
          latencies.push(performance.now() - t0);
        }
      }
    })
  );
  const totalMs = performance.now() - start;
  latencies.sort((a, b) => a - b);
  const rps = (latencies.length / (totalMs / 1000)).toFixed(1);
  console.log(
    `[LOAD] ${name.padEnd(28)} count=${latencies.length} errors=${errors} rps=${rps} p50=${percentile(latencies, 50)}ms p95=${percentile(latencies, 95)}ms p99=${percentile(latencies, 99)}ms max=${percentile(latencies, 100)}ms`
  );
  assert.equal(errors, 0, `${name} had ${errors} failed requests under load`);
}

const srv = await startIsolatedUiServer();
try {
  const base = srv.apiUrl + '/api';
  const signup = await fetch(`${base}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'lt_' + String(Date.now()).slice(-8), name: 'Load Tester', password: 'PasswordLT123!' })
  }).then(r => r.json());
  const tok = signup.token;
  assert.ok(tok, 'Load test user token required');

  // Unlock hello first
  await fetch(`${base}/progress/lesson`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
    body: JSON.stringify({ lesson: lessons[0].id, answers: lessons[0].questions.map(q => q[2]) })
  });

  await benchEndpoint('GET /api/health', async () => {
    const r = await fetch(`${base}/health`);
    return r.status === 200;
  });

  await benchEndpoint('GET /api/curriculum/levels', async () => {
    const r = await fetch(`${base}/curriculum/levels`);
    return r.status === 200;
  });

  await benchEndpoint('GET /api/me', async () => {
    const r = await fetch(`${base}/me`, { headers: { Authorization: `Bearer ${tok}` } });
    return r.status === 200;
  });

  await benchEndpoint('GET /api/social/overview', async () => {
    const r = await fetch(`${base}/social/overview`, { headers: { Authorization: `Bearer ${tok}` } });
    return r.status === 200;
  });

  await benchEndpoint('POST /curriculum/exercises/check', async () => {
    const r = await fetch(`${base}/curriculum/exercises/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
      body: JSON.stringify({ lessonId: 'hello', exerciseIndex: 0, choice: 1 })
    });
    return r.status === 200;
  });
} finally {
  await srv.stop();
}

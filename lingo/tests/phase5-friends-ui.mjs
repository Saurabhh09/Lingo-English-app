import { chromium, expect } from '@playwright/test';
import { startIsolatedUiServer } from './helpers/isolated-server.mjs';

console.log('--- STARTING PLAYWRIGHT FRIENDS INDEPENDENT PROGRESSION UI TESTS ---');

const srv = await startIsolatedUiServer();
const browser = await chromium.launch({ headless: true });

try {
  const contextA = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const contextB = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  const errorsA = [];
  const errorsB = [];
  pageA.on('pageerror', e => errorsA.push(e.message));
  pageB.on('pageerror', e => errorsB.push(e.message));
  pageA.on('dialog', dialog => dialog.accept());
  pageB.on('dialog', dialog => dialog.accept());

  const advanceClock = async (ms) => {
    await pageA.request.post(`${srv.apiUrl}/api/test/advance-clock`, { data: { ms } });
  };
  await pageA.request.post(`${srv.apiUrl}/api/test/reset-clock`, { data: {} });

  await pageA.goto(srv.baseUrl);
  await pageB.goto(srv.baseUrl);

  await pageA.getByRole('button', { name: 'Get started' }).click();
  await pageB.getByRole('button', { name: 'Get started' }).click();

  await expect(pageA.locator('[data-testid="web-nav-games"]')).toBeVisible({ timeout: 15000 });
  await expect(pageB.locator('[data-testid="web-nav-games"]')).toBeVisible({ timeout: 15000 });
  await pageA.locator('[data-testid="web-nav-games"]').click();
  await pageB.locator('[data-testid="web-nav-games"]').click();

  await pageA.locator('[data-mode="friends"]').click();
  await pageA.getByRole('radio', { name: /Play with everyone/i }).click();
  await pageA.getByRole('button', { name: 'Create a game', exact: true }).click();

  await expect(pageA.locator('.room-code')).toBeVisible({ timeout: 5000 });
  const roomCode = (await pageA.locator('.room-code .friends-code-chars').textContent()).replace(/\s+/g, '').trim();
  expect(roomCode.length).toBe(6);

  await pageB.getByLabel('Game code').fill(roomCode);
  await pageB.getByRole('button', { name: 'Join game', exact: true }).click();
  await expect(pageB.getByText(/PLAYERS \(2 \/ (?:8|100)\)/i)).toBeVisible({ timeout: 5000 });
  await expect(pageA.getByText(/PLAYERS \(2 \/ (?:8|100)\)/i)).toBeVisible({ timeout: 5000 });
  console.log('PASS 1: Both Player A and Player B joined lobby');

  const startBtn = pageA.locator('button.start-game');
  await expect(startBtn).toBeVisible();
  await startBtn.click();

  await expect(pageA.getByRole('heading', { name: 'Starting in' })).toBeVisible({ timeout: 5000 });
  await expect(pageB.getByRole('heading', { name: 'Starting in' })).toBeVisible({ timeout: 5000 });

  await advanceClock(10500);

  await expect(pageA.locator('.question-prompt')).toBeVisible({ timeout: 10000 });
  await expect(pageB.locator('.question-prompt')).toBeVisible({ timeout: 10000 });
  console.log('PASS 2: Both players transitioned to active gameplay');

  await expect(pageA.locator('.round-timer, .per-question-timer')).not.toBeVisible();
  await expect(pageB.locator('.round-timer, .per-question-timer')).not.toBeVisible();
  await expect(pageA.locator('.quiz-timer')).toBeVisible();
  await expect(pageB.locator('.quiz-timer')).toBeVisible();
  console.log('PASS 3: Per-question timer is absent; overall timer is present');

  const optA = pageA.locator('.answer-options button');
  await expect(optA.first()).toBeVisible();
  await optA.first().click();
  await pageA.getByRole('button', { name: /Submit Answer/i }).click();

  await expect(pageA.locator('.answer-feedback')).toBeVisible({ timeout: 5000 });
  const nextBtnA = pageA.getByRole('button', { name: /Next Question/i });
  await expect(nextBtnA).toBeVisible();
  await expect(pageA.getByText(/Waiting for host to start next question/i)).not.toBeVisible();
  console.log('PASS 4: Player A sees feedback and Next Question button without blocking');

  await expect(pageB.locator('.answer-options button').first()).toBeEnabled();
  await expect(pageB.locator('.answer-feedback')).not.toBeVisible();
  console.log('PASS 5: Player B remains on Question 1 unaffected by Player A submission');

  await nextBtnA.click();
  await expect(pageA.locator('.answer-feedback')).not.toBeVisible({ timeout: 5000 });
  console.log('PASS 6: Player A independently advanced to Question 2');

  await expect(pageB.locator('.answer-options button').first()).toBeEnabled();
  await expect(pageB.locator('.answer-feedback')).not.toBeVisible();
  console.log('PASS 7: Player B remains on Question 1 after Player A advanced');

  const optB = pageB.locator('.answer-options button');
  await optB.first().click();
  await pageB.getByRole('button', { name: /Submit Answer/i }).click();
  await expect(pageB.locator('.answer-feedback')).toBeVisible({ timeout: 5000 });
  await pageB.getByRole('button', { name: /Next Question/i }).click();
  await expect(pageB.locator('.answer-feedback')).not.toBeVisible({ timeout: 5000 });
  console.log('PASS 8: Player B independently advanced to Question 2');

  expect(errorsA).toEqual([]);
  expect(errorsB).toEqual([]);
} finally {
  await browser.close().catch(() => { });
  await srv.stop();
}

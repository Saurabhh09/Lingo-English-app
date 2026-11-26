import { chromium, expect } from '@playwright/test';
import { startIsolatedUiServer } from './helpers/isolated-server.mjs';

console.log('--- STARTING PHASE 3 PLAYWRIGHT UI & E2E VERIFICATION ---');

const srv = await startIsolatedUiServer();
const browser = await chromium.launch({ headless: true });

try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', dialog => dialog.accept());

  const advanceClock = async (ms) => {
    await page.request.post(`${srv.apiUrl}/api/test/advance-clock`, { data: { ms } });
  };

  await page.goto(srv.baseUrl);
  await page.getByRole('button', { name: 'Get started' }).click();
  await expect(page.locator('[data-testid="web-nav-games"]')).toBeVisible({ timeout: 15000 });
  await page.locator('[data-testid="web-nav-games"]').click();
  console.log('PASS 1: Navigation to Play succeeded');

  // PART A: SOLO MODE UI & PRE-GAME COUNTDOWN FLOW
  const soloModeBtn = page.locator('[data-mode="solo"]');
  await soloModeBtn.click();
  await expect(soloModeBtn).toHaveAttribute('aria-checked', 'true');

  await page.locator('.accordion-header-btn', { hasText: 'Topic' }).click();
  await page.getByRole('radio', { name: /Vocabulary/ }).click();

  const startSoloBtn = page.getByRole('button', { name: 'Start game', exact: true });
  await expect(startSoloBtn).toBeVisible();
  await startSoloBtn.click();

  await expect(page.getByRole('heading', { name: 'Get ready!' })).toBeVisible({ timeout: 5000 });
  await expect(page.getByText('SOLO CHALLENGE', { exact: true })).toBeVisible();
  await expect(page.locator('.friends-invite-btn.room-share-btn')).not.toBeVisible();
  await expect(page.getByText(/YOUR GAME CODE/i)).not.toBeVisible();
  console.log('PASS 2 & 3: Solo mode countdown renders cleanly without room codes or lobby');

  await advanceClock(10500);

  await expect(page.locator('.question-prompt')).toBeVisible({ timeout: 10000 });
  console.log('PASS 4: Solo pre-game countdown transitions automatically to gameplay');

  const optionButtons = page.locator('.solo-options-stack button');
  await expect(optionButtons.first()).toBeVisible({ timeout: 5000 });
  await optionButtons.first().click();
  await page.getByRole('button', { name: /Submit Answer/i }).click();
  await expect(page.locator('.solo-feedback-strip')).toBeVisible();
  await expect(page.getByRole('button', { name: /Next Question/i })).toBeVisible();
  console.log('PASS 5: Solo answer submission, feedback, and Next Question verified');

  const leaveBtn = page.getByRole('button', { name: 'Exit challenge' });
  await expect(leaveBtn).toBeVisible();
  await leaveBtn.click();
  const confirmExit = page.locator('dialog').getByRole('button', { name: /Exit game/i });
  if (await confirmExit.isVisible().catch(() => false)) await confirmExit.click();
  await expect(page.getByRole('heading', { name: 'Create a Game' })).toBeVisible({ timeout: 5000 });

  // PART B: FRIENDS MODE WAITING LOBBY & SPECTATOR ROLE
  const friendsModeBtn = page.locator('[data-mode="friends"]');
  await friendsModeBtn.click();
  await expect(friendsModeBtn).toHaveAttribute('aria-checked', 'true');
  const spectateBtn = page.getByRole('radio', { name: /Spectate/ });
  await spectateBtn.click();
  await expect(spectateBtn).toHaveAttribute('aria-checked', 'true');

  await page.getByRole('button', { name: 'Create a game', exact: true }).click();

  await expect(page.locator('.friends-invite-btn.room-share-btn')).toBeVisible({ timeout: 5000 });
  await expect(page.getByText('YOUR GAME CODE')).toBeVisible();
  await expect(page.getByText(/PLAYERS \(0 \/ (?:8|100)\)/i)).toBeVisible();
  const startFriendsGameBtn = page.locator('button.start-game');
  await expect(startFriendsGameBtn).toBeVisible();
  console.log('PASS 6: Friends waiting lobby renders code, invite button, roster, and start button');

  await startFriendsGameBtn.click();
  await expect(page.getByText(/FRIENDS CHALLENGE/i)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Starting in' })).toBeVisible();
  console.log('PASS 7: Host Start Game triggers countdown');

  await advanceClock(10500);

  await expect(page.locator('.spectator-dashboard')).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole('heading', { name: 'Live Leaderboard' })).toBeVisible();
  expect(await page.locator('.answer-options button').count()).toBe(0);
  const specExitBtn = page.locator('.spectator-dashboard').getByRole('button', { name: 'Exit Game' });
  await expect(specExitBtn).toBeVisible();
  console.log('PASS 8: Spectator host sees dedicated Live Leaderboard without playable answer options');

  expect(errors).toEqual([]);
  console.log('PASS 9: Zero browser runtime errors logged during Phase 3 flows');
} finally {
  await browser.close().catch(() => { });
  await srv.stop();
}

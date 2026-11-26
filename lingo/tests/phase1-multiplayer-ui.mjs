import { chromium, expect } from '@playwright/test';
import { startIsolatedUiServer } from './helpers/isolated-server.mjs';

console.log('--- STARTING PHASE 1 PLAY & LEARN UI VERIFICATION ---');

const srv = await startIsolatedUiServer();
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
  });

  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  await page.goto(srv.baseUrl);
  await page.getByRole('button', { name: 'Get started' }).click();
  const playNav = page.locator('[data-testid="web-nav-games"]');
  await expect(playNav).toBeVisible({ timeout: 15000 });
  await playNav.click();
  console.log('PASS 1: Navigation to Play page succeeded');

  await expect(page.getByRole('heading', { name: 'Join by Code' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Create a Game' })).toBeVisible();
  console.log('PASS 2: Distinguishable Join and Create game areas rendered');

  await page.locator('.accordion-header-btn', { hasText: 'Target Proficiency' }).click();
  for (const level of ['Pre-A1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']) {
    await expect(page.locator(`[data-cefr="${level}"]`)).toBeVisible();
  }
  await page.locator('.accordion-header-btn', { hasText: 'Round Duration' }).click();
  for (const dur of [1, 3, 5, 10]) {
    await expect(page.locator(`[data-duration="${dur}"]`)).toBeVisible();
  }
  console.log('PASS 3: CEFR level and timer duration options verified');

  const joinInput = page.getByLabel('Game code');
  const joinBtn = page.getByRole('button', { name: 'Join game', exact: true });
  await expect(joinBtn).toBeDisabled();
  await expect(page.getByText('0 / 6')).toBeVisible();
  await joinInput.fill('abc12');
  await expect(joinInput).toHaveValue('ABC12');
  await expect(page.getByText('5 / 6')).toBeVisible();
  await expect(joinBtn).toBeDisabled();
  await joinInput.fill('abc123');
  await expect(joinInput).toHaveValue('ABC123');
  await expect(page.getByText('Ready')).toBeVisible();
  await expect(joinBtn).toBeEnabled();
  await joinInput.fill('');
  await expect(joinBtn).toBeDisabled();
  console.log('PASS 4: Code input uppercase auto-formatting, length badge, and validation verified');

  await page.locator('.accordion-header-btn', { hasText: 'Target Proficiency' }).click();
  await page.locator('[data-cefr="B2"]').click();
  await page.locator('.accordion-header-btn', { hasText: 'Topic' }).click();
  await page.getByRole('radio', { name: /Grammar/ }).click();
  await page.locator('.accordion-header-btn', { hasText: 'Round Duration' }).click();
  await page.locator('[data-duration="5"]').click();
  await page.getByRole('button', { name: 'Create a game' }).click();

  await expect(page.locator('.room-code')).toBeVisible();
  const roomCode = (await page.locator('.room-code .friends-code-chars').textContent()).replace(/\s+/g, '').trim();
  expect(roomCode.length).toBe(6);
  await expect(page.getByText('YOUR GAME CODE')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy room code' })).toBeVisible();
  await expect(page.locator('.friends-invite-btn.room-share-btn')).toBeVisible();
  await expect(page.getByText(/PLAYERS \(1 \/ (?:8|100)\)/i)).toBeVisible();
  await expect(page.locator('button.start-game')).toBeVisible();
  await expect(page.getByText('Intermediate')).toBeVisible();
  await expect(page.getByText('GRAMMAR')).toBeVisible();
  await expect(page.getByText('5 min')).toBeVisible();
  console.log('PASS 5: Waiting room UI renders room code, share actions, roster, settings, and host controls');

  await page.locator('button.start-game').click();
  await expect(page.getByRole('heading', { name: 'Starting in' })).toBeVisible();
  await expect(page.locator('.solo-countdown-digit')).toBeVisible();
  await expect(page.locator('.solo-timer-ring-wrap')).toHaveAttribute('aria-live', 'polite');
  console.log('PASS 6: Countdown lobby renders ring, digit, and accessible live region');

  for (const vp of [
    { name: 'Desktop', width: 1440, height: 900 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Mobile', width: 375, height: 812 },
  ]) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(hasOverflow).toBe(false);
  }
  expect(errors).toEqual([]);
  console.log('PASS 7: Responsive layout & zero browser errors verified');
} finally {
  await browser.close().catch(() => { });
  await srv.stop();
}

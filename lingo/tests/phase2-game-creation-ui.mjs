import { chromium, expect } from '@playwright/test';
import { startIsolatedUiServer } from './helpers/isolated-server.mjs';

console.log('--- STARTING PHASE 2 GAME-CREATION UI & ONBOARDING VERIFICATION ---');

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
  const navBtn = page.locator('[data-testid="web-nav-games"]');
  await expect(navBtn).toBeVisible({ timeout: 15000 });
  await navBtn.click();
  console.log('PASS 1: Navigation to Play page succeeded');

  await expect(page.getByRole('heading', { name: 'Join by Code' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Create a Game' })).toBeVisible();
  console.log('PASS 2: Setup Page renders Join and Create cards');

  const soloModeBtn = page.locator('[data-mode="solo"]');
  const friendsModeBtn = page.locator('[data-mode="friends"]');
  await expect(soloModeBtn).toBeVisible();
  await expect(friendsModeBtn).toBeVisible();
  await expect(friendsModeBtn).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByText('Host Participation')).toBeVisible();
  await expect(page.getByRole('radio', { name: /Play with everyone/ })).toBeVisible();
  await expect(page.getByRole('radio', { name: /Spectate/ })).toBeVisible();
  console.log('PASS 3: Default Friends mode renders Host Participation controls');

  await soloModeBtn.click();
  await expect(soloModeBtn).toHaveAttribute('aria-checked', 'true');
  await expect(friendsModeBtn).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByText('Host Participation')).not.toBeVisible();
  console.log('PASS 4: Switching to Solo mode hides Host Participation preference');

  await friendsModeBtn.click();
  await expect(friendsModeBtn).toHaveAttribute('aria-checked', 'true');
  const spectateBtn = page.getByRole('radio', { name: /Spectate/ });
  await spectateBtn.click();
  await expect(spectateBtn).toHaveAttribute('aria-checked', 'true');
  const playerBtn = page.getByRole('radio', { name: /Play with everyone/ });
  await playerBtn.click();
  await expect(playerBtn).toHaveAttribute('aria-checked', 'true');
  console.log('PASS 5: Host Participation toggles cleanly between Player and Spectate');

  // Step 2: CEFR Levels
  await page.locator('.accordion-header-btn', { hasText: 'Target Proficiency' }).click();
  for (const level of ['Pre-A1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']) {
    await expect(page.locator(`[data-cefr="${level}"]`)).toBeVisible();
  }
  await page.locator('[data-cefr="C1"]').click();
  await expect(page.locator('[data-cefr="C1"]')).toHaveAttribute('aria-checked', 'true');
  console.log('PASS 6: All 7 CEFR levels exist and are selectable');

  // Step 3: Topics + Custom topic validation
  await page.locator('.accordion-header-btn', { hasText: 'Topic' }).click();
  for (const topic of ['Mixed English', 'Grammar', 'Vocabulary', 'Daily conversation', 'Business English']) {
    await expect(page.getByRole('radio', { name: new RegExp(topic) })).toBeVisible();
  }
  const createBtn = page.getByRole('button', { name: 'Create a game' });
  await page.getByRole('tab', { name: 'Custom Topic' }).click();
  const customInput = page.getByLabel('Enter your custom topic');
  await customInput.fill('   ');
  await customInput.blur();
  await expect(page.locator('#custom-topic-error')).toBeVisible();
  await expect(createBtn).toBeDisabled();
  await customInput.fill('Biotechnology & Genomics');
  await expect(page.locator('#custom-topic-error')).not.toBeVisible();
  await expect(createBtn).toBeEnabled();
  console.log('PASS 7 & 8: Suggested topics and custom topic validation verified');

  // Step 4: Duration + Custom duration validation
  await page.locator('.accordion-header-btn', { hasText: 'Round Duration' }).click();
  for (const dur of [1, 3, 5, 10, 15, 20, 'custom']) {
    await expect(page.locator(`[data-duration="${dur}"]`)).toBeVisible();
  }
  await page.locator('[data-duration="custom"]').click();
  const durInput = page.locator('#custom-duration-input');
  await durInput.fill('75');
  await durInput.blur();
  await expect(page.getByText('Duration must be between 1 and 60 minutes.')).toBeVisible();
  await expect(createBtn).toBeDisabled();
  await durInput.fill('25');
  await durInput.blur();
  await expect(page.getByText('Duration must be between 1 and 60 minutes.')).not.toBeVisible();
  console.log('PASS 9: Duration options and validation verified');

  // Step 5: Question Count + Custom validation
  await page.locator('.accordion-header-btn', { hasText: 'Question Count' }).click();
  for (const q of [5, 10, 15, 20, 30, 'custom']) {
    await expect(page.locator(`[data-questions="${q}"]`)).toBeVisible();
  }
  await page.locator('[data-questions="custom"]').click();
  const qInput = page.locator('#custom-question-input');
  await qInput.fill('55');
  await qInput.blur();
  await expect(page.getByText('Question count must be between 3 and 50.')).toBeVisible();
  await expect(createBtn).toBeDisabled();
  await qInput.fill('18');
  await qInput.blur();
  await expect(page.getByText('Question count must be between 3 and 50.')).not.toBeVisible();
  console.log('PASS 10: Question count options and validation verified');

  // Create Game Regression Check
  await page.locator('.accordion-header-btn', { hasText: 'Topic' }).click();
  await page.getByRole('tab', { name: 'Suggested Topics' }).click();
  await page.getByRole('radio', { name: /Grammar/ }).click();
  await page.locator('.accordion-header-btn', { hasText: 'Round Duration' }).click();
  await page.locator('[data-duration="5"]').click();
  await page.locator('.accordion-header-btn', { hasText: 'Question Count' }).click();
  await page.locator('[data-questions="10"]').click();
  await createBtn.click();

  await expect(page.locator('.room-code')).toBeVisible();
  await expect(page.getByText('YOUR GAME CODE')).toBeVisible();
  await expect(page.getByText('GRAMMAR')).toBeVisible();
  await expect(page.getByText('5 min')).toBeVisible();
  console.log('PASS 11 & 12: Creating game enters Waiting Lobby smoothly');

  await page.getByRole('button', { name: /Exit Game/i }).first().click();
  const confirmExit = page.locator('dialog').getByRole('button', { name: /Exit game/i });
  if (await confirmExit.isVisible().catch(() => false)) await confirmExit.click();
  await expect(page.getByRole('heading', { name: 'Create a Game' })).toBeVisible();

  for (const vp of [
    { name: 'Desktop (1440x900)', width: 1440, height: 900 },
    { name: 'Tablet (768x1024)', width: 768, height: 1024 },
    { name: 'Mobile (375x812)', width: 375, height: 812 },
  ]) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(hasOverflow).toBe(false);
    console.log(`PASS 13 [${vp.name}]: No horizontal scroll overflow`);
  }

  expect(errors).toEqual([]);
  console.log('PASS 14: Zero browser runtime errors logged');
} finally {
  await browser.close().catch(() => { });
  await srv.stop();
}

import { chromium, expect } from '@playwright/test';
import { lessons, questionPool } from '../content.js';
import { startIsolatedUiServer } from './helpers/isolated-server.mjs';

const srv = await startIsolatedUiServer();
const browser = await chromium.launch({ headless: true });

try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  const friend = await ctx2.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  friend.on('pageerror', e => errors.push(e.message));
  p.on('dialog', d => d.accept());
  friend.on('dialog', d => d.accept());

  const username = 'test_' + Date.now();
  await p.goto(srv.baseUrl);
  await expect(p.getByRole('button', { name: 'Email' })).toBeVisible({ timeout: 10000 });
  await p.getByRole('button', { name: 'Email' }).click();
  await p.getByLabel('What should we call you?').fill('Sam');
  await p.getByLabel('Your unique username').fill(username);
  await p.getByLabel('Create a password').fill('TestPassword123');
  await p.getByRole('button', { name: 'Let’s start my story' }).click();
  await expect(p.locator('.web-sidebar-profile')).toContainText('Sam');
  await expect(p.getByRole('heading', { name: 'Ready to learn today?' })).toBeVisible();
  console.log('PASS username-only signup');

  await p.locator('[data-testid="web-nav-learn"]').click();
  await expect(p.locator('.learn-redesign-journey')).toBeVisible();
  await p.locator('.unit-details-card').first().click();
  await p.locator('.lesson-3d-circle-btn.current').first().click();
  await expect(p.locator('.lesson-page-screen')).toBeVisible();
  const startPractice = p.locator('.start-practice-action-btn');
  await startPractice.waitFor({ state: 'visible' });
  await startPractice.click();

  for (let i = 0; i < 5; i++) {
    const q = lessons[0].questions[i];
    const correctText = q[1][q[2]];
    await p.locator('.answer-options button, .choice-grid-2x2 button').filter({ hasText: correctText }).first().click();
    await p.getByRole('button', { name: 'Check my answer' }).click();
    await p.getByRole('button', { name: i === 4 ? 'See my little win' : 'Next question' }).click();
  }
  await expect(p.getByRole('heading', { name: 'Look at you go!' })).toBeVisible();
  await expect(p.getByText('+50 XP')).toBeVisible();
  while (await p.locator('.badge-unlock-overlay').isVisible().catch(() => false)) {
    await p.locator('.badge-unlock-overlay button.button.primary').first().click();
    await p.waitForTimeout(100);
  }
  await p.getByRole('button', { name: 'Back to my journey' }).click();
  await p.reload();
  await expect(p.locator('.web-sidebar-profile')).toContainText('Sam');
  console.log('PASS lesson scoring, XP, and persistence');

  await p.locator('[data-testid="web-nav-home"]').click();
  await p.getByRole('button', { name: 'Save this word' }).click();
  await expect(p.getByRole('button', { name: 'Saved in library' })).toBeVisible();
  await p.locator('[data-testid="web-nav-profile"]').click();
  await p.locator('.profile-hub-card.word-lib').click();
  await expect(p.locator('.modal').getByRole('heading', { name: 'Serendipity' })).toBeVisible();
  await p.getByLabel('Close dialog').click();
  console.log('PASS saved word library');

  await p.locator('[data-testid="web-nav-games"]').click();
  await p.locator('.accordion-header-btn', { hasText: 'Round Duration' }).click();
  await p.locator('[data-duration="1"]').click();
  await p.locator('.accordion-header-btn', { hasText: 'Question Count' }).click();
  await p.locator('[data-questions="custom"]').click();
  await p.locator('#custom-question-input').fill('3');
  await p.getByRole('button', { name: 'Create a game' }).click();
  await expect(p.locator('.room-code')).toBeVisible();
  const code = (await p.locator('.room-code .friends-code-chars').textContent()).replace(/\s+/g, '').trim();
  expect(code.length).toBe(6);
  await expect(p.getByText(/PLAYERS \(1 \/ (?:8|100)\)/i)).toBeVisible();

  await friend.goto(srv.baseUrl);
  await expect(friend.getByRole('button', { name: 'Email' })).toBeVisible({ timeout: 10000 });
  await friend.getByRole('button', { name: 'Email' }).click();
  const friendUser = 'friend_' + Date.now();
  await friend.getByLabel('What should we call you?').fill('Alex');
  await friend.getByLabel('Your unique username').fill(friendUser);
  await friend.getByLabel('Create a password').fill('TestPassword123');
  await friend.getByRole('button', { name: 'Let’s start my story' }).click();
  await expect(friend.locator('.web-sidebar-profile')).toContainText('Alex', { timeout: 10000 });
  await friend.locator('[data-testid="web-nav-games"]').click();
  await friend.getByLabel('Game code').fill(code);
  await friend.getByRole('button', { name: 'Join game', exact: true }).click();
  await expect(friend.getByText(/PLAYERS \(2 \/ (?:8|100)\)/i)).toBeVisible();
  await expect(p.getByText(/PLAYERS \(2 \/ (?:8|100)\)/i)).toBeVisible();

  await p.locator('button.start-game').click();
  await expect(friend.getByRole('heading', { name: 'Starting in' })).toBeVisible();
  await p.request.post(`${srv.apiUrl}/api/test/advance-clock`, { data: { ms: 10500 } });
  await expect(p.locator('.question-prompt')).toBeVisible({ timeout: 12000 });
  await expect(friend.locator('.question-prompt')).toBeVisible({ timeout: 12000 });
  console.log('PASS cross-browser lobby, joining by code, and host start');

  const pool = [
    ...questionPool('Mixed English', 'B1'),
    ...questionPool('Mixed English', 'Beginner'),
    ...questionPool('Mixed English', 'Intermediate'),
    ...questionPool('Mixed English', 'Advanced'),
    ...lessons.flatMap(l => l.questions)
  ];
  for (let round = 0; round < 3; round++) {
    const prompt = (await p.locator('.question-prompt').textContent())?.trim();
    const matchQ = pool.find(q => q[0] === prompt);
    const correctText = matchQ ? matchQ[1][matchQ[2]] : null;
    if (correctText) {
      const pBtns = p.locator('.answer-options button');
      const pCount = await pBtns.count();
      for (let i = 0; i < pCount; i++) {
        const t = (await pBtns.nth(i).textContent())?.replace(/^[A-D]\s*/, '').trim();
        if (t === correctText) { await pBtns.nth(i).click(); break; }
      }
    } else {
      await p.locator('.answer-options button').first().click();
    }

    const fPrompt = (await friend.locator('.question-prompt').textContent())?.trim();
    const fMatchQ = pool.find(q => q[0] === fPrompt);
    const fCorrectText = fMatchQ ? fMatchQ[1][fMatchQ[2]] : null;
    if (fCorrectText) {
      const fBtns = friend.locator('.answer-options button');
      const fCount = await fBtns.count();
      for (let i = 0; i < fCount; i++) {
        const t = (await fBtns.nth(i).textContent())?.replace(/^[A-D]\s*/, '').trim();
        if (t && t !== fCorrectText) { await fBtns.nth(i).click(); break; }
      }
    } else {
      await friend.locator('.answer-options button').nth(1).click();
    }
    await p.getByRole('button', { name: /Submit Answer/i }).click();
    await friend.getByRole('button', { name: /Submit Answer/i }).click();
    if (round < 2) {
      await expect(p.locator('.answer-feedback')).toBeVisible();
      await expect(friend.locator('.answer-feedback')).toBeVisible();
      await p.getByRole('button', { name: /Next Question/i }).click();
      await friend.getByRole('button', { name: /Next Question/i }).click();
    } else {
      const pShow = p.getByRole('button', { name: /Show Results/i });
      if (await pShow.isVisible().catch(() => false)) await pShow.click();
      const fShow = friend.getByRole('button', { name: /Show Results/i });
      if (await fShow.isVisible().catch(() => false)) await fShow.click();
    }
  }
  await expect(p.getByRole('heading', { name: 'Leaderboard' })).toBeVisible({ timeout: 10000 });
  await expect(friend.getByRole('heading', { name: 'Leaderboard' })).toBeVisible({ timeout: 10000 });
  await expect(p.locator('.result-score strong')).not.toHaveText('0');
  await expect(friend.locator('.result-score strong')).toHaveText('0');
  console.log('PASS timed questions, server scores, independent progression, and final leaderboard');

  const backToPlay = p.getByRole('button', { name: /Back to Play/i });
  if (await backToPlay.isVisible().catch(() => false)) {
    await backToPlay.click();
  } else {
    await p.locator('.exit-game-btn').first().click();
    const exitDialogBtn = p.locator('dialog').getByRole('button', { name: /Exit game/i });
    if (await exitDialogBtn.isVisible().catch(() => false)) await exitDialogBtn.click();
  }
  await expect(p.getByRole('heading', { name: 'Create a Game' })).toBeVisible();

  await p.setViewportSize({ width: 390, height: 844 });
  await p.locator('[data-testid="nav-home"]').click();
  await expect(p.getByRole('heading', { name: 'Ready to learn today?' })).toBeVisible();
  expect(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await p.evaluate(() => {
    const m = document.querySelector('main');
    const a = new Event('touchstart', { bubbles: true });
    a.touches = [{ clientX: 300, clientY: 200 }];
    m.dispatchEvent(a);
    const b = new Event('touchend', { bubbles: true });
    b.changedTouches = [{ clientX: 100, clientY: 210 }];
    m.dispatchEvent(b);
  });
  await expect(p.locator('.learn-redesign-journey')).toBeVisible();
  console.log('PASS mobile layout, bottom navigation, and horizontal swipe');

  expect(errors).toEqual([]);
  console.log('PASS no browser errors');
} finally {
  await browser.close().catch(() => { });
  await srv.stop();
}

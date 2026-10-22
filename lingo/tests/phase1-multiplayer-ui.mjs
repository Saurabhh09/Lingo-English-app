import { chromium, expect } from '@playwright/test';

console.log('--- STARTING PHASE 1 PLAY & LEARN UI VERIFICATION ---');

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  reducedMotion: 'reduce',
});

const errors = [];
page.on('pageerror', e => errors.push(e.message));

// Step 1: Load application and navigate to Play & Learn
await page.goto('http://localhost:3000');
await expect(page.getByRole('button', { name: 'Play & learn', exact: true })).toBeVisible();
await page.getByRole('button', { name: 'Play & learn', exact: true }).click();
console.log('PASS 1: Navigation to Play & Learn page succeeded');

// Step 2: Verify Setup Page layout, headings, and distinguishable sections
await expect(page.getByRole('heading', { name: 'Got an invite?' })).toBeVisible();
await expect(page.getByRole('heading', { name: 'Make it your game.' })).toBeVisible();
await expect(page.getByText('01 / 03')).toBeVisible();
await expect(page.getByText('02 / 03')).toBeVisible();
await expect(page.getByText('03 / 03')).toBeVisible();
console.log('PASS 2: Distinguishable Create and Join game areas rendered');

// Step 3: Verify all configuration options (difficulty, topic, duration)
for (const diff of ['Beginner', 'Intermediate', 'Advanced']) {
  await expect(page.getByRole('button', { name: new RegExp(diff) })).toBeVisible();
}
for (const topic of ['Mixed English', 'Grammar', 'Vocabulary', 'Food & drinks', 'Conversation']) {
  await expect(page.getByRole('button', { name: new RegExp(topic) })).toBeVisible();
}
for (const duration of ['1 min', '3 min', '5 min', '10 min']) {
  await expect(page.getByRole('button', { name: duration, exact: true })).toBeVisible();
}
console.log('PASS 3: All difficulty, topic, and duration options exist with underlying values');

// Step 4: Verify Join Game code input validation feedback
const joinInput = page.getByLabel('Game code');
const joinBtn = page.getByRole('button', { name: 'Join game', exact: true });

// Initially disabled
await expect(joinBtn).toBeDisabled();
await expect(page.getByText('0 / 6')).toBeVisible();

// Partial code input
await joinInput.fill('abc12');
await expect(joinInput).toHaveValue('ABC12');
await expect(page.getByText('5 / 6')).toBeVisible();
await expect(joinBtn).toBeDisabled();

// Complete code input
await joinInput.fill('abc123');
await expect(joinInput).toHaveValue('ABC123');
await expect(page.getByText('Ready')).toBeVisible();
await expect(joinBtn).toBeEnabled();

// Clear input
await joinInput.fill('');
await expect(joinBtn).toBeDisabled();
console.log('PASS 4: Code input uppercase auto-formatting, length badge, and validation feedback verified');

// Step 5: Configure and create a room
await page.getByRole('button', { name: /Intermediate/ }).click();
await page.getByRole('button', { name: /Grammar/ }).click();
await page.getByRole('button', { name: '5 min', exact: true }).click();
await page.getByRole('button', { name: 'Create a game', exact: true }).click();

// Step 6: Verify Waiting Room UI
await expect(page.locator('.room-code')).toBeVisible();
const roomCode = (await page.locator('.room-code>span').textContent()).trim();
expect(roomCode.length).toBe(6);

await expect(page.getByText('YOUR GAME ROOM')).toBeVisible();
await expect(page.getByRole('heading', { name: 'Invite your people.' })).toBeVisible();
await expect(page.getByRole('button', { name: 'Copy room code' })).toBeVisible();
await expect(page.getByRole('button', { name: 'Share room invite' })).toBeVisible();
await expect(page.getByText(/(?:1 \/ (?:8|100) players in your room)/i)).toBeVisible();
await expect(page.getByRole('button', { name: 'Start solo or with friends' })).toBeVisible();

// Verify settings bar
await expect(page.getByText('Intermediate')).toBeVisible();
await expect(page.getByText('Grammar')).toBeVisible();
await expect(page.getByText('5 min limit')).toBeVisible();

// Verify sidebar roster
await expect(page.locator('.room-leaderboard')).toBeVisible();
await expect(page.getByText('Host', { exact: true })).toBeVisible();
console.log('PASS 5: Waiting room UI renders room code, copy/share actions, roster, settings, and host controls');

// Step 7: Test the Countdown Lobby UI presentation preview
const previewBtn = page.getByRole('button', { name: 'Preview Countdown Lobby (UI Mode)' });
await expect(previewBtn).toBeVisible();
await previewBtn.click();

await expect(page.getByText('GETTING READY · GAME STARTING')).toBeVisible();
await expect(page.getByRole('heading', { name: 'Starting in' })).toBeVisible();
await expect(page.locator('.countdown-number')).toBeVisible();
await expect(page.getByText(`Room Code: ${roomCode}`)).toBeVisible();
await expect(page.getByText('1 players joined')).toBeVisible();
await expect(page.locator('.countdown-ring-container')).toHaveAttribute('aria-live', 'polite');

// Return from preview back to waiting room
await page.getByRole('button', { name: 'Return to Waiting Lobby' }).click();
await expect(page.getByText('YOUR GAME ROOM')).toBeVisible();
console.log('PASS 6: Countdown lobby presentation state renders countdown ring, roster, and accessible live region');

// Step 8: Responsive layouts check at Desktop, Tablet, and Mobile widths
const viewports = [
  { name: 'Desktop', width: 1440, height: 900 },
  { name: 'Tablet', width: 768, height: 1024 },
  { name: 'Mobile', width: 375, height: 812 },
];

for (const vp of viewports) {
  await page.setViewportSize({ width: vp.width, height: vp.height });
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(hasOverflow).toBe(false);
  console.log(`PASS 7 [${vp.name}]: No horizontal overflow detected (${vp.width}px)`);
}

// Leave game
await page.getByRole('button', { name: /Exit Game|Leave room/i }).click();
await expect(page.getByRole('heading', { name: 'Make it your game.' })).toBeVisible();

expect(errors).toEqual([]);
console.log('PASS 8: Zero browser errors logged throughout full interaction');

await browser.close();
console.log('--- ALL PHASE 1 MULTIPLAYER UI VERIFICATIONS PASSED ---');

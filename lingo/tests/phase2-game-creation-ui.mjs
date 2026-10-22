import { chromium, expect } from '@playwright/test';

console.log('--- STARTING PHASE 2 GAME-CREATION UI & ONBOARDING VERIFICATION ---');

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  reducedMotion: 'reduce',
});

const errors = [];
page.on('pageerror', e => errors.push(e.message));

// Step 1: Load application and navigate to Play & Learn
await page.goto('http://localhost:3000');
const navBtn = page.getByRole('button', { name: 'Play & learn', exact: true });
await expect(navBtn).toBeVisible();
await navBtn.click();
console.log('PASS 1: Navigation to Play & Learn page succeeded');

// Step 2: Verify Setup Page layout and headings
await expect(page.getByRole('heading', { name: 'Got an invite?' })).toBeVisible();
await expect(page.getByRole('heading', { name: 'Make it your game.' })).toBeVisible();
await expect(page.getByText('Step 1 of 5')).toBeVisible();
await expect(page.getByText('Step 2 of 5')).toBeVisible();
await expect(page.getByText('Step 3 of 5')).toBeVisible();
await expect(page.getByText('Step 4 of 5')).toBeVisible();
await expect(page.getByText('Step 5 of 5')).toBeVisible();
console.log('PASS 2: Setup Page renders all 5 numbered onboarding steps');

// Step 3: Verify Game Mode Selection (Solo vs Friends)
const soloModeBtn = page.getByRole('radio', { name: /Solo/ });
const friendsModeBtn = page.getByRole('radio', { name: /Friends/ });
await expect(soloModeBtn).toBeVisible();
await expect(friendsModeBtn).toBeVisible();

// By default, Friends mode is selected
await expect(friendsModeBtn).toHaveAttribute('aria-checked', 'true');
await expect(page.getByText('Host Participation')).toBeVisible();
await expect(page.getByRole('radio', { name: /Play with everyone/ })).toBeVisible();
await expect(page.getByRole('radio', { name: /Spectate/ })).toBeVisible();
console.log('PASS 3: Default Friends mode renders Host Participation controls');

// Switch to Solo mode: Host Participation MUST BE HIDDEN
await soloModeBtn.click();
await expect(soloModeBtn).toHaveAttribute('aria-checked', 'true');
await expect(friendsModeBtn).toHaveAttribute('aria-checked', 'false');
await expect(page.getByText('Host Participation')).not.toBeVisible();
await expect(page.getByRole('radio', { name: /Play with everyone/ })).not.toBeVisible();
await expect(page.getByRole('radio', { name: /Spectate/ })).not.toBeVisible();
console.log('PASS 4: Switching to Solo mode cleanly hides Host Participation preference');

// Switch back to Friends mode: Host Participation RE-APPEARS
await friendsModeBtn.click();
await expect(friendsModeBtn).toHaveAttribute('aria-checked', 'true');
await expect(page.getByText('Host Participation')).toBeVisible();
await expect(page.getByRole('radio', { name: /Play with everyone/ })).toBeVisible();
await expect(page.getByRole('radio', { name: /Spectate/ })).toBeVisible();

// Switch Host Role to Spectate
const spectateBtn = page.getByRole('radio', { name: /Spectate/ });
await spectateBtn.click();
await expect(spectateBtn).toHaveAttribute('aria-checked', 'true');
await expect(page.getByText('Spectating Host')).toBeVisible();

// Switch Host Role back to Play with everyone
const playerBtn = page.getByRole('radio', { name: /Play with everyone/ });
await playerBtn.click();
await expect(playerBtn).toHaveAttribute('aria-checked', 'true');
await expect(page.getByText('Playing Host')).toBeVisible();
console.log('PASS 5: Host Participation preference toggles between Player and Spectator with summary update');

// Step 4: Verify CEFR Levels (Pre-A1 through C2)
const cefrLevels = ['Pre-A1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
for (const level of cefrLevels) {
  const card = page.locator(`[data-cefr="${level}"]`);
  await expect(card).toBeVisible();
}
// Select C1
await page.locator('[data-cefr="C1"]').click();
await expect(page.locator('[data-cefr="C1"]')).toHaveAttribute('aria-checked', 'true');
await expect(page.getByText('C1 Advanced')).toBeVisible();
console.log('PASS 6: All 7 CEFR proficiency levels (Pre-A1 to C2) exist and are selectable');

// Step 5: Verify Suggested Topics
const suggestedTopics = [
  'Mixed English',
  'Grammar',
  'Vocabulary',
  'Daily conversation',
  'Business English',
  'Travel English',
  'Interview preparation',
];
for (const topic of suggestedTopics) {
  const topicBtn = page.getByRole('radio', { name: new RegExp(topic) });
  await expect(topicBtn).toBeVisible();
}
// Select Business English
await page.getByRole('radio', { name: /Business English/ }).click();
await expect(page.getByRole('radio', { name: /Business English/ })).toHaveAttribute('aria-checked', 'true');
await expect(page.getByText('📖 Business English')).toBeVisible();
console.log('PASS 7: All suggested topics rendered, selectable, and reflected in summary');

// Step 6: Verify Custom Topic Validation
const customTopicTab = page.getByRole('tab', { name: 'Custom Topic' });
await customTopicTab.click();
await expect(page.getByLabel('Enter your custom topic')).toBeVisible();

const customInput = page.getByLabel('Enter your custom topic');
const createBtn = page.getByRole('button', { name: 'Create a game' });

// Initially empty custom topic -> should trigger error when blurred
await customInput.fill('');
await customInput.blur();
await expect(page.locator('#custom-topic-error')).toBeVisible();
await expect(createBtn).toBeDisabled();

// Whitespace only -> invalid
await customInput.fill('   ');
await customInput.blur();
await expect(page.locator('#custom-topic-error')).toBeVisible();
await expect(createBtn).toBeDisabled();

// 1 character -> invalid (min 2)
await customInput.fill('X');
await customInput.blur();
await expect(page.locator('#custom-topic-error')).toBeVisible();
await expect(createBtn).toBeDisabled();

// Valid custom topic
await customInput.fill('Biotechnology & Genomics');
await expect(page.locator('#custom-topic-error')).not.toBeVisible();
await expect(page.getByText('📖 Biotechnology & Genomics')).toBeVisible();
await expect(createBtn).toBeEnabled();
console.log('PASS 8: Custom topic validation (empty, whitespace, length bounds, live error) verified');

// Step 7: Verify Duration Options and Custom Duration Validation
for (const dur of [1, 3, 5, 10, 15, 20, 'custom']) {
  await expect(page.locator(`[data-duration="${dur}"]`)).toBeVisible();
}

// Select Custom Duration
const customDurBtn = page.locator('[data-duration="custom"]');
await customDurBtn.click();
const durInput = page.getByLabel('Specify duration (minutes):');
await expect(durInput).toBeVisible();

// Test invalid duration (> 60)
await durInput.fill('75');
await durInput.blur();
await expect(page.getByText('Duration must be between 1 and 60 minutes.')).toBeVisible();
await expect(createBtn).toBeDisabled();

// Test invalid duration (0)
await durInput.fill('0');
await durInput.blur();
await expect(page.getByText('Duration must be between 1 and 60 minutes.')).toBeVisible();
await expect(createBtn).toBeDisabled();

// Test valid custom duration
await durInput.fill('25');
await durInput.blur();
await expect(page.getByText('Duration must be between 1 and 60 minutes.')).not.toBeVisible();
await expect(page.getByText('25 min')).toBeVisible();
await expect(createBtn).toBeEnabled();
console.log('PASS 9: Duration options (1, 3, 5, 10, 15, 20, Custom) and 1–60 min validation verified');

// Step 8: Verify Question Count Options and Custom Question Count Validation
for (const q of [5, 10, 15, 20, 30, 'custom']) {
  await expect(page.locator(`[data-questions="${q}"]`)).toBeVisible();
}
const customQBtn = page.locator('[data-questions="custom"]');
await customQBtn.click();
const qInput = page.getByLabel('Specify question count:');
await expect(qInput).toBeVisible();

// Test invalid question count (< 3)
await qInput.fill('1');
await qInput.blur();
await expect(page.getByText('Question count must be between 3 and 50.')).toBeVisible();
await expect(createBtn).toBeDisabled();

// Test invalid question count (> 50)
await qInput.fill('55');
await qInput.blur();
await expect(page.getByText('Question count must be between 3 and 50.')).toBeVisible();
await expect(createBtn).toBeDisabled();

// Test valid custom question count
await qInput.fill('18');
await qInput.blur();
await expect(page.getByText('Question count must be between 3 and 50.')).not.toBeVisible();
await expect(page.getByText('18 Qs')).toBeVisible();
await expect(createBtn).toBeEnabled();
console.log('PASS 10: Question count options (5, 10, 15, 20, 30, Custom) and 3–50 validation verified');

// Step 9: Verify Join Game code input still functions correctly
const joinInput = page.getByLabel('Game code');
const joinBtn = page.getByRole('button', { name: 'Join game', exact: true });
await expect(joinBtn).toBeDisabled();
await joinInput.fill('abc123');
await expect(joinInput).toHaveValue('ABC123');
await expect(page.getByText('Ready')).toBeVisible();
await expect(joinBtn).toBeEnabled();
await joinInput.fill('');
await expect(joinBtn).toBeDisabled();
console.log('PASS 11: Join Game input uppercase formatting and readiness feedback preserved');

// Step 10: Create Game Regression Check (Safe mapping ensures existing backend succeeds)
// Switch back to a standard preset topic for game creation test
await page.getByRole('tab', { name: 'Suggested Topics' }).click();
await page.getByRole('radio', { name: /Grammar/ }).click();
await page.locator('[data-duration="5"]').click();
await page.locator('[data-questions="10"]').click();

await page.getByRole('button', { name: 'Create a game' }).click();

// Verify game room is entered
await expect(page.locator('.room-code')).toBeVisible();
const roomCode = (await page.locator('.room-code>span').textContent()).trim();
expect(roomCode.length).toBe(6);
await expect(page.getByText('YOUR GAME ROOM')).toBeVisible();
await expect(page.getByText(/(?:1 \/ (?:8|100) players in your room)/i)).toBeVisible();

// Verify room settings bar shows the mapped difficulty, topic, and duration safely
await expect(page.getByText('Grammar')).toBeVisible();
await expect(page.getByText('5 min limit')).toBeVisible();
console.log('PASS 12: Creating game with redesigned UI creates room and enters Waiting Lobby smoothly');

// Leave room back to setup page
await page.getByRole('button', { name: /Exit Game|Leave room/i }).click();
await expect(page.getByRole('heading', { name: 'Make it your game.' })).toBeVisible();

// Step 11: Responsive layout check across Desktop, Tablet, and Mobile viewports
const viewports = [
  { name: 'Desktop (1440x900)', width: 1440, height: 900 },
  { name: 'Tablet (768x1024)', width: 768, height: 1024 },
  { name: 'Mobile (375x812)', width: 375, height: 812 },
];

for (const vp of viewports) {
  await page.setViewportSize({ width: vp.width, height: vp.height });
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(hasOverflow).toBe(false);
  console.log(`PASS 13 [${vp.name}]: No horizontal scroll overflow`);
}

// Step 12: Verify Zero Browser Console Errors
expect(errors).toEqual([]);
console.log('PASS 14: Zero browser runtime errors logged');

await browser.close();
console.log('--- ALL PHASE 2 GAME-CREATION UI VERIFICATIONS PASSED SUCCESSFULLY! ---');

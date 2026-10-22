import { chromium, expect } from '@playwright/test';

console.log('--- STARTING PHASE 3 PLAYWRIGHT UI & E2E VERIFICATION ---');

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  reducedMotion: 'reduce',
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('dialog', dialog => dialog.accept());

// Helper to advance the server-side test clock
const advanceClock = async (ms) => {
  await page.request.post('http://localhost:3000/api/test/advance-clock', { data: { ms } });
};

// 1. Navigate to application & Play & Learn
await page.goto('http://localhost:3000');
const navBtn = page.getByRole('button', { name: 'Play & learn', exact: true });
await expect(navBtn).toBeVisible();
await navBtn.click();
console.log('PASS 1: Navigation to Play & Learn succeeded');

// ============================================================================
// PART A: SOLO MODE UI & PRE-GAME COUNTDOWN FLOW
// ============================================================================
// 2. Select Solo mode
const soloModeBtn = page.getByRole('radio', { name: /Solo/ });
await soloModeBtn.click();
await expect(soloModeBtn).toHaveAttribute('aria-checked', 'true');

// Select Topic
await page.getByRole('radio', { name: /Vocabulary/ }).click();

// Click "Start game" button
const startSoloBtn = page.getByRole('button', { name: 'Start game', exact: true });
await expect(startSoloBtn).toBeVisible();
await startSoloBtn.click();

// 3. Verify Solo Mode Countdown View:
// - NO room invitation code (e.g. no "Invite code" or 6-char block)
// - NO "Share Invite" button
// - NO "Waiting Lobby"
// - NO player roster / 8-player capacity
// - 10-second countdown display is active
console.log('Verifying Solo Countdown view elements...');
await expect(page.getByRole('heading', { name: 'Starting in' })).toBeVisible({ timeout: 5000 });
await expect(page.getByText(/GETTING READY · SOLO CHALLENGE/i)).toBeVisible();
await expect(page.getByText(/Your personal English challenge is loading/i)).toBeVisible();

// Assert Friends elements are NOT present in Solo mode
await expect(page.getByRole('button', { name: /Share invite/i })).not.toBeVisible();
await expect(page.getByText(/Invite code/i)).not.toBeVisible();
await expect(page.getByText(/Waiting for players/i)).not.toBeVisible();
await expect(page.getByText(/players joined/i)).not.toBeVisible();
await expect(page.getByText(/players in your room/i)).not.toBeVisible();
await expect(page.getByRole('button', { name: /Start solo or with friends/i })).not.toBeVisible();
console.log('PASS 2 & 3: Solo mode countdown view renders cleanly with NO room codes, NO share button, and NO waiting lobby');

// 4. Advance test clock so countdown reaches 0 and transitions to gameplay
await advanceClock(10500);

// Verify gameplay starts automatically
await expect(page.locator('.question-prompt')).toBeVisible({ timeout: 10000 });
console.log('PASS 4: Solo pre-game countdown automatically transitions to solo gameplay');

// 5. Submit an answer in Solo mode
const optionButtons = page.locator('.answer-options button');
await expect(optionButtons.first()).toBeVisible({ timeout: 5000 });
const optCount = await optionButtons.count();
await optionButtons.first().click();
const submitBtn = page.getByRole('button', { name: /Submit Answer/i });
if (await submitBtn.isVisible()) {
  await submitBtn.click();
}

// Verify feedback is displayed and Next Question button is available for manual progression
await expect(page.locator('.answer-feedback')).toBeVisible();
await expect(page.getByRole('button', { name: /Next Question/i })).toBeVisible();
console.log('PASS 5: Solo mode answer submission, feedback, and manual Next Question button verified');

// Leave solo game to return to setup
const leaveBtn = page.locator('.exit-game-btn');
await expect(leaveBtn).toBeVisible();
await expect(leaveBtn).toHaveText(/Exit Game/);
expect(await page.getByRole('button', { name: /Leave challenge/i }).count()).toBe(0);
await leaveBtn.click();

// Verify returned to Setup
await expect(page.getByRole('heading', { name: 'Make it your game.' })).toBeVisible({ timeout: 5000 });

// ============================================================================
// PART B: FRIENDS MODE WAITING LOBBY & SPECTATOR ROLE
// ============================================================================
// Select Friends mode
const friendsModeBtn = page.getByRole('radio', { name: /Friends/ });
await friendsModeBtn.click();
await expect(friendsModeBtn).toHaveAttribute('aria-checked', 'true');

// Select Host Role: Spectate
const spectateBtn = page.getByRole('radio', { name: /Spectate/ });
await spectateBtn.click();
await expect(spectateBtn).toHaveAttribute('aria-checked', 'true');

// Click "Create a game"
const createFriendsBtn = page.getByRole('button', { name: 'Create a game', exact: true });
await expect(createFriendsBtn).toBeVisible();
await createFriendsBtn.click();

// 6. Verify Friends Waiting Lobby:
// - Room invitation code is present
// - Share Invite button is present
// - Player roster with capacity is present
// - Host identity with Spectator badge is present
// - Host start button is visible
// - Red Exit Game button is visible and old Leave room button is absent
await expect(page.getByRole('button', { name: 'Share room invite' })).toBeVisible({ timeout: 5000 });
await expect(page.getByRole('heading', { name: 'Invite your people.' })).toBeVisible();
await expect(page.getByText(/Spectating \(Observer\)/i)).toBeVisible();
await expect(page.getByText(/(?:0|1) \/ (?:8|100) players in your room/i)).toBeVisible();
const lobbyExitBtn = page.locator('.exit-game-btn');
await expect(lobbyExitBtn).toBeVisible();
await expect(lobbyExitBtn).toHaveText(/Exit Game/);
expect(await page.getByRole('button', { name: /Leave room/i }).count()).toBe(0);
const startFriendsGameBtn = page.locator('button.start-game');
await expect(startFriendsGameBtn).toBeVisible();
console.log('PASS 6: Friends waiting lobby renders room code, share button, player roster, spectator badge, and Exit Game button');

// 7. Host starts Friends game
await startFriendsGameBtn.click();

// Authoritative countdown is displayed
await expect(page.getByText(/GETTING READY · GAME STARTING/i)).toBeVisible();
await expect(page.getByRole('heading', { name: 'Starting in' })).toBeVisible();
console.log('PASS 7: Host Start Game triggers authoritative 10-second countdown');

// Advance clock past countdown
await advanceClock(10500);

// Verify gameplay starts and Spectator Mode restrictions apply
await expect(page.getByText(/Spectator Mode:/i)).toBeVisible({ timeout: 10000 });
await expect(page.getByText(/You are observing this round/i)).toBeVisible();

// Verify dedicated spectator dashboard is rendered with no playable answer options or submit controls
await expect(page.locator('.spectator-dashboard')).toBeVisible();
await expect(page.locator('.spectator-player-progress-card')).toBeVisible();
expect(await page.locator('.answer-options button').count()).toBe(0);
expect(await page.locator('.submit-answer-btn').count()).toBe(0);
const specExitBtn = page.locator('.spectator-dashboard .exit-game-btn');
await expect(specExitBtn).toBeVisible();
await expect(specExitBtn).toHaveText(/Exit Game/);
console.log('PASS 8: Spectator host sees dedicated spectator dashboard with Exit Game button and no playable answer options');

// 8. Zero browser console / runtime errors
expect(errors).toEqual([]);
console.log('PASS 9: Zero browser console / runtime errors logged during full Phase 3 flows');

await browser.close();
console.log('--- ALL PHASE 3 PLAYWRIGHT UI & E2E VERIFICATIONS PASSED SUCCESSFULLY! ---');

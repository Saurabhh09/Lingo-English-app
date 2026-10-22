import { chromium, expect } from '@playwright/test';

console.log('--- STARTING PLAYWRIGHT FRIENDS INDEPENDENT PROGRESSION UI TESTS ---');

const browser = await chromium.launch({ headless: true });

// Create two browser contexts for Player A and Player B
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
  await pageA.request.post('http://localhost:3000/api/test/advance-clock', { data: { ms } });
};

// Reset clock
await pageA.request.post('http://localhost:3000/api/test/reset-clock', { data: {} });

// Navigate both to app
await pageA.goto('http://localhost:3000');
await pageB.goto('http://localhost:3000');

// Click Play & learn on both
await pageA.getByRole('button', { name: 'Play & learn', exact: true }).click();
await pageB.getByRole('button', { name: 'Play & learn', exact: true }).click();

// Player A creates a Friends game
await pageA.getByRole('radio', { name: /Friends/ }).click();
await pageA.getByRole('radio', { name: /Play with everyone/i }).click();
const createFriendsBtn = pageA.getByRole('button', { name: 'Create a game', exact: true });
await createFriendsBtn.click();

// Wait for lobby on Page A
await expect(pageA.getByRole('heading', { name: 'Invite your people.' })).toBeVisible({ timeout: 5000 });

// Extract room code from Page A lobby
const codeElement = pageA.locator('.invite-code-display strong, .room-code strong, span:has-text("Code:")');
let roomCode = '';
const codeText = await pageA.locator('body').innerText();
const match = codeText.match(/([A-Z0-9]{6})/);
if (match) {
  roomCode = match[1];
} else {
  // Try finding in copy input or similar
  const codeVal = await pageA.locator('input[readonly]').inputValue();
  roomCode = codeVal;
}
console.log('Detected room code:', roomCode);

// Player B joins the Friends game using roomCode
// On Page B, click "Join a room" or enter code
const joinInput = pageB.locator('input[placeholder*="room" i], input[placeholder*="code" i], input[placeholder*="ABCDEF" i]');
if (await joinInput.isVisible()) {
  await joinInput.fill(roomCode);
  const joinBtn = pageB.getByRole('button', { name: /Join/i });
  await joinBtn.click();
} else {
  // Look for join tab or section
  const joinTab = pageB.getByRole('button', { name: /Join room/i, exact: false });
  if (await joinTab.isVisible()) {
    await joinTab.click();
  }
  const input = pageB.locator('input[type="text"]');
  await input.fill(roomCode);
  await pageB.getByRole('button', { name: /Join/i }).click();
}

// Verify both are in lobby
await expect(pageB.getByRole('heading', { name: /You’re in|Invite your people/i })).toBeVisible({ timeout: 5000 });
console.log('PASS 1: Both Player A and Player B joined lobby');

// Player A (Host) starts the game
const startBtn = pageA.locator('button.start-game');
await expect(startBtn).toBeVisible();
await startBtn.click();

// Countdown starts
await expect(pageA.getByRole('heading', { name: 'Starting in' })).toBeVisible({ timeout: 5000 });
await expect(pageB.getByRole('heading', { name: 'Starting in' })).toBeVisible({ timeout: 5000 });

// Advance clock past countdown
await advanceClock(10500);

// Both players transition to active gameplay
await expect(pageA.locator('.question-prompt')).toBeVisible({ timeout: 10000 });
await expect(pageB.locator('.question-prompt')).toBeVisible({ timeout: 10000 });
console.log('PASS 2: Both players transitioned to active gameplay');

// UI Check: Per-question round countdown timer must NOT be visible
await expect(pageA.locator('.round-timer, .per-question-timer')).not.toBeVisible();
await expect(pageB.locator('.round-timer, .per-question-timer')).not.toBeVisible();
// Overall timer must be visible
await expect(pageA.locator('.quiz-timer')).toBeVisible();
await expect(pageB.locator('.quiz-timer')).toBeVisible();
console.log('PASS 3: Per-question round timer is absent; overall timer is present');

// Player A submits an answer
const optA = pageA.locator('.answer-options button');
await expect(optA.first()).toBeVisible();
await optA.first().click();
const submitA = pageA.getByRole('button', { name: /Submit Answer/i });
if (await submitA.isVisible()) {
  await submitA.click();
}

// Player A sees feedback, score, question number, and Next Question button
await expect(pageA.locator('.answer-feedback')).toBeVisible({ timeout: 5000 });
const nextBtnA = pageA.getByRole('button', { name: /Next Question/i });
await expect(nextBtnA).toBeVisible();

// Verify Player A does NOT see "Waiting for host to start next question"
await expect(pageA.getByText(/Waiting for host to start next question/i)).not.toBeVisible();
await expect(pageA.getByText(/Waiting for other players/i)).not.toBeVisible();
console.log('PASS 4: Player A sees feedback and Next Question button without waiting message');

// Player B is still on Question 1, with options enabled and unanswered
await expect(pageB.locator('.answer-options button').first()).toBeEnabled();
await expect(pageB.locator('.answer-feedback')).not.toBeVisible();
console.log('PASS 5: Player B remains on Question 1, unaffected by Player A submission');

// Player A clicks Next Question
await nextBtnA.click();

// Player A advances to Question 2!
// Wait for answer feedback to disappear on Page A (indicating new question)
await expect(pageA.locator('.answer-feedback')).not.toBeVisible({ timeout: 5000 });
console.log('PASS 6: Player A independently advanced to Question 2');

// Verify Player B is STILL on Question 1!
await expect(pageB.locator('.answer-options button').first()).toBeEnabled();
await expect(pageB.locator('.answer-feedback')).not.toBeVisible();
console.log('PASS 7: Player B remains on Question 1 after Player A advanced');

// Player B now submits Question 1
const optB = pageB.locator('.answer-options button');
await optB.first().click();
const submitB = pageB.getByRole('button', { name: /Submit Answer/i });
if (await submitB.isVisible()) {
  await submitB.click();
}

// Player B sees feedback and their OWN Next Question button
await expect(pageB.locator('.answer-feedback')).toBeVisible({ timeout: 5000 });
const nextBtnB = pageB.getByRole('button', { name: /Next Question/i });
await expect(nextBtnB).toBeVisible();
await expect(pageB.getByText(/Waiting for host/i)).not.toBeVisible();

// Player B clicks Next Question to advance to Question 2
await nextBtnB.click();
await expect(pageB.locator('.answer-feedback')).not.toBeVisible({ timeout: 5000 });
console.log('PASS 8: Player B independently advanced to Question 2');

// Verify zero page errors
expect(errorsA).toEqual([]);
expect(errorsB).toEqual([]);

await browser.close();
console.log('--- ALL PLAYWRIGHT FRIENDS INDEPENDENT PROGRESSION UI TESTS PASSED! ---');

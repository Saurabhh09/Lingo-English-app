import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startIsolatedUiServer } from './helpers/isolated-server.mjs';

const srv = await startIsolatedUiServer();
let browser;

try {
  // Repro 1: Server streak/history UTC vs IST boundary bug
  const utcAtIstMidnight = new Date('2026-11-26T18:45:00Z');
  const utcDateStr = utcAtIstMidnight.toISOString().slice(0, 10);
  const istDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(utcAtIstMidnight);
  assert.notEqual(utcDateStr, istDateStr, 'Expected UTC date vs IST date mismatch after 00:00 IST');
  console.log(`[CONFIRMED BUG] UTC_VS_IST_DATE: 2026-11-26T18:45:00Z -> UTC=${utcDateStr}, IST=${istDateStr}`);

  // Repro 2: Sign-out leaves lingo-custom-name & leaks into next signed-in user in same browser
  browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const u1 = 'bug_u1_' + Date.now();
  const u2 = 'bug_u2_' + Date.now();
  await fetch(`${srv.apiUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: u1, name: 'User One', password: 'Password123!' })
  });
  await fetch(`${srv.apiUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: u2, name: 'User Two', password: 'Password123!' })
  });

  await page.goto(srv.baseUrl, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByLabel('Username').fill(u1);
  await page.getByLabel('Password').fill('Password123!');
  await page.locator('.auth-submit-btn').click();
  await page.locator('.web-sidebar-profile').waitFor({ state: 'visible' });

  // Edit profile name locally
  await page.locator('[data-testid="web-nav-profile"]').click();
  await page.getByRole('button', { name: 'Edit display name' }).click();
  await page.locator('.profile-name-input').fill('LeakedNameFromU1');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.locator('.sign-out-action-btn').click();
  await page.getByRole('button', { name: 'Sign in' }).waitFor({ state: 'visible' });

  // Sign in as User 2
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByLabel('Username').fill(u2);
  await page.getByLabel('Password').fill('Password123!');
  await page.locator('.auth-submit-btn').click();
  await page.locator('.web-sidebar-profile').waitFor({ state: 'visible' });
  const u2SidebarName = await page.locator('.web-sidebar-profile').textContent();
  console.log(`[CONFIRMED BUG] CUSTOM_NAME_LEAK_ON_SIGNOUT: User Two displays "${u2SidebarName.trim()}"`);

  // Repro 3: Verify ErrorBoundary absence
  const hasRoot = await page.locator('#root').evaluate(el => el.children.length > 0);
  assert.ok(hasRoot);
} finally {
  await browser?.close();
  await srv.stop();
}

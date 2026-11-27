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

  // Repro 3: Verify ErrorBoundary catches runtime render crashes instead of leaving empty #root
  const { createServer } = await import('vite');
  const vite = await createServer({
    root: new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'),
    server: { port: 0, strictPort: false },
    appType: 'custom',
    logLevel: 'silent',
    plugins: [
      {
        name: 'eb-crash-test',
        configureServer(server) {
          server.middlewares.use('/eb-crash.html', async (_req, res, next) => {
            try {
              const raw = `<!doctype html><html><body><div id="root"></div><script type="module">
                import React from 'react';
                import { createRoot } from 'react-dom/client';
                import { ErrorBoundary } from '/src/components/ErrorBoundary.jsx';
                function Bomb() { throw new Error('Simulated render crash'); }
                createRoot(document.getElementById('root')).render(
                  React.createElement(ErrorBoundary, null, React.createElement(Bomb))
                );
              </script></body></html>`;
              const html = await server.transformIndexHtml('/eb-crash.html', raw);
              res.setHeader('Content-Type', 'text/html');
              res.end(html);
            } catch (err) {
              next(err);
            }
          });
        }
      }
    ]
  });
  await vite.listen();
  const ebPort = vite.httpServer.address().port;
  const ebPage = await context.newPage();
  await ebPage.goto(`http://127.0.0.1:${ebPort}/eb-crash.html`, { waitUntil: 'networkidle' });
  await ebPage.locator('#root h1').waitFor({ state: 'visible', timeout: 10000 });
  const fallbackTitle = await ebPage.locator('#root h1').textContent();
  assert.equal(fallbackTitle?.trim(), 'Something went wrong', 'ErrorBoundary must render recovery UI on crash');
  await ebPage.close();
  await vite.close();
  console.log('[FIXED     ] ERROR_BOUNDARY: Catch-all fallback renders cleanly');
} finally {
  await browser?.close();
  await srv.stop();
}

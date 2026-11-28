import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { startIsolatedUiServer } from './helpers/isolated-server.mjs';

const TABS = ['nav-home', 'nav-learn', 'nav-practice', 'nav-games', 'nav-profile'];

const srv = await startIsolatedUiServer({ useViteDev: true });
const browser = await chromium.launch({ headless: true });

try {
  const signupRes = await fetch(`${srv.apiUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'nscroll_' + Date.now().toString().slice(-8),
      name: 'Scroll Tester',
      password: 'PasswordScroll123!'
    })
  });
  assert.equal(signupRes.status, 200, 'Signup for native-scroll test must return 200');
  const { token } = await signupRes.json();
  assert.ok(token, 'Auth token must be returned on signup');

  const context = await browser.newContext({
    viewport: { width: 412, height: 915 },
    isMobile: true,
    hasTouch: true
  });
  await context.addInitScript(t => {
    window.localStorage.setItem('lingo-token', t);
  }, token);

  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);

  await page.goto(`${srv.baseUrl}/?platform=native`, { waitUntil: 'networkidle' });
  await page.locator('[data-testid="nav-home"]').waitFor({ state: 'visible', timeout: 15000 });

  const platformAttr = await page.evaluate(() => document.documentElement.getAttribute('data-platform'));
  assert.equal(platformAttr, 'native', 'Expected html[data-platform="native"]');

  for (const tab of TABS) {
    await page.locator(`[data-testid="${tab}"]`).click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(600);
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    }));
    assert.ok(
      overflow.scrollWidth <= overflow.clientWidth,
      `[${tab}] Horizontal overflow detected: scrollWidth=${overflow.scrollWidth} > clientWidth=${overflow.clientWidth}`
    );

    // (a) mouse.wheel(0, 400)
    await page.evaluate(() => new Promise(r => {
      window.scrollTo(0, 0);
      requestAnimationFrame(() => requestAnimationFrame(r));
    }));
    await page.mouse.move(206, 450);
    await page.waitForTimeout(100);
    await page.mouse.wheel(0, 400);
    await page.waitForFunction(() => window.scrollY > 50, { timeout: 2000 }).catch(() => {});
    const wheelY = await page.evaluate(() => window.scrollY);
    assert.ok(wheelY > 50, `[${tab}] mouse.wheel(0, 400) did not scroll window: scrollY=${wheelY}`);
    console.log(`PASS wheel [${tab}]: wheelY=${wheelY}, width=${overflow.scrollWidth}/${overflow.clientWidth}`);
  }

  for (const tab of TABS) {
    await page.locator(`[data-testid="${tab}"]`).click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(600);
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));

    // (b) real touch drag via CDP Input.dispatchTouchEvent
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(100);
    let y = 700;
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: 206, y, id: 1 }]
    });
    for (let step = 0; step < 14; step++) {
      y -= 30;
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: 206, y, id: 1 }]
      });
      await page.waitForTimeout(16);
    }
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: []
    });
    await page.waitForTimeout(600);
    const touchY = await page.evaluate(() => window.scrollY);
    assert.ok(touchY > 50, `[${tab}] CDP touch drag did not scroll window: scrollY=${touchY}`);

    console.log(`PASS touch [${tab}]: touchY=${touchY}`);
  }

  console.log('ALL NATIVE SCROLL REGRESSION CHECKS PASSED!');
} finally {
  await browser.close().catch(() => { });
  await srv.stop();
}

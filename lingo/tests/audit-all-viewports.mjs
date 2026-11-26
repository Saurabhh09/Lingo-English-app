import { chromium } from '@playwright/test';
import { startIsolatedUiServer } from './helpers/isolated-server.mjs';

const VIEWPORTS = [
  { name: 'Small Mobile 320px', width: 320, height: 640 },
  { name: 'Small Mobile 360px', width: 360, height: 800 },
  { name: 'Mobile iPhone 375px', width: 375, height: 812 },
  { name: 'Mobile iPhone 390px', width: 390, height: 844 },
  { name: 'Mobile Large 430px', width: 430, height: 932 },
  { name: 'Tablet 768px', width: 768, height: 1024 },
  { name: 'Tablet iPad Air 820px', width: 820, height: 1180 },
  { name: 'Tablet Landscape 1024px', width: 1024, height: 768 },
  { name: 'Laptop 1366px', width: 1366, height: 768 },
  { name: 'Desktop 1440px', width: 1440, height: 900 },
  { name: 'Wide Desktop 1920px', width: 1920, height: 1080 }
];

async function runAudit() {
  const srv = await startIsolatedUiServer();
  const browser = await chromium.launch({ headless: true });
  const issues = [];

  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage();

    page.on('pageerror', err => {
      issues.push({ type: 'CONSOLE_PAGE_ERROR', message: err.message });
    });

    async function checkOverflow(pageName, vp) {
      const data = await page.evaluate(() => {
        const docScrollWidth = document.documentElement.scrollWidth;
        const innerW = window.innerWidth;
        return {
          docScrollWidth,
          innerW,
          hasDocOverflow: docScrollWidth > innerW,
        };
      });

      if (data.hasDocOverflow) {
        issues.push({
          page: pageName,
          viewport: vp.name,
          width: vp.width,
          docScrollWidth: data.docScrollWidth,
          innerW: data.innerW,
        });
        console.log(`FAIL [${pageName}] at ${vp.name} (${vp.width}px): docScroll=${data.docScrollWidth}, innerW=${data.innerW}`);
      } else {
        console.log(`PASS [${pageName}] at ${vp.name} (${vp.width}px)`);
      }
    }

    await page.goto(srv.baseUrl);
    await page.getByRole('button', { name: 'Email' }).click();
    await page.getByLabel('What should we call you?').fill('AuditUser');
    await page.getByLabel('Your unique username').fill('audit_' + Date.now());
    await page.getByLabel('Create a password').fill('TestPass123!');
    await page.getByRole('button', { name: 'Let’s start my story' }).click();
    await page.locator('.topbar').waitFor({ state: 'visible', timeout: 10000 });

    const navKeys = [
      ['Dashboard', 'home'],
      ['Learn', 'learn'],
      ['Friends', 'friends'],
      ['Practice', 'practice'],
      ['Play', 'games'],
      ['Profile', 'profile'],
    ];

    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(150);

      for (const [label, key] of navKeys) {
        const sel = vp.width >= 1024 ? `[data-testid="web-nav-${key}"]` : `[data-testid="nav-${key}"]`;
        await page.locator(sel).click();
        await page.waitForTimeout(150);
        await checkOverflow(label, vp);
      }

      const streakPill = page.locator('.streak-pill');
      if (await streakPill.isVisible()) {
        await streakPill.click();
        await page.locator('.modal').waitFor({ state: 'visible' });
        await checkOverflow('Progress Modal', vp);
        await page.locator('.modal-close').first().click();
        await page.locator('.modal').waitFor({ state: 'hidden' });
      }
    }

    console.log(`\nTotal overflow/error issues: ${issues.length}`);
    if (issues.length > 0) {
      console.error(JSON.stringify(issues, null, 2));
      process.exitCode = 1;
    }
  } finally {
    await browser.close().catch(() => { });
    await srv.stop();
  }
}

runAudit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});

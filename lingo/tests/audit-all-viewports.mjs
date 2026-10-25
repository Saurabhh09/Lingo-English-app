import { chromium } from '@playwright/test';

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
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  
  const issues = [];

  page.on('pageerror', err => {
    issues.push({ type: 'CONSOLE_PAGE_ERROR', message: err.message });
  });

  // Helper to check overflow
  async function checkOverflow(pageName, vp) {
    const data = await page.evaluate((vpWidth) => {
      const docScrollWidth = document.documentElement.scrollWidth;
      const bodyScrollWidth = document.body.scrollWidth;
      const innerW = window.innerWidth;
      
      function isClippedByParent(node) {
        let parent = node.parentElement;
        while (parent && parent !== document.body && parent !== document.documentElement) {
          const cs = window.getComputedStyle(parent);
          if (['hidden', 'auto', 'scroll'].includes(cs.overflowX)) {
            const pRect = parent.getBoundingClientRect();
            if (pRect.right <= innerW + 2) {
              return true;
            }
          }
          parent = parent.parentElement;
        }
        return false;
      }

      const overflowingElements = [];
      const allEls = document.querySelectorAll('*');
      for (const el of allEls) {
        // Skip hidden or svg defs
        if (el.tagName.toLowerCase() === 'svg' || el.tagName.toLowerCase() === 'path' || el.tagName.toLowerCase() === 'defs') continue;
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          // Check if right edge exceeds viewport by more than 1.5px
          if (rect.right > innerW + 1.5) {
            if (!isClippedByParent(el)) {
              overflowingElements.push({
                tag: el.tagName,
                className: (typeof el.className === 'string') ? el.className : '',
                id: el.id,
                rect: { left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width) },
                text: (el.textContent || '').trim().slice(0, 30)
              });
            }
          }
        }
      }

      return {
        docScrollWidth,
        bodyScrollWidth,
        innerW,
        hasDocOverflow: docScrollWidth > innerW,
        hasBodyOverflow: bodyScrollWidth > innerW,
        overflowingElements: overflowingElements.slice(0, 5) // top 5
      };
    }, vp.width);

    if (data.hasDocOverflow || data.hasBodyOverflow || data.overflowingElements.length > 0) {
      issues.push({
        page: pageName,
        viewport: vp.name,
        width: vp.width,
        docScrollWidth: data.docScrollWidth,
        bodyScrollWidth: data.bodyScrollWidth,
        elements: data.overflowingElements
      });
      console.log(`❌ OVERFLOW on [${pageName}] at ${vp.name} (${vp.width}px): docScroll=${data.docScrollWidth}, innerW=${data.innerW}`);
      if (data.overflowingElements.length > 0) {
        console.log('   Offending elements:', JSON.stringify(data.overflowingElements, null, 2));
      }
    } else {
      console.log(`✅ PASS: [${pageName}] at ${vp.name} (${vp.width}px)`);
    }
  }

  // Initial load
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(1000);

  // Sign up a user first so all pages have full content
  const getStartedBtn = page.getByRole('button', { name: 'Get started' });
  if (await getStartedBtn.isVisible()) {
    await getStartedBtn.click();
    await page.getByLabel('What should we call you?').fill('AuditUser');
    await page.getByLabel('Your unique username').fill('audit_' + Date.now());
    await page.getByLabel('Create a password').fill('TestPass123!');
    await page.getByRole('button', { name: 'Let’s start my story' }).click();
    await page.waitForTimeout(1000);
  }

  const pagesToTest = [
    { name: 'Dashboard', navBtn: 'Home', headingText: 'Dashboard.' },
    { name: 'Let’s learn', navBtn: 'Let’s learn', mobileNavBtn: 'Learn', headingText: 'Let’s learn.' },
    { name: 'Practice', navBtn: 'Practice', mobileNavBtn: 'Practice', headingText: 'Practice Hub' },
    { name: 'Play & learn', navBtn: 'Play & learn', mobileNavBtn: 'Games', headingText: 'Play & learn.' }
  ];

  for (const vp of VIEWPORTS) {
    console.log(`\n--- TESTING VIEWPORT: ${vp.name} (${vp.width}x${vp.height}) ---`);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(300);

    for (const p of pagesToTest) {
      // Navigate to page
      if (vp.width <= 768) {
        const mBtn = page.locator('.mobile-nav').getByRole('button', { name: new RegExp(p.mobileNavBtn || p.navBtn, 'i') });
        if (await mBtn.isVisible()) {
          await mBtn.click();
        } else {
          // fallback
          const b = page.getByRole('button', { name: new RegExp(p.navBtn, 'i') }).first();
          if (await b.isVisible()) await b.click();
        }
      } else {
        const b = page.locator('.sidebar').getByRole('button', { name: new RegExp(p.navBtn, 'i') });
        if (await b.isVisible()) {
          await b.click();
        } else {
          const fallback = page.getByRole('button', { name: new RegExp(p.navBtn, 'i') }).first();
          if (await fallback.isVisible()) await fallback.click();
        }
      }

      await page.waitForTimeout(400);
      await checkOverflow(p.name, vp);
    }

    // Also test Modals on this viewport:
    // 1. Profile modal
    if (vp.width <= 768) {
      const pNav = page.locator('.mobile-nav').getByRole('button', { name: /Profile/i });
      if (await pNav.isVisible()) await pNav.click();
    } else {
      const pHeader = page.locator('.header-profile');
      if (await pHeader.isVisible()) await pHeader.click();
    }
    await page.waitForTimeout(300);
    const profileModal = page.locator('.profile-modal-view');
    if (await profileModal.isVisible()) {
      await checkOverflow('Profile Modal', vp);

      // Verify the new Hub entries in Profile:
      const wordLibHub = page.locator('.profile-hub-card.word-lib');
      const progHub = page.locator('.profile-hub-card.my-prog');
      if (!(await wordLibHub.isVisible()) || !(await progHub.isVisible())) {
        console.error('❌ Missing Learning Hub cards in Profile modal!');
      }

      const closeBtn = page.locator('.modal-close');
      if (await closeBtn.isVisible()) await closeBtn.click();
      await page.waitForTimeout(200);
    }

    // 2. Progress / Milestones Modal ("Look at you go")
    const streakPill = page.locator('.streak-pill');
    if (await streakPill.isVisible()) {
      await streakPill.click();
      await page.waitForTimeout(300);
      await checkOverflow('Progress & Milestones Modal', vp);
      const closeBtn = page.locator('.modal-close');
      if (await closeBtn.isVisible()) await closeBtn.click();
      await page.waitForTimeout(200);
    }

    // 3. Word Library modal
    const wordLibBtn = page.getByRole('button', { name: /Word library/i });
    if (await wordLibBtn.isVisible()) {
      await wordLibBtn.click();
      await page.waitForTimeout(300);
      await checkOverflow('Word Library Modal', vp);
      const closeBtn = page.locator('.modal-close');
      if (await closeBtn.isVisible()) await closeBtn.click();
      await page.waitForTimeout(200);
    }
  }

  await browser.close();

  console.log('\n================ AUDIT SUMMARY ================');
  console.log(`Total overflow/alignment issues found: ${issues.length}`);
  if (issues.length > 0) {
    console.log(JSON.stringify(issues, null, 2));
  }
}

runAudit().catch(err => {
  console.error('Audit failed to run:', err);
  process.exit(1);
});

import { test, expect } from '@playwright/test';
import { startIsolatedUiServer } from './helpers/isolated-server.mjs';

let srv;

test.beforeAll(async () => {
  srv = await startIsolatedUiServer();
});

test.afterAll(async () => {
  if (srv) await srv.stop();
});

const VIEWPORTS = [
  { name: 'mobile-360', width: 360, height: 800, isDesktop: false },
  { name: 'mobile-412', width: 412, height: 915, isDesktop: false },
  { name: 'tablet-768', width: 768, height: 1024, isDesktop: false },
  { name: 'desktop-1024', width: 1024, height: 768, isDesktop: true },
  { name: 'wide-1440', width: 1440, height: 900, isDesktop: true },
  { name: 'ultrawide-1920', width: 1920, height: 1080, isDesktop: true },
];

async function navTo(page, key, isDesktop) {
  if (key === 'reminders') {
    const profileSel = isDesktop ? '[data-testid="web-nav-profile"]' : '[data-testid="nav-profile"]';
    await page.locator(profileSel).click();
    await page.locator('.profile-hub-card.reminders-hub').click();
    return;
  }
  const selector = isDesktop ? `[data-testid="web-nav-${key}"]` : `[data-testid="nav-${key}"]`;
  await page.locator(selector).click();
}

async function assertCleanViewportMetrics(page, label, isDesktop) {
  const metrics = await page.evaluate(() => {
    const innerW = window.innerWidth;
    const innerH = window.innerHeight;
    const docScrollW = document.documentElement.scrollWidth;
    const bell = document.querySelector('.topbar-bell-btn')?.getBoundingClientRect() || null;
    const profile = document.querySelector('.header-profile')?.getBoundingClientRect() || null;
    const mobileNav = document.querySelector('.mobile-nav');
    const sidebar = document.querySelector('.web-sidebar');
    const mobileNavVisible = mobileNav ? window.getComputedStyle(mobileNav).display !== 'none' : false;
    const sidebarVisible = sidebar ? window.getComputedStyle(sidebar).display !== 'none' : false;
    return {
      platform: document.documentElement.dataset.platform,
      docScrollW,
      innerW,
      innerH,
      bell: bell ? { left: bell.left, right: bell.right, top: bell.top, bottom: bell.bottom, w: bell.width } : null,
      profile: profile ? { left: profile.left, right: profile.right, top: profile.top, bottom: profile.bottom, w: profile.width } : null,
      mobileNavVisible,
      sidebarVisible,
    };
  });

  expect(metrics.platform, `${label} data-platform`).toBe('web');
  expect(metrics.docScrollW, `${label} horizontal overflow`).toBeLessThanOrEqual(metrics.innerW);
  if (metrics.bell) {
    expect(metrics.bell.right, `${label} bell clipped right`).toBeLessThanOrEqual(metrics.innerW + 1);
    expect(metrics.bell.left, `${label} bell negative left`).toBeGreaterThanOrEqual(0);
  }
  if (metrics.profile) {
    expect(metrics.profile.right, `${label} avatar clipped right`).toBeLessThanOrEqual(metrics.innerW + 1);
    expect(metrics.profile.left, `${label} avatar negative left`).toBeGreaterThanOrEqual(0);
  }
  if (isDesktop) {
    expect(metrics.sidebarVisible, `${label} WebSidebar should be visible on desktop`).toBe(true);
    expect(metrics.mobileNavVisible, `${label} .mobile-nav should be hidden on desktop`).toBe(false);
  } else {
    expect(metrics.mobileNavVisible, `${label} .mobile-nav should be visible on mobile/tablet`).toBe(true);
    expect(metrics.sidebarVisible, `${label} WebSidebar should be hidden below 1024px`).toBe(false);
  }
}

for (const vp of VIEWPORTS) {
  test(`Responsive Web Matrix @ ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', err => pageErrors.push(err.message));

    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(srv.baseUrl);

    // Relaxed user zoom & custom webapp favicon on web
    const vpMeta = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(vpMeta).not.toContain('user-scalable=no');
    expect(vpMeta).not.toContain('maximum-scale=1.0');
    const faviconHref = await page.locator('link[rel="icon"]').getAttribute('href');
    expect(faviconHref).toBe('/web-favicon.jpg');

    // Demo login
    const getStarted = page.getByRole('button', { name: 'Get started' });
    await expect(getStarted).toBeVisible();
    await getStarted.click();

    await expect(page.locator('.topbar')).toBeVisible();
    await expect(page.locator('.download-apk-pill')).toHaveCount(0);
    await expect(page.locator('.install-apk-banner')).toHaveCount(0);
    await expect(page.locator('[data-testid="web-nav-reminders"]')).toHaveCount(0);
    await expect(page.locator('.web-sidebar-promo')).toHaveCount(0);

    // Home
    await assertCleanViewportMetrics(page, `${vp.name}/home`, vp.isDesktop);
    await expect(page).toHaveTitle(/Lingo/);

    // Learn + Lesson focus mode + keyboard shortcuts (1-4 & Enter)
    await navTo(page, 'learn', vp.isDesktop);
    await expect(page.locator('.learn-redesign-journey')).toBeVisible();
    await assertCleanViewportMetrics(page, `${vp.name}/learn`, vp.isDesktop);

    // Friends
    await navTo(page, 'friends', vp.isDesktop);
    await expect(page.locator('.social-page-wrap')).toBeVisible();
    await assertCleanViewportMetrics(page, `${vp.name}/friends`, vp.isDesktop);

    // Practice + Container Query verification
    await navTo(page, 'practice', vp.isDesktop);
    await expect(page.locator('.practice-nav-tabs')).toBeVisible();
    await assertCleanViewportMetrics(page, `${vp.name}/practice`, vp.isDesktop);
    const practiceMainWidth = await page.locator('.practice-panel').first().evaluate(el => el.getBoundingClientRect().width);
    expect(practiceMainWidth, `${vp.name} practice panel must never be crushed`).toBeGreaterThanOrEqual(280);
    if (vp.isDesktop) {
      const cols = await page.locator('.practice-grid').first().evaluate(el => window.getComputedStyle(el).gridTemplateColumns.split(' ').length);
      expect(cols, `${vp.name} .practice-grid should be 2 columns`).toBe(2);
    }

    // Games
    await navTo(page, 'games', vp.isDesktop);
    await expect(page.locator('.games-page')).toBeVisible();
    await assertCleanViewportMetrics(page, `${vp.name}/games`, vp.isDesktop);

    // Profile + verify swipe left on Profile wraps to Home (never Reminders)
    await navTo(page, 'profile', vp.isDesktop);
    await expect(page.locator('.profile-page-view')).toBeVisible();
    await assertCleanViewportMetrics(page, `${vp.name}/profile`, vp.isDesktop);
    if (!vp.isDesktop) {
      await page.evaluate(() => {
        const m = document.querySelector('main');
        const a = new Event('touchstart', { bubbles: true });
        a.touches = [{ clientX: 300, clientY: 200 }];
        m.dispatchEvent(a);
        const b = new Event('touchend', { bubbles: true });
        b.changedTouches = [{ clientX: 100, clientY: 205 }];
        m.dispatchEvent(b);
      });
      await expect(page.locator('.dashboard-grid')).toBeVisible();
    }

    // Reminders
    await navTo(page, 'reminders', vp.isDesktop);
    await expect(page.locator('.reminders-page-view')).toBeVisible();
    await assertCleanViewportMetrics(page, `${vp.name}/reminders`, vp.isDesktop);

    // Lesson focus mode check on desktop
    if (vp.isDesktop) {
      await navTo(page, 'learn', vp.isDesktop);
      await page.locator('.unit-details-card').first().click();
      await page.locator('.lesson-3d-circle-btn.current').first().click();
      await expect(page.locator('.app-shell.web-focus-mode')).toBeVisible();
      await expect(page.locator('.web-sidebar')).toBeHidden();
      await page.locator('.start-practice-action-btn').click();
      await page.keyboard.press('2');
      const selectedCount = await page.locator('.answer-options button.selected, .choice-grid-2x2 button.selected').count();
      expect(selectedCount).toBe(1);
    }

    expect(pageErrors).toEqual([]);
  });
}

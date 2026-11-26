import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const lingoDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(lingoDir, '..');
const baselineDir = path.join(repoRoot, 'audit', 'baseline-native');

const updateBaseline = process.argv.includes('--update-baseline');
const headed = process.argv.includes('--headed');

const VIEWPORTS = [
  { name: '360x800', width: 360, height: 800, deviceScaleFactor: 2 },
  { name: '412x915', width: 412, height: 915, deviceScaleFactor: 2.6 },
];

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(err => (err ? reject(err) : resolve(port)));
    });
  });
}

async function waitForHttp(url, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch { }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function killProcessTree(proc) {
  if (!proc) return Promise.resolve();
  try {
    proc.stdout?.destroy();
    proc.stderr?.destroy();
    proc.unref();
  } catch { }
  if (proc.killed || proc.exitCode !== null) return Promise.resolve();
  return new Promise(resolve => {
    const timer = setTimeout(() => {
      try {
        proc.kill('SIGKILL');
      } catch { }
      resolve();
    }, 2000);
    proc.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
    try {
      if (process.platform === 'win32' && proc.pid) {
        const killer = spawn('taskkill', ['/pid', String(proc.pid), '/T', '/F'], {
          stdio: 'ignore',
          windowsHide: true,
        });
        killer.once('exit', () => {
          clearTimeout(timer);
          resolve();
        });
      } else {
        proc.kill('SIGTERM');
      }
    } catch {
      clearTimeout(timer);
      resolve();
    }
  });
}

// --- Zero-dependency PNG RGBA decoder for exact 0-tolerance comparison ---
function paethPredictor(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function decodePng(filePath) {
  const buf = fs.readFileSync(filePath);
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (buf.length < 8 || !buf.subarray(0, 8).equals(sig)) {
    throw new Error(`Invalid PNG signature: ${filePath}`);
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idatChunks = [];

  while (offset < buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (type === 'IHDR') {
      width = buf.readUInt32BE(dataStart);
      height = buf.readUInt32BE(dataStart + 4);
      bitDepth = buf[dataStart + 8];
      colorType = buf[dataStart + 9];
    } else if (type === 'IDAT') {
      idatChunks.push(buf.subarray(dataStart, dataEnd));
    } else if (type === 'IEND') {
      break;
    }
    offset = dataEnd + 4;
  }

  assert.equal(bitDepth, 8, `Unsupported PNG bitDepth ${bitDepth} in ${filePath}`);
  assert.ok(colorType === 2 || colorType === 6, `Unsupported PNG colorType ${colorType} in ${filePath}`);

  const bpp = colorType === 6 ? 4 : 3;
  const stride = width * bpp;
  const raw = zlib.inflateSync(Buffer.concat(idatChunks));
  const rgba = Buffer.alloc(width * height * 4);
  const prevRow = Buffer.alloc(stride);
  const currRow = Buffer.alloc(stride);

  for (let y = 0; y < height; y++) {
    const rowStart = y * (stride + 1);
    const filter = raw[rowStart];
    for (let i = 0; i < stride; i++) {
      const xByte = raw[rowStart + 1 + i];
      const left = i >= bpp ? currRow[i - bpp] : 0;
      const up = prevRow[i];
      const upLeft = i >= bpp ? prevRow[i - bpp] : 0;
      let val = xByte;
      if (filter === 1) val = (xByte + left) & 0xff;
      else if (filter === 2) val = (xByte + up) & 0xff;
      else if (filter === 3) val = (xByte + ((left + up) >> 1)) & 0xff;
      else if (filter === 4) val = (xByte + paethPredictor(left, up, upLeft)) & 0xff;
      else if (filter !== 0) throw new Error(`Unknown PNG filter ${filter}`);
      currRow[i] = val;
    }

    for (let x = 0; x < width; x++) {
      const srcIdx = x * bpp;
      const dstIdx = (y * width + x) * 4;
      rgba[dstIdx] = currRow[srcIdx];
      rgba[dstIdx + 1] = currRow[srcIdx + 1];
      rgba[dstIdx + 2] = currRow[srcIdx + 2];
      rgba[dstIdx + 3] = bpp === 4 ? currRow[srcIdx + 3] : 255;
    }
    currRow.copy(prevRow);
  }

  return { width, height, rgba };
}

function comparePngExact(baselinePath, actualPath) {
  const a = decodePng(baselinePath);
  const b = decodePng(actualPath);
  if (a.width !== b.width || a.height !== b.height) {
    return {
      match: false,
      reason: `Dimension mismatch: expected ${a.width}x${a.height}, got ${b.width}x${b.height}`,
      diffPixels: a.width * a.height,
    };
  }
  if (a.rgba.equals(b.rgba)) {
    return { match: true, diffPixels: 0, totalPixels: a.width * a.height };
  }
  let diffPixels = 0;
  let firstDiff = null;
  let minX = a.width, minY = a.height, maxX = -1, maxY = -1;
  const totalPixels = a.width * a.height;
  for (let i = 0; i < totalPixels; i++) {
    const p = i * 4;
    if (
      a.rgba[p] !== b.rgba[p] ||
      a.rgba[p + 1] !== b.rgba[p + 1] ||
      a.rgba[p + 2] !== b.rgba[p + 2] ||
      a.rgba[p + 3] !== b.rgba[p + 3]
    ) {
      diffPixels++;
      const x = i % a.width;
      const y = Math.floor(i / a.width);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (!firstDiff) {
        firstDiff = {
          x,
          y,
          exp: [a.rgba[p], a.rgba[p + 1], a.rgba[p + 2], a.rgba[p + 3]],
          act: [b.rgba[p], b.rgba[p + 1], b.rgba[p + 2], b.rgba[p + 3]],
        };
      }
    }
  }
  return {
    match: false,
    reason: `Pixel mismatch: ${diffPixels}/${totalPixels} pixels differ (first at x=${firstDiff.x}, y=${firstDiff.y} exp=[${firstDiff.exp}] act=[${firstDiff.act}]; bbox=[${minX},${minY}]..[${maxX},${maxY}])`,
    diffPixels,
  };
}

async function stabilizeAndMask(page) {
  await page.evaluate(() => {
    if (!document.getElementById('native-reg-stabilize')) {
      const style = document.createElement('style');
      style.id = 'native-reg-stabilize';
      style.textContent = `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
          scroll-behavior: auto !important;
          caret-color: transparent !important;
        }
      `;
      document.head.appendChild(style);
    }

    // Deterministically order dynamically shuffled option buttons for pixel-stable baselines
    for (const container of document.querySelectorAll('.answer-options, .choice-grid-2x2')) {
      const buttons = Array.from(container.children);
      if (buttons.length <= 1) continue;
      const getLabel = btn => {
        if (container.classList.contains('choice-grid-2x2')) {
          return (btn.querySelector('.choice-card-label')?.textContent || btn.textContent || '').trim();
        }
        const clone = btn.cloneNode(true);
        const letter = clone.querySelector('span:first-child');
        if (letter) letter.remove();
        return (clone.textContent || '').trim();
      };
      buttons.sort((a, b) => getLabel(a).localeCompare(getLabel(b)));
      buttons.forEach((btn, idx) => {
        if (!container.classList.contains('choice-grid-2x2')) {
          const letter = btn.querySelector('span:first-child');
          if (letter) letter.textContent = String.fromCharCode(65 + idx);
        }
        container.appendChild(btn);
      });
    }

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let node;
    while ((node = walker.nextNode())) nodes.push(node);
    for (const t of nodes) {
      const v = t.nodeValue;
      if (!v) continue;
      let next = v
        .replace(/@demo_[a-z0-9_]+/gi, '@demo_baseline')
        .replace(/\bdemo_[a-z0-9_]+\b/gi, 'demo_baseline')
        .replace(/\bLNG-[A-Z0-9]{4,}\b/g, 'LNG-000000')
        .replace(/Earned\s+(?:today|\d{1,2}\s+\w+\s+\d{4}|\w+\s+\d{1,2},\s+\d{4})/gi, 'Earned Today');
      if (next !== v) t.nodeValue = next;
    }
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }
  });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
}

async function clickNavTab(page, label) {
  const btn = page.locator('.mobile-nav .mobile-nav-btn', { hasText: label });
  await btn.waitFor({ state: 'visible', timeout: 10000 });
  await btn.click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(250);
}

async function captureViewport(browser, vitePort, vp, outputDir) {
  const vpOutDir = path.join(outputDir, vp.name);
  fs.mkdirSync(vpOutDir, { recursive: true });

  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.deviceScaleFactor,
    isMobile: true,
    hasTouch: true,
    reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', err => pageErrors.push(err.message));
  page.on('dialog', d => d.accept());

  const shot = async name => {
    await stabilizeAndMask(page);
    const outPath = path.join(vpOutDir, `${name}.png`);
    await page.screenshot({ path: outPath, animations: 'disabled', caret: 'hide' });
    return outPath;
  };

  try {
    await page.goto(`http://127.0.0.1:${vitePort}/?platform=native`, { waitUntil: 'networkidle' });
    await stabilizeAndMask(page);
    const platformAttr = await page.evaluate(() => document.documentElement.dataset.platform);
    assert.equal(platformAttr, 'native', `Expected data-platform="native", got "${platformAttr}"`);

    const getStartedBtn = page.getByRole('button', { name: 'Get started' });
    await getStartedBtn.waitFor({ state: 'visible', timeout: 15000 });
    await getStartedBtn.click();

    await page.locator('.mobile-nav').waitFor({ state: 'visible', timeout: 15000 });
    await page.locator('.streak-pill').waitFor({ state: 'visible', timeout: 15000 });
    const initialToastDismiss = page.locator('.toast button[aria-label="Dismiss notification"]');
    if (await initialToastDismiss.isVisible().catch(() => false)) {
      await initialToastDismiss.click();
      await page.locator('.toast').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => { });
    }
    await page.evaluate(() => window.scrollTo(0, 0));

    // 1. Home
    await shot('01-home');

    // 2. Learn (initial) + expanded unit
    await clickNavTab(page, 'Learn');
    await page.locator('.learn-redesign-journey').waitFor({ state: 'visible', timeout: 10000 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await shot('02-learn');

    const firstUnitCard = page.locator('.unit-details-card').first();
    await firstUnitCard.click();
    await page.locator('.unit-winding-lessons-path').first().waitFor({ state: 'visible', timeout: 10000 });
    await page.evaluate(() => {
      const row = document.querySelector('.unit-node-row');
      if (row) {
        const y = Math.max(0, row.getBoundingClientRect().top + window.scrollY - 16);
        window.scrollTo(0, y);
      } else {
        window.scrollTo(0, 0);
      }
    });
    await shot('02b-learn-unit-opened');

    // 3. Lesson preview modal (click a locked lesson node)
    const lockedLesson = page.locator('.lesson-3d-circle-btn.locked').first();
    await lockedLesson.click();
    await page.locator('.lesson-preview-modal').waitFor({ state: 'visible', timeout: 10000 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await shot('03-lesson-preview');
    await page.locator('.lesson-preview-modal').getByRole('button', { name: 'Back to learning path' }).click();
    await page.locator('.lesson-preview-modal').waitFor({ state: 'hidden', timeout: 5000 });

    // 4. Lesson in progress (practice stage)
    const currentLesson = page.locator('.lesson-3d-circle-btn.current').first();
    await currentLesson.click();
    await page.locator('.lesson-page-screen').waitFor({ state: 'visible', timeout: 10000 });
    const startPracticeBtn = page.locator('.start-practice-action-btn');
    await startPracticeBtn.waitFor({ state: 'visible', timeout: 10000 });
    await startPracticeBtn.click();
    await page.locator('.lesson-top-bar').waitFor({ state: 'visible', timeout: 10000 });
    await page.evaluate(() => {
      window.scrollTo(0, 0);
      document.querySelectorAll('.lesson-page-screen, .lesson-page-card, main').forEach(el => {
        el.scrollTop = 0;
        el.scrollLeft = 0;
      });
    });
    await shot('04-lesson-in-progress');
    await page.keyboard.press('Escape');
    const leaveLessonBtn = page.locator('.confirm-leave-overlay').getByRole('button', { name: 'Leave lesson' });
    await leaveLessonBtn.waitFor({ state: 'visible', timeout: 5000 });
    await leaveLessonBtn.click();
    await page.locator('.mobile-nav').waitFor({ state: 'visible', timeout: 10000 });

    // 5. Friends
    await clickNavTab(page, 'Friends');
    await page.locator('.social-hub-container, .friends-page, main').first().waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(200);
    await shot('05-friends');

    // 6-9. Practice tabs (listening, speaking, pronunciation, ai)
    await clickNavTab(page, 'Practice');
    await page.locator('.practice-nav-tabs').waitFor({ state: 'visible', timeout: 15000 });
    await shot('06-practice-listening');

    const tabs = [
      ['Speaking Studio', '07-practice-speaking'],
      ['Pronunciation', '08-practice-pronunciation'],
      ['AI Tutor', '09-practice-ai'],
    ];
    for (const [tabLabel, shotName] of tabs) {
      await page.locator('.practice-tab-btn', { hasText: tabLabel }).click();
      await page.waitForTimeout(150);
      await shot(shotName);
    }

    // 10. Play (Games Setup)
    await clickNavTab(page, 'Play');
    await page.waitForTimeout(200);
    await shot('10-games');

    // 11. Profile
    await clickNavTab(page, 'Profile');
    await page.locator('.profile-hub-card.reminders-hub').waitFor({ state: 'visible', timeout: 10000 });
    await shot('11-profile');

    // 12. Reminders
    await page.locator('.profile-hub-card.reminders-hub').click();
    await page.waitForTimeout(200);
    await shot('12-reminders');

    // 13. Generic modal (Progress modal via streak-pill on Home)
    await clickNavTab(page, 'Home');
    await page.locator('.streak-pill').click();
    await page.locator('.modal').waitFor({ state: 'visible', timeout: 10000 });
    await shot('13-modal-progress');
    await page.keyboard.press('Escape');
    await page.locator('.modal').waitFor({ state: 'hidden', timeout: 5000 });

    // 14. Toast (Save this word on Home)
    const saveWordBtn = page.getByRole('button', { name: /Save this word/i }).first();
    await saveWordBtn.scrollIntoViewIfNeeded();
    await saveWordBtn.click();
    await page.locator('.toast').waitFor({ state: 'visible', timeout: 10000 });
    await shot('14-toast');

    assert.deepEqual(pageErrors, [], `Unexpected page errors on ${vp.name}: ${pageErrors.join('; ')}`);
  } finally {
    await ctx.close();
  }
}

async function main() {
  const apiPort = await getFreePort();
  const vitePort = await getFreePort();
  const tempDataPath = path.join(os.tmpdir(), `lingo-native-reg-${Date.now()}.json`);
  const runOutputDir = updateBaseline
    ? baselineDir
    : path.join(os.tmpdir(), `lingo-native-verify-${Date.now()}`);

  if (updateBaseline) {
    fs.rmSync(baselineDir, { recursive: true, force: true });
    fs.mkdirSync(baselineDir, { recursive: true });
  } else {
    assert.ok(fs.existsSync(baselineDir), `Missing baseline directory: ${baselineDir}. Run with --update-baseline first.`);
    fs.mkdirSync(runOutputDir, { recursive: true });
  }

  let serverLogs = '';
  const apiProc = spawn('node', ['server.mjs'], {
    cwd: lingoDir,
    env: {
      ...process.env,
      PORT: String(apiPort),
      ISOLATED_TEST: '1',
      NODE_ENV: 'test',
      DATA_PATH: tempDataPath,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  apiProc.stdout.on('data', d => { serverLogs += d.toString(); });
  apiProc.stderr.on('data', d => { serverLogs += d.toString(); });

  const viteBin = path.join(lingoDir, 'node_modules', 'vite', 'bin', 'vite.js');
  const viteProc = spawn('node', [viteBin, '--host', '127.0.0.1', '--port', String(vitePort), '--strictPort'], {
    cwd: lingoDir,
    env: {
      ...process.env,
      VITE_DEV_API_PROXY: `http://127.0.0.1:${apiPort}`,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  viteProc.stdout.on('data', d => { serverLogs += d.toString(); });
  viteProc.stderr.on('data', d => { serverLogs += d.toString(); });

  let browser;
  try {
    await waitForHttp(`http://127.0.0.1:${apiPort}/api/health`);
    await waitForHttp(`http://127.0.0.1:${vitePort}/`);

    browser = await chromium.launch({ headless: !headed });
    for (const vp of VIEWPORTS) {
      console.log(`[native-regression] Capturing ${vp.name} in native UI mode...`);
      await captureViewport(browser, vitePort, vp, runOutputDir);
    }

    if (updateBaseline) {
      console.log(`[native-regression] Updated baselines at ${baselineDir}`);
      return;
    }

    let failures = 0;
    let compared = 0;
    for (const vp of VIEWPORTS) {
      const expectedVpDir = path.join(baselineDir, vp.name);
      const actualVpDir = path.join(runOutputDir, vp.name);
      const expectedFiles = fs.readdirSync(expectedVpDir).filter(f => f.endsWith('.png')).sort();
      const actualFiles = fs.readdirSync(actualVpDir).filter(f => f.endsWith('.png')).sort();
      assert.deepEqual(actualFiles, expectedFiles, `Screenshot file mismatch for ${vp.name}`);

      for (const file of expectedFiles) {
        const res = comparePngExact(path.join(expectedVpDir, file), path.join(actualVpDir, file));
        compared++;
        if (res.match) {
          console.log(`PASS ${vp.name}/${file} (0 pixel diffs / ${res.totalPixels} px)`);
        } else {
          failures++;
          console.error(`FAIL ${vp.name}/${file}: ${res.reason}`);
        }
      }
    }

    if (failures > 0) {
      throw new Error(`Native regression failed: ${failures}/${compared} screenshots differed.`);
    }
    console.log(`[native-regression] ALL ${compared} SCREENSHOTS MATCHED WITH ZERO PIXEL DIFFS.`);
  } catch (err) {
    console.error('[native-regression] Error:', err?.message || err);
    if (serverLogs) console.error('--- Server Logs ---\n' + serverLogs.slice(-2500));
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close().catch(() => { });
    await killProcessTree(viteProc);
    await killProcessTree(apiProc);
    try { fs.rmSync(tempDataPath, { force: true }); } catch { }
    if (!updateBaseline) {
      try { fs.rmSync(runOutputDir, { recursive: true, force: true }); } catch { }
    }
  }
}

main()
  .then(() => {
    process.exit(process.exitCode || 0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });

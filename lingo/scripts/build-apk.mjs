import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertProductionCapacitorConfig,
  computeFileSha256,
  findApkFilesRecursive,
  inspectApkZip
} from './apkConfigGuard.mjs';
import { stageWebApk } from './stage-web-apk.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const lingoDir = path.resolve(__dirname, '..');
const androidDir = path.join(lingoDir, 'android');
const rootDir = path.resolve(lingoDir, '..');

const capConfigPath = path.join(lingoDir, 'capacitor.config.json');
const androidAssetsDir = path.join(androidDir, 'app', 'src', 'main', 'assets');
const androidAssetsCapConfig = path.join(androidAssetsDir, 'capacitor.config.json');
const androidPublicDir = path.join(androidAssetsDir, 'public');
const distDir = path.join(lingoDir, 'dist');
const releasesDir = path.join(lingoDir, 'releases');
const manifestPath = path.join(releasesDir, 'apk-manifest.json');
const releaseApkPath = path.join(releasesDir, 'lingo.apk');
const vercelConfigPath = path.join(lingoDir, 'vercel.json');
const legacyPublicApk = path.join(lingoDir, 'public', 'lingo.apk');

function runStep(cmd, args, cwd, label) {
  console.log(`\n--- [${label}] ${cmd} ${args.join(' ')} ---`);
  const isWinBat = process.platform === 'win32' && cmd.endsWith('.bat');
  const spawnCmd = isWinBat ? 'cmd.exe' : cmd;
  const spawnArgs = isWinBat ? ['/d', '/s', '/c', cmd, ...args] : args;
  const res = spawnSync(spawnCmd, spawnArgs, {
    cwd,
    stdio: 'inherit'
  });
  if (res.status !== 0) {
    throw new Error(`[${label}] Failed with exit code ${res.status ?? 1}`);
  }
}

function updateVercelApkRewrite(vercelPath, downloadPath) {
  if (!fs.existsSync(vercelPath)) return;
  const vercelCfg = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
  const rewrites = Array.isArray(vercelCfg.rewrites) ? vercelCfg.rewrites : [];
  const existing = rewrites.find((r) => r.source === '/lingo.apk');
  if (existing) {
    existing.destination = downloadPath;
  } else {
    const spaIdx = rewrites.findIndex((r) => r.destination === '/index.html');
    const rule = { source: '/lingo.apk', destination: downloadPath };
    if (spaIdx >= 0) rewrites.splice(spaIdx, 0, rule);
    else rewrites.push(rule);
  }
  vercelCfg.rewrites = rewrites;
  fs.writeFileSync(vercelPath, JSON.stringify(vercelCfg, null, 2) + '\n', 'utf8');
}

const prevManifestText = fs.existsSync(manifestPath) ? fs.readFileSync(manifestPath, 'utf8') : null;
const prevVercelText = fs.existsSync(vercelConfigPath) ? fs.readFileSync(vercelConfigPath, 'utf8') : null;

try {
  // 1. Production safety pre-flight checks
  if (!fs.existsSync(capConfigPath)) {
    throw new Error(`Missing ${capConfigPath}`);
  }
  const prodCapConfig = JSON.parse(fs.readFileSync(capConfigPath, 'utf8'));
  assertProductionCapacitorConfig(prodCapConfig, 'lingo/capacitor.config.json');

  if (fs.existsSync(legacyPublicApk)) {
    throw new Error(
      `Found legacy ${legacyPublicApk}. Remove it so Vite/Capacitor cannot embed an outdated APK inside Android builds.`
    );
  }

  // 2. Increment versionCode & compute versionName atomically before Vite compiles the bundle
  fs.mkdirSync(releasesDir, { recursive: true });
  const prevManifest = prevManifestText ? JSON.parse(prevManifestText) : { versionCode: 1 };
  const nextVersionCode = Number(prevManifest.versionCode || 1) + 1;
  const nextVersionName = `1.0.${nextVersionCode}`;
  const downloadFilename = `lingo-v${nextVersionName}.apk`;
  const downloadPath = `/downloads/${downloadFilename}`;

  const candidateManifest = {
    versionCode: nextVersionCode,
    versionName: nextVersionName,
    downloadFilename,
    downloadPath,
    sha256: '',
    size: 0,
    builtAt: ''
  };
  fs.writeFileSync(manifestPath, JSON.stringify(candidateManifest, null, 2) + '\n', 'utf8');
  console.log(`[VERSION] Bumped Android build -> versionCode=${nextVersionCode}, versionName=${nextVersionName}`);

  // 3. Clean Vite build (produces web bundle only, zero .apk files)
  fs.rmSync(distDir, { recursive: true, force: true });
  const viteBin = path.join(lingoDir, 'node_modules', 'vite', 'bin', 'vite.js');
  runStep(process.execPath, [viteBin, 'build', '--mode', 'production'], lingoDir, 'VITE PROD BUILD');

  const apksInDist = findApkFilesRecursive(distDir);
  if (apksInDist.length > 0) {
    throw new Error(`[FEEDBACK LOOP GUARD] Unexpected APK found in dist before Capacitor sync: ${apksInDist.join(', ')}`);
  }

  // 4. Capacitor sync to Android project
  const capBin = path.join(lingoDir, 'node_modules', '@capacitor', 'cli', 'bin', 'capacitor');
  runStep(process.execPath, [capBin, 'sync', 'android'], lingoDir, 'CAPACITOR SYNC');

  // 5. Pre-Gradle safety gate on synced Android assets
  const syncedCapConfig = JSON.parse(fs.readFileSync(androidAssetsCapConfig, 'utf8'));
  assertProductionCapacitorConfig(syncedCapConfig, 'lingo/android/app/src/main/assets/capacitor.config.json');

  const apksInAndroidAssets = findApkFilesRecursive(androidAssetsDir);
  if (apksInAndroidAssets.length > 0) {
    throw new Error(`[FEEDBACK LOOP GUARD] APK found in Android assets before Gradle: ${apksInAndroidAssets.join(', ')}`);
  }

  const distIndexHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(distDir, 'index.html'))).digest('hex');
  const androidIndexHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(androidPublicDir, 'index.html'))).digest('hex');
  if (distIndexHash !== androidIndexHash) {
    throw new Error('[SYNC GUARD] Android assets/public/index.html does not match lingo/dist/index.html');
  }

  // 6. Compile Android APK via Gradle
  const gradlewCmd = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
  runStep(
    gradlewCmd,
    ['assembleDebug', `-PlingoVersionCode=${nextVersionCode}`, `-PlingoVersionName=${nextVersionName}`],
    androidDir,
    'GRADLE ASSEMBLE DEBUG'
  );

  const apkSource = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
  if (!fs.existsSync(apkSource)) {
    throw new Error(`Compiled APK missing at ${apkSource}`);
  }

  // 7. Post-APK binary inspection gate
  console.log('\n--- [POST-BUILD VERIFY] Inspecting compiled APK ---');
  const apkZip = inspectApkZip(apkSource);
  const embeddedApks = apkZip.filenames.filter((name) => name.toLowerCase().endsWith('.apk'));
  if (embeddedApks.length > 0) {
    throw new Error(`[POST-BUILD VERIFY] Compiled APK embeds nested APK(s): ${embeddedApks.join(', ')}`);
  }

  const embeddedCapText = apkZip.readEntryText('assets/capacitor.config.json');
  if (!embeddedCapText) {
    throw new Error('[POST-BUILD VERIFY] Missing assets/capacitor.config.json inside compiled APK');
  }
  assertProductionCapacitorConfig(JSON.parse(embeddedCapText), 'APK::assets/capacitor.config.json');

  const embeddedIndexBuf = apkZip.readEntryBuffer('assets/public/index.html');
  if (!embeddedIndexBuf) {
    throw new Error('[POST-BUILD VERIFY] Missing assets/public/index.html inside compiled APK');
  }
  const embeddedIndexHash = crypto.createHash('sha256').update(embeddedIndexBuf).digest('hex');
  if (embeddedIndexHash !== distIndexHash) {
    throw new Error('[POST-BUILD VERIFY] APK assets/public/index.html SHA-256 differs from Vite dist/index.html');
  }

  const outputMetaPath = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'output-metadata.json');
  const outputMeta = JSON.parse(fs.readFileSync(outputMetaPath, 'utf8'));
  const el = outputMeta?.elements?.[0];
  if (!el || Number(el.versionCode) !== nextVersionCode || String(el.versionName) !== nextVersionName) {
    throw new Error(
      `[POST-BUILD VERIFY] output-metadata.json mismatch: expected ${nextVersionCode}/${nextVersionName}, got ${el?.versionCode}/${el?.versionName}`
    );
  }

  const mergedManifestPath = path.join(
    androidDir, 'app', 'build', 'intermediates', 'merged_manifests', 'debug', 'processDebugManifest', 'AndroidManifest.xml'
  );
  if (fs.existsSync(mergedManifestPath)) {
    const mergedXml = fs.readFileSync(mergedManifestPath, 'utf8');
    if (
      !mergedXml.includes(`android:versionCode="${nextVersionCode}"`) ||
      !mergedXml.includes(`android:versionName="${nextVersionName}"`)
    ) {
      throw new Error('[POST-BUILD VERIFY] Merged AndroidManifest.xml does not match expected versionCode/versionName');
    }
  }

  // 8. Publish verified APK ONLY after every guard passes
  fs.copyFileSync(apkSource, releaseApkPath);
  const { sha256, size } = computeFileSha256(releaseApkPath);
  const finalManifest = {
    versionCode: nextVersionCode,
    versionName: nextVersionName,
    downloadFilename,
    downloadPath,
    sha256,
    size,
    builtAt: new Date().toISOString()
  };
  fs.writeFileSync(manifestPath, JSON.stringify(finalManifest, null, 2) + '\n', 'utf8');
  updateVercelApkRewrite(vercelConfigPath, downloadPath);

  stageWebApk({ lingoDir, rootDir });

  console.log('\n============================================================');
  console.log(`[APK BUILD SUCCESS] v${nextVersionName} (versionCode ${nextVersionCode})`);
  console.log(`  APK Source   : ${apkSource}`);
  console.log(`  Release Copy : ${releaseApkPath}`);
  console.log(`  Web Download : ${downloadPath} (${(size / (1024 * 1024)).toFixed(2)} MB)`);
  console.log(`  SHA-256      : ${sha256}`);
  console.log('  NOTE: Local build complete. Live Vercel website will NOT serve');
  console.log('  this build until committed & pushed (run: npm run deploy:apk).');
  console.log('============================================================');
} catch (err) {
  // Roll back manifest & vercel rewrite on any failure so version numbers stay clean
  try {
    if (prevManifestText !== null) fs.writeFileSync(manifestPath, prevManifestText, 'utf8');
    if (prevVercelText !== null) fs.writeFileSync(vercelConfigPath, prevVercelText, 'utf8');
  } catch { }
  console.error('\n❌ [APK BUILD FAILED]', err.message || err);
  process.exit(1);
}

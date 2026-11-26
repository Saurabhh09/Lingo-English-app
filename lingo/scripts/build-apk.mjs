import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const lingoDir = path.resolve(__dirname, '..');
const androidDir = path.join(lingoDir, 'android');
const rootDir = path.resolve(lingoDir, '..');

const isWin = process.platform === 'win32';
const gradlewCmd = isWin ? 'gradlew.bat' : './gradlew';

// Prevent bundling a stale copy of lingo.apk inside the Android APK assets folder
const bundledNestedApk = path.join(androidDir, 'app', 'src', 'main', 'assets', 'public', 'lingo.apk');
if (fs.existsSync(bundledNestedApk)) {
  fs.rmSync(bundledNestedApk, { force: true });
  console.log('[APK BUILD] Removed nested lingo.apk from Android public assets before packaging.');
}

console.log('--- [APK BUILD] Starting Gradle assembleDebug ---');
const gradleResult = spawnSync(gradlewCmd, ['assembleDebug'], {
  cwd: androidDir,
  stdio: 'inherit',
  shell: true
});

if (gradleResult.status !== 0) {
  console.error('[APK BUILD ERROR] Gradle build failed with code:', gradleResult.status);
  process.exit(gradleResult.status || 1);
}

const apkSource = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
if (!fs.existsSync(apkSource)) {
  console.error('[APK BUILD ERROR] Output APK not found at:', apkSource);
  process.exit(1);
}

const stat = fs.statSync(apkSource);
const sizeMb = (stat.size / (1024 * 1024)).toFixed(2);
console.log(`[APK BUILD SUCCESS] Generated APK: ${apkSource} (${sizeMb} MB)`);

// Distribute APK to webapp public and dist folders for direct download
const targets = [
  path.join(lingoDir, 'public', 'lingo.apk'),
  path.join(lingoDir, 'dist', 'lingo.apk'),
  path.join(rootDir, 'dist', 'lingo.apk')
];

for (const target of targets) {
  try {
    const parent = path.dirname(target);
    if (!fs.existsSync(parent)) fs.mkdirSync(parent, { recursive: true });
    fs.copyFileSync(apkSource, target);
    console.log(`[APK DOWNLOAD ASSET READY] -> ${target}`);
  } catch (err) {
    console.warn(`[WARN] Could not copy to ${target}:`, err.message);
  }
}

console.log('--- [APK BUILD COMPLETE] Ready for physical device testing & web download! ---');

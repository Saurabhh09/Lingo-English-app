import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeFileSha256 } from './apkConfigGuard.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultLingoDir = path.resolve(__dirname, '..');
const defaultRootDir = path.resolve(defaultLingoDir, '..');

/**
 * Copies the verified release APK from lingo/releases/lingo.apk into lingo/dist/downloads/
 * AFTER Vite builds, preventing Vite/Capacitor from bundling old APKs back into Android.
 */
export function stageWebApk({ lingoDir = defaultLingoDir, rootDir = defaultRootDir } = {}) {
  const releasesDir = path.join(lingoDir, 'releases');
  const manifestPath = path.join(releasesDir, 'apk-manifest.json');
  const releaseApkPath = path.join(releasesDir, 'lingo.apk');
  const distDir = path.join(lingoDir, 'dist');

  if (!fs.existsSync(manifestPath)) {
    throw new Error(`[STAGE APK] Missing release manifest: ${manifestPath}`);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  if (!fs.existsSync(distDir)) {
    throw new Error(`[STAGE APK] Vite dist directory not found: ${distDir}. Run vite build first.`);
  }

  // Always remove any stray legacy APK in dist root
  const legacyDistApk = path.join(distDir, 'lingo.apk');
  if (fs.existsSync(legacyDistApk)) {
    fs.rmSync(legacyDistApk, { force: true });
  }

  // Write runtime manifest to dist/apk-manifest.json
  fs.writeFileSync(path.join(distDir, 'apk-manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  if (!fs.existsSync(releaseApkPath)) {
    console.warn(`[STAGE APK] Warning: ${releaseApkPath} not found; skipped copying APK binary to dist/downloads.`);
    return { manifest, stagedApkPath: null };
  }

  const { sha256, size } = computeFileSha256(releaseApkPath);
  if (manifest.sha256 && manifest.sha256 !== sha256) {
    throw new Error(`[STAGE APK] Checksum mismatch! ${releaseApkPath} (${sha256}) != apk-manifest.json (${manifest.sha256})`);
  }

  const downloadsDir = path.join(distDir, 'downloads');
  fs.rmSync(downloadsDir, { recursive: true, force: true });
  fs.mkdirSync(downloadsDir, { recursive: true });

  const stagedApkPath = path.join(downloadsDir, manifest.downloadFilename);
  fs.copyFileSync(releaseApkPath, stagedApkPath);
  console.log(`[STAGE APK] Staged ${manifest.downloadPath} (${size} bytes, sha256:${sha256.slice(0, 12)}...)`);

  // Keep root/dist cleanly mirrored if root package.json exists
  const rootDistDir = path.join(rootDir, 'dist');
  if (rootDir !== lingoDir && fs.existsSync(path.join(rootDir, 'package.json'))) {
    fs.rmSync(rootDistDir, { recursive: true, force: true });
    fs.cpSync(distDir, rootDistDir, { recursive: true });
  }

  return { manifest, stagedApkPath };
}

const isMain = Boolean(process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));
if (isMain) {
  stageWebApk();
}

import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertProductionCapacitorConfig, computeFileSha256 } from './apkConfigGuard.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const lingoDir = path.resolve(__dirname, '..');
const rootDir = path.resolve(lingoDir, '..');
const includeAll = process.argv.includes('--include-all');
const allowBranch = process.argv.includes('--allow-branch');

function git(args, { allowFail = false } = {}) {
  const res = spawnSync('git', args, { cwd: rootDir, encoding: 'utf8' });
  if (res.status !== 0 && !allowFail) {
    throw new Error(`git ${args.join(' ')} failed: ${(res.stderr || res.stdout || '').trim()}`);
  }
  return res;
}

const RELEASE_PATHS = new Set([
  'lingo/releases/lingo.apk',
  'lingo/releases/apk-manifest.json',
  'lingo/vercel.json'
]);

console.log('=== [DEPLOY APK] Verifying Git state before production build ===');
const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: rootDir, encoding: 'utf8' }).trim();
if (branch !== 'main' && !allowBranch) {
  throw new Error(`Refusing to deploy from branch "${branch}". Switch to "main" or pass --allow-branch.`);
}

const preStatus = git(['status', '--porcelain', '-uall']).stdout
  .split(/\r?\n/)
  .map((l) => l.trimEnd())
  .filter(Boolean);

if (!includeAll && preStatus.length > 0) {
  const nonReleaseDirty = preStatus.filter((line) => {
    const file = line.slice(3).trim().replace(/^"(.*)"$/, '$1');
    return !RELEASE_PATHS.has(file);
  });
  if (nonReleaseDirty.length > 0) {
    throw new Error(
      `Uncommitted non-release changes detected:\n  ${nonReleaseDirty.join('\n  ')}\n` +
      'Commit/stash them first or re-run with --include-all so incomplete changes are never pushed accidentally.'
    );
  }
}

console.log('\n=== [DEPLOY APK] Running authoritative production APK build ===');
const buildRes = spawnSync(process.execPath, [path.join(__dirname, 'build-apk.mjs')], {
  cwd: lingoDir,
  stdio: 'inherit'
});
if (buildRes.status !== 0) {
  throw new Error('Production APK build failed. Aborting deployment.');
}

// Re-verify built release integrity before staging/pushing
const capConfig = JSON.parse(fs.readFileSync(path.join(lingoDir, 'capacitor.config.json'), 'utf8'));
assertProductionCapacitorConfig(capConfig, 'lingo/capacitor.config.json');

const manifestPath = path.join(lingoDir, 'releases', 'apk-manifest.json');
const releaseApkPath = path.join(lingoDir, 'releases', 'lingo.apk');
const vercelPath = path.join(lingoDir, 'vercel.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const vercelCfg = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));

if (!fs.existsSync(releaseApkPath)) {
  throw new Error(`Missing built release APK at ${releaseApkPath}`);
}
const { sha256 } = computeFileSha256(releaseApkPath);
if (sha256 !== manifest.sha256) {
  throw new Error(`Release APK SHA-256 mismatch (${sha256} !== ${manifest.sha256})`);
}
const apkRewrite = (vercelCfg.rewrites || []).find((r) => r.source === '/lingo.apk');
if (!apkRewrite || apkRewrite.destination !== manifest.downloadPath) {
  throw new Error(`lingo/vercel.json /lingo.apk rewrite does not point to ${manifest.downloadPath}`);
}

console.log('\n=== [DEPLOY APK] Staging release artifacts & committing ===');
if (includeAll) {
  git(['add', '-A']);
} else {
  git(['add', 'lingo/releases/lingo.apk', 'lingo/releases/apk-manifest.json', 'lingo/vercel.json']);
}

const stagedDiff = git(['diff', '--cached', '--name-only']).stdout.trim();
if (!stagedDiff) {
  console.log('Nothing new to commit.');
} else {
  git(['commit', '-m', `Release Android APK v${manifest.versionName} (build ${manifest.versionCode})`]);
}

console.log(`\n=== [DEPLOY APK] Pushing ${branch} to origin ===`);
const pushRes = spawnSync('git', ['push', 'origin', branch], { cwd: rootDir, stdio: 'inherit' });
if (pushRes.status !== 0) {
  console.error('\n⚠️  Local commit created, but git push to origin failed.');
  console.error('   Vercel has NOT deployed yet. Run manually with valid GitHub credentials:');
  console.error(`     git push origin ${branch}`);
  process.exit(pushRes.status || 1);
}

console.log(`\n✅ Released v${manifest.versionName} (versionCode ${manifest.versionCode}, sha256:${sha256.slice(0, 12)}) to origin/${branch}.`);
console.log('   Vercel will automatically build & deploy the matching download URL:', manifest.downloadPath);

import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const lingoDir = path.resolve(__dirname, '..');
const apkPath = path.join(lingoDir, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');

function getConnectedDevices() {
  try {
    const output = execSync('adb devices', { encoding: 'utf8' });
    const lines = output.trim().split(/\r?\n/).slice(1);
    const devices = [];
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2) {
        devices.push({ id: parts[0], status: parts[1] });
      }
    }
    return devices;
  } catch (err) {
    console.error('[ADB ERROR] Could not execute "adb devices". Is Android SDK platform-tools installed?');
    console.error(err.message);
    process.exit(1);
  }
}

console.log('=== [LINGO MOBILE] Checking Connected Android Devices ===');
const devices = getConnectedDevices();

if (devices.length === 0) {
  console.log('\n❌ No Android device detected over USB.');
  console.log('\n📋 Quick Setup Steps to Connect Your Phone:');
  console.log('  1. Connect your Android phone to this computer using a USB cable.');
  console.log('  2. On your phone, go to Settings -> About Phone.');
  console.log('  3. Tap "Build Number" 7 times until you see "You are now a developer!".');
  console.log('  4. Go to Settings -> System (or Additional Settings) -> Developer Options.');
  console.log('  5. Turn ON "USB Debugging".');
  console.log('  6. Check your phone screen and tap "Always allow from this computer" -> "Allow".');
  console.log('\nOnce connected, run: npm run app:install\n');
  process.exit(1);
}

const unauthorized = devices.filter(d => d.status === 'unauthorized');
if (unauthorized.length > 0) {
  console.log('\n⚠️  Device detected but unauthorized: ' + unauthorized.map(d => d.id).join(', '));
  console.log('👉 Please unlock your phone screen and tap "Allow USB debugging".');
  console.log('Then run "npm run app:install" again.\n');
  process.exit(1);
}

const readyDevices = devices.filter(d => d.status === 'device');
console.log(`✅ Found ${readyDevices.length} ready device(s): ${readyDevices.map(d => d.id).join(', ')}`);

// 1. Build APK if needed
const shouldRebuild = process.argv.includes('--build') || !fs.existsSync(apkPath);
if (shouldRebuild) {
  console.log('\n📦 Compiling latest APK...');
  const buildResult = spawnSync('node', ['scripts/build-apk.mjs'], {
    cwd: lingoDir,
    stdio: 'inherit',
    shell: true
  });
  if (buildResult.status !== 0) {
    console.error('\n❌ APK build failed.');
    process.exit(buildResult.status || 1);
  }
} else {
  console.log(`\n📦 Using existing APK at: ${apkPath}`);
  console.log('(Tip: pass --build to recompile before installing)');
}

// 2. Install APK onto connected device(s)
for (const dev of readyDevices) {
  console.log(`\n🚀 Installing APK onto device [${dev.id}]...`);
  try {
    execSync(`adb -s ${dev.id} install -r "${apkPath}"`, { stdio: 'inherit' });
    console.log(`✅ Successfully installed Lingo on [${dev.id}]!`);

    console.log(`📱 Launching Lingo on [${dev.id}]...`);
    execSync(`adb -s ${dev.id} shell am start -n com.lingoplay.app/.MainActivity`, { stdio: 'inherit' });
    console.log(`✨ Lingo is now running on your phone!`);
  } catch (err) {
    console.error(`❌ Installation failed on device [${dev.id}]:`, err.message);
  }
}

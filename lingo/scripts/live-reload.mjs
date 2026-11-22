import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const lingoDir = path.resolve(__dirname, '..');
const androidDir = path.join(lingoDir, 'android');
const capConfigFile = path.join(lingoDir, 'capacitor.config.json');
const androidAssetsConfig = path.join(androidDir, 'app', 'src', 'main', 'assets', 'capacitor.config.json');
const viteBin = path.join(lingoDir, 'node_modules', 'vite', 'bin', 'vite.js');

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

console.log('=== [LINGO LIVE RELOAD] Starting USB Real-Time Sync ===');
const devices = getConnectedDevices();

if (devices.length === 0) {
  console.log('\n❌ No Android device detected over USB.');
  console.log('\n📋 Quick Setup Steps to Connect Your Phone:');
  console.log('  1. Connect your Android phone to this computer using a USB cable.');
  console.log('  2. Enable "USB Debugging" in Developer Options on your phone.');
  console.log('  3. Tap "Allow USB debugging" on your phone screen.');
  console.log('\nOnce connected, run: npm run app:dev\n');
  process.exit(1);
}

const readyDevices = devices.filter(d => d.status === 'device');
if (readyDevices.length === 0) {
  console.log('\n⚠️  Device detected but unauthorized. Please unlock phone and tap "Allow".');
  process.exit(1);
}

console.log(`✅ Phone detected: ${readyDevices.map(d => d.id).join(', ')}`);

// Setup port forwarding over USB
console.log('🔌 Forwarding ports over USB (tcp:5173 -> phone:5173, tcp:3000 -> phone:3000)...');
try {
  execSync('adb reverse tcp:5173 tcp:5173');
  execSync('adb reverse tcp:3000 tcp:3000');
  console.log('✅ USB port tunnels established.');
} catch (err) {
  console.warn('⚠️  Could not run adb reverse:', err.message);
}

// Backup capacitor config
const originalConfigText = fs.readFileSync(capConfigFile, 'utf8');
const config = JSON.parse(originalConfigText);

let restored = false;
function restoreConfig() {
  if (restored) return;
  restored = true;
  console.log('\n🔄 Restoring production Capacitor config...');
  try {
    fs.writeFileSync(capConfigFile, originalConfigText, 'utf8');
    if (fs.existsSync(androidAssetsConfig)) {
      fs.writeFileSync(androidAssetsConfig, originalConfigText, 'utf8');
    }
  } catch (e) {}
  console.log('✅ Config restored.');
}

process.on('SIGINT', () => { restoreConfig(); process.exit(0); });
process.on('SIGTERM', () => { restoreConfig(); process.exit(0); });
process.on('exit', () => { restoreConfig(); });

// Enable dev server URL
config.server = {
  ...config.server,
  url: 'http://localhost:5173',
  cleartext: true
};
const liveConfigText = JSON.stringify(config, null, 2);
fs.writeFileSync(capConfigFile, liveConfigText, 'utf8');
if (fs.existsSync(androidAssetsConfig)) {
  fs.writeFileSync(androidAssetsConfig, liveConfigText, 'utf8');
}

console.log('⚡ Synced live-reload configuration to Android assets.');

// Build and install the live-reload APK
console.log('📦 Compiling APK with live-reload connection...');
const isWin = process.platform === 'win32';
const gradlewCmd = isWin ? 'gradlew.bat' : './gradlew';
execSync(`${gradlewCmd} assembleDebug`, {
  cwd: androidDir,
  stdio: 'inherit',
  shell: true
});

const apkPath = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
for (const dev of readyDevices) {
  console.log(`🚀 Installing live-reload build on [${dev.id}]...`);
  execSync(`adb -s ${dev.id} install -r "${apkPath}"`, { stdio: 'inherit' });
  console.log(`📱 Launching Lingo on [${dev.id}]...`);
  execSync(`adb -s ${dev.id} shell am force-stop com.lingoplay.app`, { stdio: 'ignore' });
  execSync(`adb -s ${dev.id} shell am start -n com.lingoplay.app/.MainActivity`, { stdio: 'inherit' });
}

console.log('\n🔥 Real-Time Live Reload active!');
console.log('Any changes in lingo/src/*.jsx or style.css will instantly update on your phone screen.\n');

const viteProcess = spawn(process.execPath, [viteBin, '--host'], {
  cwd: lingoDir,
  stdio: 'inherit'
});

viteProcess.on('exit', (code) => {
  restoreConfig();
  process.exit(code || 0);
});

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const DISALLOWED_HOST_PATTERNS = [
  /localhost/i,
  /127\.0\.0\.1/,
  /10\.0\.2\.2/,
  /0\.0\.0\.0/,
  /192\.168\./,
  /\.local(?::|\/|$)/i
];

/**
 * Validates that a Capacitor config JSON object contains no development live-reload
 * settings (server.url, cleartext, or local network hosts) before production packaging.
 */
export function assertProductionCapacitorConfig(config, label = 'capacitor.config.json') {
  if (!config || typeof config !== 'object') {
    throw new Error(`[PROD GUARD] Invalid JSON object in ${label}`);
  }
  const server = config.server || {};
  if (server.url) {
    throw new Error(`[PROD GUARD] ${label} contains disallowed development server.url="${server.url}"`);
  }
  if (server.cleartext === true) {
    throw new Error(`[PROD GUARD] ${label} contains disallowed development server.cleartext=true`);
  }
  const serializedServer = JSON.stringify(server);
  for (const pat of DISALLOWED_HOST_PATTERNS) {
    if (pat.test(serializedServer)) {
      throw new Error(`[PROD GUARD] ${label} server block matched disallowed dev pattern ${pat}: ${serializedServer}`);
    }
  }
}

export function computeFileSha256(filePath) {
  const hash = crypto.createHash('sha256');
  const buf = fs.readFileSync(filePath);
  hash.update(buf);
  return { sha256: hash.digest('hex'), size: buf.length };
}

export function findApkFilesRecursive(dir) {
  const found = [];
  if (!fs.existsSync(dir)) return found;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...findApkFilesRecursive(full));
    } else if (entry.name.toLowerCase().endsWith('.apk')) {
      found.push(full);
    }
  }
  return found;
}

/**
 * Pure-Node ZIP Central Directory reader so build-apk.mjs can inspect and verify
 * the exact files baked inside app-debug.apk without external tools.
 */
export function inspectApkZip(apkPath) {
  const buf = fs.readFileSync(apkPath);
  // Locate End of Central Directory signature 0x06054b50 from the tail
  const minOffset = Math.max(0, buf.length - 65557);
  let eocdOffset = -1;
  for (let i = buf.length - 22; i >= minOffset; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) {
    throw new Error(`[APK INSPECT] Could not find ZIP EOCD record in ${apkPath}`);
  }

  const totalEntries = buf.readUInt16LE(eocdOffset + 10);
  const cdOffset = buf.readUInt32LE(eocdOffset + 16);
  const entries = new Map();

  let cursor = cdOffset;
  for (let i = 0; i < totalEntries; i++) {
    if (buf.readUInt32LE(cursor) !== 0x02014b50) {
      throw new Error(`[APK INSPECT] Corrupt central directory entry at offset ${cursor}`);
    }
    const method = buf.readUInt16LE(cursor + 10);
    const compressedSize = buf.readUInt32LE(cursor + 20);
    const uncompressedSize = buf.readUInt32LE(cursor + 24);
    const nameLen = buf.readUInt16LE(cursor + 28);
    const extraLen = buf.readUInt16LE(cursor + 30);
    const commentLen = buf.readUInt16LE(cursor + 32);
    const localHeaderOffset = buf.readUInt32LE(cursor + 42);
    const filename = buf.toString('utf8', cursor + 46, cursor + 46 + nameLen);

    entries.set(filename, { filename, method, compressedSize, uncompressedSize, localHeaderOffset });
    cursor += 46 + nameLen + extraLen + commentLen;
  }

  function readEntryBuffer(entryName) {
    const meta = entries.get(entryName);
    if (!meta) return null;
    const lh = meta.localHeaderOffset;
    if (buf.readUInt32LE(lh) !== 0x04034b50) {
      throw new Error(`[APK INSPECT] Corrupt local header for ${entryName}`);
    }
    const lNameLen = buf.readUInt16LE(lh + 26);
    const lExtraLen = buf.readUInt16LE(lh + 28);
    const dataStart = lh + 30 + lNameLen + lExtraLen;
    const compressedSlice = buf.subarray(dataStart, dataStart + meta.compressedSize);
    if (meta.method === 0) return Buffer.from(compressedSlice);
    if (meta.method === 8) return zlib.inflateRawSync(compressedSlice);
    throw new Error(`[APK INSPECT] Unsupported ZIP compression method ${meta.method} for ${entryName}`);
  }

  return {
    filenames: Array.from(entries.keys()),
    hasEntry: (name) => entries.has(name),
    readEntryBuffer,
    readEntryText: (name) => {
      const data = readEntryBuffer(name);
      return data ? data.toString('utf8') : null;
    }
  };
}

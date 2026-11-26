import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const lingoRootDir = path.resolve(__dirname, '..', '..');

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
  throw new Error(`Timed out waiting for isolated server at ${url}`);
}

function killProcTree(proc) {
  if (!proc) return Promise.resolve();
  try {
    proc.stdout?.destroy();
    proc.stderr?.destroy();
    proc.unref();
  } catch { }
  if (proc.killed || proc.exitCode !== null) return Promise.resolve();
  return new Promise(resolve => {
    const timer = setTimeout(() => {
      try { proc.kill('SIGKILL'); } catch { }
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

/**
 * Starts an isolated server.mjs backend + Vite dev/static server cleanly for UI tests.
 * Defaults to serving built dist via server.mjs (ISOLATED_TEST=1) unless useViteDev is true.
 */
export async function startIsolatedUiServer({ useViteDev = false } = {}) {
  const apiPort = await getFreePort();
  const dataPath = path.join(os.tmpdir(), `lingo-ui-test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.json`);
  let logs = '';

  const apiProc = spawn('node', ['server.mjs'], {
    cwd: lingoRootDir,
    env: {
      ...process.env,
      PORT: String(apiPort),
      ISOLATED_TEST: '1',
      NODE_ENV: 'test',
      DATA_PATH: dataPath,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  apiProc.stdout.on('data', d => { logs += d.toString(); });
  apiProc.stderr.on('data', d => { logs += d.toString(); });

  let viteProc = null;
  let webPort = apiPort;

  try {
    await waitForHttp(`http://127.0.0.1:${apiPort}/api/health`);
    if (useViteDev) {
      webPort = await getFreePort();
      const viteBin = path.join(lingoRootDir, 'node_modules', 'vite', 'bin', 'vite.js');
      viteProc = spawn('node', [viteBin, '--host', '127.0.0.1', '--port', String(webPort), '--strictPort'], {
        cwd: lingoRootDir,
        env: {
          ...process.env,
          VITE_DEV_API_PROXY: `http://127.0.0.1:${apiPort}`,
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      viteProc.stdout.on('data', d => { logs += d.toString(); });
      viteProc.stderr.on('data', d => { logs += d.toString(); });
      await waitForHttp(`http://127.0.0.1:${webPort}/`);
    }
  } catch (err) {
    await killProcTree(viteProc);
    await killProcTree(apiProc);
    try { fs.rmSync(dataPath, { force: true }); } catch { }
    throw new Error(`${err.message}\nServer logs:\n${logs.slice(-1500)}`);
  }

  const baseUrl = `http://127.0.0.1:${webPort}`;
  const apiUrl = `http://127.0.0.1:${apiPort}`;

  return {
    baseUrl,
    apiUrl,
    getLogs: () => logs,
    stop: async () => {
      await killProcTree(viteProc);
      await killProcTree(apiProc);
      try { fs.rmSync(dataPath, { force: true }); } catch { }
    },
  };
}

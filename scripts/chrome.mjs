// Cross-platform headless Chrome/Edge locator for the dev CDP scripts (macOS, Windows, Linux).
// Override with the CHROME_PATH environment variable.
import { existsSync } from 'node:fs';

const CANDIDATES = {
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ],
  win32: [
    `${process.env.PROGRAMFILES}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env['PROGRAMFILES(X86)']}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env['PROGRAMFILES(X86)']}\\Microsoft\\Edge\\Application\\msedge.exe`,
    `${process.env.PROGRAMFILES}\\Microsoft\\Edge\\Application\\msedge.exe`,
  ],
  linux: ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'],
};

export function chromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const found = (CANDIDATES[process.platform] ?? []).find((p) => p && existsSync(p));
  if (!found) throw new Error('Chrome/Edge not found. Set CHROME_PATH to your browser executable.');
  return found;
}

/** GPU backend flag: Metal on macOS, default (D3D11 via ANGLE) elsewhere. */
export function gpuFlags() {
  return process.platform === 'darwin' ? ['--use-angle=metal'] : [];
}

// Dev tool: open a URL in headless Chrome via the DevTools protocol, stream console output,
// wait for a marker string (or timeout), then save a screenshot. Usage:
//   node scripts/cdp-run.mjs <url> <out.png> [marker] [timeoutSec]
import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromePath, gpuFlags } from './chrome.mjs';

const [url, out, marker = '', timeoutSec = '120'] = process.argv.slice(2);
const chrome = chromePath();
const port = 9333;
const proc = spawn(chrome, [
  '--headless=new', '--no-first-run', ...gpuFlags(), `--remote-debugging-port=${port}`,
  '--window-size=1280,720', `--user-data-dir=${mkdtempSync(join(tmpdir(), 'cdp-'))}`, 'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let targets;
for (let i = 0; i < 50; i++) {
  try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (targets.length) break; } catch {}
  await sleep(200);
}
const page = targets.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0;
const pending = new Map();
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
let done = false;
let hits = 0;
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg.result); pending.delete(msg.id); }
  if (msg.method === 'Runtime.consoleAPICalled') {
    const text = msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ');
    if (msg.params.type === 'error' || msg.params.type === 'warning' || text.startsWith('BOOT') || (marker && text.includes(marker))) console.log(`[${msg.params.type}] ${text}`);
    if (marker && text.includes(marker) && ++hits >= Number(process.env.MARKS ?? 1)) done = true;
  }
  if (msg.method === 'Runtime.exceptionThrown') console.log('[exception]', msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text);
});
await send('Runtime.enable');
await send('Page.enable');
if (process.env.DPR) await send('Emulation.setDeviceMetricsOverride', { width: Number(process.env.W ?? 1440), height: Number(process.env.H ?? 900), deviceScaleFactor: Number(process.env.DPR), mobile: false });
await send('Page.navigate', { url });
const deadline = Date.now() + Number(timeoutSec) * 1000;
while (!done && Date.now() < deadline) await sleep(250);
if (!marker) await sleep(Number(timeoutSec) * 1000 - 1000);
const shot = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync(out, Buffer.from(shot.data, 'base64'));
console.log(done || !marker ? 'saved' : 'TIMEOUT', out);
ws.close();
proc.kill();
process.exit(0);

// Dev tool: CPU-profile a page for N seconds and print the top self-time functions.
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromePath, gpuFlags } from './chrome.mjs';
const [url, secs = '8', warm = '8'] = process.argv.slice(2);
const proc = spawn(chromePath(), ['--headless=new', ...gpuFlags(), '--remote-debugging-port=9334', '--window-size=1440,900', `--user-data-dir=${mkdtempSync(join(tmpdir(), 'cdp-'))}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let t; for (let i = 0; i < 50; i++) { try { t = await (await fetch('http://127.0.0.1:9334/json')).json(); if (t.length) break; } catch {} await sleep(200); }
const ws = new WebSocket(t.find((x) => x.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0; const pend = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Page.enable'); await send('Profiler.enable');
await send('Page.navigate', { url });
await sleep(Number(warm) * 1000);
await send('Profiler.setSamplingInterval', { interval: 200 });
await send('Profiler.start');
await sleep(Number(secs) * 1000);
const { profile } = await send('Profiler.stop');
const self = new Map(); const byId = new Map(profile.nodes.map((n) => [n.id, n]));
const counts = new Map(); profile.samples.forEach((s) => counts.set(s, (counts.get(s) ?? 0) + 1));
let total = 0;
for (const [nid, c] of counts) { const n = byId.get(nid); const f = n.callFrame; const key = `${f.functionName || '(anon)'} ${f.url.split('/').slice(-2).join('/')}:${f.lineNumber}`; self.set(key, (self.get(key) ?? 0) + c); total += c; }
[...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).forEach(([k, c]) => console.log(((c / total) * 100).toFixed(1).padStart(5) + '%  ' + k));
ws.close(); proc.kill(); process.exit(0);

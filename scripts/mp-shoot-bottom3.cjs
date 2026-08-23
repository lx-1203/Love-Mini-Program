/* eslint-disable no-console */
const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
const fs = require('fs');
const path = require('path');
const http = require('http');
const WS_ENDPOINT = 'ws://127.0.0.1:9420';
const API_BASE = 'http://127.0.0.1:8080/api/v1';
const OUT_DIR = 'D:\\6\\恋爱小程序\\截图存档\\2026-08-20-current';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function httpPost(url, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request({ hostname: u.hostname, port: u.port, path: u.pathname, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } }, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (_) { resolve(data); } });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}
function withTimeout(promise, ms, label) {
  return Promise.race([promise, sleep(ms).then(() => { console.log(`  [timeout] ${label}`); return 'TIMEOUT'; })]);
}
async function main() {
  const PAGES = [
    { name: '13-circles-topic', url: '/pages/circles/topic-detail?topicId=1' },
    { name: '14-village-detail', url: '/pages/village/detail?id=1' },
  ];
  let mp;
  try { mp = await automator.connect({ wsEndpoint: WS_ENDPOINT }); console.log('connected'); }
  catch (e) { console.error('connect fail', e.message); process.exit(1); }
  try {
    const data = await httpPost(`${API_BASE}/auth/guest-login`, '{}');
    const token = data.token || (data.data && data.data.token);
    if (token) { await mp.callWxMethod('setStorage', { key: 'token', data: token }); console.log('token injected'); }
  } catch (e) { console.log('token fail', e.message); }

  for (const p of PAGES) {
    const topPath = path.join(OUT_DIR, `${p.name}-1-top.png`);
    const bottomPath = path.join(OUT_DIR, `${p.name}-2-bottom.png`);
    try {
      console.log(`>> ${p.name}`);
      await withTimeout(mp.reLaunch(p.url), 20000, `${p.name} reLaunch`);
      await sleep(12000);
      if (!fs.existsSync(bottomPath)) {
        await withTimeout(mp.pageScrollTo(99999), 15000, `${p.name} scroll`);
        await sleep(8000);
        await withTimeout(mp.screenshot({ path: bottomPath, fullPage: false }), 15000, `${p.name} bottom shot`);
        await sleep(5000);
      }
      console.log(`  bottom exists: ${fs.existsSync(bottomPath)} size=${fs.existsSync(bottomPath) ? fs.statSync(bottomPath).size : 0}`);
    } catch (e) { console.log(`  ERR ${p.name}: ${e.message}`); }
  }
  console.log('done');
  try { await mp.disconnect(); } catch (e) {}
}
main().catch((e) => { console.error('FATAL', e); process.exit(1); });

/* eslint-disable no-console */
const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
const fs = require('fs');
const path = require('path');
const http = require('http');
const OUT_DIR = 'D:\\6\\恋爱小程序\\截图存档\\2026-08-20-r2';
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
  return Promise.race([promise, sleep(ms).then(() => { console.log(`  [t] ${label}`); return 'TIMEOUT'; })]);
}
async function main() {
  const PAGES = [
    { name: '12-circles-index', url: '/pages/circles/index', only: 'bottom' },
    { name: '14-village-detail', url: '/pages/village/detail?id=1', only: 'both' },
  ];
  const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' });
  const data = await httpPost('http://127.0.0.1:8080/api/v1/auth/guest-login', '{}');
  await mp.callWxMethod('setStorage', { key: 'token', data: data.token });
  console.log('connected');
  for (const p of PAGES) {
    const topPath = path.join(OUT_DIR, `${p.name}-1-top.png`);
    const bottomPath = path.join(OUT_DIR, `${p.name}-2-bottom.png`);
    console.log(`>> ${p.name}`);
    await withTimeout(mp.reLaunch(p.url), 20000, 'reLaunch');
    await sleep(13000);
    if (p.only === 'both' && !fs.existsSync(topPath)) {
      await withTimeout(mp.pageScrollTo(0), 8000, 'topScroll');
      await sleep(3000);
      await withTimeout(mp.screenshot({ path: topPath, fullPage: false }), 15000, 'topShot');
      await sleep(4000);
      console.log(`  top=${fs.existsSync(topPath) ? fs.statSync(topPath).size : 0}`);
    }
    await withTimeout(mp.pageScrollTo(99999), 10000, 'bottomScroll');
    await sleep(8000);
    await withTimeout(mp.screenshot({ path: bottomPath, fullPage: false }), 15000, 'bottomShot');
    await sleep(4000);
    console.log(`  bottom=${fs.existsSync(bottomPath) ? fs.statSync(bottomPath).size : 0}`);
  }
  console.log('done');
  try { await mp.disconnect(); } catch (e) {}
}
main().catch((e) => { console.error('FATAL', e); process.exit(1); });

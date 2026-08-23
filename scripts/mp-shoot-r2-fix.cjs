/* eslint-disable no-console */
const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
const fs = require('fs');
const path = require('path');
const http = require('http');
const WS_ENDPOINT = 'ws://127.0.0.1:9420';
const API_BASE = 'http://127.0.0.1:8080/api/v1';
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
    { name: '11-campus', url: '/pages/campus/index', long: true },
    { name: '12-circles-index', url: '/pages/circles/index', long: true },
    { name: '13-circles-topic', url: '/pages/circles/topic-detail?topicId=1', long: true },
    { name: '14-village-detail', url: '/pages/village/detail?id=1', long: true },
    { name: '15-profile-other', url: '/pages/profile/other?userId=2', long: false },
  ];
  let mp = await automator.connect({ wsEndpoint: WS_ENDPOINT });
  try {
    const data = await httpPost(`${API_BASE}/auth/guest-login`, '{}');
    const token = data.token;
    await mp.callWxMethod('setStorage', { key: 'token', data: token });
  } catch (e) {}
  console.log('connected + token');
  for (const p of PAGES) {
    const topPath = path.join(OUT_DIR, `${p.name}-1-top.png`);
    const bottomPath = path.join(OUT_DIR, `${p.name}-2-bottom.png`);
    console.log(`>> ${p.name}`);
    try {
      await withTimeout(mp.reLaunch(p.url), 18000, 'reLaunch');
      await sleep(12000);
      await withTimeout(mp.pageScrollTo(0), 8000, 'topScroll');
      await sleep(2500);
      await withTimeout(mp.screenshot({ path: topPath, fullPage: false }), 12000, 'topShot');
      await sleep(3000);
      console.log(`  top=${fs.existsSync(topPath) ? fs.statSync(topPath).size : 0}`);
      if (p.long) {
        await withTimeout(mp.pageScrollTo(99999), 8000, 'bottomScroll');
        await sleep(6000);
        await withTimeout(mp.screenshot({ path: bottomPath, fullPage: false }), 12000, 'bottomShot');
        await sleep(3000);
        console.log(`  bottom=${fs.existsSync(bottomPath) ? fs.statSync(bottomPath).size : 0}`);
      }
    } catch (e) {
      console.log(`  ERR ${p.name}: ${e.message}`);
      try { await mp.disconnect(); } catch (_) {}
      mp = await automator.connect({ wsEndpoint: WS_ENDPOINT });
      try {
        const data = await httpPost(`${API_BASE}/auth/guest-login`, '{}');
        await mp.callWxMethod('setStorage', { key: 'token', data: data.token });
      } catch (_) {}
    }
  }
  console.log('done');
  try { await mp.disconnect(); } catch (e) {}
}
main().catch((e) => { console.error('FATAL', e); process.exit(1); });

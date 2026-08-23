const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
const fs = require('fs');
const path = require('path');
const http = require('http');
const OUT_DIR = 'D:\\6\\恋爱小程序\\截图存档\\2026-08-20-r3';
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
async function shoot(mp, p) {
  const topPath = path.join(OUT_DIR, `${p.name}-1-top.png`);
  const bottomPath = path.join(OUT_DIR, `${p.name}-2-bottom.png`);
  console.log(`>> ${p.name}`);
  await withTimeout(mp.reLaunch(p.url), 18000, 'reLaunch');
  await sleep(12000);
  await withTimeout(mp.pageScrollTo(0), 8000, 'scrollTop');
  await sleep(2500);
  if (p.wantTop && !fs.existsSync(topPath)) {
    await withTimeout(mp.screenshot({ path: topPath, fullPage: false }), 12000, 'topShot');
    await sleep(3000);
    console.log(`  top=${fs.existsSync(topPath) ? fs.statSync(topPath).size : 0}`);
  }
  if (p.wantBottom) {
    await withTimeout(mp.pageScrollTo(99999), 8000, 'scrollBottom');
    await sleep(6000);
    await withTimeout(mp.screenshot({ path: bottomPath, fullPage: false }), 12000, 'bottomShot');
    await sleep(3000);
    console.log(`  bottom=${fs.existsSync(bottomPath) ? fs.statSync(bottomPath).size : 0}`);
  }
}
async function main() {
  const PAGES = [
    { name: '04-profile-own', url: '/pages/profile/index', wantTop: false, wantBottom: true },
    { name: '05-notlogged-waiting', url: '/pages/discover/index?guest=1', wantTop: true, wantBottom: false },
    { name: '06-notlogged-profile', url: '/pages/profile/index?guest=1', wantTop: true, wantBottom: false },
    { name: '07-messages', url: '/pages/messages/index', wantTop: false, wantBottom: true },
    { name: '10-match-success', url: '/pages/discover/match-success?userId=2', wantTop: true, wantBottom: false },
  ];
  const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' });
  try {
    const data = await httpPost('http://127.0.0.1:8080/api/v1/auth/guest-login', '{}');
    await mp.callWxMethod('setStorage', { key: 'token', data: data.token });
  } catch (e) {}
  console.log('connected');
  for (const p of PAGES) {
    try { await shoot(mp, p); } catch (e) { console.log(`  ERR ${p.name}: ${e.message}`); }
  }
  console.log('done');
  try { await mp.disconnect(); } catch (e) {}
}
main().catch((e) => { console.error('FATAL', e); process.exit(1); });

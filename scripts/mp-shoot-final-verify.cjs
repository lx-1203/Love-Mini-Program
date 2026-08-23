process.on('uncaughtException', (e) => console.log('[uncaught]', e.message));
const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
const fs = require('fs');
const path = require('path');
const http = require('http');
const OUT_DIR = 'D:\\6\\恋爱小程序\\截图存档\\2026-08-20-final-r4';
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
async function connect() {
  const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' });
  mp.on('error', () => {});
  try {
    const data = await httpPost('http://127.0.0.1:8080/api/v1/auth/guest-login', '{}');
    await mp.callWxMethod('setStorage', { key: 'token', data: data.token });
  } catch (e) {}
  return mp;
}
async function shoot(mp, p) {
  const topPath = path.join(OUT_DIR, `${p.name}-1-top.png`);
  console.log(`>> ${p.name} ${p.url}`);
  await withTimeout(mp.reLaunch(p.url), 20000, 'reLaunch');
  await sleep(13000);
  await withTimeout(mp.pageScrollTo(0), 8000, 'st');
  await sleep(3000);
  await withTimeout(mp.screenshot({ path: topPath, fullPage: false }), 15000, 'ts');
  await sleep(3000);
  console.log(`  top=${fs.existsSync(topPath) ? fs.statSync(topPath).size : 0}`);
}
async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const PAGES = [
    { name: '08-login', url: '/pages/login/index' },
    { name: '02-home', url: '/pages/home/index' },
    { name: '01-discover', url: '/pages/discover/index' },
    { name: '12-circles-index', url: '/pages/circles/index' },
    { name: '10-match-success', url: '/pages/discover/match-success?userId=2' },
  ];
  let mp = await connect();
  console.log('connected');
  for (const p of PAGES) {
    try { await shoot(mp, p); }
    catch (e) { console.log(`  ERR ${p.name}: ${e.message}`); try { await mp.disconnect(); } catch(_){} mp = await connect(); }
  }
  console.log('final verify done');
  try { await mp.disconnect(); } catch (e) {}
}
main().catch((e) => console.error('FATAL', e.message));

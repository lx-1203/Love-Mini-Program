/* eslint-disable no-console */
/** 抗崩溃全量截图：捕获 WS 异常 + 文件存在性判断 + 自动重连 */
const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
const fs = require('fs');
const path = require('path');
const http = require('http');
const OUT_DIR = process.argv[2] || 'D:\\6\\恋爱小程序\\截图存档\\2026-08-20-r3';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

process.on('uncaughtException', (e) => console.log('[uncaught]', e.message));
process.on('unhandledRejection', (e) => console.log('[unhandled]', e && e.message));

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
  let mp;
  for (let i = 0; i < 3; i++) {
    try {
      mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' });
      mp.on('error', () => console.log('  [ws error]'));
      try {
        const data = await httpPost('http://127.0.0.1:8080/api/v1/auth/guest-login', '{}');
        await mp.callWxMethod('setStorage', { key: 'token', data: data.token });
      } catch (e) {}
      return mp;
    } catch (e) {
      console.log('  connect retry', i, e.message);
      await sleep(3000);
    }
  }
  throw new Error('cannot connect');
}
async function shootPage(mp, p) {
  const topPath = path.join(OUT_DIR, `${p.name}-1-top.png`);
  const bottomPath = path.join(OUT_DIR, `${p.name}-2-bottom.png`);
  const needTop = p.wantTop && !fs.existsSync(topPath);
  const needBottom = p.wantBottom && !fs.existsSync(bottomPath);
  if (!needTop && !needBottom) { console.log(`skip ${p.name}`); return; }
  console.log(`>> ${p.name} (${p.url})`);
  await withTimeout(mp.reLaunch(p.url), 20000, 'reLaunch');
  await sleep(14000);
  if (needTop) {
    await withTimeout(mp.pageScrollTo(0), 8000, 'scrollTop');
    await sleep(3000);
    await withTimeout(mp.screenshot({ path: topPath, fullPage: false }), 15000, 'topShot');
    await sleep(4000);
    console.log(`  top=${fs.existsSync(topPath) ? fs.statSync(topPath).size : 0}`);
  }
  if (needBottom) {
    await withTimeout(mp.pageScrollTo(99999), 10000, 'scrollBottom');
    await sleep(8000);
    await withTimeout(mp.screenshot({ path: bottomPath, fullPage: false }), 15000, 'bottomShot');
    await sleep(4000);
    console.log(`  bottom=${fs.existsSync(bottomPath) ? fs.statSync(bottomPath).size : 0}`);
  }
}
async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const PAGES = [
    { name: '01-discover', url: '/pages/discover/index', wantTop: true, wantBottom: true },
    { name: '02-home', url: '/pages/home/index', wantTop: true, wantBottom: true },
    { name: '03-nearby', url: '/pages/nearby/index', wantTop: true, wantBottom: true },
    { name: '04-profile-own', url: '/pages/profile/index', wantTop: true, wantBottom: true },
    { name: '05-notlogged-waiting', url: '/pages/discover/index?guest=1', wantTop: true, wantBottom: false },
    { name: '06-notlogged-profile', url: '/pages/profile/index?guest=1', wantTop: true, wantBottom: false },
    { name: '07-messages', url: '/pages/messages/index', wantTop: true, wantBottom: true },
    { name: '08-login', url: '/pages/login/index', wantTop: true, wantBottom: false },
    { name: '09-matching', url: '/pages/discover/matching?preview=1&cardId=1&action=like&userId=2', wantTop: true, wantBottom: true },
    { name: '10-match-success', url: '/pages/discover/match-success?userId=2', wantTop: true, wantBottom: false },
    { name: '11-campus', url: '/pages/campus/index', wantTop: true, wantBottom: true },
    { name: '12-circles-index', url: '/pages/circles/index', wantTop: true, wantBottom: true },
    { name: '13-circles-topic', url: '/pages/circles/topics?circleId=1', wantTop: true, wantBottom: true },
    { name: '14-village-detail', url: '/pages/village/detail?id=1', wantTop: true, wantBottom: true },
    { name: '15-profile-other', url: '/pages/profile/other?userId=2', wantTop: true, wantBottom: false },
  ];
  let mp = await connect();
  console.log('connected');
  for (const p of PAGES) {
    try {
      await shootPage(mp, p);
    } catch (e) {
      console.log(`  ERR ${p.name}: ${e.message}`);
      try { await mp.disconnect(); } catch (_) {}
      mp = await connect();
    }
    await sleep(1500);
  }
  console.log('ALL DONE');
  try { await mp.disconnect(); } catch (e) {}
}
main().catch((e) => { console.error('FATAL2', e); process.exit(1); });

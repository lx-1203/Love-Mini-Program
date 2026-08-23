/* eslint-disable no-console */
/** 稳健全页面截图：注入 token → 每页回顶+首屏+滚动 → 超时不阻塞 */
const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
const fs = require('fs');
const path = require('path');
const http = require('http');

const WS_ENDPOINT = 'ws://127.0.0.1:9420';
const API_BASE = 'http://127.0.0.1:8080/api/v1';
const REPO = 'D:\\6\\恋爱小程序';
const OUT_DIR = process.argv[2] || path.join(REPO, '截图存档', '2026-08-20-logged');
const WAIT_NAV = 12000;
const WAIT_SHOT = 6000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PAGES = [
  { name: '01-discover',       url: '/pages/discover/index',          long: true },
  { name: '02-home',           url: '/pages/home/index',              long: true },
  { name: '03-nearby',         url: '/pages/nearby/index',            long: true },
  { name: '04-profile-own',    url: '/pages/profile/index',           long: true },
  { name: '05-notlogged-waiting', url: '/pages/discover/index?guest=1', long: false },
  { name: '06-notlogged-profile', url: '/pages/profile/index?guest=1',  long: false },
  { name: '07-messages',       url: '/pages/messages/index',          long: true },
  { name: '08-login',          url: '/pages/login/index',             long: false },
  { name: '09-matching',       url: '/pages/discover/matching',       long: true },
  { name: '10-match-success',  url: '/pages/discover/match-success',  long: false },
  { name: '11-campus',         url: '/pages/campus/index',            long: true },
  { name: '12-circles-index',  url: '/pages/circles/index',           long: true },
  { name: '13-circles-topic',  url: '/pages/circles/topic-detail?topicId=1', long: true },
  { name: '14-village-detail', url: '/pages/village/detail?id=1',     long: true },
  { name: '15-profile-other',  url: '/pages/profile/other?userId=1',  long: false },
];

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
  const mp = await automator.connect({ wsEndpoint: WS_ENDPOINT });
  // 注入 token
  try {
    const data = await httpPost(`${API_BASE}/auth/guest-login`, '{}');
    const token = data.token || (data.data && data.data.token);
    if (token) {
      await mp.callWxMethod('setStorage', { key: 'token', data: token });
      await mp.callWxMethod('setStorage', { key: 'refreshToken', data: '' });
    }
  } catch (e) { console.log('  token fail:', e.message); }
  return mp;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const errors = [];
  const results = [];
  let mp = await connect();
  console.log('connected + token');

  mp.on('console', (msg) => {
    if (!msg || msg.type !== 'error') return;
    const text = String((msg.args || []).map((a) => {
      if (typeof a === 'string') return a;
      if (a && a.value !== undefined) return String(a.value);
      if (a && a.description) return a.description;
      return JSON.stringify(a);
    }).join(' ')).slice(0, 400);
    errors.push({ time: new Date().toISOString(), type: 'console', text });
  });
  mp.on('exception', (err) => {
    errors.push({ time: new Date().toISOString(), type: 'exception', text: String(err && err.message || err).slice(0, 400) });
  });

  for (let i = 0; i < PAGES.length; i++) {
    const p = PAGES[i];
    const topPath = path.join(OUT_DIR, `${p.name}-1-top.png`);
    const bottomPath = path.join(OUT_DIR, `${p.name}-2-bottom.png`);
    console.log(`>> ${p.name} (${i + 1}/${PAGES.length})`);
    try {
      await withTimeout(mp.reLaunch(p.url), 18000, 'reLaunch');
      await sleep(WAIT_NAV);
      // 回顶
      await withTimeout(mp.pageScrollTo(0), 8000, 'scrollTop');
      await sleep(2500);
      await withTimeout(mp.screenshot({ path: topPath, fullPage: false }), 12000, 'topShot');
      await sleep(3000);
      console.log(`  top=${fs.existsSync(topPath) ? fs.statSync(topPath).size : 0}`);
      if (p.long) {
        await withTimeout(mp.pageScrollTo(99999), 8000, 'scrollBottom');
        await sleep(6000);
        await withTimeout(mp.screenshot({ path: bottomPath, fullPage: false }), 12000, 'bottomShot');
        await sleep(3000);
        console.log(`  bottom=${fs.existsSync(bottomPath) ? fs.statSync(bottomPath).size : 0}`);
      }
      results.push({ name: p.name, url: p.url, ok: true });
    } catch (e) {
      console.log(`  ERR ${p.name}: ${e.message}`);
      results.push({ name: p.name, url: p.url, ok: false, err: e.message });
      // 重连
      try { await mp.disconnect(); } catch (_) {}
      mp = await connect();
      console.log('  reconnected');
    }
  }
  fs.writeFileSync(path.join(OUT_DIR, '_run-results.json'), JSON.stringify(results, null, 2), 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, '_run-errors.json'), JSON.stringify(errors, null, 2), 'utf8');
  console.log(`done errors=${errors.length}`);
  try { await mp.disconnect(); } catch (e) {}
}
main().catch((e) => { console.error('FATAL', e); process.exit(1); });

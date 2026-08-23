/* eslint-disable no-console */
const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
const fs = require('fs');
const path = require('path');

const WS_ENDPOINT = 'ws://127.0.0.1:9420';
const OUT_DIR = 'D:\\6\\恋爱小程序\\截图存档\\2026-08-16-rebuild-p0';
const WAIT_MS = 9000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PAGES = [
  { name: '01-discover', route: '/pages/discover/index' },
  { name: '02-home', route: '/pages/home/index' },
  { name: '03-profile-other', route: '/pages/profile/other?userId=47' },
  { name: '04-profile-own', route: '/pages/profile/index' },
];

async function connect() {
  return automator.connect({ wsEndpoint: WS_ENDPOINT });
}

async function shot(mp, name, route) {
  const out = path.join(OUT_DIR, `${name}.png`);
  await mp.callWxMethod('reLaunch', { url: route });
  await sleep(WAIT_MS);
  await mp.screenshot({ path: out });
  return fs.statSync(out).size;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log('connecting...');
  let mp = await connect();
  const errors = [];
  mp.on('console', (msg) => {
    if (!msg || msg.type !== 'error') return;
    const text = String((msg.args || []).map((a) => (typeof a === 'string' ? a : (a && a.value !== undefined ? String(a.value) : JSON.stringify(a)))).join(' ')).slice(0, 300);
    errors.push(text);
    console.log('[err]', text.slice(0, 150));
  });
  mp.on('exception', (err) => {
    errors.push('EXCEPTION ' + String((err && err.message) || err).slice(0, 300));
  });

  await sleep(3000);

  // 清理旧登录态，回到登录页
  try { await mp.callWxMethod('removeStorage', { key: 'token' }); } catch (e) { console.log('remove token warn', e.message); }
  try { await mp.callWxMethod('removeStorage', { key: 'refreshToken' }); } catch (e) { /* ignore */ }
  try { await mp.callWxMethod('reLaunch', { url: '/pages/login/index' }); } catch (e) { console.log('reLaunch login fail', e.message); }
  await sleep(4000);

  // UI 登录：勾选协议 + 临时体验号
  try {
    const page = await mp.currentPage();
    console.log('login page:', page.path);
    const cb = await page.$('.checkbox');
    if (cb) { await cb.tap(); await sleep(600); }
    const guest = await page.$('.btn-guest');
    if (guest) { await guest.tap(); console.log('guest tapped'); }
    await sleep(9000);
    const after = await mp.currentPage();
    console.log('after login page:', after.path);
  } catch (e) {
    console.log('login flow issue:', e.message);
  }

  for (const p of PAGES) {
    let ok = false;
    for (let attempt = 0; attempt < 2 && !ok; attempt++) {
      try {
        const size = await shot(mp, p.name, p.route);
        console.log('[OK]', p.name, size, 'B');
        ok = true;
      } catch (e) {
        console.log('[FAIL]', p.name, 'attempt', attempt, e.message);
        try { await mp.disconnect(); } catch (_e) { /* ignore */ }
        await sleep(2500);
        mp = await connect();
        await sleep(2500);
      }
    }
  }

  fs.writeFileSync(path.join(OUT_DIR, '_errors.json'), JSON.stringify(errors, null, 2), 'utf-8');
  console.log('console errors:', errors.length);
  for (const e of errors.slice(0, 20)) console.log(' -', e);
  try { await mp.disconnect(); } catch (_e) { /* ignore */ }
  process.exit(0);
}

process.on('uncaughtException', (e) => { console.error('[uncaught]', e.message); });
process.on('unhandledRejection', (e) => { console.error('[unhandled]', e && e.message); });
main().catch((e) => { console.error('[FATAL]', e.message); process.exit(1); });

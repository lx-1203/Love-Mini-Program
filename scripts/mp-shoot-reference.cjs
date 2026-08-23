/* 参考页截图：对理想效果图对应路由逐页截「第一屏 + 底部」 */
const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
const fs = require('fs');
const path = require('path');
const WS = 'ws://127.0.0.1:9420';
const API = 'http://127.0.0.1:8080/api/v1';
const REPO = 'D:/6/恋爱小程序';
const OUT = path.join(REPO, '截图存档', process.env.OUT || '2026-08-22-重构基线', 'client');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const WAIT = 9000;
const PAGES = [
  { name: '01-login', route: '/pages/login/index', long: false },
  { name: '02-home', route: '/pages/home/index', long: true },
  { name: '03-nearby', route: '/pages/nearby/index', long: true },
  { name: '04-discover', route: '/pages/discover/index', long: true },
  { name: '05-matching', route: '/pages/discover/matching', long: false },
  { name: '06-match-success', route: '/pages/discover/match-success', long: false },
  { name: '07-messages', route: '/pages/messages/index', long: true },
  { name: '08-profile', route: '/pages/profile/index', long: true },
  { name: '09-other', route: '/pages/profile/other', long: true },
  { name: '10-campus', route: '/pages/campus/hub', long: true },
  { name: '11-circles-index', route: '/pages/circles/index', long: true },
  { name: '12-circles-topic', route: '/pages/circles/topics?circleId=1', long: true },
  { name: '13-village-detail', route: '/pages/village/detail?id=352', long: true },
  { name: '14-notlogged-waiting', route: '/pages/home/index', long: false },
];
process.on('uncaughtException', e => console.log('[uncaught]', e.message));
process.on('unhandledRejection', e => console.log('[unhandled]', e.message));
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  let mp = await automator.connect({ wsEndpoint: WS });
  console.log('connected');
  await sleep(3000);
  const r = await fetch(`${API}/auth/guest-login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  const j = await r.json();
  const token = j.token || (j.data && j.data.token) || '';
  console.log('guest-login', r.status, 'token', token.length);
  await mp.callWxMethod('setStorage', { key: 'token', data: token });
  await mp.callWxMethod('setStorage', { key: 'refreshToken', data: '' });
  const results = [];
  for (const p of PAGES) {
    try {
      await mp.callWxMethod('reLaunch', { url: p.route });
      await sleep(p.name === '01-login' ? 6000 : WAIT);
      const top = path.join(OUT, `${p.name}-1-top.png`);
      await mp.screenshot({ path: top });
      const topSize = fs.statSync(top).size;
      let botSize = 0;
      if (p.long) {
        try {
          await mp.callWxMethod('pageScrollTo', { scrollTop: 99999, duration: 0 });
        } catch (e) { try { await mp.callWxMethod('pageScrollTo', { scrollTop: 20000, duration: 0 }); } catch (e2) {} }
        await sleep(4000);
        const bot = path.join(OUT, `${p.name}-2-bottom.png`);
        await mp.screenshot({ path: bot });
        botSize = fs.statSync(bot).size;
      }
      console.log(`[OK] ${p.name} top=${topSize}B bottom=${botSize}B`);
      results.push({ name: p.name, ok: true, topSize, botSize });
    } catch (e) {
      console.log(`[FAIL] ${p.name}: ${e.message}`);
      results.push({ name: p.name, ok: false, error: e.message });
    }
  }
  fs.writeFileSync(path.join(OUT, '_results.json'), JSON.stringify({ results, ts: new Date().toISOString() }, null, 2), 'utf-8');
  await mp.disconnect();
  process.exit(0);
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });

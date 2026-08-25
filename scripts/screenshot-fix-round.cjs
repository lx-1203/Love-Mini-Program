/* eslint-disable no-console */
const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
const fs = require('fs');
const path = require('path');
const WS = 'ws://127.0.0.1:9420';
const OUT = 'D:\\6\\恋爱小程序\\tmp\\fix-shots';
const API = 'http://127.0.0.1:8080/api/v1';
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
const errors = [];
const consoles = [];

async function api(p, opts = {}) {
  const r = await fetch(API + p, { headers: { 'Content-Type': 'application/json' }, ...opts });
  return r.json();
}

async function main() {
  console.log('[connect]');
  const mp = await automator.connect({ wsEndpoint: WS });
  mp.on('console', (m) => { if (m.type === 'error' || m.type === 'warn') consoles.push(`[${m.type}] ` + String((m.args||[]).map(a => a && a.value !== undefined ? a.value : a).join(' ')).slice(0,300)); });
  mp.on('exception', (e) => errors.push(String(e && e.message || e).slice(0,300)));
  await new Promise(r => setTimeout(r, 3000));

  // 登录态
  try {
    const guest = await api('/auth/guest-login', { method: 'POST', body: '{}' });
    if (guest.token) {
      await mp.callWxMethod('setStorageSync', 'token', guest.token);
      console.log('[login] token set:', guest.token.slice(0, 20));
    }
  } catch (e) { console.log('[login] err', e.message); }

  const pages = [
    { name: 'home', route: '/pages/home/index' },
    { name: 'circles-index', route: '/pages/circles/index' },
    { name: 'messages', route: '/pages/messages/index' },
    { name: 'official-chat', route: '/pages/official-chat/index' },
    { name: 'profile', route: '/pages/profile/index' },
  ];

  for (const pg of pages) {
    try {
      await mp.reLaunch(pg.route);
      await new Promise(r => setTimeout(r, 7000));
      const shot = path.join(OUT, pg.name + '-top.png');
      await mp.screenshot({ path: shot });
      console.log('[shot]', pg.name, '->', shot);
    } catch (e) {
      console.log('[shot-FAIL]', pg.name, e.message);
    }
  }
  fs.writeFileSync(path.join(OUT, '_errors.json'), JSON.stringify({ errors, consoles }, null, 2));
  console.log('[errors]', errors.length, '[console]', consoles.length);
  await mp.disconnect();
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });

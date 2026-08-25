/* eslint-disable no-console */
const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
const fs = require('fs');
const path = require('path');
const WS = 'ws://127.0.0.1:9420';
const OUT = 'D:\\6\\恋爱小程序\\tmp\\fix-shots2';
const API = 'http://127.0.0.1:8080/api/v1';
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
const errors = [];
const consoles = [];
async function api(p, opts = {}) { const r = await fetch(API + p, { headers: { 'Content-Type': 'application/json' }, ...opts }); return r.json(); }
async function main() {
  const mp = await automator.connect({ wsEndpoint: WS });
  mp.on('console', (m) => { if (m.type === 'error' || m.type === 'warn') consoles.push(`[${m.type}] ` + String((m.args||[]).map(a => a && a.value !== undefined ? a.value : a).join(' ')).slice(0,300)); });
  mp.on('exception', (e) => errors.push(String(e && e.message || e).slice(0,300)));
  await new Promise(r => setTimeout(r, 3000));
  let convId = '';
  try { const guest = await api('/auth/guest-login', { method: 'POST', body: '{}' }); if (guest.token) { await mp.callWxMethod('setStorageSync', 'token', guest.token); console.log('[login] token set'); } } catch(e){ console.log('[login err]', e.message); }
  try { const convs = await api('/messages/conversations', { headers: { Authorization: 'Bearer ' + (await api('/auth/guest-login',{method:'POST',body:'{}'})).token } }); const arr = Array.isArray(convs) ? convs : convs.items || convs.content || []; if (arr.length) convId = arr[0].id || arr[0].conversationUid || arr[0].conversationId || ''; console.log('[convId]', convId); } catch(e){ console.log('[conv err]', e.message); }
  const pages = [
    { name: 'chat-session', route: `/pages/chat-session/index?sessionId=${convId}` },
    { name: 'circles-topics', route: '/pages/circles/topics?circleId=1' },
  ];
  for (const pg of pages) {
    try { await mp.reLaunch(pg.route); await new Promise(r => setTimeout(r, 8000)); const shot = path.join(OUT, pg.name + '-top.png'); await mp.screenshot({ path: shot }); console.log('[shot]', pg.name); } catch(e){ console.log('[shot-FAIL]', pg.name, e.message); }
  }
  // 首页滚动到底部（二次截图）
  try { await mp.reLaunch('/pages/home/index'); await new Promise(r => setTimeout(r, 7000)); await mp.callWxMethod('pageScrollTo',{scrollTop:1200,duration:0}); await new Promise(r => setTimeout(r, 2500)); await mp.screenshot({ path: path.join(OUT, 'home-bottom.png') }); console.log('[shot] home-bottom'); } catch(e){ console.log('[home-bottom FAIL]', e.message); }
  fs.writeFileSync(path.join(OUT, '_errors.json'), JSON.stringify({ errors, consoles }, null, 2));
  console.log('[errors]', errors.length, '[console]', consoles.length);
  await mp.disconnect(); process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });

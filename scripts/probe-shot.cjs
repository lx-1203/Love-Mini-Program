/* 探针：验证 automator 连接 + 登录 + 截图首页 */
const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
const fs = require('fs');
const path = require('path');
const WS = 'ws://127.0.0.1:9420';
const API = 'http://127.0.0.1:8080/api/v1';
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  let mp = await automator.connect({ wsEndpoint: WS });
  console.log('connected');
  mp.on('console', m => { if (m && m.type === 'error') console.log('[console-err]', String(m.args && m.args[0])); });
  await sleep(3000);
  // 尝试 guest-login 拿 token
  let token = '';
  try {
    const r = await fetch(`${API}/auth/guest-login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const j = await r.json();
    token = j.token || (j.data && j.data.token) || '';
    console.log('guest-login status', r.status, 'token len', token.length);
  } catch (e) { console.log('login err', e.message); }
  if (token) {
    await mp.callWxMethod('setStorage', { key: 'token', data: token });
    await mp.callWxMethod('setStorage', { key: 'refreshToken', data: '' });
    console.log('token injected');
  }
  const out = 'D:/6/恋爱小程序/截图存档/2026-08-22-重构基线';
  fs.mkdirSync(out, { recursive: true });
  await mp.callWxMethod('reLaunch', { url: '/pages/home/index' });
  await sleep(9000);
  const p1 = path.join(out, '02-home-1-top.png');
  await mp.screenshot({ path: p1 });
  console.log('home shot', fs.statSync(p1).size, 'B');
  await mp.disconnect();
  process.exit(0);
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });

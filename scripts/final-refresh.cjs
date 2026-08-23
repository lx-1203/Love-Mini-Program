process.on('uncaughtException', () => {});
const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
const fs = require('fs');
const http = require('http');
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
function withTimeout(p, ms, l) { return Promise.race([p, sleep(ms).then(() => 'TIMEOUT')]); }
(async () => {
  const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' });
  mp.on('error', () => {});
  const data = await httpPost('http://127.0.0.1:8080/api/v1/auth/guest-login', '{}');
  await mp.callWxMethod('setStorage', { key: 'token', data: data.token });
  const OUT = 'D:/6/恋爱小程序/截图存档/2026-08-21-final';
  const pages = [
    { n: '01-discover', u: '/pages/discover/index', top: true, bot: true },
    { n: '02-home', u: '/pages/home/index', top: true, bot: true },
    { n: '07-messages', u: '/pages/messages/index', top: true, bot: true },
    { n: '12-circles-index', u: '/pages/circles/index', top: true, bot: true },
  ];
  for (const p of pages) {
    await withTimeout(mp.reLaunch(p.u), 20000, 'rl');
    await sleep(13000);
    await withTimeout(mp.pageScrollTo(0), 8000, 'st');
    await sleep(3000);
    await withTimeout(mp.screenshot({ path: `${OUT}/${p.n}-1-top.png`, fullPage: false }), 15000, 'ts');
    await sleep(3000);
    if (p.bot) {
      await withTimeout(mp.pageScrollTo(99999), 10000, 'sb');
      await sleep(7000);
      await withTimeout(mp.screenshot({ path: `${OUT}/${p.n}-2-bottom.png`, fullPage: false }), 15000, 'bs');
      await sleep(3000);
    }
    console.log('done', p.n);
  }
  console.log('ALL');
  try { await mp.disconnect(); } catch (e) {}
})().catch(e => console.error('FATAL', e.message));

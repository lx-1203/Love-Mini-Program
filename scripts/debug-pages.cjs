const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
const http = require('http');
const fs = require('fs');
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
async function run(page) {
  console.log(`=== ${page.name} ===`);
  let mp;
  try { mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' }); }
  catch (e) { console.log('connect fail:', e.message); return; }
  const errors = [];
  mp.on('console', (msg) => {
    if (msg && msg.type === 'error') {
      const text = String((msg.args || []).map(a => typeof a === 'string' ? a : (a && a.value !== undefined ? String(a.value) : (a && a.description ? a.description : JSON.stringify(a)))).join(' ')).slice(0, 200);
      errors.push(text);
    }
  });
  try {
    const data = await httpPost('http://127.0.0.1:8080/api/v1/auth/guest-login', '{}');
    await mp.callWxMethod('setStorage', { key: 'token', data: data.token });
  } catch (e) {}
  await withTimeout(mp.reLaunch(page.url), 15000, 'reLaunch');
  await sleep(10000);
  const shot = `D:/6/恋爱小程序/tmp/debug-${page.name}.png`;
  await withTimeout(mp.screenshot({ path: shot, fullPage: false }), 10000, 'shot');
  await sleep(2000);
  const splitErr = errors.filter(e => e.includes('split')).length;
  console.log('shot:', fs.existsSync(shot) ? fs.statSync(shot).size : 0, '| split errors:', splitErr, '| total errs:', errors.length);
  try { await mp.disconnect(); } catch (e) {}
}
(async () => {
  for (const p of [
    { name: 'nearby', url: '/pages/nearby/index' },
    { name: 'campus', url: '/pages/campus/index' },
    { name: 'messages', url: '/pages/messages/index' },
    { name: 'circles', url: '/pages/circles/index' },
  ]) {
    try { await run(p); } catch (e) { console.log('run err:', e.message); }
    await sleep(2000);
  }
  console.log('DONE');
})();

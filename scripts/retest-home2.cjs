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
function withTimeout(promise, ms, label) {
  return Promise.race([promise, sleep(ms).then(() => { console.log(`  [timeout] ${label}`); return 'TIMEOUT'; })]);
}
async function main() {
  const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' });
  console.log('connected');
  const data = await httpPost('http://127.0.0.1:8080/api/v1/auth/guest-login', '{}');
  const token = data.token;
  await mp.callWxMethod('setStorage', { key: 'token', data: token });
  console.log('token injected');
  await withTimeout(mp.reLaunch('/pages/home/index'), 15000, 'relaunch home');
  await sleep(12000);
  const p1 = 'D:/6/恋爱小程序/tmp/home-fresh-1.png';
  await withTimeout(mp.screenshot({ path: p1, fullPage: false }), 12000, 'shot');
  await sleep(2000);
  console.log('saved', fs.existsSync(p1) ? fs.statSync(p1).size : 0);
  try { await mp.disconnect(); } catch (e) {}
}
main().catch((e) => { console.error('FATAL', e); process.exit(1); });

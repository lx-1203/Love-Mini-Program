const automator = require(require.resolve("miniprogram-automator", { paths: [require("path").join(__dirname, "..", "apps/client"), require("path").resolve(__dirname, "..")] }));
const http = require('http');
const fs = require('fs');
const REPO_ROOT = require("path").resolve(__dirname, "..");
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
(async () => {
  const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' });
  const errors = [];
  mp.on('console', (msg) => {
    if (msg && msg.type === 'error') {
      const text = String((msg.args || []).map(a => typeof a === 'string' ? a : (a && a.value !== undefined ? String(a.value) : JSON.stringify(a))).join(' ')).slice(0, 250);
      errors.push(text);
    }
  });
  const data = await httpPost('http://127.0.0.1:8080/api/v1/auth/guest-login', '{}');
  await mp.callWxMethod('setStorage', { key: 'token', data: data.token });
  await withTimeout(mp.reLaunch('/pages/circles/index'), 15000, 'reLaunch');
  await sleep(12000);
  const shot = `${REPO_ROOT}/tmp/debug-circles2.png`;
  await withTimeout(mp.screenshot({ path: shot, fullPage: false }), 10000, 'shot');
  await sleep(2000);
  console.log('shot:', fs.existsSync(shot) ? fs.statSync(shot).size : 0);
  console.log('errors:', errors.length, errors.filter(e => e.includes('split')).length);
  console.log(JSON.stringify(errors.slice(0, 3), null, 2));
  try { await mp.disconnect(); } catch (e) {}
})().catch(e => console.error('FATAL', e.message));

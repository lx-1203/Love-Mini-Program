const automator = require(require.resolve("miniprogram-automator", { paths: [require("path").join(__dirname, "..", "apps/client"), require("path").resolve(__dirname, "..")] }));
const fs = require('fs');
const http = require('http');
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
(async () => {
  const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' });
  const data = await httpPost('http://127.0.0.1:8080/api/v1/auth/guest-login', '{}');
  await mp.callWxMethod('setStorage', { key: 'token', data: data.token });
  await mp.reLaunch('/pages/login/index');
  await sleep(12000);
  const p = `${REPO_ROOT}/tmp/login-test2.png`;
  await mp.screenshot({ path: p, fullPage: false });
  await sleep(2000);
  console.log('size:', fs.existsSync(p) ? fs.statSync(p).size : 0);
  try { await mp.disconnect(); } catch (e) {}
})().catch(e => console.error('FATAL', e.message));

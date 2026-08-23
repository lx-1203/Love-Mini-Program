const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
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
(async () => {
  const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' });
  console.log('connected');
  const data = await httpPost('http://127.0.0.1:8080/api/v1/auth/guest-login', '{}');
  const token = data.token;
  await mp.callWxMethod('setStorage', { key: 'token', data: token });
  await mp.callWxMethod('setStorage', { key: 'refreshToken', data: '' });
  console.log('token injected');
  await mp.reLaunch('/pages/discover/index');
  await sleep(10000);
  const p = 'D:/6/恋爱小程序/tmp/rebuild-discover-test.png';
  await mp.screenshot({ path: p, fullPage: false });
  await sleep(2000);
  console.log('shot size:', require('fs').existsSync(p) ? require('fs').statSync(p).size : 0);
  try { await mp.disconnect(); } catch (e) {}
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });

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
  const errs = [];
  mp.on('console', (msg) => {
    if (msg && msg.type === 'error') {
      const t = String((msg.args||[]).map(a=>typeof a==='string'?a:(a&&a.value!==undefined?String(a.value):JSON.stringify(a))).join(' ')).slice(0,300);
      errs.push(t);
    }
  });
  const data = await httpPost('http://127.0.0.1:8080/api/v1/auth/guest-login', '{}');
  await mp.callWxMethod('setStorage', { key: 'token', data: data.token });
  await mp.reLaunch('/pages/login/index');
  await sleep(10000);
  console.log('errors:', JSON.stringify(errs.slice(0,8), null, 2));
  try { await mp.disconnect(); } catch (e) {}
})().catch(e => console.error('FATAL', e.message));

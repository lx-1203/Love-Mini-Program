/* eslint-disable no-console */
/** 当前状态全页面截图：登录注入 + 首屏 + 滚动 + console 错误采集 */
const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
const fs = require('fs');
const http = require('http');
const path = require('path');

const WS_ENDPOINT = 'ws://127.0.0.1:9420';
const API_BASE = 'http://127.0.0.1:8080/api/v1';
const REPO = 'D:\\6\\恋爱小程序';
const OUT_DIR = process.argv[2] || path.join(REPO, '截图存档', '2026-08-20-current');
const WAIT_FIRST = 9000;
const WAIT_SCROLL = 4000;

const PAGES = [
  { name: '01-discover',       url: '/pages/discover/index',          desc: '寻觅匹配卡片', long: true },
  { name: '02-home',           url: '/pages/home/index',              desc: '首页',         long: true },
  { name: '03-nearby',         url: '/pages/nearby/index',            desc: '附近首页',     long: true },
  { name: '04-profile-own',    url: '/pages/profile/index',           desc: '个人主页(已填)', long: true },
  { name: '05-notlogged-waiting', url: '/pages/discover/index?guest=1', desc: '未登录等待',  long: false },
  { name: '06-notlogged-profile', url: '/pages/profile/index?guest=1',  desc: '未登录个人主页', long: false },
  { name: '07-messages',       url: '/pages/messages/index',          desc: '消息',         long: true },
  { name: '08-login',          url: '/pages/login/index',             desc: '登录页',       long: false },
  { name: '09-matching',       url: '/pages/discover/matching',       desc: '匹配中',       long: true },
  { name: '10-match-success',  url: '/pages/discover/match-success',  desc: '匹配成功',     long: false },
  { name: '11-campus',         url: '/pages/campus/index',            desc: '校园圈',       long: true },
  { name: '12-circles-index',  url: '/pages/circles/index',           desc: '兴趣圈列表',   long: true },
  { name: '13-circles-topic',  url: '/pages/circles/topic-detail?topicId=1', desc: '圈子详情', long: true },
  { name: '14-village-detail', url: '/pages/village/detail?id=1',     desc: '帖子详情',     long: true },
  { name: '15-profile-other',  url: '/pages/profile/other?userId=1',  desc: '他人主页',     long: false },
];

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
const ts = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const errors = [];
  const results = [];

  let mp;
  try {
    mp = await automator.connect({ wsEndpoint: WS_ENDPOINT });
    console.log(`[${ts()}] connected`);
  } catch (e) {
    console.error(`[FATAL] 连接失败: ${e.message}`);
    process.exit(1);
  }

  mp.on('console', (msg) => {
    if (!msg || msg.type !== 'error') return;
    const text = String((msg.args || []).map((a) => {
      if (typeof a === 'string') return a;
      if (a && a.value !== undefined) return String(a.value);
      if (a && a.description) return a.description;
      return JSON.stringify(a);
    }).join(' ')).slice(0, 400);
    errors.push({ time: ts(), type: 'console', text });
  });
  mp.on('exception', (err) => {
    errors.push({ time: ts(), type: 'exception', text: String(err && err.message || err).slice(0, 400) });
  });

  // 登录注入
  try {
    const data = await httpPost(`${API_BASE}/auth/guest-login`, '{}');
    const token = data.token || (data.data && data.data.token);
    if (!token) throw new Error('no token');
    await mp.callWxMethod('setStorage', { key: 'token', data: token });
    await mp.callWxMethod('setStorage', { key: 'refreshToken', data: '' });
    console.log(`[${ts()}] token injected len=${token.length}`);
  } catch (e) {
    console.log(`[${ts()}] token inject FAIL: ${e.message}`);
  }

  for (let i = 0; i < PAGES.length; i++) {
    const p = PAGES[i];
    let ok = false;
    for (let attempt = 0; attempt < 2 && !ok; attempt++) {
      try {
        await mp.reLaunch(p.url);
        await sleep(WAIT_FIRST);
        const firstPath = path.join(OUT_DIR, `${p.name}-1-top.png`);
        await mp.screenshot({ path: firstPath, fullPage: false });
        const s1 = fs.statSync(firstPath).size;
        let s2 = 0;
        if (p.long) {
          await mp.callWxMethod('pageScrollTo', { scrollTop: 99999, duration: 0 });
          await sleep(WAIT_SCROLL);
          const scrollPath = path.join(OUT_DIR, `${p.name}-2-bottom.png`);
          await mp.screenshot({ path: scrollPath, fullPage: false });
          s2 = fs.statSync(scrollPath).size;
        }
        results.push({ name: p.name, url: p.url, ok: true, top: s1, bottom: s2, attempt: attempt + 1 });
        console.log(`[${ts()}] ${p.name} OK top=${s1} bottom=${s2}`);
        ok = true;
      } catch (e) {
        console.log(`[${ts()}] ${p.name} attempt ${attempt + 1} FAIL: ${e.message}`);
        await sleep(4000);
      }
    }
    if (!ok) results.push({ name: p.name, url: p.url, ok: false });
  }

  fs.writeFileSync(path.join(OUT_DIR, '_run-results.json'), JSON.stringify(results, null, 2), 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, '_run-errors.json'), JSON.stringify(errors, null, 2), 'utf8');
  console.log(`[${ts()}] done. errors=${errors.length}`);
  await mp.disconnect();
}

main().catch((e) => { console.error('FATAL', e); process.exit(1); });

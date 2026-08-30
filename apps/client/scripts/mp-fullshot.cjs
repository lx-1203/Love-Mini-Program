/* eslint-disable no-console */
/**
 * mp-fullshot.cjs — 2026-08-26 全链路截图（登录注入 + 逐页首屏/滚动 + console 采集）
 * 用法：
 *   node scripts/mp-fullshot.cjs [--port 9430] [--out 截图存档/2026-08-26-全链路]
 * 前置：微信开发者工具已打开本仓库项目，并开启「设置→安全设置→服务端口」（默认 9420，可传 --port）。
 */
const automator = require('miniprogram-automator');
const fs = require('fs');
const http = require('http');
const path = require('path');

const REPO = 'D:\\6\\恋爱小程序';
const argv = process.argv.slice(2);
const port = (() => {
  const i = argv.indexOf('--port');
  return i >= 0 ? Number(argv[i + 1]) : 9420;
})();
const outArg = (() => {
  const i = argv.indexOf('--out');
  return i >= 0 ? argv[i + 1] : null;
})();
const WS_ENDPOINT = `ws://127.0.0.1:${port}`;
const API_BASE = 'http://127.0.0.1:8080/api/v1';
const OUT_DIR = outArg || path.join(REPO, '截图存档', '2026-08-26-全链路');
const WAIT_FIRST = 6000;
const WAIT_SCROLL = 3500;

const PAGES = [
  { name: '01-login',           url: '/pages/login/index',                    desc: '登录页',           long: false },
  { name: '02-home',            url: '/pages/home/index',                     desc: '首页（含社区动态）', long: true },
  { name: '03-discover',        url: '/pages/discover/index',                 desc: '寻觅-推荐卡片',     long: true },
  { name: '04-nearby-explore',  url: '/pages/nearby/index',                   desc: '附近探索',         long: true },
  { name: '05-circles-index',   url: '/pages/circles/index',                  desc: '兴趣圈列表',       long: true },
  { name: '06-campus',          url: '/pages/campus/index',                   desc: '校园圈',           long: true },
  { name: '07-activity-detail', url: '/pages/activities/detail?id=2001',      desc: '活动详情（分享/报名）', long: true },
  { name: '08-post-create',     url: '/pages/village/post',                   desc: '发帖页',           long: false },
  { name: '09-post-detail',     url: '/pages/village/detail?id=1',            desc: '帖子详情',         long: true },
  { name: '10-messages',        url: '/pages/messages/index',                 desc: '消息（会话列表）',  long: true },
  { name: '11-official-chat',   url: '/pages/official-chat/index',            desc: '寻觅助手会话',     long: true },
  { name: '12-profile-mine',    url: '/pages/profile/index',                  desc: '个人主页（我的故事）', long: true },
  { name: '13-profile-other',   url: '/pages/profile/other?userId=1',         desc: '他人主页（头像）',  long: true },
  { name: '14-settings',        url: '/pages/settings/index',                 desc: '设置',             long: false },
  { name: '15-security',        url: '/pages/security/index',                 desc: '安全中心（账号绑定）', long: true },
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
    console.log(`[${ts()}] connected ${WS_ENDPOINT}`);
  } catch (e) {
    console.error(`[FATAL] 连接失败 ${WS_ENDPOINT}: ${e.message}\n请确认微信开发者工具已打开项目并开启「设置→安全设置→服务端口」。`);
    process.exit(1);
  }

  mp.on('console', (msg) => {
    if (!msg || msg.type !== 'error') return;
    const text = String((msg.args || []).map((a) => (typeof a === 'string' ? a : a && (a.value !== undefined ? String(a.value) : a.description) || JSON.stringify(a))).join(' ')).slice(0, 400);
    errors.push({ time: ts(), type: 'console', text });
  });
  mp.on('exception', (err) => {
    errors.push({ time: ts(), type: 'exception', text: String((err && err.message) || err).slice(0, 400) });
  });

  // 登录注入：guest-login 拿 token 写入 storage（真实后端）
  try {
    const data = await httpPost(`${API_BASE}/auth/guest-login`, '{}');
    const token = data.token || (data.data && data.data.token);
    if (token) {
      await mp.callWxMethod('setStorage', { key: 'token', data: token });
      await mp.callWxMethod('setStorage', { key: 'refreshToken', data: '' });
      console.log(`[${ts()}] token injected len=${token.length}`);
    } else {
      console.log(`[${ts()}] guest-login 无 token（向后端确认）`);
    }
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

  // 寻觅-附近卡片（页内分段）：在寻觅页 tap 第二个分段「附近」
  try {
    await mp.reLaunch('/pages/discover/index');
    await sleep(WAIT_FIRST);
    const page = await mp.currentPage();
    const tabs = await page.$$('.discover-header__tab');
    if (tabs && tabs[1]) {
      await tabs[1].tap();
      await sleep(3000);
      const p = path.join(OUT_DIR, '03b-discover-nearby-cards.png');
      await mp.screenshot({ path: p, fullPage: false });
      results.push({ name: '03b-discover-nearby', url: 'discover#nearby', ok: true, top: fs.statSync(p).size, bottom: 0 });
      console.log(`[${ts()}] 03b-discover-nearby OK`);
    } else {
      console.log(`[${ts()}] 03b 未找到分段 tab，跳过`);
    }
  } catch (e) {
    console.log(`[${ts()}] 03b FAIL: ${e.message}`);
  }

  fs.writeFileSync(path.join(OUT_DIR, '_run-results.json'), JSON.stringify(results, null, 2), 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, '_run-errors.json'), JSON.stringify(errors, null, 2), 'utf8');
  console.log(`[${ts()}] done. pages=${results.length} errors=${errors.length}`);
  await mp.disconnect();
}

main().catch((e) => { console.error('FATAL', e); process.exit(1); });
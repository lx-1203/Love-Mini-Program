/* eslint-disable no-console */
/**
 * 小程序全页面截图对比（2026-08-19）
 *
 * 基于之前成功脚本（mp-shoot-full.cjs / mp-shoot-rebuild-p0.cjs / shoot-all-pages-audit.cjs）的模式：
 * - automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' })
 * - mp.callWxMethod('reLaunch', { url }) 导航（绕过 inspectee 崩溃）
 * - mp.screenshot({ path }) 截图
 * - 等待 9000ms 确保页面渲染完成
 *
 * 前置条件：
 *   1. 微信开发者工具已用 cli auto --auto-port 9420 打开项目
 *   2. dist/build/mp-weixin 已构建
 *
 * 运行：node scripts/mp-shoot-2026-08-19.cjs
 */
const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
const fs = require('fs');
const path = require('path');

const WS_ENDPOINT = 'ws://127.0.0.1:9420';
const REPO = 'D:\\6\\恋爱小程序';
const OUT_DIR = path.join(REPO, '截图存档', '2026-08-19-mp');
const WAIT_MS = 9000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function ts() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

/**
 * 全部页面路由 —— 与理想效果图逐页对应
 * name 命名与理想效果图文件名保持一致
 */
const PAGES = [
  { name: '08-login',            route: '/pages/login/index',            desc: '登录页' },
  { name: '01-discover',         route: '/pages/discover/index',         desc: '寻觅首页（匹配卡片）' },
  { name: '02-home',             route: '/pages/home/index',             desc: '首页' },
  { name: '07-messages',         route: '/pages/messages/index',         desc: '消息页' },
  { name: '09-matching',         route: '/pages/discover/matching',      desc: '匹配中页' },
  { name: '10-match-success',    route: '/pages/discover/match-success', desc: '匹配成功页' },
  { name: '03-nearby',           route: '/pages/nearby/index',           desc: '附近页' },
  { name: '05-notlogged-waiting',route: '/pages/discover/index?guest=1', desc: '未登录等待页' },
  { name: '04-profile-own',      route: '/pages/profile/index',          desc: '个人主页' },
  { name: '06-notlogged-profile',route: '/pages/profile/index?guest=1',  desc: '未登录个人主页' },
  { name: '11-campus',           route: '/pages/campus/hub',             desc: '校园圈Hub' },
  { name: '12-circle-detail',    route: '/pages/campus/index',           desc: '圈子详情' },
  { name: '13-village',          route: '/pages/village/index',          desc: '帖子/社区' },
  { name: '14-chat',             route: '/pages/chat-session/index',     desc: '聊天会话' },
  { name: '15-love-center',      route: '/pages/love-center/index',      desc: '恋爱中心' },
  { name: '16-settings',         route: '/pages/settings/index',         desc: '设置页' },
  { name: '17-search',           route: '/pages/search/index',           desc: '搜索页' },
  { name: '18-likes',            route: '/pages/likes/index',            desc: '喜欢页' },
  { name: '19-daily-question',   route: '/pages/daily-question/index',   desc: '每日一问' },
  { name: '20-campus-cert',      route: '/pages/campus/certification',   desc: '校园认证' },
];

const errors = [];

function collectError(source, msg) {
  const text = typeof msg === 'string' ? msg : (msg && msg.message ? msg.message : String(msg));
  errors.push({ time: ts(), type: source, text: text.slice(0, 300) });
}

async function connect() {
  console.log(`[${ts()}] Connecting to ${WS_ENDPOINT} ...`);
  const mp = await automator.connect({ wsEndpoint: WS_ENDPOINT });
  console.log(`[${ts()}] Connected`);
  mp.on('console', (m) => {
    if (m && m.type === 'error') collectError('console', (m.args || []).map((a) => (a && a.value != null ? a.value : a)).join(' '));
  });
  mp.on('exception', (e) => collectError('exception', e));
  return mp;
}

async function shot(mp, name, route, desc) {
  const outPath = path.join(OUT_DIR, `${name}.png`);
  console.log(`[${ts()}] Navigating: ${desc} -> ${route}`);

  // callWxMethod 绕过 inspectee 崩溃（关键经验）
  await mp.callWxMethod('reLaunch', { url: route });
  await sleep(WAIT_MS);

  // 截图（App.captureScreenshot，不走 inspectee）
  await mp.screenshot({ path: outPath });
  const size = fs.statSync(outPath).size;
  console.log(`[${ts()}] [OK] ${name} (${size}B) -> ${outPath}`);
  return size;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  let mp = await connect();
  const results = [];

  for (const p of PAGES) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const beforeErr = errors.length;
        const size = await shot(mp, p.name, p.route, p.desc);
        results.push({ ...p, ok: true, size, newErrors: errors.length - beforeErr });
        break; // success
      } catch (e) {
        console.log(`[${ts()}] [FAIL] ${p.name} attempt ${attempt + 1}: ${e.message}`);
        if (attempt === 0) {
          // 重试：断开 → 重连
          try { await mp.disconnect(); } catch (_) { /* ignore */ }
          await sleep(3000);
          mp = await connect();
          await sleep(3000);
        } else {
          results.push({ ...p, ok: false, error: e.message });
        }
      }
    }
  }

  // 汇总
  const okCount = results.filter((r) => r.ok).length;
  console.log(`\n========== 结果汇总 ==========`);
  console.log(`成功: ${okCount}/${results.length}`);
  for (const r of results) {
    const icon = r.ok ? '[OK]' : '[FAIL]';
    const detail = r.ok ? `(${r.size}B, err=${r.newErrors})` : r.error;
    console.log(`  ${icon} ${r.desc}: ${r.name} ${detail}`);
  }
  console.log(`\nConsole errors: ${errors.length}`);
  for (const e of errors.slice(0, 20)) {
    console.log(`  ${e.time} [${e.type}] ${e.text.slice(0, 120)}`);
  }

  // 写入结果 JSON
  fs.writeFileSync(path.join(OUT_DIR, '_run-results.json'), JSON.stringify({ results, ts: ts() }, null, 2), 'utf-8');
  fs.writeFileSync(path.join(OUT_DIR, '_run-errors.json'), JSON.stringify({ errors, ts: ts() }, null, 2), 'utf-8');
  console.log(`\n截图保存: ${OUT_DIR}`);

  try { await mp.disconnect(); } catch (_) { /* ignore */ }
  process.exit(0);
}

process.on('uncaughtException', (e) => { console.error(`[${ts()}] [uncaught]`, e.message); });
process.on('unhandledRejection', (e) => { console.error(`[${ts()}] [unhandled]`, e && e.message ? e.message : e); });
main().catch((e) => { console.error(`[${ts()}] [FATAL]`, e.message); process.exit(1); });

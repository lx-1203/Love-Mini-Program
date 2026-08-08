/* eslint-disable no-console */
/**
 * 匹配 Tab 验收截图（AUTOSHOT 轮，2026-08-08 v4）。
 *
 * 链路（全部避开 automator currentPage/reLaunch/element —— 这些会崩 inspectee）：
 *   - 登录态：冷启动由真实 token + GET /auth/me 恢复（bootstrap 链路，已验证）
 *   - 导航：callWxMethod('reLaunch') + 等待 + screenshot
 *   - 详情弹层/签到弹窗/筛选弹窗：AUTOSHOT query 钩子（?shot=detail&anchor=...）
 *
 * 运行：node scripts/mp-shoot-autoshot.cjs（Node 22）
 */
const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
const fs = require('fs');
const path = require('path');

const WS_ENDPOINT = 'ws://127.0.0.1:9420';
const OUT_DIR = 'D:\\6\\恋爱小程序\\截图存档\\2026-08-08-5\\client';
const WAIT_MS = 9000;

const PAGES = [
  // 匹配主页：三行顶栏 + 卡片区 + 底部三键（真实登录态）
  { name: 'a1-discover', route: '/pages/discover/index' },
  // 详情弹层：hero + 快速资料卡（无年龄、含职业）
  { name: 'a2-detail-top', route: '/pages/discover/index?shot=detail&anchor=panel-quick' },
  // 详情弹层：性格与 MBTI + 兴趣爱好
  { name: 'a3-detail-personality', route: '/pages/discover/index?shot=detail&anchor=panel-basic' },
  // 详情弹层：关于我 2x4 网格
  { name: 'a4-detail-basic', route: '/pages/discover/index?shot=detail&anchor=panel-basic' },
  // 详情弹层：兴趣圈横滑 + 单色卡片
  { name: 'a5-detail-circles', route: '/pages/discover/index?shot=detail&anchor=panel-circles' },
  // 详情弹层：动态（贴吧式）+ 查看全部
  { name: 'a6-detail-moments', route: '/pages/discover/index?shot=detail&anchor=panel-moments' },
  // 详情弹层：期待画像 + IP 属地
  { name: 'a7-detail-expected', route: '/pages/discover/index?shot=detail&anchor=panel-expected' },
  // 签到弹窗
  { name: 'a8-checkin', route: '/pages/discover/index?shot=checkin' },
  // 快捷筛选弹窗
  { name: 'a9-filter', route: '/pages/discover/index?shot=filter' },
  // 浏览历史
  { name: 'a10-history', route: '/pages/discover/history' },
  // 喜欢
  { name: 'a11-likes', route: '/pages/likes/index' },
  // 消息
  { name: 'a12-messages', route: '/pages/messages/index' },
  // 我的
  { name: 'a13-profile', route: '/pages/profile/index' },
];

const errors = [];
const results = [];

function ts() {
  return new Date().toISOString().replace('T', ' ').substring(0, 23);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log(`[${ts()}] connecting ${WS_ENDPOINT} ...`);
  let mp = await automator.connect({ wsEndpoint: WS_ENDPOINT });
  console.log('connected');

  mp.on('console', (msg) => {
    if (!msg || msg.type !== 'error') return;
    const text = String((msg.args || []).map((a) => {
      if (typeof a === 'string') return a;
      if (a && a.value !== undefined) return String(a.value);
      return JSON.stringify(a);
    }).join(' ')).slice(0, 300);
    errors.push({ time: ts(), type: 'console', text });
  });
  mp.on('exception', (err) => {
    errors.push({ time: ts(), type: 'exception', text: (err && err.message ? err.message : String(err)).slice(0, 300) });
  });

  await sleep(4000);

  /** 截图（失败重连重试一次） */
  async function shot(name, route, waitMs) {
    const shotPath = path.join(OUT_DIR, `${name}.png`);
    try {
      await mp.callWxMethod('reLaunch', { url: route });
      await sleep(waitMs || WAIT_MS);
      await mp.screenshot({ path: shotPath });
    } catch (e) {
      console.log(`[WARN] ${name} fail(${e.message.slice(0, 40)}), recover...`);
      try { await mp.disconnect(); } catch (_e) { /* ignore */ }
      await sleep(3000);
      mp = await automator.connect({ wsEndpoint: WS_ENDPOINT });
      await sleep(3000);
      try {
        await mp.callWxMethod('reLaunch', { url: route });
        await sleep(waitMs || WAIT_MS);
        await mp.screenshot({ path: shotPath });
      } catch (e2) {
        results.push({ name, ok: false, error: e2.message });
        return;
      }
    }
    const size = fs.statSync(shotPath).size;
    console.log(`[OK] ${name} (${size}B)`);
    results.push({ name, ok: true, size });
  }

  for (const p of PAGES) {
    await shot(p.name, p.route, p.wait);
  }

  fs.writeFileSync(path.join(OUT_DIR, '_run-errors.json'), JSON.stringify({ errors, ts: ts() }, null, 2), 'utf-8');
  fs.writeFileSync(path.join(OUT_DIR, '_run-results.json'), JSON.stringify({ results, ts: ts() }, null, 2), 'utf-8');
  console.log(`\n===== 汇总: ${results.filter((r) => r.ok).length}/${results.length} OK, console errors ${errors.length} =====`);
  for (const e of errors.slice(0, 10)) {
    console.log(`  ${e.time} [${e.type}] ${e.text.slice(0, 120)}`);
  }
}

main().catch((e) => {
  console.error(`[FATAL] ${e.message}`);
  process.exit(1);
});

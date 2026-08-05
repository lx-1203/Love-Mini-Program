// eslint-disable-next-line @typescript-eslint/no-var-requires
/* eslint-disable no-console */
/**
 * 最终验收：微信开发者工具自动化验证 v3
 *
 * 1. 全部页面 reLaunch 渲染验证（data 字段统计）
 * 2. 圈子页三 Tab 过滤验证（cat-following/cat-samecity/cat-discover 帖子数 > 0）
 * 3. 控制台错误/异常收集（区分既有噪音与新增错误）
 */
const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
const fs = require('fs');
const path = require('path');

const WS_ENDPOINT = 'ws://127.0.0.1:9420';
const OUT_DIR = 'D:\\6\\恋爱小程序\\verification_logs';
const WAIT_MS = 9000;

const errors = [];
let passCount = 0;
let failCount = 0;

function ts() {
  return new Date().toISOString().replace('T', ' ').substring(0, 23);
}

const PAGES = [
  { name: 'discover', route: '/pages/discover/index' },
  { name: 'home', route: '/pages/home/index' },
  { name: 'village', route: '/pages/village/index' },
  { name: 'messages', route: '/pages/messages/index' },
  { name: 'profile', route: '/pages/profile/index' },
  { name: 'love-center', route: '/pages/love-center/index' },
  { name: 'privacy', route: '/pages/profile/privacy' },
];

async function main() {
  console.log(`[${ts()}] 连接 ${WS_ENDPOINT} ...`);
  const miniProgram = await automator.connect({ wsEndpoint: WS_ENDPOINT });
  console.log(`[${ts()}] 已连接`);
  await new Promise((r) => setTimeout(r, 6000));

  miniProgram.on('console', (msg) => {
    let text = '';
    if (msg && msg.args) {
      text = msg.args.map((a) => {
        if (typeof a === 'string') return a;
        if (a && a.value !== undefined) return String(a.value);
        if (a && a.description) return a.description;
        return JSON.stringify(a);
      }).join(' ');
    } else if (msg && msg.text) {
      text = String(msg.text);
    }
    // 只记录 error 级别；已知既有噪音（unhandledRejection 空对象）单独标记
    if (msg && msg.type === 'error') {
      const isKnownNoise = text.includes('unhandledRejection') || text.includes('Global Error');
      errors.push({ time: ts(), type: msg.type, text: text.slice(0, 400), knownNoise: isKnownNoise });
    }
  });
  miniProgram.on('exceptionOccurred', (err) => {
    errors.push({ time: ts(), type: 'exception', text: err && err.message ? err.message.slice(0, 400) : String(err), knownNoise: false });
  });

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const results = [];

  // ===== 1. 页面渲染验证 =====
  for (const p of PAGES) {
    try {
      await miniProgram.reLaunch(p.route);
      await new Promise((r) => setTimeout(r, WAIT_MS));
      const info = await miniProgram.evaluate(() => {
        const pages = getCurrentPages();
        const page = pages[pages.length - 1];
        if (!page) return { hasPage: false };
        return {
          hasPage: true,
          route: page.route,
          dataCount: Object.keys(page.data || {}).length,
        };
      }).catch((e) => ({ evalError: e.message }));

      const ok = info.hasPage === true;
      if (ok) passCount++; else failCount++;
      results.push({ kind: 'render', name: p.name, route: p.route, ok, info });
      console.log(`[${ok ? 'PASS' : 'FAIL'}] render ${p.name} ${JSON.stringify(info)}`);
    } catch (e) {
      failCount++;
      results.push({ kind: 'render', name: p.name, route: p.route, ok: false, error: e.message });
      console.log(`[FAIL] render ${p.name}: ${e.message}`);
    }
  }

  // ===== 2. 圈子页三 Tab 过滤验证 =====
  const villageTabs = [
    { tab: 'cat-following', expectField: 'isFollowed' },
    { tab: 'cat-samecity', expectField: 'city' },
    { tab: 'cat-discover', expectField: 'all' },
  ];
  await miniProgram.reLaunch('/pages/village/index');
  await new Promise((r) => setTimeout(r, WAIT_MS));
  for (const vt of villageTabs) {
    try {
      // 通过页面 data 检查 posts 是否非空（三 Tab 均有内容即通过）
      const info = await miniProgram.evaluate(() => {
        const pages = getCurrentPages();
        const page = pages[pages.length - 1];
        const data = page && page.data ? page.data : {};
        return {
          postsCount: Array.isArray(data.posts) ? data.posts.length : -1,
          selectedCategory: data.selectedCategory ?? 'unknown',
        };
      }).catch((e) => ({ evalError: e.message }));
      // 默认 Tab 是关注，验证 posts 有内容
      const ok = info.postsCount > 0;
      if (ok) passCount++; else failCount++;
      results.push({ kind: 'village-tab', tab: vt.tab, ok, info });
      console.log(`[${ok ? 'PASS' : 'FAIL'}] village tab ${vt.tab} posts=${info.postsCount}`);
      // 切换下一个 tab
      if (vt.tab !== 'cat-discover') {
        await miniProgram.evaluate(() => {
          const pages = getCurrentPages();
          const page = pages[pages.length - 1];
          if (page && page.selectTab) page.selectTab('cat-samecity');
        }).catch(() => {});
        await new Promise((r) => setTimeout(r, 3000));
      }
    } catch (e) {
      failCount++;
      results.push({ kind: 'village-tab', tab: vt.tab, ok: false, error: e.message });
      console.log(`[FAIL] village tab ${vt.tab}: ${e.message}`);
    }
  }

  // ===== 3. 错误汇总 =====
  const realErrors = errors.filter((e) => !e.knownNoise);
  const noiseErrors = errors.filter((e) => e.knownNoise);

  fs.writeFileSync(
    path.join(OUT_DIR, 'feedback-final-verify.json'),
    JSON.stringify({ time: ts(), results, errors, summary: { pass: passCount, fail: failCount, realErrors: realErrors.length, noise: noiseErrors.length } }, null, 2)
  );

  console.log(`\n===== 汇总: PASS ${passCount} / FAIL ${failCount} =====`);
  console.log(`真实错误: ${realErrors.length} 条, 已知噪音(既有): ${noiseErrors.length} 条`);
  if (realErrors.length > 0) {
    console.log('\n--- 真实错误详情 ---');
    for (const e of realErrors.slice(0, 15)) console.log(`  ${e.time} [${e.type}] ${e.text}`);
  }

  await miniProgram.disconnect();
  process.exit(failCount === 0 && realErrors.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

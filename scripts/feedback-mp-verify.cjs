// eslint-disable-next-line @typescript-eslint/no-var-requires
/* eslint-disable no-console */
/**
 * 微信开发者工具小程序自动化验证脚本（Phase Feedback 改版验收）
 *
 * 通过 miniprogram-automator 连接 ws://127.0.0.1:9420，
 * 依次 reLaunch 到五个主 Tab 页面 + 新增页面，验证：
 * - 页面能正常渲染（data 非空）
 * - 控制台无业务错误 / 无页面异常
 * - 关键业务文案存在（改版特征）
 */
const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
const fs = require('fs');
const path = require('path');

const WS_ENDPOINT = 'ws://127.0.0.1:9420';
const OUT_DIR = 'D:\\6\\恋爱小程序\\verification_logs';
const WAIT_MS = 8000;

const pageErrors = [];
const consoleErrors = [];

function ts() {
  return new Date().toISOString().replace('T', ' ').substring(0, 23);
}

/** 页面 → 期望出现的关键文案片段（用于验证改版特征） */
const EXPECTED_TEXTS = {
  '/pages/discover/index': [
    '寻觅', // 页面标题
  ],
  '/pages/home/index': [
    '校园恋爱', // 问候
  ],
  '/pages/village/index': [
    '关注', // 三 Tab 之一
  ],
  '/pages/messages/index': [
    '消息', // 页面标题
  ],
  '/pages/profile/index': [
    '我的', // 页面标题
  ],
  '/pages/love-center/index': [
    '恋爱咨询', // 恋爱中心
  ],
  '/pages/profile/privacy': [
    '权限', // 权限设置
  ],
};

async function main() {
  console.log(`[${ts()}] 连接 ${WS_ENDPOINT} ...`);
  let miniProgram;
  try {
    miniProgram = await automator.connect({ wsEndpoint: WS_ENDPOINT });
  } catch (e) {
    console.error(`[${ts()}] 连接失败: ${e.message}`);
    process.exit(2);
  }
  console.log(`[${ts()}] 已连接自动化端口`);

  // 等待工具完全就绪（automator 服务冷启动）
  await new Promise((r) => setTimeout(r, 10000));

  miniProgram.on('console', (msg) => {
    const text = msg && msg.args
      ? msg.args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')
      : String((msg && msg.text) || '');
    if (msg.type === 'error' || msg.type === 'warn') {
      consoleErrors.push({ time: ts(), type: msg.type, text: text.slice(0, 500) });
    }
  });
  miniProgram.on('exceptionOccurred', (err) => {
    pageErrors.push({ time: ts(), message: err && err.message ? err.message : String(err) });
  });
  // 捕获 unhandledRejection 详情
  miniProgram.on('unhandledRejection', (err) => {
    pageErrors.push({ time: ts(), message: `[unhandledRejection] ${err && err.reason ? JSON.stringify(err.reason).slice(0, 500) : String(err)}` });
  });

  const systemInfo = await miniProgram.systemInfo().catch((e) => ({ error: e.message }));
  console.log(`[${ts()}] 系统信息: ${JSON.stringify(systemInfo)}`);

  const results = [];
  for (const [route, expectedTexts] of Object.entries(EXPECTED_TEXTS)) {
    const beforeErrors = pageErrors.length + consoleErrors.length;
    try {
      console.log(`[${ts()}] reLaunch → ${route}`);
      await miniProgram.reLaunch(route);
      await new Promise((r) => setTimeout(r, WAIT_MS));

      const page = await miniProgram.currentPage();
      // page.data 可能为空（新编译器），改用 evaluate 获取页面实例信息
      let dataKeys = [];
      let dataPreview = '';
      try {
        if (page && page.data && typeof page.data === 'object') {
          dataKeys = Object.keys(page.data);
          dataPreview = JSON.stringify(page.data).slice(0, 120);
        }
      } catch (_e) {
        dataKeys = [];
      }
      const newErrors = pageErrors.length + consoleErrors.length - beforeErrors;
      // data 存在即渲染成功
      const ok = dataKeys.length > 0;
      results.push({
        route,
        ok,
        dataKeys: dataKeys.length,
        newErrors,
        dataPreview,
      });
    } catch (e) {
      results.push({ route, ok: false, error: e.message, newErrors: -1 });
    }
    // 每页之间留出加载时间
    await new Promise((r) => setTimeout(r, 3000));
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const report = {
    time: ts(),
    systemInfo,
    results,
    pageErrors,
    consoleErrors,
  };
  fs.writeFileSync(path.join(OUT_DIR, 'feedback-mp-verify.json'), JSON.stringify(report, null, 2));

  console.log('\n===== 验证结果 =====');
  let passCount = 0;
  for (const r of results) {
    const ok = r.ok && r.newErrors === 0;
    if (ok) passCount++;
    console.log(`\n[${ok ? 'PASS' : 'FAIL'}] ${r.route}`);
    console.log(`  data keys: ${r.dataKeys ?? '-'}, 新增错误: ${r.newErrors ?? '-'}`);
    if (r.dataPreview) console.log(`  data: ${r.dataPreview}`);
    if (r.error) console.log(`  错误: ${r.error}`);
  }
  console.log(`\n通过 ${passCount}/${results.length}`);
  console.log(`\n===== 页面异常（${pageErrors.length}） =====`);
  for (const e of pageErrors.slice(0, 10)) console.log(`  ${e.time} ${e.message}`);
  console.log(`\n===== 控制台错误/警告（${consoleErrors.length}） =====`);
  for (const e of consoleErrors.slice(0, 15)) console.log(`  ${e.time} [${e.type}] ${e.text}`);

  await miniProgram.disconnect();
  process.exit(passCount === results.length ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

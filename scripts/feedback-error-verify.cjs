// eslint-disable-next-line @typescript-eslint/no-var-requires
/* eslint-disable no-console */
/**
 * 控制台错误验证脚本（Phase R1/R2/R3 修复验收）
 *
 * 连接 9420，依次 reLaunch 7 个页面并模拟 Tab 切换，
 * 收集所有 console error，分类统计：
 * - AbortController 错误（应修复为 0）
 * - switchTab 路径错误（应修复为 0）
 * - 其他真实错误
 */
const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');

const WS_ENDPOINT = 'ws://127.0.0.1:9420';

function ts() {
  return new Date().toISOString().replace('T', ' ').substring(0, 23);
}

async function main() {
  const miniProgram = await automator.connect({ wsEndpoint: WS_ENDPOINT });
  console.log(`[${ts()}] 已连接`);
  await new Promise((r) => setTimeout(r, 6000));

  const errors = [];
  miniProgram.on('console', (msg) => {
    if (msg && msg.type === 'error') {
      const text = msg.args
        ? msg.args.map((a) => {
            if (typeof a === 'string') return a;
            if (a && a.value !== undefined) return String(a.value);
            if (a && a.description) return a.description;
            return JSON.stringify(a);
          }).join(' ')
        : String(msg && msg.text || '');
      errors.push({ time: ts(), text: text.slice(0, 300) });
    }
  });
  miniProgram.on('exceptionOccurred', (err) => {
    errors.push({ time: ts(), text: 'EXCEPTION: ' + (err && err.message ? err.message.slice(0, 300) : String(err)) });
  });

  const pages = [
    ['discover', '/pages/discover/index'],
    ['home', '/pages/home/index'],
    ['village', '/pages/village/index'],
    ['messages', '/pages/messages/index'],
    ['profile', '/pages/profile/index'],
    ['love-center', '/pages/love-center/index'],
    ['privacy', '/pages/profile/privacy'],
  ];

  let pass = 0;
  for (const [name, route] of pages) {
    try {
      await miniProgram.reLaunch(route);
      await new Promise((r) => setTimeout(r, 8000));
      const info = await miniProgram.evaluate(() => {
        const pages = getCurrentPages();
        const page = pages[pages.length - 1];
        return page ? Object.keys(page.data || {}).length : 0;
      });
      if (info > 0) pass++;
      console.log(`[${info > 0 ? 'PASS' : 'FAIL'}] render ${name} data=${info}`);
    } catch (e) {
      console.log(`[FAIL] ${name}: ${e.message}`);
    }
  }

  // 分类统计
  const abortErrors = errors.filter((e) => e.text.includes('AbortController'));
  const tabErrors = errors.filter((e) => e.text.includes('switchTab') || e.text.includes('is not found'));
  const otherErrors = errors.filter((e) => !abortErrors.includes(e) && !tabErrors.includes(e));
  const unhandledRejection = errors.filter((e) => e.text.includes('unhandledRejection') || e.text.includes('Global Error'));

  console.log(`\n===== 汇总 =====`);
  console.log(`渲染 PASS: ${pass}/${pages.length}`);
  console.log(`AbortController 错误: ${abortErrors.length}`);
  console.log(`switchTab 路径错误: ${tabErrors.length}`);
  console.log(`unhandledRejection 上报: ${unhandledRejection.length}`);
  console.log(`其他错误: ${otherErrors.length}`);
  if (otherErrors.length > 0) {
    console.log('\n--- 其他错误详情 ---');
    otherErrors.slice(0, 10).forEach((e) => console.log(`  ${e.time} ${e.text}`));
  }
  if (unhandledRejection.length > 0) {
    console.log('\n--- unhandledRejection 详情（前 5） ---');
    unhandledRejection.slice(0, 5).forEach((e) => console.log(`  ${e.time} ${e.text}`));
  }

  await miniProgram.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

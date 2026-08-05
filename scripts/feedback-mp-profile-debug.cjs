/* eslint-disable no-console */
/**
 * 单页验证：reLaunch 到 /pages/profile/index 后检查当前页面路由与字段数。
 * 用于排查 feedback-mp-render.cjs 中 profile 页 route 异常显示为 chat 的问题。
 */
const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');

const WS_ENDPOINT = 'ws://127.0.0.1:9420';

function ts() {
  return new Date().toISOString().replace('T', ' ').substring(0, 23);
}

async function main() {
  const miniProgram = await automator.connect({ wsEndpoint: WS_ENDPOINT });
  console.log(`[${ts()}] 已连接`);
  await new Promise((r) => setTimeout(r, 3000));

  // 先 reLaunch 到 messages，再 reLaunch 到 profile，观察顺序影响
  for (const route of ['/pages/messages/index', '/pages/profile/index', '/pages/profile/index']) {
    console.log(`[${ts()}] reLaunch -> ${route}`);
    try {
      await miniProgram.reLaunch(route);
    } catch (e) {
      console.log(`[${ts()}] reLaunch error: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 10000));
    const info = await miniProgram.evaluate(() => {
      const pages = getCurrentPages();
      const page = pages[pages.length - 1];
      if (!page) return { hasPage: false };
      return {
        hasPage: true,
        route: page.route,
        dataCount: Object.keys(page.data || {}).length,
      };
    });
    console.log(`[${ts()}] RESULT:`, JSON.stringify(info));
  }

  await miniProgram.close();
  console.log(`[${ts()}] 已关闭连接`);
}

main().catch((err) => {
  console.error('[fatal]', err);
  process.exit(1);
});

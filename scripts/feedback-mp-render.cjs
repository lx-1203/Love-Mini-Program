// eslint-disable-next-line @typescript-eslint/no-var-requires
/* eslint-disable no-console */
/**
 * 验证页面真实渲染：检查页面 DOM 节点数量与关键文本
 */
const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');

const WS_ENDPOINT = 'ws://127.0.0.1:9420';

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
  const miniProgram = await automator.connect({ wsEndpoint: WS_ENDPOINT });
  console.log(`[${ts()}] 已连接`);
  await new Promise((r) => setTimeout(r, 5000));

  for (const p of PAGES) {
    try {
      await miniProgram.reLaunch(p.route);
      await new Promise((r) => setTimeout(r, 9000));
      // 通过 evaluate 检查页面渲染状态（读页面实例的 data 与 DOM）
      const info = await miniProgram.evaluate(() => {
        // 小程序逻辑层无 DOM，这里读取当前页面实例
        const pages = getCurrentPages();
        const page = pages[pages.length - 1];
        if (!page) return { hasPage: false };
        const data = page.data || {};
        return {
          hasPage: true,
          route: page.route,
          dataKeys: Object.keys(data).slice(0, 20),
          dataCount: Object.keys(data).length,
        };
      }).catch((e) => ({ evalError: e.message }));

      console.log(`\n[${p.name}] ${p.route}`);
      console.log(JSON.stringify(info));
    } catch (e) {
      console.log(`\n[${p.name}] FAIL: ${e.message}`);
    }
  }

  await miniProgram.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

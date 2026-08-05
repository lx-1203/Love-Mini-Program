/* eslint-disable no-console */
/**
 * 微信开发者工具最终视觉验证：
 * 1. 7 页面逐一 reLaunch + 截图（miniProgram.screenshot）
 * 2. 5 个 tab 页 switchTab 连续切换（验证切换无报错、无抖动异常）
 * 3. 记录当前系统信息（机型）
 */
const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
const fs = require('fs');
const path = require('path');

const WS_ENDPOINT = 'ws://127.0.0.1:9420';
const OUT_DIR = 'verification_logs/final-20260805';
fs.mkdirSync(OUT_DIR, { recursive: true });

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

const TABS = [
  { name: 'discover', route: '/pages/discover/index' },
  { name: 'village', route: '/pages/village/index' },
  { name: 'home', route: '/pages/home/index' },
  { name: 'chat', route: '/pages/chat/index' },
  { name: 'profile', route: '/pages/profile/index' },
];

async function main() {
  const miniProgram = await automator.connect({ wsEndpoint: WS_ENDPOINT });
  console.log(`[${ts()}] 已连接`);

  // 系统信息
  try {
    const info = await miniProgram.systemInfo();
    console.log(`[${ts()}] systemInfo: model=${info.model} screen=${info.screenWidth}x${info.screenHeight} window=${info.windowWidth}x${info.windowHeight} dpr=${info.pixelRatio}`);
  } catch (e) {
    console.log(`[${ts()}] systemInfo 获取失败: ${e.message}`);
  }

  // 1. 7 页面截图
  const errors = [];
  miniProgram.on('console', (msg) => {
    if (msg.type === 'error') errors.push(String((msg.args || []).map((a) => (a && a.value !== undefined ? a.value : a)).join(' ')).slice(0, 200));
  });
  miniProgram.on('exception', (err) => {
    errors.push(`[exception] ${JSON.stringify(err).slice(0, 200)}`);
  });

  for (const p of PAGES) {
    try {
      await miniProgram.reLaunch(p.route);
    } catch (e) {
      console.log(`[FAIL] reLaunch ${p.name}: ${e.message}`);
      continue;
    }
    await new Promise((r) => setTimeout(r, 9000));
    const shotPath = path.join(OUT_DIR, `${p.name}.png`);
    try {
      await miniProgram.screenshot({ path: shotPath });
      const size = fs.statSync(shotPath).size;
      console.log(`[SHOT] ${p.name} -> ${shotPath} (${size} bytes)`);
    } catch (e) {
      console.log(`[FAIL] screenshot ${p.name}: ${e.message}`);
    }
  }

  // 2. Tab 连续切换（回到 discover 后按顺序切 5 个 tab）
  console.log(`[${ts()}] --- Tab 切换测试 ---`);
  try {
    await miniProgram.reLaunch('/pages/discover/index');
    await new Promise((r) => setTimeout(r, 6000));
  } catch (e) {
    console.log(`reLaunch discover fail: ${e.message}`);
  }
  for (const tab of TABS) {
    try {
      await miniProgram.switchTab(tab.route);
      await new Promise((r) => setTimeout(r, 5000));
      const page = await miniProgram.currentPage();
      console.log(`[TAB] switchTab ${tab.name} -> current=${page.path} OK`);
    } catch (e) {
      console.log(`[TAB-FAIL] switchTab ${tab.name}: ${e.message}`);
    }
  }

  console.log(`\n===== 结果 =====`);
  console.log(`截图目录: ${OUT_DIR}`);
  console.log(`运行时错误: ${errors.length} 条`);
  errors.slice(0, 10).forEach((e) => console.log('  ' + e));

  await miniProgram.close();
  process.exit(errors.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('[fatal]', err);
  process.exit(1);
});

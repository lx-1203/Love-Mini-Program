/* eslint-disable no-console */
/**
 * automator 探针：验证连接 + currentPage + screenshot 是否可用。
 * 运行：node scripts/automator-probe.cjs
 */
const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
const path = require('path');

const WS_ENDPOINT = 'ws://127.0.0.1:9420';
const OUT = 'D:\\6\\恋爱小程序\\tmp\\probe.png';

async function main() {
  console.log('[probe] connecting...');
  const miniProgram = await automator.connect({ wsEndpoint: WS_ENDPOINT });
  console.log('[probe] connected');

  miniProgram.on('console', (msg) => {
    if (msg && msg.type === 'error') {
      console.log('[console-error]', String((msg.args || []).map((a) => (a && a.value !== undefined ? a.value : a)).join(' ')).slice(0, 200));
    }
  });
  miniProgram.on('exception', (err) => {
    console.log('[exception]', err && err.message ? err.message.slice(0, 200) : String(err));
  });

  await new Promise((r) => setTimeout(r, 3000));

  try {
    await miniProgram.reLaunch('/pages/discover/index');
    console.log('[probe] reLaunch ok');
  } catch (e) {
    console.log('[probe] reLaunch FAIL:', e.message);
  }
  await new Promise((r) => setTimeout(r, 9000));

  try {
    const page = await miniProgram.currentPage();
    console.log('[probe] currentPage:', page && page.path, page && page.query);
  } catch (e) {
    console.log('[probe] currentPage FAIL:', e.message);
  }

  try {
    await miniProgram.screenshot({ path: OUT });
    console.log('[probe] screenshot OK ->', OUT);
  } catch (e) {
    console.log('[probe] screenshot FAIL:', e.message);
  }

  try {
    const info = await miniProgram.systemInfo();
    console.log('[probe] systemInfo:', info.model, info.screenWidth + 'x' + info.screenHeight);
  } catch (e) {
    console.log('[probe] systemInfo FAIL:', e.message);
  }

  await miniProgram.disconnect();
  console.log('[probe] done');
  process.exit(0);
}

main().catch((err) => {
  console.error('[probe] FATAL:', err.message);
  process.exit(1);
});

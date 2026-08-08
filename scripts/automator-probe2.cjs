/* eslint-disable no-console */
/**
 * automator 探针 v2：绕过 inspectee（App.getCurrentPage 崩溃），
 * 直接用 callWxMethod 导航 + miniProgram.screenshot 截图。
 */
const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
const fs = require('fs');

const WS_ENDPOINT = 'ws://127.0.0.1:9420';
const OUT = 'D:\\6\\恋爱小程序\\tmp\\probe2.png';

async function main() {
  console.log('[probe2] connecting...');
  const miniProgram = await automator.connect({ wsEndpoint: WS_ENDPOINT });
  console.log('[probe2] connected');

  miniProgram.on('console', (msg) => {
    if (msg && msg.type === 'error') {
      console.log('[console-error]', String((msg.args || []).map((a) => (a && a.value !== undefined ? a.value : a)).join(' ')).slice(0, 200));
    }
  });
  miniProgram.on('exception', (err) => {
    console.log('[exception]', err && err.message ? err.message.slice(0, 200) : String(err));
  });

  await new Promise((r) => setTimeout(r, 3000));

  // 绕过 currentPage：直接用 wx.reLaunch
  try {
    await miniProgram.callWxMethod('reLaunch', { url: '/pages/discover/index' });
    console.log('[probe2] callWxMethod reLaunch OK');
  } catch (e) {
    console.log('[probe2] reLaunch FAIL:', e.message);
    process.exit(1);
  }
  await new Promise((r) => setTimeout(r, 9000));

  // 截图（App.captureScreenshot，不走 inspectee getCurrent）
  try {
    await miniProgram.screenshot({ path: OUT });
    const size = fs.statSync(OUT).size;
    console.log('[probe2] screenshot OK ->', OUT, size, 'bytes');
  } catch (e) {
    console.log('[probe2] screenshot FAIL:', e.message);
  }

  await miniProgram.disconnect();
  console.log('[probe2] done');
  process.exit(0);
}

main().catch((err) => {
  console.error('[probe2] FATAL:', err.message);
  process.exit(1);
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
/* eslint-disable no-console */
/**
 * 捕获 unhandledRejection 真实原因（自动化诊断）
 */
const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');

const WS_ENDPOINT = 'ws://127.0.0.1:9420';

function ts() {
  return new Date().toISOString().replace('T', ' ').substring(0, 23);
}

async function main() {
  const miniProgram = await automator.connect({ wsEndpoint: WS_ENDPOINT });
  console.log(`[${ts()}] 已连接`);

  // 捕获所有 console 消息的原始结构（前 10 条）
  let count = 0;
  miniProgram.on('console', (msg) => {
    if (count < 10) {
      console.log(`[console] type=${msg.type} raw=${JSON.stringify(msg).slice(0, 600)}`);
      count++;
    }
  });
  miniProgram.on('exceptionOccurred', (err) => {
    console.log(`[exception] ${JSON.stringify(err).slice(0, 600)}`);
  });

  await new Promise((r) => setTimeout(r, 4000));

  console.log(`[${ts()}] reLaunch discover...`);
  await miniProgram.reLaunch('/pages/discover/index');
  await new Promise((r) => setTimeout(r, 8000));

  // 注入全局 rejection 捕获
  await miniProgram.evaluate(() => {
    if (typeof wx !== 'undefined' && wx.onUnhandledRejection) {
      wx.onUnhandledRejection((res) => {
        const reason = res && res.reason;
        console.log('CAPTURED_REJECTION:', JSON.stringify({
          message: reason && reason.message,
          stack: reason && reason.stack,
          detail: reason && reason.detail,
          errMsg: reason && reason.errMsg,
          full: String(reason).slice(0, 300),
        }));
      });
    }
  }).catch((e) => console.log('evaluate fail:', e.message));

  await new Promise((r) => setTimeout(r, 6000));

  await miniProgram.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

// 收尾轮交互诊断：截图 + 编辑资料点击 + 签到文本 + 各页元素检查
/* eslint-disable no-console */
const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
const fs = require('fs');
const path = require('path');

const WS_ENDPOINT = 'ws://127.0.0.1:9420';
const OUT_DIR = 'verification_logs/final-20260805';
fs.mkdirSync(OUT_DIR, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const miniProgram = await automator.connect({ wsEndpoint: WS_ENDPOINT });
  const report = {};

  // 1) 寻觅页截图 + 卡片检查
  await miniProgram.reLaunch('/pages/discover/index');
  await sleep(5000);
  await miniProgram.screenshot(path.join(OUT_DIR, 'discover-v2.png'));
  let page = await miniProgram.currentPage();
  try {
    const views = await page.$$('.card');
    report.discoverCards = views ? views.length : 0;
  } catch (_) { report.discoverCards = 'n/a'; }
  report.discoverShot = 'discover-v2.png';

  // 2) 首页截图 + 签到文本
  await miniProgram.reLaunch('/pages/home/index');
  await sleep(5000);
  await miniProgram.screenshot(path.join(OUT_DIR, 'home-v2.png'));
  report.homeShot = 'home-v2.png';

  // 3) 消息页截图
  await miniProgram.reLaunch('/pages/messages/index');
  await sleep(5000);
  await miniProgram.screenshot(path.join(OUT_DIR, 'messages-v2.png'));
  report.messagesShot = 'messages-v2.png';

  // 4) 我的页截图 + 点击"编辑资料"
  await miniProgram.reLaunch('/pages/profile/index');
  await sleep(5000);
  await miniProgram.screenshot(path.join(OUT_DIR, 'profile-v2.png'));
  page = await miniProgram.currentPage();
  try {
    const editBtn = await page.$('.edit-btn');
    if (editBtn) {
      await editBtn.tap();
      await sleep(2500);
      const cur = await miniProgram.currentPage();
      report.editProfileRoute = cur ? cur.path : 'unknown';
    } else {
      report.editProfileRoute = 'btn-not-found';
    }
  } catch (e) {
    report.editProfileRoute = `tap-error: ${e.message}`;
  }
  report.profileShot = 'profile-v2.png';

  await miniProgram.disconnect();
  console.log(JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'interaction-diagnose.json'), JSON.stringify(report, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });

/**
 * QA 回归驱动脚本 — 六项 UI Bug 修复验证（bugfix-20260904）
 * 通过 miniprogram-automator 连接微信开发者工具自动化端口 9420。
 * 只读 + 模拟用户操作，不修改任何源码。
 */
const automator = require('D:/6/恋爱小程序/apps/client/node_modules/miniprogram-automator');
// devtools 2.02.2608040 的 automation 桥不回 SDK version → checkVersion crash，跳过版本协商
const MiniProgram = require('D:/6/恋爱小程序/apps/client/node_modules/miniprogram-automator/out/MiniProgram').default;
if (MiniProgram && MiniProgram.prototype) MiniProgram.prototype.checkVersion = async function () {};

const OUT = 'D:/6/恋爱小程序/截图存档/bugfix-20260904/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log('[qa]', ...a);

async function main() {
  const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' });
  log('connected to ws://127.0.0.1:9420');

  const consoleErrors = [];
  mp.on('console', (msg) => {
    if (msg.type === 'error') {
      consoleErrors.push((msg.args || []).map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ').slice(0, 500));
    }
  });
  mp.on('exception', (exc) => {
    consoleErrors.push('EXCEPTION: ' + (exc.message || '').slice(0, 500));
  });

  let page = await mp.currentPage();
  log('currentPage:', page && page.path);
  // 模拟器可能恢复到其他 tab，先确保在首页
  if (!page || page.path !== 'pages/home/index') {
    await mp.reLaunch('/pages/home/index');
    await sleep(3500);
    page = await mp.currentPage();
    log('reLaunched to:', page && page.path);
  }
  await sleep(2500);
  page = await mp.currentPage();

  // ---------- Issue 1: 位置弹框底部按钮 ----------
  log('=== Issue 1: location bottom sheet ===');
  await mp.screenshot({ path: OUT + '00-home-top-initial.png' });
  const locBtn = await page.$('.home-page >>> .header-location');
  log('header-location exists:', !!locBtn);
  if (locBtn) {
    await locBtn.tap();
    await sleep(2000);
    const sheet = await page.$('.bottom-sheet-root');
    log('sheet open:', !!sheet);
    const sheetBtns = await page.$$('.location-sheet__btn');
    log('sheet footer buttons count:', sheetBtns.length);
    await mp.screenshot({ path: OUT + '01-1-sheet-open-tabbar-hidden.png' });

    // 我知道了 = 第二个按钮
    if (sheetBtns.length >= 2) {
      await sheetBtns[1].tap();
      await sleep(1500);
      const sheetAfter = await page.$('.bottom-sheet-root');
      log('sheet after 我知道了 tap (should be null):', !!sheetAfter);
    }
    await mp.screenshot({ path: OUT + '01-2-sheet-closed-tabbar-restored.png' });
  }

  // ---------- Issue 2: 关系动态吉祥物 ----------
  log('=== Issue 2: relation mascots ===');
  let el = await page.$('.home-page >>> .relation-activity');
  if (el) {
    const off = await el.offset();
    log('relation-activity offset:', JSON.stringify(off));
    await mp.pageScrollTo(Math.max(0, off.top - 80));
    await sleep(1500);
  } else {
    log('relation-activity NOT FOUND (may still be loading/skeleton)');
  }
  const mascotImgs = await page.$$('.home-page >>> .relation-cell__icon-img');
  log('mascot imgs count:', mascotImgs.length);
  await mp.screenshot({ path: OUT + '02-relation-mascots.png' });

  // ---------- Issue 3: 兴趣推荐封面 ----------
  log('=== Issue 3: interest recommendation covers ===');
  el = await page.$('.home-page >>> .interest-recommend');
  if (el) {
    const off = await el.offset();
    log('interest-recommend offset:', JSON.stringify(off));
    await mp.pageScrollTo(Math.max(0, off.top - 80));
    await sleep(1500);
  }
  const covers = await page.$$('.home-page >>> .interest-card__cover');
  log('interest covers count:', covers.length);
  await mp.screenshot({ path: OUT + '03-interest-covers.png' });

  // ---------- Issue 4: 附近的人头像 ----------
  log('=== Issue 4: nearby people avatars ===');
  el = await page.$('.home-page >>> .nearby-people');
  if (el) {
    const off = await el.offset();
    log('nearby-people offset:', JSON.stringify(off));
    await mp.pageScrollTo(Math.max(0, off.top - 80));
    await sleep(1500);
  }
  const avatarWrap = await page.$('.home-page >>> .nearby-item__avatar-wrap');
  let wrapSize = null;
  if (avatarWrap) {
    wrapSize = await avatarWrap.size();
    log('avatar-wrap size:', JSON.stringify(wrapSize), '(期望 88rpx ≈ 44px 宽)');
  } else {
    log('avatar-wrap NOT FOUND');
  }
  await mp.screenshot({ path: OUT + '04-nearby-avatars.png' });

  // 信息条点击
  const bar = await page.$('.home-page >>> .nearby-people__bar');
  log('nearby bar exists:', !!bar);
  if (bar) {
    await bar.tap();
    await sleep(2500);
    let cur = await mp.currentPage();
    log('after bar tap currentPage:', cur && cur.path);
    await mp.screenshot({ path: OUT + '04-2-nearby-bar-tapped.png' });
    // 若跳走了就回到首页
    if (cur && !cur.path.includes('pages/home')) {
      try {
        await mp.navigateBack();
        await sleep(1500);
      } catch (e) {
        await mp.switchTab('/pages/home/index');
        await sleep(1500);
      }
      page = await mp.currentPage();
      log('back to:', page && page.path);
    }
  }

  // ---------- Issue 5: 底部邀请 banner ----------
  log('=== Issue 5: invite banner at page bottom ===');
  el = await page.$('.home-page >>> .invite-banner');
  let inviteOff = null;
  if (el) {
    inviteOff = await el.offset();
    log('invite-banner offset:', JSON.stringify(inviteOff));
  }
  el = await page.$('.home-section-gap');
  if (el) {
    const off = await el.offset();
    log('home-section-gap offset (should be BELOW invite banner):', JSON.stringify(off));
  } else {
    log('home-section-gap NOT FOUND');
  }
  await mp.pageScrollTo(99999);
  await sleep(1500);
  await mp.screenshot({ path: OUT + '05-invite-banner-bottom.png' });

  // ---------- Issue 6: 关系动态 4 格点击 ----------
  log('=== Issue 6: relation 4 cells tap ===');
  const relEl = await page.$('.home-page >>> .relation-activity');
  if (relEl) {
    const relOff = await relEl.offset();
    await mp.pageScrollTo(Math.max(0, relOff.top - 80));
    await sleep(1200);
  }
  const cells = await page.$$('.home-page >>> .relation-cell');
  log('relation cells count:', cells.length);
  const expected = ['likes/visitors页', '消息页(chat tab)', '我的访客页', '喜欢页'];
  for (let i = 0; i < cells.length; i++) {
    await cells[i].tap();
    await sleep(2500);
    const cur = await mp.currentPage();
    const curPath = cur && cur.path;
    log(`cell[${i}] tap -> currentPage: ${curPath} (期望: ${expected[i]})`);
    await mp.screenshot({ path: OUT + `06-cell${i + 1}-after-tap.png` });
    if (curPath && !curPath.includes('pages/home')) {
      try {
        await mp.navigateBack();
      } catch (e) {
        try { await mp.switchTab('/pages/home/index'); } catch (e2) { await mp.reLaunch('/pages/home/index'); }
      }
      await sleep(1800);
    }
  }
  // 回到首页顶部
  await mp.pageScrollTo(0);
  await sleep(800);

  log('=== console errors collected:', consoleErrors.length, '===');
  consoleErrors.slice(0, 20).forEach((e, i) => log(`[console-err ${i}]`, e));

  await mp.disconnect();
  log('DONE');
}

main().catch((e) => {
  console.error('[qa] FATAL', e);
  process.exit(1);
});

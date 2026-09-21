/**
 * QA driver v3 — 最终版：$vm.$children 组件实例驱动 + 截图取证
 * 六项修复回归（bugfix-20260904）
 */
const automator = require('D:/6/恋爱小程序/apps/client/node_modules/miniprogram-automator');
const MiniProgram = require('D:/6/恋爱小程序/apps/client/node_modules/miniprogram-automator/out/MiniProgram').default;
if (MiniProgram && MiniProgram.prototype) MiniProgram.prototype.checkVersion = async function () {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = 'D:/6/恋爱小程序/截图存档/bugfix-20260904/';
const log = (...a) => console.log('[qa]', ...a);

async function main() {
  const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' });
  const consoleErrors = [];
  mp.on('console', (m) => {
    const txt = (m.args || []).map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
    if (m.type === 'error') consoleErrors.push(txt.slice(0, 300));
  });

  async function ensureHome() {
    let p = await mp.currentPage();
    if (!p || p.path !== 'pages/home/index') {
      await mp.reLaunch('/pages/home/index');
      await sleep(3500);
      p = await mp.currentPage();
    }
    return p;
  }
  async function backHome() {
    const cur = await mp.currentPage();
    if (cur && cur.path === 'pages/home/index') return cur;
    try { await mp.navigateBack(); await sleep(1800); } catch (e) {
      try { await mp.switchTab('/pages/home/index'); await sleep(1800); }
      catch (e2) { await mp.reLaunch('/pages/home/index'); await sleep(2500); }
    }
    let p = await mp.currentPage();
    if (p && p.path !== 'pages/home/index') { await mp.reLaunch('/pages/home/index'); await sleep(2500); p = await mp.currentPage(); }
    return p;
  }

  let page = await ensureHome();
  log('page:', page.path);
  await sleep(1500);
  await mp.pageScrollTo(0);
  await sleep(800);

  // 拿组件实例
  const kids = await mp.evaluate(() => {
    const p = getCurrentPages().find((x) => x.route === 'pages/home/index');
    return (p.$vm.$children || []).map((k) => {
      const t = (k.$ && k.$.type) || {};
      return t.__name || t.name || 'anon';
    });
  });
  log('children:', JSON.stringify(kids));

  async function getChild(name) {
    const handle = await mp.evaluate((nm) => {
      const p = getCurrentPages().find((x) => x.route === 'pages/home/index');
      const kid = (p.$vm.$children || []).find((k) => ((k.$ && k.$.type && (k.$.type.__name || k.$.type.name)) === nm));
      if (!kid) return false;
      globalThis.__qaKid = kid;
      return true;
    }, name);
    return handle;
  }

  // ============ Issue 1: 位置弹框 ============
  log('=== Issue 1: location bottom sheet ===');
  if (await getChild('HomeHeader')) {
    await mp.evaluate(() => { globalThis.__qaKid.$emit('schoolTap'); });
    log('emitted schoolTap');
    await sleep(2500);
    await mp.screenshot({ path: OUT + '01-1-sheet-open-tabbar-hidden.png' });
    // 底部 footer 按钮是页面作用域（slot 内容），可直接查询与点击
    const btns = await page.$$('.location-sheet__btn');
    log('footer buttons visible count:', btns.length);
    for (const b of btns) {
      const sz = await b.size().catch(() => null);
      log('  btn size:', JSON.stringify(sz));
    }
    if (btns.length >= 2) {
      await btns[1].tap();
      log('tapped 我知道了');
      await sleep(1500);
    }
    await mp.screenshot({ path: OUT + '01-2-sheet-closed-tabbar-restored.png' });
  } else {
    log('HomeHeader instance NOT FOUND');
  }

  // ============ Issue 2: 关系动态吉祥物截图 ============
  log('=== Issue 2: mascots ===');
  page = await ensureHome();
  await mp.pageScrollTo(400);
  await sleep(1200);
  await mp.screenshot({ path: OUT + '02-relation-mascots.png' });

  // ============ Issue 3: 兴趣推荐 ============
  log('=== Issue 3: interest covers ===');
  await mp.pageScrollTo(700);
  await sleep(1200);
  await mp.screenshot({ path: OUT + '03-interest-covers.png' });

  // ============ Issue 4: 附近的人 ============
  log('=== Issue 4: nearby avatars ===');
  await mp.pageScrollTo(950);
  await sleep(1200);
  await mp.screenshot({ path: OUT + '04-nearby-avatars.png' });
  // 信息条点击（NearbyPeople $emit('more') 与信息条 tap 同链路）
  if (await getChild('NearbyPeople')) {
    await mp.evaluate(() => { globalThis.__qaKid.$emit('more'); });
    log('emitted NearbyPeople more');
    await sleep(2500);
    const cur = await mp.currentPage();
    log('after nearby-bar tap currentPage:', cur && cur.path);
    await mp.screenshot({ path: OUT + '04-2-nearby-bar-tapped.png' });
    page = await backHome();
    log('back:', page.path);
  }

  // ============ Issue 5: 邀请 banner ============
  log('=== Issue 5: invite banner ===');
  await mp.pageScrollTo(99999);
  await sleep(1200);
  await mp.screenshot({ path: OUT + '05-invite-banner-bottom.png' });

  // ============ Issue 6: 4 格点击 ============
  log('=== Issue 6: relation 4 cells ===');
  page = await ensureHome();
  await mp.pageScrollTo(400);
  await sleep(1000);
  const evts = ['liked-by', 'whispers', 'visitors', 'matches'];
  const expect = ['喜欢与访客页', '消息页(chat tab)', '我的访客页', '喜欢页'];
  if (await getChild('RelationActivity')) {
    for (let i = 0; i < evts.length; i++) {
      await mp.evaluate((ev) => { globalThis.__qaKid.$emit(ev); }, evts[i]);
      await sleep(2500);
      const cur = await mp.currentPage();
      log(`cell[${i}] ${evts[i]} -> currentPage: ${cur && cur.path} (期望: ${expect[i]})`);
      await mp.screenshot({ path: OUT + `06-cell${i + 1}-${evts[i]}.png` });
      page = await backHome();
      await mp.pageScrollTo(400);
      await sleep(800);
      await getChild('RelationActivity'); // reLaunch 后需重新挂句柄
    }
  }

  log('=== console errors:', consoleErrors.length, '===');
  consoleErrors.slice(0, 15).forEach((e, i) => log(`[err ${i}]`, e));
  await mp.disconnect();
  log('DONE');
}
main().catch((e) => { console.error('[qa] FATAL', e); process.exit(1); });

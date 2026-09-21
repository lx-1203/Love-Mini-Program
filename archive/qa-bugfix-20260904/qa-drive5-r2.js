/**
 * QA driver v5 — 第 2 轮定点回归
 * 重点：Issue 6 四格跳转 + console 无 "does not have a method"
 * 快照复核：Issue 1/2/3/4/5 无回归
 */
const automator = require('D:/6/恋爱小程序/apps/client/node_modules/miniprogram-automator');
const MiniProgram = require('D:/6/恋爱小程序/apps/client/node_modules/miniprogram-automator/out/MiniProgram').default;
if (MiniProgram && MiniProgram.prototype) MiniProgram.prototype.checkVersion = async function () {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = 'D:/6/恋爱小程序/截图存档/bugfix-20260904/round2-';
const log = (...a) => console.log('[qa]', ...a);

async function main() {
  const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' });
  const consoleErrors = [];
  mp.on('console', (m) => {
    const txt = (m.args || []).map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
    if (m.type === 'error' || m.type === 'warn') consoleErrors.push(`[${m.type}] ${txt.slice(0, 240)}`);
  });

  // 模拟器刚 refresh，等编译加载
  await sleep(8000);
  let page = await mp.currentPage();
  log('page after refresh:', page && page.path);
  if (!page || page.path !== 'pages/home/index') {
    await mp.reLaunch('/pages/home/index');
    await sleep(4000);
    page = await mp.currentPage();
  }
  log('home ready:', page.path);
  await sleep(2000);
  await mp.pageScrollTo(0);
  await sleep(800);

  async function getKid(name) {
    return mp.evaluate((nm) => {
      const p = getCurrentPages().find((x) => x.route === 'pages/home/index');
      if (!p) return false;
      const kid = (p.$vm.$children || []).find((k) => ((k.$ && k.$.type && (k.$.type.__name || k.$.type.name)) === nm));
      if (!kid) return false;
      globalThis.__qaKid = kid;
      return true;
    }, name);
  }

  // ===== Issue 6: 4 格逐个回归（6s 轮询跳转） =====
  log('=== R2 Issue 6: relation 4 cells ===');
  const evts = ['liked-by', 'whispers', 'visitors', 'matches'];
  const expectPaths = ['likes-visitors(喜欢与访客)', 'messages(消息tab)', 'profile/visitors(我的访客)', 'likes(喜欢页)'];
  const cellResults = [];
  for (let i = 0; i < evts.length; i++) {
    const got = await getKid('RelationActivity');
    if (!got) { log('RelationActivity handle lost, reLaunch'); await mp.reLaunch('/pages/home/index'); await sleep(3000); await mp.pageScrollTo(400); await sleep(800); if (!(await getKid('RelationActivity'))) break; }
    await mp.evaluate((ev) => { globalThis.__qaKid.$emit(ev); }, evts[i]);
    let dest = null;
    for (let j = 0; j < 6; j++) {
      await sleep(1000);
      const cur = await mp.currentPage();
      if (cur && cur.path !== 'pages/home/index') { dest = cur.path; break; }
    }
    cellResults.push({ evt: evts[i], dest });
    log(`cell[${i}] ${evts[i]} -> ${dest || 'STAYED HOME'} (期望: ${expectPaths[i]})`);
    await mp.screenshot({ path: OUT + `06-cell${i + 1}-${evts[i]}.png` });
    if (dest) {
      const cur = await mp.currentPage();
      let back = false;
      try { await mp.navigateBack(); await sleep(1800); back = true; } catch (e) {}
      let p = await mp.currentPage();
      if (p && p.path === 'pages/home/index') { /* ok */ }
      else { try { await mp.switchTab('/pages/home/index'); await sleep(1800); } catch (e) { await mp.reLaunch('/pages/home/index'); await sleep(2500); } }
    } else {
      await mp.reLaunch('/pages/home/index'); await sleep(2500);
    }
    await mp.pageScrollTo(400); await sleep(600);
  }

  // ===== 无回归快照 =====
  log('=== R2 sanity: other 5 items ===');
  await mp.pageScrollTo(0); await sleep(800);

  // Issue 1
  if (await getKid('HomeHeader')) {
    await mp.evaluate(() => { globalThis.__qaKid.$emit('schoolTap'); });
    await sleep(2200);
    const btns = await page.$$('.location-sheet__btn');
    log('Issue1 sheet buttons:', btns.length);
    await mp.screenshot({ path: OUT + '01-sheet-open.png' });
    if (btns.length >= 2) { await btns[1].tap(); await sleep(1400); }
    await mp.screenshot({ path: OUT + '01-sheet-closed.png' });
  }
  // Issue 2/3/4/5 截图
  await mp.pageScrollTo(400); await sleep(1200);
  await mp.screenshot({ path: OUT + '02-mascots.png' });
  await mp.pageScrollTo(700); await sleep(1200);
  await mp.screenshot({ path: OUT + '03-interest.png' });
  await mp.pageScrollTo(950); await sleep(1200);
  await mp.screenshot({ path: OUT + '04-nearby.png' });
  if (await getKid('NearbyPeople')) {
    await mp.evaluate(() => { globalThis.__qaKid.$emit('more'); });
    let dest = null;
    for (let j = 0; j < 8; j++) { await sleep(1000); const cur = await mp.currentPage(); if (cur && cur.path !== 'pages/home/index') { dest = cur.path; break; } }
    log('Issue4 nearby nav:', dest || 'STAYED');
    await mp.screenshot({ path: OUT + '04-nearby-nav.png' });
    if (dest) { try { await mp.navigateBack(); await sleep(1800); } catch (e) { await mp.reLaunch('/pages/home/index'); await sleep(2500); } }
  }
  let p2 = await mp.currentPage();
  if (!p2 || p2.path !== 'pages/home/index') { await mp.reLaunch('/pages/home/index'); await sleep(3000); }
  await mp.pageScrollTo(99999); await sleep(1200);
  await mp.screenshot({ path: OUT + '05-invite.png' });

  const methodWarn = consoleErrors.filter((e) => e.includes('does not have a method'));
  log('=== "does not have a method" warnings:', methodWarn.length, '===');
  methodWarn.forEach((w) => log(w));
  log('=== all console warn/err:', consoleErrors.length, '===');
  consoleErrors.slice(0, 12).forEach((e, i) => log(`[${i}]`, e));
  log('=== cell results:', JSON.stringify(cellResults));
  await mp.disconnect();
  log('DONE');
}
main().catch((e) => { console.error('[qa] FATAL', e); process.exit(1); });

/**
 * QA driver v4 — 复测：Issue 4 导航（长等待）+ Issue 6 用真实 tap 语义复测。
 * 另测 NEARBY.PEOPLE 页面本身能否打开（区分环境问题/源码问题）。
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
    if (m.type === 'error' || m.type === 'warn') consoleErrors.push(`[${m.type}] ${txt.slice(0, 240)}`);
  });

  // A. 直接打开附近列表页（验证目标页面本身可加载性 = 排除环境因素）
  log('--- A. direct open /subpackages/discover-extra/nearby/people ---');
  try {
    await mp.reLaunch('/subpackages/discover-extra/nearby/people');
    await sleep(6000);
    let p = await mp.currentPage();
    log('currentPage after reLaunch:', p && p.path);
    await mp.screenshot({ path: OUT + '07-nearby-people-page-direct.png' });
  } catch (e) { log('direct open ERR:', e.message); }
  // 回首页
  await mp.reLaunch('/pages/home/index');
  await sleep(3000);

  // B. Issue 4: NearbyPeople emit more → 8s 长等待观察跳转
  log('--- B. Issue 4: nearby bar emit more, 8s wait ---');
  await mp.pageScrollTo(950);
  await sleep(800);
  const ok = await mp.evaluate(() => {
    const p = getCurrentPages().find((x) => x.route === 'pages/home/index');
    const kid = (p.$vm.$children || []).find((k) => ((k.$ && k.$.type && (k.$.type.__name || k.$.type.name)) === 'NearbyPeople'));
    if (!kid) return false;
    globalThis.__qaKid = kid;
    return true;
  });
  log('NearbyPeople handle:', ok);
  if (ok) {
    await mp.evaluate(() => { globalThis.__qaKid.$emit('more'); });
    // 轮询 8s 看是否离开首页
    let dest = null;
    for (let i = 0; i < 8; i++) {
      await sleep(1000);
      const cur = await mp.currentPage();
      if (cur && cur.path !== 'pages/home/index') { dest = cur.path; break; }
    }
    log('issue4 nav result:', dest || 'STAYED ON HOME');
    const cur = await mp.currentPage();
    await mp.screenshot({ path: OUT + '04-3-nearby-bar-after-8s.png' });
    if (dest) { try { await mp.navigateBack(); await sleep(1500); } catch (e) {} }
  }

  // C. Issue 6 复测：逐个 emit，每个等 6s
  log('--- C. Issue 6 cells, 6s wait each ---');
  await mp.reLaunch('/pages/home/index');
  await sleep(3000);
  const evts = ['liked-by', 'whispers', 'visitors', 'matches'];
  for (let i = 0; i < evts.length; i++) {
    const got = await mp.evaluate((nm) => {
      const p = getCurrentPages().find((x) => x.route === 'pages/home/index');
      const kid = (p.$vm.$children || []).find((k) => ((k.$ && k.$.type && (k.$.type.__name || k.$.type.name)) === nm));
      if (!kid) return false;
      globalThis.__qaKid = kid;
      return true;
    }, 'RelationActivity');
    if (!got) { log('RelationActivity handle lost'); break; }
    await mp.evaluate((ev) => { globalThis.__qaKid.$emit(ev); }, evts[i]);
    let dest = null;
    for (let j = 0; j < 6; j++) {
      await sleep(1000);
      const cur = await mp.currentPage();
      if (cur && cur.path !== 'pages/home/index') { dest = cur.path; break; }
    }
    log(`cell[${i}] ${evts[i]} -> ${dest || 'STAYED ON HOME (无跳转、无 toast 截获)'}`);
    await mp.screenshot({ path: OUT + `06-cell${i + 1}-${evts[i]}-retest.png` });
    if (dest) { try { await mp.navigateBack(); await sleep(1500); } catch (e) { await mp.reLaunch('/pages/home/index'); await sleep(2500); } }
  }

  log('=== console warn/err:', consoleErrors.length, '===');
  consoleErrors.slice(0, 20).forEach((e, i) => log(`[${i}]`, e));
  await mp.disconnect();
  log('DONE');
}
main().catch((e) => { console.error('[qa] FATAL', e); process.exit(1); });

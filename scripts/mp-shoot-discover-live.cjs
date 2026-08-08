/* eslint-disable no-console */
/**
 * 匹配 Tab 真实登录 + 真实交互走查截图（2026-08-08 v4 · live 轮）。
 *
 * 与 mp-shoot-discover.cjs（AUTOSHOT 钩子轮）的区别：
 *   - 真实登录：登录页点「临时体验号」按钮（POST /auth/guest-login 真实链路），
 *     不注入 token；
 *   - 真实交互：automator Element.tap / touchstart / touchmove / touchend /
 *     scrollTo 驱动卡片滑动、详情打开、弹窗打开；
 *   - 截图目录：截图存档/2026-08-08-5/client-live/
 *
 * 运行：node scripts/mp-shoot-discover-live.cjs（Node 22）
 */
const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
const fs = require('fs');
const path = require('path');

const WS_ENDPOINT = 'ws://127.0.0.1:9420';
const OUT_DIR = 'D:\\6\\恋爱小程序\\截图存档\\2026-08-08-5\\client-live';

const errors = [];
const results = [];

function ts() {
  return new Date().toISOString().replace('T', ' ').substring(0, 23);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let miniProgram = null;

/** 截图（失败时重连重试一次——automator 0.12.1 与 IDE 偶发协议超时） */
async function shot(mp, name) {
  const shotPath = path.join(OUT_DIR, `${name}.png`);
  try {
    await mp.screenshot({ path: shotPath });
  } catch (e) {
    console.log(`[WARN] ${name} screenshot fail: ${e.message}, retrying...`);
    try { await mp.disconnect(); } catch (_e) { /* ignore */ }
    await sleep(3000);
    miniProgram = await automator.connect({ wsEndpoint: WS_ENDPOINT });
    await sleep(3000);
    await miniProgram.callWxMethod('reLaunch', { url: '/pages/discover/index' });
    await sleep(6000);
    await miniProgram.screenshot({ path: shotPath });
  }
  const size = fs.statSync(shotPath).size;
  console.log(`[OK] ${name} (${size}B)`);
  results.push({ name, ok: true, size });
  return size;
}

/** 按文本模糊查找可点击元素并 tap */
async function tapByText(page, text, selectors = 'view, button, text') {
  const els = await page.$$(selectors);
  for (const el of els) {
    const t = await el.text().catch(() => '');
    if (String(t).includes(text)) {
      await el.tap();
      return true;
    }
  }
  return false;
}

/** 在卡片上模拟一次左右滑动（touchstart → touchmove → touchend） */
async function swipeCard(page, direction) {
  const card = await page.$('.card--current').catch(() => null);
  if (!card) { console.log('[WARN] no .card--current found'); return false; }
  const { width, height } = await card.size().catch(() => ({ width: 300, height: 400 }));
  const y = Math.floor(height / 2);
  const x0 = Math.floor(width / 2);
  const x1 = direction === 'left' ? 30 : width - 30;
  const touch = (el, type, x, y) => el[type]({ touches: [{ x, y }], changedTouches: [{ x, y }] });
  await touch(card, 'touchstart', x0, y);
  await sleep(120);
  await touch(card, 'touchmove', (x0 + x1) / 2, y);
  await sleep(120);
  await touch(card, 'touchmove', x1, y);
  await sleep(120);
  await touch(card, 'touchend', x1, y);
  await sleep(1500);
  return true;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log(`[${ts()}] connecting ${WS_ENDPOINT} ...`);
  const mp = await automator.connect({ wsEndpoint: WS_ENDPOINT });
  console.log('connected');

  mp.on('console', (msg) => {
    if (!msg || msg.type !== 'error') return;
    const text = String((msg.args || []).map((a) => {
      if (typeof a === 'string') return a;
      if (a && a.value !== undefined) return String(a.value);
      return JSON.stringify(a);
    }).join(' ')).slice(0, 300);
    errors.push({ time: ts(), type: 'console', text });
  });
  mp.on('exception', (err) => {
    errors.push({ time: ts(), type: 'exception', text: (err && err.message ? err.message : String(err)).slice(0, 300) });
  });

  await sleep(3000);

  // ---------- 1. 清 token → 登录页 ----------
  await mp.callWxMethod('removeStorage', { key: 'token' });
  await mp.callWxMethod('removeStorage', { key: 'refreshToken' });
  await mp.callWxMethod('reLaunch', { url: '/pages/login/index' });
  await sleep(6000);
  console.log('=== 登录页 ===');
  await shot(mp, 'l1-login');

  // ---------- 2. 真实登录：点「临时体验号」按钮（.btn-guest） ----------
  let page = await mp.currentPage();
  console.log('page:', page.path);
  let tapped = false;
  const guestBtn = await page.$('.btn-guest').catch(() => null);
  if (guestBtn) {
    await guestBtn.tap().catch((e) => console.log('[WARN] guest btn tap:', e.message));
    tapped = true;
  } else {
    tapped = await tapByText(page, '临时体验号');
  }
  console.log('临时体验号 tapped:', tapped);
  await sleep(10000);
  await shot(mp, 'l2-after-login');

  // 验证登录：匹配页（登录后默认跳匹配页）
  page = await mp.currentPage();
  console.log('after login page:', page.path);
  if (page.path.includes('login')) {
    console.log('[WARN] still on login page, guest login may have failed');
  }

  // ---------- 3. 匹配主页（真实数据） ----------
  await shot(mp, 'l3-discover');
  // 今日剩余次数 / 筛选栏 / 卡片 / 底部三键

  // ---------- 4. 真实滑动：左滑（不喜欢） ----------
  await swipeCard(page, 'left');
  await shot(mp, 'l4-after-left-swipe');

  // ---------- 5. 真实滑动：右滑（喜欢） ----------
  await swipeCard(page, 'right');
  await sleep(1000);
  await shot(mp, 'l5-after-right-swipe');

  // ---------- 6. 点击卡片 → 详情弹层（顶部） ----------
  const card = await page.$('.card--current').catch(() => null);
  if (card) {
    await card.tap().catch((e) => console.log('[WARN] card tap:', e.message));
    await sleep(3500);
    await shot(mp, 'l6-detail-top');
  }

  // ---------- 7. 详情滚动：关于我 → 兴趣圈 → 动态 → 期待画像 ----------
  const detailScroll = await page.$('.detail-scroll').catch(() => null);
  if (detailScroll) {
    for (const [name, top] of [['l7-detail-basic', 600], ['l8-detail-circles', 1200], ['l9-detail-moments', 1900], ['l10-detail-expected', 2500]]) {
      await detailScroll.scrollTo({ top, duration: 300 }).catch((e) => console.log('[WARN] scroll:', e.message));
      await sleep(1200);
      await shot(mp, name);
    }
    // 关闭详情（下滑手势或点关闭）
    const closeBtn = await page.$('.detail-topbar__close, [class*=close]').catch(() => null);
    if (closeBtn) { await closeBtn.tap().catch(() => {}); }
    await sleep(2000);
  }

  // ---------- 8. 签到弹窗（真实点击入口） ----------
  const checkinEntry = await page.$('.checkin-entry').catch(() => null);
  if (checkinEntry) {
    await checkinEntry.tap().catch((e) => console.log('[WARN] checkin tap:', e.message));
    await sleep(2500);
    await shot(mp, 'l11-checkin-popup');
    // 关闭弹窗
    const closeAll = await page.$$('[class*=close], [class*=mask]').catch(() => []);
    for (const c of closeAll.slice(0, 3)) { await c.tap().catch(() => {}); }
    await sleep(1500);
  }

  // ---------- 9. 快捷筛选弹窗 ----------
  const filterChip = await page.$('.filter-chip--quick').catch(() => null);
  if (filterChip) {
    await filterChip.tap().catch((e) => console.log('[WARN] filter tap:', e.message));
    await sleep(2500);
    await shot(mp, 'l12-filter-popup');
    const closeAll2 = await page.$$('[class*=close], [class*=mask]').catch(() => []);
    for (const c of closeAll2.slice(0, 3)) { await c.tap().catch(() => {}); }
    await sleep(1500);
  }

  // ---------- 10. 关键链路页 ----------
  for (const [name, route] of [['l13-history', '/pages/discover/history'], ['l14-likes', '/pages/likes/index'], ['l15-messages', '/pages/messages/index'], ['l16-profile', '/pages/profile/index']]) {
    await mp.callWxMethod('reLaunch', { url: route });
    await sleep(8000);
    await shot(mp, name);
  }

  fs.writeFileSync(path.join(OUT_DIR, '_run-errors.json'), JSON.stringify({ errors, ts: ts() }, null, 2), 'utf-8');
  fs.writeFileSync(path.join(OUT_DIR, '_run-results.json'), JSON.stringify({ results, ts: ts() }, null, 2), 'utf-8');
  console.log(`\n===== 汇总: ${results.length} OK, console errors ${errors.length} =====`);
  for (const e of errors.slice(0, 10)) {
    console.log(`  ${e.time} [${e.type}] ${e.text.slice(0, 120)}`);
  }
}

main().catch((e) => {
  console.error(`[FATAL] ${e.message}`);
  process.exit(1);
});

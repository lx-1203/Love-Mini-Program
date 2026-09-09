/** Issue 1 focused: open location sheet, verify tabBar hidden + buttons visible */
const automator = require('D:/6/恋爱小程序/apps/client/node_modules/miniprogram-automator');
const MiniProgram = require('D:/6/恋爱小程序/apps/client/node_modules/miniprogram-automator/out/MiniProgram').default;
if (MiniProgram && MiniProgram.prototype) MiniProgram.prototype.checkVersion = async function () {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = 'D:/6/恋爱小程序/截图存档/bugfix-20260904/';

async function main() {
  const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' });
  const logs = [];
  mp.on('console', (m) => logs.push(`[${m.type}] ${(m.args || []).map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ').slice(0, 200)}`));
  let page = await mp.currentPage();
  console.log('page:', page.path);
  if (page.path !== 'pages/home/index') { await mp.reLaunch('/pages/home/index'); await sleep(3000); page = await mp.currentPage(); }

  const loc = await page.$('.home-page >>> .header-location');
  console.log('header-location matched:', !!loc);
  if (!loc) process.exit(1);
  try { console.log('offset:', JSON.stringify(await loc.offset()), 'size:', JSON.stringify(await loc.size())); } catch (e) { console.log('offset err', e.message); }

  await loc.tap();
  console.log('tapped, polling for sheet...');
  let opened = false;
  for (let i = 0; i < 10; i++) {
    await sleep(400);
    const sheet = await page.$('.bottom-sheet-root');
    if (sheet) { opened = true; console.log(`sheet visible at poll ${i}`); break; }
  }
  console.log('sheet opened:', opened);
  await mp.screenshot({ path: OUT + '01-1-sheet-open-tabbar-hidden.png' });
  if (opened) {
    await sleep(800);
    const btns = await page.$$('.location-sheet__btn');
    console.log('footer buttons:', btns.length);
    // 截图后点我知道了
    if (btns.length >= 2) {
      await btns[1].tap();
      console.log('tapped 我知道了');
      await sleep(1200);
      const after = await page.$('.bottom-sheet-root');
      console.log('sheet after close:', !!after);
      await mp.screenshot({ path: OUT + '01-2-sheet-closed-tabbar-restored.png' });
    }
  }
  console.log('--- console logs during run ---');
  logs.slice(-15).forEach((l) => console.log(l));
  await mp.disconnect();
}
main().catch((e) => { console.error('FATAL', e); process.exit(1); });

const automator = require('D:/6/恋爱小程序/apps/client/node_modules/miniprogram-automator');
const MiniProgram = require('D:/6/恋爱小程序/apps/client/node_modules/miniprogram-automator/out/MiniProgram').default;
if (MiniProgram && MiniProgram.prototype) MiniProgram.prototype.checkVersion = async function () {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' });
  const page = await mp.currentPage();
  console.log('page:', page.path);
  for (const sel of ['home-header', 'relation-activity', '.home-page', 'view', '.home-section-gap', 'bottom-sheet', 'home-header >>> .header-location']) {
    try {
      const el = await page.$(sel);
      console.log(sel, '=>', el ? 'FOUND' : 'null');
      if (el) {
        try { console.log('  size:', JSON.stringify(await el.size()), 'offset:', JSON.stringify(await el.offset())); } catch (e) { console.log('  size/offset err:', e.message); }
      }
    } catch (e) {
      console.log(sel, '=> ERROR', e.message);
    }
  }
  const views = await page.$$('view');
  console.log('total view count:', views.length);
  const all = await page.$$('relation-activity');
  console.log('$$relation-activity:', all.length);
  await mp.disconnect();
}
main().catch((e) => { console.error('FATAL', e); process.exit(1); });

const automator = require('D:/6/恋爱小程序/apps/client/node_modules/miniprogram-automator');
const MiniProgram = require('D:/6/恋爱小程序/apps/client/node_modules/miniprogram-automator/out/MiniProgram').default;
if (MiniProgram && MiniProgram.prototype) MiniProgram.prototype.checkVersion = async function () {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' });
  const page = await mp.currentPage();
  console.log('page:', page.path);
  const tries = [
    'home-header', 'HOME-HEADER', '.header-location',
    'home-header>>>.header-location', 'home-header >>> .header-location',
    'page >>> .header-location', '.home-page >>> .header-location',
    '.relation-activity', '.relation-cell', '.interest-card__cover',
    '.nearby-item__avatar-wrap', '.invite-banner', '.location-sheet__btn',
  ];
  for (const sel of tries) {
    try {
      const el = await page.$(sel);
      console.log(JSON.stringify(sel), '=>', el ? 'FOUND' : 'null');
    } catch (e) { console.log(JSON.stringify(sel), 'ERR', e.message.slice(0, 80)); }
  }
  await mp.disconnect();
}
main().catch((e) => { console.error('FATAL', e); process.exit(1); });

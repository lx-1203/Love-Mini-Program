const automator = require('D:/6/恋爱小程序/apps/client/node_modules/miniprogram-automator');
const MiniProgram = require('D:/6/恋爱小程序/apps/client/node_modules/miniprogram-automator/out/MiniProgram').default;
if (MiniProgram && MiniProgram.prototype) MiniProgram.prototype.checkVersion = async function () {};
async function main() {
  const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' });
  const page = await mp.currentPage();
  const tries = [
    'view', 'image', 'text', '.home-header', '.home-header__title',
    'home-header >>> .home-header', '.home-page >>> .home-header__title',
    '.home-page >>> view', '.home-page >>> text',
    '.location-sheet__btn', '.invite-banner__btn-text',
  ];
  for (const sel of tries) {
    try {
      const els = await page.$$(sel);
      const first = els[0];
      let extra = '';
      if (first) { try { extra = ' size=' + JSON.stringify(await first.size()); } catch (e) { extra = ' sizeErr'; } }
      console.log(JSON.stringify(sel), '=>', els.length, extra);
    } catch (e) { console.log(JSON.stringify(sel), 'ERR', e.message.slice(0, 60)); }
  }
  await mp.disconnect();
}
main().catch((e) => { console.error('FATAL', e); process.exit(1); });

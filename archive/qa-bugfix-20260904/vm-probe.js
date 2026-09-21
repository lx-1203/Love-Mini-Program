/** Probe $vm access from appservice evaluate */
const automator = require('D:/6/恋爱小程序/apps/client/node_modules/miniprogram-automator');
const MiniProgram = require('D:/6/恋爱小程序/apps/client/node_modules/miniprogram-automator/out/MiniProgram').default;
if (MiniProgram && MiniProgram.prototype) MiniProgram.prototype.checkVersion = async function () {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' });
  const page = await mp.currentPage();
  console.log('page:', page.path);
  // appPageStack
  const stack = await mp.evaluate(() => getCurrentPages().map((p) => p.route));
  console.log('pageStack:', JSON.stringify(stack));

  const info = await mp.evaluate(() => {
    const p = getCurrentPages().find((x) => x.route === 'pages/home/index');
    if (!p) return { err: 'no home page' };
    const vm = p.$vm;
    const out = { hasVm: !!vm, setupStateKeys: [] };
    try {
      if (vm && vm.setupState) out.setupStateKeys = Object.keys(vm.setupState).slice(0, 60);
    } catch (e) { out.ssErr = e.message; }
    try { out.hasOpenLocationSheet = typeof vm.openLocationSheet; } catch (e) {}
    return out;
  });
  console.log('vm info:', JSON.stringify(info).slice(0, 800));
  await mp.disconnect();
}
main().catch((e) => { console.error('FATAL', e); process.exit(1); });

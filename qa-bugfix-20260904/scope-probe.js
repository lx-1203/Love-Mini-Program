const automator = require('D:/6/恋爱小程序/apps/client/node_modules/miniprogram-automator');
const MiniProgram = require('D:/6/恋爱小程序/apps/client/node_modules/miniprogram-automator/out/MiniProgram').default;
if (MiniProgram && MiniProgram.prototype) MiniProgram.prototype.checkVersion = async function () {};
async function main() {
  const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' });
  const r = await mp.evaluate(() => {
    const p = getCurrentPages().find((x) => x.route === 'pages/home/index');
    const out = {};
    const scope = p.$scope || p;
    out.hasScope = !!scope;
    try {
      const hh = scope.selectComponent('.home-header');
      out.homeHeader = hh ? 'found' : 'null';
      if (hh && hh.$vm) {
        const vm2 = hh.$vm;
        out.hhSetupKeys = vm2.$.setupState ? Object.keys(vm2.$.setupState).slice(0, 40) : 'empty';
        out.hhEmits = typeof vm2.$emit;
      } else if (hh) {
        out.hhNoVm = Object.keys(hh).slice(0, 20);
        out.hhData = typeof hh.data;
      }
    } catch (e) { out.e1 = e.message; }
    try {
      const rs = scope.selectComponent('.relation-activity');
      out.relation = rs ? 'found' : 'null';
      if (rs && rs.$vm) out.relSetup = rs.$vm.$.setupState ? Object.keys(rs.$vm.$.setupState).slice(0, 30) : 'empty';
    } catch (e) { out.e2 = e.message; }
    try {
      const bs = scope.selectComponent('.bottom-sheet');
      out.bottomSheet = bs ? 'found' : 'null';
      if (bs && bs.$vm) out.bsSetup = bs.$vm.$.setupState ? Object.keys(bs.$vm.$.setupState).slice(0, 30) : 'empty';
    } catch (e) { out.e3 = e.message; }
    try {
      const np = scope.selectComponent('.nearby-people');
      out.nearby = np ? 'found' : 'null';
      if (np && np.$vm) out.npSetup = np.$vm.$.setupState ? Object.keys(np.$vm.$.setupState).slice(0, 30) : 'empty';
    } catch (e) { out.e4 = e.message; }
    try {
      const ir = scope.selectComponent('.interest-recommendation');
      out.interest = ir ? 'found' : 'null';
    } catch (e) { out.e5 = e.message; }
    return out;
  });
  console.log(JSON.stringify(r, null, 1));
  await mp.disconnect(); process.exit(0);
}
main().catch((e) => { console.error('FATAL', e && e.message); process.exit(1); });

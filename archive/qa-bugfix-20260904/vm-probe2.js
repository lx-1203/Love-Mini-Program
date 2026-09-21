/** Deep probe of vm internals to find a way to trigger sheet / handlers */
const automator = require('D:/6/恋爱小程序/apps/client/node_modules/miniprogram-automator');
const MiniProgram = require('D:/6/恋爱小程序/apps/client/node_modules/miniprogram-automator/out/MiniProgram').default;
if (MiniProgram && MiniProgram.prototype) MiniProgram.prototype.checkVersion = async function () {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' });
  const info = await mp.evaluate(() => {
    const p = getCurrentPages().find((x) => x.route === 'pages/home/index');
    const vm = p.$vm;
    const out = {};
    out.vmType = vm && vm.$ ? 'comp' : typeof vm;
    try { out.ctxKeys = Object.keys(vm.$ctx || {}).slice(0, 40); } catch (e) {}
    try { out.proxyKeys = Object.keys(vm).slice(0, 40); } catch (e) { out.proxyErr = e.message; }
    try {
      const sub = vm.$.subTree;
      out.hasSubTree = !!sub;
    } catch (e) {}
    try { out.instanceKeys = Object.keys(vm.$).slice(0, 40); } catch (e) { out.iErr = e.message; }
    try { out.setupStateType = vm.$.setupState ? typeof vm.$.setupState : 'null'; } catch (e) {}
    try { out.setupStateKeys = vm.$.setupState ? Object.keys(vm.$.setupState).slice(0, 60) : []; } catch (e) { out.ssErr2 = e.message; }
    return out;
  });
  console.log(JSON.stringify(info, null, 1).slice(0, 1500));
  await mp.disconnect();
}
main().catch((e) => { console.error('FATAL', e); process.exit(1); });

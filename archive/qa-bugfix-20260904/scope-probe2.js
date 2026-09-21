const automator = require('D:/6/恋爱小程序/apps/client/node_modules/miniprogram-automator');
const MiniProgram = require('D:/6/恋爱小程序/apps/client/node_modules/miniprogram-automator/out/MiniProgram').default;
if (MiniProgram && MiniProgram.prototype) MiniProgram.prototype.checkVersion = async function () {};
async function main() {
  const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' });
  const r = await mp.evaluate(() => {
    const p = getCurrentPages().find((x) => x.route === 'pages/home/index');
    const scope = p.$scope || p;
    const out = {};
    for (const tag of ['home-header', 'relation-activity', 'bottom-sheet', 'nearby-people', 'interest-recommendation', 'invite-banner', 'today-recommendation-card']) {
      try {
        const el = scope.selectComponent(tag);
        out[tag] = el ? 'FOUND' : 'null';
        if (el) {
          out[tag + '_vm'] = el.$vm ? 'hasVm' : 'noVm';
          if (el.$vm && el.$vm.$ && el.$vm.$.setupState) {
            out[tag + '_setup'] = Object.keys(el.$vm.$.setupState).slice(0, 25);
          }
          if (el.$vm) { try { out[tag + '_emit'] = typeof el.$vm.$emit; } catch (e) {} }
        }
      } catch (e) { out[tag] = 'ERR ' + e.message; }
    }
    return out;
  });
  console.log(JSON.stringify(r, null, 1));
  await mp.disconnect(); process.exit(0);
}
main().catch((e) => { console.error('FATAL', e && e.message); process.exit(1); });

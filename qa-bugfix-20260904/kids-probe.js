const automator = require('D:/6/恋爱小程序/apps/client/node_modules/miniprogram-automator');
const MiniProgram = require('D:/6/恋爱小程序/apps/client/node_modules/miniprogram-automator/out/MiniProgram').default;
if (MiniProgram && MiniProgram.prototype) MiniProgram.prototype.checkVersion = async function () {};
async function main() {
  const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' });
  const r = await mp.evaluate(() => {
    const p = getCurrentPages().find((x) => x.route === 'pages/home/index');
    const vm = p.$vm;
    const out = {};
    try {
      const kids = vm.$children || [];
      out.kidsCount = kids.length;
      out.kids = kids.map((k) => {
        const t = (k.$ && k.$.type) || {};
        return {
          name: t.__name || t.name || 'anon',
          props: k.$ && k.$.props ? Object.keys(k.$.props) : [],
          emits: Array.isArray(t.emits) ? t.emits : [],
          setupKeys: (k.$ && k.$.setupState) ? Object.keys(k.$.setupState).slice(0, 20) : [],
          hasSubChildren: (k.$children || []).length,
        };
      });
    } catch (e) { out.err = e.message; }
    return out;
  });
  console.log(JSON.stringify(r, null, 1).slice(0, 3000));
  await mp.disconnect(); process.exit(0);
}
main().catch((e) => { console.error('FATAL', e && e.message); process.exit(1); });

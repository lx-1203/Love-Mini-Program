const automator = require('D:/6/恋爱小程序/apps/client/node_modules/miniprogram-automator');
const MiniProgram = require('D:/6/恋爱小程序/apps/client/node_modules/miniprogram-automator/out/MiniProgram').default;
if (MiniProgram && MiniProgram.prototype) MiniProgram.prototype.checkVersion = async function () {};
async function main() {
  const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' });
  const r = await mp.evaluate(() => {
    const p = getCurrentPages().find((x) => x.route === 'pages/home/index');
    const vm = p.$vm;
    const out = {};
    const st = vm.$.subTree;
    out.stType = st.type ? (st.type.__name || st.type.name || String(st.type).slice(0, 40)) : String(st.type);
    const ch = st.children;
    out.chType = typeof ch;
    if (ch && typeof ch === 'object' && !Array.isArray(ch)) out.chKeys = Object.keys(ch);
    if (Array.isArray(ch)) {
      out.chLen = ch.length;
      out.childDesc = ch.slice(0, 12).map((c) => (c && c.type ? (typeof c.type === 'string' ? c.type : (c.type.__name || c.type.name || 'obj')) : String(c).slice(0, 20)));
    }
    // 若 children 是对象（slots），尝试调用 default
    if (ch && typeof ch === 'object' && !Array.isArray(ch) && typeof ch.default === 'function') {
      try {
        const arr = ch.default();
        out.slotArr = Array.isArray(arr) ? arr.length : typeof arr;
        if (Array.isArray(arr)) {
          out.slotDesc = arr.slice(0, 14).map((c) => (c && c.type ? (typeof c.type === 'string' ? c.type : (c.type.__name || c.type.name || 'obj')) : String(c).slice(0, 20)));
        }
      } catch (e) { out.slotErr = e.message; }
    }
    return out;
  });
  console.log(JSON.stringify(r, null, 1));
  await mp.disconnect(); process.exit(0);
}
main().catch((e) => { console.error('FATAL', e && e.message); process.exit(1); });

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
    out.stNull = st == null;
    try {
      out.stType = st && st.type ? (typeof st.type === 'string' ? st.type : (st.type.__name || st.type.name || 'objtype')) : 'notype';
    } catch (e) { out.e1 = e.message; }
    const ch = st ? st.children : null;
    out.chNull = ch == null;
    out.chIsArr = Array.isArray(ch);
    if (ch && !Array.isArray(ch) && typeof ch === 'object') out.chKeys = Object.keys(ch);
    if (Array.isArray(ch)) out.chLen = ch.length;
    // 打印原始 JSON 片段
    try { out.stKeys = st ? Object.keys(st).slice(0, 30) : null; } catch (e) { out.e2 = e.message; }
    return out;
  });
  console.log(JSON.stringify(r, null, 1));
  await mp.disconnect(); process.exit(0);
}
main().catch((e) => { console.error('FATAL', e && e.message); process.exit(1); });

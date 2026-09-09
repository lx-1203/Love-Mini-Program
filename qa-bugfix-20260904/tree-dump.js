const automator = require('D:/6/恋爱小程序/apps/client/node_modules/miniprogram-automator');
const MiniProgram = require('D:/6/恋爱小程序/apps/client/node_modules/miniprogram-automator/out/MiniProgram').default;
if (MiniProgram && MiniProgram.prototype) MiniProgram.prototype.checkVersion = async function () {};
async function main() {
  const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' });
  const dump = await mp.evaluate(() => {
    const p = getCurrentPages().find((x) => x.route === 'pages/home/index');
    const vm = p.$vm;
    const out = [];
    function nameOf(t) {
      if (!t) return 'null';
      if (typeof t === 'string') return t;
      return t.__name || t.name || (t.__file ? t.__file.split('/').pop() : 'anon:' + (t.props ? 'props:' + JSON.stringify(t.props) : 'noProp'));
    }
    function walk(vn, depth, path) {
      if (!vn || depth > 6 || out.length > 80) return;
      out.push(path + ' d' + depth + ' ' + nameOf(vn.type) + (vn.component ? ' [COMP]' : '') + ' kids=' + (Array.isArray(vn.children) ? vn.children.length : typeof vn.children));
      if (vn.component) walk(vn.component.subTree, depth + 1, path + '/C');
      if (Array.isArray(vn.children)) vn.children.forEach((c, i) => { if (c && typeof c === 'object' && c.type) walk(c, depth + 1, path + '.' + i); });
    }
    try { walk(vm.$.subTree, 0, 'root'); } catch (e) { out.push('ERR ' + e.message); }
    return out;
  });
  dump.slice(0, 80).forEach((l) => console.log(l));
  await mp.disconnect();
}
main().catch((e) => { console.error('FATAL', e); process.exit(1); });

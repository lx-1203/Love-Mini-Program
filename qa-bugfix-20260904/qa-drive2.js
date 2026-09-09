/**
 * QA driver v2 — vnode 树驱动验证（六项修复回归）
 * 通过 appservice evaluate 深入 Vue 组件树，触发与用户 tap 等价的事件链路，
 * 并用 mp.screenshot 采集模拟器视觉证据。
 */
const automator = require('D:/6/恋爱小程序/apps/client/node_modules/miniprogram-automator');
const MiniProgram = require('D:/6/恋爱小程序/apps/client/node_modules/miniprogram-automator/out/MiniProgram').default;
if (MiniProgram && MiniProgram.prototype) MiniProgram.prototype.checkVersion = async function () {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = 'D:/6/恋爱小程序/截图存档/bugfix-20260904/';
const log = (...a) => console.log('[qa]', ...a);

async function main() {
  const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' });
  const consoleErrors = [];
  mp.on('console', (m) => {
    const txt = (m.args || []).map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
    if (m.type === 'error') consoleErrors.push(txt.slice(0, 260));
  });

  let page = await mp.currentPage();
  if (!page || page.path !== 'pages/home/index') {
    await mp.reLaunch('/pages/home/index');
    await sleep(3500);
    page = await mp.currentPage();
  }
  log('page:', page.path);
  await mp.pageScrollTo(0);
  await sleep(800);

  // ===== 诊断: subTree 状态 =====
  const diag = await mp.evaluate(() => {
    const p = getCurrentPages().find((x) => x.route === 'pages/home/index');
    const vm = p.$vm;
    const out = {};
    out.subTreeType = typeof vm.$.subTree;
    out.isMounted = vm.$.isMounted;
    out.uid = vm.$.uid;
    try {
      const kids = vm.$.subTree && vm.$.subTree.children;
      out.kidsType = Array.isArray(kids) ? 'array:' + kids.length : typeof kids;
    } catch (e) { out.kidsErr = e.message; }
    return out;
  });
  log('diag:', JSON.stringify(diag));

  // ===== 收集组件实例句柄（appservice 内保存到全局，供后续步骤使用） =====
  const reg = await mp.evaluate(() => {
    const p = getCurrentPages().find((x) => x.route === 'pages/home/index');
    const vm = p.$vm;
    const found = {};
    const seen = new Set();
    function nameOf(t) {
      if (!t) return 'null';
      if (typeof t === 'string') return t;
      return t.__name || t.name || 'anon';
    }
    function walk(vn, depth) {
      if (!vn || depth > 60 || seen.size > 2000) return;
      if (seen.has(vn)) return;
      seen.add(vn);
      const nm = nameOf(vn.type);
      if (vn.component) {
        const ci = vn.component;
        const props = ci.props ? Object.keys(ci.props) : [];
        const emits = (vn.type && vn.type.emits) || [];
        if (nm === 'BottomSheet' || (props.includes('visible') && props.includes('maxHeightRatio'))) found.BottomSheet = { uid: ci.uid, props, emits: Array.isArray(emits) ? emits : [] };
        if (nm === 'RelationActivity' || (emits.includes && emits.includes('liked-by'))) found.RelationActivity = { uid: ci.uid, props, emits: Array.isArray(emits) ? emits : [] };
        if (nm === 'NearbyPeople' || (props.includes('items') && Array.isArray(emits) && emits.includes('more'))) found.NearbyPeople = { uid: ci.uid, props, emits: Array.isArray(emits) ? emits : [] };
        if (nm === 'HomeHeader' || (Array.isArray(emits) && emits.includes('schoolTap'))) found.HomeHeader = { uid: ci.uid, props, emits: Array.isArray(emits) ? emits : [] };
        walk(ci.subTree, depth + 1);
      }
      if (Array.isArray(vn.children)) { for (const c of vn.children) { if (c && typeof c === 'object' && c.type) walk(c, depth + 1); } }
    }
    const summary = { found: Object.keys(found), err: null };
    try { walk(vm.$.subTree, 0); } catch (e) { summary.err = e.message; }
    // 把实例挂到全局供后续 evaluate 使用
    const idx = {};
    const seen2 = new Set();
    function walk2(vn, depth) {
      if (!vn || depth > 60 || seen2.size > 2000) return;
      if (seen2.has(vn)) return;
      seen2.add(vn);
      if (vn.component) {
        idx[vn.component.uid] = vn.component;
        walk2(vn.component.subTree, depth + 1);
      }
      if (Array.isArray(vn.children)) { for (const c of vn.children) { if (c && typeof c === 'object' && c.type) walk2(c, depth + 1); } }
    }
    try { walk2(vm.$.subTree, 0); globalThis.__qaComps = idx; } catch (e) { summary.err2 = e.message; }
    summary.registered = Object.keys(idx).length;
    summary.ident = found;
    return summary;
  });
  log('component registry:', JSON.stringify(reg));
  await mp.disconnect();
}
main().catch((e) => { console.error('[qa] FATAL', e); process.exit(1); });

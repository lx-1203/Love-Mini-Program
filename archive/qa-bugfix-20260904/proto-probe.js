/** Probe undocumented automation protocol methods */
const WebSocket = require('D:/6/恋爱小程序/node_modules/.pnpm/ws@8.16.0/node_modules/ws');
const ws = new WebSocket('ws://127.0.0.1:9420');
let id = 0;
const pending = {};
function send(method, params) {
  return new Promise((res) => { const i = ++id; pending[i] = res; ws.send(JSON.stringify({ id: i, method, params: params || {} })); });
}
ws.on('message', (d) => {
  try {
    const m = JSON.parse(d.toString());
    if (m.id && pending[m.id]) { pending[m.id](m); delete pending[m.id]; }
  } catch (e) {}
});
ws.on('open', async () => {
  const methods = [
    ['App.getPageWxml', {}],
    ['App.getPageStack', {}],
    ['Page.getWxml', { pageId: 1 }],
    ['App.getWxml', {}],
    ['App.getElements', { selector: '.header-location' }],
    ['App.getElement', { selector: 'home-header' }],
  ];
  for (const [m, p] of methods) {
    const r = await send(m, p);
    console.log(m, '=>', JSON.stringify(r).slice(0, 300));
  }
  process.exit(0);
});
ws.on('error', (e) => { console.log('err', e.message); process.exit(1); });

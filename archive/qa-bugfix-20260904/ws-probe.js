/** Raw WS probe of automation protocol to see why App version is undefined */
const WebSocket = require('D:/6/恋爱小程序/node_modules/.pnpm/ws@8.16.0/node_modules/ws');

const ws = new WebSocket('ws://127.0.0.1:9420');
const send = (id, method, params) => ws.send(JSON.stringify({ id, method, params }));

ws.on('open', () => {
  console.log('[probe] ws open');
  send(1, 'App.getInfo', {});
});
ws.on('message', (data) => {
  console.log('[probe] msg:', data.toString().slice(0, 800));
  // 再问一次 SDK 版本相关的
  try {
    const parsed = JSON.parse(data.toString());
    if (parsed.id === 1) {
      send(2, 'Tool.getInfo', {});
    }
  } catch (e) { /* ignore */ }
});
ws.on('error', (e) => console.log('[probe] error', e.message));
setTimeout(() => { console.log('[probe] closing'); process.exit(0); }, 8000);

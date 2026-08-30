/* 快速探测微信开发者工具 automation 端口是否可连（2026-08-26） */
const automator = require('miniprogram-automator');
const ports = process.argv.slice(2).length ? process.argv.slice(2).map(Number) : [9420, 9430];

(async () => {
  for (const port of ports) {
    try {
      const mp = await automator.connect({ wsEndpoint: `ws://127.0.0.1:${port}` });
      console.log(`CONNECT-OK ${port}`);
      try { const page = await mp.currentPage(); console.log(`CURRENT ${port}:`, page && page.path); } catch (e) { /* ignore */ }
      await mp.disconnect();
      process.exit(0);
    } catch (e) {
      console.log(`CONNECT-FAIL ${port}: ${e.message.slice(0, 120)}`);
    }
  }
  process.exit(1);
})();
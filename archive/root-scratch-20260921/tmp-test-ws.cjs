const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
(async () => {
  for (const port of [9420, 18413, 32355]) {
    try {
      const mp = await automator.connect({ wsEndpoint: `ws://127.0.0.1:${port}` });
      console.log(`CONNECTED to ${port}!`);
      const page = await mp.currentPage();
      console.log('page:', page && page.path);
      await mp.disconnect();
      process.exit(0);
    } catch (e) {
      console.log(`FAIL ${port}:`, e.message.slice(0, 100));
    }
  }
})();

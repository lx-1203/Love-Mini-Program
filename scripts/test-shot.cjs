const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
(async () => {
  try {
    const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' });
    console.log('connected');
    await mp.reLaunch('/pages/home/index');
    await new Promise(r => setTimeout(r, 8000));
    const shot = await mp.screenshot({ path: 'D:/6/恋爱小程序/tmp/current-home-test.png', fullPage: false });
    console.log('screenshot saved', shot && shot.size);
    await mp.disconnect();
  } catch (e) {
    console.error('FAIL:', e.message);
  }
})();

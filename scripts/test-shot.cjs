const automator = require(require.resolve("miniprogram-automator", { paths: [require("path").join(__dirname, "..", "apps/client"), require("path").resolve(__dirname, "..")] }));
const REPO_ROOT = require("path").resolve(__dirname, "..");
(async () => {
  try {
    const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' });
    console.log('connected');
    await mp.reLaunch('/pages/home/index');
    await new Promise(r => setTimeout(r, 8000));
    const shot = await mp.screenshot({ path: `${REPO_ROOT}/tmp/current-home-test.png`, fullPage: false });
    console.log('screenshot saved', shot && shot.size);
    await mp.disconnect();
  } catch (e) {
    console.error('FAIL:', e.message);
  }
})();

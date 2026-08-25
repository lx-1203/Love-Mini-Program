const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
async function main(){
  const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' });
  await new Promise(r=>setTimeout(r,3000));
  try{ await mp.reLaunch('/pages/profile/index'); await new Promise(r=>setTimeout(r,20000)); const page=await mp.currentPage(); console.log('[page]',page&&page.path);
    const fab=await page.$$('global-publish-fab'); console.log('[global-publish-fab]', fab.length);
    if(fab.length){ const style=await fab[0].attribute('style'); const cls=await fab[0].attribute('class'); console.log('  class=',cls); console.log('  style=',style); }
    const plus=await page.$$('global-publish-fab global-fab__plus'); console.log('[plus]', plus.length);
  }catch(e){ console.log('[err]',e.message); }
  await mp.disconnect(); process.exit(0);
}
main().catch(e=>{console.error(e);process.exit(1)});

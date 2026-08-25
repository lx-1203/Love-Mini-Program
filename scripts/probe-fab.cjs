const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
async function main(){
  const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' });
  await new Promise(r=>setTimeout(r,4000));
  try { const g=await (await fetch('http://127.0.0.1:8080/api/v1/auth/guest-login',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).json(); await mp.callWxMethod('setStorageSync','token',g.token); } catch(e){}
  try{ await mp.reLaunch('/pages/profile/index'); await new Promise(r=>setTimeout(r,20000)); const page=await mp.currentPage(); console.log('[page]',page&&page.path);
    const fab=await page.$$('.global-fab'); console.log('[.global-fab]', fab.length);
    if(fab.length){ const cls=await fab[0].attribute('class'); const style=await fab[0].attribute('style'); console.log('  class=',cls); console.log('  style=',style); }
    const plus=await page.$$('.global-fab__plus'); console.log('[.global-fab__plus]', plus.length);
    const label=await page.$$('.global-fab__label'); console.log('[.global-fab__label]', label.length);
  }catch(e){ console.log('[err]',e.message); }
  await mp.disconnect(); process.exit(0);
}
main().catch(e=>{console.error(e);process.exit(1)});

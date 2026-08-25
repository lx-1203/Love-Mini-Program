const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
async function main(){
  const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' });
  await new Promise(r=>setTimeout(r,4000));
  try { const g=await (await fetch('http://127.0.0.1:8080/api/v1/auth/guest-login',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).json(); await mp.callWxMethod('setStorageSync','token',g.token); } catch(e){}
  try{ await mp.reLaunch('/pages/profile/index'); await new Promise(r=>setTimeout(r,20000)); const page=await mp.currentPage();
    const fab=await page.$$('global-publish-fab'); console.log('[global-publish-fab]', fab.length);
    for(const f of fab){ const c=await f.attribute('class'); console.log('  class=', c); }
    // 查找所有带 fab 的元素
    const anyFab = await page.$$('[class*=fab]'); console.log('[class*=fab]', anyFab.length);
    for(const a of anyFab.slice(0,6)){ const c=await a.attribute('class'); console.log('  ', c); }
  }catch(e){ console.log('[err]',e.message); }
  await mp.disconnect(); process.exit(0);
}
main().catch(e=>{console.error(e);process.exit(1)});

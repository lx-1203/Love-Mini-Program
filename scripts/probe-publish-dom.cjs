const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
async function main(){
  const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' });
  mp.on('exception', e=>console.log('[EXC]', typeof e, (e&&e.message)||'no-msg', (e&&e.stack||'').slice(0,400)));
  await new Promise(r=>setTimeout(r,4000));
  try { const g=await (await fetch('http://127.0.0.1:8080/api/v1/auth/guest-login',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).json(); await mp.callWxMethod('setStorageSync','token',g.token); } catch(e){}
  try{ await mp.reLaunch('/pages/village/publish?circleId=1'); await new Promise(r=>setTimeout(r,12000)); const page=await mp.currentPage();
    console.log('[page]',page&&page.path);
    const txt=await page.$$('text'); const all=[]; for(const t of txt){ try{ const x=await t.text(); if(x) all.push(x); }catch(e){} }
    console.log('[texts]', all.slice(0,25));
    const imgs=await page.$$('image'); console.log('[images]', imgs.length);
    const fab=await page.$$('.publish-header__submit'); console.log('[submit]', fab.length);
    const data = await page.data(); console.log('[data keys]', Object.keys(data||{}).slice(0,25));
  }catch(e){ console.log('[err]', e.message); }
  await mp.disconnect(); process.exit(0);
}
main().catch(e=>{console.error(e);process.exit(1)});

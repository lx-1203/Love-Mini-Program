const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
async function main(){
  const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' });
  await new Promise(r=>setTimeout(r,3000));
  try { const g=await (await fetch('http://127.0.0.1:8080/api/v1/auth/guest-login',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).json(); await mp.callWxMethod('setStorageSync','token',g.token); } catch(e){}
  try{ await mp.reLaunch('/pages/nearby/index'); }catch(e){ console.log('[relaunch err]', e.message); }
  await new Promise(r=>setTimeout(r,12000));
  try{
    const page = await mp.currentPage();
    const imgs = await page.$$('image');
    console.log('[images count]', imgs.length);
    for (const img of imgs.slice(0,12)) {
      const attr = await img.attribute('src');
      const rect = await img.boundingClientRect ? await img.boundingClientRect() : null;
      console.log('  src=', String(attr).slice(0,90), ' rect=', rect ? (rect.width+'x'+rect.height) : 'n/a');
    }
  }catch(e){ console.log('[query err]', e.message); }
  await mp.disconnect(); process.exit(0);
}
main().catch(e=>{console.error(e);process.exit(1)});

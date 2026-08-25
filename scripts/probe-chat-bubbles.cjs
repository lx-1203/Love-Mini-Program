const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
async function main(){
  const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' });
  await new Promise(r=>setTimeout(r,3000));
  try { const g=await (await fetch('http://127.0.0.1:8080/api/v1/auth/guest-login',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).json(); await mp.callWxMethod('setStorageSync','token',g.token); } catch(e){}
  try{ await mp.reLaunch('/pages/chat-session/index?sessionId=session-1'); }catch(e){ console.log('[relaunch err]',e.message); }
  await new Promise(r=>setTimeout(r,12000));
  try{
    const page = await mp.currentPage();
    const bubbles = await page.$$('.bubble-wrap');
    console.log('[bubble-wrap count]', bubbles.length);
    for (const b of bubbles.slice(0,6)) { const cls=await b.attribute('class'); console.log('  class=', cls); }
    const rows = await page.$$('.chat-list > *');
    console.log('[chat-list children]', rows.length);
  }catch(e){ console.log('[query err]', e.message); }
  await mp.disconnect(); process.exit(0);
}
main().catch(e=>{console.error(e);process.exit(1)});

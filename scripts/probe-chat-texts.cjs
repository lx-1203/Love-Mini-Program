const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
async function main(){
  const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' });
  await new Promise(r=>setTimeout(r,3000));
  try { const g=await (await fetch('http://127.0.0.1:8080/api/v1/auth/guest-login',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).json(); await mp.callWxMethod('setStorageSync','token',g.token); } catch(e){}
  try{ await mp.reLaunch('/pages/chat-session/index?sessionId=session-1'); }catch(e){ console.log('[relaunch err]',e.message); }
  await new Promise(r=>setTimeout(r,12000));
  try{
    const page = await mp.currentPage();
    const items = await page.$$('.chat-list > *');
    for (const it of items) { const cls=await it.attribute('class'); console.log('  child class= ', cls); }
    // 页面上所有 bubble 类
    const allBubble = await page.$$('[class*=bubble]');
    console.log('[any bubble]', allBubble.length);
    for (const b of allBubble.slice(0,5)){ const c=await b.attribute('class'); console.log('  ', c); }
    // 读取页面文本片段
    const texts = await page.$$('text');
    const all=[];
    for(const t of texts){ try{ const x=await t.text(); if(x) all.push(x); }catch(e){} }
    console.log('[texts]', all.slice(0,20));
  }catch(e){ console.log('[query err]', e.message); }
  await mp.disconnect(); process.exit(0);
}
main().catch(e=>{console.error(e);process.exit(1)});

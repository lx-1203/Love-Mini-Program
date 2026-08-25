const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
async function main(){
  const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' });
  await new Promise(r=>setTimeout(r,3000));
  try { const g=await (await fetch('http://127.0.0.1:8080/api/v1/auth/guest-login',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).json(); await mp.callWxMethod('setStorageSync','token',g.token); } catch(e){}
  try{ await mp.reLaunch('/pages/village/post'); await new Promise(r=>setTimeout(r,10000)); const page=await mp.currentPage(); console.log('[page]',page.path);
    // 尝试点击 找搭子 tab (post-mode)
    const tabs = await page.$$('.post-mode__tab');
    console.log('[post-mode__tab count]', tabs.length);
    if(tabs.length>1){ await tabs[1].tap(); await new Promise(r=>setTimeout(r,1500)); const active=await page.$$('.post-mode__tab--active'); console.log('[active tabs after tap]', active.length); const txt = active.length? await active[0].text():''; console.log('  active text=', txt); }
    // 尝试点击 back
    const back = await page.$('.post-header__back');
    if(back){ console.log('[back found]'); }
    // 检查页面上所有可点元素
    const btns = await page.$$('[role=button]');
    console.log('[role=button count]', btns.length);
  }catch(e){ console.log('[err]',e.message); }
  await mp.disconnect(); process.exit(0);
}
main().catch(e=>{console.error(e);process.exit(1)});

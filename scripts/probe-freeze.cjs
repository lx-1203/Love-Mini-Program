const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
const path = require('path');
const OUT='D:\\6\\恋爱小程序\\tmp\\fix-shots3';
require('fs').mkdirSync(OUT,{recursive:true});
async function main(){
  const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' });
  mp.on('exception', e=>console.log('[EXC]', String(e&&e.message||e).slice(0,200)));
  mp.on('console', m=>{ if(m.type==='error') console.log('[CONSOLE-ERR]', String((m.args||[]).map(a=>a&&a.value!==undefined?a.value:a).join(' ')).slice(0,200)); });
  await new Promise(r=>setTimeout(r,2500));
  try { const g=await (await fetch('http://127.0.0.1:8080/api/v1/auth/guest-login',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).json(); await mp.callWxMethod('setStorageSync','token',g.token); console.log('[login ok]'); } catch(e){ console.log('[login err]',e.message); }
  for (const route of ['/pages/chat-session/index?sessionId=1','/pages/circles/topics?circleId=1']) {
    try {
      await mp.navigateTo(route);
      await new Promise(r=>setTimeout(r,12000));
      const page = await mp.currentPage();
      const shot = path.join(OUT, ('cs-'+route.replace(/[^a-z]/gi,'_'))+'.png');
      await mp.screenshot({ path: shot });
      console.log('[OK]', route, 'path=', page&&page.path, '->', shot);
    } catch(e){ console.log('[FAIL]', route, e.message); }
    try { await mp.navigateBack(); await new Promise(r=>setTimeout(r,2000)); } catch(e){}
  }
  await mp.disconnect(); process.exit(0);
}
main().catch(e=>{console.error(e);process.exit(1)});

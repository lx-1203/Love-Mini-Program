const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
const path = require('path'); const fs=require('fs');
const OUT='D:\\6\\恋爱小程序\\tmp\\fix-shots4'; fs.mkdirSync(OUT,{recursive:true});
async function main(){
  const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' });
  await new Promise(r=>setTimeout(r,2500));
  try { const g=await (await fetch('http://127.0.0.1:8080/api/v1/auth/guest-login',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).json(); await mp.callWxMethod('setStorageSync','token',g.token); } catch(e){}
  for(const [name,route] of [['official-chat','/pages/official-chat/index'],['home','/pages/home/index']]){
    try{ await mp.reLaunch(route); await new Promise(r=>setTimeout(r,name==='home'?7000:9000)); await mp.screenshot({path:path.join(OUT,name+'.png')}); console.log('[OK]',name); }catch(e){ console.log('[FAIL]',name,e.message); }
  }
  await mp.disconnect(); process.exit(0);
}
main().catch(e=>{console.error(e);process.exit(1)});

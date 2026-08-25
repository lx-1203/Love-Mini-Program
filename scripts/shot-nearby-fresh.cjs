const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
const fs=require('fs'), path=require('path');
async function main(){
  const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' });
  await new Promise(r=>setTimeout(r,3000));
  try { const g=await (await fetch('http://127.0.0.1:8080/api/v1/auth/guest-login',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).json(); await mp.callWxMethod('setStorageSync','token',g.token); } catch(e){}
  await new Promise(r=>setTimeout(r,2000));
  try{ await mp.reLaunch('/pages/nearby/index'); }catch(e){ console.log('[relaunch err]', e.message); }
  await new Promise(r=>setTimeout(r,14000));
  const out='D:\\6\\恋爱小程序\\tmp\\nearby-fresh.png';
  await mp.screenshot({path:out}); console.log('[OK]', out);
  await mp.disconnect(); process.exit(0);
}
main().catch(e=>{console.error(e);process.exit(1)});

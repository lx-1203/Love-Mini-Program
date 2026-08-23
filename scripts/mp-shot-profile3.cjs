const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
const fs=require('fs'),path=require('path');
const WS='ws://127.0.0.1:9420', API='http://127.0.0.1:8080/api/v1';
const OUT='D:/6/恋爱小程序/截图存档/2026-08-22-重构后/client';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
process.on('uncaughtException',e=>console.log('[uncaught]',e.message));
async function shot(mp,p){
  await mp.callWxMethod('reLaunch',{url:p}); await sleep(9000);
  await mp.screenshot({path:path.join(OUT,'08-profile-after-1-top.png')});
}
(async()=>{
  let mp;
  for(let attempt=0;attempt<3;attempt++){
    try{
      mp=await automator.connect({wsEndpoint:WS}); break;
    }catch(e){ console.log('connect attempt',attempt,'fail',e.message); await sleep(3000); }
  }
  await sleep(4000);
  const r=await fetch(`${API}/auth/guest-login`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  const j=await r.json(); const token=j.token||(j.data&&j.data.token)||'';
  await mp.callWxMethod('setStorage',{key:'token',data:token});
  await mp.callWxMethod('setStorage',{key:'refreshToken',data:''});
  try{
    await shot(mp,'/pages/profile/index');
    console.log('profile saved', fs.statSync(path.join(OUT,'08-profile-after-1-top.png')).size,'B');
  }catch(e){
    console.log('shot fail, retry:', e.message);
    try{ await mp.disconnect(); }catch(_){}
    await sleep(3000);
    mp=await automator.connect({wsEndpoint:WS}); await sleep(4000);
    // 再注入token
    await mp.callWxMethod('setStorage',{key:'token',data:token});
    await shot(mp,'/pages/profile/index');
    console.log('profile saved (retry)', fs.statSync(path.join(OUT,'08-profile-after-1-top.png')).size,'B');
  }
  await mp.disconnect(); process.exit(0);
})().catch(e=>{console.error('FATAL',e.message);process.exit(1);});

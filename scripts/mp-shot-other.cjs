const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
const fs=require('fs'),path=require('path');
const WS='ws://127.0.0.1:9420', API='http://127.0.0.1:8080/api/v1';
const OUT='D:/6/恋爱小程序/截图存档/2026-08-22-重构后/client';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  let mp=await automator.connect({wsEndpoint:WS});
  await sleep(3000);
  const r=await fetch(`${API}/auth/guest-login`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  const j=await r.json(); const token=j.token||(j.data&&j.data.token)||'';
  await mp.callWxMethod('setStorage',{key:'token',data:token});
  await mp.callWxMethod('setStorage',{key:'refreshToken',data:''});
  for(const uid of ['20110','20107','20115']){
    try{
      await mp.callWxMethod('reLaunch',{url:'/pages/profile/other?userId='+uid});
      await sleep(9000);
      const p=path.join(OUT,`09-other-id${uid}-1-top.png`);
      await mp.screenshot({path:p});
      console.log('[OK]',uid,fs.statSync(p).size,'B');
    }catch(e){ console.log('[FAIL]',uid,e.message); }
  }
  await mp.disconnect(); process.exit(0);
})().catch(e=>{console.error('FATAL',e.message);process.exit(1);});

const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
const fs=require('fs'),path=require('path');
const WS='ws://127.0.0.1:9420', API='http://127.0.0.1:8080/api/v1';
const OUT='D:/6/恋爱小程序/截图存档/2026-08-22-重构后/client';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const PAGES=[
  {name:'02-home',route:'/pages/home/index',long:true},
  {name:'07-messages',route:'/pages/messages/index',long:true},
  {name:'08-profile',route:'/pages/profile/index',long:true},
  {name:'05-matching',route:'/pages/discover/matching',long:false},
];
process.on('uncaughtException',e=>console.log('[uncaught]',e.message));
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  let mp=await automator.connect({wsEndpoint:WS});
  await sleep(3000);
  const r=await fetch(`${API}/auth/guest-login`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  const j=await r.json(); const token=j.token||(j.data&&j.data.token)||'';
  await mp.callWxMethod('setStorage',{key:'token',data:token});
  await mp.callWxMethod('setStorage',{key:'refreshToken',data:''});
  console.log('token',token.length);
  for(const p of PAGES){
    try{
      await mp.callWxMethod('reLaunch',{url:p.route});
      await sleep(p.long?9000:7000);
      await mp.screenshot({path:path.join(OUT,`${p.name}-1-top.png`)});
      if(p.long){ try{await mp.callWxMethod('pageScrollTo',{scrollTop:99999,duration:0});}catch(e){} await sleep(3500); await mp.screenshot({path:path.join(OUT,`${p.name}-2-bottom.png`)}); }
      console.log('[OK]',p.name);
    }catch(e){ console.log('[FAIL]',p.name,e.message); }
  }
  await mp.disconnect(); process.exit(0);
})().catch(e=>{console.error('FATAL',e.message);process.exit(1);});

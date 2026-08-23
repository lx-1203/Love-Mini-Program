const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
const fs=require('fs'),path=require('path');
const WS='ws://127.0.0.1:9420', API='http://127.0.0.1:8080/api/v1';
const OUT='D:/6/恋爱小程序/截图存档/2026-08-22-重构后/client';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  let mp=await automator.connect({wsEndpoint:WS}); await sleep(4000);
  const r=await fetch(`${API}/auth/guest-login`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  const j=await r.json(); const token=j.token||(j.data&&j.data.token)||'';
  await mp.callWxMethod('setStorage',{key:'token',data:token});
  await mp.callWxMethod('setStorage',{key:'refreshToken',data:''});
  await mp.callWxMethod('reLaunch',{url:'/pages/home/index'}); await sleep(8000);
  await mp.callWxMethod('pageScrollTo',{scrollTop:420,duration:0}); await sleep(2500);
  await mp.screenshot({path:path.join(OUT,'02-home-interest-420.png')});
  console.log('saved 420');
  await mp.disconnect(); process.exit(0);
})().catch(e=>{console.error('FATAL',e.message);process.exit(1);});

const automator = require(require.resolve("miniprogram-automator", { paths: [require("path").join(__dirname, "..", "apps/client"), require("path").resolve(__dirname, "..")] }));
const fs=require('fs'),path=require('path');
const REPO_ROOT = require("path").resolve(__dirname, "..");
const WS='ws://127.0.0.1:9420', API='http://127.0.0.1:8080/api/v1';
const OUT=`${REPO_ROOT}/截图存档/2026-08-22-重构后/client`;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
process.on('uncaughtException',e=>console.log('[uncaught]',e.message));
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  let mp=await automator.connect({wsEndpoint:WS});
  await sleep(4000);
  const r=await fetch(`${API}/auth/guest-login`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  const j=await r.json(); const token=j.token||(j.data&&j.data.token)||'';
  await mp.callWxMethod('setStorage',{key:'token',data:token});
  await mp.callWxMethod('setStorage',{key:'refreshToken',data:''});
  console.log('token injected');
  try{
    await mp.callWxMethod('reLaunch',{url:'/pages/home/index'});
    await sleep(9000);
    await mp.screenshot({path:path.join(OUT,'02-home-afterv2-1-top.png')});
    console.log('home top saved',fs.statSync(path.join(OUT,'02-home-afterv2-1-top.png')).size,'B');
    // 滚到兴趣推荐区
    await mp.callWxMethod('pageScrollTo',{scrollTop:900,duration:0});
    await sleep(3000);
    await mp.screenshot({path:path.join(OUT,'02-home-afterv2-interest.png')});
    console.log('interest saved',fs.statSync(path.join(OUT,'02-home-afterv2-interest.png')).size,'B');
  }catch(e){ console.log('ERR',e.message); }
  await mp.disconnect(); process.exit(0);
})().catch(e=>{console.error('FATAL',e.message);process.exit(1);});

const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
const fs=require('fs'),path=require('path');
const OUT='D:/6/恋爱小程序/截图存档/2026-08-22-重构后/client';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  let mp=await automator.connect({wsEndpoint:'ws://127.0.0.1:9420'});
  await sleep(6000);
  const p=await mp.currentPage(); console.log('page', p?p.path:'null');
  const shot=path.join(OUT,'08-profile-after-1-top.png');
  await mp.screenshot({path:shot});
  console.log('saved', fs.statSync(shot).size,'B');
  await mp.disconnect(); process.exit(0);
})().catch(e=>{console.error('ERR',e.message);process.exit(1);});

const automator = require(require.resolve("miniprogram-automator", { paths: [require("path").join(__dirname, "..", "apps/client"), require("path").resolve(__dirname, "..")] }));
const fs=require('fs'),path=require('path');
const REPO_ROOT = require("path").resolve(__dirname, "..");
const OUT=`${REPO_ROOT}/截图存档/2026-08-22-重构后/client`;
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

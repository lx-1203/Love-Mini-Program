const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  let mp=await automator.connect({wsEndpoint:'ws://127.0.0.1:9420'});
  await sleep(3000);
  console.log('connected');
  const p=await mp.currentPage();
  console.log('current page', p?p.path:'null');
  await mp.disconnect(); process.exit(0);
})().catch(e=>{console.error('ERR',e.message);process.exit(1);});

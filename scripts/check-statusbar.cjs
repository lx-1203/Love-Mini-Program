process.on('uncaughtException',(e)=>console.log('[uncaught]',e.message));
const automator=require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
const mp=await automator.connect({wsEndpoint:'ws://127.0.0.1:9420'});mp.on('error',()=>{});
try {
  const info = await mp.callWxMethod('getSystemInfoSync');
  console.log('statusBarHeight:', info.statusBarHeight);
  console.log('windowHeight:', info.windowHeight);
  console.log('safeArea:', JSON.stringify(info.safeArea));
  console.log('platform:', info.platform);
} catch(e){ console.log('err:', e.message); }
try{await mp.disconnect()}catch(e){}
})().catch(e=>console.error('FATAL',e.message));

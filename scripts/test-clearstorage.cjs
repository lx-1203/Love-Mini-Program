process.on('uncaughtException',()=>{});
const automator=require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
const mp=await automator.connect({wsEndpoint:'ws://127.0.0.1:9420'});mp.on('error',()=>{});
// 查看当前 storage
try {
  const keys = await mp.callWxMethod('getStorageInfoSync');
  console.log('storage keys:', JSON.stringify(keys.keys || keys));
  for (const k of (keys.keys||[])) {
    try { const v = await mp.callWxMethod('getStorageSync', { key: k }); console.log(' ', k, '=', JSON.stringify(v).slice(0,100)); } catch(e){ console.log(' ', k, 'err'); }
  }
} catch(e) { console.log('storage err:', e.message); }
// clearStorage
try {
  await mp.callWxMethod('clearStorage');
  console.log('clearStorage called');
} catch(e) { console.log('clear err:', e.message); }
await sleep(2000);
try {
  const keys2 = await mp.callWxMethod('getStorageInfoSync');
  console.log('after clear keys:', JSON.stringify(keys2.keys || keys2));
} catch(e) { console.log('recheck err:', e.message); }
try{await mp.disconnect()}catch(e){}
})().catch(e=>console.error('FATAL',e.message));

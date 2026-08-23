process.on('uncaughtException',(e)=>console.log('[uncaught]',e.message));
const automator=require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
const fs=require('fs');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
const mp=await automator.connect({wsEndpoint:'ws://127.0.0.1:9420'});mp.on('error',()=>{});
// 1) 清存储
await mp.callWxMethod('clearStorage');
console.log('cleared');
// 2) touch dist app.js 触发重新编译
const appJs = 'D:/6/恋爱小程序/apps/client/dist/build/mp-weixin/app.js';
const stat = fs.statSync(appJs);
const now = new Date();
fs.utimesSync(appJs, now, now);
console.log('touched app.js, waiting recompile...');
await sleep(15000);
// 3) reLaunch profile
try { await mp.reLaunch('/pages/profile/index'); } catch(e){ console.log('relaunch err', e.message); }
await sleep(15000);
const page = await mp.currentPage();
console.log('page:', page && page.path);
try {
  const data = await page.data();
  const s = JSON.stringify(data);
  console.log('has 星野:', s.includes('星野'));
  console.log('has 登录引导:', s.includes('登录'));
} catch(e){ console.log('data err:', e.message); }
await mp.pageScrollTo(0); await sleep(3000);
await mp.screenshot({path:'D:/6/恋爱小程序/tmp/notlogged-test2.png', fullPage:false});
console.log('shot done');
try{await mp.disconnect()}catch(e){}
})().catch(e=>console.error('FATAL',e.message));

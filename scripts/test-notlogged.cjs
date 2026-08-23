process.on('uncaughtException',(e)=>console.log('[uncaught]',e.message));
const automator=require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
let mp=await automator.connect({wsEndpoint:'ws://127.0.0.1:9420'});mp.on('error',()=>{});
// 1) 清存储
await mp.callWxMethod('clearStorage');
console.log('cleared storage');
// 2) 退出小程序（重启运行时）
try { await mp.close(); console.log('mp closed'); } catch(e){ console.log('close err', e.message); }
await sleep(5000);
// 3) 重新连接
mp=await automator.connect({wsEndpoint:'ws://127.0.0.1:9420'});mp.on('error',()=>{});
await sleep(8000);
// 4) reLaunch profile
try { await mp.reLaunch('/pages/profile/index'); } catch(e){ console.log('relaunch err', e.message); }
await sleep(15000);
const page = await mp.currentPage();
console.log('page:', page && page.path);
try {
  const data = await page.data();
  const s = JSON.stringify(data);
  console.log('has 星野:', s.includes('星野'));
  console.log('has 登录:', s.includes('登录'));
  // 查看 session 相关
  const i = s.indexOf('userSession');
  if (i>=0) console.log('userSession ctx:', s.slice(Math.max(0,i-50), i+150));
} catch(e){ console.log('data err:', e.message); }
// 截图
await mp.pageScrollTo(0); await sleep(3000);
await mp.screenshot({path:'D:/6/恋爱小程序/tmp/notlogged-test.png', fullPage:false});
console.log('shot done');
try{await mp.disconnect()}catch(e){}
})().catch(e=>console.error('FATAL',e.message));

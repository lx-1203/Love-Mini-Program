process.on('uncaughtException',()=>{});
const automator=require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
const mp=await automator.connect({wsEndpoint:'ws://127.0.0.1:9420'});mp.on('error',(e)=>console.log('ws err',e.message));
mp.on('console', (log) => { const s=String(log); if (s.includes('DIST_JS_V3_MARKER')) console.log('[MARKER]', s.slice(0,200)); });
await sleep(3000);
try {
  const page = await mp.currentPage();
  console.log('current page:', page ? page.path : 'null');
} catch(e){ console.log('page err:', e.message); }
try{await mp.disconnect()}catch(e){}
})().catch(e=>console.error('FATAL',e.message));

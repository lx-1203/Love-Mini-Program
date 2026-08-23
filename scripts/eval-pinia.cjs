process.on('uncaughtException',(e)=>console.log('[uncaught]',e.message));
const automator=require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
const http=require('http');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function post(url,body){return new Promise((res,rej)=>{const u=new URL(url);const r=http.request({hostname:u.hostname,port:u.port,path:u.pathname,method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}},(x)=>{let d='';x.on('data',c=>d+=c);x.on('end',()=>res(JSON.parse(d)))});r.on('error',rej);r.write(body);r.end()})}
(async()=>{
const mp=await automator.connect({wsEndpoint:'ws://127.0.0.1:9420'});mp.on('error',()=>{});
const d=await post('http://127.0.0.1:8080/api/v1/auth/guest-login','{}');
await mp.callWxMethod('setStorage',{key:'token',data:d.token});
await mp.reLaunch('/pages/home/index');await sleep(20000);
try {
  const r = await mp.evaluate(() => {
    try {
      // 尝试访问 pinia store
      const pinia = globalThis.__pinia__ || (globalThis.getActivePinia && globalThis.getActivePinia());
      if (!pinia) {
        // 尝试从页面实例找
        const pages = getCurrentPages();
        const page = pages[pages.length-1];
        const inst = page && (page.$vm || page.$page);
        const keys = inst ? Object.keys(inst).filter(k=>typeof k==='string').slice(0,50) : [];
        return { piniaNull: true, instKeys: keys };
      }
      const home = pinia._s && pinia._s.get('home');
      return {
        piniaFound: true,
        hasHome: !!home,
        homeKeys: home ? Object.keys(home).slice(0,30) : [],
        homeFeedVal: home && home.homeFeed ? JSON.stringify(home.homeFeed).slice(0,300) : null,
        error: home && home.errorMessage ? home.errorMessage : null
      };
    } catch(e) { return { err: e.message }; }
  });
  console.log('result:', JSON.stringify(r));
} catch(e){ console.log('evaluate err:', e.message); }
try{await mp.disconnect()}catch(e){}
})().catch(e=>console.error('FATAL',e.message));

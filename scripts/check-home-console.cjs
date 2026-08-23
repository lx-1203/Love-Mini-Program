process.on('uncaughtException',(e)=>console.log('[uncaught]',e.message));
const automator=require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
const http=require('http');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function post(url,body){return new Promise((res,rej)=>{const u=new URL(url);const r=http.request({hostname:u.hostname,port:u.port,path:u.pathname,method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}},(x)=>{let d='';x.on('data',c=>d+=c);x.on('end',()=>res(JSON.parse(d)))});r.on('error',rej);r.write(body);r.end()})}
(async()=>{
const mp=await automator.connect({wsEndpoint:'ws://127.0.0.1:9420'});mp.on('error',()=>{});
mp.on('console', (log) => {
  const s = String(log);
  if (s.includes('home-store') || s.includes('fetchDashboard') || s.includes('dashboard') || s.includes('error') || s.includes('Error')) {
    console.log('[console]', s.slice(0, 300));
  }
});
const d=await post('http://127.0.0.1:8080/api/v1/auth/guest-login','{}');
await mp.callWxMethod('setStorage',{key:'token',data:d.token});
await mp.reLaunch('/pages/home/index');await sleep(20000);
console.log('--- after load, checking DOM ---');
const page = await mp.currentPage();
try {
  // 检查今日推荐空态和半夏
  const empty = await page.$('.today-card__empty');
  console.log('empty el:', !!empty);
  const body = await page.$('.today-card__body');
  console.log('body el:', !!body);
  if (body) {
    const txt = await body.text();
    console.log('body text:', txt.slice(0, 100));
  }
} catch(e){ console.log('dom err:', e.message); }
try{await mp.disconnect()}catch(e){}
})().catch(e=>console.error('FATAL',e.message));

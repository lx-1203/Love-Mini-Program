process.on('uncaughtException',(e)=>console.log('[uncaught]',e.message));
const automator=require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
const http=require('http');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function post(url,body){return new Promise((res,rej)=>{const u=new URL(url);const r=http.request({hostname:u.hostname,port:u.port,path:u.pathname,method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}},(x)=>{let d='';x.on('data',c=>d+=c);x.on('end',()=>res(JSON.parse(d)))});r.on('error',rej);r.write(body);r.end()})}
(async()=>{
const mp=await automator.connect({wsEndpoint:'ws://127.0.0.1:9420'});mp.on('error',()=>{});
const d=await post('http://127.0.0.1:8080/api/v1/auth/guest-login','{}');
await mp.callWxMethod('clearStorage');
await mp.callWxMethod('setStorage',{key:'token',data:d.token});
await mp.reLaunch('/pages/messages/index');await sleep(25000);
const page = await mp.currentPage();
try {
  const data = await page.data();
  const s = JSON.stringify(data);
  console.log('has person-07:', s.includes('person-07'));
  console.log('has person-02-avatar:', s.includes('person-02-avatar'));
  console.log('has .webp:', s.includes('.webp'));
  console.log('has 夏言:', s.includes('夏言'));
  // 找 avatar 相关
  const i = s.indexOf('person-07');
  if (i>=0) console.log('ctx:', s.slice(Math.max(0,i-80), i+80));
  const j = s.indexOf('走查用户甲');
  if (j>=0) console.log('走查 ctx:', s.slice(Math.max(0,j-120), j+120));
} catch(e){ console.log('data err:', e.message); }
try{await mp.disconnect()}catch(e){}
})().catch(e=>console.error('FATAL',e.message));

process.on('uncaughtException',()=>{});
const automator=require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
const http=require('http');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function post(url,body){return new Promise((res,rej)=>{const u=new URL(url);const r=http.request({hostname:u.hostname,port:u.port,path:u.pathname,method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}},(x)=>{let d='';x.on('data',c=>d+=c);x.on('end',()=>res(JSON.parse(d)))});r.on('error',rej);r.write(body);r.end()})}
(async()=>{
const mp=await automator.connect({wsEndpoint:'ws://127.0.0.1:9420'});mp.on('error',()=>{});
mp.on('console', (log) => {
  if (log && (String(log).includes('DIST_JS_V3_MARKER') || String(log).includes('CIRCLE'))) console.log('[console]', String(log).slice(0,300));
});
const d=await post('http://127.0.0.1:8080/api/v1/auth/guest-login','{}');
await mp.callWxMethod('setStorage',{key:'token',data:d.token});
await mp.reLaunch('/pages/circles/index');await sleep(20000);
try {
  const val = await mp.currentPage().then(p=>p.data('b'));
  const srcs = (val||[]).slice(0,8).map(v=>v.b);
  console.log('first 8 srcs:', srcs.join(' | '));
} catch(e){ console.log('data err:', e.message); }
await sleep(3000);
try{await mp.disconnect()}catch(e){}
})().catch(e=>console.error('FATAL',e.message));

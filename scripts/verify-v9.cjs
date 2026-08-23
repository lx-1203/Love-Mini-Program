process.on('uncaughtException',()=>{});
const automator=require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
const http=require('http');const fs=require('fs');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function post(url,body){return new Promise((res,rej)=>{const u=new URL(url);const r=http.request({hostname:u.hostname,port:u.port,path:u.pathname,method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}},(x)=>{let d='';x.on('data',c=>d+=c);x.on('end',()=>res(JSON.parse(d)))});r.on('error',rej);r.write(body);r.end()})}
function wt(p,ms,l){return Promise.race([p,sleep(ms).then(()=>'T')])}
(async()=>{
const mp=await automator.connect({wsEndpoint:'ws://127.0.0.1:9420'});mp.on('error',()=>{});
const d=await post('http://127.0.0.1:8080/api/v1/auth/guest-login','{}');
await mp.callWxMethod('setStorage',{key:'token',data:d.token});
for (const p of [{n:'login',u:'/pages/login/index'},{n:'messages',u:'/pages/messages/index'}]) {
  await wt(mp.reLaunch(p.u),20000,'rl'); await sleep(13000);
  await wt(mp.pageScrollTo(0),8000,'st'); await sleep(2500);
  await wt(mp.screenshot({path:`D:/6/恋爱小程序/tmp/v9-${p.n}.png`,fullPage:false}),15000,'ts');
  await sleep(2000);
  console.log('done',p.n);
}
try{await mp.disconnect()}catch(e){}
})().catch(e=>console.error('FATAL',e.message));

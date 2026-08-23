process.on('uncaughtException',(e)=>console.log('[uncaught]',e.message));
const automator=require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
const http=require('http');const fs=require('fs');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const OUT='D:/6/恋爱小程序/截图存档/2026-08-21-final24';
function post(url,body){return new Promise((res,rej)=>{const u=new URL(url);const r=http.request({hostname:u.hostname,port:u.port,path:u.pathname,method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}},(x)=>{let d='';x.on('data',c=>d+=c);x.on('end',()=>res(JSON.parse(d)))});r.on('error',rej);r.write(body);r.end()})}
(async()=>{
const mp=await automator.connect({wsEndpoint:'ws://127.0.0.1:9420'});mp.on('error',()=>{});
const d=await post('http://127.0.0.1:8080/api/v1/auth/guest-login','{}');
await mp.callWxMethod('setStorage',{key:'token',data:d.token});
try{
  await mp.reLaunch('/pages/discover/match-success?userId=2');await sleep(22000);
  await mp.pageScrollTo(99999);await sleep(9000);
  const b=`${OUT}/10-match-success-2-bottom.png`;
  await mp.screenshot({path:b,fullPage:false});
  console.log('10 bottom',fs.existsSync(b)?fs.statSync(b).size:0);
}catch(e){console.log('ERR',e.message)}
await mp.disconnect();
})().catch(e=>console.error('FATAL',e.message));

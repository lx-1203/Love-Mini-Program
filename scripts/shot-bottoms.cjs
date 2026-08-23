process.on('uncaughtException',(e)=>console.log('[uncaught]',e.message));
const automator=require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
const http=require('http');const fs=require('fs');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const OUT='D:/6/恋爱小程序/截图存档/2026-08-21-final24';
function post(url,body){return new Promise((res,rej)=>{const u=new URL(url);const r=http.request({hostname:u.hostname,port:u.port,path:u.pathname,method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}},(x)=>{let d='';x.on('data',c=>d+=c);x.on('end',()=>res(JSON.parse(d)))});r.on('error',rej);r.write(body);r.end()})}
async function shotBottom(mp,url,name){
  await mp.reLaunch(url);await sleep(20000);
  await mp.pageScrollTo(99999);await sleep(8000);
  const b=`${OUT}/${name}-2-bottom.png`;
  await mp.screenshot({path:b,fullPage:false});
  console.log(name,'bottom',fs.existsSync(b)?fs.statSync(b).size:0);
}
(async()=>{
const mp=await automator.connect({wsEndpoint:'ws://127.0.0.1:9420'});mp.on('error',()=>{});
const d=await post('http://127.0.0.1:8080/api/v1/auth/guest-login','{}');
await mp.callWxMethod('setStorage',{key:'token',data:d.token});
await shotBottom(mp,'/pages/login/index','08-login');
await shotBottom(mp,'/pages/discover/matching?preview=1&cardId=1&action=like&userId=2','09-matching');
await shotBottom(mp,'/pages/discover/match-success?userId=2','10-match-success');
await mp.disconnect();
})().catch(e=>console.error('FATAL',e.message));

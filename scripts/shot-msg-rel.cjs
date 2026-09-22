const REPO_ROOT = require("path").resolve(__dirname, "..");
process.on('uncaughtException',()=>{});
const automator=require(require.resolve("miniprogram-automator", { paths: [require("path").join(__dirname, "..", "apps/client"), require("path").resolve(__dirname, "..")] }));
const http=require('http');const fs=require('fs');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function post(url,body){return new Promise((res,rej)=>{const u=new URL(url);const r=http.request({hostname:u.hostname,port:u.port,path:u.pathname,method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}},(x)=>{let d='';x.on('data',c=>d+=c);x.on('end',()=>res(JSON.parse(d)))});r.on('error',rej);r.write(body);r.end()})}
(async()=>{
const mp=await automator.connect({wsEndpoint:'ws://127.0.0.1:9420'});mp.on('error',()=>{});
const d=await post('http://127.0.0.1:8080/api/v1/auth/guest-login','{}');
await mp.callWxMethod('setStorage',{key:'token',data:d.token});
await mp.reLaunch('/pages/messages/index');await sleep(14000);
await mp.screenshot({path:`${REPO_ROOT}/tmp/msg-rel2.png`,fullPage:false});await sleep(2000);
console.log('size:',fs.existsSync(`${REPO_ROOT}/tmp/msg-rel2.png`)?fs.statSync(`${REPO_ROOT}/tmp/msg-rel2.png`).size:0);
try{await mp.disconnect()}catch(e){}
})().catch(e=>console.error('FATAL',e.message));

process.on('uncaughtException',()=>{});
const automator=require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
const http=require('http');const fs=require('fs');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function post(url,body){return new Promise((res,rej)=>{const u=new URL(url);const r=http.request({hostname:u.hostname,port:u.port,path:u.pathname,method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}},(x)=>{let d='';x.on('data',c=>d+=c);x.on('end',()=>res(JSON.parse(d)))});r.on('error',rej);r.write(body);r.end()})}
(async()=>{
const mp=await automator.connect({wsEndpoint:'ws://127.0.0.1:9420'});mp.on('error',()=>{});
const d=await post('http://127.0.0.1:8080/api/v1/auth/guest-login','{}');
// 清空所有缓存键
for (const k of ['messages:bootstrap','token','tabbar_chat_unread','discover:data']) {
  try { await mp.callWxMethod('removeStorage', { key: k }); } catch(e) {}
}
await mp.callWxMethod('setStorage',{key:'token',data:d.token});
await mp.reLaunch('/pages/messages/index');await sleep(15000);
await mp.screenshot({path:'D:/6/恋爱小程序/tmp/msg-rel3.png',fullPage:false});await sleep(2000);
console.log('size:',fs.existsSync('D:/6/恋爱小程序/tmp/msg-rel3.png')?fs.statSync('D:/6/恋爱小程序/tmp/msg-rel3.png').size:0);
try{await mp.disconnect()}catch(e){}
})().catch(e=>console.error('FATAL',e.message));

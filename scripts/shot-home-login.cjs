process.on('uncaughtException',(e)=>console.log('[uncaught]',e.message));
const automator=require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
const http=require('http');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function post(url,body){return new Promise((res,rej)=>{const u=new URL(url);const r=http.request({hostname:u.hostname,port:u.port,path:u.pathname,method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}},(x)=>{let d='';x.on('data',c=>d+=c);x.on('end',()=>res(JSON.parse(d)))});r.on('error',rej);r.write(body);r.end()})}
(async()=>{
const mp=await automator.connect({wsEndpoint:'ws://127.0.0.1:9420'});mp.on('error',()=>{});
const d=await post('http://127.0.0.1:8080/api/v1/auth/guest-login','{}');
await mp.callWxMethod('setStorage',{key:'token',data:d.token});
// 1) 首页截图
await mp.reLaunch('/pages/home/index');await sleep(20000);
await mp.pageScrollTo(0);await sleep(3000);
await mp.screenshot({path:'D:/6/恋爱小程序/tmp/home-final-check.png', fullPage:false});
console.log('home shot done');
// 2) 登录页截图
await mp.reLaunch('/pages/login/index');await sleep(15000);
await mp.pageScrollTo(0);await sleep(3000);
await mp.screenshot({path:'D:/6/恋爱小程序/tmp/login-final-check.png', fullPage:false});
console.log('login shot done');
try{await mp.disconnect()}catch(e){}
})().catch(e=>console.error('FATAL',e.message));

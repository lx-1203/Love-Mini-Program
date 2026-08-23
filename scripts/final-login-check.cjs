process.on('uncaughtException',(e)=>console.log('[uncaught]',e.message));
const automator=require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
const http=require('http');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function post(url,body){return new Promise((res,rej)=>{const u=new URL(url);const r=http.request({hostname:u.hostname,port:u.port,path:u.pathname,method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}},(x)=>{let d='';x.on('data',c=>d+=c);x.on('end',()=>res(JSON.parse(d)))});r.on('error',rej);r.write(body);r.end()})}
(async()=>{
const mp=await automator.connect({wsEndpoint:'ws://127.0.0.1:9420'});mp.on('error',()=>{});
// 登录页
await mp.reLaunch('/pages/login/index');await sleep(12000);
const lp = await mp.currentPage();
console.log('login page:', lp && lp.path);
try {
  const btn = await lp.$('.login-submit, .login__submit, [class*=wechat]');
  console.log('wechat login btn exists:', !!btn);
  const data = await lp.data();
  const s = JSON.stringify(data);
  console.log('login page has 微信:', s.includes('微信'), '| 手机号:', s.includes('手机号'), '| 稍后再看:', s.includes('稍后再看'));
} catch(e){ console.log('login check err:', e.message); }
// 注入 token 后进入首页
const d = await post('http://127.0.0.1:8080/api/v1/auth/guest-login','{}');
await mp.callWxMethod('setStorage',{key:'token',data:d.token});
await mp.reLaunch('/pages/home/index');await sleep(12000);
const hp = await mp.currentPage();
console.log('home page:', hp && hp.path);
try {
  const data = await hp.data();
  const s = JSON.stringify(data);
  console.log('home logged-in state: has userSession:', s.includes('userSession'));
} catch(e){ console.log('home check err:', e.message); }
await mp.pageScrollTo(0);await sleep(3000);
await mp.screenshot({path:'D:/6/恋爱小程序/tmp/final-login-home.png', fullPage:false});
console.log('final shot done');
try{await mp.disconnect()}catch(e){}
})().catch(e=>console.error('FATAL',e.message));

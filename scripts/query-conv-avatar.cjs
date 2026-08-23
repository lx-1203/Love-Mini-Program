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
// 尝试 automator 元素查询（可能穿透组件）
try {
  const el = await page.$('.conversation-item__avatar');
  console.log('first avatar el:', !!el);
  if (el) {
    const src = await el.attribute('src');
    console.log('avatar src:', src);
  }
} catch(e){ console.log('el query err:', e.message); }
// 尝试 fallback 数量
try {
  const fb = await page.$$('.conversation-item__fallback');
  console.log('fallback count:', fb.length);
} catch(e){ console.log('fb query err:', e.message); }
try{await mp.disconnect()}catch(e){}
})().catch(e=>console.error('FATAL',e.message));

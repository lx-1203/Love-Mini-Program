process.on('uncaughtException',()=>{});
const automator=require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
const http=require('http');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function post(url,body){return new Promise((res,rej)=>{const u=new URL(url);const r=http.request({hostname:u.hostname,port:u.port,path:u.pathname,method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}},(x)=>{let d='';x.on('data',c=>d+=c);x.on('end',()=>res(JSON.parse(d)))});r.on('error',rej);r.write(body);r.end()})}
(async()=>{
const mp=await automator.connect({wsEndpoint:'ws://127.0.0.1:9420'});mp.on('error',()=>{});
const d=await post('http://127.0.0.1:8080/api/v1/auth/guest-login','{}');
await mp.callWxMethod('setStorage',{key:'token',data:d.token});
await mp.reLaunch('/pages/circles/index');await sleep(15000);
const page = await mp.currentPage();
// 查询 DOM
try {
  const imgs = await page.$$('.circle-card__cover-img');
  console.log('cover-img count:', imgs.length);
  for (let i=0;i<imgs.length;i++){
    try {
      const attrs = await imgs[i].attributes();
      console.log('img', i, JSON.stringify(attrs));
    } catch(e){ console.log('img attr err', i, e.message); }
  }
} catch(e) { console.log('dom err:', e.message); }
// 查询页面数据
try {
  const data = await page.data();
  const s = JSON.stringify(data);
  console.log('has circle-photo in data:', s.includes('circle-photo'));
  const i = s.indexOf('circle-photo');
  if (i>=0) console.log('ctx:', s.slice(Math.max(0,i-80), i+120));
  // circles 数组
  if (data.circles) console.log('circles len:', data.circles.length, 'first:', JSON.stringify(data.circles[0]).slice(0,200));
} catch(e){ console.log('data err:', e.message); }
try{await mp.disconnect()}catch(e){}
})().catch(e=>console.error('FATAL',e.message));

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
try {
  const imgs = await page.$$('.circle-card__cover-img');
  console.log('cover-img count:', imgs.length);
  const first = imgs[0];
  for (const attr of ['src','mode','class','style']) {
    try { console.log('attr', attr, '=', await first.attribute(attr)); } catch(e){ console.log('attr err', attr, e.message); }
  }
  // 查询 image 的尺寸
  try {
    const size = await first.size();
    console.log('img size:', JSON.stringify(size));
  } catch(e){ console.log('size err', e.message); }
  // 查询父容器尺寸
  try {
    const parent = await page.$('.circle-card__cover');
    const psize = await parent.size();
    console.log('cover size:', JSON.stringify(psize));
  } catch(e){ console.log('parent size err', e.message); }
} catch(e) { console.log('dom err:', e.message); }
try{await mp.disconnect()}catch(e){}
})().catch(e=>console.error('FATAL',e.message));

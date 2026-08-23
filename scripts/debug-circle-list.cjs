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
  const data = await page.data();
  if (data.circles) {
    console.log('circles count:', data.circles.length);
    for (const c of data.circles) {
      console.log(' -', c.id, '|', c.name, '| icon:', c.icon, '| members:', c.memberCount, '| topics:', c.topicCount);
    }
  } else {
    // 找 circles 数组
    const s = JSON.stringify(data);
    const keys = Object.keys(data);
    console.log('data keys:', keys.join(','));
  }
} catch(e){ console.log('data err:', e.message); }
try{await mp.disconnect()}catch(e){}
})().catch(e=>console.error('FATAL',e.message));

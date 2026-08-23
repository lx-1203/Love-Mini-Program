process.on('uncaughtException',(e)=>console.log('[uncaught]',e.message));
const automator=require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
const http=require('http');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function post(url,body){return new Promise((res,rej)=>{const u=new URL(url);const r=http.request({hostname:u.hostname,port:u.port,path:u.pathname,method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}},(x)=>{let d='';x.on('data',c=>d+=c);x.on('end',()=>res(JSON.parse(d)))});r.on('error',rej);r.write(body);r.end()})}
(async()=>{
const mp=await automator.connect({wsEndpoint:'ws://127.0.0.1:9420'});mp.on('error',()=>{});
const d=await post('http://127.0.0.1:8080/api/v1/auth/guest-login','{}');
await mp.callWxMethod('setStorage',{key:'token',data:d.token});
await mp.reLaunch('/pages/home/index');await sleep(20000);
const page = await mp.currentPage();
try {
  const data = await page.data();
  const s = JSON.stringify(data);
  console.log('has 半夏:', s.includes('半夏'));
  console.log('has 今日推荐 empty:', s.includes('今天暂时没有合适的推荐'));
  console.log('has loveProgress step:', s.includes('完善资料'));
  console.log('has relationActivity:', s.includes('likesReceived') || s.includes('人喜欢了你'));
  // 找今日推荐相关
  const i = s.indexOf('今天暂时没有');
  console.log('empty idx:', i);
  const j = s.indexOf('半夏');
  if (j>=0) console.log('半夏 ctx:', s.slice(Math.max(0,j-80), j+80));
} catch(e){ console.log('data err:', e.message); }
await mp.pageScrollTo(0);await sleep(3000);
await mp.screenshot({path:'D:/6/恋爱小程序/tmp/home-current.png', fullPage:false});
console.log('shot done');
try{await mp.disconnect()}catch(e){}
})().catch(e=>console.error('FATAL',e.message));

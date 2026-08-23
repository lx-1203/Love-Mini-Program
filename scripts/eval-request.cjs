process.on('uncaughtException',(e)=>console.log('[uncaught]',e.message));
const automator=require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
const http=require('http');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function post(url,body){return new Promise((res,rej)=>{const u=new URL(url);const r=http.request({hostname:u.hostname,port:u.port,path:u.pathname,method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}},(x)=>{let d='';x.on('data',c=>d+=c);x.on('end',()=>res(JSON.parse(d)))});r.on('error',rej);r.write(body);r.end()})}
(async()=>{
const mp=await automator.connect({wsEndpoint:'ws://127.0.0.1:9420'});mp.on('error',()=>{});
const d=await post('http://127.0.0.1:8080/api/v1/auth/guest-login','{}');
await mp.callWxMethod('setStorage',{key:'token',data:d.token});
await mp.reLaunch('/pages/home/index');await sleep(20000);
// 在页面上下文用 wx.request 请求 dashboard
try {
  const r = await mp.evaluate((token) => {
    return new Promise((resolve) => {
      wx.request({
        url: 'http://127.0.0.1:8080/api/v1/home/dashboard',
        method: 'GET',
        header: { Authorization: 'Bearer ' + token },
        success: (res) => {
          const d = res.data;
          const hf = d && d.homeFeed;
          resolve({
            status: res.statusCode,
            hasHomeFeed: !!hf,
            todayName: hf && hf.todayRecommendation ? hf.todayRecommendation.name : null,
            keys: d ? Object.keys(d) : []
          });
        },
        fail: (e) => resolve({ fail: e.errMsg })
      });
    });
  }, d.token);
  console.log('wx.request result:', JSON.stringify(r));
} catch(e){ console.log('evaluate err:', e.message); }
try{await mp.disconnect()}catch(e){}
})().catch(e=>console.error('FATAL',e.message));

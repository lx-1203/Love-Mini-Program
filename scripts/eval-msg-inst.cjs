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
try {
  const r = await mp.evaluate(() => {
    try {
      const pages = getCurrentPages();
      const page = pages[pages.length-1];
      // 访问页面实例的 setup 返回（响应式代理）
      const inst = page && (page.$vm || page);
      // 尝试访问 store 相关：遍历实例属性
      const keys = [];
      for (const k in inst) {
        try { if (typeof inst[k] !== 'function' && k.length < 40) keys.push(k); } catch(e){}
      }
      // 尝试 getApp
      const app = getApp && getApp();
      const appKeys = app ? Object.keys(app).slice(0,20) : [];
      return { keys: keys.slice(0,40), appKeys };
    } catch(e) { return { err: e.message }; }
  });
  console.log('inst keys:', JSON.stringify(r));
} catch(e){ console.log('eval err:', e.message); }
try{await mp.disconnect()}catch(e){}
})().catch(e=>console.error('FATAL',e.message));

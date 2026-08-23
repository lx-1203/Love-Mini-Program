process.on('uncaughtException',(e)=>console.log('[uncaught]',e.message));
const automator=require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
const http=require('http');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function post(url,body){return new Promise((res,rej)=>{const u=new URL(url);const r=http.request({hostname:u.hostname,port:u.port,path:u.pathname,method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}},(x)=>{let d='';x.on('data',c=>d+=c);x.on('end',()=>res(JSON.parse(d)))});r.on('error',rej);r.write(body);r.end()})}
(async()=>{
const mp=await automator.connect({wsEndpoint:'ws://127.0.0.1:9420'});mp.on('error',()=>{});
const d=await post('http://127.0.0.1:8080/api/v1/auth/guest-login','{}');
await mp.callWxMethod('setStorage',{key:'token',data:d.token});
await mp.reLaunch('/pages/messages/index');await sleep(20000);
// 在页面上下文直接请求 dashboard 并检查 warmPeople avatar
try {
  const r = await mp.evaluate((token) => {
    return new Promise((resolve) => {
      wx.request({
        url: 'http://127.0.0.1:8080/api/v1/messages/relationship-dashboard',
        method: 'GET',
        header: { Authorization: 'Bearer ' + token },
        success: (res) => {
          const d = res.data && res.data.data ? res.data.data : res.data;
          const wp = (d && d.warmPeople) || [];
          resolve({
            warmCount: wp.length,
            warmAvatars: wp.slice(0,5).map(p => ({ name: p.name, avatar: p.avatarUrl })),
            recentChatsCount: (d && d.recentChats ? d.recentChats.length : (d && d.conversations ? d.conversations.length : 0))
          });
        },
        fail: (e) => resolve({ fail: e.errMsg })
      });
    });
  }, d.token);
  console.log('dashboard check:', JSON.stringify(r));
} catch(e){ console.log('evaluate err:', e.message); }
try{await mp.disconnect()}catch(e){}
})().catch(e=>console.error('FATAL',e.message));

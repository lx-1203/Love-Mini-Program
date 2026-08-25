const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
async function main(){
  const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' });
  await new Promise(r=>setTimeout(r,4000));
  try { const g=await (await fetch('http://127.0.0.1:8080/api/v1/auth/guest-login',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).json(); await mp.callWxMethod('setStorageSync','token',g.token); } catch(e){}
  // 先回首页触发 session 获取
  try{ await mp.reLaunch('/pages/home/index'); await new Promise(r=>setTimeout(r,8000)); console.log('[home ok]'); }catch(e){}
  // 再进聊天会话 session-1 (有 "111" sender=self)
  try{ await mp.reLaunch('/pages/chat-session/index?sessionId=session-1'); await new Promise(r=>setTimeout(r,15000)); await mp.screenshot({path:'D:\\6\\恋爱小程序\\tmp\\chat-111-verify.png'}); console.log('[OK] chat'); }catch(e){ console.log('[chat FAIL]',e.message); }
  await mp.disconnect(); process.exit(0);
}
main().catch(e=>{console.error(e);process.exit(1)});

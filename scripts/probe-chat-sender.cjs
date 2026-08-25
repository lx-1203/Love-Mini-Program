const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
async function main(){
  const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' });
  await new Promise(r=>setTimeout(r,3000));
  try { const g=await (await fetch('http://127.0.0.1:8080/api/v1/auth/guest-login',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).json(); await mp.callWxMethod('setStorageSync','token',g.token); } catch(e){}
  try{ await mp.reLaunch('/pages/chat-session/index?sessionId=session-1'); }catch(e){ console.log('[relaunch err]',e.message); }
  await new Promise(r=>setTimeout(r,12000));
  try{
    const page = await mp.currentPage();
    console.log('[path]', page.path);
    const self = await page.$$('.bubble-wrap--self');
    const peer = await page.$$('.bubble-wrap--peer');
    console.log('[self bubbles]', self.length, '[peer bubbles]', peer.length);
    // 读取 self 气泡的文字
    for (const s of self) { const t = await s.$$('text'); for (const tt of t.slice(0,3)) { const txt = await tt.text(); console.log('  self text:', txt); } }
    for (const p of peer) { const t = await p.$$('text'); for (const tt of t.slice(0,3)) { const txt = await tt.text(); console.log('  peer text:', txt); } }
  }catch(e){ console.log('[query err]', e.message); }
  await mp.disconnect(); process.exit(0);
}
main().catch(e=>{console.error(e);process.exit(1)});

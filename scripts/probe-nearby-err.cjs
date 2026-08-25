const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
async function main(){
  const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' });
  mp.on('exception', e=>{ console.log('[EXC]', typeof e, e&&e.message, (e&&e.stack||'').slice(0,600)); });
  mp.on('console', m=>{ console.log('[CONSOLE]', m.type, String((m.args||[]).map(a=>a&&a.value!==undefined?a.value:(typeof a==='object'?JSON.stringify(a):a)).join(' ')).slice(0,400)); });
  await new Promise(r=>setTimeout(r,4000));
  try { const g=await (await fetch('http://127.0.0.1:8080/api/v1/auth/guest-login',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).json(); await mp.callWxMethod('setStorageSync','token',g.token); console.log('[login]'); } catch(e){}
  console.log('[nav] reLaunch nearby...');
  try{ await mp.reLaunch('/pages/nearby/index'); console.log('[reLaunch ok]'); }catch(e){ console.log('[reLaunch err]', e&&e.message, JSON.stringify(e).slice(0,300)); }
  await new Promise(r=>setTimeout(r,15000));
  try{ const p=await mp.currentPage(); console.log('[page]', p&&p.path, JSON.stringify(p&&p.query)); }catch(e){ console.log('[page err]', e.message); }
  await mp.disconnect(); process.exit(0);
}
main().catch(e=>{console.error(e);process.exit(1)});

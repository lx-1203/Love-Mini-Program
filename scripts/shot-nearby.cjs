const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
const fs=require('fs'), path=require('path');
const OUT='D:\\6\\恋爱小程序\\tmp\\nearby-shots'; fs.mkdirSync(OUT,{recursive:true});
const errs=[], cons=[];
async function main(){
  const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' });
  mp.on('exception', e=>errs.push(String(e&&e.message||e).slice(0,250)));
  mp.on('console', m=>{ if(m.type==='error'||m.type==='warn') cons.push(`[${m.type}] `+String((m.args||[]).map(a=>a&&a.value!==undefined?a.value:a).join(' ')).slice(0,250)); });
  await new Promise(r=>setTimeout(r,2500));
  try { const g=await (await fetch('http://127.0.0.1:8080/api/v1/auth/guest-login',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).json(); await mp.callWxMethod('setStorageSync','token',g.token); } catch(e){}
  try{ await mp.reLaunch('/pages/nearby/index'); await new Promise(r=>setTimeout(r,10000)); const page=await mp.currentPage(); await mp.screenshot({path:path.join(OUT,'nearby-top.png')}); console.log('[OK] path=',page&&page.path,'->',path.join(OUT,'nearby-top.png')); }catch(e){ console.log('[FAIL]',e.message); }
  fs.writeFileSync(path.join(OUT,'_errors.json'), JSON.stringify({errs,cons},null,2));
  console.log('errs=',errs.length,'cons=',cons.length);
  await mp.disconnect(); process.exit(0);
}
main().catch(e=>{console.error(e);process.exit(1)});

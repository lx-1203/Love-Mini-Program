const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
async function main(){
  const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' });
  await new Promise(r=>setTimeout(r,3000));
  try { const g=await (await fetch('http://127.0.0.1:8080/api/v1/auth/guest-login',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).json(); await mp.callWxMethod('setStorageSync','token',g.token); } catch(e){}
  try{ await mp.reLaunch('/pages/nearby/index'); }catch(e){ console.log('[relaunch err]',e.message); }
  await new Promise(r=>setTimeout(r,12000));
  const page = await mp.currentPage();
  const imgs = await page.$$('image');
  console.log('[total images]', imgs.length);
  for (let i=0;i<imgs.length;i++){ const s=await imgs[i].attribute('src'); if(/school|scenic|cover|banner|main/.test(String(s))) console.log('  #',i,'src=',String(s).slice(0,120)); }
  // 查询含 cover-star/banner 的 view
  const els = await page.$$('[class*="hero"]');
  console.log('[hero count]', els.length);
  for(const e of els){ const c=await e.attribute('class'); console.log('  ',c); }
  // 页面根 scroll 信息
  const data = await page.data();
  console.log('[page data keys]', Object.keys(data||{}).slice(0,20));
  await mp.disconnect(); process.exit(0);
}
main().catch(e=>{console.error(e);process.exit(1)});

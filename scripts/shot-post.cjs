const automator = require(require.resolve("miniprogram-automator", { paths: [require("path").join(__dirname, "..", "apps/client"), require("path").resolve(__dirname, "..")] }));
const REPO_ROOT = require("path").resolve(__dirname, "..");
async function main(){
  const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' });
  await new Promise(r=>setTimeout(r,3000));
  try { const g=await (await fetch('http://127.0.0.1:8080/api/v1/auth/guest-login',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).json(); await mp.callWxMethod('setStorageSync','token',g.token); } catch(e){}
  try{ await mp.reLaunch('/pages/home/index'); await new Promise(r=>setTimeout(r,7000)); }catch(e){}
  for (const route of ['/pages/village/post','/pages/circles/post-topic?circleId=1']) {
    try{ await mp.navigateTo(route); await new Promise(r=>setTimeout(r,9000)); const p=await mp.currentPage(); const out=`${REPO_ROOT}\\tmp\\post-`+route.replace(/[^a-z]/gi,'_')+'.png'; await mp.screenshot({path:out}); console.log('[OK]',route,'->',p.path,'->',out); }catch(e){ console.log('[FAIL]',route,e.message); }
    try{ await mp.navigateBack(); await new Promise(r=>setTimeout(r,1500)); }catch(e){}
  }
  await mp.disconnect(); process.exit(0);
}
main().catch(e=>{console.error(e);process.exit(1)});

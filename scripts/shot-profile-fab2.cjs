const automator = require(require.resolve("miniprogram-automator", { paths: [require("path").join(__dirname, "..", "apps/client"), require("path").resolve(__dirname, "..")] }));
const REPO_ROOT = require("path").resolve(__dirname, "..");
async function main(){
  const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' });
  await new Promise(r=>setTimeout(r,4000));
  try { const g=await (await fetch('http://127.0.0.1:8080/api/v1/auth/guest-login',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).json(); await mp.callWxMethod('setStorageSync','token',g.token); } catch(e){}
  try{ await mp.reLaunch('/pages/profile/index'); await new Promise(r=>setTimeout(r,22000)); const p=await mp.currentPage(); console.log('[page]',p&&p.path); await mp.screenshot({path:`${REPO_ROOT}\\tmp\\profile-fab2.png`}); console.log('[OK]'); }catch(e){ console.log('[FAIL]',e.message); }
  await mp.disconnect(); process.exit(0);
}
main().catch(e=>{console.error(e);process.exit(1)});

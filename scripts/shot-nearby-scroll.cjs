const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
async function main(){
  const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' });
  await new Promise(r=>setTimeout(r,3000));
  try { const g=await (await fetch('http://127.0.0.1:8080/api/v1/auth/guest-login',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).json(); await mp.callWxMethod('setStorageSync','token',g.token); } catch(e){}
  try{ await mp.reLaunch('/pages/nearby/index'); await new Promise(r=>setTimeout(r,14000)); 
    // 滚动内部 scroll-view
    await mp.callWxMethod('createSelectorQuery').then(()=>{}).catch(()=>{});
    // 通过 evaluate 滚动态
    await mp.evaluate('wx.createSelectorQuery().select(".nearby-home__scroll").node(function(res){ if(res) { res.node.scrollTop = 1400; } }).exec()').catch(e=>console.log('[scroll eval err]',e.message));
    await new Promise(r=>setTimeout(r,2500));
    await mp.screenshot({path:'D:\\6\\恋爱小程序\\tmp\\nearby-scroll.png'}); console.log('[OK] nearby-scroll');
  }catch(e){ console.log('[FAIL]',e.message); }
  await mp.disconnect(); process.exit(0);
}
main().catch(e=>{console.error(e);process.exit(1)});

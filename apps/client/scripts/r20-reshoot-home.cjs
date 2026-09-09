const path = require("path");
const automator = require("miniprogram-automator");
try {
  const mpMod = require("miniprogram-automator/out/MiniProgram.js");
  const MP = mpMod.default || mpMod;
  if (MP && MP.prototype) MP.prototype.checkVersion = async function () {};
} catch (e) {}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = "D:/6/恋爱小程序/截图存档/r20";
(async () => {
  const mp = await automator.connect({ wsEndpoint: "ws://127.0.0.1:9420" });
  await mp.reLaunch("/pages/discover/index");
  await sleep(4000);
  await mp.screenshot({ path: path.join(OUT, "01-after-login.png") });
  console.log("[shot] 01");
  await mp.reLaunch("/pages/home/index");
  await sleep(2000);
  await mp.reLaunch("/pages/home/index");
  await sleep(5000);
  await mp.screenshot({ path: path.join(OUT, "02-home-top.png") });
  console.log("[shot] 02");
  await mp.pageScrollTo(560);
  await sleep(1500);
  await mp.screenshot({ path: path.join(OUT, "03-home-mid.png") });
  console.log("[shot] 03");
  await mp.pageScrollTo(1250);
  await sleep(1500);
  await mp.screenshot({ path: path.join(OUT, "04-home-community.png") });
  console.log("[shot] 04");
  await mp.disconnect();
})().catch((e) => { console.error("[fatal]", e && e.message); process.exit(1); });

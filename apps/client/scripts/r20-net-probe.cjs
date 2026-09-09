/* 模拟器内直发 wx.request 探测后端连通性 */
const automator = require("miniprogram-automator");
try {
  const mpMod = require("miniprogram-automator/out/MiniProgram.js");
  const MP = mpMod.default || mpMod;
  if (MP && MP.prototype) MP.prototype.checkVersion = async function () {};
} catch (e) {}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const mp = await automator.connect({ wsEndpoint: "ws://127.0.0.1:9420" });
  const res = await mp.callWxMethod("request", {
    url: "http://127.0.0.1:8080/api/v1/circles",
    method: "GET",
    timeout: 8000,
  });
  console.log("status:", res.statusCode);
  console.log("body head:", JSON.stringify(res.data).slice(0, 220));
  await mp.disconnect();
})().catch((e) => {
  console.error("[probe-fail]", e && e.message);
  process.exit(1);
});

/* 单页截图：node r20-shot-one.cjs <name> <route> */
const path = require("path");
const automator = require("miniprogram-automator");
const REPO_ROOT = require("path").resolve(__dirname, "..", "..", "..");
try {
  const mpMod = require("miniprogram-automator/out/MiniProgram.js");
  const MP = mpMod.default || mpMod;
  if (MP && MP.prototype) MP.prototype.checkVersion = async function () {};
} catch (e) {}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const [name, route] = process.argv.slice(2);
  const mp = await automator.connect({ wsEndpoint: "ws://127.0.0.1:9420" });
  await mp.reLaunch(route);
  await sleep(4500);
  console.log("[page]", (await mp.currentPage()).path);
  await mp.screenshot({ path: path.join(`${REPO_ROOT}/截图存档/r20`, `${name}.png`) });
  console.log("[shot]", name);
  await mp.disconnect();
})().catch((e) => { console.error("[fatal]", e && e.message); process.exit(1); });

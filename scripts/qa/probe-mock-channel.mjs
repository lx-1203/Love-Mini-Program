/* 探针：C1/C3 能力件上设备前的通道实测（只读产品行为，不改任何账）。
   要回答的三问（每问都落一行 PROBE_*，答案写进 capability 报告）：
   ① mockWxMethod('showModal') 装上后，mini.callWxMethod('showModal') 是否拿到脚本化回值（通道本身活着）；
   ② 应用侧 uni.showModal（走编译期快照 Tn）是否被 mock 拦到 —— r-exec-cli.mjs:622-628 自述
      "uni.* 走启动期快照 Tn、CLI evaluate 的赋值永远不被经过"；App.mockWxMethod 是 IDE 协议命令
      不是 evaluate 赋值，拦不拦得到快照必须实测，不许推断；
   ③ wx.request 被 mock 成 500 后，应用侧 uni.request 是否拿到失败（C3 的注入通道可行性）。
   用法：node scripts/qa/probe-mock-channel.mjs --project apps/client/dist/build/mp-weixin-real
   结束 restore 全部 mock、disconnect（不 close()），零落盘。 */
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { readIdePort } from "./ide-port-config.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const require = createRequire(import.meta.url);
function automator() {
  try { return require("miniprogram-automator"); } catch { /* fallthrough */ }
  const store = join(REPO, "node_modules", ".pnpm");
  const hit = readdirSync(store).filter((d) => d.startsWith("miniprogram-automator@")).sort()[0];
  return hit ? require(join(store, hit, "node_modules", "miniprogram-automator")) : null;
}
const A = automator();
const PROJECT = resolve(REPO, (process.argv[process.argv.indexOf("--project") + 1] || "apps/client/dist/build/mp-weixin-real"));
const PORT = readIdePort().port;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const mini = await A.connect({ wsEndpoint: "ws://127.0.0.1:" + PORT });
console.log("PROBE_CONNECT port=" + PORT + " project=" + PROJECT);
const page = await mini.currentPage();
console.log("PROBE_PAGE path=" + (page && page.path));

/* ① 通道活性：mock 后直接 callWxMethod */
try {
  await mini.mockWxMethod("showModal", { confirm: true, cancel: false, errMsg: "showModal:ok" });
  const direct = await mini.callWxMethod("showModal", { title: "probe-direct" });
  console.log("PROBE_DIRECT showModal=>" + JSON.stringify(direct) + " => 通道=" + (direct && direct.confirm === true ? "活" : "没拦到"));
} catch (e) { console.log("PROBE_DIRECT ERR " + String(e.message).slice(0, 120)); }

/* ② 应用侧 uni.showModal 是否被拦（快照 Tn 问题） */
try {
  const r = await mini.evaluate(() => {
    return new Promise((res) => {
      try {
        if (typeof uni === "undefined") { res("ERR uni undefined in app context"); return; }
        uni.showModal({
          title: "probe-app-side",
          success: (r2) => res("APP_RESULT " + JSON.stringify(r2)),
          fail: (e2) => res("APP_FAIL " + JSON.stringify(e2)),
        });
        setTimeout(() => res("APP_TIMEOUT 6s 无回调"), 6000);
      } catch (e) { res("ERR " + e.message); }
    });
  });
  console.log("PROBE_APP_MODAL " + String(r).slice(0, 220) + " => 应用侧=" + (/APP_RESULT .*"confirm":true/.test(String(r)) ? "被mock拦到(confirm=true)" : /APP_RESULT/.test(String(r)) ? "回了原值(没拦到)" : String(r).slice(0, 40)));
} catch (e) { console.log("PROBE_APP_MODAL ERR " + String(e.message).slice(0, 120)); }

/* ③ wx.request 注入：mock 成 statusCode 500，应用侧 uni.request 是否拿到失败 */
try {
  await mini.mockWxMethod("request", { statusCode: 500, data: { mocked: true }, errMsg: "request:ok" });
  const r = await mini.evaluate(() => {
    return new Promise((res) => {
      try {
        uni.request({
          url: "http://127.0.0.1:8080/api/v1/app-config",
          method: "GET",
          success: (r2) => res("APP_REQ_RESULT " + JSON.stringify(r2).slice(0, 200)),
          fail: (e2) => res("APP_REQ_FAIL " + JSON.stringify(e2).slice(0, 200)),
        });
        setTimeout(() => res("APP_REQ_TIMEOUT 8s 无回调"), 8000);
      } catch (e) { res("ERR " + e.message); }
    });
  });
  console.log("PROBE_APP_REQUEST " + String(r).slice(0, 260) + " => 注入=" + (/statusCode":500|"mocked":true/.test(String(r)) ? "拦到(应用侧拿到500)" : /APP_REQ_FAIL/.test(String(r)) ? "fail分支(可能是mock errMsg)" : "没拦到"));
} catch (e) { console.log("PROBE_APP_REQUEST ERR " + String(e.message).slice(0, 120)); }

/* 收尾：全部 restore，绝不留 mock 在载具上 */
for (const m of ["showModal", "request"]) {
  try { await mini.restoreWxMethod(m); console.log("PROBE_RESTORE " + m + "=ok"); }
  catch (e) { console.log("PROBE_RESTORE " + m + "=ERR " + String(e.message).slice(0, 80)); }
}
mini.disconnect();
console.log("PROBE_DONE（已 disconnect，未 close()）");
process.exit(0);

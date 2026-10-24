/* 探针 #6：应用侧存储路由 —— uni 门面的 getStorageSync 到底读哪一层（raw wx vs 自定义表）。 */
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { readIdePort } from "./ide-port-config.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const require2 = createRequire(import.meta.url);
function automator() {
  try { return require2("miniprogram-automator"); } catch { /* fallthrough */ }
  const store = join(REPO, "node_modules", ".pnpm");
  const hit = readdirSync(store).filter((d) => d.startsWith("miniprogram-automator@")).sort()[0];
  return hit ? require2(join(store, hit, "node_modules", "miniprogram-automator")) : null;
}
const A = automator();
const PORT = readIdePort().port;
const mini = await A.connect({ wsEndpoint: "ws://127.0.0.1:" + PORT });
console.log("PROBE6_CONNECT port=" + PORT);

const r = await mini.evaluate(() => {
  try {
    const idx = require("common/vendor.js").index;
    const out = {};
    out.rawWrite = (wx.setStorageSync("qaRaw", "RAW"), true);
    out.facReadOfRaw = idx.getStorageSync("qaRaw");
    out.facWrite = (idx.setStorageSync("qaFac", "FAC"), true);
    out.rawReadOfFac = wx.getStorageSync("qaFac");
    out.facReadOfFac = idx.getStorageSync("qaFac");
    out.rawReadToken = String(wx.getStorageSync("token") || "").slice(0, 16);
    out.facReadToken = String(idx.getStorageSync("token") || "").slice(0, 16);
    out.hasFacGetStorage = typeof idx.getStorageSync;
    out.hasFacSetStorage = typeof idx.setStorageSync;
    return JSON.stringify(out);
  } catch (e) { return "ERR " + e.message; }
});
console.log("PROBE6_STORAGE " + String(r).slice(0, 500));

/* 收尾清探针键 */
await mini.evaluate(() => { try { wx.removeStorageSync("qaRaw"); wx.removeStorageSync("qaFac"); return "cleaned"; } catch (e) { return "ERR " + e.message; } });
mini.disconnect();
console.log("PROBE6_DONE");
process.exit(0);

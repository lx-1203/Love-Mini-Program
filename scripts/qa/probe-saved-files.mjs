#!/usr/bin/env node
/**
 * probe-saved-files.mjs —— 量「automator 截屏把小程序本地文件存储写满」这件事到底是不是那些超时的根因。
 *
 * 起因（R2b 实测，2026-10-19）：重开项目窗口之后取景仍成串失败，错误不是含糊的通道超时，而是
 *   `saveFile:fail exceeded the maximum size of the file storage limit`
 * 而 automator 的 screenshot 实现是 `App.captureScreenshot` → 回 base64 → Node 侧 writeFile
 * （out/MiniProgram.js 里可见），⇒ 那个 saveFile 是 **IDE/应用侧**为了产图做的落盘，
 * 上限是小程序本地文件存储配额。窗口重开不清它（配额记在应用存储目录里），所以第二轮开始就越拍越失败。
 *
 * 本探针只做三件事，全部具名读数：
 *   1) getSavedFileList 能不能经 callWxMethod 读到（读不到就如实写 unsupported，不猜）
 *   2) 每条 removeSavedFile 的结果
 *   3) 清完之后当场拍一张，量它成不成（这才是"修法有效"的证据，不是"我调了清理"）
 *
 * 用法：node scripts/qa/probe-saved-files.mjs [--screenshot-after <png路径>] [--project <产物目录>]
 * 退出码：0 清理与补拍都成；1 清理做了但补拍仍失败（⇒ 根因不是这个，得换假设）；2 前提不成立（租约/连不上）。
 */
import { mkdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { guardUiLease, heldLeases, reclaimOrphanUi, releaseUi } from "./ui-lease.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const require = createRequire(import.meta.url);
const PK = "SAVEDPROBE";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] && !String(process.argv[i + 1]).startsWith("--") ? process.argv[i + 1] : d; };
const PROJECT = resolve(arg("project", join(REPO, "apps/client/dist/build/mp-weixin-real")));
const WS = arg("ws", "ws://127.0.0.1:9420");
const SHOT = resolve(arg("screenshot-after", join(REPO, "tmp/qa/probe-after-clean.png")));

const OWNER = "probe-saved-files";
for (const h of heldLeases()) {
  if (!h.orphan) { console.log(`${PK}=NOT-EVIDENCED reason=lease-held-live owner=${h.owner}@${h.pid} ⇒ 有活着的持租进程，探针不占设备`); process.exit(2); }
  const r = reclaimOrphanUi({ owner: OWNER, file: h.file, confirm: "RECLAIM_ORPHAN", reason: "上一发取景腿被 TaskStop 打断，锁无人续租" });
  console.log(`${PK}_PRECLEAN from=${h.owner}@${h.pid} reclaimed=${r && r.reclaimed ? "yes" : "no"}`);
}
guardUiLease({ owner: OWNER, tag: `${PK}LEASE`, failTag: PK });

const automator = require(require.resolve("miniprogram-automator", { paths: [join(REPO, "apps/client"), REPO] }));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let mp = null;
try {
  mp = await automator.connect({ wsEndpoint: WS });
} catch (e) {
  console.log(`${PK}=NOT-EVIDENCED reason=connect-failed err=${String(e && e.message).slice(0, 140)}`);
  releaseUi({ owner: OWNER });
  process.exit(2);
}
let listed = -1, removed = 0, removeFails = 0, listErr = "";
try {
  const res = await mp.callWxMethod("getSavedFileList");
  const fl = res && res.fileList;
  listed = Array.isArray(fl) ? fl.length : -1;
  if (!Array.isArray(fl)) listErr = "返回值里没有 fileList 数组：" + JSON.stringify(res).slice(0, 160);
  for (const it of (Array.isArray(fl) ? fl : [])) {
    const fp = it && (it.filePath || it.tempFilePath);
    if (!fp) { removeFails++; continue; }
    try { await mp.callWxMethod("removeSavedFile", { filePath: fp }); removed++; }
    catch (e) { removeFails++; console.log(`${PK}_RM_FAIL ${String(e && e.message).slice(0, 100)}`); }
  }
} catch (e) { listErr = String(e && e.message).slice(0, 200); }
console.log(`${PK}_LISTED=${listed} ${listErr ? "reason=" + listErr : "（能读）"} ${PK}_REMOVED=${removed} REMOVE_FAILED=${removeFails}`);

/* getSavedFileList 是**旧 saveFile 那套**的名册，0 条不代表本地存储是空的：
   FileSystemManager 写在 wx.env.USER_DATA_PATH 下的文件不进那份名册，却照样吃 10MB 配额。
   所以第二问：在应用上下文里直接列 USER_DATA_PATH、算总量、逐个 unlink，再当场补拍一张。
   automator 的 evaluate 是"在页面上下文里跑一个函数并回传结果"，这条路不需要碰 IDE 的用户目录。 */
let fsInfo = null;
try {
  fsInfo = await mp.evaluate(() => {
    try {
      const fm = wx.getFileSystemManager();
      const dir = wx.env.USER_DATA_PATH;
      const names = fm.readdirSync(dir);
      let bytes = 0; const detail = [];
      for (const n of names) {
        let s = 0;
        try { s = (fm.statSync(dir + "/" + n).size) || 0; } catch { /* 目录项算不出大小就按 0 */ }
        bytes += s; detail.push(n + ":" + s);
        try { fm.unlinkSync(dir + "/" + n); } catch { try { fm.rmdirSync(dir + "/" + n, true); } catch { /* 删不动的如实计数 */ } }
      }
      const after = fm.readdirSync(dir).length;
      return { ok: true, dir, before: names.length, bytes, after, sample: detail.slice(0, 6).join(" | ") };
    } catch (e) { return { ok: false, err: String(e && e.message).slice(0, 160) }; }
  });
} catch (e) { fsInfo = { ok: false, err: "evaluate 调用失败：" + String(e && e.message).slice(0, 120) }; }
console.log(`${PK}_USERDATA ${JSON.stringify(fsInfo)}`);

mkdirSync(dirname(SHOT), { recursive: true });
let shotOk = false, shotBytes = 0, shotErr = "";
try {
  const b64 = await mp.screenshot({ path: SHOT });
  shotOk = true;
  try { shotBytes = require("node:fs").statSync(SHOT).size; } catch { shotBytes = b64 ? String(b64).length : 0; }
} catch (e) { shotErr = String(e && e.message).slice(0, 160); }
console.log(`${PK}_SHOT ok=${shotOk ? "yes" : "no"} bytes=${shotBytes} ${shotErr ? "err=" + shotErr : ""}`);
try { mp.disconnect(); } catch { /* 断不开由租约过期兜底 */ }
releaseUi({ owner: OWNER });
if (!shotOk) { console.log(`${PK}=FAIL 清理做了但补拍仍失败 ⇒ 根因不是 saveFile 配额（或清理没生效），换假设继续查`); process.exit(1); }
console.log(`${PK}=PASS listed=${listed} removed=${removed} 清后补拍=${shotBytes}B`);
process.exit(0);

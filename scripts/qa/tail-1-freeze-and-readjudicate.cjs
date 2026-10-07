/* 收尾第 ① 步：冻结权威件 → 逐条改判证据 → 派生重采清单。
   只能在执行轮收口、UI 租约释放之后跑（它会读一份不再被写的 results）。
   每一步都把"判据"打成日志而不是只打成功/失败——本轮已被"退出码会说谎"坑过三次。 */
const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const REPO = path.resolve(__dirname, "..", "..");
/* node 解析序：NODE22_EXE 显式 > 当前 node 自身（仅当 ≥20 大版）。老 node 上留空 ⇒ 立刻报错指路，
   绝不回落到盘符死路径（这条链上的门在 v16 会假红，宁可不跑也不跑出假读数）。 */
const NODE = process.env.NODE22_EXE || (Number(process.versions.node.split(".")[0]) >= 20 ? process.execPath : "");
if (!NODE) {
  console.log("TAIL1=ABORT reason=拿不到可用的 node（本进程 " + process.version + " 太老且没设 NODE22_EXE）");
  process.exit(2);
}
const LIVE = path.join(REPO, "reports", "audit", "round-6", "interact", "exec-results.json");
const CKPT = path.join(REPO, "tmp", "qa", "checkpoints", "exec-R6.json");
const LOCK_DIR = path.join(REPO, "tmp", "qa", "locks");
const OUTDIR = path.join(REPO, ".zcode", "tmp", "readjudicated");

function sha16(buf) { return require("crypto").createHash("sha1").update(buf).digest("hex").slice(0, 16); }
function die(m) { console.log("TAIL1=ABORT reason=" + m); process.exit(2); }

/* —— 前置：确认没有写者还在动权威件 —— */
if (!fs.existsSync(LIVE)) die("权威件不存在 " + LIVE);
const m0 = fs.statSync(LIVE).mtimeMs;
const ageSec = Math.round((Date.now() - m0) / 1000);
/* 租约扫描：端口是发现的、不是写死的 —— 本仓实测 DevTools 自动化端口在一天内从 9430 走到 9431，
   而首版这里写死 wechat-automation-9431.lock。更糟的是读不到就 catch 掉当作"没人持有"，
   于是这道防半写的前置检查在端口变化后会**静默失效**（fail-open），只剩 mtime 一道防线。
   现在扫全目录，并把"看到但判为陈旧"的锁也打出来，好让人核对它确实区分了两类。 */
let aliveLocks = [], staleLocks = [], lockScanErr = null;
try {
  for (const f of fs.readdirSync(LOCK_DIR)) {
    if (!/\.lock$/.test(f)) continue;
    let o = null;
    try { o = JSON.parse(fs.readFileSync(path.join(LOCK_DIR, f), "utf8")); } catch (e) { staleLocks.push(f + "(不可解析)"); continue; }
    const hb = Date.parse(o.lastHeartbeat || o.leaseUntil || 0);
    const age = Number.isFinite(hb) ? Math.round((Date.now() - hb) / 1000) : null;
    if (age !== null && age < 120) aliveLocks.push(`${f}@${o.owner || "?"}(心跳${age}s前)`);
    else staleLocks.push(`${f}@${o.owner || "?"}(${age === null ? "无心跳字段" : age + "s前"})`);
  }
} catch (e) { lockScanErr = e.code || e.message; }
console.log("TAIL1_PRE live_age_sec=" + ageSec + " lock_alive=" + (aliveLocks.length > 0)
  + " locks_alive=[" + aliveLocks.join(", ") + "]"
  + " locks_stale=[" + staleLocks.join(", ") + "]"
  + (lockScanErr ? " lock_scan_error=" + lockScanErr : ""));
if (lockScanErr === "ENOENT") console.log("TAIL1_NOTE=租约目录整个不存在，无法用锁判「没人持有」——只依赖下面的 mtime 静默判据");
if (aliveLocks.length) die("仍有活租约（" + aliveLocks.join(", ") + "），执行轮没收口——现在冻结会拿到半写状态");
if (ageSec < 120) die("权威件 2 分钟内还被写过，等它静默再冻结");

const raw = fs.readFileSync(LIVE);
const j = JSON.parse(raw.toString("utf8"));
const rows = j.results || [];
const h = {};
for (const r of rows) h[r.status] = (h[r.status] || 0) + 1;
const uniqKey = new Set(rows.map((r) => r.suite + "|" + r.manifest + "|" + r.id));
const uniqId = new Set(rows.map((r) => r.id));
const s16 = sha16(raw);
const snap = path.join(REPO, ".zcode", "tmp", "round6-exec", "exec-results.tail-" + s16 + ".json");
fs.mkdirSync(path.dirname(snap), { recursive: true });
fs.writeFileSync(snap, raw);
console.log("TAIL1_FREEZE rows=" + rows.length + " uniq_key=" + uniqKey.size + " uniq_id=" + uniqId.size
  + " sha16=" + s16 + " → " + path.relative(REPO, snap));
console.log("TAIL1_STATUS " + JSON.stringify(h));
const ck = JSON.parse(fs.readFileSync(CKPT, "utf8"));
console.log("TAIL1_CKPT updatedAt=" + ck.updatedAt + " failures=" + ((ck.failures || []).length)
  + "（滚动窗口/下界：D21 落码前完成的套件不写此字段、超 300 条会 splice，逐条明细以权威行 failureReason 为准，见台账 §57）"
  + " suites=" + Object.keys(ck.suites || {}).length
  + " completed=" + Object.values(ck.suites || {}).filter((s) => s.status === "completed").length);

/* —— 改判：不存在的文件不再当证据（--apply 只在 --out 落在 reports/** 之外时生效） —— */
fs.mkdirSync(OUTDIR, { recursive: true });
const applied = path.join(OUTDIR, "bandBC-" + s16 + ".json");
console.log("TAIL1_READJ 输入=" + path.relative(REPO, snap) + " 输出=" + path.relative(REPO, applied));
let out = "";
try {
  out = cp.execFileSync(NODE, [
    path.join(REPO, "scripts", "qa", "readjudicate-evidence.mjs"),
    snap, "--apply", "--out", applied,
  ], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
} catch (e) {
  console.log("TAIL1_READJ=FAIL exit=" + (e.status || "?") + " 末行=" + String(e.message).split("\n").slice(-1)[0]);
  die("改判台非 0 退出——它的守恒自判可能拒写，看上面日志");
}
const keep = out.split("\n").filter((l) => /RJ_APPLY|RJ_RESULT|RJ_SUMMARY|CONSERVATION/.test(l));
keep.forEach((l) => console.log("  " + l.slice(0, 220)));
if (!/RJ_APPLY=WROTE/.test(out)) die("改判结果没写出文件（apply 条件未满足），不得继续");

/* —— 派生重采清单（哪些用例因缺帧被降级，必须重采后才能算通过率） —— */
let rl = "";
try {
  rl = cp.execFileSync(NODE, [path.join(REPO, "scripts", "qa", "make-rerun-list.mjs"), applied],
    { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
} catch (e) {
  console.log("TAIL1_RERUN=FAIL " + String(e.message).split("\n").slice(-1)[0]);
  die("重采清单派生失败");
}
rl.split("\n").filter((l) => /RERUN|CONSERV| suites|例$/.test(l)).slice(0, 12).forEach((l) => console.log("  " + l.slice(0, 200)));
console.log("TAIL1=DONE freeze=" + path.relative(REPO, snap) + " readjudicated=" + path.relative(REPO, applied));

#!/usr/bin/env node
/**
 * shoot-fidelity-sweep.mjs —— 逐页串行取景（MP-FIDELITY Phase D）。
 *
 * 为什么单独一条腿（而不是复用现成的两条）：
 *   · scripts/mp-shoot-reference.cjs 的 PAGES 是 2026-08-22 那张表，里面 `/pages/village/detail`、
 *     `/pages/circles/index` 这类路由在今天的产物里根本不存在（分包后是 subpackages/…）⇒ 抄它等于拍一堆 404；
 *   · scripts/qa/real-tour-cli.mjs 走 wechatide CLI，出图实测 193×413，而它自己在 :14/:229 就写了
 *     "禁止跨 harness 比像素"（automator 是 378×814）⇒ 保真比对必须钉在 automator 这一尺上；
 *   · 两者都不给"每张帧记内容 hash"，而这个项目的老病就是逐字节相同的帧被当成两个状态的证据。
 *
 * 三条写在前面的事实：
 *   1. 设备是单例：本腿一开场就 guardUiLease，绝不与别的腿并发（并发不报错，只互相换页 ⇒ 空探针）。
 *   2. 分母来自账本，不来自我的记忆：页数 = baseline-ledger.json 的行数，且账本的 bandStamp 必须等于
 *      当前产物 band（不等就退 2 —— 拿别的档的帧比理想图是伪造）。
 *   3. console 采不到就如实写"采不到"：miniprogram-automator 0.12.1 没有 onConsole/onError
 *      （实测 grep 过 out/ 的导出面），我不假装 hook 上了。
 *
 * 用法：node scripts/qa/shoot-fidelity-sweep.mjs --ledger <baseline-ledger.json> --round R1
 *        [--identity A|B|none] [--project <产物目录>] [--out <帧根目录>] [--only a,b] [--limit n]
 *        [--settle 2600] [--harness automator] [--dry]
 *        [--params <route→query 表，见 scripts/qa/fidelity-sweep-params.json>]
 *   · none = 不铸票并清会话：登录即转发那类页（账本 identityPrecondition 现读 none）只有这一档拍得到；
 *   · B 不是"未登录"：B=guest-login，后端实测 loggedIn=true，拿去拍登录页照样被转走。
 * 退出码：0 全数落帧；1 有页没落到帧或有空白/重复帧；2 前提不成立（账本读不到 / band 不符 / 租约被占 / 连不上）。
 */
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync, existsSync, statSync, rmSync } from "node:fs";
import { resolve, dirname, join, relative, sep, delimiter } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

/* 刻意 **不 import** shoot-frameplan.mjs 来复用 hash16/judgeFrame：
   那个模块顶层就有租约与取景分支，import 它等于立刻上一台设备跑一整轮 plan
   （本仓已在 apply-plan-additions.mjs:23-25 把这条写死，理由相同；我自己刚在这上面栽过一次：
   取景腿被 import 触发、抢了租约、对着 mock 档跑了 31 组）。
   这里只用到"sha256 前 16 位"这一件事，算法逐字对齐 shoot-frameplan.mjs:119 / verify-evidence-corpus.mjs:28。
   judgeFrame 的 stateSig 词汇是为 frameplan 的步 token 设计的，喂路由名是误用，所以这里改用两个
   对保真真正有意义的判点：跨页同图、以及滚动前后逐字节相同（= 底部压根没换画面）。 */
const hash16 = (absPath) => createHash("sha256").update(readFileSync(absPath)).digest("hex").slice(0, 16);

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const require = createRequire(import.meta.url);
const RK = "FIDELITYSWEEP_RESULT";
/* manifest 里的 path 必须是「仓库相对 + 正斜杠」。Windows 上 REPO 是反斜杠形态，
   `p.replace(REPO + "/", "")` 永不命中 ⇒ 绝对路径被写进清单（real-tour-cli.mjs:31-37 记过同一坑，
   后果是判"断链帧"的解法两支都不匹配，整批帧被读成 UNRESOLVABLE）。 */
const relOf = (p) => relative(REPO, p).split(sep).join("/");
const WAIT = 9000;
const MIN_BYTES = 3000; /* 与 real-tour-cli.mjs:210 同地板：小于此的帧不当证据 */

const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] && !String(process.argv[i + 1]).startsWith("--") ? process.argv[i + 1] : d; };
const flag = (k) => process.argv.includes("--" + k);

const LEDGER = resolve(arg("ledger", ""));
const ROUND = arg("round", "");
const IDENTITY = arg("identity", "A");
const PROJECT = resolve(arg("project", join(REPO, "apps/client/dist/build/mp-weixin-real")));
const WS = arg("ws", "ws://127.0.0.1:9420");
const SETTLE = Number(arg("settle", String(WAIT)));
const ONLY = arg("only", "").split(",").map((s) => s.trim()).filter(Boolean);
const LIMIT = Number(arg("limit", "0"));
const dryRun = flag("dry");
const resume = flag("resume");

if (!LEDGER || !existsSync(LEDGER)) { console.log(`${RK}=NOT-EVIDENCED reason=no-ledger path=${LEDGER || "(没传 --ledger)"}`); process.exit(2); }
if (!ROUND) { console.log(`${RK}=NOT-EVIDENCED reason=no-round（帧目录必须带轮次，否则下一轮会覆写上一轮）`); process.exit(2); }

const ledger = JSON.parse(readFileSync(LEDGER, "utf-8"));
const rows = (ledger.rows || []);
if (!rows.length) { console.log(`${RK}=NOT-EVIDENCED reason=empty-ledger（空账本不许占设备）`); process.exit(2); }

/* band 核对：帧必须钉在账本声明的那棵树上。算法与 scripts/qa/artifact-band.mjs:14-24 一致。 */
function bandOf(dir) {
  const f = join(dir, "config/env.js");
  if (!existsSync(f)) return "";
  const buf = readFileSync(f);
  const m = String(buf).match(/MODE:\s*"([^"]+)"/);
  const { createHash } = require("node:crypto");
  return `${m ? m[1] : "?"}@${createHash("sha256").update(buf).digest("hex").slice(0, 8)}`;
}
const bandNow = bandOf(PROJECT);
if (!bandNow) { console.log(`${RK}=NOT-EVIDENCED reason=no-env-js dir=${PROJECT}`); process.exit(2); }
if (ledger.bandStamp && ledger.bandStamp !== bandNow) {
  console.log(`${RK}=NOT-EVIDENCED reason=band-mismatch ledger=${ledger.bandStamp} artifact=${bandNow} ⇒ 账本与产物不是同一棵树，取景就是假证据`);
  process.exit(2);
}

/* 页参数（--params <json: {"route":"query"}>）。为什么需要它：
   无参数 reLaunch 到 detail/circle-home/other 这类页，拍到的是"空壳/错误态"，
   拿它去比对理想图只会造出垃圾缺陷（实测 profile/other 无参顶部帧只有 16.6KB）。
   取值必须有出处，不许我编：
     village/detail?id=352              ← scripts/mp-shoot-reference.cjs:25
     circles/circle-home?circleId=8     ← GET /api/v1/circles 实测返回 8–15。
        本腿第一轮用的是 circleId=3，出处是 round-6 ops 里一条**负例**引用的值：
        它不在真实 id 域里 ⇒ circle-home 顶部帧只有 31,974B（空壳），
        我还把它当成"P0 页面缺陷"报了出去。换成 8（摄影圈，与理想图同名）同一帧 159,723B ⇒
        那条"缺陷"是我的仪表造的，不是产品的。参数取值必须核它在真实 id 域里存不存在。
     profile-extra/profile/other?userId=100159 ← 同语料；本腿登录身份铸到的是 100158，看别人主页要另一个 id
   没给参数的页照旧走无参数路径，并在清单里记 query=""（空壳帧就如实是空壳帧）。 */
let PARAMS = {};
const paramsFile = arg("params", "");
if (paramsFile) {
  const p = resolve(paramsFile);
  if (!existsSync(p)) { console.log(`${RK}=NOT-EVIDENCED reason=params-file-unreadable path=${paramsFile}`); process.exit(2); }
  PARAMS = Object.fromEntries(Object.entries(JSON.parse(readFileSync(p, "utf-8"))).filter(([k]) => !k.startsWith("_")));
  console.log(`SWEEP_PARAMS 已载入 ${Object.keys(PARAMS).length} 条：${Object.keys(PARAMS).join(" ")}`);
}

let targets = rows.filter((r) => !ONLY.length || ONLY.includes(r.route));
if (LIMIT > 0) targets = targets.slice(0, LIMIT);
const OUT_DIR = resolve(arg("out", join(REPO, "tmp/qa/frames", ROUND, bandNow.replace("@", "-"))));

console.log(`[sweep] ledger=${LEDGER.replace(REPO + "/", "")} band=${bandNow} 页数=${rows.length} 本轮取景=${targets.length} identity=${IDENTITY} harness=automator(378x814) out=${OUT_DIR.replace(REPO + "/", "")} dry=${dryRun ? "yes" : "no"}`);

if (dryRun) {
  for (const r of targets.slice(0, 80)) console.log(`SWEEP_DRY ${r.route} baseline=${r.baselineStatus} identity=${r.identityPrecondition}`);
  console.log(`${RK}=DRY targets=${targets.length}（没连设备、没落一帧）`);
  process.exit(0);
}

/* 每一轮取景开场必须**重开项目窗口**。这不是保险，是补一个实测到的静默错：
   IDE 渲染的是它已经加载进内存的那份产物，磁盘上重新构建不会刷新它
   （open-project-window.mjs 的注释记着同一件事的另一个方向：切档位不重开窗，窗口里还是旧档 ⇒ 腿一行没跑就退 2）。
   R2 实测代价：改完 12 页重拍，两条泳道独立量到"改动一条都没上屏"——
   circle-home 帧底色还是旧硬编码 #F4F6F5、hub 标题列还是旧 space-between 几何，
   而源码与 00:41 的 wxss 里改动确实都在 ⇒ 整轮帧是改前编译，全部作废重拍。
   失败就中止：拿旧窗口拍出来的帧继续判"修没修好"，比不判更坏。

   位置有两个硬约束，都实测踩过才写死的：
   · 必须在 guardUiLease **之前**：open-project-window.mjs 自己也要拿租约，设备是单例。
     R2b 实测把它放在下面 ⇒ 子进程看见本腿的活租约直接拒：
     `SWEEP_REATTACH exit=2 OPENWIN_RESULT=FAIL reason=模拟器已被占用（shoot-fidelity-sweep-R2b@pid30636）`，
     整轮零帧（自己锁死自己，不是别人占用）。
   · 必须在 automator.connect **之前**：重开窗口会杀掉 9420 那条 WS 通道，
     先连后重开等于拿着一条已死的通道取景（reference-real-env：重建产物后必须重接设备腿）。 */
let REATTACH = { exit: null, at: "", settle: 12 };
{
  const re = spawnSync(process.execPath, [
    join(REPO, "scripts/qa/open-project-window.mjs"), "--project", PROJECT, "--settle", "12",
  ], { cwd: REPO, encoding: "utf8", env: { ...process.env, PATH: `${dirname(process.execPath)}${delimiter}${process.env.PATH || ""}` } });
  const out = `${re.stdout || ""}${re.stderr || ""}`;
  REATTACH = { exit: re.status, at: new Date().toISOString(), settle: 12 };
  console.log(`SWEEP_REATTACH exit=${re.status} ${out.split(/\r?\n/).filter((l) => l.includes("OPENWIN")).join(" / ").slice(0, 220)}`);
  if (re.status !== 0) {
    console.log(`${RK}=NOT-EVIDENCED reason=reattach-failed exit=${re.status} hint=项目窗口没重开 ⇒ 会拍到改前编译的旧画面，整轮帧都是假证据`);
    process.exit(2); /* 此刻还没拿租约，无需释放 */
  }
}

/* 租约：拿不到就退，不自家排队（上一程"干跑抢了租约打死 16 条腿"的教训在案）。
   但本腿自己被 TaskStop/崩溃留下的**孤儿锁**要先清掉，否则下一发永远起不来：
   走 sanctioned 的 reclaimOrphanUi（两票判死 + 把旧锁存档成 .orphan-<ts>），
   并且用与下面 guardUiLease 完全相同的 owner 名 —— reclaim 把锁交给本进程，
   acquireUi 的 `owner 相同且 pid===本进程` 那一条才会把它当成"我自己的续租"而不是占用。
   绝不用 QA_SKIP_UI_LEASE=1 绕过（那不是接管，是同时上两台驱动）。 */
import { guardUiLease, heldLeases, reclaimOrphanUi } from "./ui-lease.mjs";
const LEASE_OWNER = "shoot-fidelity-sweep-" + ROUND;
for (const h of heldLeases()) {
  if (!h.orphan) continue;
  const r = reclaimOrphanUi({ owner: LEASE_OWNER, file: h.file, confirm: "RECLAIM_ORPHAN", reason: "上一发持租进程已不存在（两票判死），锁无人续租；本腿接管以便取景能继续" });
  console.log(`SWEEPLEASE_PRECLEAN from=${h.owner}@${h.pid} reclaimed=${r && r.reclaimed ? "yes" : "no"} backup=${r && r.backup ? String(r.backup).split(/[\\/]/).pop() : "-"}`);
}
guardUiLease({ owner: LEASE_OWNER, tag: "SWEEPLEASE", failTag: "FIDELITYSWEEP" });
mkdirSync(OUT_DIR, { recursive: true });

const automator = require(require.resolve("miniprogram-automator", { paths: [join(REPO, "apps/client"), REPO] }));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* 身份 A 的会话：铸票走 cli-automator 的 mintToken（纯 HTTP 到 8080，读凭据声明表，绝不打印值），
   注入走 callWxMethod('setStorage')（与 mp-shoot-reference.cjs:39-40 同形状）。 */
let session = { token: "", userId: "", source: "(未铸)" };
/* identity=none ⇒ 不铸票、开场清会话。这一档是给"登录即转发"那类页用的（账本 pages/login/index 的
   identityPrecondition 现读为 none）：B **不是**"未登录"——B=guest-login，实测后端返回 loggedIn=true
   （POST /api/v1/auth/guest-login → {"userId":"100151","loggedIn":true,"loginMethod":"guest",…}），
   拿 B 去拍登录页照样被 switchTab 转走 ⇒ R2b 那发 top/bottom 全落 pages/discover/index。
   cli-automator 的 mintPlanFor 词表只认 A/B/guest/minor：none 必须**绕开铸票**，传下去会抛
   MINT_UNSUPPORTED_IDENTITY ⇒ 整腿退 2（那是配方的错，不是设备的错）。 */
const NO_SESSION = IDENTITY === "none";
try {
  const { mintToken, assertIdentityProducible } = await import("./cli-automator.mjs");
  const prod = NO_SESSION ? { ok: true } : assertIdentityProducible(IDENTITY, REPO);
  if (!prod.ok) { console.log(`${RK}=NOT-EVIDENCED reason=identity-not-producible identity=${IDENTITY} why=${prod.reason}`); process.exit(2); }
  if (NO_SESSION) {
    session = { token: "", userId: "(无会话)", source: "identity=none（不铸票，开场清空 token/refreshToken）" };
    console.log(`[sweep] identity=none ⇒ 不铸票，取景前清会话（登录页要的就是"没有会话"那张画面）`);
  } else {
    const minted = await mintToken(IDENTITY, REPO, "fidelity-" + ROUND);
    session = { token: minted.token, userId: minted.userId, source: minted.source };
    console.log(`[sweep] identity=${IDENTITY} mint=${session.source} userId=${session.userId} token长度=${String(minted.token).length}（值不落日志）`);
  }
} catch (e) {
  console.log(`${RK}=NOT-EVIDENCED reason=mint-failed identity=${IDENTITY} err=${String(e && e.message).slice(0, 140)}`);
  process.exit(2);
}

/* 预热与取景循环都必须在 connect 之后（mp 是 let 声明在连接处，提前用会 TDZ 直接抛）。
   见下面 SWEEP_WARMUP：注释里写了它为什么必须存在。 */
const results = [];
/* 旧清单先读一次：--resume 跳过重拍时，要**沿用**该帧上跑已经拿到的落点读数。
   原先 resume 分支无条件写 landingVerified:false，结果实测把上一跑（带落点核对那跑）
   拍到的 19 张已验证帧全降级成"未验"，可用帧从 24 掉到 5 —— 那是把证据读没了，不是拍到新东西。 */
const manifestPath = join(OUT_DIR, "sweep-manifest.json");
const prevFramesByKey = new Map();
if (existsSync(manifestPath)) {
  try {
    const prev = JSON.parse(readFileSync(manifestPath, "utf-8"));
    for (const rec of (prev.results || [])) for (const f of (rec.frames || [])) prevFramesByKey.set(`${rec.route}__${f.state}`, f);
  } catch { console.log("SWEEP_MANIFEST_PREV=unreadable（无法沿用旧落点读数）"); }
}
let mp = null;
try {
  mp = await automator.connect({ wsEndpoint: WS });
  console.log("[sweep] automator connected " + WS);
  await sleep(3000);
  mp.callWxMethod("setStorage", { key: "token", data: session.token });
  mp.callWxMethod("setStorage", { key: "refreshToken", data: "" });
  await sleep(1200);
  /* 会话注入后**读回来**自证一次：写进去 ≠ 应用里真变成这个状态。
     identity=none 那一发尤其要紧——token 要是没真清掉（bootstrap 又从别处填回来），
     拍到的还是转发后的主界面，却被盖上 identity=none 的章 ⇒ 那是伪造溯源，比拍不到更坏。
     读回失败（automator 返回值形状随版本漂）不等判红：落点核对已经在每张帧上做直接判定，
     这里只把"读不到"如实印出来，不假装读到。 */
  try {
    const raw = await mp.callWxMethod("getStorageSync", "token");
    const val = raw && typeof raw === "object" && ("value" in raw || "data" in raw) ? (raw.value ?? raw.data) : raw;
    const len = String(val == null ? "" : val).length;
    console.log(`SWEEP_SESSION_READBACK identity=${IDENTITY} token长度=${len} 期望=${NO_SESSION ? 0 : ">0"}`);
    if (NO_SESSION && len > 0) {
      console.log(`${RK}=NOT-EVIDENCED reason=session-not-cleared ⇒ 清会话没生效（storage 里还有 ${len} 字符的票），这一发拍不到"未登录的登录页"，不落帧退 2`);
      try { await mp.disconnect(); } catch { /* 退 2 前断不开不算第二条错 */ }
      process.exit(2);
    }
  } catch (e) {
    console.log(`SWEEP_SESSION_READBACK=UNAVAILABLE err=${String(e && e.message).slice(0, 90)} ⇒ 落点核对仍是这张帧的判据`);
  }
} catch (e) {
  console.log(`${RK}=NOT-EVIDENCED reason=connect-failed ws=${WS} err=${String(e && e.message).slice(0, 140)} hint=先 node scripts/qa/ws-channel-up.mjs；重建过产物则须重接设备腿`);
  process.exit(2);
}

/* 内容区哈希：与 verify-fix-visibility.mjs 同一把尺（裁掉顶部 40px 的状态栏再比像素）。
   为什么不 import 那一份：那个文件末尾就是 CLI 主块，import 它等于当场跑一次对照。
   为什么必须要它（R2b 实测，是泳道先发现、我复核的）：
     subpackages/village/village/detail 的 top/bottom 整文件哈希不同（ee98dc00 vs 885993d0）⇒ 旧判点 sameAsTop=false，
     但按内容区逐像素比是 **0.000% 不同** ——差的那几个字节全在状态栏时钟上。
     也就是说"底部根本没换画面"被我的字节尺读成了"换了画面"，滚动失效这条缺陷差点被我自己的仪表放过。
     同一轮里 publish、profile/other 也是 0.000%。 */
const CROP_TOP = Number(arg("crop-top", "40"));
let _pngMod;
function loadPng() {
  if (_pngMod !== undefined) return _pngMod;
  const cands = [];
  try { cands.push(require.resolve("pngjs", { paths: [join(REPO, "apps/client"), REPO] })); } catch { /* 走下一步 */ }
  try {
    const pkg = require.resolve(`pngjs/package.json`, { paths: [join(REPO, "node_modules/.pnpm"), REPO] });
    cands.push(pkg.replace(/[\\/]package\.json$/, ""));
  } catch { /* 走下一步 */ }
  for (const p of cands) { try { const m = require(p); _pngMod = m.PNG || m; return _pngMod; } catch { /* 试下一个 */ } }
  _pngMod = null; return null;
}
function contentHash16(absPath) {
  const PNG = loadPng();
  if (!PNG || !existsSync(absPath)) return "";
  try {
    const png = PNG.sync.read(readFileSync(absPath));
    const from = Math.max(0, Math.min(CROP_TOP, png.height - 1));
    const h = createHash("sha256");
    h.update(png.data.subarray(from * png.width * 4));
    h.update(`|${png.width}x${png.height}@${from}`);
    return h.digest("hex").slice(0, 16);
  } catch { return ""; }
}
/* 每一帧必须记下"这一屏当时是谁"。R2b 实测：pages/profile/index 落点确实是 pages/profile/index，
   但渲染的是**游客态**（pages/profile/index.vue:1647 把页面交给 NotLoggedProfile），
   于是上一轮对"我的页"登录态做的四处修改在这批帧里根本不可见——泳道如实报了这点。
   落点证明"到哪一页"，证明不了"以谁的身份"；这两个轴分开记，帧才说得出它表达了谁。
   取的字段名逐个核过：isLoggedIn 是 store 的 getter（apps/client/src/stores/session.ts:339），
   profileCompleted 是 session 上的字段（:45）。串内只用 ASCII：这段要经 IDE 命令行参数传，中文编码没量过。 */
async function readSessionState() {
  try {
    const raw = await mp.evaluate("() => { try { var app=(typeof getApp==='function')?getApp():null; var vm=app&&app.$vm; if(!vm) return 'ERR no-vm'; var gp=(vm.$&&vm.$.appContext.config.globalProperties)||{}; var p=vm.$pinia||gp.$pinia; if(!p||!p._s||typeof p._s.get!=='function') return 'ERR no-registry'; var s=p._s.get('session'); if(!s) return 'NO-STORE'; return JSON.stringify({loggedIn:!!s.isLoggedIn, profileCompleted:!!s.profileCompleted, uid:String((s.userSession&&s.userSession.id)||'')}); } catch(e){ return 'ERR '+e.message; } }");
    return String(raw || "");
  } catch { return "(读不到)"; }
}
const seen = new Map(); /* hash → 首个用到它的路由（跨页同图必须被数出来） */
let shotsSinceClean = 0;
const CLEAN_EVERY = Number(arg("clean-every", "8")); /* 每 8 张清一次应用本地文件：R2b 实测 ~18 张之后开始成片失败 */

/* 清空应用本地文件（wx.env.USER_DATA_PATH）。
   R2b 量到的真根因：WS 的 App.captureScreenshot 每拍一张就在 USER_DATA_PATH 里留一个
   `safeimg-<n>.jpg`，累积到一定数量之后**整条截图流水线卡死**——表现是
   `saveFile:fail exceeded the maximum size of the file storage limit`，然后其余全是
   `timeout waiting for automator response`。实测证据链：
     · 探针第一次：USER_DATA_PATH before=108 个文件 / 599,890B → 清空 → 当场补拍仍失败（要连同通道重启）
     · 重启自动化实例（ws-channel-up）+ 清空之后：before=2（含 safeimg-483455531.jpg）→ 补拍成功 9,652B
   ⇒ 取景必须周期性清它自己造的垃圾，且失败时先清再重试；否则一轮拍到 ~18 张就开始成片丢帧。
   getSavedFileList 在这里是**误导性**的（它只列旧 saveFile 那套名册，实测返 0 而目录里有 108 个文件）。 */
async function cleanUserFiles(tag) {
  try {
    const r = await mp.evaluate(() => {
      try {
        const fm = wx.getFileSystemManager();
        const dir = wx.env.USER_DATA_PATH;
        const names = fm.readdirSync(dir);
        let bytes = 0, unlinked = 0, failed = 0;
        for (const n of names) {
          try { bytes += (fm.statSync(dir + "/" + n).size) || 0; } catch { /* 量不出就按 0 */ }
          try { fm.unlinkSync(dir + "/" + n); unlinked++; } catch { try { fm.rmdirSync(dir + "/" + n, true); unlinked++; } catch { failed++; } }
        }
        return { ok: true, before: names.length, bytes, unlinked, failed, after: fm.readdirSync(dir).length };
      } catch (e) { return { ok: false, err: String(e && e.message).slice(0, 120) }; }
    });
    console.log(`${tag}_CLEAN ${JSON.stringify(r)}`);
    return r;
  } catch (e) {
    console.log(`${tag}_CLEAN_FAIL evaluate 失败：${String(e && e.message).slice(0, 110)}`);
    return null;
  }
}

/* 预热一次导航。实测两轮取景的超时都成串落在**最前面几帧**
   （login top×2 失败、login bottom×2 失败、discover top×2 失败，之后同一条通道连续成功）：
   setStorage 之后第一次 reLaunch 要同时付"冷启动 + 应用 boot 拉数"的口，
   这一口超过了 automator 的命令超时 ⇒ 前几帧全记成仪器超时，而不是页面真的拍不到。
   先热一次，让第一页不再替全轮买单。（同 r-exec-cli.mjs 的 --guest-warmup 一个道理。） */
try {
  const w0 = Date.now();
  await cleanUserFiles("SWEEP_PREWARM");
  await mp.callWxMethod("reLaunch", { url: "/pages/home/index" });
  await sleep(Math.max(12000, SETTLE));
  let wp = ""; try { const c = await mp.currentPage(); wp = c && c.path ? String(c.path) : ""; } catch { /* 预热读数失败不影响正式拍 */ }
  console.log(`SWEEP_WARMUP done ms=${Date.now() - w0} 落点=${wp || "(未读到)"}`);
} catch (e) { console.log(`SWEEP_WARMUP failed ${String(e && e.message).slice(0, 80)} ⇒ 仍继续，但前几帧的超时读数要按仪器噪声读`); }

for (const r of targets) {
  /* 账本写的前提与本跑身份对不对得上，先在这里判一次并留在件上。
     不拦停（拍到什么就是什么，落点核对会判），但让下一程一眼看见"这页本来就不该用这个身份拍"：
     R2b 的 pages/login/index 就是被 identityPrecondition 的旧文案（"B=未登录"）骗着以 A/B 各拍了一遍，
     两张帧全落 pages/discover/index。 */
  const pre = String(r.identityPrecondition || "");
  const preNeed = pre.startsWith("none") ? "none" : /^A\s*\+\s*B/.test(pre) ? "A+B" : pre.startsWith("A（") ? "A" : pre.startsWith("B") ? "B" : "";
  const preconditionMismatch = !!preNeed && !(preNeed === IDENTITY || (preNeed === "A+B" && (IDENTITY === "A" || IDENTITY === "B")));
  if (preconditionMismatch) console.log(`SWEEP_PRECONDITION_MISMATCH ${r.route} 账本要=${preNeed} 本跑=${IDENTITY} ⇒ 大概率落点漂移，仍拍（判据交给落点核对），但这一页得按账本前提重拍`);
  const rec = { route: r.route, query: PARAMS[r.route] || "", harness: "automator", band: bandNow, identity: IDENTITY, sessionState: "(未读)", precondition: pre, preconditionNeed: preNeed || "(未标)", preconditionMismatch, frames: [], errors: [] };
  const shots = [{ state: "top", tokens: [`route:${r.route}`] }, { state: "bottom", tokens: [`route:${r.route}`, "scroll-bottom"] }];
  for (const s of shots) {
    const f = join(OUT_DIR, `${r.route.replace(/\//g, "__")}__${s.state}.png`);
    /* --resume：已有一张过地板的同类帧就跳过。WS 通道单帧偶发 timeout（本轮 28 发里 5 发），
       重跑整轮既浪费设备时间也会把上一发的好帧重新拍成另一个状态；补拍只补缺。 */
    const prevRec = prevFramesByKey.get(`${r.route}__${s.state}`);
    /* --resume 的跳过条件收紧：只有"上一跑真读过落点且落点相符"的帧才不重拍。
       原先只要文件在就跳过 ⇒ 通道超时后重跑会把没验过的帧永远留在"未验"状态，
       补跑不收敛；而且我已经实测到它把已验证帧降级成未验证（清单可用帧 24→5）。
       现在的语义：**攒已验证帧**，缺读数的就重拍，跑到落点全验为止。 */
    if (resume && prevRec && prevRec.landingVerified === true && !prevRec.landingMismatch && existsSync(f) && statSync(f).size > MIN_BYTES) {
      const h0 = hash16(f);
      const prior0 = seen.get(h0);
      rec.frames.push({
        route: r.route, query: PARAMS[r.route] || "", state: s.state, path: relOf(f), bytes: statSync(f).size,
        contentHash: h0, belowFloor: false, dupAcrossRoutes: !!prior0 && prior0 !== r.route,
        /* 恢复分支以前硬写 sameAsTop:false ⇒ "跳过重拍的帧一律算滚得动"。
           文件就在盘上，内容区哈希照样能算，别把这条信号丢掉。 */
        contentRegionHash: contentHash16(f), sameAsTopBytes: false, sameAsTop: false,
        /* 帧自带 identity：沿用的那张是上一跑（可能是另一个身份）拍的，不能跟着本跑的 IDENTITY 走 */
        identity: prevRec.identity || IDENTITY, resumed: true, landingPath: prevRec.landingPath, landingMismatch: false, landingVerified: true,
      });
      if (h0 && !seen.has(h0)) seen.set(h0, r.route);
      /* 沿用帧的"滚动没生效"也要能判：底部帧与顶部帧的内容区哈希都在盘上算得出来，
         不比较就等于对沿用的帧一律放行。 */
      if (s.state === "bottom" && rec.frames.length > 1) {
        const t = rec.frames[0], b = rec.frames[rec.frames.length - 1];
        if (t.contentRegionHash && b.contentRegionHash) b.sameAsTop = t.contentRegionHash === b.contentRegionHash;
      }
      console.log(`SWEEP_RESUME_SKIP ${r.route}__${s.state} 已有 ${statSync(f).size}B 且落点已验(${prevRec.landingPath})，不重拍`);
      continue;
    }
    if (resume && existsSync(f) && statSync(f).size > MIN_BYTES) {
      console.log(`SWEEP_RESUME_RESHOOT ${r.route}__${s.state} 文件在但落点没读过 ⇒ 重拍以取落点读数`);
    }
    try {
      await mp.callWxMethod("reLaunch", { url: "/" + r.route + (PARAMS[r.route] ? "?" + PARAMS[r.route] : "") });
      await sleep(SETTLE);
      /* 落点核对（R1 实测出来的，不是臆想）：pages/discover/index 的顶部帧与 pages/login/index
         逐字节相同（183416B / sha16=e4affee8）⇒ 那次导航其实停在登录页，而我的清单把它当成"寻觅页的证据"。
         只靠跨页同图普查是间接证据（要两张恰好全等才报），落点必须直接读。
         currentPage().path 是这一页真正在显示的路由；不等目标页 ⇒ 这张帧记 landingMismatch，
         不许当该页画面证据（同 r-exec-ws.mjs routeOk===false ⇒ 判"落在别的页，须人判"的口径）。 */
      let actualPath = "";
      try {
        const cp = await mp.currentPage();
        actualPath = cp && cp.path ? String(cp.path).replace(/^\//, "") : "";
      } catch (e) { actualPath = "(currentPage 读不到:" + String(e.message).slice(0, 40) + ")"; }
      const landingMismatch = actualPath !== r.route;
      /* 每页读一次身份态（不是每帧）：这一趟导航之后页面是谁在显示，top/bottom 是同一个会话。 */
      if (s.state === "top") rec.sessionState = await readSessionState();
      if (landingMismatch) rec.errors.push(`落点不符 target=${r.route} actual=${actualPath}`);
      if (s.state === "bottom") {
        try { await mp.callWxMethod("pageScrollTo", { scrollTop: 99999, duration: 0 }); }
        catch { try { await mp.callWxMethod("pageScrollTo", { scrollTop: 20000, duration: 0 }); } catch (e2) { rec.errors.push("pageScrollTo 不可用:" + String(e2.message).slice(0, 60)); } }
        await sleep(4000);
      }
      if (existsSync(f)) rmSync(f, { force: true });
      /* 首帧实测会 timeout waiting for automator response（WS 通道 61s/帧、2/5 超时是这个项目的既有事实），
         所以每帧重试一次；两次都不中就如实记 pageError，不拿第二帧冒充第一帧。 */
      let size = 0, shotErr = "";
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await mp.screenshot({ path: f });
          size = existsSync(f) ? statSync(f).size : 0;
          if (size > 0) { shotErr = ""; break; }
          shotErr = `第 ${attempt} 发出图 0B`;
        } catch (e) { shotErr = `第 ${attempt} 发异常 ${String(e && e.message).slice(0, 70)}`; }
        /* 失败下一发之前先清本腿自己造的 safeimg-*：R2b 实测这一串超时的根因是应用本地文件配额，
           不清就重试等于拿同一条卡死的流水线再撞三次。 */
        if (attempt < 3) { await cleanUserFiles("SWEEP_SHOTRECOVER"); await sleep(6000); }
        if (attempt === 1) await sleep(2500);
      }
      if (size <= 0) { rec.errors.push(`${s.state}: ${shotErr}`); console.log(`SWEEP_FAIL ${r.route} ${s.state} ${shotErr}`); continue; }
      const h = hash16(f);
      const priorOwner = h ? seen.get(h) : undefined;
      const dupAcrossRoutes = !!h && !!priorOwner && priorOwner !== r.route;
      /* 同一页滚动前后逐字节相同 ⇒ 底部没换画面（不可滚动页/懒加载没触发/滚动被吞），
         这是保真审计要的信号，不当"两个状态"记账。 */
      /* 两级判"底部有没有换画面"：
         · sameAsTopBytes = 整文件逐字节相同（旧判点，保留：下游 emit-fidelity-lanes 的发现式认这个名字）
         · sameAsTop      = **内容区**（裁掉状态栏）逐像素相同 ⇒ 这才是"滚动没生效"
         旧版只有第一级，所以 village/detail / publish / profile/other 这种"只有时钟在走"的帧被判成
         "换了画面"（实测内容区不同占比 0.000%）。两级并存还让"字节相同但内容不同"无处藏身。
         量不到内容哈希（pngjs 取不到/解码失败）时**不许默默判 false**：如实写 contentMeasurable:false。 */
      const ch = contentHash16(f);
      const topCh = rec.frames.length ? String(rec.frames[0].contentHash || "") : "";
      const topChContent = rec.frames.length ? String(rec.frames[0].contentRegionHash || "") : "";
      const sameAsTopBytes = !!(s.state === "bottom" && h && rec.frames.length && rec.frames[0].contentHash === h);
      const contentMeasurable = !!(ch && topChContent);
      const sameAsTop = s.state === "bottom" && (contentMeasurable ? ch === topChContent : sameAsTopBytes);
      rec.frames.push({
        route: r.route, query: PARAMS[r.route] || "",
        state: s.state, path: relOf(f), bytes: size, contentHash: h,
        identity: IDENTITY,
        landingPath: actualPath, landingMismatch,
        /* 落点已验 = 直接读到 currentPage 且等于目标页。这个字段是 --resume 的跳过条件，
           也是收口门判"这张帧到底是不是那一页"的依据；R1/R2 只在恢复分支里写过它，
           正式取景的帧全是 undefined ⇒ resume 永远不收敛、收口门读不到落点证明。 */
        landingVerified: !landingMismatch && !String(actualPath).startsWith("(currentPage") && !!actualPath,
        belowFloor: size <= MIN_BYTES, dupAcrossRoutes, sameAsTop,
        contentRegionHash: ch, sameAsTopBytes, scrollContentMeasurable: s.state === "bottom" ? contentMeasurable : undefined,
        dupOf: dupAcrossRoutes ? priorOwner : (sameAsTop ? `${r.route}__top` : ""),
      });
      if (h && !seen.has(h)) seen.set(h, r.route);
      shotsSinceClean++;
      if (shotsSinceClean >= CLEAN_EVERY) { await cleanUserFiles("SWEEP_PERIODIC"); shotsSinceClean = 0; }
      console.log(`SWEEP_FRAME ${r.route}__${s.state} bytes=${size} sha16=${h ? h.slice(0, 8) : "-"} 落点=${actualPath || "(空)"}${landingMismatch ? " ⇒落点不符" : ""}${size <= MIN_BYTES ? " 空白帧" : ""}${dupAcrossRoutes ? " 跨页同图(" + priorOwner + ")" : ""}${sameAsTop ? " 滚动后同图" : ""}`);
    } catch (e) {
      rec.errors.push(`${s.state}: ${String(e && e.message).slice(0, 120)}`);
      console.log(`SWEEP_FAIL ${r.route} ${s.state} ${String(e && e.message).slice(0, 120)}`);
    }
  }
  /* 路由级落点读数：收口门与覆盖门都按路由判"这页有没有一张能当证据的帧"，
     只有帧级字段就得让下游各自再聚合一遍（R2b 实测清单里 landing=null，落点读数只在 stdout 里活着）。 */
  rec.landing = rec.frames.length ? String(rec.frames[0].landingPath || "") : "";
  rec.landingVerified = rec.frames.some((f) => f.landingVerified === true);
  results.push(rec);
}
try { await mp.disconnect(); } catch { /* 断开失败不影响已落的帧 */ }

/* 清单按 (路由, 状态) 合并，不按整页覆写。
   为什么不是整页：一跑里某页可能顶部成功、底部超时——整页替换会把上一跑那张好底部帧丢掉
   （实测：修好落点核对后那一跑 frames 从 26 掉到 19，掉的正是这种"这跑没拍成"的帧）。
   同一状态以本次为准（重拍就是要换它），没重拍到的状态保留旧记录，前提那张文件还在盘上。 */
const merged = new Map();
if (existsSync(manifestPath)) {
  try {
    const prev = JSON.parse(readFileSync(manifestPath, "utf-8"));
    for (const rec of (prev.results || [])) if (rec && rec.route) merged.set(rec.route, { ...rec, frames: [...(rec.frames || [])], errors: [] });
  } catch { console.log("SWEEP_MANIFEST_PREV=unreadable（旧清单解析不了，本次只写本次的页，不假装合并）"); }
}
for (const rec of results) {
  const prevRec = merged.get(rec.route);
  if (!prevRec) { merged.set(rec.route, rec); continue; }
  const keep = (prevRec.frames || []).filter((pf) => !rec.frames.some((nf) => nf.state === pf.state) && existsSync(join(REPO, pf.path)));
  const droppedButKept = keep.length;
  const next = { ...rec, frames: [...rec.frames, ...keep], errors: [...(rec.errors || []), ...(droppedButKept ? [`(这跑没拍到的 ${droppedButKept} 个状态沿用上一跑的帧)`] : [])] };
  /* 页级 identity 也按帧回读：沿用旧帧时这一页可能同时住着 A 与 B 两张（登录页 B、其余 A）。 */
  const ids = [...new Set(next.frames.map((f) => f.identity).filter(Boolean))].sort();
  next.identity = ids.length <= 1 ? (ids[0] || rec.identity) : ids.join("+");
  merged.set(rec.route, next);
}
const mergedResults = [...merged.values()];

/* 顶层 identity 必须**从合并后的各页读回来**，不能写死本跑的 IDENTITY：
   取景清单是按路由累积的，R2b 这一件里 13 页是 A 身份、登录页那一发是 none（清会话才拍得到登录页；
   账本 identityPrecondition 现读为 none——原文案"=B"是错的，B=guest 票 loggedIn=true 照样被转发）。
   写死 ⇒ 补拍那一跑会把整件的 provenance 冒充成补拍用的那个身份，
   而 13 页的帧其实是 A 会话里出来的——那是伪造溯源，与本仓"值不落日志/档位不许混"同一条规矩。 */
const identitiesInManifest = [...new Set(mergedResults.map((r) => r.identity).filter(Boolean))].sort();
const manifestIdentity = identitiesInManifest.length <= 1 ? (identitiesInManifest[0] || IDENTITY) : identitiesInManifest.join("+");
if (identitiesInManifest.length > 1) console.log(`SWEEP_IDENTITY_MIXED ${identitiesInManifest.join("+")}（逐页 identity 见 results[].identity，顶层不再冒充单一身份）`);

const manifest = {
  schema: "mp-fidelity-sweep/v1", round: ROUND, band: bandNow, identity: manifestIdentity,
  sessionSource: session.source, userId: session.userId,
  harness: "miniprogram-automator(实测出图 378x814，禁与 CLI 193x413 跨尺比像素)",
  consoleCapture: "unavailable：miniprogram-automator 0.12.1 的导出面没有 onConsole/onError（已 grep out/ 核实），本轮不假装采到 console",
  ledger: relOf(LEDGER),
  /* 轮次有效性的唯一证明：收口门只认"取景前项目窗口真重开过"的轮（R2 整轮作废就是因为没这条）。 */
  reattach: REATTACH,
  mergeNote: "本件按路由合并：同页以最近一次跑为准，未重跑的页保留原帧记录（补拍/复拍不抹证据）",
  totals: { routesInManifest: mergedResults.length, targetsThisRun: targets.length, frames: mergedResults.reduce((a, x) => a + (x.frames || []).length, 0) },
  results: mergedResults,
};
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf-8");

/* 收口读数一律看**合并后的整轮**（mergedResults），不看"这一跑的 targets"：
   补拍跑只带 3 页，用它判覆盖会把另外 11 页读成不存在。
   空白帧、跨页同图、滚动后同图、零独立画面页都逐条点名（"全绿但读的是空数"是这个项目的老病）。 */
const blank = mergedResults.flatMap((x) => (x.frames || []).filter((f) => f.belowFloor));
const dups = mergedResults.flatMap((x) => (x.frames || []).filter((f) => f.dupAcrossRoutes));
const stuck = mergedResults.flatMap((x) => (x.frames || []).filter((f) => f.sameAsTop));
const mismatched = mergedResults.flatMap((x) => (x.frames || []).filter((f) => f.landingMismatch));
for (const m of mismatched) console.log(`SWEEP_LANDING_MISMATCH ${m.route}__${m.state} 落点=${m.landingPath} ⇒ 这张帧不是该页画面，不许当该页证据`);
const noFrame = mergedResults.filter((x) => !(x.frames || []).some((f) => !f.belowFloor));
const failedPages = mergedResults.filter((x) => (x.errors || []).length);
for (const b of blank) console.log(`SWEEP_BLANK_FRAME ${b.route} ${b.path} bytes=${b.bytes}`);
for (const d of dups) console.log(`SWEEP_DUP_ACROSS_ROUTES ${d.path} sha16=${String(d.contentHash).slice(0, 8)} 与更早页同图`);
for (const s of stuck) console.log(`SWEEP_SCROLL_NOTHING_CHANGED ${s.path} 底部与顶部逐字节相同（滚动未改变画面，不许当两个状态）`);
for (const n of noFrame) console.log(`SWEEP_NO_UNIQUE_FRAME ${n.route} ⇒ 这一页本轮没有独立画面，不许算进覆盖`);
for (const fp of failedPages) console.log(`SWEEP_PAGE_ERROR ${fp.route} ${(fp.errors || []).join(" | ").slice(0, 160)}`);
console.log(`FIDELITYSWEEP_FRAMES routesInManifest=${mergedResults.length} thisRunTargets=${targets.length} frames=${manifest.totals.frames} blank=${blank.length} dupAcross=${dups.length} scrollStuck=${stuck.length} landingMismatch=${mismatched.length} noUniqueFrame=${noFrame.length} pageErrors=${failedPages.length}`);
/* 判红要看**两件事**，旧写法把它们混成一个数，读数就会骗人：
   · 本跑自己那一发有没有落到帧（thisRunTargets 里出的问题）；
   · 整轮的件里还留着什么坏帧（沿用上一跑、这跑没重拍的页，例如 matching 那张 identity=A 的旧帧）。
   两件事都必须能红（严），但混在一起时"FAIL routes=14/71"看着像"71 页没拍完所以失败"——
   而这条腿结构上就只扛账本里「有基准」那一档（现 14 页），另外 57 页归 CLI 巡检腿，71/71 由覆盖门按并集判。 */
const targetRoutes = new Set(targets.map((t) => t.route));
const badHere = blank.filter((f) => targetRoutes.has(f.route)).length + failedPages.filter((x) => targetRoutes.has(x.route)).length
  + mismatched.filter((f) => targetRoutes.has(f.route)).length + noFrame.filter((x) => targetRoutes.has(x.route)).length;
const badCarried = (blank.length + failedPages.length + mismatched.length + noFrame.length) - badHere;
const bad = badHere + badCarried;
console.log(bad ? `${RK}=FAIL 本跑 targets=${targets.length} 本跑问题=${badHere} 件里沿用的坏读数=${badCarried}｜manifest routes=${mergedResults.length}（本通道只扛「有基准」那档，71/71 由覆盖门按并集判）frames=${manifest.totals.frames} blank=${blank.length} noUniqueFrame=${noFrame.length} landingMismatch=${mismatched.length} pageErrors=${failedPages.length}`
  : `${RK}=PASS 本跑 targets=${targets.length} 全落帧且落点已验｜manifest routes=${mergedResults.length} frames=${manifest.totals.frames} band=${bandNow} console=unavailable(如实)`);
process.exit(bad ? 1 : 0);

/**
 * 设备腿验收：微信开发者工具里跑 real 档小程序，逐条证「小程序上传什么，后台就看到什么」。
 *
 * 与另外三条门的分工：
 *   verify-admin-scope / -auditor / -writes 三条量的是后台接口；
 *   本条量的是**设备上真实跑起来的那一份**——它必须用真票、真接口、真上传，
 *   并且在 30 秒内被后台按同一条记录读到。
 *
 * 用法：
 *   SUPER_PASSWORD=... node scripts/verify-device-leg.mjs [--band real|mock] [--no-images]
 *
 * --band mock 是给「负例」用的：把载具换成 mock 档，同步断言必须**变红**；
 * 若 mock 档也能"通过"，说明断言读的不是真库（本仓 services/api.ts 曾静默回落假数据）。
 *
 * 设备侧交互全部走 scripts/qa/cli-automator.mjs 的 automation_* 通道；
 * 只有两处替身（都属"操作系统级 UI，不是被测逻辑"）：
 *   1) wx.chooseImage → 返回本地真图路径（DevTools 里没有可驱动的系统相册面板）
 *   2) wx.requirePrivacyAuthorize → 直接放行（隐私弹窗由 App.vue 处理，不是发帖逻辑）
 * 这两处替身在输出里逐条点名，不假装是手指点的。
 *
 * 三档账本（2026-10-14，纯逻辑在 scripts/qa/device-leg-tally.mjs）：
 *   PASS/FAIL 只留给产品断言；「通道不可驱动 / 租约没抢到 / 后端不可达 / 选择器解析不出」
 *   一律 UNVERIFIED-INSTRUMENT，**永不**记进 failures —— 本仓那条 194/289 行的 67% 仪表噪声
 *   假红就是这么消掉的。
 * 出口约定：0=全部判过且全绿；1=有产品级红；2=这一腿没能执行 / 只有仪表故障。
 * 收尾除 verdict.txt 外，还往 reports/audit/round-7/exec-v38-devicleg/exec-results.json
 * 落一份覆盖率门可读的行账（字段镜像 r-exec-cli.mjs 的 row 构造），并打一条机读行
 * `DEVICELEG_RESULT=…`（run-final-verify-v33.sh 的 g() 按 `*_RESULT=` 抓）。
 * 行上的 band 必须是 `mode@sha8`，sha8 = 在盘产物 config/env.js 内容的 sha256 前 8 位
 * （scripts/qa/artifact-band.mjs:22，与门侧"当前尺"及 r-exec-cli/r-exec-ws 生产者同一把尺）；
 * git HEAD 短号只作 provenance 字段。用提交号当 band 键 = 每一行都被门摘进 EXPIRED 桶，
 * 这条腿跑出 0 覆盖（本轮修的就是这一格，别再犯第二次）。
 */
import { execSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  bootSession, clearSession, element, evaluate, ideCall,
  openPage, routeStack, verifyLogin,
} from "./qa/cli-automator.mjs";
import { guardUiLease } from "./qa/ui-lease.mjs";
/* 档位戳的唯一算法（与覆盖率门、兄弟生产者同一个函数，不许本腿自己另算一枚）：
   readApiMode(<在盘产物目录>).sha8 = sha256(config/env.js 字节).slice(0,8)，见 scripts/qa/artifact-band.mjs:14-22。
   消费者 verify-real-coverage.mjs 的 rowRealSha8()（:257）拿行上的 band 去比"当前尺"，
   尺源是同一份 config/env.js；生产者 r-exec-cli.mjs:897/:1414/:1950 写的就是 (mode)+"@"+(sha8)。
   —— 本腿以前往这一格写的是 **git HEAD 短号**（提交号不是构建戳，永不相等），
   于是这一腿的每一行都被门读成"旧构建的行"摘进 EXPIRED 桶（一条也不认领），
   等于把上一轮"腿跑出 0 覆盖"那格失败换了个标签重演一遍。git HEAD 仍留档，但只当出处旁证。 */
import { readApiMode } from "./qa/artifact-band.mjs";
import {
  createTally, buildRows, buildExecFile, resultLine, exitCodeOf, looksInstrumentFault,
  scrubEvidence,
} from "./qa/device-leg-tally.mjs";

const REPO = resolve(import.meta.dirname, "..");
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const BAND = arg("band", "real");
const WITH_IMAGES = !argv.includes("--no-images");
const STUDENT_PHONE = process.env.STUDENT_PHONE || "13711110002";
const STUDENT_PASSWORD = process.env.STUDENT_PASSWORD || "Student@12345";
const SUPER_PASSWORD = process.env.SUPER_PASSWORD || "";
const STAMP = Date.now();
const CAMPUS = "北京大学";   // 演示学员选定的校区（圈层节点由后端按名字查，不写死 path）
let schoolNode = null;       // 该校区在 circle_layer 上的三级节点，运行期查出
const MARKER = `DEVSYNC${STAMP}`;          // 只做 ASCII，避免任何编码漂移把同步断言变成假绿
const CONTENT = `设备腿验收 ${MARKER} 这条帖子是小程序真机发出来的，后台应当按同一个 ID 读到它。`;
const ANN_MARK = `ANNMARK${STAMP}`;
const PROJECT = `apps/client/dist/build/mp-weixin${BAND === "real" ? "-real" : ""}`;
const OPTS = { project: PROJECT, timeoutMs: 120000 };
const OUT_DIR = join(REPO, "reports", "audit", `device-leg-${BAND}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}`);
const ORIGIN = "http://127.0.0.1:8080";
const API = `${ORIGIN}/api/v1`;
const EXPECT_SYNC = BAND === "real";

/** 脱敏实现住在 device-leg-tally.mjs（与三档计数器同一处），
 *  这样 scripts/qa/test-device-leg-tally.mjs 测的就是载具真正用的那套正则。 */
const scrub = scrubEvidence;

const lines = [];
/** 三档账本：check=产品判点（PASS/FAIL 行格式逐字节不变，外部工具在 grep 它们）；
 *  uncheck=仪表/环境故障（UNVERIFIED-INSTRUMENT，永不进 failures）；
 *  checkI=二选一——fault 条件为真且没判绿 ⇒ 仪表档。计数器本体在 device-leg-tally.mjs（纯、可离线测）。 */
const tally = createTally({ emit: (s) => { const t = scrub(s); console.log(t); lines.push(t); } });
let finished = false;
let CURRENT_PAGE = "";
let LOGIN_VERIFY = "";   // verifyLogin 的实测串（行的会话证据，覆盖率门要读）
let TOKEN_MINTED = false; // 真票确实是从 /auth/phone-login 铸的 ⇒ sessionSource
const check = (label, ok, detail) => tally.check(scrub(label), ok, scrub(detail), CURRENT_PAGE);
const checkI = (label, ok, detail, fault) => tally.checkFault(scrub(label), ok, scrub(detail), !!fault, CURRENT_PAGE);
const uncheck = (label, detail) => tally.uncheck(scrub(label), scrub(detail), CURRENT_PAGE);
/* 覆盖率门的 band 键 = mode@sha8（sha8 是在盘产物 config/env.js 内容的 sha256 前 8 位，
   与门侧"当前尺"、r-exec-cli/r-exec-ws 生产者同一把尺；import 处注释有全链路）。
   取不到就留空串并记一条 UNVERIFIED-INSTRUMENT：门读空 band 会大声数成 REALCOV_BANDLESS_*
   （verify-real-coverage.mjs:915 那一格的存在理由就是"漏字段必须看得见"），
   而读 real@unknown / real@<提交号> 只会静默失配 —— 绝不许为了"看起来盖了戳"编一枚。 */
let BAND_STAMP = "";
let BAND_STAMP_INFO = null;
const note = (s) => { const t = scrub(s); console.log(t); lines.push(t); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const abs = (...p) => join(REPO, ...p);
/** 后端对写端点强制 Idempotency-Key（缺了直接 422「缺少 Idempotency-Key 请求头」），
 *  scripts/qa/cli-automator.mjs 的 apiPost 不带这个头 ⇒ 这里不能用它铸票。
 *  同时登录端点有按 IP 的令牌桶（容量 10，每 10s 补 1），429 要等补而不是当成鉴权失败。 */
let keySeq = 0;
/** status=0 是本腿的仪表信号词：后端不可达（fetch 直接抛）时返回它，
 *  下游判点据此记 UNVERIFIED-INSTRUMENT，而不是把"连不上"写成产品 FAIL。 */
async function postJson(path, body, tok = "") {
  for (let i = 0; i < 8; i += 1) {
    let r; let text;
    try {
      r = await fetch(ORIGIN + path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Idempotency-Key": `dl-${STAMP}-${keySeq++}`,
          ...(tok ? { Authorization: `Bearer ${tok}` } : {}),
        },
        body: JSON.stringify(body),
      });
      text = await r.text();
    } catch (e) {
      return { status: 0, text: "THROW fetch: " + String((e && e.message) || e).slice(0, 160), json: {} };
    }
    if (r.status !== 429) return { status: r.status, text, json: (() => { try { return JSON.parse(text); } catch { return {}; } })() };
    note(`   [rate-limit] ${path} 429，等 11s 补令牌（第 ${i + 1}/8 次）`);
    await sleep(11000);
  }
  return { status: 429, text: "", json: {} };
}
/** PUT 版（写端点同样要 Idempotency-Key） */
async function putJson(path, body, tok) {
  let r; let text;
  try {
    r = await fetch(ORIGIN + path, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Idempotency-Key": `dl-${STAMP}-u${keySeq++}`,
        ...(tok ? { Authorization: `Bearer ${tok}` } : {}),
      },
      body: JSON.stringify(body),
    });
    text = await r.text();
  } catch (e) {
    return { status: 0, text: "THROW fetch: " + String((e && e.message) || e).slice(0, 160), json: {} };
  }
  let json = {};
  try { json = JSON.parse(text); } catch { /* 非 JSON 响应保留原文 */ }
  return { status: r.status, text, json };
}
/** 设备侧 toast 抓取：uni.showToast 落到 wx.showToast，包一层把文案收集起来。
 *  没有它就只能看到"图片没进去"这种结果，看不到页面自己给出的原因。 */
function hookToasts() {
  return String(evaluate(
    "() => { try { if (globalThis.__toasts) return 'already';"
    + " globalThis.__toasts=[]; var o=wx.showToast; wx.showToast=function(x){"
    + " try{globalThis.__toasts.push(String(x&&x.title||''))}catch(e){}; return o.apply(wx,arguments) };"
    + " return 'hooked'; } catch(e){ return 'ERR '+e.message; } }", OPTS));
}
const readToasts = () => String(evaluate("() => JSON.stringify(globalThis.__toasts||[])", OPTS));
/** 出帧：`--path` 在本机不可信——传相对路径 CLI 回 success 但**文件根本没落盘**，
 *  传盘符绝对路径又被当成相对段拼到 cwd 后（实测 `mkdir 'D:\\6\\恋爱小程序\\D:'`）。
 *  所以刻意不传 path：让工具写到系统临时目录并回真实路径，再由本进程复制到出帧目录，
 *  落盘核对以复制后的字节数为准（"工具说成功"不等于"证据在盘上"）。 */
function shotAt(name) {
  const dest = join(OUT_DIR, name);
  mkdirSync(OUT_DIR, { recursive: true });
  try { rmSync(dest, { force: true }); } catch { /* 上一轮的残帧不能当这一轮的证据 */ }
  let err = "", src = "", geom = "";
  try {
    const r = ideCall("simulator_screenshot", [], OPTS);
    src = String(r?.path || "");
    geom = `${r?.imageWidth || "?"}x${r?.imageHeight || "?"}`;
    if (src && existsSync(src)) copyFileSync(src, dest);
    else err = "工具没回可存在的 path：" + JSON.stringify(r).slice(0, 80);
  } catch (e) { err = String(e.message).slice(0, 140); }
  const bytes = existsSync(dest) ? readFileSync(dest).length : 0;
  return { dest, bytes, err, geom };
}
/** 交互动作重试：只在传输层超时时重发（产品失败照旧上抛），口径同 cli-automator:147 的 evaluate */
function actWithRetry(action, selector, extra = []) {
  const TRANSIENT = /timeout waiting for automator response|automator.*EBUSY|通道忙/i;
  let last = null;
  for (let i = 0; i < 3; i += 1) {
    try { return String(element(action, selector, OPTS, extra)); }
    catch (e) {
      last = e;
      if (!TRANSIENT.test(String(e && e.message || ""))) throw e;
      sleepSync(1800 + i * 1500);
    }
  }
  throw last;
}
function sleepSync(ms) { const t = Date.now() + ms; while (Date.now() < t) { /* 同步等通道空出来 */ } }

/** 读端点/删除端点统一走这层：后端不可达 ⇒ {status:0,...}（仪表信号词），
 *  绝不让裸 fetch 把整条腿炸成未定义出口。 */
async function apiFetch(urlOrPath, opts = {}) {
  const u = String(urlOrPath).startsWith("http") ? String(urlOrPath) : API + urlOrPath;
  try {
    const r = await fetch(u, opts);
    const text = await r.text();
    let json = {};
    try { json = JSON.parse(text); } catch { /* 非 JSON 响应保留原文 */ }
    return { status: r.status, text, json };
  } catch (e) {
    return { status: 0, text: "THROW fetch: " + String((e && e.message) || e).slice(0, 160), json: {} };
  }
}
/** 只有仪表自己报错的形状（THROW/ERR/ECONNREFUSED…）才命中；产品判词不会天然命中这张表。 */
const instFault = (s) => looksInstrumentFault(s);
/** 通道动作包一层：evaluate/element 抛 = 通道不可驱动/选择器解析不出 ⇒ 记仪表档并返回 null，
 *  后续依赖该读数的判点必须跳过（拿 null 读数继续判 = 把仪表故障写成产品红）。 */
function safeAct(label, fn) {
  try { return fn(); }
  catch (e) { tally.uncheck(scrub(label), scrub("通道/选择器未解析：" + String((e && e.message) || e)).slice(0, 160), CURRENT_PAGE); return null; }
}
/** 可选绑定表（scripts/qa/device-leg-case-bindings.json）：只有设备腿确实按 ops 同一判点
 *  跑过的条目才允许对 manifest|id 记账；默认不存在 ⇒ 全部行落 DEVICE-LEG|DLnn
 *  （门读得动这形状，但判据集里没有这条 key ⇒ 不认领，见 verify-real-coverage.mjs:230）。 */
function loadBindings() {
  try {
    const j = JSON.parse(readFileSync(abs("scripts", "qa", "device-leg-case-bindings.json"), "utf8"));
    return Array.isArray(j) ? j : (Array.isArray(j.bindings) ? j.bindings : []);
  } catch { return []; }
}
const EXEC_REL = "reports/audit/round-7/exec-v38-devicleg";
function legMeta() {
  // git HEAD 只是**出处旁证**（仓内既有语义：exec-frames-to-corpus.mjs:44-45 的行内/文件头 gitSha 就是提交号），
  // 它不是、也不许再当覆盖率门的 band 键——门的尺是 config/env.js 的内容哈希 sha8（见 import 处注释）。
  // 注意读的时刻：本腿是在**落盘那一刻**读的（r-exec-cli.mjs 是在进程启动时读一次 GIT_SHA，两者不同），
  // 所以这一枚只能说明"这份账写于哪个提交之后"，不能说明"每一行跑于哪个提交"（长跑中途有提交就会漂）。
  let gitSha = "unknown";
  try { gitSha = execSync("git rev-parse --short=8 HEAD", { cwd: REPO, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() || "unknown"; } catch { /* 台账少一条旁证，不判红 */ }
  return {
    gitSha,
    gitShaScope: "provenance-only（落盘那一刻的 HEAD，非逐行执行时刻；门的 band 匹配从不读这一枚，只读下面那串 band）",
    identity: "A",
    /* mode@sha8 同源 artifact-band.mjs:22；取不到 ⇒ 空串（门大声数 BANDLESS），绝不拼 "unknown" 冒充有戳。 */
    band: BAND_STAMP,
    bandSource: BAND_STAMP_INFO
      ? `readApiMode(${BAND_STAMP_INFO.envFile}).mode + "@" + .sha8（尺源与 verify-real-coverage.mjs:251 相同）`
      : "档位戳未取到 ⇒ 行上 band 为空（REALCOV_BANDLESS_* 会点名这条腿）",
    project: PROJECT,
    loginVerify: LOGIN_VERIFY,
    sessionSource: TOKEN_MINTED ? "phone-login" : "",
    legNote: `载具=${BAND} band=${BAND_STAMP || "(取不到)"} gitHead=${gitSha} 出帧=reports/audit/${OUT_DIR.split(/[\\/]/).pop()} marker=${MARKER}`,
    totals: { pass: tally.counts.pass, fail: tally.counts.fail, unverified: tally.counts.unverified },
  };
}
/** 唯一收尾出口：先补写 round-7 的 exec-* 台账（覆盖率门的 execRows 只认这种目录），
 *  再落 verdict.txt，再打 DEVICELEG_RESULT 机读行，最后按三档出口码退出。 */
function finishLeg() {
  if (finished) return;
  finished = true;
  let wroteDir = "none";
  try {
    const dir = abs("reports", "audit", "round-7", "exec-v38-devicleg");
    mkdirSync(dir, { recursive: true });
    const meta = legMeta();
    const rows = buildRows(tally.items, meta, loadBindings());
    writeFileSync(join(dir, "exec-results.json"), JSON.stringify(buildExecFile(rows, meta), null, 1));
    wroteDir = EXEC_REL;
  } catch (e) { note(`   [exec 台账落盘失败] ${String((e && e.message) || e).slice(0, 160)}`); }
  const rl = resultLine(tally.counts, wroteDir, BAND_STAMP);
  lines.push(rl);
  try { writeFileSync(join(OUT_DIR, "verdict.txt"), lines.join("\n")); } catch { /* 磁盘异常不能吞掉机读行 */ }
  console.log(rl);
  process.exit(exitCodeOf(tally.counts));
}
/** 兜底任何没走 finishLeg 的退出（租约拦截、载具缺失、未预料异常）：账照落、行照打。
 *  exit 钩子里 process.exit 已无效，出口码沿用原退出码——租约/载具这两条本来就是 2。 */
process.on("exit", (code) => {
  if (finished) return;
  try {
    if (code === 2 && tally.items.length === 0) {
      uncheck("UI 租约 / 载具前置", "腿在开跑前被拦（见上方 LEASE_RESULT=FAIL 或载具缺失）；这一腿一条产品判点都没产出 ⇒ 不是证据");
    }
    finishLeg();
  } catch { /* 退出钩子不允许再抛 */ }
});

mkdirSync(OUT_DIR, { recursive: true });

// ===== 0. 载具自证：先确认这台"设备"上跑的到底是哪一档 =====
note(`\n===== 载具 ${BAND} · ${PROJECT} · 出帧目录 reports/audit/${OUT_DIR.split(/[\\/]/).pop()} =====`);
{
  const envJs = abs(PROJECT, "config/env.js");
  // 载具不在盘上是仪表/载具欠款，不是产品 FAIL：记 unverified 后由 exit 钩子收尾（码 2）
  if (!existsSync(envJs)) { uncheck("载具存在 config/env.js", `载具 ${PROJECT} 盘上没有 config/env.js`); process.exit(2); }
  const src = readFileSync(envJs, "utf8");
  const mode = (src.match(/MODE\s*:\s*["']([^"']+)/) || [])[1] || "";
  const apiMode = (src.match(/VITE_API_MODE\s*[:=]\s*["']?([a-zA-Z-]+)/) || [])[1] || "";
  const base = (src.match(/API_BASE_URL[^"']*["']([^"']+)/) || [])[1] || "";
  // mock 档的 MODE 字面量是 mp-weixin-mock（构建档位名），判"是不是 mock 载体"要看 VITE_API_MODE
  const modeOk = BAND === "real" ? mode === "real" : /mock/.test(mode) || apiMode === "mock";
  check("载具自证 MODE 与 --band 一致（跑错档位=整条腿白跑）", modeOk,
    `MODE=${mode} VITE_API_MODE=${apiMode} --band=${BAND} base=${base}`);
  if (BAND === "real") {
    check("real 档指向本机后端（不是 8081/占位符）", /127\.0\.0\.1:8080\/api/.test(base), base);
  }
  /* 门的 band 键必须由门认识的那把尺子算出来：把同一份 env.js 交给 readApiMode（它自己再 sha256 一次），
     上面那几行正则只负责自证档位，不参与盖戳。mode 或 sha8 取不到 ⇒ 这一格记仪表档、band 留空串，
     门会把它大声数成 REALCOV_BANDLESS_*（verify-real-coverage.mjs:910-921）；
     写 real@unknown / real@<提交号> 都是让门静默失配——那正是本轮要消掉的那一格。 */
  BAND_STAMP_INFO = readApiMode(abs(PROJECT));
  if (BAND_STAMP_INFO.mode && BAND_STAMP_INFO.sha8) {
    BAND_STAMP = `${BAND_STAMP_INFO.mode}@${BAND_STAMP_INFO.sha8}`;
    note(`   覆盖率门 band=${BAND_STAMP}（尺=${BAND_STAMP_INFO.envFile} 内容 sha8，同源 artifact-band.mjs:22）`);
  } else {
    uncheck("产物档位戳可读（覆盖率门的 band 键，尺=artifact-band.mjs:22）",
      `${BAND_STAMP_INFO.envFile} 上 mode=${BAND_STAMP_INFO.mode || "取不到"} sha8=${BAND_STAMP_INFO.sha8 || "取不到"} ⇒ 本腿不编造 band，落盘行按空 band 记账`);
  }
}

// ===== 1. 租约：会开页的腿必须排队 =====
// 抢不到租约 = 仪表档：guardUiLease 自己 process.exit(2)，本腿的 exit 钩子会补记
// UNVERIFIED-INSTRUMENT 一条、落 exec 台账并打 DEVICELEG_RESULT=NOT-EVIDENCED（不记产品 FAIL）。
guardUiLease({ owner: "verify-device-leg-" + BAND, tag: "LEASE", failTag: "LEASE" });

// ===== 2. 通道自检 =====
let ch = "";
try { ch = String(evaluate("() => String(1+1)", OPTS)); } catch (e) { ch = "THROW " + e.message; }
// 通道判点失败**按定义**就是仪表故障（evaluate 没答案 ≠ 产品有问题）⇒ 永远记 unverified，出口码 2
tally.checkFault(scrub("自动化通道可用（evaluate 有答案）"), ch === "2", scrub(ch), true);
if (ch !== "2") {
  note("   [仪表故障] 自动化通道不可驱动 ⇒ 整腿未执行，记 UNVERIFIED-INSTRUMENT，不记产品 FAIL");
  finishLeg();
}

// ===== 3. 铸真票 + 设备会话 =====
const mint = await postJson("/api/v1/auth/phone-login", { phone: STUDENT_PHONE, password: STUDENT_PASSWORD, deviceId: "device-leg" });
const mj = mint.json || {};
const token = mj.token || (mj.data && mj.data.token) || "";
const userId = String(mj.userId || (mj.data && mj.data.userId) || "");
// 后端连不上（status=0，postJson 捕获的 fetch 异常）= 仪表档；应答了但铸不出票 = 产品档
if (mint.status === 0) {
  uncheck("演示学员号能铸出真票（real 后端 phone-login）", "后端不可达：" + mint.text);
  note("   [仪表故障] 后端连不上 ⇒ 记 UNVERIFIED-INSTRUMENT、整腿到此收手，不再产出任何会被读成产品判决的行");
  finishLeg();
}
check("演示学员号能铸出真票（real 后端 phone-login）", mint.status === 200 && !!token && /^\d+$/.test(userId),
  `http=${mint.status} userId=${userId || "?"}`);
if (!token) { note("   铸票失败（后端应答了 " + mint.status + "）⇒ 这一腿没有真票可用，后续判点不成立"); finishLeg(); }

note("   清掉设备上可能残留的旧会话（游客态起步，避免拿上一轮的票冒充这一轮）");
clearSession(OPTS);
const boot = String(bootSession(token, OPTS));
const vLogin = String(verifyLogin(OPTS));
const observed = (vLogin.match(/^logged-in userId=(\d+)$/) || [])[1] || "";
// 把实测会话留给 exec 台账（覆盖率门的 sessionVerdict 拿 loginVerify×sessionSource 对账 identity 标签）
LOGIN_VERIFY = vLogin; TOKEN_MINTED = !!token;
check("设备会话=刚铸的那张真票（mock 载具做不到，这条在 mock 档必须反过来）",
  EXPECT_SYNC ? (boot === "boot-ok" && observed === userId) : (boot === "boot-ok" && observed !== userId),
  `boot=${boot} 设备侧=${vLogin} 真票 userId=${userId}${EXPECT_SYNC ? "" : "（mock 档：不等才对）"}`);

// ===== 3.5 校区归属：走产品自己的接口，让新用户真进圈层轴 =====
// 后台建号接口不收校区（AdminUserController.createUser 只有 phone/password/nickname），
// 而 users.circle_path 过去只由一次性回填脚本维护 ⇒ 新用户在圈层轴上永远不可见。
// 这一步用 PUT /profile/campus（用户在 App 里选学校的同一个端点）把归属补上。
{
  const cp = await putJson("/api/v1/profile/campus",
    { city: "北京", campusName: CAMPUS, department: "计算机学院" }, token);
  checkI("学员号可用产品接口选定校区（PUT /profile/campus）", cp.status === 200, `http=${cp.status} body=${cp.text.slice(0, 110)}`, cp.status === 0);
  await sleep(900);
  // 校区对应的三级节点从圈层树里查，不写死 id/path：真大区重排（§2）会改这些路径
  const atok = (await adminToken()) || "";
  const layersResp = await apiFetch(`${API}/admin/circle-layers`, { headers: { Authorization: `Bearer ${atok}` } });
  const layers = (layersResp.json && layersResp.json.data) || [];
  schoolNode = layers.find((l) => Number(l.level) === 3 && l.name === CAMPUS) || null;
  checkI("圈层树上有这个校区节点（没有就只能落未归属，断言要如实说明）", !!schoolNode,
    `campus=${CAMPUS} 节点=${schoolNode ? schoolNode.id + ":" + schoolNode.circlePath : "-"}`, layersResp.status === 0 || !atok);
  const inTree = schoolNode
    ? await apiFetch(`${API}/admin/evidence/circle/${schoolNode.id}/users`, { headers: { Authorization: `Bearer ${atok}` } })
    : { status: -1, json: {} };
  const list = (inTree.json && inTree.json.data) || [];
  const me = list.find((u) => Number(u.id) === Number(userId));
  checkI("选定校区后学员已挂上该校圈层节点（users.circle_path 由后端回填，不是脚本刷的）",
    !!me && !!schoolNode && me.circlePath === schoolNode.circlePath,
    `命中=${!!me} circlePath=${me?.circlePath || "-"} 期望=${schoolNode?.circlePath || "-"}`,
    schoolNode ? inTree.status === 0 : layersResp.status === 0 || !atok);
}

// ===== 4. 逛主要页面：每页出帧 + 路由核对 =====
const TOUR = [
  { route: "/pages/home/index", name: "01-home" },
  { route: "/pages/nearby/index", name: "02-nearby" },
  { route: "/pages/discover/index", name: "03-discover" },
  { route: "/pages/messages/index", name: "04-messages" },
  { route: "/pages/profile/index", name: "05-profile" },
  { route: "/subpackages/village/village/index", name: "06-village-feed" },
];
const frames = [];
for (const t of TOUR) {
  CURRENT_PAGE = t.route.replace(/^\//, "");
  let openErr = "";
  try { openPage(t.route, "", OPTS); } catch (e) { openErr = String((e && e.message) || e); note(`   [note] 开页 ${t.route} 失败 ${openErr.slice(0, 80)}`); }
  await sleep(2600);
  let r = "";
  try { r = String(routeStack(OPTS)); } catch (e) { r = "THROW " + String((e && e.message) || e); }
  /** 落点要"等稳"再判：登录成功后的默认落地是 discover（pages/login/index.vue:175
   *  replaceAppPath(pending ?? "/pages/discover/index")，另有 :89/:120 与
   *  guards/session-guard.ts:93 三处 switchTab/reLaunch 指向同一处），
   *  所以开页后读一次就定罪，量到的很可能是**上一次**的落点而不是这一页的落点。
   *  实测第一版本腿就因此把 01-home 记成 FAIL（routeStack=pages/discover/index），
   *  而后续 4 个页面全 PASS——单点首读红 + 后面全绿，这个形状本身就是竞态的特征。
   *  现在：最多再等 4 轮（每轮 ~1.5 s）直到路由真落上去；首读与稳态都写进判决行，
   *  这样"竞态被等掉了"与"这页真的到不了"在账上是两种读法。 */
  const want = t.route.replace(/^\//, "");
  const firstRead = r;
  let settled = r.includes(want);
  for (let k = 0; k < 4 && !settled && !/^THROW/.test(r); k++) {
    await sleep(1500);
    let again = "";
    try { again = String(routeStack(OPTS)); } catch { break; }
    if (again === r) break;
    r = again;
    settled = r.includes(want);
  }
  const routeDetail = `routeStack=${String(r).slice(0, 90)}` +
    (settled && !firstRead.includes(want) ? `（首读=${String(firstRead).slice(0, 60)}，等稳后才落上 ⇒ 首读不可信这条又中一次）` : "");
  const fr = shotAt(t.name + ".png");
  frames.push({ ...t, route: r, bytes: fr.bytes, geom: fr.geom, err: fr.err });
  // 开页抛异常 / routeStack 读不出 = 通道不可驱动（仪表档），不能记成"路由落错"（产品档）
  if (openErr || /^THROW/.test(r)) {
    uncheck(`${t.name} 路由落在 ${t.route}`, `开页/读栈失败：openErr=${openErr.slice(0, 120)} routeStack=${String(r).slice(0, 90)}`);
  } else {
    check(`${t.name} 路由落在 ${t.route}`, settled, routeDetail);
  }
  // 截图通道没回文件 = 仪表故障；通道正常但帧是空/小的才是产品判红
  if (fr.err) uncheck(`${t.name} 出帧已写出且非空帧（>=6KB）`, `出帧通道未回文件：${fr.err.slice(0, 120)}`);
  else check(`${t.name} 出帧已写出且非空帧（>=6KB）`, fr.bytes >= 6000, `${fr.bytes}B ${fr.geom}`);
}

// ===== 5. 信息流是真的：设备 store 里有数据，且这条数据在后台按同 ID 读得到 =====
// 计数不用 nodeCount——那枚导出的语义是「在/不在」三态探针（1/0/ERR），不是数量；
// 真正的条数从 village store 的 posts 上读（实测 keys=posts,currentPost,... len=20）。
{
  try { openPage("/subpackages/village/village/index", "", OPTS); } catch (e) { note(`   [note] 开村口失败 ${String((e && e.message) || e).slice(0, 80)}`); }
  await sleep(3200);
  CURRENT_PAGE = "subpackages/village/village/index";
  const probeRaw = safeAct("设备侧 village store 真收到帖子列表（>=5 条）", () => String(evaluate(
    "() => { try { var app=getApp(); var vm=app.$vm; var gp=(vm.$&&vm.$.appContext.config.globalProperties)||{};"
    + " var p=vm.$pinia||gp.$pinia; var s=p._s.get('village'); if(!s) return 'NO-STORE';"
    + " var l=s.posts||[]; var f=l[0]||{}; return JSON.stringify({n:l.length, id:f.id||0, title:String(f.title||f.content||'').slice(0,24), loading:!!s.loading}); }"
    + " catch(e){ return 'ERR '+e.message; } }", OPTS)));
  if (probeRaw !== null) {
    const probe = probeRaw;
    const st = (() => { try { return JSON.parse(probe); } catch { return {}; } })();
    checkI("设备侧 village store 真收到帖子列表（>=5 条）", Number(st.n) >= 5, `n=${st.n ?? "-"} 探针=${probe.slice(0, 120)}`, instFault(probe));
    if (st.id) {
      const numeric = /^\d+$/.test(String(st.id));
      const d = await apiFetch(`${API}/admin/forum/village-posts/${st.id}`, { headers: { Authorization: `Bearer ${(await adminToken()) || ""}` } });
      const same = numeric && d.status === 200;
      if (!numeric) {
        checkI("mock 载具的信息流没有真库 ID（天然不同源，这条就是负例要的形态）", !EXPECT_SYNC,
          `id=${st.id} 非数字 ⇒ 后台按它读不到任何真记录`, d.status === 0);
      } else {
        checkI("设备首条卡片能在后台按同一个 ID 读到（数据同源，不是本地假数据）",
          EXPECT_SYNC ? same : !same, `id=${st.id} 后台 http=${d.status}（mock 档此条应读不到）`, EXPECT_SYNC && d.status === 0);
      }
      note(`   卡片标题读数=「${st.title}」`);
    }
  }
}

// ===== 6. 公告：后台发 → 设备官方号会话读到 =====
let annId = null;
{
  CURRENT_PAGE = "subpackages/chat/official-chat/index";
  const lg = await postJson("/api/v1/auth/admin/login", { username: "local-dev-admin-openid-123456", password: SUPER_PASSWORD });
  const tj = lg.json || {};
  const supTok = (tj.data && tj.data.token) || tj.token || "";
  if (lg.status === 0) uncheck("超管票可铸（公告由后台侧发出）", "后端不可达：" + lg.text);
  else check("超管票可铸（公告由后台侧发出）", lg.status === 200 && !!supTok,
    `http=${lg.status} SUPER_PASSWORD 长度=${SUPER_PASSWORD.length} body=${String(lg.text).slice(0, 150)}`);
  if (supTok) {
    const pub = await postJson("/api/v1/admin/official-accounts/official-assistant/messages",
      { messageType: "text", content: `【设备腿公告】${ANN_MARK} 这条公告应出现在小程序官方号会话末尾` }, supTok);
    const pj = pub.json || {};
    annId = (pj.data && (pj.data.id || pj.data.messageId)) || pj.id || null;
    checkI("后台发布 text 公告成功", pub.status === 200 && !!annId, `http=${pub.status} id=${annId || "-"} body=${String(pub.text).slice(0, 120)}`, pub.status === 0);
    await sleep(1500);
    /* 必须 reLaunch 而不是 openPage：官方号会话页若已在设备页栈里，simulator_open_page 只是
       把它换到前台、不再跑 onLoad（实测整轮 0 次 official-accounts 请求、data 里是上一轮的 14 条），
       于是"公告没出现"会被读成产品缺陷。reLaunch 清栈重建，onLoad 必然重跑。 */
    const rl = safeAct("进入官方号会话（reLaunch 清栈重跑 onLoad）", () => String(evaluate(
      `() => { try { wx.reLaunch({url:${JSON.stringify("/subpackages/chat/official-chat/index?accountId=official-assistant")}}); return "relaunch-ok"; }`
      + ` catch(e){ return "ERR "+e.message; } }`, OPTS)));
    if (rl !== null) {
      await sleep(4500);
      let landed = "";
      try { landed = String(routeStack(OPTS)); } catch (e) { landed = "THROW " + String((e && e.message) || e); }
      note(`   ${rl} · 落在 ${landed.slice(0, 60)}`);
      /* 判点读的是**渲染出来的 WXML**（.chat-list 子树），不是页面 data：
         实测 data 里只能看到 uS:0 / v:14 两个数组，messages 并不以数组形态出现在页实例上，
         拿它当判点会把"其实已经渲染"读成失败。outerWxml 是设备侧真实画面里的那段结构。 */
      const wxml = safeAct("公告已渲染进设备侧官方号会话（.chat-list 的 WXML 里就有这条）", () => actWithRetry("outerWxml", ".chat-list"));
      if (wxml !== null) {
        const gotIt = wxml.includes(ANN_MARK);
        check("公告已渲染进设备侧官方号会话（.chat-list 的 WXML 里就有这条）", EXPECT_SYNC ? gotIt : !gotIt,
          `命中=${gotIt} 子树长度=${wxml.length} 尾部=「${wxml.slice(-120).replace(/\s+/g, " ")}」`);
      }
    }
    let chatNet = "";
    try { chatNet = String(ideCall("get_simulator_network", ["--command", "grep -n official-accounts"], OPTS)); }
    catch (e) { chatNet = "THROW " + String((e && e.message) || e).slice(0, 140); }
    writeFileSync(join(OUT_DIR, "device-announcement-network.log"), chatNet);
    note(`   旁证：网络面板里官方号接口 ${chatNet.split(/\r?\n/).filter(Boolean).length} 行（面板有缓冲上限，不作判点）`);
    shotAt("07-official-chat.png");
  }
}

// ===== 7. 设备发帖：真输入 + （真图上传通道）+ 真提交 =====
const toastSafe = (n) => { try { return readToasts().slice(0, n); } catch (e) { return "THROW " + String((e && e.message) || e).slice(0, 120); } };
{
  CURRENT_PAGE = "subpackages/village/village/publish";
  try { openPage("/subpackages/village/village/publish", "", OPTS); } catch (e) { note(`   [note] 开发布页失败 ${String((e && e.message) || e).slice(0, 80)}`); }
  await sleep(3000);
  let hookNote = "";
  try { hookNote = hookToasts(); } catch (e) { hookNote = "THROW " + String((e && e.message) || e); }
  note(`   toast 钩子=${hookNote}`);
  const typed = safeAct("发布页正文可输入（真 textarea 被写进去了）", () => actWithRetry("input", ".publish-content__input", ["--value", CONTENT]));
  if (typed !== null) check("发布页正文可输入（真 textarea 被写进去了）", !/ok=false|"error"/i.test(typed), typed.slice(0, 80));
  await sleep(600);
  // 读元素自己的 value（不是页面数据）——「写进去了」要以输入框当前值为准
  const domVal = safeAct("输入框回读含 marker（内容真进了表单，不是只写了变量）", () => actWithRetry("value", ".publish-content__input"));
  if (domVal !== null) check("输入框回读含 marker（内容真进了表单，不是只写了变量）", domVal.includes(MARKER),
    `回读=${domVal.slice(0, 90)}`);

  if (WITH_IMAGES) {
    /* 「相册」里的照片必须是模拟器认得的本地文件：盘符绝对路径喂给 uni.uploadFile 会被当场拒掉
       （实测设备侧连 POST /media/upload 都没发出去，toast=「图片上传失败，请重试」）。
       所以先用小程序自己的下载通道把真图字节写进 wx.env.USER_DATA_PATH（http://usr），
       chooseImage 替身只负责把这些本地路径交回页面——上传、组 images、提交全是页面自己的代码在跑。 */
    const asset = await firstApprovedImageAsset();
    checkI("能从后台图片资产台账取到一张真图当相册素材（不造空壳图）",
      !!asset.key && asset.size > 2048, `key=${asset.key || "台账里没有通过的图"} 台账 size=${asset.size}`, asset.offline === true);
    const url = asset.key ? `${ORIGIN}${asset.key}${asset.key.includes("?") ? "&" : "?"}token=${token}` : "";
    const names = [1, 2, 3].map((i) => `devleg-${STAMP}-${i}.jpg`);
    const paths = names.map((n) => `http://usr/${n}`);
    // 先在进程外侧同一把尺子量一遍：素材本身得是张真图，且学员票读得到
    let probeStatus = 0; let expectedBytes = -1; let probeFault = false;
    try {
      const pr = await fetch(url);
      probeStatus = pr.status;
      expectedBytes = pr.ok ? (await pr.arrayBuffer()).byteLength : -1;
    } catch (e) { probeFault = true; }
    checkI("学员票读这张图：200 且字节数与台账一致（不是错误体的伪成功）",
      !probeFault && probeStatus === 200 && expectedBytes > 2048 && expectedBytes === asset.size,
      `http=${probeFault ? 0 : probeStatus} 实读=${expectedBytes}B 台账=${asset.size}B url=${url.slice(0, 60)}…`, probeFault);
    const kick = safeAct("3 张真图已写进模拟器本地目录，字节数与服务端逐张一致", () => String(evaluate(
      `() => { try { var fs=wx.getFileSystemManager(); var dir=wx.env.USER_DATA_PATH;`
      + ` globalThis.__w=[]; var N=${JSON.stringify(names)};`
      + ` N.forEach(function(n){ wx.request({url:${JSON.stringify(url)}, responseType:'arraybuffer',`
      + ` success:function(res){ try{ fs.writeFileSync(dir+'/'+n, res.data, 'binary'); globalThis.__w.push(n+':'+res.data.byteLength) }`
      + ` catch(e){ globalThis.__w.push(n+':WERR'+e.message) } },`
      + ` fail:function(e){ globalThis.__w.push(n+':RFAIL'+JSON.stringify(e).slice(0,60)) } }); });`
      + ` return 'kicked'; } catch(e){ return 'ERR '+e.message; } }`, OPTS)));
    await sleep(3500);
    const stat = safeAct("3 张真图已写进模拟器本地目录，字节数与服务端逐张一致", () => String(evaluate(
      `() => { try { var fs=wx.getFileSystemManager(); var dir=wx.env.USER_DATA_PATH;`
      + ` var N=${JSON.stringify(names)}; var out=N.map(function(n){ try { var s=fs.statSync(dir+'/'+n); return n+"="+s.size } catch(e){ return n+"=MISSING" } });`
      + ` return JSON.stringify({files:out, w:globalThis.__w}); } catch(e){ return 'ERR '+e.message; } }`, OPTS)));
    const prep = (() => { try { return stat ? JSON.parse(stat) : {}; } catch { return {}; } })();
    const sizes = (prep.files || []).map((f) => Number(String(f).split("=")[1]) || 0);
    const allWritten = (prep.files || []).filter((f) => /=\d+$/.test(f) && !/=0$/.test(f)).length;
    if (kick !== null && stat !== null) checkI("3 张真图已写进模拟器本地目录，字节数与服务端逐张一致",
      allWritten === 3 && expectedBytes > 0 && sizes.every((s) => s === expectedBytes),
      `kick=${kick} 期望=${expectedBytes}B 读数=${stat.slice(0, 220)}`, instFault(kick) || instFault(stat));
    // 两处替身（系统相册 + 隐私弹窗），其余仍是页面自己的代码在跑
    const mock = safeAct("选图替身装得上（wx.chooseImage 可覆盖）", () => String(evaluate(`() => { try {
      var P=${JSON.stringify(paths)};
      wx.chooseImage = function(o){ var r={tempFilePaths:P, tempFiles:P.map(function(x){return {path:x,size:32088,name:x.split(/[\\\\/]/).pop()}}), errMsg:'chooseImage:ok'}; if(o&&o.success)o.success(r); if(o&&o.complete)o.complete(r); return r; };
      wx.chooseMedia = function(o){ var r={tempFiles:P.map(function(x){return {tempFilePath:x,size:32088,width:200,height:200}}), type:'image', errMsg:'chooseMedia:ok'}; if(o&&o.success)o.success(r); if(o&&o.complete)o.complete(r); return r; };
      if (wx.requirePrivacyAuthorize) wx.requirePrivacyAuthorize = function(o){ if(o&&o.success)o.success({}); return {}; };
      return 'mocked ' + P.length; } catch(e){ return 'ERR ' + e.message; } }`, OPTS)));
    if (mock !== null) checkI("选图替身装得上（wx.chooseImage 可覆盖）", mock.startsWith("mocked 3"), mock, instFault(mock));
    const tapped = safeAct("点加图按钮（发布页加图入口）", () => actWithRetry("tap", ".publish-image--add", ["--wait", "3"]));
    await sleep(2500);
    // 数量从页面 data 上读；字段名不靠猜——列出该页所有数组型 data 键，取最长的当 images
    const thumbsRaw = safeAct("点加图后 3 张图进了九宫格（页面自己的 images 收到选图结果）", () => String(evaluate(
      "() => { try { var ps=getCurrentPages(); var p=ps[ps.length-1]; var d=p.data||{};"
      + " var ks=Object.keys(d).filter(function(k){ return Array.isArray(d[k]) }).map(function(k){ return k+':'+d[k].length });"
      + " var best=ks.map(function(s){var i=s.lastIndexOf(':');return {k:s.slice(0,i),n:Number(s.slice(i+1)),v:d[s.slice(0,i)]}}).sort(function(a,b){return b.n-a.n})[0];"
      + " return JSON.stringify({keys:ks, top:best?{k:best.k,n:best.n,sample:best.v.slice(0,2).map(function(x){return String(x).slice(0,40)})}:null}); }"
      + " catch(e){ return 'ERR '+e.message; } }", OPTS)));
    const th = (() => { try { return thumbsRaw ? JSON.parse(thumbsRaw) : {}; } catch { return {}; } })();
    if (tapped !== null && thumbsRaw !== null) {
      checkI("点加图后 3 张图进了九宫格（页面自己的 images 收到选图结果）", th.top && th.top.n === 3,
        `top=${JSON.stringify(th.top || {})} 数组键=${JSON.stringify(th.keys || []).slice(0, 140)} toast=${toastSafe(120)}`,
        instFault(thumbsRaw));
      if (!(th.top && th.top.n === 3)) note("   [deviation] 设备侧没凑齐 3 张图：本腿降级为纯文字帖继续跑同步断言，图片链路另由后台上传腿与浏览器门覆盖");
    }
  }

  const t0 = Date.now();
  const submitted = safeAct("点提交按钮（发布页提交入口）", () => actWithRetry("tap", ".publish-header__submit", ["--wait", "2"]));
  await sleep(4000);
  let after = "";
  try { after = String(routeStack(OPTS)); } catch (e) { after = "THROW " + String((e && e.message) || e); }
  const toasts = toastSafe(200);
  note(`   提交后路由=${after.slice(0, 90)} toast=${toasts}`);

  // 后台按 marker 回读：命中即证明「小程序上传的，后台这边看得到」
  let found = null, elapsed = 0, lastStatus = -1;
  for (let i = 0; i < 8; i += 1) {
    await sleep(i === 0 ? 0 : 2000);
    const q = await apiFetch(`${API}/admin/forum/village-posts?page=1&pageSize=5&keyword=${encodeURIComponent(MARKER)}`, {
      headers: { Authorization: `Bearer ${(await adminToken()) || ""}` },
    });
    lastStatus = q.status;
    if (q.status === 0) note(`   [仪表] 轮询 marker 时后端不可达（第 ${i + 1}/8 次），继续重试`);
    const j = q.json || {};
    const items = j?.data?.items || j?.items || [];
    // 列表视图（AdminPostSummaryView）没有 title，只有 contentPreview（正文前 80 字）
    const hit = items.find((x) => String(x.contentPreview || "").includes(MARKER) || String(x.title || "").includes(MARKER));
    if (hit) { found = hit; elapsed = Date.now() - t0; break; }
  }
  // 提交没点成（仪表断）或后端全程不可达 ⇒ "查不到 marker" 不是产品判决，是这一腿没量到
  const backFault = submitted === null || lastStatus === 0;
  if (EXPECT_SYNC) {
    checkI("设备发的帖子 30 秒内在后台列表出现（同一条记录）", !!found && elapsed <= 30000,
      found ? `id=${found.id} 用时=${Math.round(elapsed / 100) / 10}s` : `后台按 marker 查不到 toast=${toasts}`, backFault);
    checkI("后台读到的这条与设备发的一致（正文前缀=设备输入、作者为发帖学员）",
      !!found && String(found.contentPreview || "").startsWith(`设备腿验收 ${MARKER}`) && !!found.authorNickname,
      found ? `preview=「${String(found.contentPreview || "").slice(0, 30)}…」 author=${found.authorNickname || "?"}` : "无记录", backFault);
    if (found) {
      const d = await apiFetch(`${API}/admin/forum/village-posts/${found.id}`, { headers: { Authorization: `Bearer ${await adminToken()}` } });
      const dj = d.json || {};
      // 详情视图里 images 是 JSON 字符串（列存的原文），不是数组
      const imgs = (() => {
        if (Array.isArray(dj?.images)) return dj.images.length;
        if (typeof dj?.images === "string" && dj.images.trim().startsWith("[")) {
          try { return JSON.parse(dj.images).length; } catch { return -2; }
        }
        return -1;
      })();
      // 详情视图不暴露 ownerCirclePath，用「作者本校圈层过滤能查到这一条」来证归属（口径同列表）
      const wantPath = schoolNode?.circlePath || "";
      const inSchool = wantPath
        ? await apiFetch(`${API}/admin/forum/village-posts?page=1&pageSize=5&circlePath=${encodeURIComponent(wantPath)}&keyword=${encodeURIComponent(MARKER)}`,
          { headers: { Authorization: `Bearer ${await adminToken()}` } })
        : { status: -1, json: {} };
      const inj = inSchool.json || {};
      const inSchoolHit = (inj?.data?.items || inj?.items || []).some((x) => x.id === found.id);
      note(`   后台详情：id=${dj?.id} 图数=${imgs} 状态=${dj?.auditStatus || "?"} 标题=「${String(dj?.title || "").slice(0, 20)}」`);
      checkI("后台详情能读到这条帖（同 ID 回读）", d.status === 200 && dj?.id === found.id, `http=${d.status}`, d.status === 0);
      checkI("这条帖按作者本校圈层可被过滤到（C 端新发帖也进圈层轴）", inSchoolHit,
        `circlePath=${wantPath || "作者未挂树"} 命中=${inSchoolHit}`, inSchool.status === 0);
      writeFileSync(join(OUT_DIR, "device-post.json"), JSON.stringify({ summary: found, detail: dj }, null, 1));
      note(`   落盘 reports/audit/.../device-post.json（浏览器门可用这个 ID 复查像素）`);
      note(`POST_ID=${found.id}`);
    }
  } else {
    checkI(`负例：mock 档发的帖子不该进真库（看到了就说明断言读的不是真数据）`, !found,
      found ? `竟然查到 id=${found.id}` : "mock 档发帖在真库里查不到，符合预期", lastStatus === 0);
  }
  shotAt("08-after-publish.png");
}

// ===== 8. 断言本身可证伪：不存在的 marker 必须查不到 =====
{
  const q = await apiFetch(`${API}/admin/forum/village-posts?page=1&pageSize=1&keyword=${encodeURIComponent("DEVSYNCNOTEXIST9999")}`,
    { headers: { Authorization: `Bearer ${(await adminToken()) || ""}` } });
  const j = q.json || {};
  const total = Number(j?.data?.total ?? j?.total ?? -1);
  checkI("同一把尺子量不到一个不存在的 marker（断言不是恒真）", q.status === 200 && total === 0, `total=${total}`, q.status === 0);
}

// ===== 9. 设备侧日志：请求与报错 =====
{
  let netAll = "", netFail = "", conErr = "";
  try { netAll = String(ideCall("get_simulator_network", ["--command", "grep -n ."], OPTS)); } catch (e) { netAll = "THROW " + e.message; }
  try { netFail = String(ideCall("get_simulator_network", ["--command", "grep -i fail"], OPTS)); } catch (e) { netFail = "THROW " + e.message; }
  try { conErr = String(ideCall("get_simulator_console", ["--command", "grep -i error"], OPTS)); } catch (e) { conErr = "THROW " + e.message; }
  writeFileSync(join(OUT_DIR, "simulator-network.log"), netAll);
  writeFileSync(join(OUT_DIR, "simulator-network-fail.log"), netFail);
  writeFileSync(join(OUT_DIR, "simulator-console-error.log"), conErr);
  const reqLines = netAll.split(/\r?\n/).filter((l) => /127\.0\.0\.1:8080|\/api\/v1/.test(l));
  // 日志面板读不出（THROW）= 仪表档；面板能读、里面没有打到本机后端的请求 = 产品档
  checkI("设备侧确有打到本机后端的请求（真链路，不是内存里的假数据）", EXPECT_SYNC ? reqLines.length >= 5 : true,
    `命中 ${reqLines.length} 行，落盘 simulator-network.log`, instFault(netAll));
  const failLines = netFail.split(/\r?\n/).filter((l) => /127\.0\.0\.1:8080|\/api\/v1/.test(l));
  checkI("设备侧没有失败的接口请求", failLines.length === 0,
    failLines.length ? failLines.slice(0, 3).join(" ⏎ ").slice(0, 260) : "0 行", instFault(netFail));
  const errLines = conErr.split(/\r?\n/).filter((l) => l.trim() && !/^\s*$/.test(l));
  checkI("设备控制台没有 error 级输出", errLines.length === 0,
    errLines.length ? errLines.slice(0, 3).join(" ⏎ ").slice(0, 300) : "0 行", instFault(conErr));
}

// ===== 10. 收尾：撤掉公告，别把验收垃圾留在正式会话里 =====
if (annId) {
  const st = await adminToken();
  const r = await apiFetch(`${API}/admin/official-accounts/official-assistant/messages/${annId}`, {
    method: "DELETE", headers: { Authorization: `Bearer ${st}`, "Idempotency-Key": `dl-${STAMP}` },
  });
  checkI("验收公告已撤回（下架后 C 端读不到）", r.status === 200, `http=${r.status}`, r.status === 0);
}
// 收尾：把会话留在演示学员身上（这条腿会开页，清完会话会把用户的模拟器丢在登录页）
let restoreBoot = ""; try { restoreBoot = String(bootSession(token, OPTS)); } catch (e) { restoreBoot = "THROW " + String((e && e.message) || e); }
let finalRoute = ""; try { finalRoute = String(routeStack(OPTS)); } catch (e) { finalRoute = "THROW " + String((e && e.message) || e); }
note(`   设备会话复原=${restoreBoot} 最终路由=${finalRoute.slice(0, 60)}`);

/** 取一张**已审核通过的真图**当相册素材（后台图片资产台账里挑，不造 1×1 空壳）。
 *  连 size 一起带回来，用于「设备侧写进本地目录的字节数 == 服务端那张图的字节数」这条硬核对。 */
async function firstApprovedImageAsset() {
  const tok = await adminToken();
  if (!tok) return { key: "", size: -1, offline: false };
  for (const st of ["approved", "pending"]) {
    const q = await apiFetch(`${API}/admin/media-assets?auditStatus=${st}&type=image&pageSize=20`,
      { headers: { Authorization: `Bearer ${tok}` } });
    if (q.status === 0) return { key: "", size: -1, offline: true };
    const items = q.json?.data?.items || q.json?.items || [];
    for (const it of items) {
      const raw = String(it.url || "");
      let rel = raw;
      if (raw.startsWith("http")) { try { rel = new URL(raw).pathname; } catch { continue; } }
      if (rel.startsWith("/api/v1/media/")) return { key: rel, size: Number(it.size || -1), offline: false };
    }
  }
  return { key: "", size: -1, offline: false };
}

async function adminToken() {
  if (adminToken.cached) return adminToken.cached;
  const lg = await postJson("/api/v1/auth/admin/login", { username: "local-dev-admin-openid-123456", password: SUPER_PASSWORD });
  const j = lg.json || {};
  adminToken.cached = (j.data && j.data.token) || j.token || "";
  return adminToken.cached;
}

note(`\n出帧目录 reports/audit/${OUT_DIR.split(/[\\/]/).pop()}（${frames.length} 页 + 官方号 + 发帖后）`);
// 「失败 N 项」行保留（前缀逐字节不变，外部 grep 靠它），后面追加的是新的一档，不改写旧词
note(`\n失败 ${tally.counts.fail} 项${tally.counts.unverified ? `｜未证实(仪表) ${tally.counts.unverified} 项` : ""}`);
finishLeg();

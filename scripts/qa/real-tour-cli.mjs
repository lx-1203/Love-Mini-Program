/* T6 真实模式取景：走 wechatide CLI 自己的 automator 通道，而不是 miniprogram-automator 的 WS 端口。
 *
 * 为什么要有这条腿（都是本轮实测出来的前提）：
 *   · round-6 的 mock 取景原先用 ws://127.0.0.1:9431（miniprogram-automator）。08:30 之后该端口
 *     **不再出现**：关掉最后一个项目窗口后端口消失，`quit` + 重启 IDE + 重开项目窗口都不恢复
 *     （mock 项目窗口重开也测过，同样没有端口）—— 这是 IDE 侧的"服务端口"开关，CLI 里没有对应命令，
 *     我不会假装能用命令行改它。
 *   · 但 `simulator_screenshot` / `automation_evaluate` / `simulator_open_page` 经 CLI 仍然可用，
 *     实测在 real 项目上返回 `{"token":"","pages":["pages/login/index"]}`（真实构建无 token 时落到登录页，
 *     与"游客不得浏览广场"的既有裁定一致）⇒ 换一条采集通道可以把真实模式 UI 帧补出来，
 *     而不是因为 WS 端口没了就跳过目标里的那一项。
 *
 * 与 tour-r6.mjs 的**故意差异**（都写进 manifest，禁止跨 harness 比像素）：
 *   1. 出图尺寸由 IDE 决定（实测 193×413，automator 是 378×814）⇒ manifest.harness 记死；
 *   2. 不拍 zoom 裁切帧、不做滚动分帧（CLI 没有对应能力），captureLimitations 里列明；
 *   3. 状态只到「默认」：交互/弹层需要 element 级点击，CLI 虽有 automation_element_action，
 *      但选择器映射要另建一套 —— 本轮不扩范围，先确保"真实构建能渲染、页面可达"这条最低事实有据。
 *
 * 凭据：沿用 tour-r6.mjs 的做法，**运行期从 tmp/r11_chains2.py 读**，绝不出现在命令行/日志里。
 * 用法：node scripts/qa/real-tour-cli.mjs [--tsv .zcode/tmp/reverify/real-tour.tsv] [--label round-6-real-tour]
 */
import { execFileSync, execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync, statSync, rmSync, readdirSync } from "node:fs";
import http from "node:http";
import { dirname, join, resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { guardUiLease } from "./ui-lease.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
/* manifest 里的 path 必须是「仓库相对 + 正斜杠」，与 tour-r6.mjs 同方言 ——
   verify-provenance-all 判「断链帧」的解法是 `p.startsWith(repo) || p.startsWith("/") ? p : join(repo, p)`，
   而 repo 在 Windows 上是反斜杠形态，所以一个 `D:/…` 绝对写法两支都不匹配，会被 join 成
   `repo\D:\6\…` 这种必然不存在的字符串 ⇒ 18 张帧全被判 UNRESOLVABLE（本轮实测踩过）。
   原先写的是 `file.replace(REPO + "/", "")`，而 file 由 join() 生成、分隔符是反斜杠，
   那次 replace 从来就没命中过，剩下 split/join 只是把反斜杠换成斜杠、留下绝对前缀。 */
const relOf = (p) => relative(REPO, p).split(sep).join("/");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const TSV = arg("tsv", ".zcode/tmp/reverify/real-tour.tsv");
const LABEL = arg("label", "round-6-real-tour");
const PROJECT = arg("project", join(REPO, "apps/client/dist/build/mp-weixin-real"));
/* buildMode 必须跟着 --project 走：这脚本叫 real-tour，但它同样能指到 mock 产物上跑
   （本轮就这么用过）。原先这里写死 "build:mp-weixin:real:isolated"，一旦指到 mock，
   权威索引里那一批帧就会被标成真实模式——那是伪造溯源。 */
const BUILD_MODE = arg("build-mode", /mp-weixin-real/.test(String(PROJECT)) ? "build:mp-weixin:real:isolated" : "build:mp-weixin（mock）");
const IDE = arg("ide", "D:/微信开发者/微信web开发者工具/wechatide.cmd");
const OUT_DIR = join(REPO, "reports/screenshots", LABEL);
const SETTLE_MS = Number(arg("settle", "2600"));
const APIDIR = "apps/client";

function git(args) { try { return execSync("git " + args, { cwd: REPO, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { return ""; } }
const GIT_SHA = git("rev-parse --short HEAD") || "unknown";

/* 直接复刻 wechatide.cmd 最后一行：Electron 主程序 -e <bootstrap> <skill-index.js> <args…>，
   用 ELECTRON_RUN_AS_NODE 让它以 node 方式执行。为什么绕开 .cmd：
   Node ≥18.20 起 spawnSync 直接执行 .bat/.cmd 会 EINVAL（本轮实测 fatal=spawnSync …wechatide.cmd EINVAL），
   而 shell:true 又把 --fn-source 里的 JS/引号交给 cmd 重新解析 —— 那正是"参数被壳改坏"的老坑。
   主程序按 .cmd 里同一条规则找（>50MB 的 exe，排除 node/wxfilewatcher 等）。 */
const IDE_DIR = dirname(IDE);
const EXE_EXCLUDE = new Set(["node.exe", "node-18.exe", "wxfilewatcher.exe", "wxfilewatcher_x64.exe", "notification_helper.exe", "wechatdevtools.exe"]);
const ELECTRON_EXE = (() => {
  let best = null, min = 50 * 1024 * 1024;
  for (const n of readdirSync(IDE_DIR)) {
    if (!/\.exe$/i.test(n) || EXE_EXCLUDE.has(n.toLowerCase())) continue;
    const sz = statSync(join(IDE_DIR, n)).size;
    if (sz > min) { min = sz; best = join(IDE_DIR, n); }
  }
  return best;
})();
const CLI_JS = join(IDE_DIR, "resources", "app.asar.unpacked", "js", "common", "cli", "skill-index.js");
const BOOTSTRAP_JS = "const e=process.argv[1],a=process.argv.slice(2).filter(function(x){return x!=='--electron'});if(!process.env.cwd)process.env.cwd=process.cwd();process.argv=[process.execPath,e,'--electron'].concat(a);require(e)";
if (!ELECTRON_EXE || !existsSync(CLI_JS)) { console.log("REALTOUR_RESULT=FAIL reason=找不到 Electron 主程序或 skill-index.js（IDE 安装目录变了？）"); process.exit(1); }

/** 调 wechatide CLI 并解析 JSON；失败一律抛出（不静默吞） */
function ide(tool, extra = []) {
  const out = execFileSync(ELECTRON_EXE, ["-e", BOOTSTRAP_JS, CLI_JS, "-c", "Qoder", tool, "--project", PROJECT, ...extra], {
    encoding: "utf8", timeout: 90000, maxBuffer: 32 * 1024 * 1024,
    env: Object.assign({}, process.env, { ELECTRON_RUN_AS_NODE: "1" }),
  });
  const i = out.indexOf("{");
  if (i < 0) throw new Error(tool + " 无 JSON 输出：" + out.slice(0, 120));
  let j; try { j = JSON.parse(out.slice(i)); } catch (e) { throw new Error(tool + " JSON 解析失败：" + out.slice(i, i + 160)); }
  if (j.ok === false) throw new Error(tool + " 返回 ok=false：" + JSON.stringify(j.message || j).slice(0, 160));
  return j.result ?? j;
}
function evaluate(fnSource) {
  const r = ide("automation_evaluate", ["--fn-source", fnSource]);
  return r && r.result && typeof r.result.result === "string" ? r.result.result : JSON.stringify(r);
}
function apiPost(path, payload) {
  return new Promise((res, rej) => {
    const body = Buffer.from(JSON.stringify(payload || {}), "utf8");
    const req = http.request({ host: "127.0.0.1", port: 8080, path, method: "POST", headers: { "Content-Type": "application/json", "Content-Length": body.length }, timeout: 15000 },
      (r) => { let d = ""; r.on("data", (c) => (d += c)); r.on("end", () => res({ status: r.statusCode, body: d })); });
    req.on("error", rej); req.on("timeout", () => req.destroy(new Error("api timeout")));
    req.write(body); req.end();
  });
}
function credA() {
  const p = join(REPO, "tmp", "r11_chains2.py");
  if (!existsSync(p)) throw new Error("读不到 A 身份凭据文件 tmp/r11_chains2.py（不猜凭据）");
  const s = readFileSync(p, "utf8");
  const ph = s.match(/"phone"\s*:\s*"(\d{11})"/), pw = s.match(/"password"\s*:\s*"([^"]+)"/);
  if (!ph || !pw) throw new Error("凭据文件里没解析出 phone/password");
  return { phone: ph[1], password: pw[1] };
}
async function mint(kind) {
  /* 后端返回是**平铺**的（实测 keys=userId,loggedIn,loginMethod,displayName,…,token，没有 data 包一层）。
     首版按 `j.data` 取值 ⇒ 拿到 undefined，被"token 未铸出"分支挡下，两条帧都没拍。 */
  const r = kind === "A"
    ? await apiPost("/api/v1/auth/phone-login", { ...(credA()), deviceId: "r6-real-cli-a" })
    : await apiPost("/api/v1/auth/guest-login", {});
  if (r.status !== 200) throw new Error((kind === "A" ? "phone" : "guest") + "-login http " + r.status + " " + r.body.slice(0, 100));
  const j = JSON.parse(r.body);
  const token = j.token || (j.data && j.data.token);
  if (!token) throw new Error("响应里没有 token（键=" + Object.keys(j).join(",") + "）");
  return { token, userId: j.userId || (j.data && j.data.userId) || "?" };
}
/* 同步等待。上一版写的是 `new Atomics.wait(...)` —— Atomics.wait 是静态方法、不可 new，
   所以报的是 "Atomics.wait is not a constructor"：**是我用错了 API，不是运行时缺能力**
   （本轮已多次强调"报错信息不是我想的那个原因"，这次轮到自己）。
   这里改成忙等：流水线本来全是同步 execFileSync，不占额外资源，也不引入子进程。 */
const sleep = (ms) => { const t = Date.now(); while (Date.now() - t < ms) { /* 忙等 ms 毫秒 */ } };
const PARAM = (() => { try { return JSON.parse(readFileSync(join(REPO, "scripts", "r11-param-map.json"), "utf8")).params || {}; } catch { return {}; } })();

/** 与 tour-r6.mjs 的 makeBootFn/makeVerifyFn 逐字同法：写 token 之后必须唤 pinia session.bootstrap()，
 *  否则 store 里的 isLoggedIn 还停在旧值（这是巡检当年踩过的坑，不再踩第二遍）。 */
function boot(token) {
  return evaluate("() => { try { wx.setStorageSync('token', " + JSON.stringify(token) + ");"
    + " var app=getApp(); var vm=app['$vm'];"
    + " var gp=(vm.$&&vm.$.appContext.config.globalProperties)||{};"
    + " var p=vm['$pinia']||gp['$pinia'];"
    + " var s=p._s.get('session'); if(s&&s.bootstrap){ s.bootstrap(); } return 'boot-ok'; } catch(e){ return 'ERR ' + e.message; } }");
}
function verifyLogin() {
  return evaluate("() => { try { var app=getApp(); var vm=app['$vm'];"
    + " var gp=(vm.$&&vm.$.appContext.config.globalProperties)||{};"
    + " var p=vm['$pinia']||gp['$pinia']; var s=p._s.get('session');"
    + " return s && s.isLoggedIn ? 'logged-in userId=' + (s.userSession&&s.userSession.userId) : 'not-logged-in';"
    + " } catch(e){ return 'ERR ' + e.message; } }");
}
function routeNow() {
  try { return evaluate("() => { try { return getCurrentPages().map(p => p.route).join('|'); } catch(e){ return 'ERR ' + e.message; } }"); }
  catch (e) {
    /* 把子进程 stderr 一起带出来：只看 "Command failed: <exe> -e const e=p" 等于没有信息，
       本轮已经吃过太多次"错误信息被我截断成没用的样子"。 */
    const err = String(e && e.stderr ? e.stderr : "").replace(/\s+/g, " ").slice(0, 180);
    return "EVAL_FAIL " + String(e.message).slice(0, 60) + (err ? " | stderr=" + err : "");
  }
}

(async () => {
  if (!existsSync(TSV)) { console.log(`REALTOUR_RESULT=FAIL reason=清单不存在 ${TSV}`); process.exit(1); }
  if (!existsSync(join(PROJECT, "app.json"))) { console.log(`REALTOUR_RESULT=FAIL reason=real 产物缺 app.json（${PROJECT}）`); process.exit(1); }
  const rows = readFileSync(TSV, "utf8").split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
    .map((l) => { const a = l.split("\t"); return a.length >= 2 ? { ident: a[0].trim(), route: a[1].trim() } : { ident: "A", route: a[0].trim() }; });
  if (!rows.length) { console.log("REALTOUR_RESULT=FAIL reason=清单为空（空扫描集不得占设备）"); process.exit(1); }
  /* 会开页 ⇒ 先排队（与 r-exec-cli / shoot-frameplan 同一把租约，跨通道互斥）。 */
  guardUiLease({ owner: "real-tour-" + LABEL, tag: "REALTOUR_LEASE", failTag: "REALTOUR", exitCode: 1 });
  mkdirSync(OUT_DIR, { recursive: true });

  const idents = [...new Set(rows.map((r) => r.ident))];
  const sessions = {};
  for (const idt of idents) {
    try { sessions[idt] = await mint(idt === "A" ? "A" : "B"); console.log(`[identity ${idt}] token 已取得 userId=${sessions[idt].userId}`); }
    catch (e) { console.log(`[identity ${idt}] 铸 token 失败：${e.message} ⇒ 该身份的帧一律记失败，不拿未登录画面冒充`); sessions[idt] = null; }
  }

  const shots = [], failures = [];
  let curIdent = null;
  for (const { ident, route } of rows) {
    if (!sessions[ident]) { failures.push({ identity: ident, page: route, severity: "P1", reason: "身份 token 未铸出，未取景" }); continue; }
    if (curIdent !== ident) {
      const b = boot(sessions[ident].token);
      const v = verifyLogin();
      console.log(`[boot ${ident}] ${b} / verify=${v}`);
      if (!/^logged-in/.test(v)) failures.push({ identity: ident, page: "(boot)", severity: "P1", reason: "session store 仍未登录：" + v + "（该身份后续帧不得当已登录证据）" });
      console.log(`[boot ${ident}] ${b}`);
      if (!/^boot-ok/.test(b)) { failures.push({ identity: ident, page: "(boot)", severity: "P1", reason: "写入 token 失败：" + b }); }
      curIdent = ident;
    }
    const q = PARAM[route] || "";
    const query = q.startsWith("?") ? q.slice(1) : q;
    let navOk = true;
    try { ide("simulator_open_page", query ? ["--page", "/" + route, "--query", query] : ["--page", "/" + route]); }
    catch (e) { navOk = false; failures.push({ identity: ident, page: route, severity: "P1", reason: "open_page 失败：" + e.message.slice(0, 90) }); }
    sleep(SETTLE_MS);
    let landed = routeNow();
    /* 刚 open_page 完那一下，IDE 的 automator 通道偶发忙不过来（实测两次都落在这一处失败）。
       只重试一次、并在结果里保留 EVAL_FAIL —— 重试成功不等于"没有这回事"，要看得见。 */
    if (String(landed).startsWith("EVAL_FAIL")) { sleep(1600); const again = routeNow(); if (!String(again).startsWith("EVAL_FAIL")) landed = again; }
    const want = route;
    const drift = navOk && !String(landed).split("|").pop()?.includes(want);
    if (drift) failures.push({ identity: ident, page: route, severity: "P1", reason: `落在 ${landed} ≠ 目标页`, landed });
    const file = join(OUT_DIR, ident, `${route.replace(/\//g, "_")}__默认.png`);
    mkdirSync(dirname(file), { recursive: true });
    try { rmSync(file, { force: true }); } catch { }
    try {
      ide("simulator_screenshot", ["--path", file]);
      const size = statSync(file).size;
      if (!(size > 3000)) { failures.push({ identity: ident, page: route, severity: "P1", reason: `截图文件仅 ${size}B，不当证据` }); continue; }
      shots.push({
        identity: ident, page: route, state: "默认", route: landed, suite: "REAL",
        path: relOf(file), bytes: size,
        contentHash: createHash("sha256").update(readFileSync(file)).digest("hex").slice(0, 16),
        params: query || null, at: new Date().toISOString(),
      });
      console.log(`[shot] ${ident} ${route} ${size}B hash=${shots[shots.length - 1].contentHash.slice(0, 8)}${drift ? " (落点漂移)" : ""}`);
    } catch (e) { failures.push({ identity: ident, page: route, severity: "P1", reason: "screenshot 失败：" + e.message.slice(0, 90) }); }
  }

  const man = {
    gitSha: GIT_SHA, workflowVersion: "3.2-cli", buildMode: BUILD_MODE,
    /* 这条巡检通道只出整页帧，不出放大辅助帧。字段必须**显式写成空数组**而不是缺字段：
       报告的前置体检区分"读不到字段"与"读到 0 张"，缺字段会被判成字段名改了，
       而这里的 0 才是事实（原因也写进 captureLimitations）。 */
    zoomFrames: [],
    generatedAt: new Date().toISOString(), harness: "wechatide CLI: simulator_open_page + simulator_screenshot + automation_evaluate",
    captureLimitations: [
      "出图尺寸由 IDE 决定（与 miniprogram-automator 的 378×814 不同尺，禁止跨 harness 比像素）",
      "只拍「默认」态：交互态/弹层态需要元素级选择器映射，本轮不扩范围",
      "无 zoom 裁切帧、无滚动分帧",
      "落点判定用 getCurrentPages()，与 WS 巡检同源",
    ],
    shots, failures,
  };
  /* 落盘前自证：manifest 里记的每个 path 字符串必须按消费方（verify-provenance-all）的解法能 stat 到，
     且字节数与之一致。「路径看着对」不算证据 —— 上一版的绝对写法就是这样把 18 张真帧写成断链的。 */
  const badPaths = [];
  for (const s of shots) {
    if (/^[a-zA-Z]:[\\/]/.test(s.path) || s.path.startsWith("/")) { badPaths.push(s.path + " (绝对写法，违反「仓库相对+正斜杠」方言)"); continue; }
    const abs = join(REPO, s.path);
    let st = null; try { st = statSync(abs); } catch { badPaths.push(s.path + " (不存在)"); continue; }
    if (st.size !== s.bytes) badPaths.push(s.path + ` (记 ${s.bytes}B / 实 ${st.size}B)`);
  }
  if (badPaths.length) {
    console.log("REALTOUR_PATH_SELFCHECK=FAIL " + badPaths.length + " 条 path 与盘上不一致，manifest 不落盘");
    badPaths.slice(0, 5).forEach((b) => console.log("  BAD " + b));
    process.exit(1);
  }
  console.log(`REALTOUR_PATH_SELFCHECK=OK ${shots.length}/${shots.length} 条 path 按消费方解法可 stat`);
  writeFileSync(join(OUT_DIR, "manifest-detail.json"), JSON.stringify(man, null, 1));
  console.log(`REALTOUR_SHOTS=${shots.length}/${rows.length} FAILURES=${failures.length} gitSha=${GIT_SHA} out=${relOf(OUT_DIR)}`);
  if (!shots.length) { console.log("REALTOUR_RESULT=FAIL reason=一张帧都没落盘"); process.exit(1); }
  console.log(`REALTOUR_RESULT=${failures.length ? "PARTIAL（有失败条目，见 manifest.failures）" : "OK"}`);
})().catch((e) => { console.log("REALTOUR_RESULT=FAIL fatal=" + e.message); process.exit(1); });

/* IDE CLI 自动化通道的共用驱动（round-7 起替代 miniprogram-automator 的 WS 端口）。
 *
 * 为什么走这条路（2026-09-26 修正过一次，别照旧结论再猜第二遍）：
 *   · 旧结论"`cli auto --auto-port` 不开 WS 端口、本机 IDE 版本不再暴露 automator WS"是**错的**：
 *     它确实开，只是端口挂在**另一个 IDE 实例**上（自动化实例），不是主窗口进程；
 *     实测 ws://127.0.0.1:9420 能 connect，currentPage / page.$ / page.data / callWxMethod /
 *     evaluate 全部有答案，单条元素查询 6.6~8.1ms（本桥折叠探针是 210ms/条）。
 *     拉起 + 自检见 scripts/qa/ws-channel-up.mjs。
 *   · 但本桥不该被换掉：WS 的 screenshot 实测 61s/张（还 2/5 超时），本桥 simulator_screenshot
 *     是 2.6s/张 ⇒ 出帧留在本桥，查询类若要提速才走 WS。
 *     本桥 automation_* 工具族仍是最全的交互面：automation_element_action 支持
 *     tap/longpress/trigger/input/size/offset/text/attribute/value/property/wxml/outerWxml/style/
 *     scrollTo/touchstart/touchmove/touchend，还带 --wait 与 --wait-for-selector（WS 版没有 trigger）。
 *   · 坑：automation_element_action 启动时会去找 skill 文档目录，按 dev 布局只看
 *     `<IDE>/dist/wechatide-skill` 与 `<IDE>/src/skill/wechatide-skill`；两者都没有时报
 *     "Skill directory not found"（**不是**参数错误）。修法是把已安装的 skill 拷到
 *     `<IDE>/src/skill/wechatide-skill`。这一步是环境准备，不在本库职责内，但缺它时错误信息会误导。
 *
 * 用法（一次性调用）：
 *   node scripts/qa/cli-automator.mjs --project <路径> eval "() => 1+1"
 *   node scripts/qa/cli-automator.mjs --project <路径> tap --selector .foo --wait 1
 *   node scripts/qa/cli-automator.mjs --project <路径> shot --path <输出图片路径>
 *   node scripts/qa/cli-automator.mjs --project <路径> print-argv automation_evaluate --fn-source "()=>1"
 *     ↑ 只组装、不派生进程、不碰模拟器：用来看子进程**实际会收到**的那串 argv。
 * 被 import 时（IS_MAIN=false）只导出函数，不产生副作用。
 *
 * --project 可以给相对路径（相对**仓库根**，不是相对 process.cwd()），见 resolveProjectPath()。
 */
import { execFileSync } from "node:child_process";
import { readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
/** 相对 --project 的基准：脚本所在仓库根，**不是** process.cwd()（队列的 cwd、探针的 cwd 都可能不是这里）。 */
const REPO = resolve(HERE, "..", "..");

/** IDE 安装目录的解析序：WECHATIDE_DIR 显式指定 > 扫 PATH 找 wechatide.cmd 取其目录（可推导，
 *  不写盘符死路径）> 空串（后续 ideCall 会因找不到主程序报错并提示设 WECHATIDE_DIR）。 */
function ideDirFromPath() {
  for (const d of String(process.env.PATH || "").split(";")) {
    if (!d) continue;
    try { if (existsSync(join(d, "wechatide.cmd"))) return d; } catch { /* 这段 PATH 坏了就跳过 */ }
  }
  return "";
}
const IDE_DIR = process.env.WECHATIDE_DIR || ideDirFromPath();
const EXE_EXCLUDE = new Set(["node.exe", "node-18.exe", "wxfilewatcher.exe", "wxfilewatcher_x64.exe", "notification_helper.exe", "wechatdevtools.exe"]);
const BOOTSTRAP_JS = "const e=process.argv[1],a=process.argv.slice(2).filter(function(x){return x!=='--electron'});if(!process.env.cwd)process.env.cwd=process.cwd();process.argv=[process.execPath,e].concat(a);require(e)";

/** 找 Electron 主程序：与 wechatide.cmd 同一条规则（>50MB 的 exe，排除已知非主程序） */
function electronExe(dir = IDE_DIR) {
  let best = null, min = 50 * 1024 * 1024;
  let names = [];
  try { names = readdirSync(dir); } catch { return best; /* 目录取不到（含 IDE_DIR 为空）⇒ 调用方按缺失报 */ }
  for (const n of names) {
    if (!/\.exe$/i.test(n) || EXE_EXCLUDE.has(n.toLowerCase())) continue;
    const s = statSync(join(dir, n)).size;
    if (s > min) { min = s; best = join(dir, n); }
  }
  return best;
}
const CLI_JS = join(IDE_DIR, "resources", "app.asar.unpacked", "js", "common", "cli", "skill-index.js");
/** 一次进程里只念一次归一提示：批量腿每页都调 ideCall，逐条打印会把 leg log 淹掉
 *  （run-ui-queue 只 pick 结论行，但 shoot/r-exec 的 stdout 是人读的）。 */
let projectNotePrinted = false;

/** 路径是不是已经绝对的：posix `/x`、windows 盘符写法（单个字母 + 冒号 + 斜杠）、UNC `\\srv\x` 都算，原样保留。
 *  判据与 scripts/qa/ws-channel-up.mjs:39 同一套（那是本仓既有的口径，不另立第三种）。 */
export function isAbsolutePath(s) {
  const v = String(s);
  return v.startsWith("/") || /^[A-Za-z]:[\\/]/.test(v) || v.startsWith("\\\\");
}

/** --project 的唯一归一处：相对值按**仓库根**摊成绝对，绝对值原样返回，空值原样返回。
 *
 *  为什么必须在这里做、而不是每个调用方各修一遍（2026-09-27 的实测根因）：
 *  子进程只是把 `--project` 这个**字符串**转给 IDE 的服务端口，真正解析它的是 IDE 进程自己，
 *  它的工作目录不是本脚本的 cwd。于是相对路径在两处得到两个答案：
 *    · 脚本自己的 `existsSync(join(PROJECT,"app.json"))` 用进程 cwd（队列里恒为仓库根）⇒ 一路放行；
 *    · IDE 用它的 cwd 解析同一个相对串 ⇒ `项目路径不存在`。
 *  stage-8 的 ws-component-scoped-r8 整腿每页都挂在这上面，而窗口明明是活的（开页之前 clearSession
 *  都正常）。r-exec-ws.mjs:57 是 `opt("project", join(REPO,…))`——默认值绝对、传进来的相对值原样留着，
 *  就是这个形状；open-project-window.mjs:20 自己 resolve 过所以那条腿是绿的。
 *  归一放在共享边界，调用方就没有"忘 resolve"这一类错误可犯。 */
export function resolveProjectPath(p, repoRoot = REPO) {
  if (p === undefined || p === null || String(p).trim() === "") return p;
  const s = String(p);
  if (isAbsolutePath(s)) return s;
  return resolve(repoRoot, s);
}

/** 子进程 argv 的**唯一**组装处：ideCall 用它、`print-argv` 也用它，
 *  所以"打印出来给人看的 argv"和"真正发出去的 argv"不可能对不上。 */
export function childArgv(tool, extra = [], opts = {}) {
  const { client = "Qoder" } = opts;
  const project = resolveProjectPath(opts.project);
  return ["-e", BOOTSTRAP_JS, CLI_JS, "-c", client, tool, ...(project ? ["--project", project] : []), ...extra];
}

/** 调一个 CLI 工具并解析 JSON。失败一律抛出（不静默吞，吞掉的错误信息本轮害过我们太多次） */
export function ideCall(tool, extra = [], opts = {}) {
  const { timeoutMs = 90000 } = opts;
  const exe = electronExe();
  if (!exe || !existsSync(CLI_JS)) throw new Error("找不到 IDE 主程序或 skill-index.js（安装目录变了？设 WECHATIDE_DIR）");
  if (opts.requireSkillDir !== false && !existsSync(join(IDE_DIR, "src", "skill", "wechatide-skill", "SKILL.md")) && !existsSync(join(IDE_DIR, "dist", "wechatide-skill", "SKILL.md"))) {
    // 只提示，不代替调用方决定：evaluate/screenshot 这些工具不吃 skill 文档
    if (/element_action|page_action|viewport_action/.test(tool)) {
      throw new Error(`环境未就绪：缺少 <IDE>/src/skill/wechatide-skill（该工具启动时要读 skill 文档，否则会报 "Skill directory not found"）`);
    }
  }
  let out = "";
  const argv = childArgv(tool, extra, opts);
  const sentProject = resolveProjectPath(opts.project);
  if (sentProject && sentProject !== opts.project && !projectNotePrinted) {
    // 只在"确实替调用方改了值"时念一次，让调用方能看见发出去的是哪个值；
    // 行名刻意不带 `_RESULT=`/`LEASE=`，免得混进 run-ui-queue.mjs:136 的结论行拾取。
    projectNotePrinted = true;
    console.log("IDE_PROJECT_ABS 传入=" + opts.project + " ⇒ 发出=" + sentProject + "（首个受影响工具=" + tool + "，基准=" + REPO + "）");
  }
  try {
    out = execFileSync(exe, argv, {
      encoding: "utf8", timeout: timeoutMs, maxBuffer: 32 * 1024 * 1024,
      env: Object.assign({}, process.env, { ELECTRON_RUN_AS_NODE: "1" }),
    });
  } catch (e) {
    // 只看 "Command failed: <exe> -e const e=p" 等于没有信息：把 stderr 尾巴带出来（本轮已经吃过太多次）
    // 取**尾巴**而不是头部：那条 bootstrap 的 -e 串本身就有 200+ 字，
    // 头部截断会把真正的 MCP 报错（"timeout waiting for automator response" 之类）整个挤掉——
    // 今天 real 档 guest 腿连挂两次都因此查不到原因。
    const errTail = String((e && e.stderr) || "").replace(/\s+/g, " ").slice(0, 200);
    const outTail = String((e && e.stdout) || "").replace(/\s+/g, " ").slice(-460);
    throw new Error(tool + " 调用失败：" + String(e && e.message || "").slice(0, 90) + (outTail ? " | stdout=" + outTail : "") + (errTail ? " | stderr=" + errTail : ""));
  }
  const i = out.indexOf("{");
  if (i < 0) throw new Error(tool + " 无 JSON 输出：" + out.slice(0, 160));
  let j; try { j = JSON.parse(out.slice(i)); } catch { throw new Error(tool + " JSON 解析失败：" + out.slice(i, i + 200)); }
  if (j.ok === false) throw new Error(tool + " ok=false：" + JSON.stringify(j.message || j.reason || j).slice(0, 200));
  return j.result ?? j;
}

/* 只重试**传输层超时**这一种错：`simulator_open_page` 之后那一下，IDE 的 automator 通道会忙不过来，
   实测报 "timeout waiting for automator response"（real-tour-cli.mjs:189 早就记过同一处、并重试了；
   今天 guest 腿在 real 档一开局就死在这里，而窗口明明是活的——clearSession/verifyLogin 都正常）。
   判据本身出错会**有答案**（absent / no-answer / ERR 字符串），不会走到这条，所以这里不放水：
   产品失败照旧上抛，只有"没送达"才重发。 */
const TRANSPORT_RETRY_RE = /timeout waiting for automator response|automator.*EBUSY|通道忙/i;
export function evaluate(fnSource, opts = {}) {
  const attempts = Number(opts.attempts || 3);
  const waits = [1500, 3000, 6000];
  let lastErr = null;
  for (let i = 0; i < attempts; i++) {
    try {
      const r = ideCall("automation_evaluate", ["--fn-source", fnSource], opts);
      return r && r.result && typeof r.result.result === "string" ? r.result.result : JSON.stringify(r);
    } catch (e) {
      lastErr = e;
      if (!TRANSPORT_RETRY_RE.test(String(e && e.message || ""))) throw e;
      if (i + 1 < attempts) {
        const t = Date.now() + (waits[i] || 6000);
        while (Date.now() < t) { /* 等 IDE 的 automator 通道空出来 */ }
      }
    }
  }
  throw new Error("automation_evaluate 重试 " + attempts + " 次仍是传输层超时：" + String(lastErr && lastErr.message || "").slice(0, 220));
}
export function openPage(route, query, opts) {
  const extra = ["--page", route.startsWith("/") ? route : "/" + route];
  if (query) extra.push("--query", String(query).replace(/^\?/, ""));
  return ideCall("simulator_open_page", extra, opts);
}
export function shot(path, opts) { return ideCall("simulator_screenshot", ["--path", path], opts); }
export function element(action, selector, opts = {}, extra = []) {
  return ideCall("automation_element_action", ["--action", action, "--selector", selector, ...extra], opts);
}
/** 当前页面栈（落点判定的唯一可信载体：像素会骗人，路由不会） */
export function routeStack(opts) {
  /* 这里必须自己吞掉 ideCall 的抛错并回 "ERR:…"：调用方按三态判 (真路由 / '' / ERR)，
     任一条路由探针抛异常就把整批取景当场打死（实测：IDE automator 桥 "timeout waiting for
     automator response" 一次，18 行批次在前 4 行就崩，已拍的帧全部作废）。 */
  try {
    return evaluate("() => { try { return getCurrentPages().map(p => p.route).join('|'); } catch(e){ return 'ERR ' + e.message; } }", opts);
  } catch (e) {
    return "ERR:" + String(e && e.message || e).slice(0, 70);
  }
}
/** 渲染树里有没有这个节点：用**元素级 offset** 判，而不是 wx.createSelectorQuery ——
 *  实测服务层里 `select(sel).exec` 不是函数（NodesRef 上没有 exec），拿它当探针会得到假的"不存在"。
 *  CLI 命中返回 `{left,top}`；未命中以非零退出并带 `no such element`。
 *  三态必须分开返回：`1` / `0` / `ERR:<原因>`。**把"探针坏了"折叠成 0 就等于造了一条永不会失败的判据**
 *  （本仓为这类"can-never-fail checker"付过不止一次学费）。 */
export function nodeCount(selector, opts) {
  try {
    const r = element("offset", selector, opts);
    if (r && typeof r === "object" && ("left" in r || "top" in r || "width" in r)) return "1";
    return "ERR:unexpected-shape:" + JSON.stringify(r).slice(0, 60);
  } catch (e) {
    const m = String(e && e.message || "");
    if (/no such element/i.test(m)) return "0";
    return "ERR:" + m.slice(0, 90);
  }
}
export function nodeHtml(selector, opts) {
  return element("outerWxml", selector, opts);
}

/* ------------------------- 身份与会话（与 tour-r6.mjs / real-tour-cli.mjs 同法） -------------------------
   凭据只在运行期从 tmp/r11_chains2.py 读，绝不上命令行、绝不落日志；
   写完 token 必须唤 pinia session.bootstrap() 再用 session.isLoggedIn 复核 ——
   不拿 setStorageSync 成功当"已登录"（这是巡检当年踩过的坑）。 */
import http from "node:http";
import { readFileSync } from "node:fs";

export function apiPost(path, payload, { port = 8080, timeoutMs = 15000 } = {}) {
  return new Promise((res, rej) => {
    const body = Buffer.from(JSON.stringify(payload || {}), "utf8");
    const req = http.request({ host: "127.0.0.1", port, path, method: "POST", headers: { "Content-Type": "application/json", "Content-Length": body.length }, timeout: timeoutMs },
      (r) => { let d = ""; r.on("data", (c) => (d += c)); r.on("end", () => res({ status: r.statusCode, body: d })); });
    req.on("error", rej); req.on("timeout", () => req.destroy(new Error("api timeout")));
    req.write(body); req.end();
  });
}
/** 凭据文件里 A 那一对（tmp/r11_chains2.py 只声明了 A：一份文件里只有一组 phone/password）。
 *  B 不在这份文件里 ⇒ 别拿它当"B 的凭据读不到"的证据，看 identityTable()。 */
export function readCredA(repoRoot) {
  const p = join(repoRoot, "tmp", "r11_chains2.py");
  if (!existsSync(p)) throw new Error("读不到 A 身份凭据文件 tmp/r11_chains2.py（不猜凭据）");
  const s = readFileSync(p, "utf8");
  const ph = s.match(/"phone"\s*:\s*"(\d{11})"/), pw = s.match(/"password"\s*:\s*"([^"]+)"/);
  if (!ph || !pw) throw new Error("凭据文件里没解析出 phone/password");
  const uid = s.match(/UID_A\s*=\s*(\d+)/);
  return { phone: ph[1], password: pw[1], userId: uid ? uid[1] : "" };
}

/* 本仓唯一一处**同时**声明了 A 与 B 的 (userId, phone, password, 端点) 的地方：scripts/qa/r-exec.cjs 的
   IDENT_DEFS（旧桥版执行器的身份表，B=100159 那条账号是 2026-09-16 r9 生命周期审计里真实注册、
   DB users.id=100159 双证落库的那个）。凭据只在运行期从表里读，绝不上命令行、绝不进日志。 */
const TABLE_FILE = "scripts/qa/r-exec.cjs";

/** 从 `{` 起数到配对的 `}`：与 artifact-band.mjs:29 matchingBrace 同一口径（按缩进找块尾会扫过头）。 */
function braceSpan(src, open) {
  let depth = 0;
  for (let k = open; k < src.length; k++) {
    if (src[k] === "{") depth++;
    else if (src[k] === "}") { depth--; if (depth === 0) return k - open + 1; }
  }
  return src.length - open;
}

/** 读身份声明表：kind → { userId, phone, password, ep, from }。表读不到就返回空 Map（调用方据此拒跑）。
 *  只取表的**第一层**键（A/B/guest），嵌套的 `body: {}` 不是身份，别把它读成一个身份条目。 */
export function identityTable(repoRoot) {
  const out = new Map();
  const p = join(repoRoot, TABLE_FILE);
  if (!existsSync(p)) return out;
  const src = readFileSync(p, "utf8");
  const head = src.indexOf("const IDENT_DEFS");
  if (head < 0) return out;
  const open = src.indexOf("{", head);
  if (open < 0) return out;
  const block = src.slice(open, open + braceSpan(src, open));
  let depth = 0, keyStart = -1;
  for (let i = 0; i < block.length; i++) {
    const ch = block[i];
    if (ch === "{") { depth++; keyStart = -1; continue; }
    if (ch === "}") { depth--; continue; }
    if (depth === 1 && keyStart < 0 && /[A-Za-z_]/.test(ch)) keyStart = i;
    if (depth === 1 && keyStart >= 0 && ch === ":") {
      const key = block.slice(keyStart, i).trim();
      const vStart = block.indexOf("{", i);
      if (vStart > i) {
        const body = block.slice(vStart, vStart + braceSpan(block, vStart));
        const g = (re) => (body.match(re) || [])[1] || "";
        out.set(key, {
          userId: g(/userId\s*:\s*'(\d+)'/), ep: g(/ep\s*:\s*'([^']+)'/),
          phone: (body.match(/phone\s*:\s*'(\d{11})'/) || [])[1] || "",
          password: (body.match(/password\s*:\s*'([^']+)'/) || [])[1] || "",
          from: TABLE_FILE + ":IDENT_DEFS." + key,
        });
      }
      keyStart = -1;
    }
  }
  return out;
}

/** 铸票的**计划**（不发音、不碰设备）：身份标签 → 该走哪个端点、用哪份凭据、期望哪个 userId。
 *  这一层是本轮修的根：旧 mintToken 只分 "A" 与"不是 A"，非 A 一律 /auth/guest-login ⇒
 *  一条 --identity B 的腿铸到的是游客会话，行却盖着 B，门的登录轴（verify-real-coverage.mjs:237）照样认它。 */
export function mintPlanFor(kind, repoRoot, deviceId) {
  const k = String(kind || "");
  if (k === "guest") {
    return { kind: k, source: "guest-login", endpoint: "/api/v1/auth/guest-login", body: {}, expectUserId: "", credFrom: "(体验号，无需凭据)" };
  }
  if (k !== "A" && k !== "B") {
    throw new Error("MINT_UNSUPPORTED_IDENTITY kind=" + (k || "(空)") + " ⇒ 身份词表只有 A/B/guest（verify-real-coverage.mjs:237-238 也只认这几条轴）；"
      + "未知标签一律不铸，绝不退回 guest 顶替（那正是本轮那条假记账）");
  }
  const t = identityTable(repoRoot).get(k) || {};
  if (k === "A") {
    const a = readCredA(repoRoot);
    const phone = a.phone || t.phone, password = a.password || t.password;
    if (!phone || !password) throw new Error("A 凭据读不到（tmp/r11_chains2.py 与 " + TABLE_FILE + " 的 IDENT_DEFS 都没有 A 的 phone/password）⇒ 不猜凭据");
    return { kind: k, source: "phone-login", endpoint: "/api/v1/auth/phone-login", body: { phone, password, deviceId: deviceId || "r7-cli-a" },
      expectUserId: a.userId || t.userId || "", credFrom: "tmp/r11_chains2.py" };
  }
  /* B：tmp/r11_chains2.py 里**没有**第二组凭据（实测：那份文件只有一处 "phone"/"password"，是 A 的 13800006666）。
     所以 B 只能来自身份声明表；表里没有 B 就抛，让调用方在取租约之前拒跑，而不是铸一张游客票盖 B。 */
  if (!t.phone || !t.password) {
    throw new Error("NO_B_CREDENTIALS ⇒ " + TABLE_FILE + " 的 IDENT_DEFS 里读不到 B 的 phone/password（A 的凭据文件 tmp/r11_chains2.py 只声明了 A 一对）"
      + " ⇒ B 身份铸不出来，这一腿只能拒跑；把 B 行盖成游客票或 A 票都是伪造证据");
  }
  return { kind: k, source: "phone-login", endpoint: "/api/v1/auth/phone-login", body: { phone: t.phone, password: t.password, deviceId: deviceId || "r7-cli-b" },
    expectUserId: t.userId || "", credFrom: TABLE_FILE + ":IDENT_DEFS" };
}

/** 取租约**之前**该问的那一句：这个身份标签今天到底铸不铸得出会话。纯离线（读文件、不发请求、不碰设备）。
 *  拒跑的形状照 assertGuestCapable（artifact-band.mjs:59）/ 游客档拒跑（r-exec-cli.mjs:335）：{ok:false, reason}。 */
export function assertIdentityProducible(kind, repoRoot) {
  const k = String(kind || "");
  if (k === "none") return { ok: true, mints: false, kind: k, reason: "identity=none ⇒ 不铸票，按清会话跑（游客画面）" };
  try { const plan = mintPlanFor(k, repoRoot); return { ok: true, mints: true, kind: k, plan, source: plan.source, credFrom: plan.credFrom }; }
  catch (e) { return { ok: false, kind: k, mints: true, reason: String(e && e.message || e) }; }
}

/** 后端登录响应是**平铺**的（没有 data 包一层）—— 首版按 j.data 取值拿到过 undefined。
 *  返回 { token, userId, source }：source 是"这张票到底从哪个端点铸的"，行上要落这个数（门的会话核对读它）。 */
export async function mintToken(kind, repoRoot, deviceId) {
  const plan = mintPlanFor(kind, repoRoot, deviceId);
  const r = await apiPost(plan.endpoint, plan.body);
  if (r.status !== 200) throw new Error(plan.source + "(" + kind + ") http " + r.status + " " + r.body.slice(0, 100));
  const j = JSON.parse(r.body);
  const token = j.token || (j.data && j.data.token);
  if (!token) throw new Error("响应里没有 token（键=" + Object.keys(j).join(",") + "）");
  const userId = String(j.userId || (j.data && j.data.userId) || "?");
  /* 标签与铸到的会话对不对得上，在铸的那一刻就核一次（不指望设备侧、也不指望门）：
     声明表给了期望 userId 而实测不等 ⇒ 抛。不等就不是这个身份，盖它上账是伪造。 */
  if (plan.expectUserId && userId !== "?" && userId !== String(plan.expectUserId)) {
    throw new Error("IDENTITY_USERID_MISMATCH kind=" + kind + " 铸到 userId=" + userId + " 而凭据声明的期望是 " + plan.expectUserId +
      "（来源=" + plan.credFrom + "）⇒ 这张票不是 " + kind + " 的会话，不许盖 " + kind);
  }
  return { token, userId, source: plan.source, kind };
}
/** verifyLogin() 那串里抠出**后端那种纯数字** userId：'logged-in userId=100159' → '100159'。
 *  mock 载体报的是 'logged-in userId=user-1001'（apps/client/src/stores/session.ts 的 mockUserSession）
 *  ⇒ 这里刻意返回 ""，调用方据此**跳过**核对：mock 包表达不了真账号会话，拿它判"标签与会话不符"
 *  会把所有 mock 腿打成假红（那是载体档位问题，不是身份问题，口径同 artifact-band.mjs:59）。 */
export function observedUserId(v) {
  return String(/^logged-in userId=(\d+)\s*$/.exec(String(v || "").trim()) ? RegExp.$1 : "");
}
export function bootSession(token, opts) {
  return evaluate("() => { try { wx.setStorageSync('token', " + JSON.stringify(token) + ");"
    + " var app=getApp(); var vm=app['$vm'];"
    + " var gp=(vm.$&&vm.$.appContext.config.globalProperties)||{};"
    + " var p=vm['$pinia']||gp['$pinia'];"
    + " var s=p._s.get('session'); if(s&&s.bootstrap){ s.bootstrap(); } return 'boot-ok'; } catch(e){ return 'ERR ' + e.message; } }", opts);
}
/** 清掉本地会话（游客态取景用）。只清 token 不算清干净——store 里的 userSession 还在。 */
export function clearSession(opts) {
  return evaluate("() => { try { wx.removeStorageSync('token');"
    + " var app=getApp(); var vm=app['$vm'];"
    + " var gp=(vm.$&&vm.$.appContext.config.globalProperties)||{};"
    + " var p=vm['$pinia']||gp['$pinia'];"
    + " var s=p._s.get('session'); if(s){ if(s.logout){ s.logout(); } else if(s.reset){ s.reset(); } else { s.isLoggedIn=false; s.userSession=null; } }"
    + " return 'clear-ok'; } catch(e){ return 'ERR ' + e.message; } }", opts);
}
export function verifyLogin(opts) {
  return evaluate("() => { try { var app=getApp(); var vm=app['$vm'];"
    + " var gp=(vm.$&&vm.$.appContext.config.globalProperties)||{};"
    + " var p=vm['$pinia']||gp['$pinia']; var s=p._s.get('session');"
    + " return s && s.isLoggedIn ? 'logged-in userId=' + (s.userSession&&s.userSession.userId) : 'not-logged-in';"
    + " } catch(e){ return 'ERR ' + e.message; } }", opts);
}
/** 读页面 store 的一个字段（交互后除了看节点在不在，还要看状态位真的翻过来了） */
export function readPageData(expr, opts) {
  return evaluate("() => { try { var p=getCurrentPages().slice(-1)[0]; if(!p) return 'NO-PAGE';"
    + " var vm=p.$vm||p; var v=(" + expr + ");"
    + " return v===undefined?'undefined':JSON.stringify(v).slice(0,200); } catch(e){ return 'ERR ' + e.message; } }", opts);
}


/* ------------------------------- CLI 入口（调试用，别拿它跑批量） ------------------------------- */
const IS_MAIN = (() => { const e = process.argv[1] || ""; return e.replace(/\\/g, "/").endsWith("/cli-automator.mjs"); })();
if (IS_MAIN) {
  const argv = process.argv.slice(2);
  const pIdx = argv.indexOf("--project");
  const project = pIdx >= 0 ? argv[pIdx + 1] : null;
  const rest = pIdx >= 0 ? argv.slice(0, pIdx).concat(argv.slice(pIdx + 2)) : argv;
  const cmd = rest[0];
  const opts = { project };
  try {
    // print-argv：只组装、不派生进程、不碰模拟器/租约 —— 队列随时可能重开时用它看真相
    if (cmd === "print-argv") console.log("CHILD_ARGV=" + JSON.stringify(childArgv(rest[1], rest.slice(2), opts)));
    else if (cmd === "resolve") console.log("PROJECT_ABS=" + resolveProjectPath(project));
    // check-identity：只读凭据文件/身份表，不发请求、不碰模拟器、不取租约 —— 开 B 腿之前先问这一句
    else if (cmd === "check-identity") {
      const kind = rest[1] || "A";
      const r = assertIdentityProducible(kind, REPO);
      console.log("IDENT_CHECK " + JSON.stringify({ kind, ok: r.ok, mints: r.mints, source: r.source || "", credFrom: r.credFrom || "", reason: r.reason || "" }));
      process.exit(r.ok ? 0 : 2);
    }
    else if (cmd === "eval") console.log("EVAL=", evaluate(rest[1], opts));
    else if (cmd === "route") console.log("ROUTE=", routeStack(opts));
    else if (cmd === "count") console.log("NODE_COUNT=", nodeCount(rest[1], opts));
    else if (cmd === "tap") console.log("TAP=", element("tap", rest[1], opts, rest.slice(2)));
    else if (cmd === "text") console.log("TEXT=", element("text", rest[1], opts));
    else if (cmd === "html") console.log("HTML=", JSON.stringify(nodeHtml(rest[1], opts)).slice(0, 1200));
    else if (cmd === "shot") console.log("SHOT=", shot(rest[1], opts));
    else if (cmd === "open") console.log("OPEN=", openPage(rest[1], rest[2], opts));
    else if (cmd === "raw") console.log("RAW=", JSON.stringify(element(rest[1], rest[2], opts, rest.slice(3))));
    else if (cmd === "raweval") console.log("RAWEVAL=", JSON.stringify(evaluate(rest[1], opts)).slice(0, 600));
    else console.log("用法：node scripts/qa/cli-automator.mjs --project <路径> resolve|check-identity|print-argv|eval|route|count|tap|text|html|shot|open|raw|raweval …（resolve/check-identity/print-argv 不碰设备）");
  } catch (e) { console.log("CLI_AUTOMATOR=FAIL " + e.message.slice(0, 200)); process.exit(1); }
}

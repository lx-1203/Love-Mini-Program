/* 把 miniprogram-automator 的 WS 采集通道拉起来 + 自检（round-7 补 ①）。
 *
 * 本轮实测到的三条事实，写在这里免得下次又猜：
 *   1. WS 监听端口不在主 IDE 进程上，而在"以自动化模式打开的那个 IDE 实例"上；
 *      今天 9420 的持有者是 PID 36136，主窗口是 PID 38636（它只持有 9430 的 HTTP 桥）。
 *   2. connect() 出来的会话**绝不能调 close()**：out/MiniProgram.js 里 close() 发的是
 *      App.exit + Tool.close，那会把那个自动化实例整个关掉，9420 随之从监听表里消失
 *      （今天就亲手把它关掉过一次，之后 connect 直接报
 *      "check if target project window is opened with automation enabled"）。
 *      ⚠ 更正（2026-09-28 FU-8b 读 SDK 源码复核）：本注释此前写的"这个版本里 mini.disconnect 是
 *      undefined"不成立 —— miniprogram-automator@0.12.1 out/MiniProgram.js 里
 *      `disconnect(){this.connection.dispose()}`、out/Transport.js `close(){this.ws.close()}`，
 *      即 disconnect 只关**本进程这一侧**的 ws 客户端，不碰 IDE 实例。所以本文件收尾用
 *      disconnect()，仍然绝不碰 close()。
 *   3. 端口写在 IDE 配置文件里（设置→安全设置→服务端口）就是 9430 那一档；
 *      自动化端口由 `cli.js auto --auto-port` 指定，实测默认落在 9420。
 *   4. 【本轮补】WS 通道**没有换档位的旗标**：connect() 只吃一个端口，那个端口上活着的是
 *      哪个产物档（mock/real/showcase）不由本脚本决定。round-8b 的实测教训：ALREADY_UP 的早退
 *      发生在带 --project 的那次 spawn 之前，于是"要在 real 档架通道"的腿静默拿到了 mock 实例
 *      （.zcode/tmp/gap-tourhang/REPORT.md §3）⇒ 现在早退前必须验档位，验不了就大声失败。
 *
 * 用法：node scripts/qa/ws-channel-up.mjs [--project <产物绝对路径>] [--port 9420] [--wait 90]
 *       WSX_ALLOW_UNVERIFIED_BAND=1  只在"拿不到任何档位证据"时放行（照旧 exit 0 并打
 *                                    WS_UP_BAND_OVERRIDE）；**量出来是另一档时无效，仍然判红**。
 */
import { spawn, execFileSync } from "node:child_process";
import { existsSync, readdirSync, statSync, openSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
/* 档位的唯一读法：artifact-band.mjs:14 readApiMode() —— 执行器/取景器/巡检与本脚本问的是同一句
   "这包是哪一档"，不能各读各的（tour-r6.mjs 那边读的是同一个 config/env.js 的同一对键）。 */
import { readApiMode } from "./artifact-band.mjs";

const require = createRequire(import.meta.url);
const REPO = join(fileURLToPath(import.meta.url), "..", "..", "..");

const argv = process.argv.slice(2);
function opt(n, d) { const i = argv.indexOf("--" + n); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : d; }
import { readIdePort } from "./ide-port-config.mjs";
const IDE_DIR = opt('ide', process.env.WECHATIDE_DIR || "D:/微信开发者/微信web开发者工具");
/* 目标 ① 要的是「端口走配置文件而非命令行」：缺省端口从 scripts/qa/ide-port.json 取。
   读法已抽到 ide-port-config.mjs 做唯一实现——此前这里有一份 configPort()，
   而两个真正的消费者（shoot-frameplan --ws-taps、r-exec-ws）各读各的，
   等于"配置文件存在、消费者不认它"。现在三处同源，回落照样留痕打印。
   仍可用 --port 手工覆盖（做对照实验用），或 WSX_PORT 环境变量临时指端口。 */
const PORT = Number(opt('port', String(readIdePort().port)));
const WAIT = Number(opt('wait', '90'));
/* --project 一定要按仓库根解析：下面 spawn 的 cwd 是 IDE_DIR，传相对路径（腿清单里就是这么写的）
   会让 IDE 收到一个它脚下不存在的项目路径，端口永远起不来。缺省值本来就是绝对的，
   所以这个洞只在"显式传相对路径"时暴露。 */
const PROJECT_ARG = opt('project', join(REPO, "apps/client/dist/build/mp-weixin"));
const PROJECT = PROJECT_ARG.startsWith("/") || /^[A-Za-z]:[\\/]/.test(PROJECT_ARG) ? PROJECT_ARG : join(REPO, PROJECT_ARG);

function listeningPorts() {
  let out = "";
  try { out = execFileSync("netstat", ["-ano", "-p", "tcp"], { encoding: "utf8", timeout: 15000, maxBuffer: 8 * 1024 * 1024 }); }
  catch (e) { return { err: "netstat 失败：" + String(e.message).slice(0, 60), map: {} }; }
  const map = {};
  for (const line of out.split("\n")) {
    const m = line.match(/^\s*TCP\s+(127\.0\.0\.1|0\.0\.0\.0|\[::1\]):(\d+)\s+\S+\s+LISTENING\s+(\d+)/i);
    if (m) map[Number(m[2])] = Number(m[3]);
  }
  return { err: "", map };
}

function cliJs() {
  // 权威形态抄 cli.bat：入口是 resources/app.asar.unpacked/js/common/cli/index.js，
  // 且必须把 cwd 切到 IDE 安装目录（顶层那个 cli.js 直接 require 会 MODULE_NOT_FOUND）
  const p = join(IDE_DIR, "resources", "app.asar.unpacked", "js", "common", "cli", "index.js");
  return existsSync(p) ? p : "";
}
const BOOTSTRAP_JS = "const e=process.argv[1],a=process.argv.slice(2).filter(function(x){return x!=='--electron'});if(!process.env.cwd)process.env.cwd=process.cwd();process.argv=[process.execPath,'--ms-enable-electron-run-as-node',e,'--electron'].concat(a);require(e)";
function electronExe() {
  if (!existsSync(IDE_DIR)) return "";
  let best = null, min = 50 * 1024 * 1024;
  for (const n of readdirSync(IDE_DIR)) {
    if (!/\.exe$/i.test(n)) continue;
    if (/^(node|wxfilewatcher|notification_helper|wechatdevtools)/i.test(n)) continue;
    let s; try { s = statSync(join(IDE_DIR, n)).size; } catch { continue; }
    if (s > min) { min = s; best = join(IDE_DIR, n); }
  }
  return best;
}
function automator() {
  try { return require("miniprogram-automator"); } catch { /* fallthrough */ }
  const store = join(REPO, "node_modules", ".pnpm");
  if (!existsSync(store)) return null;
  const hit = readdirSync(store).filter((d) => d.startsWith("miniprogram-automator@")).sort()[0];
  return hit ? require(join(store, hit, "node_modules", "miniprogram-automator")) : null;
}

/* WSX-BAND-BEGIN */
/* 这一区只回答"这一条腿架起来的通道是不是本腿要的那个档位"，与 r-exec-ws.mjs 的 WSX-GATE 区
   同一条口径（纯函数、能被 .zcode/tmp/gap-fu8b/band-harness.mjs 按标记字节切出来离线跑三向）。
   为什么必须有它（.zcode/tmp/gap-tourhang/REPORT.md §3，本轮实测）：原 :99-102 在 :113 那次
   带 `--project …-real` 的 spawn **之前**就 WS_UP=ALREADY_UP + exit(0)，于是"要在 real 档架通道"
   的腿静默拿到了早就挂在 9420 上的 mock 实例（它的探针读到 page=pages/discover/index，正是 mock
   的已登录落点），后面整条巡检腿都建立在这个谎上。automator 的 connect() 只吃一个端口，
   没有任何旗标能把这条通道换档位 ⇒ 拿不到档位证据时"宣布成功"就是假 OK，必须大声失败。
   判据词表沿用本仓既有的一条：量出来是另一档 ⇒ 换载体或记 NOT_SHOOTABLE，不许记成产品 FAILED
   （artifact-band.mjs:70）。 */
export const WSX_BAND_EXIT = 2;
export function bandVerdict(expected, observed, opts) {
  const e = expected || {}; const o = observed || {}; const cfg = opts || {};
  const norm = (s) => String(s || "").split("\\").join("/").replace(/\/+$/, "").toLowerCase();
  const want = norm(e.project);
  const gotPath = norm(o.projectPath);
  const lines = [];
  /* 两条独立证据，任一"不符"即判不符；两条都拿不到 ⇒ unverified（不是"过"） */
  let pathCmp = "na";
  if (gotPath && want) pathCmp = (gotPath === want || gotPath.endsWith("/" + want) || want.endsWith("/" + gotPath)) ? "match" : "mismatch";
  let modeCmp = "na";
  const gotMode = String(o.apiMode || "").toLowerCase();
  const wantMode = String(e.mode || "").toLowerCase();
  if (gotMode && wantMode) modeCmp = gotMode === wantMode ? "match" : "mismatch";
  let verdict = "unverified";
  if (pathCmp === "mismatch" || modeCmp === "mismatch") verdict = "mismatch";
  else if (pathCmp === "match" || modeCmp === "match") verdict = "match";
  else if (!e.envExists || !wantMode) verdict = "unverifiable-target"; // --project 自己就不是一个有 env.js 的产物 ⇒ 无从对照
  const what = "本腿要的档位 project=" + (e.project || "?") + " VITE_API_MODE=" + (e.mode || "(读不到)")
    + " MODE=" + (e.viteMode || "(读不到)") + " envSha8=" + (e.sha8 || "?");
  const seen = "端口上活着的实例自报 apiMode=" + (o.apiMode || "(无)") + " 项目路径=" + (o.projectPath || "(无)")
    + " 落点=" + (o.pagePath || "(无)");
  lines.push("WS_UP_BAND=" + verdict + " port=" + (cfg.port || "?") + " " + what + " / " + seen
    + "（两条独立证据：路径比对=" + pathCmp + "，env 档位比对=" + modeCmp + "）");
  lines.push("WS_UP_BAND_证据 Tool.getInfo 键名=[" + (o.toolInfoKeys || "无") + "]"
    + " Tool.getInfo 异常=" + (o.toolInfoErr || "无")
    + " 应用内 require(config/env.js)=" + (o.envRequire || "无")
    + " 应用内异常=" + (o.envErr || "无"));
  if (verdict === "match") {
    lines.push("WS_UP_BAND_OK 档位与 --project 相符 ⇒ 这条 ALREADY_UP 才允许以 exit=0 收口");
    return { verdict, exit: 0, lines };
  }
  lines.push("WS_UP_BAND_HINT 通道换不了档位：automator.connect() 只吃端口，没有 --project 之类的旗标"
    + "（端口上活着的那个实例就是它，spawn 那条 --project 在 ALREADY_UP 分支里根本不会被执行）");
  lines.push("WS_UP_BAND_HINT 下一步只有两条路：① 出帧改走 CLI 桥（node scripts/qa/r-exec-cli.mjs --project <该档产物目录>，"
    + "--project 是每次调用生效的；round-8 stage-8 就是这么跑绿的）；② 这一腿按 NOT_SHOOTABLE 记账并换载体"
    + "——口径同 artifact-band.mjs:70，不许记成产品 FAILED，更不许记成「这一档已经测过」");
  if (verdict === "unverified" && cfg.allowUnverified) {
    lines.push("WS_UP_BAND_OVERRIDE 已设 WSX_ALLOW_UNVERIFIED_BAND=1 ⇒ 拿不到证据这件事由操作者显式放行，"
      + "本轮的档位断言等于没有：下游读到的任何 real/mock 结论都要自己再验一次。");
    return { verdict, exit: 0, lines };
  }
  if (verdict === "unverified") {
    lines.push("WS_UP_BAND_FAIL 拿不到任何能证明档位的证据 ⇒ **不**宣布成功。这一腿要的是「在 " + (e.project || "?")
      + " 上架好通道」，而现在只能证明「端口 " + (cfg.port || "?") + " 上有人」。确实要按旧行为放行就显式设 WSX_ALLOW_UNVERIFIED_BAND=1。");
  } else if (verdict === "unverifiable-target") {
    lines.push("WS_UP_BAND_FAIL --project 指向的目录里没有可读的 config/env.js（" + (e.envFile || "?")
      + "）⇒ 连「要哪一档」都说不清，不配拿 exit=0。");
  } else {
    lines.push("WS_UP_BAND_FAIL 量出来的档位与 --project 不符 ⇒ 这条腿连着的是**别人那一档**的实例，"
      + "拿它出帧会得到标签与画面不一致的证据（round-8b 的 real 标签 × mock 画面就是这么来的）。");
  }
  return { verdict, exit: WSX_BAND_EXIT, lines };
}
/* WSX-BAND-END */

/* 收尾只断**本进程这一侧**的 ws 客户端：MiniProgram.disconnect(){connection.dispose()} →
   Transport.close(){ws.close()}。绝不发 close()（App.exit + Tool.close 会把整个自动化实例带走，
   9420 随之消失——头注释第 2 条那条实测教训）。抛错一律留下痕迹后继续：收尾失败不该盖掉判决。 */
async function dropConn(mini, tag) {
  if (!mini) return false;
  try { await mini.disconnect(); return true; }
  catch (err) { console.log("WS_UP_NOTE " + tag + "：disconnect 抛错（忽略，不 close）" + String((err && err.message) || err).slice(0, 80)); return false; }
}

/* 问那个**已经在听的** automator 实例"你是哪一档"，只用只读查询（不开页、不截图、不刷新、更不 close）：
   ① Tool.getInfo —— 连上时 SDK 的 checkVersion() 已经发过一次同一请求（Launcher.js:connect →
      MiniProgram.checkVersion → send("Tool.getInfo")），这里再发一次只为把**全部键名**留下证：
      只要它回的字段里带项目路径，档位断言就有最硬的那条证据。今天的字段集没有设备可量，
      故键名照原样打进 WS_UP_BAND_证据 行里，下次跑就有事实可依。
   ② 应用内 require('config/env.js') —— 产物自己的档位定义文件（编译后末行导出 clientEnv），
      读 clientEnv.apiMode；三种路径写法都试，全失败就留下"试过什么"的现场。
   ③ currentPage().path 只作旁证（verify() 已经在打它），不参与 bandVerdict 判据。
   三条都拿不到也必须回结构化对象 ⇒ 让 bandVerdict() 去判"验不了"，不许本函数替它装成验过了。 */
const ENV_REQUIRE_FORMS = ["config/env.js", "/config/env.js", "../config/env.js"];
async function readLiveBand(mini) {
  const o = { projectPath: "", apiMode: "", toolInfoKeys: "", toolInfoErr: "", envRequire: "", envErr: "", pagePath: "" };
  try {
    const info = await Promise.race([
      mini.send("Tool.getInfo"),
      new Promise((_, rj) => setTimeout(() => rj(new Error("TOOL_GETINFO_TIMEOUT_8S")), 8000)),
    ]);
    o.toolInfoKeys = Object.keys(info || {}).join(",");
    const s = JSON.stringify(info || {});
    const m = s.match(/([A-Za-z]:[\\/][^",]*mp-weixin[^"\\]*)/) || s.match(/([\w./-]*mp-weixin[\w./-]*)/);
    if (m) o.projectPath = m[1];
  } catch (err) { o.toolInfoErr = String((err && err.message) || err).slice(0, 90); }
  try {
    const r = await Promise.race([
      mini.evaluate(new Function(
        "var forms=" + JSON.stringify(ENV_REQUIRE_FORMS) + ";var tried=[];" +
        "for (var i=0;i<forms.length;i++){try{var m=require(forms[i]);" +
        "if(m&&m.clientEnv){return 'OK|'+m.clientEnv.apiMode+'|'+forms[i];}}" +
        "catch(e){tried.push(forms[i]+'='+String(e&&e.message).slice(0,26));}}" +
        "return 'NO|'+tried.join(' ;');")),
      new Promise((_, rj) => setTimeout(() => rj(new Error("EVALUATE_TIMEOUT_8S")), 8000)),
    ]);
    const parts = String(r || "").split("|");
    o.envRequire = String(r || "");
    if (parts[0] === "OK") o.apiMode = parts[1] || "";
  } catch (err) { o.envErr = String((err && err.message) || err).slice(0, 90); }
  try { const p = await mini.currentPage(); o.pagePath = (p && p.path) || ""; } catch (_) { /* 旁证，拿不到就算了 */ }
  return o;
}

/* --project 那侧的期望档位：读盘，不碰设备。读不到就是"这一腿连要哪一档都说不清"，
   交给 bandVerdict() 判 unverifiable-target，不在这里给一个"看起来对"的默认值。 */
function expectedBand() {
  const band = readApiMode(PROJECT);
  return { project: PROJECT, envFile: band.envFile, envExists: existsSync(band.envFile), mode: band.mode, viteMode: band.viteMode, sha8: band.sha8 };
}

async function verify(A) {
  const t0 = Date.now();
  const mini = await Promise.race([
    A.connect({ wsEndpoint: "ws://127.0.0.1:" + PORT }),
    new Promise((_, rj) => setTimeout(() => rj(new Error("CONNECT_TIMEOUT_10S")), 10000)),
  ]);
  try {
    const page = await mini.currentPage();
    const s0 = Date.now();
    const probes = ['.discover-header__tab', '.discover-header__filter', '.zzz-not-real-x', '.zzz-not-real-y',
      '.discover-card', '.zzz-not-real-z', '.discover-header__tab-text', '.zzz-not-real-w'];
    const hits = [];
    for (const sel of probes) { try { hits.push((await page.$(sel)) ? 1 : 0); } catch { hits.push('E'); } }
    const per = (Date.now() - s0) / probes.length;
    return { ms: Date.now() - t0, path: page && page.path, hits: hits.join(''), perCall: per, mini };
  } catch (err) {
    await dropConn(mini, "verify 取证据失败"); // 抛出去之前先把套接字摘掉，别留 ref 住的连接
    throw err;
  }
}

/* 一条腿的收尾：先摘掉套接字（只 disconnect，绝不 close），再交码退出。
   为什么这里要显式 process.exit：ws 客户端是 ref 住的（Connection.create 里 `new ws(e)`，没 unref），
   同一类"活干完了进程不退"的形状在 round-8b 那条巡检腿上挂了 47 分钟（tour-r6.mjs 的 FU-8b-2 同因）。 */
async function finish(v, verdict, okLine) {
  await dropConn(v && v.mini, "收尾");
  console.log(okLine);
  (verdict ? verdict.lines : []).forEach((l) => console.log(l));
  console.log("WS_UP_NOTE 收尾不要调 close()——它会关掉整个自动化 IDE 实例（本轮踩过）；本次已 disconnect 本进程的 ws 客户端");
  const exit = verdict ? verdict.exit : 0;
  // WS_UP_BAND_RESULT 这个名字是为了被消费方抓走：run-ui-queue.mjs:136 只把带 `_RESULT=` 的行抬进 queue-state.json
  console.log("WS_UP_BAND_RESULT=" + (verdict ? verdict.verdict : "n/a") + " exit=" + exit);
  process.exit(exit);
}

(async () => {
  const A = automator();
  if (!A) { console.log("WS_UP=FAIL reason=仓库里找不到 miniprogram-automator，先 pnpm add -D miniprogram-automator"); process.exit(2); }
  const expected = expectedBand();
  let v = await verify(A).catch((e) => ({ err: String(e && e.message).slice(0, 120) }));
  if (!v.err) {
    /* 【FU-8b-3】原样在这里直接 exit(0) 就是那个假 OK：端口在听 ≠ 在听的是本腿要的那一档。
       现在先把档位问清楚（三条只读证据，见 readLiveBand），只有 bandVerdict() 判 match
       （或操作者显式放行 unverified）才允许 exit(0)。量出另一档时**不**去 spawn 一次
       `cli auto`：那会去动一个不属于本腿的活实例，而"两个 auto 实例能否并存"本轮无设备可验。 */
    const observed = await readLiveBand(v.mini);
    const verdict = bandVerdict(expected, observed, { allowUnverified: process.env.WSX_ALLOW_UNVERIFIED_BAND === "1", port: PORT });
    const up = "WS_UP=" + (verdict.exit === 0 ? "ALREADY_UP" : "ALREADY_UP_BUT_WRONG_OR_UNKNOWN_BAND")
      + " port=" + PORT + " connectMs=" + v.ms + " page=" + v.path + " hits=" + v.hits + " 单条查询=" + v.perCall.toFixed(1) + "ms";
    await finish(v, verdict, up);
  }
  console.log("WS_DOWN_REASON " + v.err);

  const exe = electronExe(), js = cliJs();
  if (!exe || !js) {
    console.log("WS_UP=FAIL reason=找不到 IDE 主程序或 cli.js（IDE_DIR=" + IDE_DIR + " exists=" + existsSync(IDE_DIR) + "）");
    process.exit(2);
  }
  const logPath = join(REPO, ".zcode/tmp/ws-channel-up.log");
  const logFd = openSync(logPath, "a");
  const child = spawn(exe, ["-e", BOOTSTRAP_JS, js, "auto", "--project", PROJECT, "--auto-port", String(PORT)], {
    detached: true, stdio: ["ignore", logFd, logFd], cwd: IDE_DIR,
    env: Object.assign({}, process.env, { ELECTRON_RUN_AS_NODE: "1" }),
  });
  child.unref();
  let childExit = null;
  child.on("exit", (code) => { childExit = code; });
  console.log("WS_UP_SPAWNED pid=" + child.pid + " cli=auto --auto-port " + PORT + " project=" + PROJECT.replace(REPO + "/", "") + " log=.zcode/tmp/ws-channel-up.log");

  const t0 = Date.now();
  let last = "";
  /* 端口在听 ≠ 自动化会话就绪：IDE 冷启动要先 preparing / 取 AppID 权限，这段时间 connect 会成功而
     currentPage() 抛（本次实测每次都是 "reading 'split' of undefined"）。两种情况必须分开报，
     否则"端口 9420 始终没监听"这句话就是在撒谎——它就差在听，只是那条腿没等到会话可用。 */
  let sawPortAt = 0;
  let verifyThrows = 0;
  while (Date.now() - t0 < WAIT * 1000) {
    await new Promise((r) => setTimeout(r, 3000));
    const { map, err } = listeningPorts();
    if (err) { console.log("WS_UP=FAIL reason=" + err + "（拿不到监听表就别声称端口没开）"); process.exit(2); }
    if (map[PORT]) {
      const owner = map[PORT];
      if (!sawPortAt) sawPortAt = Date.now();
      const again = await verify(A).catch((e) => ({ err: String(e && e.message).slice(0, 120) }));
      if (!again.err) {
        /* spawn 那条 --project 也不是"已经生效"的证明：端口可能本来就属于另一个更早的实例
           （ALREADY_UP 分支量到的就是这个形状）。所以这里同样要验档位才交码。 */
        const observed = await readLiveBand(again.mini);
        const verdict = bandVerdict(expected, observed, { allowUnverified: process.env.WSX_ALLOW_UNVERIFIED_BAND === "1", port: PORT });
        console.log("WS_UP_NOTE 单条查询耗时是 CLI 桥折叠探针(210ms/条)的零头；但截图走 WS 实测 61s/张，比 CLI 的 2.6s 差 23 倍 ⇒ 出帧仍走 CLI");
        const up = "WS_UP=OK port=" + PORT + " ownerPid=" + owner + " 等待=" + ((Date.now() - t0) / 1000).toFixed(0) + "s" +
          " connectMs=" + again.ms + " page=" + again.path + " hits=" + again.hits + " 单条查询=" + again.perCall.toFixed(1) + "ms"
          + (verdict.exit === 0 ? "" : "（档位断言未过 ⇒ 见下面 WS_UP_BAND_*）");
        await finish(again, verdict, up);
      }
      last = again.err;
      verifyThrows++;
    } else {
      const others = Object.keys(map).filter((p) => Number(p) > 9000 && Number(p) < 10000).join(",");
      last = "端口 " + PORT + " 未监听；9000-9999 段在听的是 " + (others || "无");
    }
    process.stdout.write("  · " + ((Date.now() - t0) / 1000).toFixed(0) + "s " + last + "\n");
  }
  /* 收尾这句话必须说真话：两种失败形状要的东西完全不同——
     端口没起来 ⇒ 去看 IDE 实例/命令行形态；端口起了但会话没就绪 ⇒ 是等得不够，不是通道坏了。 */
  if (sawPortAt) {
    console.log("WS_UP=FAIL reason=端口 " + PORT + " 在 " + ((sawPortAt - t0) / 1000).toFixed(0) + "s 起就在听，"
      + "但自动化会话在 " + WAIT + "s 内没准备好（connect 后取页失败 " + verifyThrows + " 次，最后一次观测：" + last + "）"
      + "⇒ 这不是「没监听」，是 IDE 冷启动还没进可驱动状态；加大 --wait 或先开一次窗口再接通道");
  } else {
    console.log("WS_UP=FAIL reason=" + WAIT + "s 内 " + PORT + " 始终没监听，最后一次观测：" + last);
  }
  console.log("WS_UP_CHILD exitCode=" + childExit + "（非 null 表示子进程自己退了，多半是命令行形态错了）");
  try {
    const tail = readFileSync(logPath, "utf8").replace(/\r/g, "").split("\n").slice(-8).join(" ⏎ ");
    console.log("WS_UP_LOGTAIL " + tail.slice(-420));
  } catch (e) { console.log("WS_UP_LOGTAIL 读不到子进程日志：" + String(e.message).slice(0, 60)); }
  console.log("WS_UP_HINT cli auto 打印 ✔ auto 只代表命令被接受；真端口由那个新起的 IDE 实例绑。检查是否弹了授权/是否 IDE 版本把自动化端口换成了别的档位");
  process.exit(2);
})();

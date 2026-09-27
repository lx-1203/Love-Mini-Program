/* 把 miniprogram-automator 的 WS 采集通道拉起来 + 自检（round-7 补 ①）。
 *
 * 本轮实测到的三条事实，写在这里免得下次又猜：
 *   1. WS 监听端口不在主 IDE 进程上，而在"以自动化模式打开的那个 IDE 实例"上；
 *      今天 9420 的持有者是 PID 36136，主窗口是 PID 38636（它只持有 9430 的 HTTP 桥）。
 *   2. connect() 出来的会话**绝不能调 close()**：close() 会把那个自动化实例整个关掉，
 *      9420 随之从监听表里消失（今天就亲手把它关掉过一次，之后 connect 直接报
 *      "check if target project window is opened with automation enabled"）。
 *      这个版本里 mini.disconnect 是 undefined，所以收尾只能"什么都不做、让进程自己退出"。
 *   3. 端口写在 IDE 配置文件里（设置→安全设置→服务端口）就是 9430 那一档；
 *      自动化端口由 `cli.js auto --auto-port` 指定，实测默认落在 9420。
 *
 * 用法：node scripts/qa/ws-channel-up.mjs [--project <产物绝对路径>] [--port 9420] [--wait 90]
 */
import { spawn, execFileSync } from "node:child_process";
import { existsSync, readdirSync, statSync, openSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

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
const PROJECT = opt('project', join(REPO, "apps/client/dist/build/mp-weixin"));

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

async function verify(A) {
  const t0 = Date.now();
  const mini = await Promise.race([
    A.connect({ wsEndpoint: "ws://127.0.0.1:" + PORT }),
    new Promise((_, rj) => setTimeout(() => rj(new Error("CONNECT_TIMEOUT_10S")), 10000)),
  ]);
  const page = await mini.currentPage();
  const s0 = Date.now();
  const probes = ['.discover-header__tab', '.discover-header__filter', '.zzz-not-real-x', '.zzz-not-real-y',
    '.discover-card', '.zzz-not-real-z', '.discover-header__tab-text', '.zzz-not-real-w'];
  const hits = [];
  for (const sel of probes) { try { hits.push((await page.$(sel)) ? 1 : 0); } catch { hits.push('E'); } }
  const per = (Date.now() - s0) / probes.length;
  return { ms: Date.now() - t0, path: page && page.path, hits: hits.join(''), perCall: per };
}

(async () => {
  const A = automator();
  if (!A) { console.log("WS_UP=FAIL reason=仓库里找不到 miniprogram-automator，先 pnpm add -D miniprogram-automator"); process.exit(2); }
  let v = await verify(A).catch((e) => ({ err: String(e && e.message).slice(0, 120) }));
  if (!v.err) {
    console.log("WS_UP=ALREADY_UP port=" + PORT + " connectMs=" + v.ms + " page=" + v.path + " hits=" + v.hits + " 单条查询=" + v.perCall.toFixed(1) + "ms");
    console.log("WS_UP_NOTE 收尾不要调 close()——它会关掉整个自动化 IDE 实例（本轮踩过）");
    process.exit(0);
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
  while (Date.now() - t0 < WAIT * 1000) {
    await new Promise((r) => setTimeout(r, 3000));
    const { map, err } = listeningPorts();
    if (err) { console.log("WS_UP=FAIL reason=" + err + "（拿不到监听表就别声称端口没开）"); process.exit(2); }
    if (map[PORT]) {
      const owner = map[PORT];
      const again = await verify(A).catch((e) => ({ err: String(e && e.message).slice(0, 120) }));
      if (!again.err) {
        console.log("WS_UP=OK port=" + PORT + " ownerPid=" + owner + " 等待=" + ((Date.now() - t0) / 1000).toFixed(0) + "s" +
          " connectMs=" + again.ms + " page=" + again.path + " hits=" + again.hits + " 单条查询=" + again.perCall.toFixed(1) + "ms");
        console.log("WS_UP_NOTE 单条查询耗时是 CLI 桥折叠探针(210ms/条)的零头；但截图走 WS 实测 61s/张，比 CLI 的 2.6s 差 23 倍 ⇒ 出帧仍走 CLI");
        console.log("WS_UP_NOTE 收尾不要调 close()——它会关掉整个自动化 IDE 实例（本轮踩过）");
        process.exit(0);
      }
      last = again.err;
    } else {
      const others = Object.keys(map).filter((p) => Number(p) > 9000 && Number(p) < 10000).join(",");
      last = "端口 " + PORT + " 未监听；9000-9999 段在听的是 " + (others || "无");
    }
    process.stdout.write("  · " + ((Date.now() - t0) / 1000).toFixed(0) + "s " + last + "\n");
  }
  console.log("WS_UP=FAIL reason=" + WAIT + "s 内 " + PORT + " 始终没监听，最后一次观测：" + last);
  console.log("WS_UP_CHILD exitCode=" + childExit + "（非 null 表示子进程自己退了，多半是命令行形态错了）");
  try {
    const tail = readFileSync(logPath, "utf8").replace(/\r/g, "").split("\n").slice(-8).join(" ⏎ ");
    console.log("WS_UP_LOGTAIL " + tail.slice(-420));
  } catch (e) { console.log("WS_UP_LOGTAIL 读不到子进程日志：" + String(e.message).slice(0, 60)); }
  console.log("WS_UP_HINT cli auto 打印 ✔ auto 只代表命令被接受；真端口由那个新起的 IDE 实例绑。检查是否弹了授权/是否 IDE 版本把自动化端口换成了别的档位");
  process.exit(2);
})();

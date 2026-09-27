#!/usr/bin/env node
/** 从配置文件读 IDE 端口，并**当场用监听表证明它活着**（目标 ①：端口走配置文件而非命令行）。
 *
 * 为什么不是"读一下就行"：automator 的 WS 端口会随 IDE 重启漂移（实测 9431 消失过），
 * 拿一个写在盘上的旧数字去 connect，报出来的是"连不上"，看起来像产品/脚本坏了。
 * 所以这里把"配置值"和"在监听"绑成一个判据：不在监听 ⇒ 非零退出，调用方必须停下来，
 * 而不是退回到硬编码端口继续跑。
 *
 * 用法：node scripts/qa/ide-service-port.mjs [--json <文件>] [--quiet] [--require-ws|--no-require-ws]
 *   --quiet  只打印 WS 端口号（给别的脚本当取值入口用）
 */
import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = typeof import.meta.dirname === "string" ? import.meta.dirname : dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const QUIET = process.argv.includes("--quiet");
const REQUIRE_WS = !process.argv.includes("--no-require-ws");
const FILE = resolve(REPO, arg("json", "scripts/qa/ide-port.json"));

const out = (s) => { if (!QUIET) console.log(s); };
if (!existsSync(FILE)) { console.log(`IDEPORT_RESULT=FAIL reason=配置文件不存在 ${FILE}`); process.exit(2); }

let cfg;
try { cfg = JSON.parse(readFileSync(FILE, "utf8")); }
catch (e) { console.log(`IDEPORT_RESULT=FAIL reason=配置文件不是合法 JSON：${String(e.message).slice(0, 80)}`); process.exit(2); }

/* 配置形状本身要能被拒：端口号必须是 1024..65535 的整数，且要有来源说明 */
const bad = [];
const ws = Number(cfg.wsAutomatorPort);
if (!Number.isInteger(ws) || ws < 1024 || ws > 65535) bad.push("wsAutomatorPort 不是合法端口");
const bridges = Array.isArray(cfg.httpBridgePorts) ? cfg.httpBridgePorts.map(Number) : [];
if (!bridges.length) bad.push("httpBridgePorts 为空");
for (const p of bridges) if (!Number.isInteger(p) || p < 1024 || p > 65535) bad.push("httpBridgePorts 含非法端口");
if (!cfg.$comment) bad.push("缺 $comment（这个文件必须自带「为什么是镜像而非 IDE 真配置」的说明）");
if (bad.length) { console.log("IDEPORT_RESULT=FAIL reason=" + bad.join(" / ")); process.exit(2); }

/* 监听表：netstat 的输出随语言环境变（中文 Windows 打"LISTENING"也打本地化词），
   所以只按端口号匹配，不匹配状态字。 */
let table = "";
try { table = execSync("netstat -ano -p tcp", { encoding: "utf8", maxBuffer: 1 << 24 }); }
catch (e) { console.log(`IDEPORT_RESULT=FAIL reason=netstat 不可用：${String(e.message).slice(0, 80)}`); process.exit(2); }
const listenerOf = (port) => {
  /* netstat 的列是 Proto / Local / Foreign / State / PID。上一版拿"匹配后第三个 token"当 pid，
     把状态字 LISTENING 打成了 pid ⇒ 输出看着有值、其实答的是另一个问题。
     现在只认【本地地址列以 :port 结尾】的行，并取行尾那列纯数字当 pid。 */
  const tail = new RegExp("[:.]" + port + "$");
  for (const line of table.split(/\r?\n/)) {
    const f = line.trim().split(/\s+/);
    if (f.length < 5 || !tail.test(f[1] || "")) continue;
    const pid = f[f.length - 1];
    if (/^\d+$/.test(pid)) return pid;
  }
  return null;
};
const wsPid = listenerOf(ws);
const bridgeState = bridges.map((p) => ({ port: p, pid: listenerOf(p) }));

out(`IDEPORT 配置=${FILE.replace(REPO + "/", "")}`);
out(`IDEPORT ws=${ws} listening=${wsPid ? "yes" : "NO"}${wsPid ? " pid=" + wsPid : ""}`);
out(`IDEPORT bridge=${bridgeState.map((b) => b.port + ":" + (b.pid || "down")).join(",")}`);
if (QUIET) console.log(String(ws));

const wsOk = !!wsPid;
const anyBridge = bridgeState.some((b) => b.pid);
const ok = (!REQUIRE_WS || wsOk) && anyBridge;
out(`IDEPORT_RESULT=${ok ? "OK" : "FAIL"}` + (ok ? "" : `（WS=${wsOk ? "在" : "不在"}、桥=${anyBridge ? "在" : "不在"} ⇒ 不要退回硬编码端口，先去 IDE 设置里把服务端口打开）`));
process.exit(ok ? 0 : 1);

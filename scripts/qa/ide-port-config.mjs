#!/usr/bin/env node
/* IDE 服务端口的**唯一读法**。
   为什么单独一个模块：`scripts/qa/ide-port.json` 是目标 ①「端口走配置文件而非命令行」的载体，
   但此前只有 ws-channel-up.mjs 里有 configPort()，两个真正的消费者
   （shoot-frameplan.mjs 的 --ws-taps、r-exec-ws.mjs 的连接）各自读 env 或各自发现端口——
   等于"配置文件存在、消费者不认它"，那条子句仍然没有载体（建了不接等于没建）。
   现在三个消费者都从这里取值，并各自打印来源，回落必须留痕。 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const IDE_PORT_FILE = join(REPO, "scripts", "qa", "ide-port.json");
export const FALLBACK_PORT = 9420;

/** 返回 {port, source, note}；source ∈ config | env | fallback。绝不静默回落。 */
export function readIdePort({ quiet = false } = {}) {
  const say = (s) => { if (!quiet) console.log(s); };
  const env = process.env.WSX_PORT || process.env.WS_ENDPOINT || "";
  const envPort = Number(String(env).replace(/^.*:(\d+).*$/, "$1"));
  if (Number.isInteger(envPort) && envPort >= 1024 && envPort <= 65535) {
    say("IDE_PORT_SOURCE=env（WSX_PORT/WS_ENDPOINT）→ " + envPort + "；这是做对照实验时的显式覆盖，优先级高于配置文件");
    return { port: envPort, source: "env", note: "env override" };
  }
  try {
    const j = JSON.parse(readFileSync(IDE_PORT_FILE, "utf8"));
    const p = Number(j.wsAutomatorPort);
    if (Number.isInteger(p) && p >= 1024 && p <= 65535) {
      say("IDE_PORT_SOURCE=config " + relativeish() + " → " + p);
      return { port: p, source: "config", note: "镜像 IDE 设置→安全设置→服务端口" };
    }
    say("IDE_PORT_SOURCE=config 值不合法（wsAutomatorPort=" + JSON.stringify(j.wsAutomatorPort) + "）⇒ 回落 " + FALLBACK_PORT);
  } catch (e) {
    say("IDE_PORT_SOURCE=config 读不到 " + relativeish() + "（" + String(e && e.message).slice(0, 60) + "）⇒ 回落 " + FALLBACK_PORT);
  }
  return { port: FALLBACK_PORT, source: "fallback", note: "配置文件不可用时的实测默认落点" };
}
function relativeish() { return IDE_PORT_FILE.replace(REPO + "/", "").replace(/\\/g, "/"); }

/** 配置文件说的端口在不在监听表里——在才算"这一档真的开着"，不在就明说，不拿旧数字硬连。 */
export function portIsListening(port, listeningPorts) {
  return (listeningPorts || []).some((p) => Number(p) === Number(port));
}

if (process.argv.includes("--selftest")) {
  const saved = process.env.WSX_PORT;
  const cases = [];
  delete process.env.WSX_PORT;
  const a = readIdePort({ quiet: true });
  cases.push({ n: "无 env 时读配置文件", ok: a.source === "config" && Number.isInteger(a.port), got: a.source + "/" + a.port });
  process.env.WSX_PORT = "ws://127.0.0.1:9999";
  const b = readIdePort({ quiet: true });
  cases.push({ n: "env 带端口时优先 env", ok: b.source === "env" && b.port === 9999, got: b.source + "/" + b.port });
  process.env.WSX_PORT = "not-a-port";
  const c = readIdePort({ quiet: true });
  cases.push({ n: "env 不合法时不冒充 env，回到配置文件", ok: c.source === "config", got: c.source + "/" + c.port });
  delete process.env.WSX_PORT;
  if (saved) process.env.WSX_PORT = saved;
  cases.push({ n: "监听表判定：在表里才算数", ok: portIsListening(9420, ["9420", "9430"]) && !portIsListening(9420, ["9430"]), got: "ok" });
  const bad = cases.filter((x) => !x.ok);
  for (const x of cases) console.log((x.ok ? "  ok " : "  BAD") + x.n + " got=" + x.got);
  console.log("IDEPORT_SELFTEST=" + (bad.length === 0 ? "PASS" : "FAIL") + " cases=" + cases.length + " bad=" + bad.length);
  process.exit(bad.length ? 1 : 0);
}

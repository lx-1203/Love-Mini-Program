#!/usr/bin/env node
/** 打开（或换到）指定的小程序项目窗口，并**验它真的活了**，供需要切档位的执行腿用。
 *
 * 为什么单独一件：`r-exec-cli.mjs` 只会往"当前打开的那个模拟器"里注入，它自己不开窗。
 * 实测代价：A 刀跑在 mock 产物上，mock 窗口一直开着；guest 腿按档位前置改指 real 产物之后，
 * 窗口里还是 mock ⇒ 启动阶段 `automation_evaluate` 直接抛错、一行没跑（今天就是这样退的 2）。
 * 所以切档位 = 切项目窗口，这一步必须显式做、并且做完要验证，不能"发了命令就算开好了"。
 *
 * 用法：node scripts/qa/open-project-window.mjs --project <绝对路径> [--settle 12] [--dry]
 */
import { resolve, dirname } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ideCall, evaluate } from "./cli-automator.mjs";
import { guardUiLease } from "./ui-lease.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const PROJECT = resolve(REPO, arg("project", "apps/client/dist/build/mp-weixin"));
const SETTLE = Number(arg("settle", "12"));

const say = (k, v) => console.log("OPENWIN " + k + "=" + v);
if (!existsSync(join_(PROJECT, "app.json"))) {
  console.log("OPENWIN_RESULT=FAIL reason=项目目录里没有 app.json（不是已编译产物）：" + PROJECT);
  process.exit(2);
}
function join_(a, b) { return a.replace(/\/+$/, "") + "/" + b; }
if (argv.includes("--dry")) { say("DRY", PROJECT); process.exit(0); }

/* 会开页 ⇒ 先排队（与其它驱动同一把租约，跨通道互斥） */
const lease = guardUiLease({ owner: "open-project-window-" + PROJECT.split("/").pop(), tag: "OPENWIN_LEASE", failTag: "OPENWIN" });

say("project", PROJECT);
const r = ideCall("open_project_window", [], { project: PROJECT, timeoutMs: 180000 });
say("call", JSON.stringify(r).slice(0, 160));

/* 验证：等 IDE 把窗口起稳，然后读一次当前页路由。读不到就判 FAIL ——
   "命令返回 ok" 与"窗口里跑的是我要的那个产物"是两件事，本轮已在这上面翻过一次。 */
const sleep = (ms) => { const t = Date.now() + ms; while (Date.now() < t) { /* 同步等 */ } };
/* ⚠ 传进 automation_evaluate 的必须是**箭头函数表达式**：r-exec-cli 的探测串一律是 "() => …"。
   写成裸 `return …` 会被 IDE 侧当脚本首行解析，报 "Uncaught Unexpected token 'return'" ——
   我第一版就是这么写的，两个项目同时报同一个错，差点被读成"real 档窗口起不来"的结论。 */
const ROUTE_FN = "() => JSON.stringify({route:(getCurrentPages().slice(-1)[0]||{}).route||'', pages:getCurrentPages().length})";
let last = "";
/* 判"活"的唯一口径：路由非空。以前循环的跳出条件是"probe 有回话且不含 ERR"，
   而刚开完的档位首帧就是 {"route":"","pages":0} —— 有回话但还没启动完，
   于是 5 秒就 break、判 no-live-route 退出（实测 13:50:19 起、13:50:30 就 FAIL 交卷，
   SETTLE=24 的 120s 预算一秒都没用），整条队列剩下 13 条腿全被记成 NOT_RUN。
   跳出条件必须和验收条件是同一个谓词，否则"等它起来"这句话是假的。 */
const live = (s) => /"route":\s*"[^"]+"/.test(String(s));
for (let i = 0; i < SETTLE; i++) {
  sleep(5000);
  try {
    last = evaluate(ROUTE_FN, { project: PROJECT });
    if (live(last)) break;
  } catch (e) { last = "ERR " + String(e.message).slice(0, 300); }
}
say("probe", String(last).slice(0, 200));
const ok = live(last);
say("verify", ok ? "window-live" : "no-live-route");
lease.release();
console.log(`OPENWIN_RESULT=${ok ? "OK" : "FAIL"}` + (ok ? "" : " ⇒ 窗口没起来或里面不是这个产物；不要接着往下跑执行腿"));
process.exit(ok ? 0 : 1);

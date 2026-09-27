#!/usr/bin/env node
/** UI 排队器：把"必须独占模拟器、又必须一个接一个跑"的几刀串成一条无人看守的队。
 *
 * 为什么要有 —— 执行轮单程约 1.5 小时，登录身份跑完之后游客身份还要再跑一遍（⑤ 要"双身份"）。
 * 靠人在场每隔几分钟去手点一次，一是浪费轮次，二是半途手滑就会造成 §58 那种并发换页事故。
 * 所以这里只做三件事：等 UI 空出来 → 按给定顺序跑腿 → 每腿把退出码与自己的统计行落盘。
 *
 * 三条硬规矩：
 *  1) 排队器**自己不取租约**。租约属于每一条腿（r-exec-cli 会 RUNNER_LEASE=ACQUIRED）；
 *     我提前占住反而会让它撞在自己的锁上，看起来像"避让失效"。
 *  2) 一条腿失败默认不往后掩盖：记 QUEUE_RESULT=FAIL 并停，剩下的腿标 NOT_RUN ——
 *     一条红腿后面接一串基于它的腿，只会把红变成"看不见的红"。
 *     例外：只读的门腿可以带 `"advisory": true`，它红 = 发现一个缺陷而不是 UI 坏了，
 *     此时状态记成 ADVISORY_RED、后面的腿照跑，但结尾仍然是 QUEUE_RESULT=FAIL（红不会被放行变成绿）。
 *     超时永不让路：超时说明租约/模拟器本身出事了。
 *  3) 全程增量落盘（每 60s 一行心跳），被杀掉也留得下"跑到哪一步"的现场。
 *
 * 用法：PATH=<node22>:$PATH node scripts/qa/run-ui-queue.mjs --out reports/audit/round-7/ui-queue
 *   --legs <file>   腿清单 JSON（默认 scripts/qa/ui-queue.default.json）
 *   --max-wait-min <n>  最长等待时间，超时判 FAIL 而不是无限等（默认 360）
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { heldLeases } from "./ui-lease.mjs";

const HERE = typeof import.meta.dirname === "string" ? import.meta.dirname : dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : d; };

const OUT = resolve(REPO, arg("out", "reports/audit/round-7/ui-queue"));
mkdirSync(OUT, { recursive: true });
const LEGS_FILE = resolve(REPO, arg("legs", join(HERE, "ui-queue.default.json")));
const MAX_WAIT_MIN = Number(arg("max-wait-min", "360"));
const POLL_MS = Number(process.env.QUEUE_POLL_MS || 60000);
const LOG = join(OUT, "queue.log");
const STATE = join(OUT, "queue-state.json");
const now = () => new Date().toISOString();
/* Windows 上 join() 生反斜杠，直接 replace(REPO + "/") 永远不命中 ⇒ 日志里冒出绝对路径
   （溯源表里的路径必须能原样复现，也不能带机器名）。 */
const relOf = (p) => String(p).split("\\").join("/").replace(String(REPO).split("\\").join("/") + "/", "");
const say = (s) => { const line = `[${now()}] ${s}`; console.log(line); appendFileSync(LOG, line + "\n"); };

if (!existsSync(LEGS_FILE)) { say(`QUEUE_RESULT=FAIL reason=腿清单不存在 ${LEGS_FILE}`); process.exit(2); }
const legs = JSON.parse(readFileSync(LEGS_FILE, "utf8"));
if (!Array.isArray(legs) || !legs.length) { say("QUEUE_RESULT=FAIL reason=腿清单为空（空扫描集不得判绿）"); process.exit(2); }
say(`QUEUE_START legs=${legs.length} 清单=${relOf(LEGS_FILE)} 并发上限=${legs.length === 1 ? "单腿" : "串行"}`);

const state = { startedAt: now(), legs: legs.map((l) => ({ name: l.name, status: "QUEUED" })) };
const save = () => writeFileSync(STATE, JSON.stringify(state, null, 1) + "\n");
save();

function waitForFree() {
  const t0 = Date.now();
  for (;;) {
    const hs = heldLeases();
    if (!hs.length) return { free: true, waitedMs: Date.now() - t0 };
    if (Date.now() - t0 > MAX_WAIT_MIN * 60000) {
      return { free: false, waitedMs: Date.now() - t0, holders: hs };
    }
    say(`WAIT_UI 占用中：${hs.map((h) => h.owner + "@pid" + h.pid).join("，")}（已等 ${Math.round((Date.now() - t0) / 60000)} 分钟）`);
    const until = Date.now() + POLL_MS;
    while (Date.now() < until) { /* 同步等：本进程除了轮询锁目录什么都不做 */ }
  }
}

const w = waitForFree();
if (!w.free) {
  state.result = "FAIL"; state.reason = `等 UI 空出来超时（${MAX_WAIT_MIN} 分钟），仍是 ${w.holders.map((h) => h.owner + "@pid" + h.pid).join("，")}`;
  say(`QUEUE_RESULT=FAIL reason=${state.reason}`); save(); process.exit(2);
}
say(`UI_FREE 等了 ${(w.waitedMs / 60000).toFixed(1)} 分钟`);

let firstFail = -1;
let advisoryFail = 0;
legs.forEach((leg, i) => {
  if (firstFail >= 0) { state.legs[i].status = "NOT_RUN"; say(`LEG ${leg.name} NOT_RUN（前面的腿 ${legs[firstFail].name} 已失败，不往后跑）`); return; }
  const bin = process.execPath;
  const out = join(OUT, leg.name + ".log");
  say(`LEG_START ${leg.name} cmd=${[leg.file, ...(leg.args || [])].join(" ")}`);
  const r = spawnSync(bin, [leg.file, ...(leg.args || [])], {
    /* 每腿可带自己的 env（巡检脚本全靠 TOUR_* 环境变量配置，缺了它就只能把整轮写死成 round-2 的默认值）。
       仍然继承 process.env —— 覆盖是增量，不是替换。 */
    cwd: REPO, encoding: "utf8", maxBuffer: 1 << 28, timeout: (leg.timeoutMin || 240) * 60000, windowsHide: true, env: { ...process.env, ...(leg.env || {}) },
  });
  const body = (r.stdout || "") + (r.stderr ? "\n--- stderr ---\n" + r.stderr : "");
  writeFileSync(out, body);
  const timedOut = r.error && /ETIMEDOUT|timed out/i.test(String(r.error.message || ""));
  state.legs[i] = {
    name: leg.name, status: timedOut ? "TIMEOUT" : (r.status === 0 ? "OK" : "FAIL"),
    exitCode: r.status, log: relOf(out), bytes: Buffer.byteLength(body),
    // 只挑腿自己打印的结论行，不在这儿重复实现它的判定逻辑
    resultLines: body.split(/\r?\n/).filter((l) => /_RESULT=|RUNNER_STATS|CONSERVE|LEASE=/.test(l)).slice(-8),
  };
  save();
  say(`LEG_END ${leg.name} exit=${r.status}${timedOut ? " TIMEOUT" : ""} log=${state.legs[i].log}`);
  for (const l of state.legs[i].resultLines) say("  | " + l);
  if (r.status !== 0 || timedOut) {
    /* 只读门腿可以标 `"advisory": true`：它红是"发现一个缺陷"，不是"UI 不能用了"，
       没有理由让后面十几条出帧腿跟着 NOT_RUN（stage-6 就是这样白丢过一轮）。
       超时不算 advisory —— 超时意味着租约/模拟器本身出事了，继续跑只会污染证据。
       红仍然计入 QUEUE_RESULT=FAIL，这里放行的只是"后面的腿"，不是这条判决。 */
    if (leg.advisory && !timedOut) {
      state.legs[i].status = "ADVISORY_RED";
      advisoryFail++;
      say(`LEG_ADVISORY_RED ${leg.name} exit=${r.status} ⇒ 后面的腿继续跑（这条红仍会把本轮结尾判成 FAIL）`);
    } else firstFail = i;
  }
});

const okAll = firstFail < 0 && advisoryFail === 0;
state.result = okAll ? "OK" : "FAIL";
state.advisoryFail = advisoryFail;
state.finishedAt = now();
state.conservation = { legsTotal: legs.length, legsOk: state.legs.filter((l) => l.status === "OK").length };
/* 守恒：OK + FAIL/TIMEOUT + NOT_RUN 必须等于腿总数。少一条就是排队器自己漏了腿。 */
const tally = state.legs.reduce((a, l) => (a[l.status] = (a[l.status] || 0) + 1, a), {});
const sum = Object.values(tally).reduce((a, b) => a + b, 0);
state.conservation.tally = tally;
state.conservation.ok = sum === legs.length;
save();
say(`QUEUE_TALLY ${Object.entries(tally).map(([k, v]) => k + "=" + v).join(" ")} sum=${sum}/${legs.length} ${sum === legs.length ? "CONSERVED" : "LEAKED"}`);
say(`QUEUE_RESULT=${okAll && sum === legs.length ? "OK" : "FAIL"}`);
process.exit(okAll && sum === legs.length ? 0 : 1);

/* 把"等 stage-7 续跑跑完 → 立刻起 stage-8"绑成一条链，省掉中间反复人工看一眼。
   为什么要有这条链：stage-8 的前几条腿是语料落盘与重戳，它们**必须**排在 stage-7 所有
   执行腿之后（否则同一轮里不同腿读不同版语料，腿 16 同构检查就是查这个），
   而"等前面那条跑完"这件事如果靠人隔十分钟看一次，就会被看错时机。
   规则：
     · 只等 tmp/qa/stage7b-queue.log 里出现 QUEUE_RESULT（那是排队器自己的收尾行）；
     · 7b 只要有一条非 advisory 红就**停在这里**，不自动往下跑 —— 红腿要人判，
       把它接进下一轮等于用第二轮的干净读数盖掉第一轮的判决；
     · 7b 全绿才串行起 stage-8（同一台设备，绝不并发）。
   用法：node scripts/qa/run-chain-7b-then-8.mjs [--dry] [--timeout-min 240] */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";

const REPO = resolve(import.meta.dirname, "..", "..");
const NODE = process.execPath;
const argv = process.argv.slice(2);
const DRY = argv.includes("--dry");
const num = (k, d) => { const i = argv.indexOf("--" + k); return i >= 0 && argv[i + 1] ? Number(argv[i + 1]) : d; };
const TIMEOUT_MIN = num("timeout-min", 240);
/* 旗标守卫：值不带头杠，所以只查 --xxx 本身在不在册（上一版把守卫写复杂了，
   复杂到把自己唯一的用法 --dry 也拒了 —— 一个连自己都跑不起来的路径脚本没资格排队）。 */
const KNOWN = new Set(["dry", "timeout-min"]);
for (const a of argv) {
  if (!a.startsWith("--")) continue;
  if (!KNOWN.has(a.slice(2))) { console.log("CHAIN_RESULT=FAIL reason=不认识的旗标 " + a + "（拼错一个字母就会让它被当成没传 ⇒ 拒跑）"); process.exit(2); }
}
const LOG7B = join(REPO, "tmp/qa/stage7b-queue.log");
const LEGS8 = "scripts/qa/ui-queue.round8-stage8.json";
/* --out 必须显式给：run-ui-queue.mjs 的缺省 OUT 是 reports/audit/round-7/ui-queue，
   那正是 7b 自己的账本目录 ⇒ 不带 --out 的 stage-8 会把 7b 的 queue-state.json 覆盖掉，
   把刚判决的那轮（含红腿）从盘上抹了。判决要留在它自己的目录里。 */
const OUT8 = "reports/audit/round-7/ui-queue-stage8";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const say = (m) => console.log("[" + new Date().toISOString() + "] " + m);

if (DRY) {
  console.log("CHAIN_DRY 会等 " + resolve(LOG7B).replace(REPO + "\\", "") + " 出现 QUEUE_RESULT；全绿则串行跑 " + LEGS8 + " 并落 " + OUT8 + "；有红腿就停");
  console.log("CHAIN_RESULT=DRY");
  process.exit(0);
}
if (!existsSync(LOG7B)) { console.log("CHAIN_RESULT=FAIL reason=找不到 7b 日志 " + LOG7B + "（等一个不存在的进程 = 永远等）"); process.exit(2); }

const T0 = Date.now();
let line7b = "";
for (;;) {
  const t = readFileSync(LOG7B, "utf8");
  const m = t.split(/\r?\n/).filter((x) => /QUEUE_RESULT|QUEUE_TALLY/.test(x));
  if (m.length >= 2) { line7b = m.join("\n"); break; }
  if (!existsSync(LOG7B)) { console.log("CHAIN_RESULT=FAIL reason=7b 日志中途消失"); process.exit(2); }
  /* 活性信号换掉：排队器只在**腿结束**时往日志里写一行，一条 45+ 分钟的执行腿期间日志可以整段不动
     （现量：本脚本就这样把还在正常出行的 7b 判成"挂住"并拒接下一轮）。
     三路信号任一在窗口内动过就算活着：排队器日志、执行腿结果文件、租约续期。 */
  const marks = [];
  try { marks.push(statSync(LOG7B).mtimeMs); } catch { /* 日志被换行写时可能瞬间读不到 */ }
  try {
    const rd = join(REPO, "reports/audit/round-7");
    for (const d of readdirSync(rd)) {
      if (!/^exec-/.test(d)) continue;
      try { marks.push(statSync(join(rd, d, "exec-results.json")).mtimeMs); } catch { }
    }
  } catch { }
  try {
    const lk = JSON.parse(readFileSync(join(REPO, "tmp/qa/locks/wechat-automation-cli.lock"), "utf8"));
    if (Date.parse(lk.leaseUntil || 0) > Date.now()) marks.push(Date.now());
  } catch { }
  const quietMin = marks.length ? (Date.now() - Math.max(...marks)) / 60000 : 1e9;
  if (quietMin > 45) { console.log("CHAIN_RESULT=FAIL reason=排队器日志、执行腿结果文件、租约续期三路都 45 分钟没动 ⇒ 像真挂住了，不自动接下一轮（挂了还往下跑会把两轮的噪声拼成一份读数）"); process.exit(2); }
  if ((Date.now() - T0) / 60000 > TIMEOUT_MIN) { console.log("CHAIN_RESULT=FAIL reason=等 7b 超过 " + TIMEOUT_MIN + " 分钟"); process.exit(2); }
  await sleep(30000);
}
say("7b 收尾：\n  " + line7b.split("\n").join("\n  "));
const red = /QUEUE_RESULT=FAIL|FAIL=[1-9]/.test(line7b);
if (red) { console.log("CHAIN_RESULT=STOP reason=7b 有红腿 ⇒ 停在这里等人判，绝不自动接 stage-8（把红腿接进下一轮就是用它盖判决）"); process.exit(2); }

say("7b 全绿，串行起 stage-8（语料落盘 → 重戳 → 重建三档 → 执行腿 → WS 腿）");
const r = spawnSync(NODE, ["scripts/qa/run-ui-queue.mjs", "--legs", LEGS8, "--out", OUT8], { cwd: REPO, encoding: "utf8", maxBuffer: 256 * 1024 * 1024, timeout: 6 * 60 * 60 * 1000 });
const out = String(r.stdout || "") + String(r.stderr || "");
const tail = out.split(/\r?\n/).filter((x) => /LEG_END|QUEUE_RESULT|QUEUE_TALLY|RESULT=/.test(x)).slice(-40);
console.log("CHAIN_STAGE8 退出码=" + r.status + " 关键行：");
for (const l of tail) console.log("  " + l.slice(0, 200));
console.log("CHAIN_RESULT=" + (r.status === 0 ? "OK" : "FAIL"));
process.exit(r.status === 0 ? 0 : 2);

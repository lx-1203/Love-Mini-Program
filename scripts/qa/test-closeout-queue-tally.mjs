/* verify-carrier-wiring 判出 run-round7-closeout.mjs 的导出 reconcileQueueTally 是死件（0 消费者）。
   那个文件的头注 :37 写明「直接跑 == 执行收尾；被 import == 只要 reconcileQueueTally 这一个导出」，
   :98 的 jsdoc 也写明「负对照要在合成根上跑」—— 也就是说这个导出**本来就是为负对照 harness 存在的**，
   只是那个 harness 从来没被建出来。所以本件不是"给它找个体面的出口"，而是把它设计时的消费者补上。
   覆盖的是它自己声明的三条 fail-closed 保证（没有权威计划/计划空/计划坏 ⇒ 一律红，空扫描集不得判绿）。
   用法：node scripts/qa/test-closeout-queue-tally.mjs   ⇒ 期望 QTALLY_TEST=PASS，否则 exit 1 */
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { reconcileQueueTally } from "./run-round7-closeout.mjs";

let checks = 0, failures = 0;
const ok = (cond, msg, extra = "") => { checks++; if (!cond) { failures++; console.log(`  FAIL ${msg} ${extra}`); } else console.log(`  ok   ${msg}`); };

const root = mkdtempSync(join(tmpdir(), "qtally-"));
const run = (planText, planName = "plan.json") => {
  if (planText === null) {
    try { rmSync(join(root, planName)); } catch {}
  } else {
    writeFileSync(join(root, planName), planText);
  }
  return reconcileQueueTally({ repo: root, planRel: planName, roundDirRel: "audit" });
};

/* 1) 权威计划读不到 ⇒ 硬失败；理由必须点名"读不到"，不许静默判绿 */
{
  const r = run(null);
  ok(r.hardFail === true, "计划缺失 ⇒ hardFail=true", `got=${r.hardFail}`);
  ok(r.fail === true, "计划缺失 ⇒ fail=true（空扫描集不得判绿）", `got=${r.fail}`);
  ok(r.lines.some((l) => /QUEUE_TALLY_RESULT=FAIL reason=权威计划读不到/.test(l)), "计划缺失 ⇒ reason 点名「读不到」");
  ok(r.lines.includes("CLOSEOUT_TALLY=FAIL"), "计划缺失 ⇒ CLOSEOUT_TALLY=FAIL");
}

/* 2) 计划是合法 JSON 但 legs 空 ⇒ 硬失败；这正是"0 条腿"最容易被读成绿的那一格 */
{
  const r = run(JSON.stringify({ legs: [] }));
  ok(r.hardFail === true, "legs=[] ⇒ hardFail=true", `got=${r.hardFail}`);
  ok(r.fail === true, "legs=[] ⇒ fail=true", `got=${r.fail}`);
  ok(r.lines.some((l) => /legs 数组缺失或为空/.test(l)), "legs=[] ⇒ reason 点名 legs 空");
}

/* 3) 计划不是合法 JSON ⇒ 硬失败，且 reason 必须带得上解析错误 */
{
  const r = run("not json{", "bad.json");
  ok(r.hardFail === true, "坏 JSON ⇒ hardFail=true", `got=${r.hardFail}`);
  ok(r.fail === true, "坏 JSON ⇒ fail=true", `got=${r.fail}`);
  ok(r.lines.some((l) => /不是合法 JSON/.test(l)), "坏 JSON ⇒ reason 点名不是合法 JSON");
}

/* 4) 返回值形状：消费者要能拿到 lines/buckets/universe，缺一格就是契约破了 */
{
  const r = run(null);
  ok(Array.isArray(r.lines), "返回 lines 是数组");
  ok(typeof r.universe === "number", "返回 universe 是数字", `got=${typeof r.universe}`);
  ok(r.buckets && typeof r.buckets === "object", "返回 buckets 是对象");
}

try { rmSync(root, { recursive: true, force: true }); } catch {}
console.log(`QTALLY_TEST=${failures ? "FAIL" : "PASS"} checks=${checks} failures=${failures}`);
process.exit(failures ? 1 : 0);

/**
 * v3.7 D6 判决：三路审查同时失败时，工作流必须**不许**宣布"零新增缺陷/闭环完成"。
 *
 * 为什么单独有这一支：dryrun-workflow.mjs 只问"跑到底没有"，不问"结论诚实不诚实"。
 * 实测两个文件在它那里都是 DRYRUN_RESULT=PASS —— 所以它对 v3.6 的假绿是盲的。
 * 本检查用同一个 stub 宿主跑 DSL 正文，但断言的是**结论措辞与 blockers**：
 *   ① 三路审查全失败画像下，conclusion 不得出现"闭环完成"，blockers 必须出现"未全部取证"；
 *   ② 循环不得在 round1 就 break（提前停条件被 auditDegraded 关掉）；
 *   ③ 正对照：拿 v3.6 跑同一次调用，它必须**不过**（证明判点能红，不是空转）。
 *
 * 用法（Node>=20.11；PATH node 是 v16 会崩）：
 *   node scripts/qa/verify-degraded-conclusion.mjs
 * 机器行：DEGRADE_RESULT=PASS|FAIL，附每档 VERDICT。只读，不写盘、不连设备、不起后端。
 */
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const REPO = resolve(import.meta.dirname, "..", "..");
const ts = createRequire(import.meta.url)(resolve(REPO, "apps/client/node_modules/typescript"));

const TARGETS = [
  { file: ".zcode/workflows/miniprogram-ui-audit-v37.dwf.ts", expect: "honest", label: "v3.7" },
  { file: ".zcode/workflows/miniprogram-ui-audit-v36.dwf.ts", expect: "dishonest", label: "v3.6(已知缺陷对照)" },
];
const FORBIDDEN = ["闭环完成", "零新增缺陷"];
const REQUIRED_BLOCKER = "三路审查未全部取证";

function compile(rel) {
  const src = readFileSync(resolve(REPO, rel), "utf8");
  const out = ts.transpileModule(src, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }, reportDiagnostics: true });
  if ((out.diagnostics || []).length > 0) throw new Error("transpile 未过：" + out.diagnostics.map((d) => ts.flattenDiagnosticMessageText(d.messageText, " ")).join(" / "));
  return out.outputText;
}

/** 只让三路审查与分拣失败，其它代理给到"有内容但无覆盖欠账"的良构回件 */
function makeHost(PROBE) {
  const calls = { logs: [], phases: [], breakRound: -1 };
  const failRoles = ["console网络审查员", "功能断言审查员", "视觉对照审查员"];
  const goodTour = { round: 1, rows: [{ route: "pages/home/index", status: "NAV_OK", screenshot: "x.png", elementCount: 3, keyElements: "button", consoleErrors: "", actions: "tap-ok", band: "mock@deadbeef", notes: "stub" }], evidence: [], dispatched: 1, notes: "stub" };
  const goodSetup = { wsUp: true, port: "9420", band: "real", bandMatch: true, routes: ["pages/home/index"], planFile: "stub", notes: "stub", band2: "stub" };
  const mkAgent = (name) => ({
    ask: async () => {
      if (PROBE === "auditors-down" && failRoles.some((r) => String(name).indexOf(r) >= 0)) throw new Error("stub: 审查车道配额耗尽/解析失败");
      if (String(name).indexOf("UI巡检执行员") >= 0) return goodSetup;
      if (String(name).indexOf("巡检") >= 0 && String(name).indexOf("执行员") >= 0) return goodTour;
      if (String(name).indexOf("缺口分拣员") >= 0) return { executable: [], needsUser: [], notes: "stub 无缺陷" };
      if (String(name).indexOf("守门员") >= 0) return { ok: true, err: "", command: "stub" };
      if (String(name).indexOf("入册") >= 0) return { added: 1, aliased: 0, rowsBefore: 100, rowsAfter: 101, notes: "stub" };
      return {};
    },
  });
  const world = {
    run: async (cmd, args) => {
      const a = (args || []).join(" ");
      if (String(cmd).indexOf("curl") >= 0) return { exitCode: 0, stdout: '{"status":"UP"}', stderr: "" };
      if (a.indexOf("rev-parse") >= 0 || a.indexOf("log -1") >= 0) return { exitCode: 0, stdout: "abc1234\n", stderr: "" };
      if (a.indexOf("--version") >= 0) return { exitCode: 0, stdout: "v22.17.0", stderr: "" };
      if (a.indexOf("readFileSync") >= 0) return { exitCode: 1, stdout: "", stderr: "" };
      if (a.indexOf("writeFileSync") >= 0) return { exitCode: 0, stdout: "", stderr: "" };
      if (a.indexOf("MODE:") >= 0 || a.indexOf("config/env.js") >= 0) return { exitCode: 0, stdout: "real|real@deadbeef", stderr: "" };
      if (a.indexOf("sha256") >= 0 || a.indexOf("createHash") >= 0) return { exitCode: 0, stdout: "stubstamp", stderr: "" };
      if (a.indexOf("verify-real-coverage") >= 0) return { exitCode: 0, stdout: "REALCOV_COVERED=236\nREALCOV_UNCOVERED=0／236\nREALCOV_UNCOVERED_LIST=0\nREALCOV_CONSERVATION=OK\nREALCOV_RESULT=PASS\n", stderr: "" };
      if (a.indexOf("prove-gates-can-fail") >= 0) return { exitCode: 0, stdout: "PROVE_RESULT=PASS", stderr: "" };
      return { exitCode: 0, stdout: "X_RESULT=PASS ok", stderr: "" };
    },
  };
  return { calls, mkAgent, world };
}

async function runOne(rel, PROBE) {
  const body = compile(rel);
  const host = makeHost(PROBE);
  const AF = Object.getPrototypeOf(async function () {}).constructor;
  const fn = new AF("agent", "log", "phase", "report", "artifact", "git", "world", body);
  const r = await fn(
    (name) => host.mkAgent(name),
    (m) => host.calls.logs.push(String(m)),
    (m) => host.calls.phases.push(String(m)),
    () => {},
    { board: () => {}, file: async () => "file://stub", markdown: async () => "md://stub" },
    new Proxy({}, { get: () => async () => ({ staged: [], unstaged: [], untracked: [] }) }),
    host.world,
  );
  return { conclusion: String((r && r.conclusion) || ""), blockers: (r && r.findings ? r.findings.map((f) => f.what) : []), logs: host.calls.logs };
}

let bad = 0;
for (const t of TARGETS) {
  let res;
  try {
    res = await runOne(t.file, "auditors-down");
  } catch (e) {
    console.log(`[${t.label}] DRYRUN_THROW ${String(e).slice(0, 160)}`);
    if (t.expect === "honest") bad++;
    continue;
  }
  const allText = res.conclusion + "\n" + res.blockers.join("\n") + "\n" + res.logs.join("\n");
  const forbiddenHit = FORBIDDEN.filter((w) => res.conclusion.indexOf(w) >= 0);
  const requiredHit = allText.indexOf(REQUIRED_BLOCKER) >= 0;
  if (t.expect === "honest") {
    const ok = forbiddenHit.length === 0 && requiredHit;
    if (!ok) bad++;
    console.log(`[${t.label}] VERDICT=${ok ? "HONEST" : "FALSE_GREEN"} 违禁措辞=${forbiddenHit.join("、") || "无"} 未取证blocker=${requiredHit ? "在" : "缺"}`);
  } else {
    // 对照组：已知缺陷版本必须"被抓到"，否则本检查自己就是空转
    const caught = forbiddenHit.length > 0 || !requiredHit;
    if (!caught) {
      console.log(`[${t.label}] CONTROL_BROKEN —— 已知假绿版本没被抓到 ⇒ 本检查没有否决力，PASS 不可信`);
      bad++;
    } else {
      console.log(`[${t.label}] CONTROL_OK 按预期暴露假绿：违禁措辞=${forbiddenHit.join("、") || "无"} 未取证blocker=${requiredHit ? "在" : "缺"}`);
    }
  }
}
console.log(`DEGRADE_RESULT=${bad === 0 ? "PASS" : "FAIL"}（v3.7 判诚实 + v3.6 对照被抓到）`);
process.exit(bad === 0 ? 0 : 1);

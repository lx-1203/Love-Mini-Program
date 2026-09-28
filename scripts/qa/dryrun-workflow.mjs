/**
 * 工作流干跑预检（真跑之前把整场 DSL 用 stub 宿主跑一遍）。
 * 为什么存在：.zcode/research/WF-RUNTIME-GAPS.md 把 v3.2 的致命项 F2/F3 记在案——
 * 对代理返回值做无守卫属性链访问，任一字段缺失就 TypeError 炸在终报之前，整轮成果报废。
 * 本仓库也真吃过一次"跑一半整场消失"（dwfrun-e9907ebc：宿主会话转 cold、reportPersisted=false、
 * 盘上只剩两条被门自己覆写的判决件，缺口账单无处续跑）。
 * 干跑能抓到的正是这一类：语法检查看不见，真跑要几十分钟且代价高。
 *
 * 用法（Node >= 20.11；PATH 上的 node 是 v16，会崩）：
 *   node scripts/qa/dryrun-workflow.mjs --file .zcode/workflows/miniprogram-qa-finish-v33.dwf.ts --profile all
 * profile：empty（代理返回 {}，即畸形/缺字段画像）| reject（ask 直接抛，即配额/解析失败画像）
 *          | permissive（每个字段都是数组，即良构画像）| all（三个都跑，全 SURVIVED 才算过）
 * 判读：出现 "CRASHED BEFORE REPORT" 就是 F2 同型缺陷，位置在 phases reached 的最后一个 phase 之后。
 * 干跑不碰真实文件：world.run 与 artifact 全是 stub，不会落盘、不会起 UI、不会写库。
 */
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ts = createRequire(import.meta.url)("D:/6/恋爱小程序/apps/client/node_modules/typescript");
const REPO = resolve(import.meta.dirname, "..", "..");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const FILE = arg("file", ".zcode/workflows/miniprogram-qa-finish-v33.dwf.ts");
const PROFILE_ARG = arg("profile", "all");
const SRC = resolve(REPO, FILE);

const out = ts.transpileModule(readFileSync(SRC, "utf8"), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  reportDiagnostics: true,
});
if ((out.diagnostics || []).length > 0) {
  for (const d of out.diagnostics.slice(0, 8)) console.log("TS:", ts.flattenDiagnosticMessageText(d.messageText, " "));
  console.log("DRYRUN_RESULT=FAIL（解析未过，先修语法）");
  process.exit(2);
}
const AF = Object.getPrototypeOf(async function () {}).constructor;
// permissive 不能一律返 []：那样 addList 恒空，提交阶段与"提交后 sha 敏感门复量"那段永远走不到，
// 干跑就成了"只测了happy path的前半"。这里给几个关键字段真实的非空值，把后面几条分支也压过去。
const permissive = new Proxy({}, {
  get: (_t, prop) => {
    if (prop === "filesChanged") return ["reports/audit/round-7/stub-file.json"];
    if (prop === "appliedPatches") return 3;
    if (prop === "attempted") return true;
    if (prop === "rows") return [{ id: "MP-STUB-1", status: "EXECUTED" }, { id: "MP-STUB-2", status: "NOT_SHOOTABLE", reason: "stub" }];
    if (prop === "executable") return [{ id: "MP-STUB-E", area: "实现刀", how: "stub", source: "stub" }];
    if (prop === "needsUser") return [{ id: "MP-STUB-U", why: "stub 判据冲突", options: "A/B" }];
    if (prop === "fixedIds") return ["MP-STUB-1"];
    if (prop === "skipped") return [{ id: "MP-STUB-2", reason: "stub 未收口" }];
    if (prop === "lane") return "stub 车道";
    if (prop === "ledgerPass" || prop === "truthPass" || prop === "ok") return true;
    return [];
  },
});

async function once(PROFILE) {
  const calls = { phases: [], reports: 0, artifacts: 0, logs: [] };
  const mkAgent = () => ({
    ask: async () => {
      if (PROFILE === "reject") throw new Error("stub: 模型拒绝/超时/JSON 解析失败");
      return PROFILE === "permissive" ? permissive : {};
    },
  });
  const world = {
    run: async (cmd, args) => {
      const a = (args || []).join(" ");
      if (String(cmd).indexOf("curl") >= 0) return { exitCode: 0, stdout: '{"status":"UP"}', stderr: "" };
      if (a.indexOf("UI_PORTS_LIVE") >= 0) return { exitCode: 0, stdout: "UI_PORTS_LIVE=[9420,9430]", stderr: "" };
      if (a.indexOf("status --porcelain") >= 0) return { exitCode: 0, stdout: "?? x\n", stderr: "" };
      if (a.indexOf("rev-parse") >= 0) return { exitCode: 0, stdout: "stubvalue\n", stderr: "" };
      if (a.indexOf("writeFileSync") >= 0) return { exitCode: 0, stdout: "", stderr: "" };
      return PROFILE === "permissive"
        ? { exitCode: 0, stdout: "X_RESULT=PASS ok", stderr: "" }
        : { exitCode: 1, stdout: "X_RESULT=FAIL 模拟红", stderr: "" };
    },
  };
  const git = new Proxy({}, { get: () => async () => ({ staged: [], unstaged: [], untracked: [] }) });
  const fn = new AF("agent", "log", "phase", "report", "artifact", "git", "world", out.outputText);
  try {
    const r = await fn(
      () => mkAgent(),
      (m) => { calls.logs.push(String(m)); },
      (m) => { calls.phases.push(String(m)); },
      () => { calls.reports++; },
      { board: () => { calls.artifacts++; }, file: async () => "file://stub", markdown: async () => { calls.artifacts++; return "md://stub"; } },
      git,
      world,
    );
    const covered = ["提交后 HEAD", "可变红自检", "车道划分", "门禁复量"].filter(t => calls.logs.some(l => l.indexOf(t) >= 0));
    return { PROFILE, ok: true, phases: calls.phases, reports: calls.reports, artifacts: calls.artifacts, covered, conclusion: r && r.conclusion ? String(r.conclusion).slice(0, 160) : "(无 conclusion)" };
  } catch (e) {
    return { PROFILE, ok: false, phases: calls.phases, err: (e && e.message) || String(e), stack: String((e && e.stack) || "").split(/\r?\n/).slice(1, 3).join(" | ") };
  }
}

const profiles = PROFILE_ARG === "all" ? ["empty", "reject", "permissive"] : [PROFILE_ARG];
let bad = 0;
for (const p of profiles) {
  const r = await once(p);
  if (r.ok) console.log(`[${p}] SURVIVED → 末 phase=${r.phases[r.phases.length - 1]} | report=${r.reports} artifact=${r.artifacts} | 压过的分支=${(r.covered || []).join("、") || "(无标记命中)"}`);
  else { bad++; console.log(`[${p}] CRASHED BEFORE REPORT → 停在 ${r.phases[r.phases.length - 1]} 之后 :: ${r.err}`); console.log(`        ${r.stack}`); }
}
console.log(`DRYRUN_RESULT=${bad === 0 ? "PASS" : "FAIL"}（${profiles.length - bad}/${profiles.length} 画像跑到底并产出总报告）`);
process.exit(bad === 0 ? 0 : 1);

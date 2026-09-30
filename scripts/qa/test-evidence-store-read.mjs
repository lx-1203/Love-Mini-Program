/* scripts/qa/evidence-store-read.mjs 的负例（两把门现在共用这一个实现，它错了两边一起错）。
   用合成库跑，不碰真仓外库；三态 + 唯一命中 + 碰撞 + 短哈希各一格。
   自报格式跟仓库方言：*_SUMMARY cases=N fail=M + *_TEST=PASS|FAIL。

   ⚠ 配置通道有两处，本文件把两处都当被测对象：QA_EVIDENCE_STORE 是第二条通道，聚合器
   run-qa-selftests.mjs 与 run-final-verify-v33.sh 都会在导出它的壳里跑本文件。
   2026-09-30 实测：不隔离环境时"未配库"那一格读成 reachable —— 测的其实是被继承的环境，
   不是入参。所以进场先摘掉、出场前用它反向证明"环境确实会被读到"（第 6 格）。 */
import { mkdirSync, writeFileSync, rmSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { openEvidenceStore, storeVouches, STORE_HASH_PREFIX } from "./evidence-store-read.mjs";

const ENV_STORE_IN = process.env.QA_EVIDENCE_STORE;
delete process.env.QA_EVIDENCE_STORE;

let checks = 0, failures = 0;
const ok = (c, msg, extra = "") => { checks++; if (!c) { failures++; console.log(`  FAIL ${msg} ${extra}`); } else console.log(`  ok   ${msg}`); };

const root = mkdtempSync(join(tmpdir(), "st-"));
const repo = join(root, "repo");
const storeDir = join(root, "store");
mkdirSync(repo, { recursive: true });

const H1 = "a".repeat(64), H2 = "b".repeat(64);
const shard = (h) => h.slice(0, 2);
function putObject(dir, hash, ext = ".img") {
  mkdirSync(join(dir, shard(hash)), { recursive: true });
  writeFileSync(join(dir, shard(hash), hash + ext), "x");
}

/* 1) 未配库 ⇒ unconfigured，且调用方拿到的 index 是 null（不许误当成"库里没有"） */
{
  const s = openEvidenceStore({ argv: [], repo, dir: "" });
  ok(s.mode === "unconfigured" && s.index === null, "未配库 ⇒ unconfigured/index=null", `mode=${s.mode}`);
  ok(storeVouches(s, H1).vouchable === false, "未配库时任何帧都不算被背书（不许默认放行）");
  const g = openEvidenceStore({ argv: [], repo });
  ok(g.mode === "unconfigured", "环境已隔离时，不传 dir 也不传 --store ⇒ 同样 unconfigured（不是靠环境兜出来的）", `mode=${g.mode}`);
}

/* 2) 配了但够不着 ⇒ unreachable（不是"当没有库"） */
{
  const s = openEvidenceStore({ argv: [], repo, dir: join(root, "nope") });
  ok(s.mode === "unreachable", "目录不存在 ⇒ unreachable", `mode=${s.mode}`);
  ok(storeVouches(s, H1).vouchable === false, "unreachable 时不算被背书");
}

/* 3) 库在仓内 ⇒ inside-repo（视同没配，不把证据塞回 git） */
{
  const inRepo = join(repo, "ev");
  mkdirSync(inRepo, { recursive: true });
  const s = openEvidenceStore({ argv: [], repo, dir: inRepo });
  ok(s.mode === "inside-repo", "库落在仓内 ⇒ inside-repo", `mode=${s.mode}`);
}

/* 4) 可达 + 前缀唯一命中 ⇒ 可背书；长度门槛按实现口径 */
{
  putObject(storeDir, H1);
  const s = openEvidenceStore({ argv: [], repo, dir: storeDir });
  ok(s.mode === "reachable" && s.objects === 1, "可达 ⇒ reachable 且数到对象", `mode=${s.mode} objects=${s.objects}`);
  ok(storeVouches(s, H1).vouchable === true, "唯一前缀命中 ⇒ 可背书");
  ok(storeVouches(s, H1).why === "unique_prefix_hit", "命中理由具名", storeVouches(s, H1).why);
  ok(storeVouches(s, "short").vouchable === false, "哈希太短 ⇒ 不可背书（不许猜）");
  ok(storeVouches(s, "f".repeat(64)).vouchable === false, "库里没有这枚 ⇒ 不可背书");
}

/* 5) 同前缀两枚 ⇒ 碰撞，宁可判红也不许"取第一个当命中" */
{
  const collide = "c".repeat(64);
  const other = "c".repeat(64).slice(0, 63) + "9";
  putObject(storeDir, collide); putObject(storeDir, other);
  const s = openEvidenceStore({ argv: [], repo, dir: storeDir });
  const v = storeVouches(s, collide);
  ok(v.vouchable === false && /^collision=/.test(v.why), "同前缀多枚 ⇒ collision 且不可背书", `vouchable=${v.vouchable} why=${v.why}`);
}

/* 6) 第二条配置通道：环境变量必须**被读到**（否则门的"没传 --store 也算配了"会假绿），
      但显式入参压过它，且显式空串 == "我要未配库那一发"（2026-09-30 的回归就出在这里）。 */
{
  process.env.QA_EVIDENCE_STORE = storeDir;
  const byEnv = openEvidenceStore({ argv: [], repo });
  ok(byEnv.mode === "reachable" && byEnv.objects >= 3, "只有环境变量时确实走环境通道（可达并数到合成对象）",
    `mode=${byEnv.mode} objects=${byEnv.objects}`);
  const blankBeatsEnv = openEvidenceStore({ argv: [], repo, dir: "" });
  ok(blankBeatsEnv.mode === "unconfigured", "显式 dir=\"\" 压过环境变量 ⇒ 未配库那一发在带环境的壳里依然可测（本轮修的就是这条）",
    `mode=${blankBeatsEnv.mode}`);
  const argvBeatsEnv = openEvidenceStore({ argv: ["--store", join(repo, "ev")], repo });
  ok(argvBeatsEnv.mode === "inside-repo", "--store 压过环境变量（两处配置同时存在时以命令行为准）",
    `mode=${argvBeatsEnv.mode}`);
  const dirBeatsArgv = openEvidenceStore({ argv: ["--store", join(root, "nope")], repo, dir: storeDir });
  ok(dirBeatsArgv.mode === "reachable", "显式 dir 压过 --store（调用方传入即权威）", `mode=${dirBeatsArgv.mode}`);
  if (ENV_STORE_IN === undefined) delete process.env.QA_EVIDENCE_STORE;
  else process.env.QA_EVIDENCE_STORE = ENV_STORE_IN;
}

rmSync(root, { recursive: true, force: true });
/* 自报方言两条都要印：聚合器 run-qa-selftests.mjs 认 `SUMMARY: assertion failures = N` 为新式主方言，
   旧式 `^\w{2,8}_SUMMARY … fail=N` 的语 stem 上限是 8 个字符 —— 本文件的标记词 STORE_READ 有 10 个，
   于是旧式那把尺子量不到我（2026-09-30 终验实测：exit=0 却被记成"无自报断言计数（不可信）"而判红）。
   补印主方言 = 让判据读得到数，而不是把标记词缩短成认不出来的样子。 */
console.log(`SUMMARY: assertion failures = ${failures}`);
console.log(`STORE_READ_SUMMARY cases=${checks} fail=${failures}`);
console.log(`STORE_READ_TEST=${failures ? "FAIL" : "PASS"} prefix=${STORE_HASH_PREFIX}`);
process.exit(failures ? 1 : 0);

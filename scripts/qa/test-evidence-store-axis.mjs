#!/usr/bin/env node
/* 仓外证据库这一轴的负例自检（用户裁定的硬条件：**证据库不可达时必须判红**）。
   跑法：node22 scripts/qa/test-evidence-store-axis.mjs
   为什么每条都要"能变红"：可达/不可达/未配三态如果只测"绿的样子"，
   那么把不可达写成"当没库"也照样全绿 —— 那正是把证据弄丢还宣布安全的那个形状。
   第 4 条用**挪开再挪回**演示"盘上没了但库里有"确实由库背书；
   挪回时按字节校验，任何一步没归位就当场判红并把路径印出来（绝不留残缺）。 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, statSync, readdirSync, rmSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const GATE = join(REPO, "scripts/qa/verify-evidence-corpus.mjs");
const STORE_TOOL = join(REPO, "scripts/qa/evidence-store.mjs");
const TMP = join(REPO, ".zcode/tmp/evidence-store-axis");
const NODE = process.execPath;
mkdirSync(TMP, { recursive: true });

let checks = 0, fail = 0;
const t = (name, cond, got) => {
  checks++;
  if (!cond) { fail++; console.log(`FAIL ${name} :: ${String(got).slice(0, 260)}`); }
  else console.log(`ok   ${name}`);
};
const run = (args, opts = {}) => {
  /* ⚠ 这条隔离是我自己踩出来的 bug（2026-09-29 终验 r4 实测）：
     verify-evidence-corpus 的库路径有两个来源 —— `--store` **或** process.env.QA_EVIDENCE_STORE
     （verify-evidence-corpus.mjs:44-45）。而 run-final-verify-v33.sh 为了让终验真的走"可达"那一支，
     起头就 export 了 QA_EVIDENCE_STORE，于是**每个子门都继承它**。
     我原本只用"不传 --store"来表示"未配库"，结果继承来的是"配了库"的行为：
     断言 1 期望 PROBLEMS=1 实得 2，断言 4c 期望"不配库必须涨红"实得与基线相等 ——
     测的根本不是它声称要测的那一支（而且门是对的，错的是测试没隔离）。
     所以现在显式区分：cleanStore=true ⇒ 剥掉环境变量，才是真的"未配库"。 */
  const env = { ...process.env };
  if (opts.cleanStore) delete env.QA_EVIDENCE_STORE;
  const r = spawnSync(NODE, args, { cwd: REPO, encoding: "utf8", timeout: 900000, env });
  return { code: r.status, out: (r.stdout || "") + (r.stderr || "") };
};
const numOf = (out, key) => { const m = new RegExp(key + "=(\\d+)").exec(out); return m ? Number(m[1]) : null; };
const sha16 = (p) => createHash("sha256").update(readFileSync(p)).digest("hex").slice(0, 16);

/* 库必须用真库：QA_EVIDENCE_STORE 缺省是仓外那份（evidence-store.mjs 的 DEFAULT_STORE）。 */
const storeDir = (() => {
  const s = run([STORE_TOOL, "--status"]);
  const m = /^STORE_DIR=(.+)$/m.exec(s.out);
  return m ? m[1].trim() : "";
})();
t("前置：能问出库目录，且它不在仓内", !!storeDir && !storeDir.startsWith(REPO), "storeDir=" + (storeDir || "(读不到)"));
const storeReachable = existsSync(storeDir);
t("前置：库已导出可达（不可达时下面的「可达/背书」两条没法测，直接红给你看）",
  storeReachable, "缺库就先跑 node22 scripts/qa/evidence-store.mjs --export --apply ｜ dir=" + storeDir);

/* 基线必须量出来，不能写死。本文件第一版把"真语料有几条红"钉成 1（round-1 那份空 gitSha），
   结果 #12 那条 legacy 规则一落地、语料合理转绿，这里就 4 处齐红 ——
   同一类错我今天已经犯过两次（test-guest-landing 钉死 27/26、test-triage-dead-selector 全等比键）。
   现在：P0 = 当场量一次未配库时的 CORPUS_PROBLEMS，其余断言全部相对它。 */
let P0 = null;
{
  const r = run([GATE], { cleanStore: true });
  P0 = numOf(r.out, "CORPUS_PROBLEMS");
  t("基线可测：未配库那一发能读到 CORPUS_PROBLEMS 数字（读不到就是门的打印形状变了，本文件全部失效）",
    P0 !== null && P0 >= 0, "PROBLEMS=" + P0);
  t("基线自洽：退出码必须与它自己印的问题数一致（>0 ⇔ 非 0）",
    P0 !== null && (P0 > 0 ? r.code === 1 : r.code === 0), `P0=${P0} exit=${r.code}`);
}

/* 1) 未配库 ⇒ 本轴不参与判定 */
{
  const r = run([GATE], { cleanStore: true });
  t("1 未配库：印 CORPUS_STORE=unconfigured", /CORPUS_STORE=unconfigured/.test(r.out), r.out.split(/\r?\n/).find(l => l.startsWith("CORPUS_STORE")) || "(无此行)");
  t("1 未配库：判定与本发基线逐字相同（不因本轴新增红）",
    numOf(r.out, "CORPUS_PROBLEMS") === P0, `exit=${r.code} PROBLEMS=${numOf(r.out, "CORPUS_PROBLEMS")} 基线 P0=${P0}`);
}

/* 2) 库可达且帧都在盘上 ⇒ 本轴不该凭空加红 */
{
  const r = run([GATE, "--store", storeDir]);
  /* 原断言是 `PROBLEMS === P0`（配库前后一律相等），注释里写的前提是"库可达**且帧都在盘上**"。
     2026-09-30 之后那个前提不成立了：帧被 --evict 挪进仓外库（裁定③ 的本意就是"仓外库为不在盘上的帧背书，
     库不可达则判红"），所以配库后问题数**应当**下降 —— 拿等式去卡它，等于把库的正常作用判成缺陷。
     但也不能反过来放成"随便降"：降了必须**具名可核**。所以真不变量是两条：
       ① 配库不新增红（p <= P0）；
       ② 只要问题数降了，就必须有 >0 的"库背书帧"计数在 CORPUS_STORE 行里点名（静默降 = 红）。 */
  const p2 = numOf(r.out, "CORPUS_PROBLEMS");
  const storeLine = (r.out.split(/\r?\n/).find((l) => l.startsWith("CORPUS_STORE")) || "");
  const vouched = Number((storeLine.match(/库背书帧=(\d+)/) || [])[1]);
  t("2 库可达：不新增红；若问题数下降，必须有具名的库背书帧数撑着（不许静默豁免）",
    p2 !== null && p2 <= P0 && (p2 === P0 || (Number.isFinite(vouched) && vouched > 0)),
    `PROBLEMS=${p2} 基线 P0=${P0} 库背书帧=${vouched} ｜ ` + storeLine);
  t("2 库可达：库内对象数与 --status 同源（>0）",
    (numOf(r.out, "库内对象") ?? 0) > 0, r.out.split(/\r?\n/).find(l => l.startsWith("CORPUS_STORE")) || "(无此行)");
}

/* 3) 关键负例：配了库却够不着 ⇒ 必须多一条红并且指名 */
{
  const ghost = join(resolve(storeDir, ".."), "love-mini-evidence-DOES-NOT-EXIST");
  const r = run([GATE, "--store", ghost]);
  const p = numOf(r.out, "CORPUS_PROBLEMS");
  t("3 不可达 ⇒ 判红：PROBLEMS 必须比基线多（不许当「库里没有就算了」）",
    p !== null && p >= P0 + 1 && r.code !== 0, "exit=" + r.code + " PROBLEMS=" + p + " 基线 P0=" + P0);
  t("3 不可达的红必须说清是哪个目录（不指名的红没法处置）",
    /CORPUS_PROBLEM 证据库已配置但够不着/.test(r.out) && r.out.includes(ghost),
    r.out.split(/\r?\n/).find(l => l.includes("证据库已配置")) || "(没有指名行)");
  const inside = join(REPO, "reports");
  const r2 = run([GATE, "--store", inside]);
  t("3b 库落在仓内 ⇒ 也判红（藏在被测物里时「证据在不在」会被仓库脏净污染）",
    (numOf(r2.out, "CORPUS_PROBLEMS") ?? 0) >= P0 + 1 && /CORPUS_STORE=inside-repo/.test(r2.out),
    "PROBLEMS=" + numOf(r2.out, "CORPUS_PROBLEMS"));
}

/* 4) 背书路径：把一张盘上帧挪开 ⇒ 该帧由库背书，missing 不许涨、PROBLEMS 不许新增 */
{
  const manFiles = [];
  const walk = (d, dep = 0) => {
    if (dep > 8) return;
    for (const n of readdirSync(d)) {
      if (["node_modules", ".git", "dist", "unpackage"].includes(n)) continue;
      const p = join(d, n);
      const st = statSync(p);
      if (st.isDirectory()) walk(p, dep + 1);
      else if (/^manifest(-detail)?\.json$/i.test(n)) manFiles.push(p);
    }
  };
  walk(join(REPO, "reports"));
  let target = null, hostMan = null, hash = null;
  outer: for (const m of manFiles) {
    let j; try { j = JSON.parse(readFileSync(m, "utf8")); } catch { continue; }
    for (const s of (j.shots || j.frames || [])) {
      const p = s.path || s.file || "";
      if (!p || !s.contentHash) continue;
      const abs = resolve(REPO, p);
      if (!existsSync(abs)) continue;
      if (sha16(abs) !== s.contentHash) continue;
      target = abs; hostMan = m; hash = s.contentHash; break outer;
    }
  }
  t("4 前置：找到一张「盘上在且哈希相符」的帧做挪开实验", !!target, target || "(没找到可用帧)");
  if (target) {
    const aside = join(TMP, "moved-aside.bin");
    const before = run([GATE, "--store", storeDir]);
    const pBefore = numOf(before.out, "CORPUS_PROBLEMS");
    renameSync(target, aside);
    let movedBack = false, redOnEvict = null, vouched = null;
    try {
      const mid = run([GATE, "--store", storeDir]);
      redOnEvict = numOf(mid.out, "CORPUS_PROBLEMS");
      vouched = (Number(/库背书帧=(\d+)/.exec(mid.out)?.[1]) || 0);
      t("4 帧被挪走后：该帧由库按哈希背书（库背书帧 ≥1）", vouched >= 1,
        "背书=" + vouched + " ｜ 所在 manifest=" + hostMan.replace(REPO + "\\", "").replace(REPO + "/", ""));
      t("4 帧被挪走后：PROBLEMS 不许因为「盘上缺这一张」而上涨", redOnEvict === pBefore,
        "挪开前=" + pBefore + " 挪开后=" + redOnEvict);
      /* 反向证明：同一张帧，若不给库，就必须落进 missing ⇒ 上面那条绿不是"门根本不看缺帧" */
      const noStore = run([GATE], { cleanStore: true });
      t("4c 反证：同一状态不配库 ⇒ missing 必须涨、PROBLEMS 必须多一条红",
        numOf(noStore.out, "CORPUS_PROBLEMS") > pBefore,
        "不配库 PROBLEMS=" + numOf(noStore.out, "CORPUS_PROBLEMS") + " 基线=" + pBefore);
    } finally {
      renameSync(aside, target);
      movedBack = existsSync(target) && sha16(target) === hash;
    }
    t("4z 帧必须原样归位（字节校验，不留残缺）", movedBack, "归位失败路径=" + target + " 期望哈希=" + hash);
  }
}

console.log(`SUMMARY: assertion failures = ${fail}`);
console.log(`EVS_SUMMARY cases=${checks} fail=${fail}`);
console.log(fail === 0 ? "EVS_TEST=PASS" : "EVS_TEST=FAIL");
process.exit(fail === 0 ? 0 : 1);

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
const run = (args) => {
  const r = spawnSync(NODE, args, { cwd: REPO, encoding: "utf8", timeout: 900000 });
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

/* 1) 未配库 ⇒ 本轴不参与判定 */
{
  const r = run([GATE]);
  t("1 未配库：印 CORPUS_STORE=unconfigured", /CORPUS_STORE=unconfigured/.test(r.out), r.out.split(/\r?\n/).find(l => l.startsWith("CORPUS_STORE")) || "(无此行)");
  t("1 未配库：判定与从前相同（不因本轴新增红）", numOf(r.out, "CORPUS_PROBLEMS") === 1 && r.code === 1,
    "exit=" + r.code + " PROBLEMS=" + numOf(r.out, "CORPUS_PROBLEMS") + "（从前实测就是 1：round-1 空 gitSha 那一份）");
}

/* 2) 库可达且帧都在盘上 ⇒ 本轴不该凭空加红 */
{
  const r = run([GATE, "--store", storeDir]);
  t("2 库可达：PROBLEMS 仍是 1（库不新增红，也不豁免既有问题）",
    numOf(r.out, "CORPUS_PROBLEMS") === 1, "PROBLEMS=" + numOf(r.out, "CORPUS_PROBLEMS") + " ｜ " + (r.out.split(/\r?\n/).find(l => l.startsWith("CORPUS_STORE")) || ""));
  t("2 库可达：库内对象数与 --status 同源（>0）",
    (numOf(r.out, "库内对象") ?? 0) > 0, r.out.split(/\r?\n/).find(l => l.startsWith("CORPUS_STORE")) || "(无此行)");
}

/* 3) 关键负例：配了库却够不着 ⇒ 必须多一条红并且指名 */
{
  const ghost = join(resolve(storeDir, ".."), "love-mini-evidence-DOES-NOT-EXIST");
  const r = run([GATE, "--store", ghost]);
  const p = numOf(r.out, "CORPUS_PROBLEMS");
  t("3 不可达 ⇒ 判红：PROBLEMS 必须比基线多（不许当「库里没有就算了」）",
    p !== null && p >= 2 && r.code !== 0, "exit=" + r.code + " PROBLEMS=" + p);
  t("3 不可达的红必须说清是哪个目录（不指名的红没法处置）",
    /CORPUS_PROBLEM 证据库已配置但够不着/.test(r.out) && r.out.includes(ghost),
    r.out.split(/\r?\n/).find(l => l.includes("证据库已配置")) || "(没有指名行)");
  const inside = join(REPO, "reports");
  const r2 = run([GATE, "--store", inside]);
  t("3b 库落在仓内 ⇒ 也判红（藏在被测物里时「证据在不在」会被仓库脏净污染）",
    (numOf(r2.out, "CORPUS_PROBLEMS") ?? 0) >= 2 && /CORPUS_STORE=inside-repo/.test(r2.out),
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
      const noStore = run([GATE]);
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
